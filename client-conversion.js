// ========================================
// Client-Side Document Conversion
// Pure JavaScript solution for online deployment
// ========================================

class ClientDocumentConverter {
    constructor() {
        this.loadedLibraries = new Set();
        this.conversionMethods = {
            'docx': 'convertDocxToPdf',
            'doc': 'convertDocToPdf', 
            'xlsx': 'convertXlsxToPdf',
            'xls': 'convertXlsToPdf',
            'pptx': 'convertPptxToPdf',
            'ppt': 'convertPptToPdf',
            'txt': 'convertTxtToPdf',
            'rtf': 'convertRtfToPdf'
        };
        
        this.initializeLibraries();
    }
    
    async initializeLibraries() {
        try {
            // Load required libraries dynamically
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js');
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
            
            console.log('✅ Client-side conversion libraries loaded');
            this.isReady = true;
            
        } catch (error) {
            console.error('❌ Failed to load conversion libraries:', error);
            this.isReady = false;
        }
    }
    
    async loadScript(src) {
        if (this.loadedLibraries.has(src)) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                this.loadedLibraries.add(src);
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    async convertFile(file) {
        if (!this.isReady) {
            throw new Error('Conversion libraries not ready. Please wait a moment and try again.');
        }
        
        const extension = file.name.split('.').pop().toLowerCase();
        const conversionMethod = this.conversionMethods[extension];
        
        if (!conversionMethod) {
            throw new Error(`Unsupported file format: ${extension}`);
        }
        
        console.log(`🔄 Converting ${file.name} using client-side processing...`);
        
        try {
            const pdfBytes = await this[conversionMethod](file);
            return {
                success: true,
                filename: file.name.replace(/\.[^/.]+$/, '') + '.pdf',
                data: pdfBytes,
                size: pdfBytes.length
            };
        } catch (error) {
            console.error(`❌ Conversion failed for ${file.name}:`, error);
            throw new Error(`Failed to convert ${file.name}: ${error.message}`);
        }
    }
    
    async convertDocxToPdf(file) {
        // Use mammoth.js to extract DOCX content
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value;
        
        if (result.messages.length > 0) {
            console.warn('DOCX conversion warnings:', result.messages);
        }
        
        // Convert HTML to PDF using PDF-lib
        return await this.htmlToPdf(html, file.name);
    }
    
    async convertDocToPdf(file) {
        // Try FREE unlimited DOC conversion first
        if (window.freeUnlimitedConverter) {
            try {
                console.log('🆓 Using FREE unlimited DOC conversion...');
                return await window.freeUnlimitedConverter.convertFile(file);
            } catch (error) {
                console.log('⚠️ Free conversion failed, using basic fallback...');
            }
        }
        
        // Fallback: Basic text extraction
        console.log('📄 Using basic DOC text extraction...');
        const arrayBuffer = await file.arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer);
        
        // Clean extracted text
        const cleanText = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
                             .replace(/\s+/g, ' ')
                             .trim();
        
        if (!cleanText || cleanText.length < 10) {
            throw new Error('Could not extract readable text from DOC file. Please save as DOCX format for better conversion.');
        }
        
        const html = `
            <html>
            <head>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 40px; 
                        line-height: 1.6;
                    }
                    .header {
                        border-bottom: 2px solid #ccc;
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                        color: #666;
                    }
                    .content {
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    }
                    .footer {
                        margin-top: 30px;
                        padding-top: 10px;
                        border-top: 1px solid #ccc;
                        font-size: 12px;
                        color: #999;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>Converted from: ${this.escapeHtml(file.name)}</h2>
                    <p>Basic text extraction from legacy DOC format</p>
                </div>
                <div class="content">${this.escapeHtml(cleanText)}</div>
                <div class="footer">
                    Note: Original formatting not preserved. For better results, save as DOCX format.
                </div>
            </body>
            </html>
        `;
        
        return await this.htmlToPdf(html, file.name);
    }
    
    async convertXlsxToPdf(file) {
        // Use xlsx.js to read spreadsheet
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Convert first sheet to HTML
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const html = XLSX.utils.sheet_to_html(worksheet);
        
        // Style the HTML for better PDF appearance
        const styledHtml = `
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { border-collapse: collapse; width: 100%; }
                    td, th { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                </style>
            </head>
            <body>
                <h2>Spreadsheet: ${file.name}</h2>
                ${html}
            </body>
            </html>
        `;
        
        return await this.htmlToPdf(styledHtml, file.name);
    }
    
    async convertXlsToPdf(file) {
        // XLS files can be handled by xlsx.js
        return await this.convertXlsxToPdf(file);
    }
    
    async convertPptxToPdf(file) {
        // Try FREE unlimited PPTX conversion
        if (window.freeUnlimitedConverter) {
            try {
                console.log('🆓 Using FREE unlimited PPTX conversion...');
                return await window.freeUnlimitedConverter.convertFile(file);
            } catch (error) {
                console.log('⚠️ Free PPTX conversion failed, using guidance...');
            }
        }
        
        // Provide helpful guidance if free conversion fails
        throw new Error('PowerPoint conversion: Free extraction attempted. For perfect formatting, export as PDF from PowerPoint.');
    }
    
    async convertPptToPdf(file) {
        // Try FREE unlimited PPT conversion
        if (window.freeUnlimitedConverter) {
            try {
                console.log('🆓 Using FREE unlimited PPT conversion...');
                return await window.freeUnlimitedConverter.convertFile(file);
            } catch (error) {
                console.log('⚠️ Free PPT conversion failed, using fallback...');
            }
        }
        
        // Fallback: Basic text extraction for PPT
        console.log('📄 Using basic PPT text extraction...');
        const arrayBuffer = await file.arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer);
        
        // Clean extracted text
        const cleanText = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
                             .replace(/\s+/g, ' ')
                             .trim();
        
        if (!cleanText || cleanText.length < 10) {
            throw new Error('Could not extract readable text from PPT file. Please save as PPTX or export as PDF from PowerPoint.');
        }
        
        const html = `
            <html>
            <head>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 40px; 
                        line-height: 1.6;
                    }
                    .header {
                        border-bottom: 2px solid #ccc;
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                        color: #666;
                    }
                    .content {
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        font-size: 14px;
                    }
                    .footer {
                        margin-top: 30px;
                        padding-top: 10px;
                        border-top: 1px solid #ccc;
                        font-size: 12px;
                        color: #999;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>Presentation Content: ${this.escapeHtml(file.name)}</h2>
                    <p>Text extracted from PowerPoint slides</p>
                </div>
                <div class="content">${this.escapeHtml(cleanText)}</div>
                <div class="footer">
                    Note: Slide layouts and images not preserved. For full fidelity, export as PDF from PowerPoint.
                </div>
            </body>
            </html>
        `;
        
        return await this.htmlToPdf(html, file.name);
    }
    
    async convertTxtToPdf(file) {
        // Simple text to PDF conversion
        const text = await file.text();
        
        const html = `
            <html>
            <head>
                <style>
                    body { 
                        font-family: 'Courier New', monospace; 
                        margin: 40px; 
                        line-height: 1.6;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    }
                </style>
            </head>
            <body>${this.escapeHtml(text)}</body>
            </html>
        `;
        
        return await this.htmlToPdf(html, file.name);
    }
    
    async convertRtfToPdf(file) {
        // RTF is complex - provide fallback
        throw new Error('RTF files require specialized parsing. Please save as TXT or DOCX format for conversion.');
    }
    
    async htmlToPdf(html, originalFilename) {
        // Create a temporary container for rendering
        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.cssText = `
            position: absolute;
            top: -10000px;
            left: -10000px;
            width: 800px;
            background: white;
            padding: 20px;
        `;
        document.body.appendChild(container);
        
        try {
            // Use html2canvas to render HTML to canvas
            const canvas = await html2canvas(container, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                scale: 2 // Higher resolution
            });
            
            // Create PDF using PDF-lib
            const { PDFDocument, rgb } = PDFLib;
            const pdfDoc = await PDFDocument.create();
            
            // Convert canvas to image data
            const imageData = canvas.toDataURL('image/png');
            const pngImage = await pdfDoc.embedPng(imageData);
            
            // Calculate page size based on content
            const pageWidth = 595; // A4 width in points
            const pageHeight = 842; // A4 height in points
            
            // Scale image to fit page
            const { width, height } = pngImage.scale(pageWidth / canvas.width);
            
            // Add page and draw image
            const page = pdfDoc.addPage([pageWidth, pageHeight]);
            page.drawImage(pngImage, {
                x: 0,
                y: pageHeight - height,
                width: width,
                height: height,
            });
            
            // Add metadata
            pdfDoc.setTitle(`Converted: ${originalFilename}`);
            pdfDoc.setProducer('I HATE PDF - Client-side Converter');
            pdfDoc.setCreationDate(new Date());
            
            return await pdfDoc.save();
            
        } finally {
            // Clean up temporary container
            document.body.removeChild(container);
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Utility method to download converted PDF
    downloadPdf(pdfBytes, filename) {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
}

// ========================================
// Integration with Main App
// ========================================

// Initialize client-side converter
window.clientConverter = new ClientDocumentConverter();

// Enhanced conversion status messages
const CONVERSION_SUPPORT = {
    'docx': { 
        supported: true, 
        method: 'client',
        note: 'Full formatting support using mammoth.js' 
    },
    'xlsx': { 
        supported: true, 
        method: 'client',
        note: 'Converts first sheet with styling' 
    },
    'txt': { 
        supported: true, 
        method: 'client',
        note: 'Plain text with monospace formatting' 
    },
    'doc': { 
        supported: false, 
        method: 'server',
        note: 'Please save as DOCX format' 
    },
    'pptx': { 
        supported: false, 
        method: 'alternative',
        note: 'Export as PDF from PowerPoint or use image conversion' 
    },
    'ppt': { 
        supported: false, 
        method: 'alternative',
        note: 'Save as PPTX or export as PDF' 
    },
    'rtf': { 
        supported: false, 
        method: 'alternative',
        note: 'Save as DOCX or TXT format' 
    }
};

console.log('📄 Client-side document converter ready!');
console.log('✅ Supported formats:', Object.keys(CONVERSION_SUPPORT).filter(k => CONVERSION_SUPPORT[k].supported));
console.log('🌐 Perfect for Netlify, Vercel, and static hosting!');
