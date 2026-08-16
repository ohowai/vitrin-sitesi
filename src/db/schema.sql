-- VITRINE veritabanı şeması (SQLite)
-- Not: better-sqlite3, foreign_keys PRAGMA'sı uygulama içinde açılır.

CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    slug       TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sizes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    label      TEXT NOT NULL,
    group_name TEXT NOT NULL DEFAULT 'Genel',
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE (label, group_name)
);

CREATE TABLE IF NOT EXISTS products (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    slug         TEXT NOT NULL UNIQUE,
    description  TEXT NOT NULL DEFAULT '',
    category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    price        TEXT,                          -- yalnızca vitrin amaçlı gösterim (opsiyonel)
    is_active    INTEGER NOT NULL DEFAULT 1,     -- 1 = yayında, 0 = taslak/gizli
    is_featured  INTEGER NOT NULL DEFAULT 0,     -- öne çıkarılan ürün
    stock_status TEXT NOT NULL DEFAULT 'in_stock', -- in_stock | low_stock | out_of_stock
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- Ürün fotoğrafları: yalnızca URL saklanır (hosting/dosya alanı kullanılmaz)
CREATE TABLE IF NOT EXISTS product_images (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    alt_text   TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);

-- Ürün <-> Beden ilişkisi (admin panelinden seçilen mevcut bedenler)
CREATE TABLE IF NOT EXISTS product_sizes (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size_id    INTEGER NOT NULL REFERENCES sizes(id) ON DELETE CASCADE,
    available  INTEGER NOT NULL DEFAULT 1, -- 1 = bu beden mevcut, 0 = tükendi ama listede görünür
    PRIMARY KEY (product_id, size_id)
);

-- Giriş denemeleri (kaba kuvvet saldırılarını izlemek / kilitlemek için)
CREATE TABLE IF NOT EXISTS login_attempts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    success    INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts(username, created_at);
