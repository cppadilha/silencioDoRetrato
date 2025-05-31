// assets/js/main-script.js
document.addEventListener('DOMContentLoaded', () => {

    // --- Variáveis para controle da galeria e lightbox ---
    let currentGalleryImages = []; // Array para armazenar as URLs das imagens da galeria atual
    let currentImageIndex = -1;  // Índice da imagem atualmente exibida no lightbox

    // --- Lógica do Lightbox ---
    const imageOverlay = document.createElement('div');
    imageOverlay.id = 'imageOverlay';
    imageOverlay.className = 'lb-overlay';
    document.body.appendChild(imageOverlay);

    imageOverlay.innerHTML = `
        <div class="lb-content">
            <canvas id="maximizedCanvas"></canvas>
            <button class="lb-close">×</button>
            <button class="lb-nav lb-prev">❮</button> <button class="lb-nav lb-next">❯</button> </div>
    `;

    const maximizedCanvas = document.getElementById('maximizedCanvas');
    const ctxLightbox = maximizedCanvas.getContext('2d');

    const closeButton = imageOverlay.querySelector('.lb-close');
    const prevButton = imageOverlay.querySelector('.lb-prev'); // Referência ao botão Anterior
    const nextButton = imageOverlay.querySelector('.lb-next'); // Referência ao botão Próximo

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
                const lightboxWatermarkFont = 'bold 20px Playfair Display'; // Usando 20px fixo, pode ajustar

                drawWatermark(ctxLightbox, maximizedCanvas.width, maximizedCanvas.height,
                             lightboxWatermarkText, lightboxWatermarkColor, lightboxWatermarkFont, watermarkRotationDefault);
            }

            imageOverlay.classList.add('active');
            updateNavButtons(); // Atualiza visibilidade dos botões após carregar imagem
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
            updateNavButtons(); // Atualiza visibilidade dos botões mesmo com erro
        };
    }

    function closeLightbox() {
        imageOverlay.classList.remove('active');
        ctxLightbox.clearRect(0, 0, maximizedCanvas.width, maximizedCanvas.height);
        currentGalleryImages = []; // Limpa o array ao fechar o lightbox
        currentImageIndex = -1; // Reseta o índice
    }

    closeButton.addEventListener('click', closeLightbox);
    imageOverlay.addEventListener('click', (event) => {
        if (event.target === imageOverlay) {
            closeLightbox();
        }
    });

    // Função para atualizar a imagem no lightbox (chamada pelos botões)
    function updateLightboxImage() {
        const src = currentGalleryImages[currentImageIndex];
        // Encontra o canvas original para verificar o atributo watermark-display
        const originalCanvas = document.querySelector('.gallery canvas[data-original-src="' + src + '"]');
        const shouldWatermark = originalCanvas ? originalCanvas.getAttribute('watermark-display') === 'true' : false;

        openLightbox(src, shouldWatermark); // Reutiliza a função openLightbox
    }

    // Função para atualizar o estado dos botões de navegação
    function updateNavButtons() {
        prevButton.style.display = (currentImageIndex === 0) ? 'none' : 'block';
        nextButton.style.display = (currentImageIndex === currentGalleryImages.length - 1) ? 'none' : 'block';
    }


    // Event listeners para os botões de navegação
    prevButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita que o clique no botão feche o lightbox
        if (currentImageIndex > 0) {
            currentImageIndex--;
            updateLightboxImage();
        }
    });

    nextButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita que o clique no botão feche o lightbox
        if (currentImageIndex < currentGalleryImages.length - 1) {
            currentImageIndex++;
            updateLightboxImage();
        }
    });

    // --- Lógica da Marca D'água e Carregamento de Imagens da Galeria ---
    const watermarkTextDefault = 'Silêncio do Retrato';
    const watermarkColorDefault = 'rgba(255, 255, 255, 0.4)';
    const watermarkFontDefault = 'bold 40px Playfair Display';
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
                // Ao clicar, populamos o array de imagens da galeria atual
                currentGalleryImages = Array.from(document.querySelectorAll('.gallery canvas[data-original-src]')).map(canvas => canvas.getAttribute('data-original-src'));
                currentImageIndex = currentGalleryImages.indexOf(originalSrc); // Encontra o índice da imagem clicada

                openLightbox(originalSrc, shouldDisplayWatermark); // Abre o lightbox com a imagem clicada
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