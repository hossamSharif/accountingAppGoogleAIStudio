import { jsPDF } from 'jspdf';

/**
 * Arabic Font Loader for jsPDF
 *
 * This module provides a way to add proper Arabic fonts to jsPDF for better text rendering.
 * For production use, you should replace the placeholder font data with actual Arabic font files.
 */

/**
 * Load Amiri font for Arabic text
 * Amiri is a free, open-source Arabic font with excellent support for Arabic script
 *
 * To use this in production:
 * 1. Download Amiri font from: https://fonts.google.com/specimen/Amiri
 * 2. Convert the .ttf file to Base64 using: https://www.giftofspeed.com/base64-encoder/
 * 3. Replace the placeholder below with the actual Base64 string
 */
export const loadAmiriFont = async (doc: jsPDF): Promise<void> => {
    // In production, you would load the actual Amiri font Base64 here
    // For now, we'll use a fallback approach

    try {
        // Placeholder for Amiri font Base64
        // const amiriBase64 = "YOUR_AMIRI_FONT_BASE64_STRING_HERE";
        // doc.addFileToVFS("Amiri-Regular.ttf", amiriBase64);
        // doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
        // doc.setFont("Amiri");

        console.log("Amiri font would be loaded here in production");
    } catch (error) {
        console.error("Failed to load Amiri font:", error);
        // Fallback to default font
    }
};

/**
 * Load Cairo font for Arabic text
 * Cairo is a modern Arabic font with good readability
 *
 * To use this in production:
 * 1. Download Cairo font from: https://fonts.google.com/specimen/Cairo
 * 2. Convert the .ttf file to Base64
 * 3. Replace the placeholder below with the actual Base64 string
 */
export const loadCairoFont = async (doc: jsPDF): Promise<void> => {
    try {
        // Placeholder for Cairo font Base64
        // const cairoBase64 = "YOUR_CAIRO_FONT_BASE64_STRING_HERE";
        // doc.addFileToVFS("Cairo-Regular.ttf", cairoBase64);
        // doc.addFont("Cairo-Regular.ttf", "Cairo", "normal");
        // doc.setFont("Cairo");

        console.log("Cairo font would be loaded here in production");
    } catch (error) {
        console.error("Failed to load Cairo font:", error);
    }
};

/**
 * Load Tajawal font for Arabic text
 * Tajawal is designed for both Arabic and Latin scripts
 *
 * To use this in production:
 * 1. Download Tajawal font from: https://fonts.google.com/specimen/Tajawal
 * 2. Convert the .ttf file to Base64
 * 3. Replace the placeholder below with the actual Base64 string
 */
export const loadTajawalFont = async (doc: jsPDF): Promise<void> => {
    try {
        // Placeholder for Tajawal font Base64
        // const tajawalBase64 = "YOUR_TAJAWAL_FONT_BASE64_STRING_HERE";
        // doc.addFileToVFS("Tajawal-Regular.ttf", tajawalBase64);
        // doc.addFont("Tajawal-Regular.ttf", "Tajawal", "normal");
        // doc.setFont("Tajawal");

        console.log("Tajawal font would be loaded here in production");
    } catch (error) {
        console.error("Failed to load Tajawal font:", error);
    }
};

/**
 * Load the best available Arabic font
 * Tries to load fonts in order of preference
 */
export const loadBestArabicFont = async (doc: jsPDF): Promise<string> => {
    // Try to load fonts in order of preference
    const fontLoaders = [
        { name: 'Amiri', loader: loadAmiriFont },
        { name: 'Cairo', loader: loadCairoFont },
        { name: 'Tajawal', loader: loadTajawalFont }
    ];

    for (const { name, loader } of fontLoaders) {
        try {
            await loader(doc);
            return name;
        } catch (error) {
            console.warn(`Failed to load ${name} font, trying next...`);
        }
    }

    // If all fonts fail, return default
    console.warn('All Arabic fonts failed to load, using default font');
    return 'helvetica';
};

/**
 * Instructions for setting up Arabic fonts in production:
 *
 * 1. Choose an Arabic font (recommended: Amiri, Cairo, or Tajawal)
 * 2. Download the font file (.ttf format)
 * 3. Convert to Base64:
 *    - Online tool: https://www.giftofspeed.com/base64-encoder/
 *    - Or use Node.js:
 *      ```javascript
 *      const fs = require('fs');
 *      const fontBuffer = fs.readFileSync('path/to/font.ttf');
 *      const base64String = fontBuffer.toString('base64');
 *      fs.writeFileSync('font-base64.txt', base64String);
 *      ```
 * 4. Replace the placeholder in the respective font loader function
 * 5. The font will then be embedded in the PDF for proper Arabic rendering
 *
 * Alternative approach using CDN:
 * You can also load fonts from a CDN by adding them to index.html:
 * <link href="https://fonts.googleapis.com/css2?family=Amiri&display=swap" rel="stylesheet">
 *
 * Then use web fonts in the PDF generation, though this requires the fonts
 * to be available on the client's system for proper rendering.
 */

/**
 * Example usage:
 * ```typescript
 * const doc = new jsPDF();
 * await loadBestArabicFont(doc);
 * doc.text('مرحبا بالعالم', 100, 100);
 * ```
 */