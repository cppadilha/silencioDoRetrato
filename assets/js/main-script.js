// assets/js/main-script.js
document.addEventListener('DOMContentLoaded', () => {

    // --- Variáveis para controle da galeria e lightbox ---
    let currentGalleryImages = [];
    let currentImageIndex = -1;
    let isZoomed = false; // Estado do zoom (false = ajustado à tela, true = zoom in)
    let isPanning = false; // Estado do pan
    let startPanX = 0; // Posição X inicial do mouse ao iniciar o pan
    let startPanY = 0; // Posição Y inicial do mouse ao iniciar o pan
    let currentPanX = 0; // Offset X atual da imagem no canvas (deslocamento)
    let currentPanY = 0; // Offset Y atual da imagem no canvas (deslocamento)
    let loadedLightboxImage = null; // Armazenará a imagem carregada para o lightbox

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
        // Reseta todos os estados ao abrir um novo lightbox
        isZoomed = false;
        isPanning = false;
        currentPanX = 0;
        currentPanY = 0;
        loadedLightboxImage = null; // Zera a imagem para forçar um novo carregamento

        // Inicia o carregamento da imagem e o desenho do lightbox
        loadImageAndDraw(src, shouldWatermarkLightbox, false); // 'false' para iniciar sem zoom
        imageOverlay.classList.add('active');
        updateNavButtons(); // Atualiza visibilidade dos botões
    }

    function closeLightbox() {
        imageOverlay.classList.remove('active');
        ctxLightbox.clearRect(0, 0, maximizedCanvas.width, maximizedCanvas.height);
        currentGalleryImages = [];
        currentImageIndex = -1;
        isZoomed = false;
        isPanning = false;
        currentPanX = 0;
        currentPanY = 0;
        loadedLightboxImage = null; // Libera a referência à imagem
    }

    closeButton.addEventListener('click', closeLightbox);
    imageOverlay.addEventListener('click', (event) => {
        if (event.target === imageOverlay) { // Clica no background para fechar
            closeLightbox();
        }
    });

    // NOVO: Função para carregar a imagem UMA VEZ e então desenhá-la
    function loadImageAndDraw(src, shouldWatermarkLightbox, zoomState) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = src;

        img.onload = () => {
            loadedLightboxImage = img; // Armazena a imagem carregada globalmente
            drawLightboxContent(loadedLightboxImage, shouldWatermarkLightbox, zoomState); // Desenha
        };

        img.onerror = () => {
            console.error('Erro ao carregar a imagem para o lightbox:', src);
            maximizedCanvas.width = 400; // Define um tamanho padrão para canvas de erro
            maximizedCanvas.height = 300;
            ctxLightbox.font = '30px Arial';
            ctxLightbox.fillStyle = 'red';
            ctxLightbox.textAlign = 'center';
            ctxLightbox.fillText('Erro ao carregar imagem', maximizedCanvas.width / 2, maximizedCanvas.height / 2);
            updateNavButtons();
        };
    }

    // Função que desenha o conteúdo do lightbox, usando a imagem JÁ CARREGADA
    function drawLightboxContent(imgToDraw, shouldWatermarkLightbox, zoomState) {
        if (!imgToDraw) return; // Garante que a imagem esteja carregada

        const imgLightbox = imgToDraw; // A imagem já carregada
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
        if (zoomState) { // Se estiver em modo zoom
            finalRenderWidth = baseRenderWidth * zoomFactor;
            finalRenderHeight = baseRenderHeight * zoomFactor;

            // NOVO: Limitando o zoom máximo para não criar um canvas GIGANTE desnecessário
            const maxAllowedZoomWidth = Math.min(imgLightbox.width * 2, 2000); // 2x original ou 2000px
            const maxAllowedZoomHeight = Math.min(imgLightbox.height * 2, 2000);

            if (finalRenderWidth > maxAllowedZoomWidth) {
                finalRenderHeight = (maxAllowedZoomWidth / finalRenderWidth) * finalRenderHeight;
                finalRenderWidth = maxAllowedZoomWidth;
            }
            if (finalRenderHeight > maxAllowedZoomHeight) {
                finalRenderWidth = (maxAllowedZoomHeight / finalRenderHeight) * finalRenderWidth;
                finalRenderHeight = maxAllowedZoomHeight;
            }

            // Garante que o canvas seja grande o suficiente para a imagem ampliada
            maximizedCanvas.width = finalRenderWidth;
            maximizedCanvas.height = finalRenderHeight;

            // Ao ativar o zoom pela primeira vez, centraliza a imagem no canvas
            if (!isPanning && (currentPanX === 0 && currentPanY === 0)) {
                // Calcula o offset inicial para centralizar a imagem ampliada dentro do canvas
                // currentPanX e currentPanY devem ser o canto superior esquerdo da imagem ampliada
                currentPanX = (maximizedCanvas.width - finalRenderWidth) / 2;
                currentPanY = (maximizedCanvas.height - finalRenderHeight) / 2;
            }

        } else { // Ajustar à tela
            finalRenderWidth = baseRenderWidth;
            finalRenderHeight = baseRenderHeight;

            maximizedCanvas.width = finalRenderWidth;
            maximizedCanvas.height = finalRenderHeight;
            currentPanX = 0; // Zera pan ao voltar ao normal
            currentPanY = 0;
        }

        ctxLightbox.clearRect(0, 0, maximizedCanvas.width, maximizedCanvas.height);
        // DESENHA A IMAGEM COM OS OFFSETS DO PAN
        // (currentPanX, currentPanY) é o canto superior esquerdo ONDE a imagem será desenhada no canvas
        ctxLightbox.drawImage(imgLightbox, currentPanX, currentPanY, finalRenderWidth, finalRenderHeight);

        // Sempre aplica a marca d'água DEPOIS da imagem
        if (shouldWatermarkLightbox) {
            const lightboxWatermarkText = watermarkTextDefault;
            const lightboxWatermarkColor = 'rgba(0, 0, 0, 0.3)';
            const lightboxWatermarkFont = 'bold 20px Playfair Display';

            drawWatermark(ctxLightbox, maximizedCanvas.width, maximizedCanvas.height,
                         lightboxWatermarkText, lightboxWatermarkColor, lightboxWatermarkFont, watermarkRotationDefault);
        }
    }

    // --- Lógica de Pan (Arrastar) ---
    maximizedCanvas.addEventListener('mousedown', (e) => {
        if (!isZoomed) return; // Só permite pan se estiver com zoom
        isPanning = true;
        maximizedCanvas.style.cursor = 'grabbing';
        // Guarda a posição inicial do mouse e o offset atual da imagem
        startPanX = e.clientX;
        startPanY = e.clientY;
    });

    maximizedCanvas.addEventListener('mousemove', (e) => {
        if (!isPanning || !isZoomed) return; // Só faz pan se estiver arrastando E com zoom

        // Calcula o delta do movimento do mouse
        const dx = e.clientX - startPanX;
        const dy = e.clientY - startPanY;

        // Atualiza os offsets do pan
        currentPanX += dx;
        currentPanY += dy;

        // Opcional: Adicionar limites ao pan para não sair da imagem
        // Isso é mais complexo. Aqui, o pan é livre.

        startPanX = e.clientX; // Reseta o ponto de início para o próximo movimento
        startPanY = e.clientY;

        // Redesenha o conteúdo do lightbox com os novos offsets de pan
        const currentSrc = currentGalleryImages[currentImageIndex]; // Pega a URL da imagem atual
        const originalCanvas = document.querySelector('.gallery canvas[data-original-src="' + currentSrc + '"]');
        const shouldWatermark = originalCanvas ? originalCanvas.getAttribute('watermark-display') === 'true' : false;

        drawLightboxContent(loadedLightboxImage, shouldWatermark, isZoomed); // Redesenha usando a imagem já carregada
    });

    maximizedCanvas.addEventListener('mouseup', () => {
        isPanning = false;
        if (isZoomed) {
            maximizedCanvas.style.cursor = 'grab';
        } else {
            maximizedCanvas.style.cursor = 'default';
        }
    });

    maximizedCanvas.addEventListener('mouseleave', () => { // Caso o mouse saia do canvas enquanto arrasta
        isPanning = false;
        maximizedCanvas.style.cursor = 'default';
    });

    // Cursor grab/default
    maximizedCanvas.addEventListener('mouseenter', () => {
        if (isZoomed && !isPanning) {
            maximizedCanvas.style.cursor = 'grab';
        }
    });
    maximizedCanvas.addEventListener('mouseleave', () => {
        maximizedCanvas.style.cursor = 'default';
    });

    // --- NOVO: Lógica de Zoom com Duplo Clique/Tap ---
    maximizedCanvas.addEventListener('dblclick', () => {
        if (!loadedLightboxImage) return; // Garante que há uma imagem para dar zoom

        const currentSrc = currentGalleryImages[currentImageIndex];
        const originalCanvas = document.querySelector('.gallery canvas[data-original-src="' + currentSrc + '"]');
        const shouldWatermark = originalCanvas ? originalCanvas.getAttribute('watermark-display') === 'true' : false;

        isZoomed = !isZoomed; // Alterna o estado do zoom
        currentPanX = 0; // Zera o pan ao aplicar/remover o zoom (para evitar que a imagem voe para longe)
        currentPanY = 0;
        drawLightboxContent(loadedLightboxImage, shouldWatermark, isZoomed); // Redesenha com o novo estado de zoom
    });


    // Função para atualizar a imagem no lightbox (chamada pelos botões)
    function updateLightboxImage() {
        const src = currentGalleryImages[currentImageIndex];
        const originalCanvas = document.querySelector('.gallery canvas[data-original-src="' + src + '"]');
        const shouldWatermark = originalCanvas ? originalCanvas.getAttribute('watermark-display') === 'true' : false;

        isZoomed = false; // Sempre reseta o zoom ao navegar para outra imagem
        isPanning = false; // Reseta o pan ao navegar
        currentPanX = 0; // Reseta a posição do pan ao navegar
        currentPanY = 0;
        loadedLightboxImage = null; // Zera a imagem para forçar um novo carregamento

        loadImageAndDraw(src, shouldWatermark, false); // Desenha a nova imagem ajustada à tela
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

        // --- Lógica de Paginação da Página Principal (index.html) ---
    // Esta lógica de paginação só deve ser executada na página principal (index.html)
    if (document.querySelector('.grid-covers')) { // Verifica se é a página principal
        const paginationControls = document.getElementById('pagination-controls');
        const coverCards = Array.from(document.querySelectorAll('.grid-covers .cover-card'));
        let itemsPerPage = 0; // Será definido dinamicamente
        let currentPage = 1;
        let totalPages = 0;

        // NOVO: Referências aos botões laterais
        const navPrevSide = document.getElementById('nav-prev-side');
        const navNextSide = document.getElementById('nav-next-side');

        // NOVO: Função para calcular itens por página com base na largura da janela
        function calculateItemsPerPage() {
            // Se a largura da janela for menor ou igual a 768px (ou o breakpoint que preferir para mobile)
            if (window.innerWidth <= 768) {
                itemsPerPage = 1; // 1 card por página no celular
            } else {
                itemsPerPage = 3; // 3 cards por página no desktop (ajuste para o seu padrão)
            }
        }

        function displayItems(page) {
            currentPage = page;
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;

            coverCards.forEach((card, index) => {
                if (index >= start && index < end) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });

            updatePaginationControls(); // Atualiza os botões e números de página
        }

        function updatePaginationControls() {
            paginationControls.innerHTML = ''; // Limpa os controles existentes

            // Recalcula totalPages (importante se itemsPerPage mudou)
            totalPages = Math.ceil(coverCards.length / itemsPerPage);

            // Botão "Anterior"
            const prevButton = document.createElement('button');
            prevButton.textContent = 'Anterior';
            prevButton.disabled = currentPage === 1;
            prevButton.addEventListener('click', () => displayItems(currentPage - 1));
            paginationControls.appendChild(prevButton);

            // Números das páginas
            for (let i = 1; i <= totalPages; i++) {
                const pageNumberButton = document.createElement('button');
                pageNumberButton.textContent = i;
                pageNumberButton.classList.add('page-number');
                if (i === currentPage) {
                    pageNumberButton.classList.add('active');
                }
                pageNumberButton.addEventListener('click', () => displayItems(i));
                paginationControls.appendChild(pageNumberButton);
            }

            // Botão "Próximo"
            const nextButton = document.createElement('button');
            nextButton.textContent = 'Próximo';
            nextButton.disabled = currentPage === totalPages;
            nextButton.addEventListener('click', () => displayItems(currentPage + 1));
            paginationControls.appendChild(nextButton);

            // Esconde os controles se houver apenas 1 página
            if (totalPages <= 1) {
                paginationControls.style.display = 'none';
            } else {
                paginationControls.style.display = 'flex'; // Garante que esteja visível se houver mais de 1 página
            }

            // NOVO: Atualiza a visibilidade dos botões laterais
            //if (totalPages <= 1 || window.innerWidth <= 480) { // Esconde se só tiver 1 página ou se for mobile
            //    navPrevSide.style.display = 'none';
            //    navNextSide.style.display = 'none';
            //} else {
                navPrevSide.style.display = 'flex'; // Exibe para desktop
                navNextSide.style.display = 'flex';

                navPrevSide.disabled = currentPage === 1;
                navNextSide.disabled = currentPage === totalPages;
            //}
        }

        // NOVO: Função para inicializar/reinicializar a paginação
        function initializePagination() {
            calculateItemsPerPage(); // Define quantos itens por página
            currentPage = 1; // Reseta para a primeira página
            displayItems(currentPage); // Exibe os itens da primeira página
        }

        // Inicializa a paginação ao carregar a página
        initializePagination();

        // NOVO: Atualiza a paginação ao redimensionar a janela (para lidar com mudança de mobile/desktop)
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                initializePagination(); // Reinicializa a paginação
            }, 250); // Pequeno atraso para evitar recalcular demais durante o redimensionamento
        });

        // NOVO: Event listeners para os botões laterais
        navPrevSide.addEventListener('click', () => {
            if (currentPage > 1) {
                displayItems(currentPage - 1);
            }
        });

        navNextSide.addEventListener('click', () => {
            if (currentPage < totalPages) {
                displayItems(currentPage + 1);
            }
        });
    }
});
