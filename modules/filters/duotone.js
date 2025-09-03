// modules/filters/duotone.js

import { clamp } from '../utils.js'; // Import helper utility

/**
 * Applies a duotone gradient map to a greyscale ImageData object.
 * @param {ImageData} imageData - The greyscale image data.
 * @param {{r: number, g: number, b: number}} darkRgb - RGB object for the dark color (maps to black).
 * @param {{r: number, g: number, b: number}} lightRgb - RGB object for the light color (maps to white).
 * @returns {ImageData} The duotone-mapped image data.
 */
export function applyDuotone(imageData, darkRgb, lightRgb) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const pixelValue = data[i]; // Greyscale value (R, G, B are identical)
        const alpha = pixelValue / 255.0; // Interpolation factor (0.0 for dark, 1.0 for light)

        // Interpolate each RGB component
        data[i] = clamp(Math.floor(darkRgb.r * (1 - alpha) + lightRgb.r * alpha), 0, 255);     // Red
        data[i + 1] = clamp(Math.floor(darkRgb.g * (1 - alpha) + lightRgb.g * alpha), 0, 255); // Green
        data[i + 2] = clamp(Math.floor(darkRgb.b * (1 - alpha) + lightRgb.b * alpha), 0, 255); // Blue
    }
    return imageData;
}