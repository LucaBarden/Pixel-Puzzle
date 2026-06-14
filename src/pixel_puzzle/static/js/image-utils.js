import { GAME } from "./config.js";

function loadImageElement(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

async function loadBitmapSource(source) {
    if (source instanceof File) {
        if (typeof createImageBitmap === "function") {
            return createImageBitmap(source);
        }
        return loadImageElement(URL.createObjectURL(source));
    }
    if (typeof source === "string") {
        if (typeof createImageBitmap === "function") {
            const response = await fetch(source);
            const blob = await response.blob();
            return createImageBitmap(blob);
        }
        return loadImageElement(source);
    }
    throw new Error("Unsupported image source");
}

function bitmapToBlobUrl(bitmap, width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);

    if (typeof bitmap.close === "function") {
        bitmap.close();
    }

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) {
                reject(new Error("Failed to create blob"));
                return;
            }
            resolve(URL.createObjectURL(blob));
        }, "image/jpeg", 0.85);
    });
}

function scaleDimensions(naturalW, naturalH, maxW, maxH) {
    const scale = Math.min(1, maxW / naturalW, maxH / naturalH);
    return {
        w: Math.max(1, Math.round(naturalW * scale)),
        h: Math.max(1, Math.round(naturalH * scale)),
    };
}

export async function prepareGameImage(source, maxW, maxH) {
    const bitmap = await loadBitmapSource(source);
    const naturalW = bitmap.width;
    const naturalH = bitmap.height;
    const { w, h } = scaleDimensions(naturalW, naturalH, maxW, maxH);

    if (w === naturalW && h === naturalH && source instanceof File) {
        if (typeof bitmap.close === "function") bitmap.close();
        return URL.createObjectURL(source);
    }

    return bitmapToBlobUrl(bitmap, w, h);
}

export async function createPreviewThumbnail(source, maxSize = GAME.PREVIEW_THUMB_SIZE) {
    const bitmap = await loadBitmapSource(source);
    const { w, h } = scaleDimensions(bitmap.width, bitmap.height, maxSize, maxSize);
    return bitmapToBlobUrl(bitmap, w, h);
}

export function getDisplayName(item) {
    if (item.type === "file") return item.file.name;
    const parts = item.url.split("/");
    return decodeURIComponent(parts[parts.length - 1]);
}
