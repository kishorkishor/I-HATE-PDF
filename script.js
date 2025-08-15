// ========================================
// Theme Management
// ========================================
class ThemeManager {
    constructor() {
        this.body = document.body;
        this.toggleButton = document.getElementById('themeToggle');
        this.themeIcon = this.toggleButton.querySelector('.theme-icon');
        
        this.init();
    }
    
    init() {
        // Load saved theme or default to light
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
        
        // Add event listener
        this.toggleButton.addEventListener('click', () => this.toggleTheme());
    }
    
    setTheme(theme) {
        this.body.className = `theme-${theme}`;
        this.themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
        localStorage.setItem('theme', theme);
    }
    
    toggleTheme() {
        const currentTheme = this.body.classList.contains('theme-light') ? 'light' : 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }
}

// ========================================
// File Management
// ========================================
class FileManager {
    constructor() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.previewSection = document.getElementById('previewSection');
        this.fileList = document.getElementById('fileList');
        this.convertBtn = document.getElementById('convertBtn');
        this.clearBtn = document.getElementById('clearFiles');
        this.progressSection = document.getElementById('progressSection');
        
        this.selectedFiles = [];
        this.fileMetadata = new Map(); // Store rotation and other metadata per file
        this.backendAvailable = false; // Will be detected on startup
        this.apiBaseUrl = window.location.origin; // Use same origin for API
        
        this.supportedTypes = {
            'image/jpeg': 'JPG',
            'image/png': 'PNG',
            'image/gif': 'GIF',
            'image/webp': 'WEBP',
            'application/pdf': 'PDF',
            'application/msword': 'DOC',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
            'application/vnd.ms-powerpoint': 'PPT',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
            'application/vnd.ms-excel': 'XLS',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
            'application/vnd.google-apps.document': 'GDOC',
            'text/plain': 'TXT',
            'application/rtf': 'RTF'
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkBackendAvailability();
    }
    
    async checkBackendAvailability() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/health`, {
                method: 'GET'
            });
            
            if (response.ok) {
                const health = await response.json();
                this.backendAvailable = true;
                console.log('✅ Backend available:', health);
                this.updateDocumentSupport(true);
            }
        } catch (error) {
            console.log('ℹ️ Backend not available (frontend-only mode):', error.message);
            this.backendAvailable = false;
            this.updateDocumentSupport(false);
        }
    }
    
    updateDocumentSupport(available) {
        const formatTags = document.querySelectorAll('.format-tag');
        formatTags.forEach(tag => {
            if (tag.textContent.includes('DOCX') || tag.textContent.includes('PPTX') || tag.textContent.includes('XLSX')) {
                // Always enable client-side conversion
                tag.classList.remove('disabled');
                
                if (available) {
                    tag.title = 'Server-side document conversion available!';
                    tag.textContent = tag.textContent.replace('Coming in Step 6!', 'Server Ready!');
                } else {
                    tag.title = 'Client-side document conversion (perfect for online hosting!)';
                    if (tag.textContent.includes('Coming in Step 6!')) {
                        tag.textContent = tag.textContent.replace('Coming in Step 6!', 'Client Ready!');
                    } else if (!tag.textContent.includes('Client Ready!') && !tag.textContent.includes('Server Ready!')) {
                        tag.textContent = tag.textContent + ' Client Ready!';
                    }
                }
            }
        });
        
        // Show conversion status in console
        if (available) {
            console.log('🖥️ Server-side conversion available (LibreOffice)');
        } else {
            console.log('🌐 Client-side conversion ready (Netlify/Vercel compatible!)');
        }
    }
    
    setupEventListeners() {
        // Drop zone events (for file uploads)
        this.dropZone.addEventListener('dragover', (e) => this.handleFileDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.handleFileDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.handleFileDrop(e));
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        
        // File input change
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Control buttons
        this.clearBtn.addEventListener('click', () => this.clearFiles());
        this.convertBtn.addEventListener('click', () => this.convertFiles());
    }
    
    // File upload drag events (for the main drop zone)
    handleFileDragOver(e) {
        e.preventDefault();
        this.dropZone.classList.add('drag-over');
    }
    
    handleFileDragLeave(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
    }
    
    handleFileDrop(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }
    
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
        // Reset input to allow selecting same files again if needed
        this.resetFileInput();
    }
    
    processFiles(files) {
        // Validate files first
        const validation = this.validateFiles(files);
        
        if (validation.errors.length > 0) {
            this.showError('File validation failed:\n' + validation.errors.join('\n'));
            return;
        }
        
        // Show warnings if any
        if (validation.warnings.length > 0) {
            console.warn('File warnings:', validation.warnings);
            this.showWarning(validation.warnings.join('\n'));
        }
        
        const validFiles = files.filter(file => this.isValidFile(file));
        
        if (validFiles.length === 0) {
            this.showError('Please select valid files (JPG, PNG, GIF, WEBP)');
            return;
        }
        
        // Show batch info
        if (validFiles.length > 10) {
            this.showInfo(`Processing ${validFiles.length} files (${this.formatFileSize(validation.totalSize)}). This may take a few moments.`);
        }
        
        // Add new files to selection
        validFiles.forEach(file => {
            if (!this.selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
                this.selectedFiles.push(file);
                // Initialize metadata for each file
                this.fileMetadata.set(file, {
                    rotation: 0,
                    fitMode: 'fit', // 'fit', 'fill', 'original'
                    brightness: 0, // -100 to 100
                    contrast: 0, // -100 to 100
                    flipHorizontal: false,
                    flipVertical: false,
                    cropArea: null // {x, y, width, height} in percentage of original image
                });
            }
        });
        
        this.updateUI();
    }
    
    showWarning(message) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'warning-message';
        warningDiv.innerHTML = `
            <div class="warning-content">
                <span class="warning-icon">⚠️</span>
                <span class="warning-text">${message}</span>
                <button class="warning-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        warningDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff9800;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            font-weight: 500;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(warningDiv);
        
        setTimeout(() => {
            if (warningDiv.parentNode) {
                warningDiv.remove();
            }
        }, 6000);
    }
    
    showInfo(message) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'info-message';
        infoDiv.innerHTML = `
            <div class="info-content">
                <span class="info-icon">ℹ️</span>
                <span class="info-text">${message}</span>
                <button class="info-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        infoDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2196F3;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            font-weight: 500;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(infoDiv);
        
        setTimeout(() => {
            if (infoDiv.parentNode) {
                infoDiv.remove();
            }
        }, 5000);
    }
    
    isValidFile(file) {
        return this.supportedTypes.hasOwnProperty(file.type);
    }
    
    updateUI() {
        if (this.selectedFiles.length === 0) {
            this.previewSection.style.display = 'none';
            return;
        }
        
        this.previewSection.style.display = 'block';
        this.renderFileList();
        this.renderPdfSettings();
        this.convertBtn.disabled = false;
    }
    
    renderPdfSettings() {
        // Check if settings already exist
        let settingsContainer = document.querySelector('.pdf-settings');
        if (!settingsContainer) {
            settingsContainer = document.createElement('div');
            settingsContainer.className = 'pdf-settings';
            
            settingsContainer.innerHTML = `
                <h4>PDF Settings</h4>
                <div class="settings-row">
                    <div class="setting-group">
                        <label for="pageSize">Page Size</label>
                        <select id="pageSize">
                            <option value="a4">A4 (210 × 297 mm)</option>
                            <option value="letter">Letter (8.5 × 11 in)</option>
                            <option value="legal">Legal (8.5 × 14 in)</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label for="orientation">Orientation</label>
                        <select id="orientation">
                            <option value="portrait">Portrait</option>
                            <option value="landscape">Landscape</option>
                        </select>
                    </div>
                </div>
            `;
            
            // Insert before conversion controls
            const controls = document.querySelector('.conversion-controls');
            controls.parentElement.insertBefore(settingsContainer, controls);
        }
        
        // Add batch controls if multiple images
        this.renderBatchControls();
    }
    
    renderBatchControls() {
        // Remove existing batch controls
        const existingBatch = document.querySelector('.batch-controls');
        if (existingBatch) existingBatch.remove();
        
        if (this.selectedFiles.length > 1) {
            const batchContainer = document.createElement('div');
            batchContainer.className = 'batch-controls';
            
            batchContainer.innerHTML = `
                <h4>Batch Actions</h4>
                <div class="batch-buttons">
                    <button class="btn btn-secondary" onclick="fileManager.rotateAllImages(-90)">↺ Rotate All Left</button>
                    <button class="btn btn-secondary" onclick="fileManager.rotateAllImages(90)">↻ Rotate All Right</button>
                    <button class="btn btn-secondary" onclick="fileManager.openBatchCropEditor()">✂️ Batch Crop</button>
                    <select onchange="fileManager.changeAllFitModes(this.value)" style="padding: 8px 12px; border-radius: 4px;">
                        <option value="">Set All Fit Mode...</option>
                        <option value="fit">All: Fit to Page</option>
                        <option value="fill">All: Fill Page</option>
                        <option value="original">All: Original Size</option>
                    </select>
                </div>
            `;
            
            // Insert before PDF settings
            const pdfSettings = document.querySelector('.pdf-settings');
            pdfSettings.parentElement.insertBefore(batchContainer, pdfSettings);
        }
    }
    
    renderFileList() {
        this.fileList.innerHTML = '';
        
        // Add drag hint if multiple files
        if (this.selectedFiles.length > 1) {
            const hint = document.createElement('div');
            hint.className = 'drag-hint';
            hint.textContent = '💡 Drag images to reorder pages in your PDF';
            this.fileList.parentElement.insertBefore(hint, this.fileList);
        } else {
            // Remove existing hint
            const existingHint = this.fileList.parentElement.querySelector('.drag-hint');
            if (existingHint) existingHint.remove();
        }
        
        this.selectedFiles.forEach((file, index) => {
            const fileItem = this.createFileItem(file, index);
            this.fileList.appendChild(fileItem);
        });
    }
    
    createFileItem(file, index) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.draggable = true;
        item.dataset.index = index;
        
        const fileType = this.supportedTypes[file.type] || 'Unknown';
        const fileSize = this.formatFileSize(file.size);
        
        const metadata = this.fileMetadata.get(file) || { rotation: 0, fitMode: 'fit' };
        
        item.innerHTML = `
            <div class="page-number">${index + 1}</div>
            <div class="file-preview" style="display: flex; align-items: center; justify-content: center; background-color: var(--bg-primary); border: 2px dashed var(--border-color);">
                <span style="font-size: 2rem; opacity: 0.7;">📄</span>
            </div>
            <div class="file-name">${file.name}</div>
            <div class="file-size">${fileSize} • ${fileType}</div>
            
            <!-- Image Editing Controls -->
            <div class="edit-controls" style="margin: 10px 0; display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
                <button class="btn-icon" onclick="fileManager.rotateImage(${index}, -90)" title="Rotate Left">↺</button>
                <button class="btn-icon" onclick="fileManager.rotateImage(${index}, 90)" title="Rotate Right">↻</button>
                <button class="btn-icon" onclick="fileManager.openImageEditor(${index})" title="Advanced Edit">✏️</button>
                <select class="fit-select" onchange="fileManager.changeFitMode(${index}, this.value)" title="Fit Mode">
                    <option value="fit" ${metadata.fitMode === 'fit' ? 'selected' : ''}>Fit</option>
                    <option value="fill" ${metadata.fitMode === 'fill' ? 'selected' : ''}>Fill</option>
                    <option value="original" ${metadata.fitMode === 'original' ? 'selected' : ''}>Original</option>
                </select>
            </div>
            
            <button class="btn btn-secondary" style="margin-top: 5px; padding: 6px 12px; font-size: 0.9rem;" onclick="fileManager.removeFile(${index})">Remove</button>
        `;
        
        // Add drag event listeners for reordering
        item.addEventListener('dragstart', (e) => this.handleItemDragStart(e));
        item.addEventListener('dragover', (e) => this.handleItemDragOver(e));
        item.addEventListener('drop', (e) => this.handleItemDrop(e));
        item.addEventListener('dragend', (e) => this.handleItemDragEnd(e));
        item.addEventListener('dragenter', (e) => this.handleItemDragEnter(e));
        item.addEventListener('dragleave', (e) => this.handleItemDragLeave(e));
        
        // If it's an image, show preview
        if (file.type.startsWith('image/')) {
            this.updateImagePreview(item, file);
        }
        
        return item;
    }
    
    removeFile(index) {
        const removedFile = this.selectedFiles.splice(index, 1)[0];
        this.fileMetadata.delete(removedFile);
        this.updateUI();
    }
    
    clearFiles() {
        this.selectedFiles = [];
        this.fileMetadata.clear();
        this.fileInput.value = '';
        this.updateUI();
    }
    
    resetFileInput() {
        // Reset the file input to allow selecting the same files again
        this.fileInput.value = '';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    showError(message) {
        // Enhanced error message with better styling
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <span class="error-icon">❌</span>
                <span class="error-text">${message}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            font-weight: 500;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 8000);
    }
    
    validateFiles(files) {
        const errors = [];
        const warnings = [];
        let totalSize = 0;
        
        files.forEach(file => {
            totalSize += file.size;
            
            // Check file size (50MB limit per file)
            if (file.size > 50 * 1024 * 1024) {
                errors.push(`${file.name}: File too large (${this.formatFileSize(file.size)} > 50MB)`);
            }
            
            // Check file type
            if (!this.isValidFile(file)) {
                errors.push(`${file.name}: Unsupported file type`);
            }
            
            // Performance warnings
            if (file.size > 10 * 1024 * 1024) {
                warnings.push(`${file.name}: Large file (${this.formatFileSize(file.size)}) may take longer to process`);
            }
        });
        
        // Check total batch size (500MB limit)
        if (totalSize > 500 * 1024 * 1024) {
            errors.push(`Total batch size too large: ${this.formatFileSize(totalSize)} (max 500MB)`);
        }
        
        // Check number of files (100 limit)
        if (files.length > 100) {
            errors.push(`Too many files: ${files.length} (max 100 files per batch)`);
        }
        
        return { errors, warnings, totalSize };
    }
    
    async convertFiles() {
        if (this.selectedFiles.length === 0) return;
        
        // Separate files by type
        const imageFiles = this.selectedFiles.filter(file => 
            file.type.startsWith('image/'));
        const documentFiles = this.selectedFiles.filter(file => 
            !file.type.startsWith('image/') && file.type !== 'application/pdf');
        
        // Show progress
        this.showProgress('Preparing conversion...');
        
        try {
            // Handle mixed files
            if (imageFiles.length > 0 && documentFiles.length > 0) {
                this.showError('Please convert images and documents separately for now. This will be improved in Step 7!');
                return;
            }
            
            // Convert images (client-side)
            if (imageFiles.length > 0) {
                if (imageFiles.length === 1) {
                    await this.convertSingleImage(imageFiles[0]);
                } else {
                    await this.convertMultipleImages(imageFiles);
                }
                this.showSuccess(`Successfully converted ${imageFiles.length} image(s) to PDF!`);
            }
            
            // Convert documents (client-side or server-side)
            if (documentFiles.length > 0) {
                if (!this.backendAvailable) {
                    // Use client-side conversion
                    console.log('🌐 Using client-side document conversion (perfect for online hosting!)');
                    await this.convertDocumentsClientSide(documentFiles);
                } else {
                    // Use server-side conversion
                    console.log('🖥️ Using server-side document conversion');
                    await this.convertDocuments(documentFiles);
                }
            }
            
            // No valid files
            if (imageFiles.length === 0 && documentFiles.length === 0) {
                this.showError('Please select valid files. Supported: Images (JPG, PNG, GIF, WEBP) or Documents (DOCX, PPTX, XLSX, TXT)');
                return;
            }
            
        } catch (error) {
            this.showError('Conversion failed: ' + error.message);
        } finally {
            this.hideProgress();
        }
    }
    
    async convertDocuments(files) {
        try {
            // Step 1: Upload files to server
            this.updateProgress(10, 'Uploading documents to server...');
            
            const formData = new FormData();
            files.forEach(file => {
                formData.append('files', file);
            });
            
            const uploadResponse = await fetch(`${this.apiBaseUrl}/api/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                const error = await uploadResponse.json();
                throw new Error(error.message || 'Upload failed');
            }
            
            const uploadResult = await uploadResponse.json();
            this.updateProgress(50, 'Documents uploaded. Processing...');
            
            // Step 2: Convert to PDF (placeholder for Step 7)
            const convertResponse = await fetch(`${this.apiBaseUrl}/api/convert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileIds: uploadResult.files.map(f => f.id),
                    settings: this.getPdfSettings()
                })
            });
            
            if (convertResponse.ok) {
                // Check if response is JSON or file download
                const contentType = convertResponse.headers.get('content-type');
                
                if (contentType && contentType.includes('application/json')) {
                    // JSON response (multiple files or error info)
                    const convertResult = await convertResponse.json();
                    this.updateProgress(90, 'Conversion complete!');
                    
                    if (convertResult.success) {
                        this.showSuccess(`Successfully converted ${convertResult.conversions?.filter(c => !c.error).length || 0} document(s) to PDF!`);
                        
                        // Show download info for multiple files
                        if (convertResult.conversions?.length > 1) {
                            this.showInfo('Multiple files converted! Individual downloads will be available soon.');
                        }
                    } else {
                        this.showInfo(convertResult.message || 'Document conversion completed with some issues.');
                    }
                } else {
                    // File download response (single file)
                    this.updateProgress(95, 'Downloading converted PDF...');
                    
                    const blob = await convertResponse.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    
                    // Get filename from Content-Disposition header or use default
                    const disposition = convertResponse.headers.get('Content-Disposition');
                    let filename = 'converted-document.pdf';
                    if (disposition && disposition.includes('filename=')) {
                        filename = disposition.split('filename=')[1].replace(/"/g, '');
                    }
                    
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    
                    this.updateProgress(100, 'Download complete!');
                    this.showSuccess('Document converted and downloaded successfully!');
                }
            } else {
                const errorResult = await convertResponse.json();
                throw new Error(errorResult.message || 'Server conversion failed');
            }
            
        } catch (error) {
            throw new Error(`Document conversion failed: ${error.message}`);
        }
    }
    
    async convertDocumentsClientSide(files) {
        try {
            this.updateProgress(10, 'Initializing client-side converter...');
            
            // Wait for client converter to be ready
            let attempts = 0;
            while (!window.clientConverter?.isReady && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.clientConverter?.isReady) {
                throw new Error('Client-side converter not ready. Please refresh the page and try again.');
            }
            
            const convertedFiles = [];
            const totalFiles = files.length;
            
            // Convert each file
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const progress = 20 + (i / totalFiles) * 60;
                
                this.updateProgress(progress, `Converting ${file.name}...`);
                
                try {
                    const result = await window.clientConverter.convertFile(file);
                    convertedFiles.push(result);
                    
                    this.updateProgress(progress + (60 / totalFiles) * 0.8, `Converted ${file.name} ✅`);
                    
                } catch (error) {
                    console.error(`Failed to convert ${file.name}:`, error);
                    
                    // Show helpful error message based on file type
                    const extension = file.name.split('.').pop().toLowerCase();
                    let helpMessage = error.message;
                    
                    if (extension === 'pptx' || extension === 'ppt') {
                        helpMessage = 'PowerPoint conversion: Please export your presentation as PDF from PowerPoint, or convert slides to images first.';
                    } else if (extension === 'doc') {
                        helpMessage = 'Legacy DOC format: Please save your document as DOCX format for better conversion support.';
                    }
                    
                    this.showWarning(`${file.name}: ${helpMessage}`);
                    continue;
                }
            }
            
            this.updateProgress(90, 'Finalizing conversions...');
            
            if (convertedFiles.length === 0) {
                throw new Error('No files could be converted. Please check the file formats and try again.');
            }
            
            // Download files
            if (convertedFiles.length === 1) {
                // Single file - direct download
                const file = convertedFiles[0];
                window.clientConverter.downloadPdf(file.data, file.filename);
                this.showSuccess('Document converted and downloaded successfully!');
            } else {
                // Multiple files - download each one
                for (const file of convertedFiles) {
                    window.clientConverter.downloadPdf(file.data, file.filename);
                }
                this.showSuccess(`Successfully converted and downloaded ${convertedFiles.length} document(s)!`);
            }
            
            this.updateProgress(100, 'All conversions complete!');
            
        } catch (error) {
            throw new Error(`Client-side conversion failed: ${error.message}`);
        }
    }
    
    updateProgress(percentage, message) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) progressFill.style.width = percentage + '%';
        if (progressText) progressText.textContent = message;
    }
    
    async convertSingleImage(file) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        // Get PDF settings
        const settings = this.getPdfSettings();
        
        // Update progress
        progressFill.style.width = '20%';
        progressText.textContent = 'Loading image...';
        
        // Load image
        const imageData = await this.loadImageData(file);
        
        progressFill.style.width = '50%';
        progressText.textContent = 'Creating PDF...';
        
        // Create PDF with settings
        const { jsPDF } = window.jspdf;
        const pdf = this.createPdfWithSettings(settings);
        
        // Calculate dimensions to fit image in page
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20; // 20mm margin
        
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2);
        
        const { width, height } = this.calculateImageDimensions(
            imageData, 
            maxWidth, 
            maxHeight
        );
        
        // Center the image
        const x = (pageWidth - width) / 2;
        const y = (pageHeight - height) / 2;
        
        progressFill.style.width = '80%';
        progressText.textContent = 'Adding image to PDF...';
        
        // Add image to PDF
        pdf.addImage(imageData.dataUrl, 'JPEG', x, y, width, height);
        
        progressFill.style.width = '100%';
        progressText.textContent = 'Downloading PDF...';
        
        // Download
        const fileName = file.name.replace(/\.[^/.]+$/, '') + '.pdf';
        pdf.save(fileName);
    }
    
    async convertMultipleImages(files) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        // Show detailed progress info
        this.showDetailedProgress(files.length);
        
        // Get PDF settings
        const settings = this.getPdfSettings();
        
        const { jsPDF } = window.jspdf;
        const pdf = this.createPdfWithSettings(settings);
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2);
        
        // Process in chunks to prevent UI blocking
        const chunkSize = this.getOptimalChunkSize(files.length);
        const startTime = Date.now();
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const progress = ((i + 1) / files.length) * 100;
            
            // Update progress with detailed info
            this.updateDetailedProgress(i + 1, files.length, file.name, startTime);
            progressFill.style.width = progress + '%';
            
            try {
                // Load image with memory optimization
                const imageData = await this.loadImageDataOptimized(file);
                
                // Add new page if not first image
                if (i > 0) {
                    pdf.addPage();
                }
                
                // Calculate dimensions
                const { width, height } = this.calculateImageDimensions(
                    imageData, 
                    maxWidth, 
                    maxHeight
                );
                
                // Center the image
                const x = (pageWidth - width) / 2;
                const y = (pageHeight - height) / 2;
                
                // Add image to PDF
                pdf.addImage(imageData.dataUrl, 'JPEG', x, y, width, height);
                
                // Yield control to browser every chunk
                if ((i + 1) % chunkSize === 0) {
                    await this.yieldToBrowser();
                }
                
            } catch (error) {
                console.error(`Failed to process ${file.name}:`, error);
                this.updateDetailedProgress(i + 1, files.length, `❌ Error: ${file.name}`, startTime);
                
                // Continue with other images instead of failing completely
                continue;
            }
        }
        
        progressText.textContent = 'Generating PDF file...';
        progressFill.style.width = '95%';
        
        // Final yield before PDF generation
        await this.yieldToBrowser();
        
        progressText.textContent = 'Downloading PDF...';
        progressFill.style.width = '100%';
        
        // Download with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        pdf.save(`converted-images-${timestamp}.pdf`);
        
        this.hideDetailedProgress();
    }
    
    getOptimalChunkSize(totalFiles) {
        // Adjust chunk size based on total files for optimal performance
        if (totalFiles <= 10) return 2;
        if (totalFiles <= 50) return 3;
        return 5; // For very large batches
    }
    
    async yieldToBrowser() {
        // Give browser time to update UI and handle other tasks
        return new Promise(resolve => setTimeout(resolve, 0));
    }
    
    async loadImageDataOptimized(file) {
        // Add memory management and size limits
        const maxFileSize = 50 * 1024 * 1024; // 50MB limit
        
        if (file.size > maxFileSize) {
            throw new Error(`File too large: ${this.formatFileSize(file.size)} (max 50MB)`);
        }
        
        const metadata = this.fileMetadata.get(file) || { 
            rotation: 0, 
            fitMode: 'fit',
            brightness: 0,
            contrast: 0,
            flipHorizontal: false,
            flipVertical: false,
            cropArea: null
        };
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        // Optimize canvas size for memory efficiency
                        const maxDimension = 2000; // Limit for memory
                        let canvasWidth = img.width;
                        let canvasHeight = img.height;
                        
                        if (canvasWidth > maxDimension || canvasHeight > maxDimension) {
                            const scale = maxDimension / Math.max(canvasWidth, canvasHeight);
                            canvasWidth *= scale;
                            canvasHeight *= scale;
                        }
                        
                        // Calculate canvas dimensions based on rotation
                        const rotation = metadata.rotation * Math.PI / 180;
                        const cos = Math.abs(Math.cos(rotation));
                        const sin = Math.abs(Math.sin(rotation));
                        
                        const newWidth = canvasWidth * cos + canvasHeight * sin;
                        const newHeight = canvasWidth * sin + canvasHeight * cos;
                        
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        canvas.width = newWidth;
                        canvas.height = newHeight;
                        
                        // Apply all transformations
                        ctx.translate(newWidth / 2, newHeight / 2);
                        
                        // Apply rotation
                        if (metadata.rotation) {
                            ctx.rotate(rotation);
                        }
                        
                        // Apply flips
                        if (metadata.flipHorizontal || metadata.flipVertical) {
                            ctx.scale(
                                metadata.flipHorizontal ? -1 : 1,
                                metadata.flipVertical ? -1 : 1
                            );
                        }
                        
                        // Apply brightness and contrast if needed
                        if (metadata.brightness !== 0 || metadata.contrast !== 0) {
                            const tempCanvas = document.createElement('canvas');
                            const tempCtx = tempCanvas.getContext('2d');
                            tempCanvas.width = canvasWidth;
                            tempCanvas.height = canvasHeight;
                            
                            // Draw to temp canvas
                            tempCtx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
                            
                            // Apply adjustments
                            const imageData = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight);
                            const data = imageData.data;
                            
                            const brightnessAdjust = metadata.brightness * 2.55;
                            const contrastAdjust = (metadata.contrast + 100) / 100;
                            
                            for (let i = 0; i < data.length; i += 4) {
                                data[i] = Math.max(0, Math.min(255, (data[i] - 128) * contrastAdjust + 128 + brightnessAdjust));
                                data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - 128) * contrastAdjust + 128 + brightnessAdjust));
                                data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - 128) * contrastAdjust + 128 + brightnessAdjust));
                            }
                            
                            tempCtx.putImageData(imageData, 0, 0);
                            
                            // Apply crop if exists
                            if (metadata.cropArea) {
                                const sourceX = (metadata.cropArea.x / 100) * canvasWidth;
                                const sourceY = (metadata.cropArea.y / 100) * canvasHeight;
                                const sourceWidth = (metadata.cropArea.width / 100) * canvasWidth;
                                const sourceHeight = (metadata.cropArea.height / 100) * canvasHeight;
                                
                                ctx.drawImage(
                                    tempCanvas,
                                    sourceX, sourceY, sourceWidth, sourceHeight,
                                    -canvasWidth / 2, -canvasHeight / 2, canvasWidth, canvasHeight
                                );
                            } else {
                                ctx.drawImage(tempCanvas, -canvasWidth / 2, -canvasHeight / 2, canvasWidth, canvasHeight);
                            }
                        } else {
                            // Apply crop if exists (no brightness/contrast)
                            if (metadata.cropArea) {
                                const sourceX = (metadata.cropArea.x / 100) * img.width;
                                const sourceY = (metadata.cropArea.y / 100) * img.height;
                                const sourceWidth = (metadata.cropArea.width / 100) * img.width;
                                const sourceHeight = (metadata.cropArea.height / 100) * img.height;
                                
                                ctx.drawImage(
                                    img,
                                    sourceX, sourceY, sourceWidth, sourceHeight,
                                    -canvasWidth / 2, -canvasHeight / 2, canvasWidth, canvasHeight
                                );
                            } else {
                                ctx.drawImage(img, -canvasWidth / 2, -canvasHeight / 2, canvasWidth, canvasHeight);
                            }
                        }
                        
                        resolve({
                            dataUrl: canvas.toDataURL('image/jpeg', 0.85),
                            width: newWidth,
                            height: newHeight,
                            originalWidth: img.width,
                            originalHeight: img.height,
                            rotation: metadata.rotation,
                            fitMode: metadata.fitMode,
                            brightness: metadata.brightness,
                            contrast: metadata.contrast,
                            flipHorizontal: metadata.flipHorizontal,
                            flipVertical: metadata.flipVertical
                        });
                        
                        // Clean up
                        canvas.remove();
                        
                    } catch (error) {
                        reject(new Error(`Image processing failed: ${error.message}`));
                    }
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }
    
    createPdfWithSettings(settings) {
        const { jsPDF } = window.jspdf;
        
        // Map settings to jsPDF format
        const formatMap = {
            'a4': 'a4',
            'letter': 'letter',
            'legal': 'legal'
        };
        
        const orientation = settings.orientation === 'landscape' ? 'landscape' : 'portrait';
        const format = formatMap[settings.pageSize] || 'a4';
        
        return new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: format
        });
    }
    
    async loadImageData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const metadata = this.fileMetadata.get(file) || { rotation: 0, fitMode: 'fit' };
                    
                    // Create canvas to apply rotation and get image data
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate canvas dimensions based on rotation
                    const rotation = metadata.rotation * Math.PI / 180;
                    const cos = Math.abs(Math.cos(rotation));
                    const sin = Math.abs(Math.sin(rotation));
                    
                    const newWidth = img.width * cos + img.height * sin;
                    const newHeight = img.width * sin + img.height * cos;
                    
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    
                    // Apply all transformations
                    ctx.translate(newWidth / 2, newHeight / 2);
                    
                    // Apply rotation
                    if (metadata.rotation) {
                        ctx.rotate(rotation);
                    }
                    
                    // Apply flips
                    if (metadata.flipHorizontal || metadata.flipVertical) {
                        ctx.scale(
                            metadata.flipHorizontal ? -1 : 1,
                            metadata.flipVertical ? -1 : 1
                        );
                    }
                    
                    // Apply brightness and contrast using global composite operations
                    if (metadata.brightness !== 0 || metadata.contrast !== 0) {
                        // Create temporary canvas for filter effects
                        const tempCanvas = document.createElement('canvas');
                        const tempCtx = tempCanvas.getContext('2d');
                        tempCanvas.width = img.width;
                        tempCanvas.height = img.height;
                        
                        // Draw image to temp canvas
                        tempCtx.drawImage(img, 0, 0);
                        
                        // Apply brightness/contrast adjustments
                        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
                        const data = imageData.data;
                        
                        const brightnessAdjust = metadata.brightness * 2.55; // Convert to 0-255 range
                        const contrastAdjust = (metadata.contrast + 100) / 100; // Convert to multiplier
                        
                        for (let i = 0; i < data.length; i += 4) {
                            // Apply contrast first, then brightness
                            data[i] = Math.max(0, Math.min(255, (data[i] - 128) * contrastAdjust + 128 + brightnessAdjust));     // Red
                            data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - 128) * contrastAdjust + 128 + brightnessAdjust)); // Green
                            data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - 128) * contrastAdjust + 128 + brightnessAdjust)); // Blue
                            // Alpha channel (i + 3) remains unchanged
                        }
                        
                        tempCtx.putImageData(imageData, 0, 0);
                        ctx.drawImage(tempCanvas, -img.width / 2, -img.height / 2);
                    } else {
                        // Apply crop if exists
                        if (metadata.cropArea) {
                            const sourceX = (metadata.cropArea.x / 100) * img.width;
                            const sourceY = (metadata.cropArea.y / 100) * img.height;
                            const sourceWidth = (metadata.cropArea.width / 100) * img.width;
                            const sourceHeight = (metadata.cropArea.height / 100) * img.height;
                            
                            ctx.drawImage(
                                img,
                                sourceX, sourceY, sourceWidth, sourceHeight, // source crop
                                -img.width / 2, -img.height / 2, img.width, img.height // destination
                            );
                        } else {
                            ctx.drawImage(img, -img.width / 2, -img.height / 2);
                        }
                    }
                    
                    resolve({
                        dataUrl: canvas.toDataURL('image/jpeg', 0.85),
                        width: newWidth,
                        height: newHeight,
                        originalWidth: img.width,
                        originalHeight: img.height,
                        rotation: metadata.rotation,
                        fitMode: metadata.fitMode,
                        brightness: metadata.brightness,
                        contrast: metadata.contrast,
                        flipHorizontal: metadata.flipHorizontal,
                        flipVertical: metadata.flipVertical
                    });
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }
    
    calculateImageDimensions(imageData, maxWidth, maxHeight) {
        let width = imageData.width;
        let height = imageData.height;
        
        // Convert pixels to mm (approximate conversion: 96 DPI = 1 inch = 25.4 mm)
        const pixelToMM = 25.4 / 96;
        width *= pixelToMM;
        height *= pixelToMM;
        
        console.log(`Image: ${width.toFixed(1)}×${height.toFixed(1)}mm, Page: ${maxWidth}×${maxHeight}mm, Mode: ${imageData.fitMode}`);
        
        // Apply fit mode
        switch (imageData.fitMode) {
            case 'fill':
                // Fill the entire page, may crop - use the larger ratio
                const fillRatio = Math.max(maxWidth / width, maxHeight / height);
                const fillResult = {
                    width: width * fillRatio,
                    height: height * fillRatio
                };
                console.log(`Fill mode result: ${fillResult.width.toFixed(1)}×${fillResult.height.toFixed(1)}mm`);
                return fillResult;
                
            case 'original':
                // Keep original size in mm, but clamp to page if too big
                const clampedWidth = Math.min(width, maxWidth);
                const clampedHeight = Math.min(height, maxHeight);
                console.log(`Original mode result: ${clampedWidth.toFixed(1)}×${clampedHeight.toFixed(1)}mm`);
                return {
                    width: clampedWidth,
                    height: clampedHeight
                };
                
            case 'fit':
            default:
                // Fit to page maintaining aspect ratio - use the smaller ratio
                const fitRatio = Math.min(maxWidth / width, maxHeight / height);
                const fitResult = {
                    width: width * fitRatio,
                    height: height * fitRatio
                };
                console.log(`Fit mode result: ${fitResult.width.toFixed(1)}×${fitResult.height.toFixed(1)}mm`);
                return fitResult;
        }
    }
    
    // Drag and Drop Reordering Methods (for file items)
    handleItemDragStart(e) {
        const item = e.target.closest('.file-item');
        this.draggedIndex = parseInt(item.dataset.index);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.draggedIndex.toString());
        console.log('Drag started for index:', this.draggedIndex);
    }
    
    handleItemDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    
    handleItemDragEnter(e) {
        e.preventDefault();
        const item = e.target.closest('.file-item');
        if (item && !item.classList.contains('dragging')) {
            item.classList.add('drag-over');
        }
    }
    
    handleItemDragLeave(e) {
        const item = e.target.closest('.file-item');
        if (item) {
            item.classList.remove('drag-over');
        }
    }
    
    handleItemDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const item = e.target.closest('.file-item');
        if (item && !item.classList.contains('dragging')) {
            const dropIndex = parseInt(item.dataset.index);
            console.log('Drop on index:', dropIndex, 'from index:', this.draggedIndex);
            this.reorderFiles(this.draggedIndex, dropIndex);
        }
        
        // Clean up all drag states
        document.querySelectorAll('.file-item').forEach(fileItem => {
            fileItem.classList.remove('drag-over');
        });
    }
    
    handleItemDragEnd(e) {
        const item = e.target.closest('.file-item');
        if (item) {
            item.classList.remove('dragging');
        }
        document.querySelectorAll('.file-item').forEach(fileItem => {
            fileItem.classList.remove('drag-over');
        });
        console.log('Drag ended');
    }
    
    reorderFiles(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        
        console.log(`Reordering: moving file from position ${fromIndex} to position ${toIndex}`);
        console.log('Before reorder:', this.selectedFiles.map(f => f.name));
        
        // Move the file in the array
        const movedFile = this.selectedFiles.splice(fromIndex, 1)[0];
        this.selectedFiles.splice(toIndex, 0, movedFile);
        
        console.log('After reorder:', this.selectedFiles.map(f => f.name));
        
        // Update the UI
        this.updateUI();
    }
    
    // Image Editing Methods
    rotateImage(index, degrees) {
        const file = this.selectedFiles[index];
        const metadata = this.fileMetadata.get(file);
        if (metadata) {
            metadata.rotation = (metadata.rotation + degrees) % 360;
            if (metadata.rotation < 0) metadata.rotation += 360;
            
            console.log(`Rotated ${file.name} by ${degrees}°, total rotation: ${metadata.rotation}°`);
            
            // Update the preview
            const fileItem = document.querySelector(`[data-index="${index}"]`);
            if (fileItem) {
                this.updateImagePreview(fileItem, file);
            }
        }
    }
    
    changeFitMode(index, fitMode) {
        const file = this.selectedFiles[index];
        const metadata = this.fileMetadata.get(file);
        if (metadata) {
            metadata.fitMode = fitMode;
            console.log(`Changed fit mode for ${file.name} to: ${fitMode}`);
        }
    }
    
    rotateAllImages(degrees) {
        this.selectedFiles.forEach((file, index) => {
            this.rotateImage(index, degrees);
        });
        console.log(`Rotated all images by ${degrees}°`);
    }
    
    changeAllFitModes(fitMode) {
        if (!fitMode) return;
        
        this.selectedFiles.forEach((file, index) => {
            this.changeFitMode(index, fitMode);
        });
        
        // Update UI to reflect changes
        this.updateUI();
        console.log(`Changed all fit modes to: ${fitMode}`);
    }
    
    updateImagePreview(item, file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = item.querySelector('.file-preview');
            const metadata = this.fileMetadata.get(file) || { 
                rotation: 0, 
                brightness: 0, 
                contrast: 0, 
                flipHorizontal: false, 
                flipVertical: false 
            };
            
            // Build CSS filter string
            let filters = [];
            if (metadata.brightness !== 0) {
                filters.push(`brightness(${100 + metadata.brightness}%)`);
            }
            if (metadata.contrast !== 0) {
                filters.push(`contrast(${100 + metadata.contrast}%)`);
            }
            
            // Build transform string
            let transforms = [];
            if (metadata.rotation !== 0) {
                transforms.push(`rotate(${metadata.rotation}deg)`);
            }
            if (metadata.flipHorizontal) {
                transforms.push('scaleX(-1)');
            }
            if (metadata.flipVertical) {
                transforms.push('scaleY(-1)');
            }
            
            const filterStyle = filters.length > 0 ? `filter: ${filters.join(' ')};` : '';
            const transformStyle = transforms.length > 0 ? `transform: ${transforms.join(' ')};` : '';
            
            preview.innerHTML = `<img src="${e.target.result}" alt="${file.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; ${filterStyle} ${transformStyle} transition: all 0.3s ease;">`;
        };
        reader.readAsDataURL(file);
    }
    
    // Advanced Image Editor Methods
    openImageEditor(index) {
        this.currentEditingIndex = index;
        this.currentEditingFile = this.selectedFiles[index];
        this.currentEditingMetadata = { ...this.fileMetadata.get(this.currentEditingFile) };
        
        const modal = document.getElementById('imageEditorModal');
        const filename = document.getElementById('editorFilename');
        const canvas = document.getElementById('editorCanvas');
        const ctx = canvas.getContext('2d');
        
        // Set filename
        filename.textContent = this.currentEditingFile.name;
        
        // Load and display image
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Size canvas appropriately
                const maxWidth = 500;
                const maxHeight = 400;
                const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
                
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                
                this.renderEditorCanvas();
            };
            img.src = e.target.result;
            this.originalImage = img;
        };
        reader.readAsDataURL(this.currentEditingFile);
        
        // Set control values
        this.updateEditorControls();
        
        // Initialize cropping state
        this.cropMode = false;
        this.isDragging = false;
        this.dragStart = null;
        this.cropSelection = null;
        
        // Show modal
        modal.style.display = 'flex';
    }
    
    renderEditorCanvas() {
        const canvas = document.getElementById('editorCanvas');
        const ctx = canvas.getContext('2d');
        const metadata = this.currentEditingMetadata;
        
        // Update page info
        this.updatePageInfo();
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Save context for transformations
        ctx.save();
        
        // Move to center for rotations and flips
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        // Apply rotation
        if (metadata.rotation) {
            ctx.rotate((metadata.rotation * Math.PI) / 180);
        }
        
        // Apply flips
        if (metadata.flipHorizontal || metadata.flipVertical) {
            ctx.scale(
                metadata.flipHorizontal ? -1 : 1,
                metadata.flipVertical ? -1 : 1
            );
        }
        
        // Apply crop if exists
        let drawWidth = canvas.width;
        let drawHeight = canvas.height;
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = this.originalImage.width;
        let sourceHeight = this.originalImage.height;
        
        if (metadata.cropArea) {
            // Calculate crop area in original image pixels
            sourceX = (metadata.cropArea.x / 100) * this.originalImage.width;
            sourceY = (metadata.cropArea.y / 100) * this.originalImage.height;
            sourceWidth = (metadata.cropArea.width / 100) * this.originalImage.width;
            sourceHeight = (metadata.cropArea.height / 100) * this.originalImage.height;
        }
        
        // Draw image (cropped if crop area exists)
        ctx.drawImage(
            this.originalImage,
            sourceX, sourceY, sourceWidth, sourceHeight, // source crop
            -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight // destination
        );
        
        // Restore context
        ctx.restore();
        
        // Apply brightness and contrast using CSS filters on canvas
        let filters = [];
        if (metadata.brightness !== 0) {
            filters.push(`brightness(${100 + metadata.brightness}%)`);
        }
        if (metadata.contrast !== 0) {
            filters.push(`contrast(${100 + metadata.contrast}%)`);
        }
        canvas.style.filter = filters.join(' ');
        
        // Update crop overlay if in crop mode
        if (this.cropMode) {
            this.updateCropOverlay();
        }
    }
    
    updatePageInfo() {
        const pageSize = document.getElementById('pageSize');
        const imageDimensions = document.getElementById('imageDimensions');
        const fitInfo = document.getElementById('fitInfo');
        const metadata = this.currentEditingMetadata;
        
        // Get current PDF settings for page info
        const pdfSettings = this.getPdfSettings();
        const orientation = pdfSettings.orientation === 'landscape' ? 'Landscape' : 'Portrait';
        const size = pdfSettings.pageSize.toUpperCase();
        
        pageSize.textContent = `${size} ${orientation}`;
        
        if (this.originalImage) {
            const width = this.originalImage.width;
            const height = this.originalImage.height;
            imageDimensions.textContent = `${width} × ${height}px`;
            
            // Calculate how image will fit on page
            const pageWidth = size === 'A4' ? (orientation === 'Portrait' ? 210 : 297) : (orientation === 'Portrait' ? 216 : 279);
            const pageHeight = size === 'A4' ? (orientation === 'Portrait' ? 297 : 210) : (orientation === 'Portrait' ? 279 : 216);
            const margin = 40; // 20mm each side
            
            const pixelToMM = 25.4 / 96;
            const imgWidthMM = width * pixelToMM;
            const imgHeightMM = height * pixelToMM;
            
            const availableWidth = pageWidth - margin;
            const availableHeight = pageHeight - margin;
            
            let fitDescription = '';
            switch (metadata.fitMode) {
                case 'fit':
                    const scale = Math.min(availableWidth / imgWidthMM, availableHeight / imgHeightMM, 1);
                    fitDescription = `Fit (${Math.round(scale * 100)}%)`;
                    break;
                case 'fill':
                    const fillScale = Math.max(availableWidth / imgWidthMM, availableHeight / imgHeightMM);
                    fitDescription = `Fill (${Math.round(fillScale * 100)}%)`;
                    break;
                case 'original':
                    fitDescription = 'Original Size';
                    break;
            }
            
            if (metadata.cropArea) {
                const cropW = Math.round(width * metadata.cropArea.width / 100);
                const cropH = Math.round(height * metadata.cropArea.height / 100);
                fitDescription += ` | Crop: ${cropW}×${cropH}px`;
            }
            
            fitInfo.textContent = fitDescription;
        }
    }
    
    updateEditorControls() {
        const metadata = this.currentEditingMetadata;
        
        document.getElementById('brightnessSlider').value = metadata.brightness;
        document.getElementById('brightnessValue').textContent = metadata.brightness;
        document.getElementById('contrastSlider').value = metadata.contrast;
        document.getElementById('contrastValue').textContent = metadata.contrast;
        document.getElementById('editorFitMode').value = metadata.fitMode;
    }
    
    editorRotate(degrees) {
        this.currentEditingMetadata.rotation = (this.currentEditingMetadata.rotation + degrees) % 360;
        if (this.currentEditingMetadata.rotation < 0) {
            this.currentEditingMetadata.rotation += 360;
        }
        this.renderEditorCanvas();
    }
    
    editorFlip(direction) {
        if (direction === 'horizontal') {
            this.currentEditingMetadata.flipHorizontal = !this.currentEditingMetadata.flipHorizontal;
        } else if (direction === 'vertical') {
            this.currentEditingMetadata.flipVertical = !this.currentEditingMetadata.flipVertical;
        }
        this.renderEditorCanvas();
    }
    
    editorAdjustBrightness(value) {
        this.currentEditingMetadata.brightness = parseInt(value);
        document.getElementById('brightnessValue').textContent = value;
        this.renderEditorCanvas();
    }
    
    editorAdjustContrast(value) {
        this.currentEditingMetadata.contrast = parseInt(value);
        document.getElementById('contrastValue').textContent = value;
        this.renderEditorCanvas();
    }
    
    editorChangeFitMode(fitMode) {
        this.currentEditingMetadata.fitMode = fitMode;
    }
    
    editorReset() {
        this.currentEditingMetadata = {
            rotation: 0,
            fitMode: 'fit',
            brightness: 0,
            contrast: 0,
            flipHorizontal: false,
            flipVertical: false,
            cropArea: null
        };
        this.updateEditorControls();
        this.renderEditorCanvas();
    }
    
    applyImageEdits() {
        // Apply the current editing metadata to the file
        this.fileMetadata.set(this.currentEditingFile, { ...this.currentEditingMetadata });
        
        // Update the thumbnail preview
        const fileItem = document.querySelector(`[data-index="${this.currentEditingIndex}"]`);
        if (fileItem) {
            this.updateImagePreview(fileItem, this.currentEditingFile);
        }
        
        // Update the fit mode dropdown in the thumbnail
        const fitSelect = fileItem?.querySelector('.fit-select');
        if (fitSelect) {
            fitSelect.value = this.currentEditingMetadata.fitMode;
        }
        
        this.closeImageEditor();
        
        console.log('Applied edits:', this.currentEditingMetadata);
    }
    
    // Cropping Methods
    enableCropMode() {
        this.cropMode = true;
        const overlay = document.getElementById('cropOverlay');
        const precisionControls = document.getElementById('precisionControls');
        
        overlay.style.display = 'block';
        precisionControls.style.display = 'block';
        
        // Initialize crop selection if none exists
        if (!this.currentEditingMetadata.cropArea) {
            this.currentEditingMetadata.cropArea = {
                x: 25, y: 25, width: 50, height: 50
            };
        }
        
        this.setupCropEvents();
        this.updateCropOverlay();
        this.updateCropInputs();
        
        console.log('Crop mode enabled');
        
        // Show helpful instructions
        this.showCropInstructions();
    }
    
    resetCrop() {
        this.currentEditingMetadata.cropArea = null;
        this.cropMode = false;
        
        const overlay = document.getElementById('cropOverlay');
        const precisionControls = document.getElementById('precisionControls');
        
        overlay.style.display = 'none';
        precisionControls.style.display = 'none';
        
        this.renderEditorCanvas();
        console.log('Crop reset');
    }
    
    applyCropRatio(widthRatio, heightRatio) {
        if (!this.cropMode) {
            this.enableCropMode();
        }
        
        // Calculate crop area maintaining the specified ratio
        const canvasRect = document.getElementById('editorCanvas').getBoundingClientRect();
        const centerX = 50;
        const centerY = 50;
        
        // Start with 60% of image for good visibility
        let width = 60;
        let height = (width * heightRatio) / widthRatio;
        
        // Adjust if height too large
        if (height > 80) {
            height = 80;
            width = (height * widthRatio) / heightRatio;
        }
        
        this.currentEditingMetadata.cropArea = {
            x: centerX - width / 2,
            y: centerY - height / 2,
            width: width,
            height: height
        };
        
        this.updateCropOverlay();
        this.updateCropInputs();
        this.renderEditorCanvas();
        
        console.log(`Applied ${widthRatio}:${heightRatio} crop ratio`);
    }
    
    updateCropFromInputs() {
        const x = parseInt(document.getElementById('cropX').value);
        const y = parseInt(document.getElementById('cropY').value);
        const width = parseInt(document.getElementById('cropWidth').value);
        const height = parseInt(document.getElementById('cropHeight').value);
        
        // Convert pixel values to percentages
        const imgWidth = this.originalImage.width;
        const imgHeight = this.originalImage.height;
        
        this.currentEditingMetadata.cropArea = {
            x: (x / imgWidth) * 100,
            y: (y / imgHeight) * 100,
            width: (width / imgWidth) * 100,
            height: (height / imgHeight) * 100
        };
        
        this.updateCropOverlay();
        this.renderEditorCanvas();
    }
    
    updateCropInputs() {
        if (!this.currentEditingMetadata.cropArea) return;
        
        const crop = this.currentEditingMetadata.cropArea;
        const imgWidth = this.originalImage.width;
        const imgHeight = this.originalImage.height;
        
        document.getElementById('cropX').value = Math.round((crop.x / 100) * imgWidth);
        document.getElementById('cropY').value = Math.round((crop.y / 100) * imgHeight);
        document.getElementById('cropWidth').value = Math.round((crop.width / 100) * imgWidth);
        document.getElementById('cropHeight').value = Math.round((crop.height / 100) * imgHeight);
        
        // Update max values
        document.getElementById('cropX').max = imgWidth;
        document.getElementById('cropY').max = imgHeight;
        document.getElementById('cropWidth').max = imgWidth;
        document.getElementById('cropHeight').max = imgHeight;
    }
    
    updateCropOverlay() {
        if (!this.currentEditingMetadata.cropArea) return;
        
        const selection = document.getElementById('cropSelection');
        const overlay = document.getElementById('cropOverlay');
        const crop = this.currentEditingMetadata.cropArea;
        
        // Position crop selection within overlay
        selection.style.left = crop.x + '%';
        selection.style.top = crop.y + '%';
        selection.style.width = crop.width + '%';
        selection.style.height = crop.height + '%';
    }
    
    setupCropEvents() {
        const overlay = document.getElementById('cropOverlay');
        const selection = document.getElementById('cropSelection');
        
        // Store bound methods for removal
        this.boundCropMouseDown = this.cropMouseDown.bind(this);
        this.boundCropMouseMove = this.cropMouseMove.bind(this);
        this.boundCropMouseUp = this.cropMouseUp.bind(this);
        
        // Remove existing listeners
        overlay.removeEventListener('mousedown', this.boundCropMouseDown);
        document.removeEventListener('mousemove', this.boundCropMouseMove);
        document.removeEventListener('mouseup', this.boundCropMouseUp);
        
        // Add event listeners
        overlay.addEventListener('mousedown', this.boundCropMouseDown);
        document.addEventListener('mousemove', this.boundCropMouseMove);
        document.addEventListener('mouseup', this.boundCropMouseUp);
        
        // Initialize crop state
        this.cropDragging = false;
        this.cropResizing = false;
        this.cropHandle = null;
        this.cropStartX = 0;
        this.cropStartY = 0;
        this.cropStartCrop = null;
    }
    
    cropMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const overlay = document.getElementById('cropOverlay');
        const selection = document.getElementById('cropSelection');
        const rect = overlay.getBoundingClientRect();
        
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        this.cropStartX = x;
        this.cropStartY = y;
        this.cropStartCrop = { ...this.currentEditingMetadata.cropArea };
        
        if (e.target.classList.contains('crop-handle')) {
            // Resize mode
            this.cropResizing = true;
            this.cropHandle = e.target.className.split(' ').find(c => c.startsWith('crop-') && c !== 'crop-handle');
            console.log('Start resize with handle:', this.cropHandle);
        } else if (e.target === selection) {
            // Move mode
            this.cropDragging = true;
            console.log('Start drag move');
        } else {
            // New selection
            this.currentEditingMetadata.cropArea = {
                x: x,
                y: y,
                width: 0,
                height: 0
            };
            this.cropResizing = true;
            this.cropHandle = 'crop-se'; // Default to bottom-right handle
            console.log('Start new selection');
        }
    }
    
    cropMouseMove(e) {
        if (!this.cropDragging && !this.cropResizing) return;
        
        e.preventDefault();
        
        const overlay = document.getElementById('cropOverlay');
        const rect = overlay.getBoundingClientRect();
        
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        const deltaX = x - this.cropStartX;
        const deltaY = y - this.cropStartY;
        
        if (this.cropDragging) {
            // Move the entire selection
            const newX = Math.max(0, Math.min(100 - this.cropStartCrop.width, this.cropStartCrop.x + deltaX));
            const newY = Math.max(0, Math.min(100 - this.cropStartCrop.height, this.cropStartCrop.y + deltaY));
            
            this.currentEditingMetadata.cropArea.x = newX;
            this.currentEditingMetadata.cropArea.y = newY;
        } else if (this.cropResizing) {
            // Resize the selection based on handle
            this.resizeCropArea(deltaX, deltaY);
        }
        
        this.updateCropOverlay();
        this.updateCropInputs();
        this.renderEditorCanvas();
    }
    
    cropMouseUp(e) {
        if (this.cropDragging || this.cropResizing) {
            console.log('Crop operation finished');
        }
        
        this.cropDragging = false;
        this.cropResizing = false;
        this.cropHandle = null;
    }
    
    resizeCropArea(deltaX, deltaY) {
        const crop = this.currentEditingMetadata.cropArea;
        const start = this.cropStartCrop;
        
        switch (this.cropHandle) {
            case 'crop-nw': // Top-left
                crop.x = Math.max(0, start.x + deltaX);
                crop.y = Math.max(0, start.y + deltaY);
                crop.width = Math.max(5, start.width - deltaX);
                crop.height = Math.max(5, start.height - deltaY);
                break;
                
            case 'crop-ne': // Top-right
                crop.y = Math.max(0, start.y + deltaY);
                crop.width = Math.max(5, Math.min(100 - start.x, start.width + deltaX));
                crop.height = Math.max(5, start.height - deltaY);
                break;
                
            case 'crop-sw': // Bottom-left
                crop.x = Math.max(0, start.x + deltaX);
                crop.width = Math.max(5, start.width - deltaX);
                crop.height = Math.max(5, Math.min(100 - start.y, start.height + deltaY));
                break;
                
            case 'crop-se': // Bottom-right
                crop.width = Math.max(5, Math.min(100 - start.x, start.width + deltaX));
                crop.height = Math.max(5, Math.min(100 - start.y, start.height + deltaY));
                break;
                
            case 'crop-n': // Top edge
                crop.y = Math.max(0, start.y + deltaY);
                crop.height = Math.max(5, start.height - deltaY);
                break;
                
            case 'crop-s': // Bottom edge
                crop.height = Math.max(5, Math.min(100 - start.y, start.height + deltaY));
                break;
                
            case 'crop-w': // Left edge
                crop.x = Math.max(0, start.x + deltaX);
                crop.width = Math.max(5, start.width - deltaX);
                break;
                
            case 'crop-e': // Right edge
                crop.width = Math.max(5, Math.min(100 - start.x, start.width + deltaX));
                break;
        }
        
        // Ensure crop stays within bounds
        crop.x = Math.max(0, Math.min(100 - crop.width, crop.x));
        crop.y = Math.max(0, Math.min(100 - crop.height, crop.y));
        crop.width = Math.min(100 - crop.x, crop.width);
        crop.height = Math.min(100 - crop.y, crop.height);
    }
    
    openBatchCropEditor() {
        // Simple batch crop implementation
        const cropRatio = prompt('Enter crop ratio (e.g., "16:9", "4:3", "1:1") or leave empty for current crops:');
        
        if (cropRatio === null) return; // User cancelled
        
        if (cropRatio.trim() === '') {
            // Apply current image's crop to all
            const currentCrop = this.fileMetadata.get(this.selectedFiles[this.currentEditingIndex])?.cropArea;
            if (currentCrop) {
                this.selectedFiles.forEach(file => {
                    const metadata = this.fileMetadata.get(file);
                    if (metadata) {
                        metadata.cropArea = { ...currentCrop };
                    }
                });
                alert(`Applied current crop to ${this.selectedFiles.length} images`);
            } else {
                alert('No crop area to apply');
            }
        } else {
            // Parse and apply ratio
            const parts = cropRatio.split(':');
            if (parts.length === 2) {
                const w = parseFloat(parts[0]);
                const h = parseFloat(parts[1]);
                
                if (!isNaN(w) && !isNaN(h)) {
                    this.selectedFiles.forEach(file => {
                        const metadata = this.fileMetadata.get(file);
                        if (metadata) {
                            // Apply ratio crop (centered, 60% of image)
                            const width = 60;
                            const height = (width * h) / w;
                            
                            metadata.cropArea = {
                                x: 50 - width / 2,
                                y: 50 - height / 2,
                                width: Math.min(width, 80),
                                height: Math.min(height, 80)
                            };
                        }
                    });
                    alert(`Applied ${cropRatio} crop ratio to ${this.selectedFiles.length} images`);
                    
                    // Update UI
                    this.updateUI();
                } else {
                    alert('Invalid ratio format. Use format like "16:9"');
                }
            } else {
                alert('Invalid ratio format. Use format like "16:9"');
            }
        }
    }
    
    closeImageEditor() {
        const modal = document.getElementById('imageEditorModal');
        modal.style.display = 'none';
        
        // Clean up cropping state
        this.cropMode = false;
        const overlay = document.getElementById('cropOverlay');
        overlay.style.display = 'none';
        
        // Remove event listeners
        if (this.boundCropMouseDown) {
            overlay.removeEventListener('mousedown', this.boundCropMouseDown);
            document.removeEventListener('mousemove', this.boundCropMouseMove);
            document.removeEventListener('mouseup', this.boundCropMouseUp);
        }
        
        // Clean up
        this.currentEditingIndex = null;
        this.currentEditingFile = null;
        this.currentEditingMetadata = null;
        this.originalImage = null;
    }
    
    showCropInstructions() {
        // Simple instructions that disappear after a few seconds
        const existingTooltip = document.querySelector('.crop-instructions');
        if (existingTooltip) existingTooltip.remove();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'crop-instructions';
        tooltip.innerHTML = `
            <strong>Crop Tool Active</strong><br>
            • Click and drag to create new crop area<br>
            • Drag corners/edges to resize<br>
            • Drag center to move<br>
            • Use precision controls for exact values
        `;
        tooltip.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 12px;
            border-radius: 6px;
            font-size: 0.9rem;
            line-height: 1.4;
            z-index: 1001;
            max-width: 250px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(tooltip);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.remove();
            }
        }, 5000);
    }
    
    getPdfSettings() {
        const pageSize = document.getElementById('pageSize')?.value || 'a4';
        const orientation = document.getElementById('orientation')?.value || 'portrait';
        
        return { pageSize, orientation };
    }
    
    showProgress(message) {
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');
        
        progressText.textContent = message;
        progressFill.style.width = '0%';
        this.progressSection.style.display = 'block';
        this.convertBtn.disabled = true;
    }
    
    hideProgress() {
        this.progressSection.style.display = 'none';
        this.convertBtn.disabled = false;
    }
    
    showDetailedProgress(totalFiles) {
        // Create detailed progress display
        let detailsContainer = document.getElementById('progressDetails');
        if (!detailsContainer) {
            detailsContainer = document.createElement('div');
            detailsContainer.id = 'progressDetails';
            detailsContainer.className = 'progress-details';
            this.progressSection.appendChild(detailsContainer);
        }
        
        detailsContainer.innerHTML = `
            <div class="progress-stats">
                <div class="stat">
                    <span class="stat-label">Images:</span>
                    <span class="stat-value" id="progressCount">0 / ${totalFiles}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Time:</span>
                    <span class="stat-value" id="progressTime">0s</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Current:</span>
                    <span class="stat-value" id="progressCurrent">Starting...</span>
                </div>
            </div>
            <div class="progress-performance">
                <small id="progressMemory">Memory: Optimized</small>
            </div>
        `;
    }
    
    updateDetailedProgress(current, total, fileName, startTime) {
        const countElement = document.getElementById('progressCount');
        const timeElement = document.getElementById('progressTime');
        const currentElement = document.getElementById('progressCurrent');
        const memoryElement = document.getElementById('progressMemory');
        
        if (countElement) countElement.textContent = `${current} / ${total}`;
        
        if (timeElement) {
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            const remaining = total > current ? Math.round((elapsed / current) * (total - current)) : 0;
            timeElement.textContent = `${elapsed}s (${remaining}s left)`;
        }
        
        if (currentElement) {
            const shortName = fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName;
            currentElement.textContent = shortName;
        }
        
        if (memoryElement && performance.memory) {
            const used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            const limit = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
            memoryElement.textContent = `Memory: ${used}MB / ${limit}MB`;
        }
    }
    
    hideDetailedProgress() {
        const detailsContainer = document.getElementById('progressDetails');
        if (detailsContainer) {
            detailsContainer.remove();
        }
    }
    
    showSuccess(message) {
        // Enhanced success message with better feedback
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <div class="success-content">
                <span class="success-icon">✅</span>
                <span class="success-text">${message}</span>
            </div>
        `;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            font-weight: 500;
            max-width: 300px;
        `;
        
        document.body.appendChild(successDiv);
        
        // Remove after 4 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 4000);
    }
}

// ========================================
// App Initialization
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme manager
    window.themeManager = new ThemeManager();
    
    // Initialize file manager
    window.fileManager = new FileManager();
    
    console.log('I HATE PDF - Step 1 Complete! 🎉');
    console.log('✅ Black & white theme with toggle');
    console.log('✅ Responsive layout');
    console.log('✅ File drop zone with drag & drop');
    console.log('✅ File preview system');
    console.log('Next: Step 2 - Actual PDF conversion');
});
