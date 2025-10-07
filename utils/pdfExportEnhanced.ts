import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';

// Import Amiri font for Arabic support
import './fonts/Amiri-Regular-normal';

/**
 * Enhanced PDF Export with complete Arabic support
 * This fixes the encoding issues with Arabic text in PDF exports
 */

interface ExportOptions {
    fileName: string;
    title?: string;
    orientation?: 'portrait' | 'landscape';
    rtl?: boolean;
}

interface BalanceCard {
    title: string;
    value: string;
    color?: string;
}

interface TableExportOptions extends ExportOptions {
    subtitle?: string;
    shopInfo?: string; // Shop name, code, and user info
    summary?: { label: string; value: string; rowSpan?: number }[]; // Added rowSpan for 2-row layout
    headers: string[];
    data: any[][];
    footerRow?: any[]; // Footer row for totals
    balanceCards?: BalanceCard[];
    balanceCardsTitle?: string;
}

/**
 * Initialize jsPDF with Arabic font support
 */
const initializeArabicPDF = (orientation: 'portrait' | 'landscape' = 'portrait'): jsPDF => {
    const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        floatPrecision: 16
    });

    // Set default font to support Arabic
    try {
        pdf.setFont('Amiri-Regular', 'normal');
    } catch (e) {
        // If Amiri font is not available, we'll use the image-based approach
        console.warn('Amiri font not available, using fallback method');
    }

    return pdf;
};

/**
 * Export HTML element to PDF with proper Arabic rendering using html2canvas
 * This is the fallback method that captures HTML as an image
 */
export const exportHTMLToPDFEnhanced = async (
    elementId: string,
    options: ExportOptions
): Promise<void> => {
    try {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error('Element not found');
        }

        // Temporarily modify styles for better PDF rendering
        const originalStyles = {
            fontFamily: element.style.fontFamily,
            direction: element.style.direction
        };

        // Apply Arabic-friendly styles
        element.style.fontFamily = "'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif";
        element.style.direction = options.rtl !== false ? 'rtl' : 'ltr';

        // Capture the element as canvas with enhanced settings
        const canvas = await html2canvas(element, {
            scale: 3, // Higher quality
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            foreignObjectRendering: false, // Better for Arabic text
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight,
            allowTaint: true,
            imageTimeout: 0,
            onclone: (clonedDoc) => {
                // Ensure Arabic fonts are loaded in the cloned document
                const clonedElement = clonedDoc.getElementById(elementId);
                if (clonedElement) {
                    clonedElement.style.fontFamily = "'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif";
                    clonedElement.style.direction = options.rtl !== false ? 'rtl' : 'ltr';

                    // AGGRESSIVE black color forcing for all h1, h2, h3, p elements
                    const titles = clonedElement.querySelectorAll('h1, h2, h3, p');
                    titles.forEach((title: any) => {
                        // Use setProperty with 'important' flag to override ANY inherited styles
                        title.style.setProperty('color', '#000000', 'important');
                        title.style.setProperty('-webkit-text-fill-color', '#000000', 'important');
                        title.style.setProperty('opacity', '1', 'important');
                        title.style.setProperty('visibility', 'visible', 'important');
                        title.style.setProperty('display', 'block', 'important');
                        title.style.setProperty('text-shadow', 'none', 'important');
                        title.style.setProperty('font-weight', '700', 'important');

                        // For h1 (main title), use gray background and FORCE black text
                        if (title.tagName === 'H1') {
                            title.style.setProperty('color', '#000000', 'important');
                            title.style.setProperty('-webkit-text-fill-color', '#000000', 'important');
                            title.style.setProperty('background-color', '#d1d5db', 'important');
                            title.style.setProperty('background', '#d1d5db', 'important');
                            title.style.setProperty('padding', '5mm 5mm', 'important');
                            title.style.setProperty('border', '2px solid #374151', 'important');
                            title.style.setProperty('border-radius', '1.5mm', 'important');
                            title.style.setProperty('font-size', '20pt', 'important');
                            title.style.setProperty('text-shadow', 'none', 'important');
                            title.style.setProperty('font-family', "'Noto Sans Arabic', sans-serif", 'important');
                        }
                    });
                }
            }
        });

        // Restore original styles
        element.style.fontFamily = originalStyles.fontFamily;
        element.style.direction = originalStyles.direction;

        // Convert to PDF using PNG for better quality and text rendering
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({
            orientation: options.orientation || 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth - 20; // Add margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 10; // Top margin

        // Add the image to PDF, handling multiple pages if needed
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= (pageHeight - 20);

        while (heightLeft > 0) {
            position = heightLeft - imgHeight + 10;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= (pageHeight - 20);
        }

        pdf.save(options.fileName);
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        throw error;
    }
};

/**
 * Create a properly formatted HTML table with Arabic support
 */
export const createEnhancedPrintableTable = (
    options: TableExportOptions
): HTMLDivElement => {
    const container = document.createElement('div');
    container.id = `pdf-export-${Date.now()}`;

    // Enhanced styles for Arabic text
    container.style.cssText = `
        position: fixed;
        left: -99999px;
        top: 0;
        width: 210mm;
        padding: 20mm 15mm 15mm 15mm;
        background: #ffffff !important;
        background-color: #ffffff !important;
        font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
        direction: rtl;
        font-size: 12pt;
        line-height: 1.6;
        color: #000000;
    `;

    // Add Google Fonts link for Noto Sans Arabic if not already present
    if (!document.querySelector('link[href*="Noto+Sans+Arabic"]')) {
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);
    }

    // Add a style tag to FORCE h1 to be black - overrides any inherited styles
    const styleTag = document.createElement('style');
    styleTag.textContent = `
        #${container.id} h1,
        #${container.id} .pdf-title-black {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
        }
        #${container.id} p {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
        }
        * {
            color: inherit;
        }
    `;
    container.appendChild(styleTag);

    // Title with AGGRESSIVE black text forcing
    if (options.title) {
        const titleElement = document.createElement('h1');

        // Use inline cssText first
        titleElement.style.cssText = `
            text-align: center;
            margin: 0 0 6mm 0;
            padding: 5mm 5mm;
            font-size: 20pt;
            font-weight: 700;
            font-family: 'Noto Sans Arabic', sans-serif;
            direction: rtl;
            border-radius: 1.5mm;
            border: 2px solid #374151;
        `;

        // Then use setProperty with 'important' to FORCE black color
        titleElement.style.setProperty('color', '#000000', 'important');
        titleElement.style.setProperty('-webkit-text-fill-color', '#000000', 'important');
        titleElement.style.setProperty('background', '#d1d5db', 'important');
        titleElement.style.setProperty('background-color', '#d1d5db', 'important');
        titleElement.style.setProperty('opacity', '1', 'important');
        titleElement.style.setProperty('visibility', 'visible', 'important');
        titleElement.style.setProperty('display', 'block', 'important');
        titleElement.style.setProperty('text-shadow', 'none', 'important');

        titleElement.textContent = options.title;
        titleElement.className = 'pdf-title-black';
        titleElement.setAttribute('data-text-color', 'black');
        container.appendChild(titleElement);
    }

    // Subtitle (Date) - dark text for visibility
    if (options.subtitle) {
        const subtitleElement = document.createElement('p');
        subtitleElement.style.cssText = `
            text-align: center;
            color: #000000 !important;
            background: #e5e7eb !important;
            background-color: #e5e7eb !important;
            margin: 0 0 6mm 0;
            padding: 4mm 5mm;
            font-size: 14pt;
            font-weight: 700;
            font-family: 'Noto Sans Arabic', sans-serif;
            direction: rtl;
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            border-radius: 1.5mm;
            border: 2px solid #6b7280;
            -webkit-text-fill-color: #000000 !important;
            text-shadow: none;
        `;
        subtitleElement.textContent = options.subtitle;
        container.appendChild(subtitleElement);
    }

    // Shop Info (Shop Name, Code, User)
    if (options.shopInfo) {
        const shopInfoElement = document.createElement('div');
        shopInfoElement.style.cssText = `
            margin-bottom: 5mm;
            padding: 3mm 5mm;
            background: #e8f5e9;
            border-right: 3px solid #4caf50;
            font-size: 11pt;
            font-family: 'Noto Sans Arabic', sans-serif;
            direction: rtl;
            text-align: right;
            font-weight: 500;
            color: #2e7d32;
        `;
        shopInfoElement.textContent = options.shopInfo;
        container.appendChild(shopInfoElement);
    }

    // Summary section with 2-row grid layout
    if (options.summary && options.summary.length > 0) {
        const summaryContainer = document.createElement('div');
        summaryContainer.style.cssText = `
            margin: 0 0 8mm 0;
            padding: 5mm;
            background: #f8f9fa;
            border-radius: 2mm;
            font-family: 'Noto Sans Arabic', sans-serif;
            direction: rtl;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 3mm;
        `;

        options.summary.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = `
                display: flex;
                justify-content: space-between;
                padding: 2mm 3mm;
                background: white;
                border-radius: 1.5mm;
                font-size: 11pt;
                direction: rtl;
                font-family: 'Noto Sans Arabic', sans-serif;
                border: 1px solid #dee2e6;
            `;

            const label = document.createElement('span');
            label.style.fontWeight = 'bold';
            label.style.fontFamily = "'Noto Sans Arabic', sans-serif";
            label.style.color = '#495057';
            label.textContent = item.label + ':';

            const value = document.createElement('span');
            value.style.fontFamily = "'Noto Sans Arabic', sans-serif";
            value.style.fontWeight = '600';
            value.style.color = '#212529';
            value.textContent = item.value;

            itemDiv.appendChild(label);
            itemDiv.appendChild(value);
            summaryContainer.appendChild(itemDiv);
        });

        container.appendChild(summaryContainer);
    }

    // Table
    const table = document.createElement('table');
    table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        margin-top: 5mm;
        direction: rtl;
        font-family: 'Noto Sans Arabic', sans-serif;
        table-layout: fixed;
    `;

    // Table Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    options.headers.forEach(header => {
        const th = document.createElement('th');
        th.style.cssText = `
            background-color: #0d9488;
            color: white;
            padding: 3mm;
            text-align: right;
            border: 0.5mm solid #0a7e73;
            font-size: 11pt;
            font-weight: bold;
            font-family: 'Noto Sans Arabic', sans-serif;
            direction: rtl;
            white-space: nowrap;
        `;
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table Body
    const tbody = document.createElement('tbody');
    options.data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.style.cssText = `
            background-color: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};
            page-break-inside: avoid;
        `;

        row.forEach(cell => {
            const td = document.createElement('td');
            td.style.cssText = `
                padding: 2.5mm;
                border: 0.3mm solid #dee2e6;
                text-align: right;
                font-size: 10pt;
                color: #212529;
                font-family: 'Noto Sans Arabic', sans-serif;
                direction: rtl;
                word-wrap: break-word;
                unicode-bidi: embed;
            `;
            // Ensure proper string conversion and handle null/undefined
            const cellValue = cell?.toString() || '';
            td.textContent = cellValue;

            // Add RTL mark for better Arabic rendering
            if (/[\u0600-\u06FF]/.test(cellValue)) {
                td.style.unicodeBidi = 'embed';
                td.dir = 'rtl';
            }

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    // Table Footer (for totals)
    if (options.footerRow && options.footerRow.length > 0) {
        const tfoot = document.createElement('tfoot');
        const footerRow = document.createElement('tr');
        footerRow.style.cssText = `
            background-color: #e8f5e9;
            font-weight: bold;
            border-top: 2px solid #4caf50;
        `;

        options.footerRow.forEach((cell, cellIndex) => {
            const td = document.createElement('td');
            td.style.cssText = `
                padding: 3mm;
                border: 0.5mm solid #4caf50;
                text-align: right;
                font-size: 11pt;
                font-weight: bold;
                color: #2e7d32;
                font-family: 'Noto Sans Arabic', sans-serif;
                direction: rtl;
            `;
            const cellValue = cell?.toString() || '';
            td.textContent = cellValue;

            if (/[\u0600-\u06FF]/.test(cellValue)) {
                td.style.unicodeBidi = 'embed';
                td.dir = 'rtl';
            }

            footerRow.appendChild(td);
        });

        tfoot.appendChild(footerRow);
        table.appendChild(tfoot);
    }

    container.appendChild(table);

    // Balance Cards Section (if provided)
    if (options.balanceCards && options.balanceCards.length > 0) {
        // Section title
        const balanceSectionTitle = document.createElement('div');
        balanceSectionTitle.style.cssText = `
            margin-top: 10mm;
            margin-bottom: 5mm;
            font-size: 14pt;
            font-weight: bold;
            color: #000000;
            font-family: 'Noto Sans Arabic', sans-serif;
            direction: rtl;
            text-align: right;
        `;
        balanceSectionTitle.textContent = options.balanceCardsTitle || 'الأرصدة الحالية';
        container.appendChild(balanceSectionTitle);

        // Cards container
        const cardsContainer = document.createElement('div');
        cardsContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 4mm;
            margin-bottom: 5mm;
            direction: rtl;
        `;

        options.balanceCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.style.cssText = `
                flex: 1;
                min-width: 40mm;
                padding: 4mm;
                background: ${card.color || '#f8f9fa'};
                border: 1px solid #dee2e6;
                border-radius: 2mm;
                text-align: center;
                font-family: 'Noto Sans Arabic', sans-serif;
                direction: rtl;
            `;

            const cardTitle = document.createElement('div');
            cardTitle.style.cssText = `
                font-size: 10pt;
                color: #6c757d;
                margin-bottom: 2mm;
                font-weight: normal;
            `;
            cardTitle.textContent = card.title;

            const cardValue = document.createElement('div');
            cardValue.style.cssText = `
                font-size: 14pt;
                font-weight: bold;
                color: #000000;
            `;
            cardValue.textContent = card.value;

            cardElement.appendChild(cardTitle);
            cardElement.appendChild(cardValue);
            cardsContainer.appendChild(cardElement);
        });

        container.appendChild(cardsContainer);
    }

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
        margin-top: 8mm;
        text-align: center;
        color: #6c757d;
        font-size: 9pt;
        font-family: 'Noto Sans Arabic', sans-serif;
        direction: rtl;
    `;
    const currentDate = new Date().toLocaleDateString('ar-EG-u-nu-latn', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
    footer.textContent = `تم التصدير: ${currentDate}`;
    container.appendChild(footer);

    return container;
};

/**
 * Main export function for tables with Arabic support
 */
export const exportTableToPDFEnhanced = async (
    headers: string[],
    data: any[][],
    title: string,
    fileName: string,
    options?: {
        subtitle?: string;
        shopInfo?: string;
        summary?: { label: string; value: string }[];
        orientation?: 'portrait' | 'landscape';
        footerRow?: any[];
        balanceCards?: BalanceCard[];
        balanceCardsTitle?: string;
    }
): Promise<void> => {
    try {
        // Ensure fileName ends with .pdf
        if (!fileName.endsWith('.pdf')) {
            fileName += '.pdf';
        }

        // Create the enhanced printable table
        const tableDiv = createEnhancedPrintableTable({
            headers,
            data,
            title,
            fileName,
            subtitle: options?.subtitle,
            shopInfo: options?.shopInfo,
            summary: options?.summary,
            orientation: options?.orientation || 'portrait',
            rtl: true,
            footerRow: options?.footerRow,
            balanceCards: options?.balanceCards,
            balanceCardsTitle: options?.balanceCardsTitle
        });

        // Add to document temporarily
        document.body.appendChild(tableDiv);

        // Wait for fonts to load and render
        await document.fonts.ready;
        await new Promise(resolve => setTimeout(resolve, 500));

        // Export to PDF using the enhanced method
        await exportHTMLToPDFEnhanced(tableDiv.id, {
            fileName,
            title,
            orientation: options?.orientation,
            rtl: true
        });

        // Clean up
        document.body.removeChild(tableDiv);
    } catch (error) {
        console.error('Error exporting table to PDF:', error);

        // Try to clean up if there was an error
        const tempElements = document.querySelectorAll('[id^="pdf-export-"]');
        tempElements.forEach(el => el.remove());

        throw error;
    }
};

/**
 * Alternative method using jsPDF's autoTable for better Arabic support
 */
export const exportTableWithAutoTable = (
    headers: string[],
    data: any[][],
    title: string,
    fileName: string,
    options?: {
        subtitle?: string;
        summary?: { label: string; value: string }[];
        orientation?: 'portrait' | 'landscape';
    }
): void => {
    try {
        const pdf = initializeArabicPDF(options?.orientation);

        let yPosition = 20;

        // Add title
        if (title) {
            pdf.setFontSize(18);
            pdf.text(title, pdf.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
            yPosition += 10;
        }

        // Add subtitle
        if (options?.subtitle) {
            pdf.setFontSize(12);
            pdf.text(options.subtitle, pdf.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
            yPosition += 10;
        }

        // Add summary
        if (options?.summary && options.summary.length > 0) {
            pdf.setFontSize(10);
            options.summary.forEach(item => {
                pdf.text(`${item.label}: ${item.value}`, pdf.internal.pageSize.getWidth() - 20, yPosition, { align: 'right' });
                yPosition += 6;
            });
            yPosition += 5;
        }

        // Add table using autoTable
        autoTable(pdf, {
            head: [headers],
            body: data,
            startY: yPosition,
            styles: {
                font: 'Amiri-Regular',
                halign: 'right',
                fontSize: 10,
                cellPadding: 3,
                lineColor: [13, 148, 136],
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: [13, 148, 136],
                textColor: [255, 255, 255],
                fontSize: 11,
                fontStyle: 'bold',
                halign: 'right'
            },
            alternateRowStyles: {
                fillColor: [248, 249, 250]
            },
            margin: { right: 20 },
            didDrawPage: (data) => {
                // Add footer on each page
                const pageCount = pdf.getNumberOfPages();
                pdf.setFontSize(8);
                pdf.text(
                    `صفحة ${data.pageNumber} من ${pageCount}`,
                    pdf.internal.pageSize.getWidth() / 2,
                    pdf.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }
        });

        pdf.save(fileName);
    } catch (error) {
        console.error('Error with autoTable export, falling back to image method:', error);
        // Fallback to the image-based method
        throw error;
    }
};

/**
 * Detect if text contains Arabic characters
 */
const containsArabic = (text: string): boolean => {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
};

/**
 * Smart export that chooses the best method based on content
 */
export const smartExportToPDF = async (
    headers: string[],
    data: any[][],
    title: string,
    fileName: string,
    options?: {
        subtitle?: string;
        summary?: { label: string; value: string }[];
        orientation?: 'portrait' | 'landscape';
    }
): Promise<void> => {
    // Check if content has Arabic text
    const hasArabic = containsArabic(title) ||
                      headers.some(h => containsArabic(h)) ||
                      data.some(row => row.some(cell => containsArabic(String(cell || ''))));

    if (hasArabic) {
        // Use the enhanced HTML method for Arabic content
        return exportTableToPDFEnhanced(headers, data, title, fileName, options);
    } else {
        // Use the faster autoTable method for non-Arabic content
        try {
            exportTableWithAutoTable(headers, data, title, fileName, options);
        } catch (error) {
            // Fallback to HTML method if autoTable fails
            return exportTableToPDFEnhanced(headers, data, title, fileName, options);
        }
    }
};