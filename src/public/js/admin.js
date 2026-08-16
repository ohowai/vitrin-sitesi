(function () {
  var wrap = document.getElementById('image-url-wrap');
  var addBtn = document.getElementById('add-image-btn');
  if (!wrap || !addBtn) return;

  function bindRow(row) {
    var input = row.querySelector('input');
    var preview = row.querySelector('.thumb-preview');
    var removeBtn = row.querySelector('.remove-image-btn');

    function updatePreview() {
      var val = input.value.trim();
      if (val && /^https?:\/\//i.test(val)) {
        preview.style.backgroundImage = 'url("' + val.replace(/"/g, '') + '")';
      } else {
        preview.style.backgroundImage = 'none';
      }
    }

    input.addEventListener('input', updatePreview);
    updatePreview();

    removeBtn.addEventListener('click', function () {
      var rows = wrap.querySelectorAll('.image-url-row');
      if (rows.length <= 1) {
        input.value = '';
        updatePreview();
        return;
      }
      row.remove();
    });
  }

  wrap.querySelectorAll('.image-url-row').forEach(bindRow);

  addBtn.addEventListener('click', function () {
    var row = document.createElement('div');
    row.className = 'image-url-row';
    row.innerHTML =
      '<div class="thumb-preview"></div>' +
      '<input type="url" name="image_url" placeholder="https://ornek-cdn.com/urun-foto.jpg" maxlength="2048">' +
      '<button type="button" class="remove-image-btn" title="Kaldır" aria-label="Görseli kaldır">&times;</button>';
    wrap.appendChild(row);
    bindRow(row);
    row.querySelector('input').focus();
  });

  // Şifre alanı eşleşme kontrolü (varsa)
  var newPass = document.getElementById('new_password');
  var confirmPass = document.getElementById('new_password_confirm');
  if (newPass && confirmPass) {
    function checkMatch() {
      if (confirmPass.value && confirmPass.value !== newPass.value) {
        confirmPass.setCustomValidity('Şifreler eşleşmiyor.');
      } else {
        confirmPass.setCustomValidity('');
      }
    }
    newPass.addEventListener('input', checkMatch);
    confirmPass.addEventListener('input', checkMatch);
  }
})();
