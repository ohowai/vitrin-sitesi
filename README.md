# VITRINE — Katalog Sitesi

Animasyonlu, admin panelli, SQL (SQLite) destekli bir **ürün katalog** sitesi.
**Satın alma / ödeme yoktur** — site yalnızca bir "vitrin"dir. Ürün fotoğrafları
sunucuya yüklenmez; yalnızca **URL (bağlantı)** olarak saklanır, böylece hosting
alanınız asla dolmaz.

> İsmi ben (Claude) seçtim — "vitrine" (Fransızca/Türkçe: mağaza camı) fikrinden
> yola çıktım, çünkü site tam olarak bunu yapıyor: ürünleri sergiliyor, satmıyor.
> Beğenmezseniz `src/views/partials/site-head.ejs`, `admin-head.ejs` ve
> `package.json` içindeki "VITRINE" geçen yerleri değiştirmeniz yeterli.

---

## 1. Özellikler

- **Genel site**: animasyonlu ana sayfa (vitrin "perde açılışı" efekti), scroll-reveal
  animasyonlar, kategoriye/bedene/arama terimine göre filtrelenebilir katalog,
  sayfalama, ürün detay sayfası (galeri + mevcut bedenler), duyarlı (mobil uyumlu) tasarım.
- **Admin paneli**: güvenli giriş, dashboard istatistikleri, ürün ekleme/düzenleme/silme,
  **ürün fotoğraflarını URL üzerinden ekleme** (canlı önizlemeli, sınırsız sayıda),
  **mevcut bedenleri işaretleme** (alıcı bunlara göre seçim yapar), kategori yönetimi,
  şifre değiştirme.
- **Veritabanı**: SQLite (dosya tabanlı, kurulum gerektirmez) — `better-sqlite3` ile.
- **Güvenlik**: bcrypt şifreleme, oturum (session) tabanlı kimlik doğrulama, CSRF koruması,
  giriş denemelerinde hız sınırlama + kaba kuvvet kilitleme, Helmet güvenlik başlıkları
  (CSP dahil), parametreli SQL sorguları (injection'a kapalı), görsel URL doğrulama
  (yalnızca http/https, `javascript:` gibi tehlikeli şemalar reddedilir), EJS otomatik
  HTML kaçışı (XSS'e karşı).

---

## 2. Kurulum

Gereksinim: [Node.js](https://nodejs.org) 18 veya üzeri.

```bash
# 1) Bağımlılıkları kurun
npm install

# 2) Ortam değişkenlerini ayarlayın
cp .env.example .env
# .env dosyasını açıp SESSION_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD değerlerini değiştirin

# 3) Veritabanını oluşturun (tablolar + ilk admin hesabı)
npm run init-db

#    İSTEĞE BAĞLI: örnek/demo ürünlerle başlamak isterseniz:
npm run seed

# 4) Sunucuyu başlatın
npm start
```

Site: **http://localhost:3000**
Admin paneli: **http://localhost:3000/admin/login**

İlk admin kullanıcı adı/şifresi `.env` dosyasındaki `ADMIN_USERNAME` /
`ADMIN_PASSWORD` değerleridir (varsayılan: `admin` / `DegistirilmeliSifre123!`).
**Giriş yaptıktan hemen sonra Admin → Şifre Değiştir'den şifrenizi değiştirin.**

---

## 3. Klasör yapısı

```
vitrine/
├── .env.example          # Ortam değişkenleri şablonu
├── package.json
├── src/
│   ├── server.js         # Express giriş noktası
│   ├── db/
│   │   ├── schema.sql     # SQL tablo tanımları
│   │   ├── connection.js  # SQLite bağlantısı
│   │   ├── models.js      # Tüm veritabanı sorguları (parametreli)
│   │   ├── init.js        # Tabloları + ilk admini oluşturur
│   │   └── seed.js        # (opsiyonel) örnek ürün verisi
│   ├── routes/
│   │   ├── site.js        # Genel site rotaları
│   │   └── admin.js       # Admin panel rotaları
│   ├── middleware/
│   │   ├── auth.js        # Oturum kontrolü
│   │   └── csrf.js        # CSRF token üretimi/doğrulaması
│   ├── utils/
│   │   ├── slugify.js
│   │   └── validateImageUrl.js
│   ├── views/              # EJS şablonları (site/ ve admin/)
│   └── public/             # CSS, JS (statik dosyalar)
```

---

## 4. Ürün fotoğrafları neden URL üzerinden?

Sizden gelen istek üzerine, fotoğraflar sunucuya **yüklenmez** — böylece hosting
disk alanınız asla dolmaz ve sizi uğraştırmaz. Admin panelinde her ürün için
istediğiniz kadar görsel **bağlantısı (URL)** ekleyebilirsiniz. Örnek kaynaklar:

- Kendi CDN'iniz veya bir görsel barındırma servisi (Cloudinary, imgix, vb.)
- Ücretsiz stok görsel siteleri (yalnızca test/demo amaçlı; gerçek ürünlerde
  kendi çektiğiniz fotoğrafları bir barındırma servisine yükleyip linkini kullanın)

Sistem yalnızca `http://` veya `https://` ile başlayan bağlantıları kabul eder;
`javascript:` gibi tehlikeli bağlantı türleri sunucu tarafında reddedilir.

---

## 5. Güvenlik notları (üretime almadan önce mutlaka okuyun)

1. **`.env` dosyasındaki `SESSION_SECRET` değerini mutlaka değiştirin.** Uzun,
   rastgele bir dize kullanın (örn. `openssl rand -hex 32` komutuyla üretebilirsiniz).
2. **İlk admin şifresini hemen değiştirin.**
3. Siteyi **HTTPS üzerinden** yayınlıyorsanız `.env` içinde `COOKIE_SECURE=true`
   yapın — böylece oturum çerezi yalnızca şifreli bağlantıda gönderilir.
4. `src/db/vitrine.sqlite3` dosyası tüm verilerinizi içerir — düzenli olarak
   **yedek alın** (tek dosya olduğu için kopyalamak yeterlidir).
5. Uygulama; CSRF koruması, oturum tabanlı kimlik doğrulama, bcrypt şifreleme,
   giriş denemesi hız sınırlama (15 dakikada 5 başarısız denemeden sonra hesap
   geçici olarak kilitlenir), Helmet güvenlik başlıkları ve parametreli SQL
   sorguları ile birlikte gelir. Yine de bir ters proxy (Nginx/Caddy) arkasında,
   HTTPS ile ve güncel Node.js sürümüyle çalıştırmanız önerilir.

---

## 6. Test durumu

Bu proje geliştirme sırasında aşağıdaki senaryolarla test edilmiştir:

- ✅ Tüm genel site sayfaları (ana sayfa, katalog, filtreler, ürün detay, kategori,
  hakkında, 404) doğru HTTP durum kodlarını döndürüyor.
- ✅ Admin girişi: doğru/yanlış şifre, CSRF'siz istek reddi (403), 5 başarısız
  denemeden sonra hesap kilitleme.
- ✅ Ürün ekleme/düzenleme/silme uçtan uca test edildi (form doğrulama hataları,
  geçersiz görsel URL şeması reddi dahil).
- ✅ Kategori ekleme/silme, aynı isimde kategori reddi.
- ✅ Şifre değiştirme (yanlış mevcut şifre reddi dahil).
- ✅ XSS testi: ürün adına `<script>` etiketi girildiğinde, hem admin panelinde
  hem genel sitede otomatik olarak HTML-kaçışlı (escape edilmiş, zararsız metin
  olarak) gösterildiği doğrulandı.
- ✅ Beden/kategori veri bütünlüğü: aynı numaralı bedenlerin (örn. "38") hem
  giyim hem ayakkabı grubunda doğru şekilde ayrı ayrı saklandığı doğrulandı.
- ✅ Tüm JS dosyaları `node --check` ile sözdizimi hatası içermediği doğrulandı.

---

## 7. Sık ihtiyaç duyulacak komutlar

```bash
npm start        # Sunucuyu başlat
npm run init-db  # Veritabanını (yeniden) hazırla — mevcut veriye dokunmaz
npm run seed     # Örnek ürünlerle doldur (yalnızca ürün tablosu boşsa çalışır)
```

Veritabanını sıfırdan başlatmak isterseniz `src/db/vitrine.sqlite3`,
`src/db/sessions.sqlite3` dosyalarını silip `npm run init-db` komutunu tekrar
çalıştırmanız yeterlidir.

---

## 8. Render.com'a yayınlama

Render, GitHub üzerinden otomatik dağıtım yapan popüler bir barındırma servisidir.
Zip dosyasını doğrudan yükleyemezsiniz — önce projeyi bir GitHub deposuna
göndermeniz gerekir.

### Adım 1 — Projeyi GitHub'a yükleyin

1. [github.com](https://github.com) üzerinde ücretsiz bir hesap açın (yoksa).
2. Sağ üstteki "+" → "New repository" ile boş bir depo oluşturun (örn. `vitrine`).
   "Public" veya "Private" fark etmez.
3. Bilgisayarınızda `vitrine` klasörünün içinde bir terminal açıp şunları çalıştırın:
   ```bash
   git init
   git add .
   git commit -m "İlk sürüm"
   git branch -M main
   git remote add origin https://github.com/KULLANICI_ADINIZ/vitrine.git
   git push -u origin main
   ```
   (`.env` ve `node_modules` dosyaları `.gitignore` sayesinde otomatik hariç tutulur.)

### Adım 2 — Render'da servis oluşturun

1. [render.com](https://render.com) üzerinde hesap açıp GitHub hesabınızı bağlayın.
2. Dashboard'da **New +** → **Blueprint** seçin, az önce push ettiğiniz `vitrine`
   deposunu seçin. Render, proje kökündeki `render.yaml` dosyasını otomatik
   algılayıp gerekli servisi ve kalıcı diski önerecektir. **Apply**'a basın.
3. Render sizden `ADMIN_PASSWORD` değerini isteyecek (dosyada `sync: false`
   olduğu için gizli tutulur) — güçlü bir şifre girin.
4. Dağıtım birkaç dakika sürer. Bitince Render size
   `https://vitrine-katalog.onrender.com` gibi bir adres verir — site artık
   herkese açıktır.

> **Neden "Blueprint" ve ücretli plan?** SQLite veritabanının admin panelinden
> eklediğiniz ürünlerle kalıcı kalması için bir **kalıcı disk (persistent disk)**
> gerekir. Render'ın ücretsiz planı disk desteklemez — konteyner her yeniden
> başladığında (uykuya dalıp uyanınca dahi) tüm verileriniz silinir. Bu yüzden
> `render.yaml` içinde `plan: starter` (aylık ~7$'dan başlar) + 1 GB disk
> (~0.25$/ay) tanımlıdır. Yalnızca **denemek/göstermek** istiyorsanız planı
> `free` yapıp diski kaldırabilirsiniz, ama o zaman eklediğiniz ürünler
> zaman zaman sıfırlanabilir.

### Adım 3 — İlk kurulumu tamamlayın

Site ayağa kalktıktan sonra veritabanı otomatik oluşturulur (sunucu ilk açılışta
tabloları ve admin hesabını kendisi kurar — ayrıca bir komut çalıştırmanıza
gerek yoktur). Örnek ürünlerle başlamak isterseniz Render dashboard'da
servisinize girip **Shell** sekmesinden şunu çalıştırabilirsiniz:

```bash
npm run seed
```

Admin paneline `https://SITENIZ.onrender.com/admin/login` adresinden, kullanıcı
adı `admin` ve Adım 2'de belirlediğiniz şifre ile giriş yapabilirsiniz.

### Güncelleme yapmak isterseniz

Kodda değişiklik yaptıktan sonra:
```bash
git add .
git commit -m "Güncelleme"
git push
```
Render, `main` dalına her push yaptığınızda siteyi otomatik olarak yeniden
dağıtır.

---

## 9. Özelleştirme ipuçları

- **Marka rengi / tipografi**: `src/public/css/tokens.css` içindeki CSS
  değişkenlerini (`--brass`, `--sage`, `--font-display`, vb.) değiştirerek tüm
  sitenin renk/tipografi kimliğini tek yerden güncelleyebilirsiniz.
- **Site adı**: `src/views/partials/site-head.ejs`, `site-foot.ejs`,
  `admin-head.ejs`, `admin/login.ejs` içindeki "VITRINE" metnini değiştirin.
- **Yeni beden grubu eklemek**: `src/db/init.js` içindeki `DEFAULT_SIZES`
  dizisine yeni satırlar ekleyip `npm run init-db` çalıştırın.
