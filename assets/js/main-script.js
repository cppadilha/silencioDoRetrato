// assets/js/main-script.js
document.addEventListener('DOMContentLoaded', () => {

    // --- Variáveis para controle da galeria e lightbox ---
    let currentGalleryImages = [];
    let currentImageIndex = -1;
    let isZoomed = false; // NOVO: Estado do zoom (false = ajustado à tela, true = zoom in)

    // --- Lógica do Lightbox ---
    const imageOverlay = document.createElement('div');
    imageOverlay.id = 'imageOverlay';
    imageOverlay.className = 'lb-overlay';
    document.body.appendChild(imageOverlay);

    imageOverlay.innerHTML = `
        <div class="lb-content">
            <canvas id="maximizedCanvas"></canvas>
            <button class="lb-close">×</button>
            <button class="lb-nav lb-prev">❮</button>
            <button class="lb-nav lb-next">❯</button>
        </div>
    `;

    const maximizedCanvas = document.getElementById('maximizedCanvas');
    const ctxLightbox = maximizedCanvas.getContext('2d');

    const closeButton = imageOverlay.querySelector('.lb-close');
    const prevButton = imageOverlay.querySelector('.lb-prev');
    const nextButton = imageOverlay.querySelector('.lb-next');

    // Funções para abrir e fechar o lightbox
    function openLightbox(src, shouldWatermarkLightbox) {
        isZoomed = false; // Reseta o zoom ao abrir uma nova imagem no lightbox
        drawLightboxContent(src, shouldWatermarkLightbox, false); // Chama a função que desenha (initially not zoomed)
        imageOverlay.classList.add('active');
        updateNavButtons();
    }

    function closeLightbox() {
        imageOverlay.classList.remove('active');
        ctxLightbox.clearRect(0, 0, maximizedCanvas.width, maximizedCanvas.height);
        currentGalleryImages = [];
        currentImageIndex = -1;
        isZoomed = false; // Garante que o estado de zoom seja resetado
    }

    closeButton.addEventListener('click', closeLightbox);
    imageOverlay.addEventListener('click', (event) => {
        if (event.target === imageOverlay) {
            closeLightbox();
        }
    });

    // Função que desenha o conteúdo do lightbox, com ou sem zoom
    function drawLightboxContent(src, shouldWatermarkLightbox, zoomIn) {
        const imgLightbox = new Image();
        imgLightbox.crossOrigin = 'Anonymous';
        imgLightbox.src = src;

        imgLightbox.onload = () => {
            let finalRenderWidth, finalRenderHeight;
            const zoomFactor = 1.5; // Fator de zoom

            // --- PASSO 1: CALCULAR O TAMANHO DA IMAGEM SE ESTIVESSE AJUSTADA À TELA (BASE) ---
            const maxWidthFit = window.innerWidth * 0.9;
            const maxHeightFit = window.innerHeight * 0.9;

            let baseRenderWidth = imgLightbox.width;
            let baseRenderHeight = imgLightbox.height;

            // Ajusta a imagem para caber na tela (calcula o tamanho base)
            if (baseRenderWidth > maxWidthFit) {
                baseRenderHeight = (maxWidthFit / baseRenderWidth) * baseRenderHeight;
                baseRenderWidth = maxWidthFit;
            }
            if (baseRenderHeight > maxHeightFit) {
                baseRenderWidth = (maxHeightFit / baseRenderHeight) * baseRenderWidth;
                baseRenderHeight = maxHeightFit;
            }
            // --- FIM DO CÁLCULO BASE ---

            // --- PASSO 2: DETERMINAR O TAMANHO FINAL COM BASE NO ZOOM ---
            if (zoomIn) {
                finalRenderWidth = baseRenderWidth * zoomFactor;
                finalRenderHeight = baseRenderHeight * zoomFactor;

                // NOVO: Limitando o zoom máximo para não criar um canvas GIGANTE desnecessário
                // Se a imagem original já é enorme, o zoom não deve ultrapassar um limite razoável
                // Ex: não mais que 2x o tamanho original ou 2000px, o que for menor
                const maxAllowedZoomWidth = Math.min(imgLightbox.width * 2, 2000);
                const maxAllowedZoomHeight = Math.min(imgLightbox.height * 2, 2000);

                if (finalRenderWidth > maxAllowedZoomWidth) {
                    finalRenderHeight = (maxAllowedZoomWidth / finalRenderWidth) * finalRenderHeight;
                    finalRenderWidth = maxAllowedZoomWidth;
                }
                if (finalRenderHeight > maxAllowedZoomHeight) {
                    finalRenderWidth = (maxAllowedZoomHeight / finalRenderHeight) * finalRenderWidth;
                    finalRenderHeight = maxAllowedZoomHeight;
                }

            } else { // Ajustar à tela
                finalRenderWidth = baseRenderWidth;
                finalRenderHeight = baseRenderHeight;
            }

            // --- PASSO 3: REDIMENSIONAR O CANVAS E DESENHAR ---
            maximizedCanvas.width = finalRenderWidth; // Redimensiona o canvas, limpando seu conteúdo
            maximizedCanvas.height = finalRenderHeight;

            // Limpa o canvas ANTES de desenhar (redundante se width/height mudam, mas boa prática)
            ctxLightbox.clearRect(0, 0, maximizedCanvas.width, maximizedCanvas.height);

            // Desenha a imagem na nova dimensão. Começa em (0,0) do próprio canvas.
            ctxLightbox.drawImage(imgLightbox, 0, 0, finalRenderWidth, finalRenderHeight);

            // NOVO: Removemos o posicionamento absoluto via JS. O CSS fará o trabalho de centralizar.
            maximizedCanvas.style.left = '';
            maximizedCanvas.style.top = '';
            maximizedCanvas.style.position = '';


            // Sempre aplica a marca d'água DEPOIS da imagem
            if (shouldWatermarkLightbox) {
                const lightboxWatermarkText = watermarkTextDefault;
                const lightboxWatermarkColor = 'rgba(0, 0, 0, 0.3)';
                const lightboxWatermarkFont = 'bold 20px Playfair Display';

                drawWatermark(ctxLightbox, maximizedCanvas.width, maximizedCanvas.height,
                             lightboxWatermarkText, lightboxWatermarkColor, lightboxWatermarkFont, watermarkRotationDefault);
            }
        };

        imgLightbox.onerror = () => {
            console.error('Erro ao carregar a imagem para o lightbox:', src);
            maximizedCanvas.width = 400;
            maximizedCanvas.height = 300;
            ctxLightbox.font = '30px Arial';
            ctxLightbox.fillStyle = 'red';
            ctxLightbox.textAlign = 'center';
            ctxLightbox.fillText('Erro ao carregar imagem', maximizedCanvas.width / 2, maximizedCanvas.height / 2);
            updateNavButtons();
        };
    }
    // --- NOVO: Lógica de Zoom com Duplo Clique/Tap ---
    maximizedCanvas.addEventListener('dblclick', () => {
        const currentSrc = currentGalleryImages[currentImageIndex];
        const originalCanvas = document.querySelector('.gallery canvas[data-original-src="' + currentSrc + '"]');
        const shouldWatermark = originalCanvas ? originalCanvas.getAttribute('watermark-display') === 'true' : false;

        isZoomed = !isZoomed; // Alterna o estado do zoom
        drawLightboxContent(currentSrc, shouldWatermark, isZoomed);
    });


    // Função para atualizar a imagem no lightbox (chamada pelos botões)
    function updateLightboxImage() {
        const src = currentGalleryImages[currentImageIndex];
        const originalCanvas = document.querySelector('.gallery canvas[data-original-src="' + src + '"]');
        const shouldWatermark = originalCanvas ? originalCanvas.getAttribute('watermark-display') === 'true' : false;

        isZoomed = false; // Sempre reseta o zoom ao navegar para outra imagem
        drawLightboxContent(src, shouldWatermark, false); // Desenha a nova imagem ajustada à tela
        updateNavButtons();
    }

    // Função para atualizar o estado dos botões de navegação
    function updateNavButtons() {
        prevButton.style.display = (currentImageIndex === 0) ? 'none' : 'block';
        nextButton.style.display = (currentImageIndex === currentGalleryImages.length - 1) ? 'none' : 'block';
    }


    // Event listeners para os botões de navegação
    prevButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentImageIndex > 0) {
            currentImageIndex--;
            updateLightboxImage();
        }
    });

    nextButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentImageIndex < currentGalleryImages.length - 1) {
            currentImageIndex++;
            updateLightboxImage();
        }
    });

    // --- Lógica da Marca D'água e Carregamento de Imagens da Galeria ---
    const watermarkTextDefault = 'Silêncio do Retrato';
    const watermarkColorDefault = 'rgba(255, 255, 255, 0.4)';
    const watermarkFontDefault = 'bold 40px Playfair Display'; // Tamanho fixo para o texto do padrão
    const watermarkRotationDefault = -Math.PI / 6;

    function drawWatermark(ctx, canvasWidth, canvasHeight, text, color, font, rotation) {
        ctx.save();

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvasWidth * 0.3 > 120 ? canvasWidth * 0.3 : 120;
        tempCanvas.height = canvasHeight * 0.3 > 120 ? canvasHeight * 0.3 : 120;

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

        ctx.restore();
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

            ctx.drawImage(img, 0, 0);

            if (shouldDisplayWatermark) {
                drawWatermark(ctx, canvasElement.width, canvasElement.height,
                             watermarkTextDefault, watermarkColorDefault, watermarkFontDefault, watermarkRotationDefault);
            }

            canvasElement.onclick = () => {
                currentGalleryImages = Array.from(document.querySelectorAll('.gallery canvas[data-original-src]')).map(canvas => canvas.getAttribute('data-original-src'));
                currentImageIndex = currentGalleryImages.indexOf(originalSrc);

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
                currentGalleryImages = Array.from(document.querySelectorAll('.gallery canvas[data-original-src]')).map(canvas => canvas.getAttribute('data-original-src'));
                currentImageIndex = currentGalleryImages.indexOf(originalSrc);
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