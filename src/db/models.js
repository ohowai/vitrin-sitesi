const { getDb } = require('./connection');

// ---------- Kategoriler ----------
function listCategories() {
  return getDb().prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC').all();
}

function getCategoryBySlug(slug) {
  return getDb().prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
}

function getCategoryById(id) {
  return getDb().prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

function createCategory({ name, slug, sort_order = 0 }) {
  return getDb()
    .prepare('INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, ?)')
    .run(name, slug, sort_order);
}

function deleteCategory(id) {
  return getDb().prepare('DELETE FROM categories WHERE id = ?').run(id);
}

function categoryProductCount(id) {
  return getDb()
    .prepare('SELECT COUNT(*) AS n FROM products WHERE category_id = ?')
    .get(id).n;
}

// ---------- Bedenler ----------
function listSizes() {
  return getDb().prepare('SELECT * FROM sizes ORDER BY sort_order ASC').all();
}

function listSizesGrouped() {
  const rows = listSizes();
  const groups = {};
  for (const row of rows) {
    if (!groups[row.group_name]) groups[row.group_name] = [];
    groups[row.group_name].push(row);
  }
  return groups;
}

// ---------- Ürünler ----------
const PRODUCT_BASE_SELECT = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

function listProductsPublic({ categorySlug, sizeLabel, search, limit, offset } = {}) {
  const db = getDb();
  const clauses = ['p.is_active = 1'];
  const params = {};

  if (categorySlug) {
    clauses.push('c.slug = @categorySlug');
    params.categorySlug = categorySlug;
  }
  if (search) {
    clauses.push('(p.name LIKE @search OR p.description LIKE @search)');
    params.search = `%${search}%`;
  }
  let sizeJoin = '';
  if (sizeLabel) {
    sizeJoin = `
      JOIN product_sizes ps ON ps.product_id = p.id
      JOIN sizes sz ON sz.id = ps.size_id AND sz.label = @sizeLabel
    `;
    params.sizeLabel = sizeLabel;
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  let sql = `
    SELECT DISTINCT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ${sizeJoin}
    ${whereSql}
    ORDER BY p.is_featured DESC, p.sort_order ASC, p.created_at DESC
  `;
  if (limit) {
    sql += ' LIMIT @limit OFFSET @offset';
    params.limit = limit;
    params.offset = offset || 0;
  }
  const rows = db.prepare(sql).all(params);
  return rows.map(attachImagesAndSizes);
}

function countProductsPublic({ categorySlug, sizeLabel, search } = {}) {
  const db = getDb();
  const clauses = ['p.is_active = 1'];
  const params = {};
  if (categorySlug) {
    clauses.push('c.slug = @categorySlug');
    params.categorySlug = categorySlug;
  }
  if (search) {
    clauses.push('(p.name LIKE @search OR p.description LIKE @search)');
    params.search = `%${search}%`;
  }
  let sizeJoin = '';
  if (sizeLabel) {
    sizeJoin = `
      JOIN product_sizes ps ON ps.product_id = p.id
      JOIN sizes sz ON sz.id = ps.size_id AND sz.label = @sizeLabel
    `;
    params.sizeLabel = sizeLabel;
  }
  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT COUNT(DISTINCT p.id) AS n
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ${sizeJoin}
    ${whereSql}
  `;
  return db.prepare(sql).get(params).n;
}

function listFeaturedProducts(limit = 6) {
  const rows = getDb()
    .prepare(
      `${PRODUCT_BASE_SELECT} WHERE p.is_active = 1 AND p.is_featured = 1
       ORDER BY p.sort_order ASC, p.created_at DESC LIMIT ?`
    )
    .all(limit);
  return rows.map(attachImagesAndSizes);
}

function listProductsAdmin({ search } = {}) {
  const db = getDb();
  let sql = PRODUCT_BASE_SELECT;
  const params = {};
  if (search) {
    sql += ' WHERE p.name LIKE @search';
    params.search = `%${search}%`;
  }
  sql += ' ORDER BY p.created_at DESC';
  const rows = db.prepare(sql).all(params);
  return rows.map(attachImagesAndSizes);
}

function getProductBySlug(slug) {
  const row = getDb().prepare(`${PRODUCT_BASE_SELECT} WHERE p.slug = ?`).get(slug);
  return row ? attachImagesAndSizes(row) : null;
}

function getProductById(id) {
  const row = getDb().prepare(`${PRODUCT_BASE_SELECT} WHERE p.id = ?`).get(id);
  return row ? attachImagesAndSizes(row) : null;
}

function getProductImages(productId) {
  return getDb()
    .prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC')
    .all(productId);
}

function getProductSizeIds(productId) {
  return getDb()
    .prepare('SELECT size_id FROM product_sizes WHERE product_id = ?')
    .all(productId)
    .map((r) => r.size_id);
}

function attachImagesAndSizes(product) {
  product.images = getProductImages(product.id);
  const sizeRows = getDb()
    .prepare(
      `SELECT sz.id, sz.label, sz.group_name, ps.available
       FROM product_sizes ps JOIN sizes sz ON sz.id = ps.size_id
       WHERE ps.product_id = ? ORDER BY sz.sort_order ASC`
    )
    .all(product.id);
  product.sizes = sizeRows;
  return product;
}

function createProduct(data) {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO products (name, slug, description, category_id, price, is_active, is_featured, stock_status, sort_order)
       VALUES (@name, @slug, @description, @category_id, @price, @is_active, @is_featured, @stock_status, @sort_order)`
    )
    .run(data);
  return info.lastInsertRowid;
}

function updateProduct(id, data) {
  const db = getDb();
  db.prepare(
    `UPDATE products SET
      name = @name, slug = @slug, description = @description, category_id = @category_id,
      price = @price, is_active = @is_active, is_featured = @is_featured,
      stock_status = @stock_status, sort_order = @sort_order, updated_at = datetime('now')
     WHERE id = @id`
  ).run({ ...data, id });
}

function deleteProduct(id) {
  return getDb().prepare('DELETE FROM products WHERE id = ?').run(id);
}

function replaceProductImages(productId, urls) {
  const db = getDb();
  const tx = db.transaction((productId, urls) => {
    db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
    const stmt = db.prepare(
      'INSERT INTO product_images (product_id, url, alt_text, sort_order) VALUES (?, ?, ?, ?)'
    );
    urls.forEach((url, i) => stmt.run(productId, url, '', i));
  });
  tx(productId, urls);
}

function replaceProductSizes(productId, sizeIds) {
  const db = getDb();
  const tx = db.transaction((productId, sizeIds) => {
    db.prepare('DELETE FROM product_sizes WHERE product_id = ?').run(productId);
    const stmt = db.prepare(
      'INSERT INTO product_sizes (product_id, size_id, available) VALUES (?, ?, 1)'
    );
    sizeIds.forEach((sizeId) => stmt.run(productId, sizeId));
  });
  tx(productId, sizeIds);
}

function slugExists(slug, excludeId = null) {
  const db = getDb();
  if (excludeId) {
    return !!db
      .prepare('SELECT 1 FROM products WHERE slug = ? AND id != ?')
      .get(slug, excludeId);
  }
  return !!db.prepare('SELECT 1 FROM products WHERE slug = ?').get(slug);
}

// ---------- Admin hesabı ----------
function getAdminByUsername(username) {
  return getDb().prepare('SELECT * FROM admins WHERE username = ?').get(username);
}

function getAdminById(id) {
  return getDb().prepare('SELECT * FROM admins WHERE id = ?').get(id);
}

function updateAdminPassword(id, passwordHash) {
  return getDb()
    .prepare('UPDATE admins SET password_hash = ? WHERE id = ?')
    .run(passwordHash, id);
}

function touchAdminLogin(id) {
  return getDb()
    .prepare("UPDATE admins SET last_login_at = datetime('now') WHERE id = ?")
    .run(id);
}

// ---------- Giriş denemeleri ----------
function recordLoginAttempt(username, ip, success) {
  return getDb()
    .prepare('INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, ?)')
    .run(username, ip, success ? 1 : 0);
}

function countRecentFailedAttempts(username, ip, minutes = 15) {
  return getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM login_attempts
       WHERE username = ? AND ip_address = ? AND success = 0
       AND created_at >= datetime('now', ?)`
    )
    .get(username, ip, `-${minutes} minutes`).n;
}

// ---------- İstatistikler (admin dashboard) ----------
function getDashboardStats() {
  const db = getDb();
  return {
    totalProducts: db.prepare('SELECT COUNT(*) AS n FROM products').get().n,
    activeProducts: db.prepare('SELECT COUNT(*) AS n FROM products WHERE is_active = 1').get().n,
    totalCategories: db.prepare('SELECT COUNT(*) AS n FROM categories').get().n,
    outOfStock: db
      .prepare("SELECT COUNT(*) AS n FROM products WHERE stock_status = 'out_of_stock'")
      .get().n,
  };
}

module.exports = {
  listCategories,
  getCategoryBySlug,
  getCategoryById,
  createCategory,
  deleteCategory,
  categoryProductCount,
  listSizes,
  listSizesGrouped,
  listProductsPublic,
  countProductsPublic,
  listFeaturedProducts,
  listProductsAdmin,
  getProductBySlug,
  getProductById,
  getProductImages,
  getProductSizeIds,
  createProduct,
  updateProduct,
  deleteProduct,
  replaceProductImages,
  replaceProductSizes,
  slugExists,
  getAdminByUsername,
  getAdminById,
  updateAdminPassword,
  touchAdminLogin,
  recordLoginAttempt,
  countRecentFailedAttempts,
  getDashboardStats,
};
