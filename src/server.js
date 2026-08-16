require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { run: initDb } = require('./db/init');
const { DB_DIR, SESSIONS_DB_FILE } = require('./db/paths');
const { ensureCsrfToken } = require('./middleware/csrf');
const siteRoutes = require('./routes/site');
const adminRoutes = require('./routes/admin');

// Veritabanını (tablolar + varsayılan admin) hazırla
initDb();

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---------- Güvenlik başlıkları ----------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Ürün görselleri herhangi bir dış URL'den gelebileceği için img-src geniş tutulur,
        // ancak yalnızca https/http üzerinden (data:/javascript: gibi şemalar tarayıcı
        // tarafından zaten engellenir; sunucu tarafında da validateImageUrl ile denetlenir).
        imgSrc: ["'self'", 'https:', 'http:', 'data:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: isProd ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(compression());
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: isProd ? '1d' : 0 }));

// ---------- Oturum yönetimi ----------
app.use(
  session({
    store: new SQLiteStore({ db: SESSIONS_DB_FILE, dir: DB_DIR }),
    name: 'vitrine.sid',
    secret: process.env.SESSION_SECRET || 'DEGISTIRIN_lutfen_bu_varsayilan_degeri',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 1000 * 60 * 60 * 8, // 8 saat
    },
  })
);

app.use(ensureCsrfToken);

// ---------- Genel istek sınırlama (kaba kuvvet / kötüye kullanım önleme) ----------
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ---------- Rotalar ----------
app.use('/admin', adminRoutes);
app.use('/', siteRoutes);

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).render('site/error', {
    title: 'Sayfa bulunamadı',
    message: 'Aradığınız sayfa bulunamadı ya da kaldırılmış olabilir.',
    statusCode: 404,
  });
});

// ---------- Hata yakalayıcı ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[hata]', err);
  res.status(500).render('site/error', {
    title: 'Bir şeyler ters gitti',
    message: isProd
      ? 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
      : err.message,
    statusCode: 500,
  });
});

app.listen(PORT, () => {
  console.log(`\n  VITRINE sunucusu çalışıyor  →  http://localhost:${PORT}`);
  console.log(`  Admin paneli               →  http://localhost:${PORT}/admin/login\n`);
});

module.exports = app;
