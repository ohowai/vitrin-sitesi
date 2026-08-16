const express = require('express');
const router = express.Router();
const models = require('../db/models');

const PAGE_SIZE = 12;

router.get('/', (req, res) => {
  const categories = models.listCategories();
  const featured = models.listFeaturedProducts(6);
  const latest = models.listProductsPublic({ limit: 8, offset: 0 });
  res.render('site/home', {
    title: 'VITRINE — Vitrine Bakmanın Yeni Hali',
    categories,
    featured,
    latest,
  });
});

router.get('/katalog', (req, res) => {
  const categories = models.listCategories();
  const sizesGrouped = models.listSizesGrouped();

  const page = Math.max(parseInt(req.query.sayfa, 10) || 1, 1);
  const categorySlug = req.query.kategori || null;
  const sizeLabel = req.query.beden || null;
  const search = (req.query.q || '').trim() || null;

  const offset = (page - 1) * PAGE_SIZE;
  const products = models.listProductsPublic({
    categorySlug,
    sizeLabel,
    search,
    limit: PAGE_SIZE,
    offset,
  });
  const total = models.countProductsPublic({ categorySlug, sizeLabel, search });
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  res.render('site/catalog', {
    title: 'Katalog — VITRINE',
    categories,
    sizesGrouped,
    products,
    total,
    page,
    totalPages,
    activeCategory: categorySlug,
    activeSize: sizeLabel,
    search: search || '',
  });
});

router.get('/kategori/:slug', (req, res) => {
  const category = models.getCategoryBySlug(req.params.slug);
  if (!category) {
    return res.status(404).render('site/error', {
      title: 'Kategori bulunamadı',
      message: 'Aradığınız kategori bulunamadı.',
      statusCode: 404,
    });
  }
  return res.redirect(`/katalog?kategori=${encodeURIComponent(category.slug)}`);
});

router.get('/urun/:slug', (req, res) => {
  const product = models.getProductBySlug(req.params.slug);
  if (!product || !product.is_active) {
    return res.status(404).render('site/error', {
      title: 'Ürün bulunamadı',
      message: 'Aradığınız ürün bulunamadı ya da kaldırılmış olabilir.',
      statusCode: 404,
    });
  }
  const related = models
    .listProductsPublic({ categorySlug: product.category_slug, limit: 5 })
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  res.render('site/product', {
    title: `${product.name} — VITRINE`,
    product,
    related,
  });
});

router.get('/hakkinda', (req, res) => {
  res.render('site/about', { title: 'Hakkında — VITRINE' });
});

module.exports = router;
