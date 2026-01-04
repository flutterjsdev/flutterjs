class HtmlScripts {
  static String getScripts() => '''
// ============================================================================
// PART 1: Upload Handlers & Core Setup
// ============================================================================

const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const uploadMessage = document.getElementById('uploadMessage');
const analysisPanel = document.getElementById('analysisPanel');
const diagnosticBox = document.getElementById('diagnosticBox');
const progressIndicator = document.getElementById('progressIndicator');
const errorPanel = document.getElementById('errorPanel');
const errorDetails = document.getElementById('errorDetails');
const errorCount = document.getElementById('errorCount');
const analysisContent = document.getElementById('analysisContent');

let analysisLines = [];
let currentLineIndex = 0;
let errorList = [];
let isProcessing = false;
let uploadHandlersSetup = false; // ✅ Guard flag to prevent double setup

// ============================================================================
// SETUP: Upload handlers initialization
// ============================================================================


function setupUploadHandlers() {
    console.log('Setting up upload handlers...');

    // ✅ FIX 1: Prevent duplicate setup
    if (uploadHandlersSetup) {
        console.warn('Upload handlers already setup, skipping...');
        return;
    }
    uploadHandlersSetup = true;

    if (!uploadZone || !fileInput) {
        console.error('Upload zone or file input not found!');
        return;
    }

    // ✅ FIX 2: Single click handler on upload zone (not nested)
    uploadZone.addEventListener('click', (e) => {
        console.log('Upload zone clicked');
        e.preventDefault();
        e.stopPropagation();
        if (!isProcessing) {
            fileInput.click();
        }
    });

    // ✅ FIX 3: Prevent file input click from bubbling up
    fileInput.addEventListener('click', (e) => {
        console.log('File input clicked (internal)');
        e.stopPropagation();
    });

    // ✅ FIX 4: Drag events - combined similar handlers
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('dragend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        console.log('File dropped');
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('dragover');
        const files = e.dataTransfer?.files;
        if (files?.length && !isProcessing) {
            uploadFile(files[0]);
        }
    });

    // ✅ FIX 5: File input change event
    fileInput.addEventListener('change', (e) => {
        console.log('File selected from picker');
        const files = e.target.files;
        if (files?.length && !isProcessing) {
            uploadFile(files[0]);
        }
    });

    console.log('✅ Upload handlers setup complete');
}

// ✅ FIX 6: Call setup only ONCE with proper timing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupUploadHandlers);
} else {
    // Already loaded
    setupUploadHandlers();
}





// ============================================================================
// UPLOAD: File validation and submission (No changes needed)
// ============================================================================

async function uploadFile(file) {
    console.log('uploadFile() called with:', file.name);
    
    // ✅ Prevent duplicate uploads
    if (isProcessing) {
        console.warn('Upload already in progress, ignoring duplicate request');
        return;
    }
    
    isProcessing = true;
    console.log('isProcessing set to TRUE');
    
    const isIRFile = file.name.toLowerCase().endsWith('.ir');
    console.log('File extension check:', isIRFile ? 'OK' : 'FAIL');
    
    if (!isIRFile) {
        const errorMsg = 'Invalid file type. Only .ir files are allowed.';
        console.error(errorMsg);
        showUploadMessage('ERROR: ' + errorMsg, 'error');
        addError('UPLOAD_INVALID_TYPE', errorMsg, { filename: file.name });
        isProcessing = false;
        fileInput.value = '';
        return;
    }
    
    const MAX_SIZE = 100 * 1024 * 1024;
    const isSizeOk = file.size <= MAX_SIZE;
    console.log('File size: ' + (file.size / 1024 / 1024).toFixed(2) + 'MB');
    
    if (!isSizeOk) {
        const errorMsg = 'File too large. Max size: ' + (MAX_SIZE / 1024 / 1024).toFixed(0) + 'MB';
        console.error(errorMsg);
        showUploadMessage('ERROR: ' + errorMsg, 'error');
        addError('UPLOAD_TOO_LARGE', errorMsg, { size: file.size });
        isProcessing = false;
        fileInput.value = '';
        return;
    }
    
    console.log('Uploading file:', file.name, 'Size:', file.size);
    showUploadMessage('Uploading ' + file.name + '...', 'loading');
    errorList = [];
    hideErrorPanel();
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        console.log('FormData created');
        
        console.log('Sending to /api/upload...');
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        console.log('Response status:', res.status);
        
        const contentType = res.headers.get('content-type');
        console.log('Content-Type:', contentType);
        
        let data;
        try {
            data = await res.json();
            console.log('Parsed JSON response');
        } catch (e) {
            console.error('Failed to parse JSON:', e);
            const text = await res.text();
            console.error('Response text:', text.substring(0, 500));
            showUploadMessage('ERROR: Server returned invalid response', 'error');
            addError('UPLOAD_RESPONSE_ERROR', 'Server returned invalid JSON', { response: text.substring(0, 200) });
            isProcessing = false;
            fileInput.value = '';
            return;
        }
        
        if (!res.ok) {
            const errorMsg = data.error || 'Server error: ' + res.status;
            console.error('HTTP Error:', res.status, errorMsg);
            showUploadMessage('ERROR: ' + errorMsg, 'error');
            addError('UPLOAD_HTTP_ERROR', errorMsg, { status: res.status });
            isProcessing = false;
            fileInput.value = '';
            return;
        }
        
        if (!data.success) {
            const errorMsg = data.error || 'Upload failed';
            console.error('Upload failed:', errorMsg);
            showUploadMessage('ERROR: ' + errorMsg, 'error');
            addError('UPLOAD_FAILED', errorMsg, data);
            isProcessing = false;
            fileInput.value = '';
            return;
        }
        
        if (!data.analysis) {
            console.error('No analysis data in response');
            showUploadMessage('ERROR: No analysis data', 'error');
            addError('UPLOAD_NO_ANALYSIS', 'Server did not return analysis', data);
            isProcessing = false;
            fileInput.value = '';
            return;
        }
        
        console.log('Upload successful!');
        console.log('Analysis received:', data.analysis);
        
        showUploadMessage('SUCCESS: Analyzing ' + file.name, 'success');
        startProgressiveAnalysisWithLeftPanel(data.analysis);
        fileInput.value = '';
        
    } catch (e) {
        console.error('Upload exception:', e);
        const errorMsg = 'Upload error: ' + e.message;
        showUploadMessage('ERROR: ' + errorMsg, 'error');
        addError('UPLOAD_EXCEPTION', errorMsg, { message: e.message });
        fileInput.value = '';
    } finally {
        // ✅ Always reset processing flag
        isProcessing = false;
        console.log('isProcessing set to FALSE');
    }
}

// ============================================================================
// MESSAGE & ERROR UTILITIES
// ============================================================================

function showUploadMessage(message, type) {
    uploadMessage.innerHTML = '<div class="message ' + type + '">' +
        (type === 'loading' ? '<div class="spinner"></div>' : '') +
        '<span>' + message + '</span>' +
        '</div>';
    if (type !== 'loading') {
        setTimeout(() => { uploadMessage.innerHTML = ''; }, 5000);
    }
}

function addError(code, message, data) {
    const errorObj = {
        code: code,
        message: message,
        timestamp: new Date().toLocaleTimeString(),
        lineNum: errorList.length + 1,
        data: data
    };
    errorList.push(errorObj);
    showErrorPanel();
}

function showErrorPanel() {
    errorPanel.classList.add('show');
    errorCount.textContent = errorList.length;
    
    errorDetails.innerHTML = errorList.map((err) => {
        return '<div class="error-item">' +
            '<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">' +
            '<span class="error-code">' + err.code + '</span>' +
            '<span style="color: #999; font-size: 10px;">' + err.timestamp + '</span>' +
            '</div>' +
            '<div class="error-message">' + err.message + '</div>' +
            '</div>';
    }).join('');
}

function clearErrorPanel() {
    errorPanel.classList.remove('show');
    errorList = [];
    errorDetails.innerHTML = '';
}

function hideErrorPanel() {
    errorPanel.classList.remove('show');
}

function getStatusIcon(status) {
    switch(status) {
        case 'ok': return '✓';
        case 'error': return '✕';
        case 'warning': return '⚠';
        case 'pending': return '⏳';
        default: return '•';
    }
}
''';
}
