const crypto = require('crypto');

// Basit, bağımlılıksız CSRF koruması:
// - Her oturum için sabit bir token üretilir (session'da saklanır)
// - Tüm GET isteklerinde token, view'lara "csrfToken" olarak geçirilir
// - Tüm state-changing (POST/PUT/DELETE) isteklerde form/body içindeki token
//   session'daki token ile zamanlama saldırılarına karşı güvenli şekilde karşılaştırılır

function ensureCsrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyCsrfToken(req, res, next) {
  const sent = req.body && req.body._csrf;
  const expected = req.session && req.session.csrfToken;

  if (!sent || !expected) {
    return res.status(403).render('site/error', {
      title: 'Geçersiz istek',
      message: 'Güvenlik doğrulaması başarısız oldu (CSRF). Lütfen sayfayı yenileyip tekrar deneyin.',
      statusCode: 403,
    });
  }

  const sentBuf = Buffer.from(String(sent));
  const expectedBuf = Buffer.from(String(expected));

  const valid =
    sentBuf.length === expectedBuf.length && crypto.timingSafeEqual(sentBuf, expectedBuf);

  if (!valid) {
    return res.status(403).render('site/error', {
      title: 'Geçersiz istek',
      message: 'Güvenlik doğrulaması başarısız oldu (CSRF). Lütfen sayfayı yenileyip tekrar deneyin.',
      statusCode: 403,
    });
  }

  next();
}

module.exports = { ensureCsrfToken, verifyCsrfToken };
