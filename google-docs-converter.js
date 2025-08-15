// ========================================
// Google Docs Converter - Complete Solution
// Handles .gdoc files and Google Docs content properly
// ========================================

class GoogleDocsConverter {
    constructor() {
        this.init();
    }
    
    init() {
        console.log('📊 Google Docs Converter initialized');
        console.log('🔗 Supporting .gdoc files and Google Docs content extraction');
    }
    
    async convertGoogleDocsFile(file) {
        console.log('📊 Processing Google Docs file:', file.name);
        
        try {
            // Check if it's a .gdoc file (Google Docs shortcut)
            if (file.name.toLowerCase().endsWith('.gdoc')) {
                return await this.handleGdocShortcut(file);
            }
            
            // Check if it's exported Google Docs content
            const content = await file.text();
            
            if (this.isGoogleDocsContent(content)) {
                return await this.parseGoogleDocsContent(content, file.name);
            }
            
            // Try to extract any structured content
            return await this.extractStructuredContent(content, file.name);
            
        } catch (error) {
            console.error('❌ Google Docs conversion failed:', error);
            throw new Error(`Google Docs conversion failed: ${error.message}`);
        }
    }
    
    async handleGdocShortcut(file) {
        console.log('🔗 Processing .gdoc shortcut file...');
        
        try {
            const content = await file.text();
            console.log('📄 .gdoc file content:', content.substring(0, 200) + '...');
            
            // Parse the .gdoc file to extract URL or content
            const docInfo = this.parseGdocFile(content);
            
            if (docInfo.url) {
                return await this.createInstructionalPdf(docInfo, file.name);
            }
            
            if (docInfo.content) {
                return await this.parseGoogleDocsContent(docInfo.content, file.name);
            }
            
            throw new Error('Could not extract usable content from .gdoc file');
            
        } catch (error) {
            console.error('❌ .gdoc processing failed:', error);
            throw error;
        }
    }
    
    parseGdocFile(content) {
        console.log('🔍 Parsing .gdoc file structure...');
        
        const result = {
            url: null,
            title: null,
            content: null
        };
        
        try {
            // Try to parse as JSON first (newer .gdoc format)
            if (content.trim().startsWith('{')) {
                const jsonData = JSON.parse(content);
                
                if (jsonData.url) {
                    result.url = jsonData.url;
                    result.title = jsonData.doc_title || jsonData.title || 'Google Doc';
                }
                
                if (jsonData.content) {
                    result.content = jsonData.content;
                }
                
                console.log('✅ Parsed JSON .gdoc file');
                return result;
            }
            
            // Parse as URL shortcut format
            const lines = content.split('\n');
            for (const line of lines) {
                if (line.includes('docs.google.com')) {
                    result.url = line.trim();
                    result.title = 'Google Doc';
                    break;
                }
                
                if (line.toLowerCase().includes('url=')) {
                    const urlMatch = line.match(/url=(.+)/i);
                    if (urlMatch) {
                        result.url = urlMatch[1].trim();
                        result.title = 'Google Doc';
                    }
                }
            }
            
            // If no URL found, treat entire content as text
            if (!result.url && content.length > 10) {
                result.content = content;
                result.title = 'Google Doc Content';
            }
            
            console.log('✅ Parsed .gdoc shortcut format');
            return result;
            
        } catch (error) {
            console.log('⚠️ JSON parsing failed, treating as plain text');
            result.content = content;
            result.title = 'Google Doc Content';
            return result;
        }
    }
    
    isGoogleDocsContent(content) {
        // Check for Google Docs specific patterns
        const googleDocsPatterns = [
            'docs.google.com',
            'Google Docs',
            'document.getElementById',
            '_docs-butterbar',
            'kix-',
            'docs-material',
            '_docs_flag_initialData'
        ];
        
        return googleDocsPatterns.some(pattern => 
            content.toLowerCase().includes(pattern.toLowerCase())
        );
    }
    
    async parseGoogleDocsContent(content, filename) {
        console.log('📊 Parsing Google Docs content...');
        
        try {
            let extractedText = '';
            
            // Method 1: Extract from HTML structure
            const htmlText = this.extractFromHtmlStructure(content);
            if (htmlText.length > extractedText.length) {
                extractedText = htmlText;
            }
            
            // Method 2: Extract from JavaScript data
            const jsText = this.extractFromJavaScriptData(content);
            if (jsText.length > extractedText.length) {
                extractedText = jsText;
            }
            
            // Method 3: Clean text extraction
            const cleanText = this.extractCleanText(content);
            if (cleanText.length > extractedText.length) {
                extractedText = cleanText;
            }
            
            // Method 4: Pattern-based extraction
            const patternText = this.extractUsingPatterns(content);
            if (patternText.length > extractedText.length) {
                extractedText = patternText;
            }
            
            if (!extractedText || extractedText.length < 10) {
                throw new Error('Could not extract meaningful text from Google Docs content');
            }
            
            console.log(`✅ Extracted ${extractedText.length} characters from Google Docs`);
            return await this.createEnhancedPdf(extractedText, filename, 'Google Docs Document');
            
        } catch (error) {
            console.error('❌ Google Docs content parsing failed:', error);
            throw error;
        }
    }
    
    extractFromHtmlStructure(content) {
        console.log('🔍 Extracting from HTML structure...');
        
        try {
            // Create a temporary DOM element
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            
            // Look for common Google Docs content containers
            const selectors = [
                '.kix-page-content-wrap',
                '.kix-page',
                '.docs-text-block',
                '.kix-paragraphrenderer',
                '.kix-wordhtmlgenerator-word-node',
                '[role="textbox"]',
                '.doc-content',
                'div[contenteditable="true"]'
            ];
            
            let extractedText = '';
            
            for (const selector of selectors) {
                const elements = tempDiv.querySelectorAll(selector);
                for (const element of elements) {
                    const text = element.textContent || element.innerText || '';
                    if (text.trim().length > extractedText.length) {
                        extractedText = text.trim();
                    }
                }
            }
            
            // If no specific containers found, get all text
            if (!extractedText) {
                extractedText = tempDiv.textContent || tempDiv.innerText || '';
            }
            
            return this.cleanExtractedText(extractedText);
            
        } catch (error) {
            console.log('⚠️ HTML structure extraction failed:', error.message);
            return '';
        }
    }
    
    extractFromJavaScriptData(content) {
        console.log('🔍 Extracting from JavaScript data...');
        
        try {
            let extractedText = '';
            
            // Look for common Google Docs JS data patterns
            const patterns = [
                /_docs_flag_initialData\s*=\s*"([^"]+)"/g,
                /kix-page-content[^>]*>([^<]+)</g,
                /"kix-paragraphrenderer[^"]*"[^>]*>([^<]+)</g,
                /data-text="([^"]+)"/g,
                /textContent['"]\s*:\s*['"']([^'"]+)['"']/g
            ];
            
            for (const pattern of patterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const text = match[1];
                    if (text && text.length > 5) {
                        extractedText += text + '\n';
                    }
                }
            }
            
            return this.cleanExtractedText(extractedText);
            
        } catch (error) {
            console.log('⚠️ JavaScript data extraction failed:', error.message);
            return '';
        }
    }
    
    extractCleanText(content) {
        console.log('🔍 Performing clean text extraction...');
        
        try {
            // Remove HTML tags and scripts
            let cleanContent = content
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]*>/g, ' ')
                .replace(/&[^;]+;/g, ' ');
            
            // Extract text patterns that look like document content
            const lines = cleanContent.split('\n');
            const meaningfulLines = [];
            
            for (const line of lines) {
                const trimmed = line.trim();
                
                // Skip very short lines, URLs, and technical content
                if (trimmed.length < 3 || 
                    trimmed.includes('http') ||
                    trimmed.includes('javascript') ||
                    trimmed.includes('function') ||
                    /^[^a-zA-Z]*$/.test(trimmed)) {
                    continue;
                }
                
                // Look for lines that seem like document content
                if (/[.!?]$/.test(trimmed) || // Ends with punctuation
                    trimmed.length > 20 || // Reasonably long
                    /^[A-Z]/.test(trimmed)) { // Starts with capital letter
                    meaningfulLines.push(trimmed);
                }
            }
            
            return meaningfulLines.join('\n');
            
        } catch (error) {
            console.log('⚠️ Clean text extraction failed:', error.message);
            return '';
        }
    }
    
    extractUsingPatterns(content) {
        console.log('🔍 Using pattern-based extraction...');
        
        try {
            const patterns = [
                // Look for quoted text (common in JSON data)
                /"([^"]{20,})"/g,
                // Look for text between specific markers
                />\s*([A-Z][^<]{20,})\s*</g,
                // Look for paragraph-like content
                /\b([A-Z][^.!?]*[.!?])\s*/g
            ];
            
            let extractedText = '';
            const foundTexts = new Set();
            
            for (const pattern of patterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const text = match[1];
                    if (text && text.length > 15 && !foundTexts.has(text)) {
                        foundTexts.add(text);
                        extractedText += text + '\n\n';
                    }
                }
            }
            
            return this.cleanExtractedText(extractedText);
            
        } catch (error) {
            console.log('⚠️ Pattern-based extraction failed:', error.message);
            return '';
        }
    }
    
    async extractStructuredContent(content, filename) {
        console.log('📄 Extracting structured content...');
        
        try {
            // Try different content formats
            let extractedText = '';
            
            // Check if it's HTML
            if (content.includes('<html') || content.includes('<!DOCTYPE')) {
                extractedText = this.extractFromHtmlStructure(content);
            }
            
            // Check if it's JSON
            else if (content.trim().startsWith('{')) {
                try {
                    const jsonData = JSON.parse(content);
                    extractedText = this.extractFromJsonData(jsonData);
                } catch (e) {
                    // Not valid JSON, treat as text
                    extractedText = content;
                }
            }
            
            // Treat as plain text
            else {
                extractedText = content;
            }
            
            if (!extractedText || extractedText.length < 5) {
                throw new Error('No meaningful content found');
            }
            
            return await this.createEnhancedPdf(extractedText, filename, 'Document Content');
            
        } catch (error) {
            console.error('❌ Structured content extraction failed:', error);
            throw error;
        }
    }
    
    extractFromJsonData(jsonData) {
        console.log('🔍 Extracting from JSON data...');
        
        let text = '';
        
        const extractFromObject = (obj, depth = 0) => {
            if (depth > 10) return; // Prevent infinite recursion
            
            if (typeof obj === 'string' && obj.length > 10) {
                text += obj + '\n';
            } else if (Array.isArray(obj)) {
                obj.forEach(item => extractFromObject(item, depth + 1));
            } else if (typeof obj === 'object' && obj !== null) {
                Object.values(obj).forEach(value => extractFromObject(value, depth + 1));
            }
        };
        
        extractFromObject(jsonData);
        
        return this.cleanExtractedText(text);
    }
    
    async createInstructionalPdf(docInfo, filename) {
        console.log('📋 Creating instructional PDF for Google Docs link...');
        
        const instructionalText = `
Google Docs Document Access Instructions

Document: ${docInfo.title || 'Google Doc'}
Original File: ${filename}

${docInfo.url ? `Document URL: ${docInfo.url}` : ''}

To access this Google Docs document:

1. Copy the URL above (if provided)
2. Paste it into your web browser
3. Sign in to your Google account if required
4. View or download the document from Google Docs

Alternative Access Methods:

1. Export from Google Docs:
   - Open the document in Google Docs
   - Go to File → Download
   - Choose "PDF Document (.pdf)" or "Microsoft Word (.docx)"
   - Upload the downloaded file to this converter

2. Copy and Paste Content:
   - Open the document in Google Docs
   - Select all content (Ctrl+A)
   - Copy the content (Ctrl+C)
   - Create a new text file and paste the content
   - Save as .txt file and upload to this converter

Note: .gdoc files are shortcuts to online Google Docs documents and don't contain the actual document content. To convert the document content to PDF, you need to export the actual content from Google Docs first.

This PDF converter supports the following file types with full content extraction:
- Microsoft Word documents (.doc, .docx)
- Excel spreadsheets (.xlsx)
- PowerPoint presentations (.pptx)
- Text files (.txt)
- Images (JPG, PNG, etc.)

For the best results with Google Docs, please export the document from Google Docs and upload the exported file.
        `;
        
        return await this.createEnhancedPdf(instructionalText, filename, 'Google Docs Access Instructions');
    }
    
    async createEnhancedPdf(text, filename, documentType) {
        console.log(`📄 Creating enhanced PDF from ${documentType}...`);
        
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            
            // Add title
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            pdf.text(documentType, 20, 20);
            
            // Add filename
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'normal');
            pdf.text(`Source: ${filename}`, 20, 35);
            
            // Add separator line
            pdf.line(20, 45, 190, 45);
            
            // Add content
            pdf.setFontSize(10);
            const pageWidth = pdf.internal.pageSize.getWidth();
            const maxLineWidth = pageWidth - 40; // 20px margin on each side
            
            const lines = pdf.splitTextToSize(text, maxLineWidth);
            let yPosition = 55;
            
            for (let i = 0; i < lines.length; i++) {
                if (yPosition > 280) { // Near bottom of page
                    pdf.addPage();
                    yPosition = 20;
                }
                
                pdf.text(lines[i], 20, yPosition);
                yPosition += 6;
            }
            
            // Add footer
            const pageCount = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.text(`Page ${i} of ${pageCount} - Generated by I HATE PDF`, 20, 290);
                pdf.text(`${new Date().toLocaleString()}`, 150, 290);
            }
            
            const pdfBlob = pdf.output('blob');
            const pdfFilename = filename.replace(/\.[^/.]+$/, '') + '.pdf';
            
            // Download the PDF
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
    
    cleanExtractedText(text) {
        if (!text) return '';
        
        return text
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/(.)\1{4,}/g, '$1') // Remove repeated characters
            .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Remove non-printable characters
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n')
            .trim();
    }
}

// ========================================
// Integration
// ========================================

// Initialize the Google Docs converter
window.googleDocsConverter = new GoogleDocsConverter();

console.log(`
📊 GOOGLE DOCS CONVERTER READY!

🔗 Complete Google Docs Support:
✅ .gdoc shortcut files
✅ Google Docs exported content
✅ HTML format from Google Docs
✅ JSON data extraction
✅ URL link handling
✅ Instructional PDF generation

🎯 Features:
- Handles .gdoc shortcut files properly
- Extracts content from Google Docs exports
- Creates instructional PDFs for online docs
- Multiple content extraction methods
- Clean text processing and formatting
- Professional PDF generation

💡 Usage Instructions:
- For .gdoc files: Creates access instructions
- For exported content: Extracts actual text
- For online docs: Provides download guidance
- Works with all Google Docs formats

🚀 Perfect for handling Google Docs in your converter!
`);

export default GoogleDocsConverter;
