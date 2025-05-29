// assets/js/main-script.js
document.addEventListener('DOMContentLoaded', () => {

    // --- Lógica do Lightbox ---
    const imageOverlay = document.createElement('div');
    imageOverlay.id = 'imageOverlay';
    imageOverlay.className = 'lb-overlay';
    document.body.appendChild(imageOverlay);

    imageOverlay.innerHTML = `
        <div class="lb-content">
            <img src="" alt="Imagem maximizada" id="maximizedImage" />
            <button class="lb-close">×</button>
        </div>
    `;

    const maximizedImage = document.getElementById('maximizedImage');
    const closeButton = imageOverlay.querySelector('.lb-close');

    function openLightbox(src) {
        maximizedImage.src = src;
        imageOverlay.classList.add('active');
    }

    function closeLightbox() {
        imageOverlay.classList.remove('active');
    }

    closeButton.addEventListener('click', closeLightbox);
    imageOverlay.addEventListener('click', (event) => {
        if (event.target === imageOverlay) {
            closeLightbox();
        }
    });


    // --- Lógica da Marca D'água e Carregamento de Imagens ---
    // *** CONTROLE DA MARCA D'ÁGUA: Defina true para exibir, false para não exibir ***
    const displayWatermark = true; // Altere para 'false' se não quiser a marca d'água

    const watermarkText = 'Carla Padilha';
    const watermarkColor = 'rgba(255, 255, 255, 0.4)';
    const watermarkFont = 'bold 40px Playfair Display';
    const watermarkRotation = -Math.PI / 6;

    function drawWatermark(ctx, canvasWidth, canvasHeight) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = 400;
        tempCanvas.height = 400;

        tempCtx.font = watermarkFont;
        tempCtx.fillStyle = watermarkColor;
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';

        tempCtx.save();
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate(watermarkRotation);
        tempCtx.fillText(watermarkText, 0, 0);
        tempCtx.restore();

        const pattern = ctx.createPattern(tempCanvas, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    function processImage(canvasElement) {
        const originalSrc = canvasElement.getAttribute('data-original-src');
        const ctx = canvasElement.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = originalSrc;

        img.onload = () => {
            canvasElement.width = img.width;
            canvasElement.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Aplica a marca d'água SE a variável 'displayWatermark' for true
            if (displayWatermark) {
                drawWatermark(ctx, canvasElement.width, canvasElement.height);
            }

            canvasElement.onclick = () => {
                openLightbox(originalSrc);
            };
        };

        img.onerror = () => {
            console.error('Erro ao carregar a imagem:', originalSrc);
            ctx.font = '16px sans-serif';
            ctx.fillStyle = 'red';
            ctx.textAlign = 'center';
            ctx.fillText('Erro ao carregar', canvasElement.width / 2, canvasElement.height / 2);
            canvasElement.onclick = () => {
                openLightbox(originalSrc);
            };
        };
    }

    function processGalleryImages() {
        const galleryCanvases = document.querySelectorAll('.gallery canvas[data-original-src]');
        galleryCanvases.forEach(canvas => {
            processImage(canvas);
        });
    }

    processGalleryImages();
});