// main.js

// --- Imports from other modules ---
import { hexToRgb, drawImageDataToCanvas } from './modules/utils.js';
import { 
    resizeImageToBounds, 
    applyGreyscale, 
    applyAutoContrast, 
    applyMidtoneContrast 
} from './modules/image-core.js';
import { applyDuotone } from './modules/filters/duotone.js';

// --- Configuration ---
const MAX_LONGEST_EDGE_PX = 1000;
const MIN_SHORTEST_EDGE_PX = 300;

const HEX_COLOR_FOR_DARK = "#1b602f";
const HEX_COLOR_FOR_LIGHT = "#f784c5";
const MIDTONE_CONTRAST_FACTOR = 1.5;

// --- DOM Elements ---
const imageUpload = document.getElementById('imageUpload');
const applyFilterButton = document.getElementById('applyFilterButton');
const originalCanvas = document.getElementById('originalCanvas');
const normalDuotoneCanvas = document.getElementById('normalDuotoneCanvas');
const invertedDuotoneCanvas = document.getElementById('invertedDuotoneCanvas');

const originalImage = new Image(); // HTMLImageElement for loading

// --- Event Handlers ---

imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.onload = () => {
                applyFilterButton.disabled = false;
                
                // Clear previous canvas content (reset width to 0 effectively clears and hides)
                [originalCanvas, normalDuotoneCanvas, invertedDuotoneCanvas].forEach(c => {
                    c.width = 0; 
                    c.height = 0;
                });

                // Apply the filter automatically after upload
                processImage();
            };
            originalImage.src = e.target.result; // Set the image source
        };
        reader.readAsDataURL(file); // Read file as Data URL (Base64 string)
    }
});

applyFilterButton.addEventListener('click', processImage);


// Download functionality for all buttons with class 'download-button'
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('download-button')) {
        const button = event.target;
        const canvasId = button.dataset.canvasId;
        const filenamePrefix = button.dataset.filenamePrefix;
        const fileType = button.dataset.fileType || 'png';
        const quality = parseFloat(button.dataset.quality) || 0.92;

        const canvas = document.getElementById(canvasId);

        if (canvas && canvas.width > 0 && canvas.height > 0) {
            let mimeType;
            let fileExtension;
            if (fileType === 'jpeg') {
                mimeType = 'image/jpeg';
                fileExtension = 'jpg';
            } else {
                mimeType = 'image/png';
                fileExtension = 'png';
            }

            const dataURL = canvas.toDataURL(mimeType, quality);
            
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = `${filenamePrefix}_${Date.now()}.${fileExtension}`;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            console.warn(`Canvas '${canvasId}' is empty or not ready for download.`);
        }
    }
});


/**
 * Orchestrates the image processing pipeline for duotone effects.
 */
function processImage() {
    if (!originalImage.src) {
        alert("Please upload an image first.");
        return;
    }

    // --- Core Processing Pipeline ---

    // Step 1: Resize the image
    const resizedImageData = resizeImageToBounds(originalImage, MAX_LONGEST_EDGE_PX, MIN_SHORTEST_EDGE_PX);
    // Display the original (resized) image
    drawImageDataToCanvas(originalCanvas, resizedImageData);

    // Create a copy of the resized image data for further processing
    // It's important to create new ImageData objects when passing to functions
    // that modify data in-place, if you want to preserve intermediate states.
    const currentImageData = new ImageData(
        new Uint8ClampedArray(resizedImageData.data), 
        resizedImageData.width, 
        resizedImageData.height
    );

    // Step 2: Convert to greyscale (modifies currentImageData in place)
    const greyscaleImageData = applyGreyscale(new ImageData(new Uint8ClampedArray(currentImageData.data), currentImageData.width, currentImageData.height));

    // Step 3: Maximize contrast (2-steps)
    // 3a. Auto-contrast (stretch to full 0-255 range)
    const autoContrastImageData = applyAutoContrast(new ImageData(new Uint8ClampedArray(greyscaleImageData.data), greyscaleImageData.width, greyscaleImageData.height));
    
    // 3b. Stretch midtones
    const finalContrastImageData = applyMidtoneContrast(new ImageData(new Uint8ClampedArray(autoContrastImageData.data), autoContrastImageData.width, autoContrastImageData.height), MIDTONE_CONTRAST_FACTOR);

    // Step 4: Generate Normal Duotone
    const darkRgbNormal = hexToRgb(HEX_COLOR_FOR_DARK);
    const lightRgbNormal = hexToRgb(HEX_COLOR_FOR_LIGHT);
    const normalDuotoneImageData = applyDuotone(new ImageData(new Uint8ClampedArray(finalContrastImageData.data), finalContrastImageData.width, finalContrastImageData.height), darkRgbNormal, lightRgbNormal);
    drawImageDataToCanvas(normalDuotoneCanvas, normalDuotoneImageData);

    // Step 5: Generate Inverted Duotone
    const darkRgbInverted = hexToRgb(HEX_COLOR_FOR_LIGHT); // Swap colors for inverse
    const lightRgbInverted = hexToRgb(HEX_COLOR_FOR_DARK); // Swap colors for inverse
    const invertedDuotoneImageData = applyDuotone(new ImageData(new Uint8ClampedArray(finalContrastImageData.data), finalContrastImageData.width, finalContrastImageData.height), darkRgbInverted, lightRgbInverted);
    drawImageDataToCanvas(invertedDuotoneCanvas, invertedDuotoneImageData);
}