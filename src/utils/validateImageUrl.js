// Yalnızca http/https şemalı, üretime uygun görsel URL'lerini kabul eder.
// javascript:, data:, file: gibi tehlikeli şemaları reddeder (XSS/istismar önleme).
function isValidImageUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  if (value.length > 2048) return false;
  return true;
}

module.exports = { isValidImageUrl };
