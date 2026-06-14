let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

let scoreEl = document.getElementById("score");
let statusEl = document.getElementById("status");

let IMAGES = [];
let currentIndex = 0;
let img = new Image();

let duration = 15000;
let startTime;

let paused = true;
let started = false;
let pauseTime = 0;

let score = 1000;
let animationFrame;

function setStatus(text) {
    statusEl.innerText = text;
}

function loadImage() {
    if (IMAGES.length === 0) return;
    img.src = IMAGES[currentIndex];

    let card = document.getElementById("card");

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        // 🔥 Card exakt an Bildbreite anpassen (mit 64px Padding für border-box)
        card.style.width = (canvas.width + 64) + "px";

        score = 1000;
        updateScore();

        started = false;
        paused = true;

        setStatus("Bereit");

        drawPixelated(50);
    };
}

function startGame() {
    if (!started) {
        started = true;
        paused = false;
        startTime = Date.now();
        setStatus("Läuft");
        draw();
    }
}

function draw() {
    if (paused) return;

    let elapsed = Date.now() - startTime;
    let progress = Math.min(elapsed / duration, 1);

    let pixelSize = Math.max(1, Math.floor(50 * (1 - progress)));

    score = Math.max(0, Math.floor(1000 * (1 - progress)));
    updateScore();

    drawPixelated(pixelSize);

    if (progress < 1) {
        animationFrame = requestAnimationFrame(draw);
    } else {
        ctx.drawImage(img, 0, 0);
        setStatus("Fertig");
    }
}

function drawPixelated(pixelSize) {
    let w = canvas.width;
    let h = canvas.height;

    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(img, 0, 0, w / pixelSize, h / pixelSize);
    ctx.drawImage(canvas, 0, 0, w / pixelSize, h / pixelSize, 0, 0, w, h);
}

function updateScore() {
    scoreEl.innerText = "Score: " + score;
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
    } else {
        paused = false;
        let pauseDuration = Date.now() - pauseTime;
        startTime += pauseDuration;
        setStatus("Läuft");
        draw();
    }
}

function nextImage() {
    cancelAnimationFrame(animationFrame);

    currentIndex++;

    if (currentIndex >= IMAGES.length) {
        setStatus("Alle Bilder fertig");
        alert("Fertig!");
        return;
    }

    loadImage();
}

// Welcome Screen UI Elements
const welcomeScreen = document.getElementById("welcome-screen");
const gameCard = document.getElementById("card");
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const previewContainer = document.getElementById("preview-container");
const previewList = document.getElementById("preview-list");
const fileCountEl = document.getElementById("file-count");
const startBtn = document.getElementById("start-btn");
const defaultBtn = document.getElementById("default-btn");

let selectedFiles = [];

// Drag and drop event listeners
dropZone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
});

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});

["dragleave", "dragend"].forEach(type => {
    dropZone.addEventListener(type, () => {
        dropZone.classList.remove("dragover");
    });
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
    }
});

function handleFiles(files) {
    for (let file of files) {
        if (file.type.startsWith("image/")) {
            selectedFiles.push(file);
        }
    }
    updatePreviews();
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updatePreviews();
}

function updatePreviews() {
    previewList.innerHTML = "";
    
    selectedFiles.forEach((file, index) => {
        const chip = document.createElement("div");
        chip.className = "preview-chip";
        
        const imgUrl = URL.createObjectURL(file);
        
        const thumbnail = document.createElement("img");
        thumbnail.src = imgUrl;
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

function transitionToGame(imagesList) {
    IMAGES = imagesList;
    currentIndex = 0;
    
    // Smooth transition
    welcomeScreen.classList.add("fade-out");
    
    setTimeout(() => {
        welcomeScreen.classList.add("hidden");
        gameCard.classList.remove("hidden");
        gameCard.classList.add("fade-in");
        loadImage();
    }, 400);
}

// Start Game with Custom Images
startBtn.addEventListener("click", () => {
    if (selectedFiles.length === 0) return;
    const urls = selectedFiles.map(file => URL.createObjectURL(file));
    transitionToGame(urls);
});

// Play with Default Images
defaultBtn.addEventListener("click", async () => {
    try {
        defaultBtn.innerText = "Lade Bilder...";
        defaultBtn.setAttribute("disabled", "true");
        let response = await fetch("/api/images");
        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }
        let data = await response.json();
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

// Tastatursteuerung
document.addEventListener("keydown", (e) => {
    // Tastatursteuerung nur erlauben, wenn das Spiel aktiv ist
    if (welcomeScreen.classList.contains("hidden")) {
        if (e.code === "Space") {
            e.preventDefault();
            togglePause();
        }

        if (e.code === "KeyN") {
            nextImage();
        }
    }
});