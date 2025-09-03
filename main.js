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

const MIDTONE_CONTRAST_FACTOR = 1.5;

// Default Hex Colors
const DEFAULT_DARK_HEX = "#1b602f";
const DEFAULT_LIGHT_HEX = "#f784c5";

// HTMLImageElement for loading
const originalImage = new Image(); 

// Regular expression to validate a 3 or 6 digit hex color code (optionally with '#')
// This regex allows 'abc', '#abc', 'aabbcc', '#aabbcc'
const hexRegex = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// Function to normalize hex code: just adds '#' if missing and lowercases, DOES NOT expand 3-digit to 6-digit.
// Returns null if invalid.
function normalizeHexForDisplay(hex) {
    if (!hex) return null; // Handle empty input
    const match = hex.match(hexRegex);
    if (match) {
        return '#' + match[1].toLowerCase(); // Ensure lowercase and starts with '#', but keep original length (3 or 6)
    }
    return null; // Invalid hex
}

// --- Wrap all DOM-dependent code in DOMContentLoaded listener ---
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const imageUpload = document.getElementById('imageUpload');
    const darkColorInput = document.getElementById('darkColor'); // Color picker for dark
    const darkColorTextInput = document.getElementById('darkColorText'); // Text input for dark hex
    const lightColorInput = document.getElementById('lightColor'); // Color picker for light
    const lightColorTextInput = document.getElementById('lightColorText'); // Text input for light hex
    const resetColorsButton = document.getElementById('resetColorsButton'); // Reset button

    const originalCanvas = document.getElementById('originalCanvas');
    const normalDuotoneCanvas = document.getElementById('normalDuotoneCanvas');
    const invertedDuotoneCanvas = document.getElementById('invertedDuotoneCanvas');

    // --- Global Handlers for Image Load/Error ---
    function handleImageLoad() {
        console.log("DEBUG: handleImageLoad fired. Image is ready.");
        if (originalImage.naturalWidth === 0) {
            console.error("DEBUG: Image loaded but has 0 naturalWidth/Height, indicating an error or invalid image.");
            alert("Image loaded, but appears invalid (0 width/height). Please try another image.");
            handleImageError({type: "decode error", message: "Image loaded but dimensions are zero."});
            return;
        }
        
        // Clear previous canvas content (reset width/height to 0 effectively clears and hides)
        [originalCanvas, normalDuotoneCanvas, invertedDuotoneCanvas].forEach(c => {
            c.width = 0; 
            c.height = 0;
            console.log(`DEBUG: Cleared canvas: ${c.id}`);
        });

        processImage(); // Process the image immediately after it loads
        console.log("DEBUG: processImage() called from handleImageLoad.");
    }

    function handleImageError(event) {
        console.error("DEBUG: handleImageError fired.", event);
        alert("Failed to load image. Please ensure it's a valid image file. Check your browser's console for details.");
        
        // Clear canvases on error
        [originalCanvas, normalDuotoneCanvas, invertedDuotoneCanvas].forEach(c => {
            c.width = 0; 
            c.height = 0;
            console.log(`DEBUG: Cleared canvas on error: ${c.id}`);
        });
    }

    // Assign these handlers ONCE to the Image object, before its src is ever set.
    originalImage.onload = handleImageLoad;
    originalImage.onerror = handleImageError;


    // --- Event Handlers for Image Upload ---

    imageUpload.addEventListener('change', (event) => {
        console.log("DEBUG: Image upload change event fired.");
        const file = event.target.files[0];
        if (file) {
            console.log(`DEBUG: File selected: ${file.name}, type: ${file.type}, size: ${file.size} bytes.`);
            const reader = new FileReader();

            reader.onload = (e) => {
                console.log("DEBUG: FileReader onload fired. Setting originalImage.src.");
                originalImage.src = e.target.result; // Set the image source

                // --- Robustness check for immediate image load from cache ---
                setTimeout(() => {
                    if (originalImage.complete && originalImage.naturalWidth !== 0) {
                        console.log("DEBUG: Image reported as complete (via originalImage.complete) and valid, triggering load handler manually.");
                        handleImageLoad(); 
                    } else if (originalImage.complete && originalImage.naturalWidth === 0) {
                        console.error("DEBUG: Image reported as complete but has 0 naturalWidth, indicating a potential decode error.");
                        handleImageError({type: "decode error", message: "Image loaded but has zero dimensions."});
                    } else {
                        console.log("DEBUG: Image not yet complete, waiting for originalImage.onload event to fire naturally.");
                    }
                }, 0); // Delay by 0ms
            };
            reader.onerror = (e) => {
                console.error("DEBUG: FileReader onerror fired.", e.target.error);
                alert(`Error reading file: ${e.target.error.name}. Check your browser's console for details.`);
                handleImageError({type: "FileReader error", error: e.target.error});
            };

            reader.readAsDataURL(file); // Start reading the file as a Data URL
        } else {
            // If no file selected (e.g., user opens dialog then cancels)
            console.log("DEBUG: No file selected (user cancelled dialog).");
            // Clear canvases if a file was previously loaded but now cancelled
            [originalCanvas, normalDuotoneCanvas, invertedDuotoneCanvas].forEach(c => {
                c.width = 0; 
                c.height = 0;
                console.log(`DEBUG: Cleared canvas (no file selected): ${c.id}`);
            });
        }
    });

    // --- Event Listeners for Color Inputs (Synchronization) ---

    // Dark Color Picker changes: Update text input, then process
    darkColorInput.addEventListener('input', (event) => {
        // Color picker value is always #RRGGBB
        darkColorTextInput.value = event.target.value; 
        processImage();
    });

    // Dark Color Text Input changes: Validate, update color picker, then process
    darkColorTextInput.addEventListener('input', (event) => {
        const hex = event.target.value.trim(); // Trim whitespace
        const normalizedHexForDisplay = normalizeHexForDisplay(hex); // Get normalized string for display/picker

        if (normalizedHexForDisplay) { 
            // Valid hex: Update both inputs and process
            darkColorInput.value = normalizedHexForDisplay; // Sync color picker
            darkColorTextInput.value = normalizedHexForDisplay; // Update text input with normalized value (e.g., add #)
            processImage();
        } else if (hex === '' || hex === '#') { 
            // Allow empty or just '#' while typing without immediate error
            darkColorInput.value = '#000000'; // Set picker to black as a safe fallback visually
            // Do not process image immediately on incomplete/invalid text input
        } else {
            console.warn(`Invalid hex code entered for dark color: ${hex}`);
            // Optionally, provide visual feedback for invalid input, e.g., add a class to highlight
            // e.g., darkColorTextInput.classList.add('is-invalid');
        }
    });

    // Light Color Picker changes: Update text input, then process
    lightColorInput.addEventListener('input', (event) => {
        // Color picker value is always #RRGGBB
        lightColorTextInput.value = event.target.value; 
        processImage();
    });

    // Light Color Text Input changes: Validate, update color picker, then process
    lightColorTextInput.addEventListener('input', (event) => {
        const hex = event.target.value.trim();
        const normalizedHexForDisplay = normalizeHexForDisplay(hex);
        if (normalizedHexForDisplay) { 
            lightColorInput.value = normalizedHexForDisplay; // Sync color picker
            lightColorTextInput.value = normalizedHexForDisplay; // Update text input with normalized value
            processImage();
        } else if (hex === '' || hex === '#') {
            lightColorInput.value = '#000000'; // Set picker to black as a safe fallback visually
        } else {
            console.warn(`Invalid hex code entered for light color: ${hex}`);
            // Optionally, add a visual cue
            // e.g., lightColorTextInput.classList.add('is-invalid');
        }
    });

    // Reset Colors Button Event Listener
    resetColorsButton.addEventListener('click', () => {
        console.log("DEBUG: Reset Colors button clicked.");
        darkColorInput.value = DEFAULT_DARK_HEX;
        darkColorTextInput.value = DEFAULT_DARK_HEX;
        lightColorInput.value = DEFAULT_LIGHT_HEX;
        lightColorTextInput.value = DEFAULT_LIGHT_HEX;
        processImage(); // Re-process with default colors
    });


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
        console.log("DEBUG: processImage() START.");
        // Check if an image is actually loaded and ready before processing
        if (!originalImage.src || !originalImage.complete || originalImage.naturalWidth === 0) {
            console.error("DEBUG: processImage() aborted: No valid image loaded.", {src: originalImage.src, complete: originalImage.complete, naturalWidth: originalImage.naturalWidth});
            return; // Exit silently if no image is loaded
        }

        // Get current hex values from input fields
        // We now read the normalized value from the text input after it's been synced
        const currentDarkHex = darkColorTextInput.value; 
        const currentLightHex = lightColorTextInput.value;
        
        // Final validation before processing. Uses hexRegex.test directly.
        if (!hexRegex.test(currentDarkHex) || !hexRegex.test(currentLightHex)) {
            console.error("DEBUG: processImage() aborted: One or both hex colors are invalid (unnormalized).");
            // If the text inputs are displaying invalid text, don't try to process
            return; 
        }

        console.log(`DEBUG: Using colors - Dark: ${currentDarkHex}, Light: ${currentLightHex}`);


        // --- Core Processing Pipeline ---

        // Step 1: Resize the image
        const resizedImageData = resizeImageToBounds(originalImage, MAX_LONGEST_EDGE_PX, MIN_SHORTEST_EDGE_PX);
        drawImageDataToCanvas(originalCanvas, resizedImageData);
        console.log("DEBUG: Step 1 (Resize) complete.");

        // Create a copy of the resized image data for further processing.
        const greyscaleInputImageData = new ImageData(
            new Uint8ClampedArray(resizedImageData.data), 
            resizedImageData.width, 
            resizedImageData.height
        );

        // Step 2: Convert to greyscale (modifies greyscaleInputImageData in place)
        const greyscaleImageData = applyGreyscale(greyscaleInputImageData);
        console.log("DEBUG: Step 2 (Greyscale) complete.");

        // Step 3: Maximize contrast (2-steps)
        // 3a. Auto-contrast (stretch to full 0-255 range)
        const autoContrastImageData = applyAutoContrast(new ImageData(new Uint8ClampedArray(greyscaleImageData.data), greyscaleImageData.width, greyscaleImageData.height));
        
        // 3b. Stretch midtones
        const finalContrastImageData = applyMidtoneContrast(new ImageData(new Uint8ClampedArray(autoContrastImageData.data), autoContrastImageData.width, autoContrastImageData.height), MIDTONE_CONTRAST_FACTOR);
        console.log("DEBUG: Step 3 (Contrast) complete.");

        // Step 4: Generate Normal Duotone
        // hexToRgb already handles #RGB and #RRGGBB correctly.
        const darkRgbNormal = hexToRgb(currentDarkHex); 
        const lightRgbNormal = hexToRgb(currentLightHex); 
        const normalDuotoneImageData = applyDuotone(new ImageData(new Uint8ClampedArray(finalContrastImageData.data), finalContrastImageData.width, finalContrastImageData.height), darkRgbNormal, lightRgbNormal);
        drawImageDataToCanvas(normalDuotoneCanvas, normalDuotoneImageData);
        console.log("DEBUG: Step 4 (Normal Duotone) complete.");

        // Step 5: Generate Inverted Duotone
        const darkRgbInverted = hexToRgb(currentLightHex); 
        const lightRgbInverted = hexToRgb(currentDarkHex); 
        const invertedDuotoneImageData = applyDuotone(new ImageData(new Uint8ClampedArray(finalContrastImageData.data), finalContrastImageData.width, finalContrastImageData.height), darkRgbInverted, lightRgbInverted);
        drawImageDataToCanvas(invertedDuotoneCanvas, invertedDuotoneImageData);
        console.log("DEBUG: Step 5 (Inverted Duotone) complete.");

        console.log("DEBUG: processImage() END. All results should be displayed.");
    }
}); // End of DOMContentLoaded