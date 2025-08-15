# I HATE PDF

Fast, reliable, and free PDF converter with a sleek black & white theme. Convert images and documents to PDF with advanced editing capabilities.

**A small project made by KISHOR** ❤️

## 🚀 Features

### ✅ Currently Available (Steps 1-6)
- **Image to PDF Conversion** (Client-side)
  - JPG, PNG, GIF, WEBP support
  - Batch processing (up to 100 files, 500MB total)
  - Advanced image editing: rotation, brightness, contrast, flips
  - Professional cropping tool with pixel-level precision
  - Multiple fit modes: fit, fill, original
  - Real-time preview with PDF page boundaries

- **Performance & UX**
  - Chunked processing for large batches
  - Memory optimization (50MB per file limit)
  - Non-blocking UI with detailed progress tracking
  - Enhanced error handling and user feedback
  - Responsive design for all devices

- **Backend Foundation** (Step 6)
  - Node.js/Express server for document processing
  - File upload with validation and security
  - Automatic cleanup and rate limiting
  - Health monitoring and error handling

### 🔄 Coming Soon (Steps 7-12)
- **Document Conversion** (DOCX, PPTX, XLSX → PDF)
- **Server-side Image Processing** (Optional)
- **Enhanced Security & Privacy**
- **UI Polish & Accessibility**
- **Deployment & Docker Support**

## 🛠️ Quick Start

### Frontend Only (Images)
```bash
# Serve frontend files
python -m http.server 8000
# Open http://localhost:8000
```

### Full Stack (Images + Documents)
```bash
# Install dependencies
npm install

# Start the backend server
npm start
# Server runs on http://localhost:3000
# Frontend auto-served at same URL
```

### Development Mode
```bash
# With auto-restart
npm run dev
```

## 📁 Project Structure

```
I-HATE-PDF/
├── index.html          # Main frontend application
├── styles.css          # Black & white theme + responsive design
├── script.js           # Client-side logic + backend integration
├── server.js           # Express backend for document processing
├── package.json        # Node.js dependencies and scripts
├── temp-uploads/       # Temporary file storage (auto-created)
└── DEVELOPMENT_ROADMAP.md  # Complete development plan
```

## 🎯 Usage

### Image Conversion
1. **Upload**: Drag & drop or click to select images
2. **Edit**: Use individual or batch editing tools
   - Rotate, flip, adjust brightness/contrast
   - Professional cropping with presets
   - Choose fit modes (fit, fill, original)
3. **Convert**: Click "Convert to PDF" for instant processing
4. **Download**: PDF auto-downloads with timestamp

### Document Conversion (Requires Backend)
1. **Start Server**: Run `npm start`
2. **Upload**: Select DOCX, PPTX, XLSX, or TXT files
3. **Convert**: Server processes and returns PDF
4. **Note**: Full conversion coming in Step 7!

## 🔧 Configuration

### File Limits
- **Per File**: 50MB maximum
- **Batch Size**: 500MB total, 100 files maximum
- **Supported Formats**: 
  - Images: JPG, PNG, GIF, WEBP
  - Documents: DOCX, PPTX, XLSX, DOC, PPT, XLS, TXT, RTF

### Server Configuration
```javascript
const PORT = process.env.PORT || 3000;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 20; // Per upload request
```

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes
- **File Type Validation**: MIME type checking
- **Size Limits**: Prevents memory exhaustion
- **Auto Cleanup**: Files deleted after 2 hours
- **CORS Protection**: Configured origins only
- **Helmet Security**: Basic security headers

## 🚀 Performance

### Client-Side Optimizations
- **Chunked Processing**: 2-5 images per chunk
- **Memory Management**: Canvas size optimization
- **Non-blocking UI**: Yields control to browser
- **Progress Tracking**: Real-time stats and ETA

### Server-Side Features
- **Multer Upload**: Efficient file handling
- **Express Static**: Fast frontend serving
- **Automatic Cleanup**: Prevents disk overflow
- **Error Recovery**: Graceful failure handling

## 🎨 Theme

Sleek black & white design with:
- **Light Mode**: White backgrounds, dark text
- **Dark Mode**: Dark backgrounds, light text  
- **Auto Theme**: Syncs with system preferences
- **Persistent**: Choice saved in localStorage

## 📊 Development Progress

- ✅ **Step 1**: Basic drag & drop + image conversion
- ✅ **Step 2**: Multiple images + batch processing  
- ✅ **Step 3**: File management + reordering
- ✅ **Step 4**: Advanced image editing + cropping
- ✅ **Step 5**: Performance optimization + UX polish
- ✅ **Step 6**: Backend foundation + API integration
- 🔄 **Step 7**: Document conversion (LibreOffice)
- ⏳ **Steps 8-12**: Security, polish, deployment

See `DEVELOPMENT_ROADMAP.md` for detailed progress tracking.

## 🤝 Contributing

This is a step-by-step learning project. Each step builds incrementally with thorough testing. See the roadmap for upcoming features and implementation details.

## 📝 License

MIT License - Feel free to use and modify!

---

**Made with ❤️ by KISHOR** | **© 2025 I HATE PDF**