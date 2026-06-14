// ─── DOM Refs ────────────────────────────────────────────────────────────────
const canvas        = document.getElementById("canvas");
const ctx           = canvas.getContext("2d");
const scoreEl       = document.getElementById("score");
const statusEl      = document.getElementById("status");
const pbBadge       = document.getElementById("personal-best");
const pbValueEl     = document.getElementById("pb-value");
const welcomeScreen = document.getElementById("welcome-screen");
const gameCard      = document.getElementById("card");
const dropZone      = document.getElementById("drop-zone");
const fileInput     = document.getElementById("file-input");
const previewContainer = document.getElementById("preview-container");
const previewList   = document.getElementById("preview-list");
const fileCountEl   = document.getElementById("file-count");
const startBtn      = document.getElementById("start-btn");
const defaultBtn    = document.getElementById("default-btn");
const touchPauseBtn = document.getElementById("touch-pause-btn");
const touchNextBtn  = document.getElementById("touch-next-btn");
const newGameBtn    = document.getElementById("new-game-btn");

// ─── Game State ───────────────────────────────────────────────────────────────
const MAX_CANVAS_WIDTH  = 700;  // Clamp large images to prevent layout overflow
const DURATION          = 15000;

let IMAGES        = [];
let currentIndex  = 0;
let img           = new Image();
let startTime, pauseTime, animationFrame;
let paused        = true;
let started       = false;
let score         = 1000;

// Tracks blob: URLs created for this session, so we can revoke them later
let sessionBlobUrls = [];

// ─── Personal Best (localStorage) ────────────────────────────────────────────
const PB_KEY = "pixel_puzzle_highscore";

function getPersonalBest() {
    return parseInt(localStorage.getItem(PB_KEY) || "0", 10);
}

function savePersonalBest(newScore) {
    const current = getPersonalBest();
    if (newScore > current) {
        localStorage.setItem(PB_KEY, String(newScore));
        return true;
    }
    return false;
}

function refreshPBDisplay() {
    const pb = getPersonalBest();
    if (pb > 0) {
        pbValueEl.textContent = pb;
        pbBadge.classList.remove("hidden");
    }
}

// ─── Status & Score ───────────────────────────────────────────────────────────
function setStatus(text) {
    statusEl.innerText = text;
}

function updateScore() {
    scoreEl.innerText = "Score: " + score;
}

// ─── Canvas Helpers ───────────────────────────────────────────────────────────
function drawPixelated(pixelSize) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, w / pixelSize, h / pixelSize);
    ctx.drawImage(canvas, 0, 0, w / pixelSize, h / pixelSize, 0, 0, w, h);
}

// ─── Image Loading ────────────────────────────────────────────────────────────
function loadImage() {
    if (IMAGES.length === 0) return;
    img.src = IMAGES[currentIndex];

    img.onload = () => {
        // ✅ Downscale canvas if image is wider than MAX_CANVAS_WIDTH
        let w = img.width;
        let h = img.height;
        if (w > MAX_CANVAS_WIDTH) {
            const ratio = MAX_CANVAS_WIDTH / w;
            w = MAX_CANVAS_WIDTH;
            h = Math.round(h * ratio);
        }

        canvas.width  = w;
        canvas.height = h;

        // Adapt card width to canvas (+ 64px padding for border-box)
        gameCard.style.width = (w + 64) + "px";

        score   = 1000;
        started = false;
        paused  = true;
        updateScore();
        setStatus("Bereit");
        refreshPBDisplay();
        drawPixelated(50);

        // Update touch-pause icon to Play
        touchPauseBtn.querySelector("svg path").setAttribute("d", "M8 5v14l11-7z");
    };
}

// ─── Game Loop ────────────────────────────────────────────────────────────────
function draw() {
    if (paused) return;

    const elapsed  = Date.now() - startTime;
    const progress = Math.min(elapsed / DURATION, 1);
    const pixelSize = Math.max(1, Math.floor(50 * (1 - progress)));

    score = Math.max(0, Math.floor(1000 * (1 - progress)));
    updateScore();
    drawPixelated(pixelSize);

    if (progress < 1) {
        animationFrame = requestAnimationFrame(draw);
    } else {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setStatus("Fertig");
        // Save personal best when image is finished
        const improved = savePersonalBest(score);
        if (improved) refreshPBDisplay();
    }
}

function startGame() {
    if (!started) {
        started   = true;
        paused    = false;
        startTime = Date.now();
        setStatus("Läuft");
        // Switch touch icon to Pause
        touchPauseBtn.querySelector("svg path").setAttribute("d", "M6 19h4V5H6v14zm8-14v14h4V5h-4z");
        draw();
    }
}

function togglePause() {
    if (!started) {
        startGame();
        return;
    }

    if (!paused) {
        paused    = true;
        pauseTime = Date.now();
        cancelAnimationFrame(animationFrame);
        setStatus("Pause");
        touchPauseBtn.querySelector("svg path").setAttribute("d", "M8 5v14l11-7z");
    } else {
        paused = false;
        const pauseDuration = Date.now() - pauseTime;
        startTime += pauseDuration;
        setStatus("Läuft");
        touchPauseBtn.querySelector("svg path").setAttribute("d", "M6 19h4V5H6v14zm8-14v14h4V5h-4z");
        draw();
    }
}

function nextImage() {
    cancelAnimationFrame(animationFrame);

    // Save personal best before moving on
    savePersonalBest(score);
    refreshPBDisplay();

    currentIndex++;

    if (currentIndex >= IMAGES.length) {
        setStatus("Alle Bilder fertig!");
        alert("🎉 Fertig! Du hast alle Bilder gespielt.");
        return;
    }

    loadImage();
}

// ─── Session Reset ────────────────────────────────────────────────────────────
function resetToWelcome() {
    // Cancel any running animation
    cancelAnimationFrame(animationFrame);

    // Revoke all blob URLs created in this session to free memory
    sessionBlobUrls.forEach(url => URL.revokeObjectURL(url));
    sessionBlobUrls = [];

    // Clear image list and reset state
    IMAGES        = [];
    currentIndex  = 0;
    score         = 1000;
    started       = false;
    paused        = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gameCard.style.width = "";
    updateScore();
    setStatus("Bereit");

    // Reset welcome screen buttons
    defaultBtn.innerText = "Mit Standard-Bildern spielen";
    defaultBtn.removeAttribute("disabled");

    // Transition back to welcome screen
    gameCard.classList.add("fade-out");
    setTimeout(() => {
        gameCard.classList.add("hidden");
        gameCard.classList.remove("fade-out", "fade-in");
        welcomeScreen.classList.remove("hidden", "fade-out");
        welcomeScreen.classList.add("fade-in");
    }, 400);
}

// ─── Screen Transition ────────────────────────────────────────────────────────
function transitionToGame(imagesList) {
    IMAGES = imagesList;
    currentIndex = 0;

    welcomeScreen.classList.add("fade-out");
    setTimeout(() => {
        welcomeScreen.classList.add("hidden");
        gameCard.classList.remove("hidden");
        gameCard.classList.add("fade-in");
        loadImage();
    }, 400);
}

// ─── Welcome Screen: File Handling ────────────────────────────────────────────
let selectedFiles    = [];
// Track per-preview object URLs so we can revoke them when previews are removed
let previewBlobUrls  = [];

dropZone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
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
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
});

function handleFiles(files) {
    for (const file of files) {
        if (file.type.startsWith("image/")) {
            selectedFiles.push(file);
        }
    }
    updatePreviews();
}

function removeFile(index) {
    // Revoke the preview object URL for the removed file
    if (previewBlobUrls[index]) {
        URL.revokeObjectURL(previewBlobUrls[index]);
    }
    selectedFiles.splice(index, 1);
    previewBlobUrls.splice(index, 1);
    updatePreviews();
}

function updatePreviews() {
    // Revoke all current preview URLs before rebuilding
    previewBlobUrls.forEach(u => URL.revokeObjectURL(u));
    previewBlobUrls = [];
    previewList.innerHTML = "";

    selectedFiles.forEach((file, index) => {
        const chip = document.createElement("div");
        chip.className = "preview-chip";

        const objUrl = URL.createObjectURL(file);
        previewBlobUrls.push(objUrl);

        const thumbnail = document.createElement("img");
        thumbnail.src = objUrl;
        thumbnail.className = "preview-thumbnail";

        const nameLabel = document.createElement("span");
        nameLabel.className = "preview-name";
        nameLabel.textContent = file.name;

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.innerHTML = "&times;";
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            removeFile(index);
        };

        chip.appendChild(thumbnail);
        chip.appendChild(nameLabel);
        chip.appendChild(deleteBtn);
        previewList.appendChild(chip);
    });

    fileCountEl.textContent = selectedFiles.length;

    if (selectedFiles.length > 0) {
        previewContainer.classList.remove("hidden");
        startBtn.removeAttribute("disabled");
    } else {
        previewContainer.classList.add("hidden");
        startBtn.setAttribute("disabled", "true");
    }
}

// ─── Welcome Screen: Buttons ──────────────────────────────────────────────────
startBtn.addEventListener("click", () => {
    if (selectedFiles.length === 0) return;

    // Create blob URLs for the game session and track them for cleanup
    const urls = selectedFiles.map(file => {
        const url = URL.createObjectURL(file);
        sessionBlobUrls.push(url);
        return url;
    });

    // Revoke preview-only blobs (separate from session blobs)
    previewBlobUrls.forEach(u => URL.revokeObjectURL(u));
    previewBlobUrls = [];

    transitionToGame(urls);
});

defaultBtn.addEventListener("click", async () => {
    try {
        defaultBtn.innerText = "Lade Bilder...";
        defaultBtn.setAttribute("disabled", "true");

        const response = await fetch("/api/images");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const defaultImages = data.images || [];

        if (defaultImages.length === 0) {
            alert("Keine Standard-Bilder auf dem Server gefunden! Bitte eigene Bilder hochladen.");
            defaultBtn.innerText = "Mit Standard-Bildern spielen";
            defaultBtn.removeAttribute("disabled");
            return;
        }

        transitionToGame(defaultImages);
    } catch (e) {
        console.error("Fehler beim Laden der Standard-Bilder:", e);
        alert("Fehler beim Verbinden zum Server.");
        defaultBtn.innerText = "Mit Standard-Bildern spielen";
        defaultBtn.removeAttribute("disabled");
    }
});

// ─── Touch Controls & New Game ────────────────────────────────────────────────
touchPauseBtn.addEventListener("click", togglePause);
touchNextBtn.addEventListener("click", nextImage);
newGameBtn.addEventListener("click", resetToWelcome);

// ─── Keyboard Controls ────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
    // Only active during gameplay
    if (!welcomeScreen.classList.contains("hidden")) return;

    if (e.code === "Space") {
        e.preventDefault();
        togglePause();
    }
    if (e.code === "KeyN") {
        nextImage();
    }
});