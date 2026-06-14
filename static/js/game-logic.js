import { GAME } from "./config.js";

export function computeProgress(elapsedMs) {
    return Math.min(elapsedMs / GAME.DURATION_MS, 1);
}

export function computeScore(progress) {
    return Math.max(0, Math.floor(GAME.MAX_SCORE * (1 - progress)));
}

export function computePixelSize(progress) {
    return Math.max(1, Math.floor(GAME.INITIAL_PIXEL_SIZE * (1 - progress)));
}

export function accumulateSessionTotal(currentTotal, imageScore) {
    return currentTotal + imageScore;
}

export function isGameComplete(currentIndex, totalImages) {
    return currentIndex >= totalImages;
}

export function formatProgress(currentIndex, totalImages) {
    if (totalImages === 0) return "—";
    return `Bild ${currentIndex + 1} / ${totalImages}`;
}
