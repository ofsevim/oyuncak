// Apply the saved palette before CSS and application JavaScript paint.
try {
  document.documentElement.classList.toggle('dark', localStorage.getItem('oyuncak-theme') !== 'light');
} catch {
  document.documentElement.classList.add('dark');
}

// Upgrade async Google Fonts stylesheet without an inline onload handler.
document.addEventListener('DOMContentLoaded', function () {
  var fontLink = document.getElementById('google-fonts-css');
  if (fontLink) {
    if (fontLink.sheet) {
      fontLink.media = 'all';
    } else {
      fontLink.addEventListener('load', function () {
        fontLink.media = 'all';
      });
    }
  }
});

window.__appLoadTimer = setTimeout(function () {
  var loader = document.getElementById('app-loader');
  if (!loader) return;
  loader.innerHTML =
    '<p style="color:#ff6b6b;font-size:15px;text-align:center;padding:2rem;line-height:1.6">' +
    'Bağlantı yavaş veya bir hata oluştu.<br>' +
    '<button type="button" id="app-reload-btn" ' +
    'style="color:#00d4ff;background:transparent;cursor:pointer;font-weight:bold;display:inline-block;margin-top:12px;' +
    'border:1px solid #00d4ff;padding:8px 20px;border-radius:20px;font-size:15px">Yeniden Dene</button>' +
    '</p>';
  var reloadBtn = document.getElementById('app-reload-btn');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', function () {
      window.location.reload();
    });
  }
}, 12000);
