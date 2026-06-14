import { GAME } from "./config.js";

export function createCanvasRenderer(mainCanvas, gameCard) {
    const ctx = mainCanvas.getContext("2d");
    const lowResCanvas = document.createElement("canvas");
    const lowResCtx = lowResCanvas.getContext("2d");

    let cachedUiChrome = null;
    let lastDrawnPixelSize = null;

    function measureUiChrome() {
        const title = gameCard.querySelector(".title");
        const statsRow = gameCard.querySelector(".stats-row");
        const touchControls = gameCard.querySelector(".touch-controls");
        const controlsGuide = gameCard.querySelector(".controls-guide");
        const backBtn = gameCard.querySelector(".btn-back");

        let chrome = 0;
        [title, statsRow, touchControls, controlsGuide, backBtn].forEach(el => {
            if (el) chrome += el.getBoundingClientRect().height;
        });

        const cardStyle = getComputedStyle(gameCard);
        chrome += parseFloat(cardStyle.paddingTop) + parseFloat(cardStyle.paddingBottom);
        chrome += parseFloat(cardStyle.borderTopWidth) + parseFloat(cardStyle.borderBottomWidth);

        const canvasWrapper = gameCard.querySelector(".canvas-wrapper");
        if (canvasWrapper) {
            const wrapperStyle = getComputedStyle(canvasWrapper);
            chrome += parseFloat(wrapperStyle.marginTop) + parseFloat(wrapperStyle.marginBottom);
        }

        chrome += GAME.UI_CHROME_SAFETY;
        return chrome;
    }

    function invalidateUiChromeCache() {
        cachedUiChrome = null;
    }

    function getUiChrome() {
        if (cachedUiChrome === null) {
            cachedUiChrome = measureUiChrome();
        }
        return cachedUiChrome;
    }

    function computeCanvasSize(naturalW, naturalH) {
        const maxW = Math.min(GAME.MAX_CANVAS_WIDTH, window.innerWidth - GAME.HORIZONTAL_PADDING);
        const maxH = Math.max(120, window.innerHeight - getUiChrome());
        const scale = Math.min(1, maxW / naturalW, maxH / naturalH);
        return {
            w: Math.round(naturalW * scale),
            h: Math.round(naturalH * scale),
        };
    }

    function applyCanvasSize(img) {
        if (!img.naturalWidth) return;
        const { w, h } = computeCanvasSize(img.naturalWidth, img.naturalHeight);
        mainCanvas.width = w;
        mainCanvas.height = h;
        lastDrawnPixelSize = null;
    }

    function drawPixelated(img, pixelSize, force = false) {
        if (!force && pixelSize === lastDrawnPixelSize) return;
        lastDrawnPixelSize = pixelSize;

        const w = mainCanvas.width;
        const h = mainCanvas.height;
        const lw = Math.max(1, Math.floor(w / pixelSize));
        const lh = Math.max(1, Math.floor(h / pixelSize));

        lowResCanvas.width = lw;
        lowResCanvas.height = lh;

        lowResCtx.imageSmoothingEnabled = false;
        lowResCtx.drawImage(img, 0, 0, lw, lh);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(lowResCanvas, 0, 0, lw, lh, 0, 0, w, h);
    }

    function drawFull(img) {
        lastDrawnPixelSize = 1;
        ctx.drawImage(img, 0, 0, mainCanvas.width, mainCanvas.height);
    }

    function clear() {
        ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        lastDrawnPixelSize = null;
    }

    function resetDrawState() {
        lastDrawnPixelSize = null;
    }

    return {
        ctx,
        computeCanvasSize,
        applyCanvasSize,
        drawPixelated,
        drawFull,
        clear,
        resetDrawState,
        invalidateUiChromeCache,
    };
}
