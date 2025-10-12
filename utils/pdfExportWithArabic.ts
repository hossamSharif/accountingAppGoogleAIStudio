import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';
import { translate } from './translate';
import type { Language } from '../i18n/i18nContext';

/**
 * Enhanced PDF Export with proper Arabic support using html2canvas
 */

interface ExportOptions {
    fileName: string;
    title?: string;
    orientation?: 'portrait' | 'landscape';
    language?: Language;
}

/**
 * Export HTML element to PDF with proper Arabic rendering
 * This method captures the HTML as an image first, preserving Arabic text
 */
export const exportHTMLToPDF = async (
    elementId: string,
    options: ExportOptions
): Promise<void> => {
    try {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error('Element not found');
        }

        // Capture the element as canvas
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            // Important for Arabic text
            foreignObjectRendering: true,
        });

        // Convert to PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: options.orientation || 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        // Add the image to PDF, handling multiple pages if needed
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(options.fileName);
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        throw error;
    }
};

/**
 * Create a printable HTML table with bilingual text support
 * This creates a temporary hidden div with the table for export
 */
export const createPrintableTable = (
    headers: string[],
    data: any[][],
    title: string,
    subtitle?: string,
    summary?: { label: string; value: string }[],
    language: Language = 'ar'
): HTMLDivElement => {
    const isRTL = language === 'ar';
    const direction = isRTL ? 'rtl' : 'ltr';
    const textAlign = isRTL ? 'right' : 'left';

    const container = document.createElement('div');
    container.style.cssText = `
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: 800px;
        padding: 20px;
        background: white;
        font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
        direction: ${direction};
    `;

    // Title
    const titleElement = document.createElement('h1');
    titleElement.style.cssText = `
        text-align: center;
        color: #333;
        margin-bottom: 10px;
        font-size: 24px;
    `;
    titleElement.textContent = title;
    container.appendChild(titleElement);

    // Subtitle
    if (subtitle) {
        const subtitleElement = document.createElement('p');
        subtitleElement.style.cssText = `
            text-align: center;
            color: #666;
            margin-bottom: 20px;
            font-size: 14px;
        `;
        subtitleElement.textContent = subtitle;
        container.appendChild(subtitleElement);
    }

    // Summary
    if (summary && summary.length > 0) {
        const summaryContainer = document.createElement('div');
        summaryContainer.style.cssText = `
            margin-bottom: 20px;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 5px;
        `;

        summary.forEach(item => {
            const row = document.createElement('div');
            row.style.cssText = `
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
                font-size: 14px;
            `;
            row.innerHTML = `
                <span style="font-weight: bold;">${item.label}:</span>
                <span>${item.value}</span>
            `;
            summaryContainer.appendChild(row);
        });

        container.appendChild(summaryContainer);
    }

    // Table
    const table = document.createElement('table');
    table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
        direction: rtl;
    `;

    // Table Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.style.cssText = `
            background-color: #FDB913;
            color: white;
            padding: 10px;
            text-align: ${textAlign};
            border: 1px solid #ddd;
            font-size: 14px;
        `;
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table Body
    const tbody = document.createElement('tbody');
    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.style.cssText = `
            background-color: ${index % 2 === 0 ? '#ffffff' : '#f9f9f9'};
        `;

        row.forEach(cell => {
            const td = document.createElement('td');
            td.style.cssText = `
                padding: 8px;
                border: 1px solid #ddd;
                text-align: ${textAlign};
                font-size: 13px;
                color: #333;
            `;
            td.textContent = cell?.toString() || '';
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
        margin-top: 20px;
        text-align: center;
        color: #999;
        font-size: 12px;
    `;
    const exportedLabel = translate('exports.pdf.generatedOn', language);
    const locale = language === 'ar' ? 'ar-SA' : 'en-US';
    footer.textContent = `${exportedLabel}: ${new Date().toLocaleDateString(locale)}`;
    container.appendChild(footer);

    return container;
};

/**
 * Export table data to PDF with bilingual support
 */
export const exportTableToPDF = async (
    headers: string[],
    data: any[][],
    title: string,
    fileName: string,
    options?: {
        subtitle?: string;
        summary?: { label: string; value: string }[];
        orientation?: 'portrait' | 'landscape';
        language?: Language;
    }
): Promise<void> => {
    try {
        const language = options?.language || 'ar';

        // Create printable table
        const tableDiv = createPrintableTable(
            headers,
            data,
            title,
            options?.subtitle,
            options?.summary,
            language
        );

        // Add to document temporarily
        document.body.appendChild(tableDiv);

        // Give it a unique ID
        const uniqueId = `pdf-export-${Date.now()}`;
        tableDiv.id = uniqueId;

        // Small delay to ensure rendering
        await new Promise(resolve => setTimeout(resolve, 100));

        // Export to PDF
        await exportHTMLToPDF(uniqueId, {
            fileName,
            title,
            orientation: options?.orientation,
            language
        });

        // Clean up
        document.body.removeChild(tableDiv);
    } catch (error) {
        console.error('Error exporting table to PDF:', error);
        throw error;
    }
};

/**
 * Alternative method using canvas directly in jsPDF with proper font embedding
 * This method creates a virtual canvas with Arabic text rendered correctly
 */
export const exportWithCanvas = (
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    options?: { fontSize?: number; align?: 'left' | 'center' | 'right' }
): void => {
    // Create a temporary canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size
    canvas.width = 500;
    canvas.height = 50;

    // Configure font
    const fontSize = options?.fontSize || 12;
    ctx.font = `${fontSize}px 'Segoe UI', Tahoma, Arial, sans-serif`;
    ctx.textAlign = options?.align || 'right';
    ctx.textBaseline = 'top';
    ctx.direction = 'rtl';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw text
    ctx.fillStyle = '#000000';
    const xPos = options?.align === 'center' ? canvas.width / 2 :
                 options?.align === 'left' ? 10 :
                 canvas.width - 10;
    ctx.fillText(text, xPos, 10);

    // Convert to image and add to PDF
    const imgData = canvas.toDataURL('image/png');

    // Calculate dimensions
    const imgWidth = canvas.width * 0.264583; // Convert pixels to mm (assuming 96 DPI)
    const imgHeight = canvas.height * 0.264583;

    // Add image to PDF
    doc.addImage(imgData, 'PNG', x - (imgWidth / 2), y, imgWidth, imgHeight);
};

/**
 * Simple method to generate PDF with bilingual support using DOM rendering
 */
export const generateArabicPDF = async (
    transactions: any[],
    title: string,
    fileName: string,
    options?: {
        shopName?: string;
        dateRange?: string;
        summary?: { label: string; value: string }[];
        language?: Language;
    }
): Promise<void> => {
    const language = options?.language || 'ar';
    const locale = language === 'ar' ? 'ar-SA' : 'en-US';

    // Prepare headers with translation
    const headers = [
        translate('exports.headers.date', language),
        translate('exports.headers.type', language),
        language === 'ar' ? 'البيان' : 'Context',
        translate('exports.headers.description', language),
        translate('exports.headers.amount', language)
    ];

    // Transaction type translation helper
    const translateType = (type: string): string => {
        const typeMap: Record<string, { ar: string; en: string }> = {
            'SALE': { ar: 'مبيعات', en: 'Sales' },
            'PURCHASE': { ar: 'مشتريات', en: 'Purchases' },
            'EXPENSE': { ar: 'مصروفات', en: 'Expenses' },
            'INCOME': { ar: 'إيرادات', en: 'Income' },
            'TRANSFER': { ar: 'تحويل', en: 'Transfer' }
        };
        return typeMap[type]?.[language] || type;
    };

    // Prepare data
    const data = transactions.map(t => [
        new Date(t.date).toLocaleDateString(locale),
        translateType(t.type),
        t.context || '',
        t.description || '-',
        t.totalAmount?.toLocaleString(locale) || '0'
    ]);

    // Create subtitle
    let subtitle = '';
    if (options?.shopName) {
        subtitle += options.shopName;
    }
    if (options?.dateRange) {
        subtitle += ` - ${options.dateRange}`;
    }

    // Export to PDF
    await exportTableToPDF(headers, data, title, fileName, {
        subtitle,
        summary: options?.summary,
        orientation: 'portrait',
        language
    });
};