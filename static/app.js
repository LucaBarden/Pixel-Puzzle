import { GAME } from "./js/config.js";
import { createCanvasRenderer } from "./js/canvas.js";
import { prepareGameImage, createPreviewThumbnail, getDisplayName } from "./js/image-utils.js";
import {
    computeProgress,
    computeScore,
    computePixelSize,
    accumulateSessionTotal,
    formatProgress,
} from "./js/game-logic.js";
import { storage } from "./js/storage.js";

// ─── DOM Refs ────────────────────────────────────────────────────────────────
const canvas           = document.getElementById("canvas");
const scoreEl          = document.getElementById("score");
const sessionTotalEl   = document.getElementById("session-total");
const progressEl       = document.getElementById("progress");
const statusEl         = document.getElementById("status");
const pbBadge          = document.getElementById("personal-best");
const pbValueEl        = document.getElementById("pb-value");
const welcomeScreen    = document.getElementById("welcome-screen");
const gameCard         = document.getElementById("card");
const winScreen        = document.getElementById("win-screen");
const finalScoreEl     = document.getElementById("final-score");
const pbComparisonEl   = document.getElementById("pb-comparison");
const winNewGameBtn    = document.getElementById("win-new-game-btn");
const dropZone         = document.getElementById("drop-zone");
const fileInput        = document.getElementById("file-input");
const previewContainer = document.getElementById("preview-container");
const previewList      = document.getElementById("preview-list");
const fileCountEl      = document.getElementById("file-count");
const startBtn         = document.getElementById("start-btn");
const defaultBtn       = document.getElementById("default-btn");
const touchPauseBtn    = document.getElementById("touch-pause-btn");
const touchNextBtn     = document.getElementById("touch-next-btn");
const newGameBtn       = document.getElementById("new-game-btn");
const imageLoading     = document.getElementById("image-loading");
const gameError        = document.getElementById("game-error");
const welcomeError     = document.getElementById("welcome-error");

const renderer = createCanvasRenderer(canvas, gameCard);

// ─── Game State ───────────────────────────────────────────────────────────────
let IMAGES           = [];
let currentIndex     = 0;
let img              = new Image();
let preloadedImg     = null;
let preloadedIndex   = -1;
let startTime, pauseTime, animationFrame;
let paused           = true;
let started          = false;
let score            = GAME.MAX_SCORE;
let lastDisplayedScore = null;
let sessionTotal     = 0;
let gameFinished     = false;
let resizeTimer      = null;
let sessionBlobUrls  = [];
let selectedItems    = [];
let dragSourceIndex  = null;

const PLAY_ICON  = "M8 5v14l11-7z";
const PAUSE_ICON = "M6 19h4V5H6v14zm8-14v14h4V5h-4z";

// ─── Personal Best ────────────────────────────────────────────────────────────
function refreshPBDisplay() {
    const pb = storage.getPersonalBest();
    if (pb && pb.total > 0) {
        pbValueEl.textContent = pb.total;
        pbBadge.title = storage.formatPersonalBest(pb);
        pbBadge.classList.remove("hidden");
    }
}

// ─── Status & Score ───────────────────────────────────────────────────────────
function setStatus(text) {
    statusEl.textContent = text;
}

function updateScore(force = false) {
    if (!force && score === lastDisplayedScore) return;
    lastDisplayedScore = score;
    scoreEl.textContent = "Score: " + score;
}

function updateSessionTotalDisplay() {
    sessionTotalEl.textContent = "Gesamt: " + sessionTotal;
}

function updateProgressDisplay() {
    progressEl.textContent = formatProgress(currentIndex, IMAGES.length);
}

function showGameError(message) {
    gameError.textContent = message;
    gameError.classList.remove("hidden");
}

function hideGameError() {
    gameError.classList.add("hidden");
    gameError.textContent = "";
}

function showWelcomeError(message) {
    welcomeError.textContent = message;
    welcomeError.classList.remove("hidden");
}

function hideWelcomeError() {
    welcomeError.classList.add("hidden");
    welcomeError.textContent = "";
}

function setImageLoading(visible) {
    imageLoading.classList.toggle("hidden", !visible);
}

function setPlayIcon() {
    touchPauseBtn.querySelector("svg path").setAttribute("d", PLAY_ICON);
}

function setPauseIcon() {
    touchPauseBtn.querySelector("svg path").setAttribute("d", PAUSE_ICON);
}

// ─── Canvas / Progress helpers ────────────────────────────────────────────────
function getElapsedMs() {
    if (!started) return 0;
    if (paused && pauseTime) return pauseTime - startTime;
    return Date.now() - startTime;
}

function getCurrentPixelSize() {
    if (!started) return GAME.INITIAL_PIXEL_SIZE;
    return computePixelSize(computeProgress(getElapsedMs()));
}

function redrawCanvas() {
    if (!img.naturalWidth) return;
    const pixelSize = getCurrentPixelSize();
    const progress = computeProgress(getElapsedMs());
    if (pixelSize <= 1 && progress >= 1) {
        renderer.drawFull(img);
    } else {
        renderer.drawPixelated(img, pixelSize, true);
    }
}

// ─── Preloading ───────────────────────────────────────────────────────────────
function clearPreload() {
    preloadedImg = null;
    preloadedIndex = -1;
}

function preloadNext() {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= IMAGES.length) {
        clearPreload();
        return;
    }
    if (preloadedIndex === nextIndex && preloadedImg?.complete) return;

    const preload = new Image();
    preload.onload = () => {
        preloadedImg = preload;
        preloadedIndex = nextIndex;
    };
    preload.onerror = () => {
        console.warn("Preload failed for index", nextIndex);
        if (preloadedIndex === nextIndex) clearPreload();
    };
    preload.src = IMAGES[nextIndex];
}

// ─── Image Loading ────────────────────────────────────────────────────────────
function onImageReady() {
    renderer.applyCanvasSize(img);
    score = GAME.MAX_SCORE;
    started = false;
    paused = true;
    lastDisplayedScore = null;
    updateScore(true);
    updateProgressDisplay();
    setStatus("Bereit");
    refreshPBDisplay();
    hideGameError();
    setImageLoading(false);
    renderer.drawPixelated(img, GAME.INITIAL_PIXEL_SIZE, true);
    setPlayIcon();
    preloadNext();
}

function loadImage() {
    if (IMAGES.length === 0) return;

    hideGameError();
    setImageLoading(true);
    renderer.resetDrawState();

    if (preloadedIndex === currentIndex && preloadedImg?.complete && preloadedImg.naturalWidth) {
        img = preloadedImg;
        clearPreload();
        onImageReady();
        return;
    }

    img = new Image();
    img.onload = onImageReady;
    img.onerror = () => {
        setImageLoading(false);
        setStatus("Fehler beim Laden");
        showGameError("Bild konnte nicht geladen werden. Drücke N zum Überspringen.");
    };
    img.src = IMAGES[currentIndex];
}

function handleResize() {
    if (gameCard.classList.contains("hidden") || !img.naturalWidth) return;
    renderer.invalidateUiChromeCache();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        renderer.applyCanvasSize(img);
        redrawCanvas();
    }, GAME.RESIZE_DEBOUNCE_MS);
}

window.addEventListener("resize", handleResize);

// ─── Game Loop ────────────────────────────────────────────────────────────────
function draw() {
    if (paused) return;

    const elapsed = Date.now() - startTime;
    const progress = computeProgress(elapsed);
    const pixelSize = computePixelSize(progress);

    score = computeScore(progress);
    updateScore();

    if (pixelSize <= 1 && progress >= 1) {
        renderer.drawFull(img);
    } else {
        renderer.drawPixelated(img, pixelSize);
    }

    if (progress < 1) {
        animationFrame = requestAnimationFrame(draw);
    } else {
        setStatus("Fertig");
    }
}

function startGame() {
    if (!started) {
        started = true;
        paused = false;
        startTime = Date.now();
        setStatus("Läuft");
        setPauseIcon();
        draw();
    }
}

function togglePause() {
    if (!started) {
        startGame();
        return;
    }

    if (!paused) {
        paused = true;
        pauseTime = Date.now();
        cancelAnimationFrame(animationFrame);
        setStatus("Pause");
        setPlayIcon();
    } else {
        paused = false;
        startTime += Date.now() - pauseTime;
        setStatus("Läuft");
        setPauseIcon();
        draw();
    }
}

function showWinScreen(total) {
    gameFinished = true;
    finalScoreEl.textContent = total;

    const imageCount = IMAGES.length;
    const improved = storage.savePersonalBest(total, imageCount);

    if (improved) {
        pbComparisonEl.textContent =
            imageCount > 0 ? `${imageCount} Bilder · Neuer Rekord!` : "Neuer Rekord!";
        pbComparisonEl.classList.remove("hidden");
        refreshPBDisplay();
    } else {
        const pb = storage.getPersonalBest();
        if (pb) {
            const dateStr = storage.formatPersonalBestDate(pb);
            pbComparisonEl.textContent = dateStr
                ? `${storage.formatPersonalBest(pb)} (${dateStr})`
                : storage.formatPersonalBest(pb);
            pbComparisonEl.classList.remove("hidden");
        } else {
            pbComparisonEl.classList.add("hidden");
        }
    }

    gameCard.classList.add("fade-out");
    setTimeout(() => {
        gameCard.classList.add("hidden");
        gameCard.classList.remove("fade-out", "fade-in");
        winScreen.classList.remove("hidden");
        winScreen.classList.add("fade-in");
        winNewGameBtn.focus();
    }, 400);
}

function nextImage() {
    if (gameFinished) return;
    cancelAnimationFrame(animationFrame);

    sessionTotal = accumulateSessionTotal(sessionTotal, score);
    updateSessionTotalDisplay();

    currentIndex++;

    if (currentIndex >= IMAGES.length) {
        showWinScreen(sessionTotal);
        return;
    }

    loadImage();
}

// ─── Session Reset ────────────────────────────────────────────────────────────
function clearWelcomeSelection() {
    selectedItems.forEach(item => {
        if (item.thumbUrl?.startsWith("blob:")) URL.revokeObjectURL(item.thumbUrl);
    });
    selectedItems = [];
    previewList.innerHTML = "";
    fileCountEl.textContent = "0";
    previewContainer.classList.add("hidden");
    startBtn.setAttribute("disabled", "true");
    fileInput.value = "";
}

function resetToWelcome() {
    cancelAnimationFrame(animationFrame);
    gameFinished = false;

    sessionBlobUrls.forEach(url => URL.revokeObjectURL(url));
    sessionBlobUrls = [];
    clearPreload();

    IMAGES = [];
    currentIndex = 0;
    score = GAME.MAX_SCORE;
    sessionTotal = 0;
    started = false;
    paused = true;
    lastDisplayedScore = null;
    renderer.clear();
    updateScore(true);
    updateSessionTotalDisplay();
    updateProgressDisplay();
    setStatus("Bereit");
    hideGameError();
    hideWelcomeError();

    clearWelcomeSelection();
    pbComparisonEl.classList.add("hidden");

    defaultBtn.textContent = "Mit Standard-Bildern spielen";
    defaultBtn.removeAttribute("disabled");
    startBtn.textContent = "Spiel starten";

    const activeScreen = winScreen.classList.contains("hidden") ? gameCard : winScreen;
    activeScreen.classList.add("fade-out");
    setTimeout(() => {
        gameCard.classList.add("hidden");
        gameCard.classList.remove("fade-out", "fade-in");
        winScreen.classList.add("hidden");
        winScreen.classList.remove("fade-out", "fade-in");
        welcomeScreen.classList.remove("hidden", "fade-out");
        welcomeScreen.classList.add("fade-in");
    }, 400);
}

// ─── Screen Transition ────────────────────────────────────────────────────────
function transitionToGame(imagesList) {
    IMAGES = imagesList;
    currentIndex = 0;
    sessionTotal = 0;
    gameFinished = false;
    updateSessionTotalDisplay();
    updateProgressDisplay();
    hideWelcomeError();

    welcomeScreen.classList.add("fade-out");
    setTimeout(() => {
        welcomeScreen.classList.add("hidden");
        gameCard.classList.remove("hidden");
        gameCard.classList.add("fade-in");
        renderer.invalidateUiChromeCache();
        loadImage();
    }, 400);
}

// ─── Welcome Screen: Preview & Reorder ────────────────────────────────────────
function createPreviewChip(item, index) {
    const chip = document.createElement("div");
    chip.className = "preview-chip";
    chip.draggable = true;
    chip.dataset.index = String(index);

    const thumbnail = document.createElement("img");
    thumbnail.src = item.thumbUrl;
    thumbnail.className = "preview-thumbnail";
    thumbnail.alt = getDisplayName(item);

    const nameLabel = document.createElement("span");
    nameLabel.className = "preview-name";
    nameLabel.textContent = getDisplayName(item);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.innerHTML = "&times;";
    deleteBtn.setAttribute("aria-label", `${getDisplayName(item)} entfernen`);
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        removeItem(index);
    };

    chip.appendChild(thumbnail);
    chip.appendChild(nameLabel);
    chip.appendChild(deleteBtn);

    chip.addEventListener("dragstart", (e) => {
        dragSourceIndex = index;
        chip.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
    });
    chip.addEventListener("dragend", () => {
        chip.classList.remove("dragging");
        dragSourceIndex = null;
        previewList.querySelectorAll(".preview-chip").forEach(c => c.classList.remove("drag-over"));
    });
    chip.addEventListener("dragover", (e) => {
        e.preventDefault();
        chip.classList.add("drag-over");
    });
    chip.addEventListener("dragleave", () => chip.classList.remove("drag-over"));
    chip.addEventListener("drop", (e) => {
        e.preventDefault();
        chip.classList.remove("drag-over");
        const targetIndex = parseInt(chip.dataset.index, 10);
        if (dragSourceIndex !== null && dragSourceIndex !== targetIndex) {
            reorderItems(dragSourceIndex, targetIndex);
        }
    });

    return chip;
}

function reorderItems(fromIndex, toIndex) {
    const [moved] = selectedItems.splice(fromIndex, 1);
    selectedItems.splice(toIndex, 0, moved);
    renderPreviewList();
}

function renderPreviewList() {
    previewList.innerHTML = "";
    selectedItems.forEach((item, index) => {
        previewList.appendChild(createPreviewChip(item, index));
    });
    fileCountEl.textContent = selectedItems.length;

    if (selectedItems.length > 0) {
        previewContainer.classList.remove("hidden");
        startBtn.removeAttribute("disabled");
    } else {
        previewContainer.classList.add("hidden");
        startBtn.setAttribute("disabled", "true");
    }
}

async function addFileItems(files) {
    for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        try {
            const thumbUrl = await createPreviewThumbnail(file);
            selectedItems.push({ type: "file", file, thumbUrl });
        } catch (e) {
            console.error("Preview failed:", e);
        }
    }
    renderPreviewList();
}

async function addUrlItems(urls) {
    for (const url of urls) {
        try {
            const thumbUrl = await createPreviewThumbnail(url);
            selectedItems.push({ type: "url", url, thumbUrl });
        } catch {
            selectedItems.push({ type: "url", url, thumbUrl: url });
        }
    }
    renderPreviewList();
}

function removeItem(index) {
    const item = selectedItems[index];
    if (item?.thumbUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(item.thumbUrl);
    }
    selectedItems.splice(index, 1);
    renderPreviewList();
}

function handleFiles(files) {
    addFileItems([...files]);
    fileInput.value = "";
}

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", (e) => {
    if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        fileInput.click();
    }
});

fileInput.addEventListener("change", (e) => {
    if (e.target.files?.length) handleFiles(e.target.files);
});

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});
["dragleave", "dragend"].forEach(type => {
    dropZone.addEventListener(type, () => dropZone.classList.remove("dragover"));
});
dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
});

// ─── Welcome Screen: Buttons ──────────────────────────────────────────────────
startBtn.addEventListener("click", async () => {
    if (selectedItems.length === 0) return;

    startBtn.textContent = "Bilder werden vorbereitet…";
    startBtn.setAttribute("disabled", "true");
    hideWelcomeError();

    try {
        const maxW = Math.min(GAME.MAX_CANVAS_WIDTH, window.innerWidth - GAME.HORIZONTAL_PADDING);
        const maxH = Math.max(400, window.innerHeight - 320);

        const urls = await Promise.all(
            selectedItems.map(async (item) => {
                if (item.type === "file") {
                    const url = await prepareGameImage(item.file, maxW, maxH);
                    sessionBlobUrls.push(url);
                    return url;
                }
                return item.url;
            })
        );

        selectedItems.forEach(item => {
            if (item.thumbUrl?.startsWith("blob:")) URL.revokeObjectURL(item.thumbUrl);
        });
        selectedItems = [];
        previewList.innerHTML = "";
        previewContainer.classList.add("hidden");

        transitionToGame(urls);
    } catch (e) {
        console.error("Image preparation failed:", e);
        showWelcomeError("Fehler beim Vorbereiten der Bilder. Bitte erneut versuchen.");
    } finally {
        startBtn.textContent = "Spiel starten";
        if (selectedItems.length > 0) startBtn.removeAttribute("disabled");
    }
});

defaultBtn.addEventListener("click", async () => {
    try {
        defaultBtn.textContent = "Lade Bilder...";
        defaultBtn.setAttribute("disabled", "true");
        hideWelcomeError();

        const response = await fetch("/api/images");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const defaultImages = data.images || [];

        if (defaultImages.length === 0) {
            showWelcomeError("Keine Standard-Bilder auf dem Server gefunden! Bitte eigene Bilder hochladen.");
            return;
        }

        clearWelcomeSelection();
        await addUrlItems(defaultImages);
    } catch (e) {
        console.error("Fehler beim Laden der Standard-Bilder:", e);
        showWelcomeError("Fehler beim Verbinden zum Server.");
    } finally {
        defaultBtn.textContent = "Mit Standard-Bildern spielen";
        defaultBtn.removeAttribute("disabled");
    }
});

// ─── Controls ─────────────────────────────────────────────────────────────────
touchPauseBtn.addEventListener("click", togglePause);
touchNextBtn.addEventListener("click", nextImage);
newGameBtn.addEventListener("click", resetToWelcome);
winNewGameBtn.addEventListener("click", resetToWelcome);

document.addEventListener("keydown", (e) => {
    if (!welcomeScreen.classList.contains("hidden")) return;
    if (!winScreen.classList.contains("hidden")) return;

    if (e.code === "Space") {
        e.preventDefault();
        togglePause();
    }
    if (e.code === "KeyN" && !gameFinished) {
        nextImage();
    }
});

refreshPBDisplay();
