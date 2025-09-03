// modules/utils.js

/**
 * Converts a hex color string (e.g., "#RRGGBB") to an RGB object.
 * @param {string} hex - Hex color string.
 * @returns {{r: number, g: number, b: number}} RGB object.
 */
export function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

/**
 * Clamps a value between a minimum and maximum.
 * @param {number} value - The value to clamp.
 * @param {number} min - The minimum allowed value.
 * @param {number} max - The maximum allowed value.
 * @returns {number} The clamped value.
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

/**
 * Draws an ImageData object onto a canvas.
 * @param {HTMLCanvasElement} canvas - The target canvas.
 * @param {ImageData} imageData - The ImageData object to draw.
 */
export function drawImageDataToCanvas(canvas, imageData) {
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
}