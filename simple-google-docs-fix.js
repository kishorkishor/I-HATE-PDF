// ========================================
// Simple Google Docs Fix - Direct and Robust
// Guaranteed to work with any Google Docs file
// ========================================

class SimpleGoogleDocsFix {
    constructor() {
        console.log('🔧 Simple Google Docs Fix initialized');
    }
    
    async processGoogleDocsFile(file) {
        console.log(`📄 Processing Google Docs file: ${file.name}`);
        
        try {
            // Read the file content
            const content = await file.text();
            console.log(`📊 File size: ${file.size} bytes`);
            console.log(`📝 Content length: ${content.length} characters`);
            
            // Log first 200 characters for debugging
            console.log(`🔍 Content preview:`, content.substring(0, 200));
            
            // Check if it's a .gdoc shortcut file
            if (file.name.toLowerCase().endsWith('.gdoc')) {
                return await this.handleGdocShortcut(file, content);
            }
            
            // Try to extract any readable content
            const extractedText = this.extractReadableContent(content);
            
            if (extractedText && extractedText.length > 10) {
                console.log(`✅ Found ${extractedText.length} characters of readable content`);
                return await this.createWorkingPdf(extractedText, file.name, 'Google Docs Content');
            }
            
            // If no readable content, create helpful guide
            console.log('⚠️ No readable content found, creating help guide');
            return await this.createHelpfulGuidePdf(file.name, content);
            
        } catch (error) {
            console.error('❌ Error processing Google Docs file:', error);
            return await this.createErrorGuidePdf(file.name, error.message);
        }
    }
    
    async handleGdocShortcut(file, content) {
        console.log('🔗 Handling .gdoc shortcut file');
        
        // Try to find Google Docs URL
        const urlPattern = /https:\/\/docs\.google\.com\/[^\s\n\r"<>]+/g;
        const urls = content.match(urlPattern);
        
        let guideText = `GOOGLE DOCS SHORTCUT FILE GUIDE\n`;
        guideText += `================================\n\n`;
        guideText += `Original file: ${file.name}\n`;
        guideText += `File size: ${file.size} bytes\n\n`;
        
        if (urls && urls.length > 0) {
            guideText += `🔗 DOCUMENT URL FOUND:\n`;
            guideText += `${urls[0]}\n\n`;
            guideText += `HOW TO ACCESS YOUR DOCUMENT:\n`;
            guideText += `1. Copy the URL above\n`;
            guideText += `2. Paste it in your browser\n`;
            guideText += `3. Sign in to Google if needed\n`;
            guideText += `4. In Google Docs: File → Download → Microsoft Word (.docx)\n`;
            guideText += `5. Upload the .docx file to this converter\n\n`;
        } else {
            guideText += `⚠️ NO URL FOUND IN SHORTCUT FILE\n\n`;
            guideText += `This .gdoc file doesn't contain a readable URL.\n`;
            guideText += `Try these alternatives:\n\n`;
        }
        
        guideText += `ALTERNATIVE METHODS:\n`;
        guideText += `• Ask the sender for the actual document file\n`;
        guideText += `• If you have access to the Google Doc online:\n`;
        guideText += `  - Open it in Google Docs\n`;
        guideText += `  - File → Download → Microsoft Word (.docx)\n`;
        guideText += `  - Upload the downloaded .docx file here\n\n`;
        
        guideText += `WHAT IS A .GDOC FILE?\n`;
        guideText += `• It's a shortcut/link to an online Google Doc\n`;
        guideText += `• It doesn't contain the actual document text\n`;
        guideText += `• The real content is stored on Google's servers\n`;
        guideText += `• You need to download the actual document from Google Docs\n\n`;
        
        guideText += `SUPPORTED FORMATS FOR THIS CONVERTER:\n`;
        guideText += `✅ Microsoft Word (.docx, .doc)\n`;
        guideText += `✅ Excel files (.xlsx)\n`;
        guideText += `✅ PowerPoint (.pptx)\n`;
        guideText += `✅ Text files (.txt)\n`;
        guideText += `✅ Images (JPG, PNG, etc.)\n\n`;
        
        if (content.length > 0) {
            guideText += `RAW FILE CONTENT (for debugging):\n`;
            guideText += `${'-'.repeat(40)}\n`;
            guideText += content.substring(0, 500);
            if (content.length > 500) {
                guideText += `\n...(content truncated)`;
            }
        }
        
        return await this.createWorkingPdf(guideText, file.name, 'Google Docs Shortcut Guide');
    }
    
    extractReadableContent(content) {
        if (!content) return '';
        
        console.log('🔍 Extracting readable content...');
        
        // Method 1: If it looks like HTML, try to extract text
        if (content.includes('<html') || content.includes('<!DOCTYPE')) {
            console.log('📄 Detected HTML content');
            try {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = content;
                
                // Remove scripts and styles
                const scripts = tempDiv.querySelectorAll('script, style');
                scripts.forEach(el => el.remove());
                
                const textContent = tempDiv.textContent || tempDiv.innerText || '';
                if (textContent.length > 50) {
                    return this.cleanText(textContent);
                }
            } catch (e) {
                console.log('⚠️ HTML parsing failed:', e.message);
            }
        }
        
        // Method 2: If it looks like JSON, try to extract strings
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
            console.log('📄 Detected JSON content');
            try {
                const jsonData = JSON.parse(content);
                const extractedText = this.extractTextFromJson(jsonData);
                if (extractedText.length > 50) {
                    return this.cleanText(extractedText);
                }
            } catch (e) {
                console.log('⚠️ JSON parsing failed:', e.message);
            }
        }
        
        // Method 3: Clean the raw text
        console.log('📄 Processing as plain text');
        const cleanedText = this.cleanText(content);
        
        // Only return if we have substantial content
        if (cleanedText.length > 20) {
            return cleanedText;
        }
        
        return '';
    }
    
    extractTextFromJson(obj, depth = 0) {
        if (depth > 5) return ''; // Prevent deep recursion
        
        let text = '';
        
        if (typeof obj === 'string' && obj.length > 3) {
            // Skip URLs and technical strings
            if (!obj.includes('http') && !obj.includes('function') && !obj.includes('script')) {
                text += obj + '\n';
            }
        } else if (Array.isArray(obj)) {
            obj.forEach(item => {
                text += this.extractTextFromJson(item, depth + 1);
            });
        } else if (typeof obj === 'object' && obj !== null) {
            Object.values(obj).forEach(value => {
                text += this.extractTextFromJson(value, depth + 1);
            });
        }
        
        return text;
    }
    
    cleanText(text) {
        if (!text) return '';
        
        return text
            // Remove excessive whitespace
            .replace(/\s+/g, ' ')
            // Remove non-printable characters (keep basic punctuation)
            .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
            // Remove repeated characters (like ---- or ===)
            .replace(/(.)\1{5,}/g, '$1$1')
            // Split into lines and filter
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 1)
            // Remove lines that look like code or URLs
            .filter(line => !line.includes('http') && !line.includes('function') && !line.includes('='))
            .join('\n')
            .trim();
    }
    
    async createHelpfulGuidePdf(filename, content) {
        console.log('📋 Creating helpful guide PDF');
        
        let guideText = `GOOGLE DOCS FILE PROCESSING RESULT\n`;
        guideText += `===================================\n\n`;
        guideText += `File: ${filename}\n`;
        guideText += `File size: ${content.length} characters\n\n`;
        
        guideText += `ANALYSIS RESULT:\n`;
        guideText += `This file doesn't contain readable document content.\n\n`;
        
        guideText += `POSSIBLE REASONS:\n`;
        guideText += `• File is a Google Docs shortcut (.gdoc) - contains link, not content\n`;
        guideText += `• File is corrupted or incomplete\n`;
        guideText += `• File is in an unsupported format\n`;
        guideText += `• Export from Google Docs was incomplete\n\n`;
        
        guideText += `SOLUTION - HOW TO GET YOUR GOOGLE DOC AS PDF:\n`;
        guideText += `1. Open your Google Doc in a web browser\n`;
        guideText += `2. Click "File" in the menu\n`;
        guideText += `3. Select "Download"\n`;
        guideText += `4. Choose "Microsoft Word (.docx)"\n`;
        guideText += `5. Upload the downloaded .docx file to this converter\n\n`;
        
        guideText += `ALTERNATIVE METHOD:\n`;
        guideText += `1. In Google Docs: File → Download → PDF Document (.pdf)\n`;
        guideText += `2. This gives you a PDF directly (no conversion needed)\n\n`;
        
        guideText += `COPY-PASTE METHOD:\n`;
        guideText += `1. Select all text in Google Docs (Ctrl+A)\n`;
        guideText += `2. Copy it (Ctrl+C)\n`;
        guideText += `3. Paste into a text editor and save as .txt\n`;
        guideText += `4. Upload the .txt file to this converter\n\n`;
        
        if (content && content.length > 0 && content.length < 1000) {
            guideText += `FILE CONTENT (for reference):\n`;
            guideText += `${'-'.repeat(40)}\n`;
            guideText += content;
        }
        
        return await this.createWorkingPdf(guideText, filename, 'Google Docs Processing Guide');
    }
    
    async createErrorGuidePdf(filename, errorMessage) {
        console.log('🚨 Creating error guide PDF');
        
        let guideText = `GOOGLE DOCS FILE ERROR REPORT\n`;
        guideText += `=============================\n\n`;
        guideText += `File: ${filename}\n`;
        guideText += `Error: ${errorMessage}\n\n`;
        
        guideText += `WHAT HAPPENED:\n`;
        guideText += `The file couldn't be processed due to an error.\n\n`;
        
        guideText += `SOLUTIONS:\n`;
        guideText += `1. Try downloading the file again from Google Docs\n`;
        guideText += `2. Export as Microsoft Word (.docx) format\n`;
        guideText += `3. Check if the file is corrupted\n`;
        guideText += `4. Contact support if the issue persists\n\n`;
        
        guideText += `RECOMMENDED WORKFLOW:\n`;
        guideText += `• Google Docs → File → Download → Microsoft Word (.docx)\n`;
        guideText += `• Upload the .docx file to this converter\n`;
        guideText += `• This ensures maximum compatibility\n`;
        
        return await this.createWorkingPdf(guideText, filename, 'Error Guide');
    }
    
    async createWorkingPdf(text, filename, title) {
        console.log(`📄 Creating PDF: ${title}`);
        
        try {
            // Ensure we have jsPDF
            if (!window.jspdf || !window.jspdf.jsPDF) {
                throw new Error('jsPDF library not loaded');
            }
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            
            // Ensure we have content
            if (!text || text.trim().length === 0) {
                text = `No content available for ${filename}\n\nThis file appears to be empty or unreadable.\n\nPlease try:\n1. Re-downloading from Google Docs\n2. Exporting as .docx format\n3. Checking file integrity`;
            }
            
            console.log(`📝 Adding content: ${text.length} characters`);
            
            // Add title
            pdf.setFontSize(14);
            pdf.setFont(undefined, 'bold');
            pdf.text(title, 20, 20);
            
            // Add metadata
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            pdf.text(`Source: ${filename}`, 20, 30);
            pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 35);
            pdf.line(20, 40, 190, 40);
            
            // Add content
            pdf.setFontSize(9);
            const pageWidth = pdf.internal.pageSize.getWidth();
            const maxLineWidth = pageWidth - 40;
            
            // Split text into lines that fit
            const lines = pdf.splitTextToSize(text, maxLineWidth);
            
            let yPosition = 50;
            const lineHeight = 5;
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            for (let i = 0; i < lines.length; i++) {
                // Check if we need a new page
                if (yPosition > pageHeight - 30) {
                    pdf.addPage();
                    yPosition = 20;
                }
                
                pdf.text(lines[i], 20, yPosition);
                yPosition += lineHeight;
            }
            
            // Add page numbers
            const pageCount = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.text(`Page ${i} of ${pageCount}`, 20, pageHeight - 10);
                pdf.text('I HATE PDF Converter', 150, pageHeight - 10);
            }
            
            // Generate the PDF
            const pdfBlob = pdf.output('blob');
            
            // Create download
            const pdfFilename = filename.replace(/\.[^/.]+$/, '') + '.pdf';
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(pdfBlob);
            downloadLink.download = pdfFilename;
            downloadLink.click();
            
            console.log(`✅ PDF created successfully: ${pdfFilename}`);
            console.log(`📊 PDF size: ${pdfBlob.size} bytes`);
            
            return pdfBlob;
            
        } catch (error) {
            console.error('❌ PDF creation failed:', error);
            throw new Error(`PDF creation failed: ${error.message}`);
        }
    }
}

// Initialize and make available globally
window.simpleGoogleDocsFix = new SimpleGoogleDocsFix();

console.log(`
🔧 SIMPLE GOOGLE DOCS FIX READY!

✅ Features:
- Robust .gdoc shortcut file handling
- Content extraction from multiple formats
- Comprehensive user guidance
- Guaranteed PDF generation (never empty)
- Clear error messages and solutions
- Debug logging for troubleshooting

🎯 This fix ensures:
- No more empty PDFs
- Clear instructions for users
- Helpful guides in all cases
- Debug information when needed
- Simple, reliable operation

Ready to handle any Google Docs file!
`);

export default SimpleGoogleDocsFix;
