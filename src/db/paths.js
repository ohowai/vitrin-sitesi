const path = require('path');
const fs = require('fs');

// Render, Railway gibi platformlarda kalıcı disk kullanmak için DB_DIR ortam
// değişkenini o diskin bağlandığı klasöre (örn. "/var/data") ayarlayın.
// Ayarlanmazsa veriler proje içindeki src/db klasöründe tutulur (yerel geliştirme
// için idealdir, ancak çoğu barındırma platformunda konteyner yeniden
// başladığında SİLİNİR — bu yüzden üretimde DB_DIR mutlaka ayarlanmalıdır).
const DB_DIR = process.env.DB_DIR || __dirname;

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

module.exports = {
  DB_DIR,
  DB_PATH: path.join(DB_DIR, 'vitrine.sqlite3'),
  SESSIONS_DB_FILE: 'sessions.sqlite3',
};
