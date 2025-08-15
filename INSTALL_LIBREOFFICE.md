# LibreOffice Installation Guide

To enable document conversion (DOCX, PPTX, XLSX → PDF), you need to install LibreOffice on your system.

## 🪟 Windows Installation

### Option 1: Download from Official Website (Recommended)
1. Go to https://www.libreoffice.org/download/download/
2. Download the Windows version (typically .msi file)
3. Run the installer with admin privileges
4. Choose "Typical" installation
5. Restart your server: `npm start`

### Option 2: Using Chocolatey (if available)
```bash
choco install libreoffice
```

### Option 3: Using Winget (Windows 10/11)
```bash
winget install TheDocumentFoundation.LibreOffice
```

## 🐧 Linux Installation

### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install libreoffice
```

### CentOS/RHEL:
```bash
sudo yum install libreoffice
```

### Arch Linux:
```bash
sudo pacman -S libreoffice-fresh
```

## 🍎 macOS Installation

### Option 1: Download from Official Website
1. Go to https://www.libreoffice.org/download/download/
2. Download the macOS version (.dmg file)
3. Open the DMG and drag LibreOffice to Applications

### Option 2: Using Homebrew
```bash
brew install --cask libreoffice
```

## ✅ Verify Installation

After installation, verify LibreOffice is available:

### Windows:
```bash
"C:\Program Files\LibreOffice\program\soffice.exe" --version
```

### Linux/macOS:
```bash
soffice --version
```

## 🚀 Test Document Conversion

1. Start your server: `npm start`
2. Open http://localhost:3000
3. Upload a DOCX, PPTX, or XLSX file
4. Click "Convert to PDF"
5. Your document should convert and download automatically!

## 🔧 Troubleshooting

### "LibreOffice not found" Error
- Ensure LibreOffice is properly installed
- Try restarting your terminal/command prompt
- On Windows, the server will automatically try common installation paths

### Conversion Timeout
- Large files may take longer to convert
- Current timeout is 30 seconds per file
- Try with a smaller test file first

### Permission Issues
- Ensure LibreOffice has permission to read/write temporary files
- On Linux/macOS, you may need to run: `chmod +x /usr/bin/soffice`

## 📁 Supported Formats

**Input Formats:**
- DOCX (Word Documents)
- PPTX (PowerPoint Presentations)  
- XLSX (Excel Spreadsheets)
- DOC (Legacy Word)
- PPT (Legacy PowerPoint)
- XLS (Legacy Excel)
- TXT (Plain Text)
- RTF (Rich Text Format)

**Output Format:**
- PDF (Portable Document Format)

## 🎯 How It Works

1. **Upload**: Files uploaded to `temp-uploads/` directory
2. **Convert**: LibreOffice converts documents to PDF using `soffice --headless`
3. **Download**: Converted PDFs saved to `temp-converted/` and sent to browser
4. **Cleanup**: Files automatically deleted after download or 2 hours

---

**Need help?** Check the server console for detailed conversion logs and error messages.
