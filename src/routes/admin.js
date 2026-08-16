const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const models = require('../db/models');
const { requireAuth, redirectIfAuthed } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');
const { slugify } = require('../utils/slugify');
const { isValidImageUrl } = require('../utils/validateImageUrl');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Giriş denemelerine özel, sıkı bir hız sınırlayıcı (kaba kuvvet saldırılarına karşı)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Çok fazla giriş denemesi yapıldı. Lütfen 15 dakika sonra tekrar deneyin.',
});

function getClientIp(req) {
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

// ---------------------------------------------------------------------------
// GİRİŞ / ÇIKIŞ
// ---------------------------------------------------------------------------

router.get('/login', redirectIfAuthed, (req, res) => {
  res.render('admin/login', {
    title: 'Admin Girişi — VITRINE',
    error: null,
    layout: false,
  });
});

router.post(
  '/login',
  loginLimiter,
  verifyCsrfToken,
  body('username').trim().notEmpty(),
  body('password').notEmpty(),
  (req, res) => {
    const errors = validationResult(req);
    const { username, password } = req.body;
    const ip = getClientIp(req);

    const renderError = (msg) =>
      res.status(401).render('admin/login', { title: 'Admin Girişi — VITRINE', error: msg, layout: false });

    if (!errors.isEmpty()) {
      return renderError('Kullanıcı adı ve şifre gereklidir.');
    }

    const failedCount = models.countRecentFailedAttempts(username, ip, LOCKOUT_MINUTES);
    if (failedCount >= MAX_FAILED_ATTEMPTS) {
      return renderError(
        `Çok fazla başarısız deneme. Lütfen ${LOCKOUT_MINUTES} dakika sonra tekrar deneyin.`
      );
    }

    const admin = models.getAdminByUsername(username);
    const hashToCompare = admin ? admin.password_hash : '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
    const passwordMatches = bcrypt.compareSync(password, hashToCompare);

    // Kullanıcı bulunamasa bile bcrypt.compareSync çağrılır (zamanlama saldırılarını zorlaştırmak için)
    if (!admin || !passwordMatches) {
      models.recordLoginAttempt(username, ip, false);
      return renderError('Kullanıcı adı veya şifre hatalı.');
    }

    models.recordLoginAttempt(username, ip, true);
    models.touchAdminLogin(admin.id);

    req.session.regenerate((err) => {
      if (err) return renderError('Bir hata oluştu, lütfen tekrar deneyin.');
      req.session.adminId = admin.id;
      req.session.username = admin.username;
      const redirectTo = req.session.redirectAfterLogin || '/admin';
      delete req.session.redirectAfterLogin;
      res.redirect(redirectTo);
    });
  }
);

router.post('/logout', requireAuth, verifyCsrfToken, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('vitrine.sid');
    res.redirect('/admin/login');
  });
});

// Bu noktadan sonraki TÜM rotalar kimlik doğrulama gerektirir
router.use(requireAuth);

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------

router.get('/', (req, res) => {
  const stats = models.getDashboardStats();
  const recentProducts = models.listProductsAdmin().slice(0, 6);
  res.render('admin/dashboard', {
    title: 'Panel — VITRINE Admin',
    stats,
    recentProducts,
    username: req.session.username,
  });
});

// ---------------------------------------------------------------------------
// ÜRÜNLER
// ---------------------------------------------------------------------------

router.get('/urunler', (req, res) => {
  const search = (req.query.q || '').trim();
  const products = models.listProductsAdmin({ search });
  res.render('admin/products-list', {
    title: 'Ürünler — VITRINE Admin',
    products,
    search,
    username: req.session.username,
  });
});

router.get('/urunler/yeni', (req, res) => {
  res.render('admin/product-form', {
    title: 'Yeni Ürün — VITRINE Admin',
    product: null,
    categories: models.listCategories(),
    sizesGrouped: models.listSizesGrouped(),
    selectedSizeIds: [],
    imageUrls: [''],
    errors: [],
    username: req.session.username,
  });
});

function parseProductForm(req) {
  const {
    name,
    description,
    category_id,
    price,
    is_active,
    is_featured,
    stock_status,
  } = req.body;

  let imageUrls = req.body.image_url || [];
  if (!Array.isArray(imageUrls)) imageUrls = [imageUrls];
  imageUrls = imageUrls.map((u) => (u || '').trim()).filter((u) => u.length > 0);

  let sizeIds = req.body.size_id || [];
  if (!Array.isArray(sizeIds)) sizeIds = [sizeIds];
  sizeIds = sizeIds.map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id));

  return {
    name: (name || '').trim(),
    description: (description || '').trim(),
    category_id: category_id ? parseInt(category_id, 10) : null,
    price: (price || '').trim() || null,
    is_active: is_active ? 1 : 0,
    is_featured: is_featured ? 1 : 0,
    stock_status: ['in_stock', 'low_stock', 'out_of_stock'].includes(stock_status)
      ? stock_status
      : 'in_stock',
    sort_order: 0,
    imageUrls,
    sizeIds,
  };
}

router.post('/urunler/yeni', verifyCsrfToken, (req, res) => {
  const data = parseProductForm(req);
  const errors = [];

  if (!data.name || data.name.length < 2) errors.push('Ürün adı en az 2 karakter olmalı.');
  if (data.name.length > 200) errors.push('Ürün adı çok uzun.');
  if (data.imageUrls.length === 0) errors.push('En az bir ürün fotoğrafı URL’si eklemelisiniz.');
  const invalidUrl = data.imageUrls.find((u) => !isValidImageUrl(u));
  if (invalidUrl) errors.push(`Geçersiz görsel bağlantısı: ${invalidUrl}`);
  if (data.sizeIds.length === 0) errors.push('En az bir beden seçmelisiniz.');

  const renderForm = () =>
    res.status(400).render('admin/product-form', {
      title: 'Yeni Ürün — VITRINE Admin',
      product: { ...data },
      categories: models.listCategories(),
      sizesGrouped: models.listSizesGrouped(),
      selectedSizeIds: data.sizeIds,
      imageUrls: data.imageUrls.length ? data.imageUrls : [''],
      errors,
      username: req.session.username,
    });

  if (errors.length) return renderForm();

  let slug = slugify(data.name);
  if (models.slugExists(slug)) slug = slugify(data.name, Date.now().toString(36));

  try {
    const productId = models.createProduct({
      name: data.name,
      slug,
      description: data.description,
      category_id: data.category_id,
      price: data.price,
      is_active: data.is_active,
      is_featured: data.is_featured,
      stock_status: data.stock_status,
      sort_order: data.sort_order,
    });
    models.replaceProductImages(productId, data.imageUrls);
    models.replaceProductSizes(productId, data.sizeIds);
    res.redirect('/admin/urunler');
  } catch (err) {
    errors.push('Ürün kaydedilirken bir hata oluştu: ' + err.message);
    renderForm();
  }
});

router.get('/urunler/:id/duzenle', (req, res) => {
  const product = models.getProductById(req.params.id);
  if (!product) {
    return res.status(404).render('site/error', {
      title: 'Ürün bulunamadı',
      message: 'Bu ürün bulunamadı.',
      statusCode: 404,
    });
  }
  res.render('admin/product-form', {
    title: `Düzenle: ${product.name} — VITRINE Admin`,
    product,
    categories: models.listCategories(),
    sizesGrouped: models.listSizesGrouped(),
    selectedSizeIds: models.getProductSizeIds(product.id),
    imageUrls: product.images.map((i) => i.url).length ? product.images.map((i) => i.url) : [''],
    errors: [],
    username: req.session.username,
  });
});

router.post('/urunler/:id/duzenle', verifyCsrfToken, (req, res) => {
  const existing = models.getProductById(req.params.id);
  if (!existing) {
    return res.status(404).render('site/error', {
      title: 'Ürün bulunamadı',
      message: 'Bu ürün bulunamadı.',
      statusCode: 404,
    });
  }

  const data = parseProductForm(req);
  const errors = [];

  if (!data.name || data.name.length < 2) errors.push('Ürün adı en az 2 karakter olmalı.');
  if (data.imageUrls.length === 0) errors.push('En az bir ürün fotoğrafı URL’si eklemelisiniz.');
  const invalidUrl = data.imageUrls.find((u) => !isValidImageUrl(u));
  if (invalidUrl) errors.push(`Geçersiz görsel bağlantısı: ${invalidUrl}`);
  if (data.sizeIds.length === 0) errors.push('En az bir beden seçmelisiniz.');

  const renderForm = () =>
    res.status(400).render('admin/product-form', {
      title: `Düzenle: ${existing.name} — VITRINE Admin`,
      product: { ...existing, ...data, id: existing.id },
      categories: models.listCategories(),
      sizesGrouped: models.listSizesGrouped(),
      selectedSizeIds: data.sizeIds,
      imageUrls: data.imageUrls.length ? data.imageUrls : [''],
      errors,
      username: req.session.username,
    });

  if (errors.length) return renderForm();

  let slug = slugify(data.name);
  if (models.slugExists(slug, existing.id)) slug = slugify(data.name, existing.id.toString());

  try {
    models.updateProduct(existing.id, {
      name: data.name,
      slug,
      description: data.description,
      category_id: data.category_id,
      price: data.price,
      is_active: data.is_active,
      is_featured: data.is_featured,
      stock_status: data.stock_status,
      sort_order: existing.sort_order,
    });
    models.replaceProductImages(existing.id, data.imageUrls);
    models.replaceProductSizes(existing.id, data.sizeIds);
    res.redirect('/admin/urunler');
  } catch (err) {
    errors.push('Ürün güncellenirken bir hata oluştu: ' + err.message);
    renderForm();
  }
});

router.post('/urunler/:id/sil', verifyCsrfToken, (req, res) => {
  models.deleteProduct(req.params.id);
  res.redirect('/admin/urunler');
});

// ---------------------------------------------------------------------------
// KATEGORİLER
// ---------------------------------------------------------------------------

router.get('/kategoriler', (req, res) => {
  const categories = models.listCategories().map((c) => ({
    ...c,
    productCount: models.categoryProductCount(c.id),
  }));
  res.render('admin/categories', {
    title: 'Kategoriler — VITRINE Admin',
    categories,
    errors: [],
    username: req.session.username,
  });
});

router.post(
  '/kategoriler',
  verifyCsrfToken,
  body('name').trim().isLength({ min: 2, max: 80 }),
  (req, res) => {
    const errors = validationResult(req);
    const categories = models.listCategories().map((c) => ({
      ...c,
      productCount: models.categoryProductCount(c.id),
    }));

    if (!errors.isEmpty()) {
      return res.status(400).render('admin/categories', {
        title: 'Kategoriler — VITRINE Admin',
        categories,
        errors: ['Kategori adı 2-80 karakter arasında olmalı.'],
        username: req.session.username,
      });
    }

    const name = req.body.name.trim();
    const slug = slugify(name);
    try {
      models.createCategory({ name, slug, sort_order: categories.length });
      res.redirect('/admin/kategoriler');
    } catch (err) {
      res.status(400).render('admin/categories', {
        title: 'Kategoriler — VITRINE Admin',
        categories,
        errors: ['Bu isimde bir kategori zaten var.'],
        username: req.session.username,
      });
    }
  }
);

router.post('/kategoriler/:id/sil', verifyCsrfToken, (req, res) => {
  models.deleteCategory(req.params.id);
  res.redirect('/admin/kategoriler');
});

// ---------------------------------------------------------------------------
// ŞİFRE DEĞİŞTİR
// ---------------------------------------------------------------------------

router.get('/sifre-degistir', (req, res) => {
  res.render('admin/change-password', {
    title: 'Şifre Değiştir — VITRINE Admin',
    errors: [],
    success: false,
    username: req.session.username,
  });
});

router.post(
  '/sifre-degistir',
  verifyCsrfToken,
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 }).withMessage('Yeni şifre en az 8 karakter olmalı.'),
  body('new_password_confirm').custom((value, { req }) => value === req.body.new_password),
  (req, res) => {
    const errors = validationResult(req);
    const admin = models.getAdminById(req.session.adminId);
    const errorMessages = [];

    if (!errors.isEmpty()) {
      errorMessages.push('Lütfen tüm alanları doğru şekilde doldurun (yeni şifre en az 8 karakter, tekrar alanı eşleşmeli).');
    } else if (!bcrypt.compareSync(req.body.current_password, admin.password_hash)) {
      errorMessages.push('Mevcut şifre hatalı.');
    }

    if (errorMessages.length) {
      return res.status(400).render('admin/change-password', {
        title: 'Şifre Değiştir — VITRINE Admin',
        errors: errorMessages,
        success: false,
        username: req.session.username,
      });
    }

    const newHash = bcrypt.hashSync(req.body.new_password, 12);
    models.updateAdminPassword(admin.id, newHash);
    res.render('admin/change-password', {
      title: 'Şifre Değiştir — VITRINE Admin',
      errors: [],
      success: true,
      username: req.session.username,
    });
  }
);

module.exports = router;
