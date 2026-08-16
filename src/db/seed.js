require('dotenv').config();
const { getDb } = require('./connection');
const { run: initRun } = require('./init');
const { slugify } = require('../utils/slugify');

const CATEGORIES = ['Kadın', 'Erkek', 'Aksesuar', 'Ayakkabı'];

const DEMO_PRODUCTS = [
  {
    name: 'Oversize Yün Palto',
    category: 'Kadın',
    description:
      'Kışlık koleksiyonun imza parçası. Yumuşak dokulu yün karışımı kumaş, rahat oversize kesim ve minimal detaylarla günlük şıklığı bir üst seviyeye taşıyor.',
    price: '',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    sizeGroup: 'Harf Beden',
    images: [
      'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=1200&q=80',
      'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=1200&q=80',
    ],
    featured: 1,
  },
  {
    name: 'Klasik Keten Gömlek',
    category: 'Erkek',
    description:
      'Nefes alan %100 keten kumaş, rahat kesim ve zamansız yaka detayıyla dört mevsim gardırobun vazgeçilmezi.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    sizeGroup: 'Harf Beden',
    images: [
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1200&q=80',
      'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=1200&q=80',
    ],
    featured: 1,
  },
  {
    name: 'Deri Crossbody Çanta',
    category: 'Aksesuar',
    description:
      'El yapımı gerçek deriden üretilen, ayarlanabilir askılı ve günlük kullanıma uygun kompakt crossbody çanta.',
    sizes: ['Standart'],
    sizeGroup: 'Tek Ölçü',
    images: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&q=80',
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=1200&q=80',
    ],
    featured: 0,
  },
  {
    name: 'Minimalist Deri Sneaker',
    category: 'Ayakkabı',
    description:
      'Temiz çizgiler, premium deri yüzey ve ergonomik taban yapısıyla her kombine uyum sağlayan sneaker.',
    sizes: ['38', '39', '40', '41', '42', '43', '44'],
    sizeGroup: 'Ayakkabı',
    images: [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1200&q=80',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=1200&q=80',
    ],
    featured: 1,
  },
  {
    name: 'Pilili Midi Etek',
    category: 'Kadın',
    description:
      'Akışkan dokusu ve zarif pililiyle hem ofiste hem akşam davetlerinde rahatlıkla taşınabilecek midi etek.',
    sizes: ['XS', 'S', 'M', 'L'],
    sizeGroup: 'Harf Beden',
    images: ['https://images.unsplash.com/photo-1583496661160-fb5886a13d77?w=1200&q=80'],
    featured: 0,
  },
  {
    name: 'Merino Yün Kazak',
    category: 'Erkek',
    description:
      'İnce örgülü merino yünden, hafif ve sıcak tutan, klasik bisiklet yaka kazak.',
    sizes: ['M', 'L', 'XL', 'XXL'],
    sizeGroup: 'Harf Beden',
    images: ['https://images.unsplash.com/photo-1608063615781-e2ef8c73d114?w=1200&q=80'],
    featured: 0,
  },
  {
    name: 'İnce Zincir Kolye',
    category: 'Aksesuar',
    description:
      'Paslanmaz çelik üzerine 18 ayar altın kaplama, günlük kullanıma uygun ince zincir kolye.',
    sizes: ['Standart'],
    sizeGroup: 'Tek Ölçü',
    images: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200&q=80'],
    featured: 0,
  },
  {
    name: 'Klasik Chelsea Bot',
    category: 'Ayakkabı',
    description:
      'Su iticiliği artırılmış deri yüzeyi ve elastik yan panelleriyle sonbahar-kış ayakkabı dolabının klasiği.',
    sizes: ['40', '41', '42', '43', '44', '45'],
    sizeGroup: 'Ayakkabı',
    images: ['https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=1200&q=80'],
    featured: 1,
  },
];

function run() {
  initRun();
  const db = getDb();

  const catStmt = db.prepare(
    'INSERT OR IGNORE INTO categories (name, slug, sort_order) VALUES (?, ?, ?)'
  );
  CATEGORIES.forEach((name, i) => catStmt.run(name, slugify(name), i));

  const getCatId = db.prepare('SELECT id FROM categories WHERE name = ?');
  const getSizeId = db.prepare('SELECT id FROM sizes WHERE label = ? AND group_name = ?');

  const existingCount = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
  if (existingCount > 0) {
    console.log('[seed] Ürünler zaten mevcut, demo veri eklenmedi.');
    return;
  }

  const insertProduct = db.prepare(`
    INSERT INTO products (name, slug, description, category_id, price, is_active, is_featured, stock_status, sort_order)
    VALUES (@name, @slug, @description, @category_id, @price, 1, @featured, 'in_stock', @sort_order)
  `);
  const insertImage = db.prepare(
    'INSERT INTO product_images (product_id, url, alt_text, sort_order) VALUES (?, ?, ?, ?)'
  );
  const insertSizeLink = db.prepare(
    'INSERT INTO product_sizes (product_id, size_id, available) VALUES (?, ?, 1)'
  );

  const tx = db.transaction((items) => {
    items.forEach((item, idx) => {
      const cat = getCatId.get(item.category);
      const info = insertProduct.run({
        name: item.name,
        slug: slugify(item.name),
        description: item.description,
        category_id: cat ? cat.id : null,
        price: item.price || null,
        featured: item.featured || 0,
        sort_order: idx,
      });
      const productId = info.lastInsertRowid;
      item.images.forEach((url, i) => insertImage.run(productId, url, item.name, i));
      item.sizes.forEach((label) => {
        const size = getSizeId.get(label, item.sizeGroup);
        if (size) insertSizeLink.run(productId, size.id);
      });
    });
  });

  tx(DEMO_PRODUCTS);
  console.log(`[seed] ${DEMO_PRODUCTS.length} demo ürün eklendi.`);
}

if (require.main === module) {
  run();
}

module.exports = { run };
