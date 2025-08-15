const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const { promisify } = require('util');

// Try to import libreoffice-convert, fallback to manual soffice if not available
let libre = null;
try {
    libre = require('libreoffice-convert');
    libre.convertAsync = promisify(libre.convert);
    console.log('✅ LibreOffice-convert package loaded');
} catch (error) {
    console.log('⚠️ LibreOffice-convert package not available, using direct soffice calls');
}

// ========================================
// Server Configuration
// ========================================

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'temp-uploads');
const CONVERTED_DIR = path.join(__dirname, 'temp-converted');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 20; // Max files per request

// Create directories if they don't exist
fs.ensureDirSync(UPLOAD_DIR);
fs.ensureDirSync(CONVERTED_DIR);

// ========================================
// Middleware Setup
// ========================================

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:3000'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (serve frontend)
app.use(express.static(__dirname, {
    index: 'index.html'
}));

// ========================================
// File Upload Configuration
// ========================================

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    // Allowed file types for server processing
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
        'application/vnd.ms-excel', // XLS
        'application/vnd.ms-powerpoint', // PPT
        'application/msword', // DOC
        'text/plain', // TXT
        'application/rtf' // RTF
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}. Server supports: DOCX, PPTX, XLSX, DOC, PPT, XLS, TXT, RTF`), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_FILES
    },
    fileFilter: fileFilter
});

// ========================================
// API Routes
// ========================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        features: {
            imageConversion: 'client-side',
            documentConversion: 'server-side',
            maxFileSize: '50MB',
            maxFiles: MAX_FILES
        }
    });
});

// File upload endpoint
app.post('/api/upload', upload.array('files'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                error: 'No files uploaded',
                code: 'NO_FILES'
            });
        }

        // Process uploaded files
        const uploadedFiles = req.files.map(file => ({
            id: path.parse(file.filename).name,
            originalName: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            uploadedAt: new Date().toISOString()
        }));

        // Schedule cleanup (files will be deleted after 1 hour)
        setTimeout(() => {
            cleanupFiles(uploadedFiles.map(f => f.path));
        }, 60 * 60 * 1000); // 1 hour

        res.json({
            success: true,
            files: uploadedFiles,
            message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
            nextStep: 'Call /api/convert to convert files to PDF'
        });

    } catch (error) {
        console.error('Upload error:', error);
        
        // Clean up any uploaded files on error
        if (req.files) {
            cleanupFiles(req.files.map(f => f.path));
        }
        
        res.status(500).json({
            error: 'Upload failed',
            message: error.message,
            code: 'UPLOAD_ERROR'
        });
    }
});

// Document conversion endpoint
app.post('/api/convert', async (req, res) => {
    const convertedFiles = [];
    const tempFiles = [];
    
    try {
        const { fileIds, settings = {} } = req.body;
        
        if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({
                error: 'No file IDs provided',
                code: 'NO_FILE_IDS'
            });
        }

        console.log(`🔄 Starting conversion for ${fileIds.length} file(s)`);
        
        // Find uploaded files
        const uploadedFiles = [];
        for (const fileId of fileIds) {
            // Find files with this ID (any extension)
            const files = await fs.readdir(UPLOAD_DIR);
            const matchingFile = files.find(file => file.startsWith(fileId));
            
            if (!matchingFile) {
                throw new Error(`File not found: ${fileId}`);
            }
            
            uploadedFiles.push({
                id: fileId,
                path: path.join(UPLOAD_DIR, matchingFile),
                originalName: matchingFile
            });
        }
        
        // Convert each file
        for (let i = 0; i < uploadedFiles.length; i++) {
            const file = uploadedFiles[i];
            console.log(`📄 Converting file ${i + 1}/${uploadedFiles.length}: ${file.originalName}`);
            
            try {
                const convertedPath = await convertDocumentToPdf(file.path, CONVERTED_DIR);
                const convertedFilename = path.basename(convertedPath);
                
                convertedFiles.push({
                    originalId: file.id,
                    originalName: file.originalName,
                    convertedName: convertedFilename,
                    convertedPath: convertedPath,
                    size: (await fs.stat(convertedPath)).size
                });
                
                tempFiles.push(convertedPath);
                
            } catch (error) {
                console.error(`❌ Failed to convert ${file.originalName}:`, error.message);
                
                // Continue with other files, don't fail the entire batch
                convertedFiles.push({
                    originalId: file.id,
                    originalName: file.originalName,
                    error: error.message,
                    success: false
                });
            }
        }
        
        const successfulConversions = convertedFiles.filter(f => !f.error);
        const failedConversions = convertedFiles.filter(f => f.error);
        
        if (successfulConversions.length === 0) {
            // All conversions failed
            throw new Error(`All conversions failed. Errors: ${failedConversions.map(f => f.error).join(', ')}`);
        }
        
        // If we have successful conversions, create a combined PDF or zip
        if (successfulConversions.length === 1) {
            // Single file - send PDF directly
            const file = successfulConversions[0];
            res.download(file.convertedPath, file.convertedName, (err) => {
                if (err) {
                    console.error('Download error:', err);
                }
                // Cleanup after download
                setTimeout(() => cleanupFiles(tempFiles), 1000);
            });
        } else {
            // Multiple files - for now, send info about conversions
            // TODO: In future, could create a ZIP file with all PDFs
            res.json({
                success: true,
                message: `Successfully converted ${successfulConversions.length} of ${fileIds.length} files`,
                conversions: convertedFiles,
                totalSize: successfulConversions.reduce((sum, f) => sum + (f.size || 0), 0),
                note: 'Multiple file download will be improved in future updates. Files are ready for individual download.',
                downloadEndpoint: '/api/download'
            });
            
            // Schedule cleanup
            setTimeout(() => cleanupFiles(tempFiles), 5 * 60 * 1000); // 5 minutes
        }

    } catch (error) {
        console.error('❌ Conversion error:', error);
        
        // Cleanup any temporary files
        if (tempFiles.length > 0) {
            cleanupFiles(tempFiles);
        }
        
        res.status(500).json({
            error: 'Conversion failed',
            message: error.message,
            code: 'CONVERSION_ERROR',
            conversions: convertedFiles
        });
    }
});

// File download endpoint for converted files
app.get('/api/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(CONVERTED_DIR, filename);
    
    // Security check - ensure file is in converted directory
    if (!path.normalize(filePath).startsWith(path.normalize(CONVERTED_DIR))) {
        return res.status(400).json({
            error: 'Invalid file path',
            code: 'INVALID_PATH'
        });
    }
    
    res.download(filePath, (err) => {
        if (err) {
            console.error('Download error:', err);
            if (!res.headersSent) {
                res.status(404).json({
                    error: 'File not found',
                    code: 'FILE_NOT_FOUND'
                });
            }
        }
    });
});

// File cleanup endpoint
app.delete('/api/cleanup/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const filePath = path.join(UPLOAD_DIR, fileId + '.*');
        
        // Find and delete file with any extension
        const files = await fs.readdir(UPLOAD_DIR);
        const targetFiles = files.filter(file => file.startsWith(fileId));
        
        for (const file of targetFiles) {
            await fs.remove(path.join(UPLOAD_DIR, file));
        }
        
        res.json({
            success: true,
            message: `Cleaned up ${targetFiles.length} file(s)`,
            fileId: fileId
        });
        
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({
            error: 'Cleanup failed',
            message: error.message,
            code: 'CLEANUP_ERROR'
        });
    }
});

// ========================================
// Document Conversion Functions
// ========================================

async function convertDocumentToPdf(inputPath, outputDir) {
    const inputFilename = path.basename(inputPath);
    const outputFilename = path.parse(inputFilename).name + '.pdf';
    const outputPath = path.join(outputDir, outputFilename);
    
    console.log(`🔄 Converting: ${inputFilename} -> ${outputFilename}`);
    
    try {
        // Method 1: Try libreoffice-convert package first
        if (libre) {
            console.log('📦 Using libreoffice-convert package...');
            const inputBuffer = await fs.readFile(inputPath);
            const pdfBuffer = await libre.convertAsync(inputBuffer, '.pdf', undefined);
            await fs.writeFile(outputPath, pdfBuffer);
            console.log('✅ Conversion successful with libreoffice-convert');
            return outputPath;
        }
        
        // Method 2: Fallback to direct soffice command
        console.log('🖥️ Using direct soffice command...');
        return await convertWithSoffice(inputPath, outputDir);
        
    } catch (error) {
        console.error('❌ Conversion failed:', error.message);
        throw new Error(`Document conversion failed: ${error.message}`);
    }
}

async function convertWithSoffice(inputPath, outputDir) {
    return new Promise((resolve, reject) => {
        // Try different possible LibreOffice installation paths
        const possiblePaths = [
            'soffice',
            'libreoffice',
            '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"',
            '"C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe"',
            '/usr/bin/soffice',
            '/usr/local/bin/soffice',
            '/opt/libreoffice/program/soffice'
        ];
        
        let attempts = 0;
        
        function tryNextPath() {
            if (attempts >= possiblePaths.length) {
                reject(new Error('LibreOffice not found. Please install LibreOffice and ensure it\'s in your PATH or install it in the default location.'));
                return;
            }
            
            const sofficeCommand = possiblePaths[attempts];
            attempts++;
            
            const args = [
                '--headless',
                '--convert-to', 'pdf',
                '--outdir', outputDir,
                inputPath
            ];
            
            console.log(`🔍 Trying: ${sofficeCommand} with args:`, args);
            
            const process = spawn(sofficeCommand, args, {
                shell: true,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            const timeout = setTimeout(() => {
                process.kill('SIGTERM');
                reject(new Error('Conversion timed out after 30 seconds'));
            }, 30000);
            
            process.on('close', (code) => {
                clearTimeout(timeout);
                
                if (code === 0) {
                    const outputFilename = path.parse(path.basename(inputPath)).name + '.pdf';
                    const outputPath = path.join(outputDir, outputFilename);
                    
                    // Check if output file was created
                    fs.access(outputPath)
                        .then(() => {
                            console.log('✅ Conversion successful with soffice');
                            console.log('📄 Output:', stdout);
                            resolve(outputPath);
                        })
                        .catch(() => {
                            console.log(`⚠️ ${sofficeCommand} completed but output file not found, trying next path...`);
                            tryNextPath();
                        });
                } else {
                    console.log(`⚠️ ${sofficeCommand} failed with code ${code}, trying next path...`);
                    if (stderr) console.log('Error:', stderr);
                    tryNextPath();
                }
            });
            
            process.on('error', (error) => {
                clearTimeout(timeout);
                console.log(`⚠️ ${sofficeCommand} process error, trying next path...`);
                tryNextPath();
            });
        }
        
        tryNextPath();
    });
}

async function detectLibreOffice() {
    try {
        const result = await convertWithSoffice(
            path.join(__dirname, 'test-dummy.txt'), 
            CONVERTED_DIR
        );
        return true;
    } catch (error) {
        return false;
    }
}

// ========================================
// Utility Functions
// ========================================

// Clean up files helper
async function cleanupFiles(filePaths) {
    for (const filePath of filePaths) {
        try {
            await fs.remove(filePath);
            console.log(`Cleaned up: ${filePath}`);
        } catch (error) {
            console.error(`Failed to cleanup ${filePath}:`, error.message);
        }
    }
}

// Periodic cleanup of old files (runs every hour)
setInterval(async () => {
    try {
        const files = await fs.readdir(UPLOAD_DIR);
        const now = Date.now();
        const maxAge = 2 * 60 * 60 * 1000; // 2 hours
        
        for (const file of files) {
            const filePath = path.join(UPLOAD_DIR, file);
            const stats = await fs.stat(filePath);
            
            if (now - stats.mtime.getTime() > maxAge) {
                await fs.remove(filePath);
                console.log(`Auto-cleaned old file: ${file}`);
            }
        }
    } catch (error) {
        console.error('Auto-cleanup error:', error);
    }
}, 60 * 60 * 1000); // Every hour

// ========================================
// Error Handling
// ========================================

// Handle multer errors
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large',
                message: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
                code: 'FILE_TOO_LARGE'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Too many files',
                message: `Maximum ${MAX_FILES} files allowed`,
                code: 'TOO_MANY_FILES'
            });
        }
    }
    
    res.status(500).json({
        error: 'Server error',
        message: error.message,
        code: 'SERVER_ERROR'
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        message: `${req.method} ${req.path} is not available`,
        code: 'NOT_FOUND'
    });
});

// Catch-all for frontend routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ========================================
// Server Startup
// ========================================

app.listen(PORT, () => {
    console.log('🚀 I HATE PDF Server Started!');
    console.log(`📍 Frontend: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api/health`);
    console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
    console.log(`📊 Max file size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    console.log(`📈 Max files per request: ${MAX_FILES}`);
    console.log('💡 Ready for document conversion in Step 7!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📤 Server shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📤 Server shutting down gracefully...');
    process.exit(0);
});
