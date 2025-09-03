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

// New: Default Hex Colors
const DEFAULT_DARK_HEX = "#1b602f";
const DEFAULT_LIGHT_HEX = "#f784c5";

// HTMLImageElement for loading
const originalImage = new Image(); 

// Regular expression to validate a 3 or 6 digit hex color code (without requiring # initially)
const hexRegex = /^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/; // Modified regex: no optional #


// --- Wrap all DOM-dependent code in DOMContentLoaded listener ---
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const imageUpload = document.getElementById('imageUpload');
    const darkColorInput = document.getElementById('darkColor'); // Color picker for dark
    const darkColorTextInput = document.getElementById('darkColorText'); // Text input for dark hex
    const lightColorInput = document.getElementById('lightColor'); // Color picker for light
    const lightColorTextInput = document.getElementById('lightColorText'); // Text input for light hex
    const resetColorsButton = document.getElementById('resetColorsButton'); // New: Reset button

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

    // Dark Color Picker changes
    darkColorInput.addEventListener('input', (event) => {
        darkColorTextInput.value = event.target.value; // Sync text input
        processImage();
    });

    // Dark Color Text Input changes
    darkColorTextInput.addEventListener('input', (event) => {
        let hex = event.target.value;
        // Check for 3 or 6 digit hex, optionally without #
        if (hexRegex.test(hex)) { 
            const normalizedHex = hex.startsWith('#') ? hex : '#' + hex;
            darkColorInput.value = normalizedHex; // Sync color picker
            processImage();
        } else {
            console.warn(`Invalid hex code entered for dark color: ${hex}`);
            // Optionally, provide visual feedback for invalid input, e.g., highlight the text input
        }
    });

    // Light Color Picker changes
    lightColorInput.addEventListener('input', (event) => {
        lightColorTextInput.value = event.target.value; // Sync text input
        processImage();
    });

    // Light Color Text Input changes
    lightColorTextInput.addEventListener('input', (event) => {
        let hex = event.target.value;
        if (hexRegex.test(hex)) { 
            const normalizedHex = hex.startsWith('#') ? hex : '#' + hex;
            lightColorInput.value = normalizedHex; // Sync color picker
            processImage();
        } else {
            console.warn(`Invalid hex code entered for light color: ${hex}`);
        }
    });

    // New: Reset Colors Button Event Listener
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
        const currentDarkHex = darkColorInput.value; // Read from color picker (or text input after sync)
        const currentLightHex = lightColorInput.value; // Read from color picker (or text input after sync)
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
        const darkRgbNormal = hexToRgb(currentDarkHex); // Use current input value
        const lightRgbNormal = hexToRgb(currentLightHex); // Use current input value
        const normalDuotoneImageData = applyDuotone(new ImageData(new Uint8ClampedArray(finalContrastImageData.data), finalContrastImageData.width, finalContrastImageData.height), darkRgbNormal, lightRgbNormal);
        drawImageDataToCanvas(normalDuotoneCanvas, normalDuotoneImageData);
        console.log("DEBUG: Step 4 (Normal Duotone) complete.");

        // Step 5: Generate Inverted Duotone
        const darkRgbInverted = hexToRgb(currentLightHex); // Swap current input values for inverse
        const lightRgbInverted = hexToRgb(currentDarkHex); // Swap current input values for inverse
        const invertedDuotoneImageData = applyDuotone(new ImageData(new Uint8ClampedArray(finalContrastImageData.data), finalContrastImageData.width, finalContrastImageData.height), darkRgbInverted, lightRgbInverted);
        drawImageDataToCanvas(invertedDuotoneCanvas, invertedDuotoneImageData);
        console.log("DEBUG: Step 5 (Inverted Duotone) complete.");

        console.log("DEBUG: processImage() END. All results should be displayed.");
    }
}); // End of DOMContentLoaded