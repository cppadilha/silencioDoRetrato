// Lightbox simples sem dependências
document.addEventListener('click', function(e) {
  if (e.target.tagName === 'IMG' && e.target.closest('.cover-card') === null) {
    const src = e.target.src;
    const overlay = document.createElement('div');
    overlay.className = 'lb-overlay';
    overlay.innerHTML = `<div class="lb-content"><img src="${src}" alt="" /><button class="lb-close">×</button></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.lb-close').onclick = () => overlay.remove();
  }
});