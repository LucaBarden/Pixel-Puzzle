let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

let scoreEl = document.getElementById("score");
let statusEl = document.getElementById("status");

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
    img.src = IMAGES[currentIndex];

    let card = document.getElementById("card");

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        // 🔥 Card exakt an Bildbreite anpassen
        card.style.width = canvas.width + "px";

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

// Tastatursteuerung
document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        e.preventDefault();
        togglePause();
    }

    if (e.code === "KeyN") {
        nextImage();
    }
});

// Startzustand
loadImage();