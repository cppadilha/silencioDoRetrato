// assets/js/main-script.js
document.addEventListener('DOMContentLoaded', () => {

    // --- Lógica do Lightbox ---
    const imageOverlay = document.createElement('div');
    imageOverlay.id = 'imageOverlay';
    imageOverlay.className = 'lb-overlay';
    document.body.appendChild(imageOverlay);

    imageOverlay.innerHTML = `
        <div class="lb-content">
            <canvas id="maximizedCanvas"></canvas>
            <button class="lb-close">×</button>
        </div>
    `;

    const maximizedCanvas = document.getElementById('maximizedCanvas');
    const ctxLightbox = maximizedCanvas.getContext('2d');

    const closeButton = imageOverlay.querySelector('.lb-close');

    // Funções para abrir e fechar o lightbox
    function openLightbox(src, shouldWatermarkLightbox) {
        const imgLightbox = new Image();
        imgLightbox.crossOrigin = 'Anonymous';
        imgLightbox.src = src;

        imgLightbox.onload = () => {
            const maxWidth = window.innerWidth * 0.9;
            const maxHeight = window.innerHeight * 0.9;

            let renderWidth = imgLightbox.width;
            let renderHeight = imgLightbox.height;

            if (renderWidth > maxWidth) {
                renderHeight = (maxWidth / renderWidth) * renderHeight;
                renderWidth = maxWidth;
            }
            if (renderHeight > maxHeight) {
                renderWidth = (maxHeight / renderHeight) * renderWidth;
                renderHeight = maxHeight;
            }

            maximizedCanvas.width = renderWidth;
            maximizedCanvas.height = renderHeight;

            // PRIMEIRO DESENHA A IMAGEM
            ctxLightbox.drawImage(imgLightbox, 0, 0, renderWidth, renderHeight);

            // DEPOIS APLICA A MARCA D'ÁGUA, SE shouldWatermarkLightbox for true
            if (shouldWatermarkLightbox) {
                const lightboxWatermarkText = watermarkTextDefault;
                const lightboxWatermarkColor = 'rgba(0, 0, 0, 0.3)';
                const lightboxWatermarkFont = 'bold ' + (maximizedCanvas.width * 0.08) + 'px Playfair Display';
                const lightboxWatermarkRotation = -Math.PI / 6;

                drawWatermark(ctxLightbox, maximizedCanvas.width, maximizedCanvas.height,
                             lightboxWatermarkText, lightboxWatermarkColor, lightboxWatermarkFont, lightboxWatermarkRotation);
            }

            imageOverlay.classList.add('active');
        };

        imgLightbox.onerror = () => {
            console.error('Erro ao carregar a imagem para o lightbox:', src);
            maximizedCanvas.width = 400;
            maximizedCanvas.height = 300;
            ctxLightbox.font = '30px Arial';
            ctxLightbox.fillStyle = 'red';
            ctxLightbox.textAlign = 'center';
            ctxLightbox.fillText('Erro ao carregar imagem', maximizedCanvas.width / 2, maximizedCanvas.height / 2);
            imageOverlay.classList.add('active');
        };
    }

    function closeLightbox() {
        imageOverlay.classList.remove('active');
        ctxLightbox.clearRect(0, 0, maximizedCanvas.width, maximizedCanvas.height);
    }

    closeButton.addEventListener('click', closeLightbox);
    imageOverlay.addEventListener('click', (event) => {
        if (event.target === imageOverlay) {
            closeLightbox();
        }
    });


    // --- Lógica da Marca D'água e Carregamento de Imagens da Galeria ---
    const watermarkTextDefault = 'Silêncio do Retrato';
    const watermarkColorDefault = 'rgba(255, 255, 255, 0.4)'; // Opacidade para o texto da marca d'água
    const watermarkFontDefault = 'bold 40px Playfair Display';
    const watermarkRotationDefault = -Math.PI / 6;

    function drawWatermark(ctx, canvasWidth, canvasHeight, text, color, font, rotation) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = 400; // Base para o tamanho do padrão
        tempCanvas.height = 400;

        tempCtx.font = font;
        tempCtx.fillStyle = color;
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';

        tempCtx.save();
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate(rotation);
        tempCtx.fillText(text, 0, 0);
        tempCtx.restore();

        const pattern = ctx.createPattern(tempCanvas, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    function processImage(canvasElement) {
        const originalSrc = canvasElement.getAttribute('data-original-src');
        const shouldDisplayWatermark = canvasElement.getAttribute('watermark-display') === 'true';

        const ctx = canvasElement.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = originalSrc;

        img.onload = () => {
            canvasElement.width = img.width;
            canvasElement.height = img.height;

            // PRIMEIRO DESENHA A IMAGEM NA GALERIA
            ctx.drawImage(img, 0, 0);

            // DEPOIS APLICA A MARCA D'ÁGUA, SE shouldDisplayWatermark for true
            if (shouldDisplayWatermark) {
                drawWatermark(ctx, canvasElement.width, canvasElement.height,
                             watermarkTextDefault, watermarkColorDefault, watermarkFontDefault, watermarkRotationDefault);
            }

            canvasElement.onclick = () => {
                openLightbox(originalSrc, shouldDisplayWatermark);
            };
        };

        img.onerror = () => {
            console.error('Erro ao carregar a imagem:', originalSrc);
            ctx.font = '16px sans-serif';
            ctx.fillStyle = 'red';
            ctx.textAlign = 'center';
            ctx.fillText('Erro ao carregar', canvasElement.width / 2, canvasElement.height / 2);
            canvasElement.onclick = () => {
                openLightbox(originalSrc, shouldDisplayWatermark);
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