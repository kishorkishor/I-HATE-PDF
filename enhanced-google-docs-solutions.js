// ========================================
// Enhanced Google Docs Solutions
// Multiple robust approaches for Google Docs content
// ========================================

class EnhancedGoogleDocsSolutions {
    constructor() {
        this.init();
    }
    
    init() {
        console.log('🚀 Enhanced Google Docs Solutions initialized');
        console.log('📋 Multiple conversion strategies available');
    }
    
    async handleGoogleDocsFile(file) {
        console.log(`📊 Processing Google Docs file: ${file.name}`);
        
        try {
            // Strategy 1: Check if it's a real exported document
            const content = await file.text();
            
            if (this.isExportedGoogleDoc(content)) {
                console.log('✅ Detected exported Google Docs content');
                return await this.convertExportedGoogleDoc(content, file.name);
            }
            
            // Strategy 2: Handle .gdoc shortcut files
            if (file.name.toLowerCase().endsWith('.gdoc')) {
                console.log('🔗 Detected .gdoc shortcut file');
                return await this.handleGdocShortcut(content, file.name);
            }
            
            // Strategy 3: Try to extract any meaningful content
            if (content.trim().length > 0) {
                console.log('📄 Attempting general content extraction');
                return await this.extractGeneralContent(content, file.name);
            }
            
            // Strategy 4: Create informative PDF about Google Docs access
            console.log('📋 Creating Google Docs access guide');
            return await this.createAccessGuidePdf(file.name);
            
        } catch (error) {
            console.error('❌ Google Docs processing failed:', error);
            throw new Error(`Google Docs processing failed: ${error.message}`);
        }
    }
    
    isExportedGoogleDoc(content) {
        // Check for Google Docs exported content patterns
        const exportPatterns = [
            // HTML export patterns
            '<html',
            'docs-material',
            'kix-',
            'google-docs',
            // JSON export patterns
            '"exportFormat"',
            '"docs.google.com"',
            // Text export patterns (less reliable)
            'Google Docs',
            'docs.google.com'
        ];
        
        const lowerContent = content.toLowerCase();
        return exportPatterns.some(pattern => lowerContent.includes(pattern.toLowerCase()));
    }
    
    async convertExportedGoogleDoc(content, filename) {
        console.log('🔄 Converting exported Google Docs content...');
        
        try {
            let extractedText = '';
            
            // Method 1: HTML content extraction
            if (content.includes('<html') || content.includes('<!DOCTYPE')) {
                extractedText = this.extractFromHtml(content);
            }
            
            // Method 2: JSON content extraction
            else if (content.trim().startsWith('{')) {
                extractedText = this.extractFromJson(content);
            }
            
            // Method 3: Plain text processing
            else {
                extractedText = this.cleanTextContent(content);
            }
            
            if (!extractedText || extractedText.length < 20) {
                throw new Error('No meaningful content found in exported file');
            }
            
            console.log(`✅ Extracted ${extractedText.length} characters from exported Google Doc`);
            return await this.createContentPdf(extractedText, filename, 'Exported Google Docs Document');
            
        } catch (error) {
            console.error('❌ Exported Google Doc conversion failed:', error);
            throw error;
        }
    }
    
    extractFromHtml(htmlContent) {
        console.log('🔍 Extracting text from HTML content...');
        
        try {
            // Create temporary DOM element
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            
            // Remove script and style elements
            const scripts = tempDiv.querySelectorAll('script, style');
            scripts.forEach(el => el.remove());
            
            // Try Google Docs specific selectors first
            const googleDocsSelectors = [
                '.kix-page-content-wrap',
                '.kix-page',
                '.docs-text-block',
                '.kix-paragraphrenderer',
                '[role="textbox"]',
                '.doc-content'
            ];
            
            for (const selector of googleDocsSelectors) {
                const elements = tempDiv.querySelectorAll(selector);
                if (elements.length > 0) {
                    const text = Array.from(elements)
                        .map(el => el.textContent || el.innerText || '')
                        .join('\n\n')
                        .trim();
                    
                    if (text.length > 50) {
                        console.log(`✅ Extracted text using selector: ${selector}`);
                        return this.cleanTextContent(text);
                    }
                }
            }
            
            // Fallback: extract all text content
            const allText = tempDiv.textContent || tempDiv.innerText || '';
            return this.cleanTextContent(allText);
            
        } catch (error) {
            console.error('❌ HTML extraction failed:', error);
            return '';
        }
    }
    
    extractFromJson(jsonContent) {
        console.log('🔍 Extracting text from JSON content...');
        
        try {
            const jsonData = JSON.parse(jsonContent);
            let extractedText = '';
            
            // Recursive function to extract text from nested objects
            const extractText = (obj, depth = 0) => {
                if (depth > 10) return; // Prevent infinite recursion
                
                if (typeof obj === 'string' && obj.length > 5) {
                    // Skip URLs and technical strings
                    if (!obj.includes('http') && !obj.includes('function') && !obj.includes('javascript')) {
                        extractedText += obj + '\n';
                    }
                } else if (Array.isArray(obj)) {
                    obj.forEach(item => extractText(item, depth + 1));
                } else if (typeof obj === 'object' && obj !== null) {
                    Object.values(obj).forEach(value => extractText(value, depth + 1));
                }
            };
            
            extractText(jsonData);
            
            return this.cleanTextContent(extractedText);
            
        } catch (error) {
            console.error('❌ JSON extraction failed:', error);
            return '';
        }
    }
    
    cleanTextContent(text) {
        if (!text) return '';
        
        return text
            // Remove excessive whitespace
            .replace(/\s+/g, ' ')
            // Remove repeated characters
            .replace(/(.)\1{4,}/g, '$1')
            // Remove non-printable characters except newlines and tabs
            .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
            // Split into lines and clean each
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            // Remove very short lines that look like noise
            .filter(line => line.length > 2 || /^[A-Z]/.test(line))
            .join('\n')
            .trim();
    }
    
    async handleGdocShortcut(content, filename) {
        console.log('🔗 Processing .gdoc shortcut file...');
        
        const urlMatch = content.match(/https:\/\/docs\.google\.com\/[^\s\n\r]+/);
        const docUrl = urlMatch ? urlMatch[0] : null;
        
        // Create comprehensive guide PDF
        const guideText = this.createGdocGuide(filename, docUrl);
        return await this.createContentPdf(guideText, filename, 'Google Docs Access Guide');
    }
    
    createGdocGuide(filename, docUrl) {
        return `
GOOGLE DOCS ACCESS GUIDE
========================

Original File: ${filename}
${docUrl ? `Document URL: ${docUrl}` : 'Document URL: Not found in shortcut file'}

WHAT IS A .GDOC FILE?
--------------------
A .gdoc file is a shortcut to an online Google Docs document. It doesn't contain the actual document content - just a link to the document stored on Google's servers.

HOW TO ACCESS YOUR GOOGLE DOCS CONTENT:
---------------------------------------

METHOD 1: Direct Access (If URL is available)
1. Copy the URL above (if provided)
2. Open your web browser
3. Paste the URL and press Enter
4. Sign in to your Google account if prompted
5. The document will open in Google Docs

METHOD 2: Export from Google Docs
1. Open the document in Google Docs (using Method 1)
2. Click "File" in the menu
3. Select "Download" 
4. Choose your preferred format:
   - Microsoft Word (.docx) - Best for this converter
   - PDF Document (.pdf) - Already in PDF format
   - Plain Text (.txt) - Simple text only
5. Upload the downloaded file to this converter

METHOD 3: Copy and Paste
1. Open the document in Google Docs
2. Select all content (Ctrl+A or Cmd+A)
3. Copy the content (Ctrl+C or Cmd+C)
4. Create a new text file on your computer
5. Paste the content and save as .txt file
6. Upload the .txt file to this converter

METHOD 4: Manual Recreation
1. Read the content from Google Docs
2. Type or copy it into a word processor
3. Save as .docx or .txt file
4. Upload to this converter

SUPPORTED FORMATS FOR CONVERSION:
---------------------------------
✅ Microsoft Word (.doc, .docx) - Professional text extraction
✅ Excel Spreadsheets (.xlsx) - Table and data conversion  
✅ PowerPoint (.pptx) - Slide content extraction
✅ Text Files (.txt) - Simple text conversion
✅ Images (JPG, PNG, etc.) - Image to PDF conversion

WHY CAN'T .GDOC FILES BE CONVERTED DIRECTLY?
-------------------------------------------
• .gdoc files are just shortcuts/links
• They don't contain the actual document text
• Google stores the content on their servers
• Direct access requires authentication with Google
• Privacy and security restrictions prevent automatic access

TROUBLESHOOTING:
---------------
• If the URL doesn't work, the document might be private
• Check if you have permission to access the document
• Try signing in to the correct Google account
• Contact the document owner for access if needed

ALTERNATIVE SOLUTIONS:
---------------------
• Ask the sender to export and send the actual document file
• Request access to the Google Doc if it's shared
• Take screenshots if only visual representation is needed

This converter specializes in document content that's already downloaded to your computer. For the best experience with Google Docs, please export the document first using the methods above.
        `.trim();
    }
    
    async extractGeneralContent(content, filename) {
        console.log('📄 Extracting general content...');
        
        const cleanedContent = this.cleanTextContent(content);
        
        if (cleanedContent.length < 10) {
            throw new Error('No meaningful content found in file');
        }
        
        return await this.createContentPdf(cleanedContent, filename, 'Document Content');
    }
    
    async createAccessGuidePdf(filename) {
        console.log('📋 Creating Google Docs access guide...');
        
        const guideText = `
GOOGLE DOCS FILE DETECTED
========================

File: ${filename}

This appears to be a Google Docs related file. Google Docs files often require special handling because they're stored online rather than containing content directly.

NEXT STEPS:
----------

1. CHECK THE FILE TYPE:
   - If it's a .gdoc file: It's a shortcut to an online document
   - If it's exported content: It should contain the actual text

2. FOR .GDOC SHORTCUT FILES:
   - Open the original Google Doc online
   - Export as DOCX, PDF, or TXT format
   - Upload the exported file to this converter

3. FOR EXPORTED CONTENT:
   - The file should contain readable text
   - If this PDF is empty, the export may have failed
   - Try exporting again in a different format

4. ALTERNATIVE METHODS:
   - Copy and paste content from Google Docs into a text file
   - Take screenshots if visual layout is important
   - Ask the document owner for a properly exported copy

SUPPORTED FORMATS:
-----------------
✅ Word Documents (.docx, .doc)
✅ Excel Files (.xlsx)  
✅ PowerPoint (.pptx)
✅ Text Files (.txt)
✅ Images (JPG, PNG, etc.)

For best results, export your Google Doc as a .docx file and upload that instead.
        `.trim();
        
        return await this.createContentPdf(guideText, filename, 'Google Docs File Guide');
    }
    
    async createContentPdf(text, filename, documentType) {
        console.log(`📄 Creating PDF: ${documentType}...`);
        
        try {
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                throw new Error('jsPDF library not available');
            }
            
            const pdf = new jsPDF();
            
            // Set up the document
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            pdf.text(documentType, 20, 20);
            
            // Add source info
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            pdf.text(`Source: ${filename}`, 20, 30);
            pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 35);
            
            // Add separator
            pdf.line(20, 42, 190, 42);
            
            // Add content
            pdf.setFontSize(9);
            const pageWidth = pdf.internal.pageSize.getWidth();
            const maxLineWidth = pageWidth - 40;
            
            // Ensure we have content to add
            if (!text || text.trim().length === 0) {
                text = 'No content could be extracted from this file. Please refer to the instructions above for alternative methods.';
            }
            
            const lines = pdf.splitTextToSize(text, maxLineWidth);
            let yPosition = 50;
            
            for (let i = 0; i < lines.length; i++) {
                // Check if we need a new page
                if (yPosition > 280) {
                    pdf.addPage();
                    yPosition = 20;
                }
                
                pdf.text(lines[i], 20, yPosition);
                yPosition += 5;
            }
            
            // Add page numbers
            const pageCount = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.text(`Page ${i} of ${pageCount}`, 20, 290);
                pdf.text('Generated by I HATE PDF', 150, 290);
            }
            
            // Generate and download
            const pdfBlob = pdf.output('blob');
            const pdfFilename = filename.replace(/\.[^/.]+$/, '') + '.pdf';
            
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(pdfBlob);
            downloadLink.download = pdfFilename;
            downloadLink.click();
            
            console.log(`✅ PDF created successfully: ${pdfFilename}`);
            return pdfBlob;
            
        } catch (error) {
            console.error('❌ PDF creation failed:', error);
            throw new Error(`PDF creation failed: ${error.message}`);
        }
    }
}

// ========================================
// Integration and Export
// ========================================

// Initialize the enhanced Google Docs solutions
window.enhancedGoogleDocsSolutions = new EnhancedGoogleDocsSolutions();

console.log(`
🚀 ENHANCED GOOGLE DOCS SOLUTIONS READY!

📋 Complete Solution Stack:
✅ Exported Google Docs content processing
✅ .gdoc shortcut file handling
✅ Multiple content extraction methods  
✅ Comprehensive user guidance
✅ Robust error handling and fallbacks
✅ Professional PDF generation

🎯 Key Features:
- Smart content detection and extraction
- Multiple fallback strategies
- Clear user instructions and guidance
- Professional PDF output with proper formatting
- No empty PDFs - always provides useful content
- Comprehensive troubleshooting information

💡 User Experience:
- Clear explanations of what .gdoc files are
- Step-by-step instructions for accessing content
- Alternative methods for content extraction
- Proper guidance for different file types
- No confusion about empty results

🔧 Technical Implementation:
- HTML content parsing with Google Docs selectors
- JSON data extraction with recursive parsing
- Text cleaning and normalization
- Error handling with informative messages
- PDF generation with proper content validation

Your users will now understand exactly how to handle Google Docs files!
`);

export default EnhancedGoogleDocsSolutions;
