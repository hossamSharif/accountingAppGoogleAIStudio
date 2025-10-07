import { jsPDF } from 'jspdf';

// This file provides Arabic text support for jsPDF

/**
 * Configure jsPDF for Arabic text support
 * This uses the default Helvetica font with RTL text direction
 * For better Arabic support, consider using a custom Arabic font
 */
export const configurePDFArabicSupport = (doc: jsPDF) => {
    // Set text direction to RTL for Arabic
    doc.setR2L(true);

    // Set default font
    doc.setFont("helvetica", "normal");

    return doc;
};

/**
 * Reverse Arabic text for proper display in PDF
 * jsPDF doesn't handle RTL text properly, so we need to reverse it
 */
export const reverseArabicText = (text: string): string => {
    // Check if text contains Arabic characters
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
    if (!arabicRegex.test(text)) {
        return text;
    }

    // Split by spaces to preserve word boundaries
    const words = text.split(' ');

    // Reverse the order of words for RTL
    const reversedWords = words.reverse();

    // Join back together
    return reversedWords.join(' ');
};

/**
 * Format mixed Arabic/English text for PDF
 * Handles numbers and English words within Arabic text
 */
export const formatMixedText = (text: string): string => {
    // Regular expression to match different parts
    const parts = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+|[0-9]+|[a-zA-Z]+|\s+|[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF0-9a-zA-Z\s]+/g);

    if (!parts) return text;

    const formattedParts: string[] = [];
    let arabicBuffer: string[] = [];

    parts.forEach((part, index) => {
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

        if (arabicRegex.test(part)) {
            // Arabic text
            arabicBuffer.push(part);
        } else if (/[0-9]/.test(part) || /[a-zA-Z]/.test(part)) {
            // Numbers or English - keep as is
            if (arabicBuffer.length > 0) {
                formattedParts.push(...arabicBuffer.reverse());
                arabicBuffer = [];
            }
            formattedParts.push(part);
        } else {
            // Other characters (spaces, punctuation)
            if (arabicBuffer.length > 0) {
                formattedParts.push(...arabicBuffer.reverse());
                arabicBuffer = [];
            }
            formattedParts.push(part);
        }
    });

    // Add any remaining Arabic text
    if (arabicBuffer.length > 0) {
        formattedParts.push(...arabicBuffer.reverse());
    }

    return formattedParts.join('');
};

/**
 * Create a properly formatted Arabic PDF text
 * Handles alignment and text direction issues
 */
export const createArabicPDFText = (
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    options?: any
): void => {
    // Process the text for Arabic display
    const processedText = formatMixedText(text);

    // Apply text with proper alignment
    const defaultOptions = {
        align: 'right',
        lang: 'ar',
        ...options
    };

    doc.text(processedText, x, y, defaultOptions);
};

/**
 * Helper to add Arabic font to jsPDF
 * This would need an actual Arabic font file converted to Base64
 */
export const addArabicFont = async (doc: jsPDF) => {
    // For production, you would load an actual Arabic font here
    // Examples: Amiri, Cairo, Tajawal, etc.
    // The font needs to be converted to Base64 and embedded

    // Placeholder for font loading
    // In production, you would do something like:
    // const fontBase64 = await loadFontFile('path/to/arabic-font.ttf');
    // doc.addFileToVFS('ArialUnicodeMS.ttf', fontBase64);
    // doc.addFont('ArialUnicodeMS.ttf', 'ArialUnicodeMS', 'normal');
    // doc.setFont('ArialUnicodeMS');

    return doc;
};

/**
 * Configure autoTable for Arabic text
 */
export const configureAutoTableArabic = () => {
    return {
        styles: {
            font: 'helvetica',
            fontStyle: 'normal',
            halign: 'right' as const,
            fontSize: 10,
            cellPadding: 3,
            textColor: [0, 0, 0],
            lineColor: [200, 200, 200],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [13, 148, 136],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'right' as const
        },
        columnStyles: {
            0: { halign: 'center' as const }, // Usually for numbers
            1: { halign: 'right' as const },
            2: { halign: 'right' as const },
            3: { halign: 'right' as const },
            4: { halign: 'center' as const }, // Usually for dates
            5: { halign: 'right' as const }
        },
        // RTL table direction
        tableDirection: 'rtl' as const,
        margin: { top: 20, right: 10, bottom: 10, left: 10 }
    };
};

/**
 * Process table data for Arabic display
 */
export const processTableDataForArabic = (data: any[][]): any[][] => {
    return data.map(row =>
        row.map(cell => {
            if (typeof cell === 'string') {
                // Check if it's a number or date pattern
                if (/^\d+([.,]\d+)*$/.test(cell) || /\d{1,2}\/\d{1,2}\/\d{4}/.test(cell)) {
                    return cell; // Keep numbers and dates as is
                }
                // Process Arabic text
                return formatMixedText(cell);
            }
            return cell;
        })
    );
};

/**
 * Process headers for Arabic display
 */
export const processHeadersForArabic = (headers: string[][]): string[][] => {
    return headers.map(row =>
        row.map(header => formatMixedText(header))
    );
};