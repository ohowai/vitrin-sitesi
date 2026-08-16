(function () {
  // Mobil menü aç/kapa
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen) {
        nav.style.display = 'flex';
        nav.style.position = 'absolute';
        nav.style.top = '64px';
        nav.style.left = '0';
        nav.style.right = '0';
        nav.style.flexDirection = 'column';
        nav.style.background = 'rgba(20,20,15,0.98)';
        nav.style.padding = '18px 32px';
        nav.style.borderBottom = '1px solid var(--line)';
      } else {
        nav.removeAttribute('style');
      }
    });
  }

  // Ürün detay sayfası: galeri küçük resimleri
  var mainImg = document.querySelector('[data-gallery-main]');
  var thumbs = document.querySelectorAll('[data-gallery-thumb]');
  if (mainImg && thumbs.length) {
    thumbs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var url = btn.getAttribute('data-gallery-thumb');
        mainImg.style.opacity = '0';
        setTimeout(function () {
          mainImg.src = url;
          mainImg.style.opacity = '1';
        }, 160);
        thumbs.forEach(function (t) { t.classList.remove('active'); });
        btn.classList.add('active');
      });
    });
  }

  // Ürün detay: beden seçim rozetleri (yalnızca görsel seçim — satın alma yok)
  var sizeItems = document.querySelectorAll('[data-size-select]');
  sizeItems.forEach(function (item) {
    if (item.classList.contains('unavailable')) return;
    item.addEventListener('click', function () {
      var input = item.querySelector('input');
      sizeItems.forEach(function (s) { s.classList.remove('checked'); });
      item.classList.add('checked');
      if (input) input.checked = true;
    });
  });
})();
