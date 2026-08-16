require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDb } = require('./connection');

const DEFAULT_SIZES = [
  // group_name, label, sort_order
  ['Harf Beden', 'XXS', 1],
  ['Harf Beden', 'XS', 2],
  ['Harf Beden', 'S', 3],
  ['Harf Beden', 'M', 4],
  ['Harf Beden', 'L', 5],
  ['Harf Beden', 'XL', 6],
  ['Harf Beden', 'XXL', 7],
  ['Harf Beden', '3XL', 8],
  ['Sayısal (Giyim)', '34', 20],
  ['Sayısal (Giyim)', '36', 21],
  ['Sayısal (Giyim)', '38', 22],
  ['Sayısal (Giyim)', '40', 23],
  ['Sayısal (Giyim)', '42', 24],
  ['Sayısal (Giyim)', '44', 25],
  ['Sayısal (Giyim)', '46', 26],
  ['Ayakkabı', '36', 40],
  ['Ayakkabı', '37', 41],
  ['Ayakkabı', '38', 42],
  ['Ayakkabı', '39', 43],
  ['Ayakkabı', '40', 44],
  ['Ayakkabı', '41', 45],
  ['Ayakkabı', '42', 46],
  ['Ayakkabı', '43', 47],
  ['Ayakkabı', '44', 48],
  ['Ayakkabı', '45', 49],
  ['Tek Ölçü', 'Standart', 60],
];

function run() {
  const db = getDb();

  // --- Varsayılan bedenler ---
  const insertSize = db.prepare(
    'INSERT OR IGNORE INTO sizes (label, group_name, sort_order) VALUES (?, ?, ?)'
  );
  const insertManySizes = db.transaction((rows) => {
    for (const [group, label, order] of rows) insertSize.run(label, group, order);
  });
  insertManySizes(DEFAULT_SIZES);

  // --- İlk admin hesabı (yalnızca admins tablosu boşsa) ---
  const adminCount = db.prepare('SELECT COUNT(*) AS n FROM admins').get().n;
  if (adminCount === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'DegistirilmeliSifre123!';
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
    console.log(`[init] Admin hesabı oluşturuldu -> kullanıcı adı: "${username}"`);
    console.log('[init] Lütfen ilk girişten sonra şifrenizi değiştirin!');
  } else {
    console.log('[init] Admin hesabı zaten mevcut, atlanıyor.');
  }

  console.log('[init] Veritabanı hazır:', require('./connection').DB_PATH);
}

if (require.main === module) {
  run();
}

module.exports = { run, DEFAULT_SIZES };
