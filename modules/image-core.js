// modules/image-core.js

import { clamp } from './utils.js'; // Import utility for clamping

/**
 * Resizes an image while maintaining aspect ratio,
 * to ensure its longest edge is at most `maxLongest`
 * and its shortest edge is at least `minShortest`.
 * Upscaling is used if needed.
 * @param {HTMLImageElement} img - The source HTMLImageElement.
 * @param {number} maxLongest - Maximum length of the longest edge in pixels.
 * @param {number} minShortest - Minimum length of the shortest edge in pixels.
 * @returns {ImageData} The resized image data.
 */
export function resizeImageToBounds(img, maxLongest, minShortest) {
    let { width, height } = img;

    // 1. Scale down if longest edge > maxLongest
    if (Math.max(width, height) > maxLongest) {
        const scaleFactor = maxLongest / Math.max(width, height);
        width = Math.floor(width * scaleFactor);
        height = Math.floor(height * scaleFactor);
    }

    // 2. Scale up if shortest edge < minShortest
    if (Math.min(width, height) < minShortest) {
        const scaleFactor = minShortest / Math.min(width, height);
        width = Math.floor(width * scaleFactor);
        height = Math.floor(height * scaleFactor);
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.drawImage(img, 0, 0, width, height);
    return tempCtx.getImageData(0, 0, width, height);
}

/**
 * Converts an ImageData object to greyscale using luminosity method.
 * @param {ImageData} imageData - The image data to convert.
 * @returns {ImageData} The greyscale image data.
 */
export function applyGreyscale(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const avg = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        data[i] = avg;     // Red
        data[i + 1] = avg; // Green
        data[i + 2] = avg; // Blue
    }
    return imageData;
}

/**
 * Applies auto-contrast to an ImageData object (stretches histogram to 0-255).
 * @param {ImageData} imageData - The greyscale image data to adjust.
 * @returns {ImageData} The contrast-adjusted image data.
 */
export function applyAutoContrast(imageData) {
    const data = imageData.data;
    const histogram = new Array(256).fill(0);

    for (let i = 0; i < data.length; i += 4) {
        histogram[data[i]]++;
    }

    let minVal = 0;
    while (minVal < 255 && histogram[minVal] === 0) {
        minVal++;
    }
    let maxVal = 255;
    while (maxVal > 0 && histogram[maxVal] === 0) {
        maxVal--;
    }

    if (minVal >= maxVal) {
        return imageData;
    }

    const range = maxVal - minVal;
    for (let i = 0; i < data.length; i += 4) {
        let newVal = (data[i] - minVal) * (255 / range);
        data[i] = clamp(newVal, 0, 255);
        data[i + 1] = data[i];
        data[i + 2] = data[i];
    }
    return imageData;
}

/**
 * Applies a midtone contrast enhancement to an ImageData object.
 * @param {ImageData} imageData - The greyscale image data to enhance.
 * @param {number} factor - The contrast enhancement factor (e.g., 1.5).
 * @returns {ImageData} The contrast-enhanced image data.
 */
export function applyMidtoneContrast(imageData, factor) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        let val = (data[i] / 255.0) - 0.5; // Normalize to -0.5 to 0.5 range
        let newVal = (val * factor + 0.5) * 255.0; // Apply contrast and denormalize
        data[i] = clamp(newVal, 0, 255);
        data[i + 1] = data[i];
        data[i + 2] = data[i];
    }
    return imageData;
}