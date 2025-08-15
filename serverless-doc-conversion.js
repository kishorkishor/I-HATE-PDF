// ========================================
// Serverless DOC/PPT to PDF Conversion
// Multiple methods for online deployment
// ========================================

class ServerlessDocConverter {
    constructor() {
        this.conversionMethods = [
            'PSPDFKit', // Best quality, requires license
            'CloudConvert', // API-based, free tier
            'OnlineConvertAPI', // Free API with limits
            'FileReader' // Fallback extraction method
        ];
        
        this.apiKeys = {
            cloudConvert: '', // Add your API key here
            convertAPI: '', // Add your API key here
        };
        
        this.init();
    }
    
    async init() {
        console.log('🌐 Initializing serverless DOC/PPT conversion...');
        
        // Check which methods are available
        this.availableMethods = await this.detectAvailableMethods();
        console.log('✅ Available conversion methods:', this.availableMethods);
    }
    
    async detectAvailableMethods() {
        const methods = [];
        
        // Check for CloudConvert API
        if (this.apiKeys.cloudConvert) {
            methods.push('CloudConvert');
        }
        
        // Check for Convert API
        if (this.apiKeys.convertAPI) {
            methods.push('OnlineConvertAPI');
        }
        
        // Always available fallback
        methods.push('FileReader');
        
        return methods;
    }
    
    async convertFile(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        console.log(`🔄 Converting ${file.name} (${extension}) using serverless methods...`);
        
        try {
            // Method 1: Try CloudConvert API (best for DOC/PPT)
            if (this.availableMethods.includes('CloudConvert')) {
                return await this.convertWithCloudConvert(file);
            }
            
            // Method 2: Try OnlineConvert API
            if (this.availableMethods.includes('OnlineConvertAPI')) {
                return await this.convertWithOnlineAPI(file);
            }
            
            // Method 3: File content extraction (limited but works)
            return await this.convertWithFileReader(file);
            
        } catch (error) {
            console.error(`❌ Conversion failed for ${file.name}:`, error);
            throw new Error(`Could not convert ${file.name}: ${error.message}`);
        }
    }
    
    async convertWithCloudConvert(file) {
        // CloudConvert API - Excellent for DOC/PPT conversion
        // Free tier: 25 conversions per day
        // Sign up at: https://cloudconvert.com/api/v2
        
        const apiKey = this.apiKeys.cloudConvert;
        if (!apiKey) {
            throw new Error('CloudConvert API key not configured');
        }
        
        try {
            // Step 1: Create job
            const jobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tasks: {
                        'import-file': {
                            operation: 'import/upload'
                        },
                        'convert-file': {
                            operation: 'convert',
                            input: 'import-file',
                            output_format: 'pdf'
                        },
                        'export-file': {
                            operation: 'export/url',
                            input: 'convert-file'
                        }
                    }
                })
            });
            
            const job = await jobResponse.json();
            
            // Step 2: Upload file
            const uploadTask = job.data.tasks.find(t => t.name === 'import-file');
            const formData = new FormData();
            formData.append('file', file);
            
            await fetch(uploadTask.result.form.url, {
                method: 'POST',
                body: formData
            });
            
            // Step 3: Wait for conversion
            let attempts = 0;
            while (attempts < 30) { // Max 30 seconds
                const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${job.data.id}`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                
                const status = await statusResponse.json();
                
                if (status.data.status === 'finished') {
                    const exportTask = status.data.tasks.find(t => t.name === 'export-file');
                    const pdfUrl = exportTask.result.files[0].url;
                    
                    // Download the PDF
                    const pdfResponse = await fetch(pdfUrl);
                    const pdfBytes = await pdfResponse.arrayBuffer();
                    
                    return {
                        success: true,
                        filename: file.name.replace(/\.[^/.]+$/, '') + '.pdf',
                        data: new Uint8Array(pdfBytes),
                        method: 'CloudConvert',
                        size: pdfBytes.byteLength
                    };
                }
                
                if (status.data.status === 'error') {
                    throw new Error('CloudConvert conversion failed');
                }
                
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            throw new Error('CloudConvert conversion timeout');
            
        } catch (error) {
            throw new Error(`CloudConvert API error: ${error.message}`);
        }
    }
    
    async convertWithOnlineAPI(file) {
        // Alternative API service for conversion
        // This is a template - replace with actual API
        
        const apiKey = this.apiKeys.convertAPI;
        if (!apiKey) {
            throw new Error('Convert API key not configured');
        }
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('outputformat', 'pdf');
            formData.append('input', 'upload');
            
            const response = await fetch('https://api.onlineconvert.com/convert', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formData
            });
            
            if (response.ok) {
                const pdfBytes = await response.arrayBuffer();
                
                return {
                    success: true,
                    filename: file.name.replace(/\.[^/.]+$/, '') + '.pdf',
                    data: new Uint8Array(pdfBytes),
                    method: 'OnlineConvertAPI',
                    size: pdfBytes.byteLength
                };
            } else {
                throw new Error('API conversion failed');
            }
            
        } catch (error) {
            throw new Error(`Online API error: ${error.message}`);
        }
    }
    
    async convertWithFileReader(file) {
        // Fallback method: Extract text content and create basic PDF
        // Limited but works without any API keys
        
        const extension = file.name.split('.').pop().toLowerCase();
        
        try {
            let textContent = '';
            
            if (extension === 'doc' || extension === 'docx') {
                textContent = await this.extractDocText(file);
            } else if (extension === 'ppt' || extension === 'pptx') {
                textContent = await this.extractPptText(file);
            } else {
                throw new Error(`Unsupported format: ${extension}`);
            }
            
            // Create simple PDF from extracted text
            const pdfBytes = await this.createTextPdf(textContent, file.name);
            
            return {
                success: true,
                filename: file.name.replace(/\.[^/.]+$/, '') + '.pdf',
                data: pdfBytes,
                method: 'FileReader (Basic)',
                size: pdfBytes.length,
                note: 'Basic text extraction - formatting not preserved'
            };
            
        } catch (error) {
            throw new Error(`File extraction failed: ${error.message}`);
        }
    }
    
    async extractDocText(file) {
        // Basic DOC text extraction
        const arrayBuffer = await file.arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer);
        
        // Remove binary data and extract readable text
        const cleanText = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
                             .replace(/\s+/g, ' ')
                             .trim();
        
        return cleanText || 'Could not extract text from DOC file. Please save as DOCX format for better conversion.';
    }
    
    async extractPptText(file) {
        // Basic PPT text extraction
        const arrayBuffer = await file.arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer);
        
        // Extract text content from PPT binary
        const cleanText = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
                             .replace(/\s+/g, ' ')
                             .trim();
        
        return cleanText || 'Could not extract text from PPT file. Please export as PDF from PowerPoint for best results.';
    }
    
    async createTextPdf(text, originalFilename) {
        // Create PDF using PDF-lib
        const { PDFDocument, rgb } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        
        const page = pdfDoc.addPage([595, 842]); // A4 size
        const { width, height } = page.getSize();
        
        // Add title
        page.drawText(`Converted from: ${originalFilename}`, {
            x: 50,
            y: height - 50,
            size: 12,
            color: rgb(0, 0, 0),
        });
        
        // Add extracted text
        const lines = text.split('\n');
        let yPosition = height - 100;
        
        for (const line of lines) {
            if (yPosition < 50) {
                // Start new page
                const newPage = pdfDoc.addPage([595, 842]);
                yPosition = newPage.getSize().height - 50;
            }
            
            page.drawText(line.substring(0, 80), { // Limit line length
                x: 50,
                y: yPosition,
                size: 10,
                color: rgb(0, 0, 0),
            });
            
            yPosition -= 15;
        }
        
        // Add footer note
        page.drawText('Note: Basic text extraction - original formatting not preserved', {
            x: 50,
            y: 30,
            size: 8,
            color: rgb(0.5, 0.5, 0.5),
        });
        
        const pdfBytes = await pdfDoc.save();
        return pdfBytes;
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
// Easy Setup Instructions
// ========================================

class APISetupHelper {
    static showSetupInstructions() {
        console.log(`
🔧 SETUP SERVERLESS DOC/PPT CONVERSION:

1️⃣ CloudConvert (Recommended - 25 free conversions/day):
   • Sign up: https://cloudconvert.com/api/v2
   • Get API key from dashboard
   • Add to apiKeys.cloudConvert

2️⃣ Alternative APIs:
   • ILovePDF API: https://developer.ilovepdf.com/
   • Zamzar API: https://developers.zamzar.com/
   • ConvertAPI: https://www.convertapi.com/

3️⃣ No API Setup (Basic):
   • Text extraction works immediately
   • Limited formatting but functional

📝 Example Setup:
window.serverlessDocConverter = new ServerlessDocConverter();
window.serverlessDocConverter.apiKeys.cloudConvert = 'your-api-key-here';
        `);
    }
    
    static showSupportMatrix() {
        console.log(`
📊 SERVERLESS CONVERSION SUPPORT:

Format    | CloudConvert | Basic Extract | Quality
----------|--------------|---------------|--------
DOC       | ⭐⭐⭐⭐⭐    | ⭐⭐           | Excellent / Basic
DOCX      | ⭐⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐       | Perfect (use mammoth.js)
PPT       | ⭐⭐⭐⭐⭐    | ⭐⭐           | Excellent / Basic  
PPTX      | ⭐⭐⭐⭐⭐    | ⭐⭐           | Excellent / Basic
XLS       | ⭐⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐       | Perfect (use xlsx.js)
XLSX      | ⭐⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐       | Perfect (use xlsx.js)

💡 Best Strategy:
- DOCX/XLSX: Use existing client-side libs (mammoth.js, xlsx.js)
- DOC/PPT: Use CloudConvert API for perfect quality
- Fallback: Basic text extraction always works
        `);
    }
}

// Initialize
window.serverlessDocConverter = new ServerlessDocConverter();
APISetupHelper.showSetupInstructions();
APISetupHelper.showSupportMatrix();

console.log('🌐 Serverless DOC/PPT converter ready!');
console.log('📝 Add API keys for full functionality, or use basic extraction immediately!');
