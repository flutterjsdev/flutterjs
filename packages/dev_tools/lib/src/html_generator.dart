class HtmlGenerator {

  static String generate() => '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Binary IR Viewer - Progressive Analysis</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #1a1a2e;
            color: #e0e0e0;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(90deg, #0d47a1, #1565c0);
            padding: 16px 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            border-bottom: 2px solid #0d47a1;
        }
        .header h1 { font-size: 22px; margin-bottom: 4px; }
        .header p { font-size: 12px; color: #b3e5fc; }
        
        .main-container {
            display: flex;
            flex: 1;
            overflow: hidden;
            gap: 0;
        }
        
        .section-left {
            width: 32%;
            background: #252535;
            border-right: 2px solid #3f3f52;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 2px 0 8px rgba(0,0,0,0.3);
        }
        
        .section-right {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: #1e1e2e;
        }
        
        .panel-header {
            padding: 12px 16px;
            background: #2d2d40;
            border-bottom: 2px solid #3f3f52;
            font-weight: bold;
            color: #42a5f5;
            font-size: 13px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .progress-indicator {
            font-size: 11px;
            color: #999;
        }
        
        .panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }
        
        .upload-zone {
            border: 2px dashed #2196F3;
            border-radius: 8px;
            padding: 24px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 20px;
            background: #2d2d40;
        }
        .upload-zone:hover { 
            border-color: #42a5f5;
            background: #353550;
        }
        .upload-zone.dragover {
            background: #2196F3;
            border-color: #1565c0;
            color: white;
        }
        
        input[type="file"] { display: none; }
        
        .message {
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 15px;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .message.success {
            background: #1b5e20;
            color: #c8e6c9;
            border-left: 3px solid #4caf50;
        }
        .message.error {
            background: #b71c1c;
            color: #ffcdd2;
            border-left: 3px solid #f44336;
        }
        .message.loading {
            background: #0d47a1;
            color: #e3f2fd;
            border-left: 3px solid #2196F3;
        }
        
        /* ✅ ERROR PANEL - PERSISTENT */
        .error-panel {
            background: #b71c1c;
            border: 2px solid #f44336;
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 16px;
            display: none;
        }
        .error-panel.show {
            display: block;
        }
        
        .error-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            border-bottom: 2px solid #f44336;
            padding-bottom: 12px;
        }
        
        .error-title {
            font-weight: bold;
            color: #ffcdd2;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .error-count-badge {
            background: #f44336;
            color: white;
            border-radius: 12px;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: bold;
        }
        
        .error-close-btn {
            background: transparent;
            border: none;
            color: #ffcdd2;
            cursor: pointer;
            font-size: 20px;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .error-close-btn:hover {
            color: white;
            transform: scale(1.2);
        }
        
        .error-details {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .error-item {
            background: #8b0000;
            border-left: 3px solid #f44336;
            border-radius: 4px;
            padding: 12px;
            font-size: 11px;
            line-height: 1.6;
        }
        
        .error-code {
            background: #5a0000;
            color: #ff6b6b;
            padding: 6px 10px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 8px;
            display: inline-block;
            font-family: monospace;
        }
        
        .error-message {
            color: #ffcdd2;
            margin-bottom: 8px;
            word-wrap: break-word;
        }
        
        .error-details-box {
            background: #5a0000;
            padding: 8px;
            border-radius: 3px;
            margin-top: 8px;
            font-family: monospace;
            font-size: 10px;
            color: #ffb74d;
            max-height: 100px;
            overflow-y: auto;
            word-break: break-all;
        }
        
        /* ✅ DIAGNOSTIC BOX */
        .diagnostic-box {
            background: #2d2d40;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 16px;
            border-left: 3px solid #ff9800;
        }
        .diagnostic-title {
            font-weight: bold;
            color: #ff9800;
            margin-bottom: 10px;
            font-size: 12px;
        }
        .diagnostic-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 0;
            font-size: 11px;
            border-bottom: 1px solid #353550;
        }
        .diagnostic-item:last-child {
            border-bottom: none;
        }
        .diagnostic-status {
            width: 20px;
            height: 20px;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            flex-shrink: 0;
        }
        .diagnostic-status.ok {
            background: #2e7d32;
            color: #4caf50;
        }
        .diagnostic-status.error {
            background: #b71c1c;
            color: #f44336;
        }
        .diagnostic-status.pending {
            background: #1565c0;
            color: #2196F3;
        }
        
        /* PROGRESSIVE CONTENT VIEWER */
        .content-viewer {
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            line-height: 1.6;
            background: #1a1a2e;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .content-line {
            display: flex;
            border-bottom: 1px solid #2d2d40;
            transition: background-color 0.3s ease;
        }
        
        .content-line.processing {
            background: #1565c0;
            animation: pulse 1s infinite;
        }
        
        .content-line.success {
            background: transparent;
        }
        
        .content-line.error {
            background: #5a1a1a;
        }
        
        .content-line.warning {
            background: #4a3a1a;
        }
        
        @keyframes pulse {
            0%, 100% { background: #1565c0; }
            50% { background: #2196F3; }
        }
        
        .line-number {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 50px;
            background: #252535;
            color: #666;
            padding: 8px 0;
            text-align: right;
            flex-shrink: 0;
            border-right: 1px solid #3f3f52;
        }
        
        .line-number span {
            display: inline-block;
            width: 40px;
            text-align: right;
        }
        
        .line-status {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 30px;
            flex-shrink: 0;
            padding: 8px;
        }
        
        .status-icon {
            font-size: 12px;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 2px;
        }
        
        .status-icon.ok {
            background: #2e7d32;
            color: #4caf50;
        }
        
        .status-icon.error {
            background: #b71c1c;
            color: #f44336;
        }
        
        .status-icon.pending {
            background: #1565c0;
            color: #2196F3;
        }
        
        .status-icon.warning {
            background: #e65100;
            color: #ff9800;
        }
        
        .line-content {
            flex: 1;
            padding: 8px 12px;
            word-wrap: break-word;
            white-space: pre-wrap;
            color: #e0e0e0;
            overflow-x: auto;
        }
        
        .line-content.error-text {
            color: #ffcdd2;
        }
        
        .line-content.warning-text {
            color: #ffe0b2;
        }
        
        .empty-state {
            text-align: center;
            color: #666;
            padding: 40px 20px;
            font-size: 13px;
        }
        
        .spinner {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid #3f3f52;
            border-top-color: #2196F3;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0); }
            100% { transform: rotate(360deg); }
        }
        
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: #3f3f52;
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #4f4f62;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Binary IR Viewer - Progressive Analysis</h1>
        <p>Real-time Line-by-Line Analysis & Error Detection</p>
    </div>
    
    <div class="main-container">
        <!-- LEFT SECTION: FILES & UPLOAD -->
        <div class="section-left">
            <div class="panel-header">📁 FILES & UPLOAD</div>
            <div class="panel-content">
                <div class="upload-zone" id="uploadZone">
                    <div style="font-size: 36px; margin-bottom: 12px;">📤</div>
                    <div style="font-size: 13px;"><strong style="color: #42a5f5;">Click or drag</strong> to upload</div>
                    <div style="font-size: 11px; color: #999; margin-top: 8px;">*.ir files only</div>
                    <input type="file" id="fileInput" accept=".ir">
                </div>
                
                <div id="uploadMessage"></div>
                
                <!-- ✅ ERROR PANEL - PERSISTENT UNTIL NEW UPLOAD -->
                <div class="error-panel" id="errorPanel">
                    <div class="error-header">
                        <div class="error-title">
                            ❌ ERRORS DETECTED
                            <span class="error-count-badge" id="errorCount">0</span>
                        </div>
                        <button class="error-close-btn" onclick="clearErrorPanel()" title="Clear errors">×</button>
                    </div>
                    <div class="error-details" id="errorDetails"></div>
                </div>
                
                <!-- DIAGNOSTIC BOX -->
                <div class="diagnostic-box" id="diagnosticBox" style="display:none;">
                    <div class="diagnostic-title">📋 ANALYSIS STATUS</div>
                    <div id="diagnosticItems"></div>
                </div>
            </div>
        </div>
        
        <!-- RIGHT SECTION: PROGRESSIVE ANALYSIS -->
        <div class="section-right">
            <div class="panel-header">
                <span>📄 FILE ANALYSIS</span>
                <span class="progress-indicator" id="progressIndicator">Ready</span>
            </div>
            <div class="panel-content" id="analysisPanel">
                <div class="empty-state">
                    <div style="font-size: 32px; margin-bottom: 12px;">📄</div>
                    <div>Upload a file to begin analysis</div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        const uploadMessage = document.getElementById('uploadMessage');
        const analysisPanel = document.getElementById('analysisPanel');
        const diagnosticBox = document.getElementById('diagnosticBox');
        const diagnosticItems = document.getElementById('diagnosticItems');
        const progressIndicator = document.getElementById('progressIndicator');
        const errorPanel = document.getElementById('errorPanel');
        const errorDetails = document.getElementById('errorDetails');
        const errorCount = document.getElementById('errorCount');
        
        let analysisLines = [];
        let currentLineIndex = 0;
        let errorList = []; // ✅ PERSISTENT ERROR LIST
        
        setupUploadHandlers();
        
        function setupUploadHandlers() {
            uploadZone.addEventListener('click', () => fileInput.click());
            uploadZone.addEventListener('dragover', e => {
                e.preventDefault();
                uploadZone.classList.add('dragover');
            });
            uploadZone.addEventListener('dragleave', () => {
                uploadZone.classList.remove('dragover');
            });
            uploadZone.addEventListener('drop', e => {
                e.preventDefault();
                uploadZone.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    uploadFile(e.dataTransfer.files[0]);
                }
            });
            
            fileInput.addEventListener('change', e => {
                if (e.target.files.length > 0) {
                    uploadFile(e.target.files[0]);
                }
            });
        }
        
        async function uploadFile(file) {
            showUploadMessage('Uploading ' + file.name + '...', 'loading');
            errorList = []; // ✅ CLEAR ERRORS ON NEW UPLOAD
            hideErrorPanel();
            
            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: file,
                });
                const data = await res.json();
                
                if (!data.success) {
                    const errorMsg = data.error || 'Upload failed';
                    showUploadMessage('❌ ' + errorMsg, 'error');
                    addError('UPLOAD_FAILED', errorMsg, data); // ✅ ADD ERROR
                    return;
                }
                
                showUploadMessage('✅ Analyzing: ' + file.name, 'success');
                startProgressiveAnalysis(data.analysis);
                fileInput.value = '';
            } catch (e) {
                console.error('Upload exception:', e);
                const errorMsg = 'Upload error: ' + e.message;
                showUploadMessage('❌ ' + errorMsg, 'error');
                addError('UPLOAD_EXCEPTION', errorMsg, { exception: true }); // ✅ ADD ERROR
            }
        }
        
        function startProgressiveAnalysis(analysis) {
            if (!analysis || !analysis.success) {
                const errorMsg = analysis?.error || 'Analysis failed';
                analysisPanel.innerHTML = '<div class="empty-state" style="color: #f44336;">❌ ' + errorMsg + '</div>';
                addError('ANALYSIS_FAILED', errorMsg, analysis); // ✅ ADD ERROR
                return;
            }
            
            diagnosticBox.style.display = 'none';
            showDiagnostics(analysis);
            
            // Prepare analysis lines
            analysisLines = generateAnalysisLines(analysis);
            currentLineIndex = 0;
            
            // Start progressive display
            displayProgressiveAnalysis();
        }
        
        function generateAnalysisLines(analysis) {
            const lines = [];
            const stats = analysis.statistics || {};
            const fileInfo = analysis.fileInfo || {};
            
            // File info section
            lines.push({ type: 'header', text: '📄 FILE INFORMATION', status: 'pending' });
            lines.push({ type: 'info', text: `Library: \${fileInfo.library || 'unknown'}`, status: 'ok' });
            lines.push({ type: 'info', text: `Size: \${((fileInfo.totalBytes || 0) / 1024).toFixed(1)} KB`, status: 'ok' });
            lines.push({ type: 'info', text: `Hash: \${(fileInfo.contentHash || 'N/A').substring(0, 16)}...`, status: 'ok' });
            
            // Statistics section
            lines.push({ type: 'header', text: '📊 STATISTICS', status: 'pending' });
            lines.push({ type: 'info', text: `Classes: \${stats.classes || 0}`, status: 'ok' });
            lines.push({ type: 'info', text: `Functions: \${stats.functions || 0}`, status: 'ok' });
            lines.push({ type: 'info', text: `Variables: \${stats.variables || 0}`, status: 'ok' });
            lines.push({ type: 'info', text: `Imports: \${stats.imports || 0}`, status: 'ok' });
            
            // Imports section
            if (analysis.imports && analysis.imports.length > 0) {
                lines.push({ type: 'header', text: `📦 IMPORTS (\${analysis.imports.length})`, status: 'pending' });
                analysis.imports.slice(0, 5).forEach(i => {
                    lines.push({ type: 'item', text: `├─ \${i.uri || 'unknown'}`, status: 'ok' });
                });
                if (analysis.imports.length > 5) {
                    lines.push({ type: 'item', text: `└─ ... and \${analysis.imports.length - 5} more`, status: 'ok' });
                }
            }
            
            // Classes section
            if (analysis.classes && analysis.classes.length > 0) {
                lines.push({ type: 'header', text: `🗿 CLASSES (\${analysis.classes.length})`, status: 'pending' });
                analysis.classes.slice(0, 5).forEach(c => {
                    lines.push({ type: 'item', text: `├─ \${c.name || 'unknown'} (methods: \${c.methods}, fields: \${c.fields})`, status: 'ok' });
                });
                if (analysis.classes.length > 5) {
                    lines.push({ type: 'item', text: `└─ ... and \${analysis.classes.length - 5} more`, status: 'ok' });
                }
            }
            
            // Functions section
            if (analysis.functions && analysis.functions.length > 0) {
                lines.push({ type: 'header', text: `⚙️ FUNCTIONS (\${analysis.functions.length})`, status: 'pending' });
                analysis.functions.slice(0, 5).forEach(f => {
                    lines.push({ type: 'item', text: `├─ \${f.name || 'unknown'}(\${f.parameters || 0}) → \${f.returnType || 'dynamic'}`, status: 'ok' });
                });
                if (analysis.functions.length > 5) {
                    lines.push({ type: 'item', text: `└─ ... and \${analysis.functions.length - 5} more`, status: 'ok' });
                }
            }
            
            lines.push({ type: 'complete', text: '✅ ANALYSIS COMPLETE', status: 'ok' });
            return lines;
        }
        
        function displayProgressiveAnalysis() {
            if (currentLineIndex === 0) {
                analysisPanel.innerHTML = '<div class="content-viewer" id="contentViewer"></div>';
            }
            
            const viewer = document.getElementById('contentViewer');
            if (!viewer) return;
            
            if (currentLineIndex < analysisLines.length) {
                const line = analysisLines[currentLineIndex];
                const lineEl = createLineElement(currentLineIndex + 1, line);
                viewer.appendChild(lineEl);
                
                // Update progress
                const total = analysisLines.length;
                const percent = Math.round((currentLineIndex + 1) / total * 100);
                progressIndicator.textContent = `\${currentLineIndex + 1}/\${total} (\${percent}%)`;
                
                currentLineIndex++;
                
                // Progressive delay based on line type
                const delay = line.type === 'header' ? 200 : 50;
                setTimeout(displayProgressiveAnalysis, delay);
                
                // Auto-scroll to bottom
                setTimeout(() => {
                    viewer.scrollTop = viewer.scrollHeight;
                }, 10);
            } else {
                progressIndicator.textContent = 'Complete ✅';
            }
        }
        
        function createLineElement(lineNum, line) {
            const div = document.createElement('div');
            div.className = `content-line \${line.status}`;
            
            const numEl = document.createElement('div');
            numEl.className = 'line-number';
            numEl.innerHTML = `<span>\${lineNum}</span>`;
            
            const statusEl = document.createElement('div');
            statusEl.className = 'line-status';
            const icon = document.createElement('div');
            icon.className = `status-icon \${line.status}`;
            icon.textContent = getStatusIcon(line.status);
            statusEl.appendChild(icon);
            
            const contentEl = document.createElement('div');
            contentEl.className = 'line-content';
            contentEl.textContent = line.text;
            
            div.appendChild(numEl);
            div.appendChild(statusEl);
            div.appendChild(contentEl);
            
            return div;
        }
        
        function getStatusIcon(status) {
            switch(status) {
                case 'ok': return '✓';
                case 'error': return '✗';
                case 'warning': return '⚠';
                case 'pending': return '⏳';
                default: return '•';
            }
        }
        
        function showDiagnostics(analysis) {
            diagnosticBox.style.display = 'block';
            const components = {
                'File Info': analysis.fileInfo,
                'Statistics': analysis.statistics,
                'Imports': analysis.imports,
                'Classes': analysis.classes,
                'Functions': analysis.functions,
            };
            
            diagnosticItems.innerHTML = Object.entries(components).map(([name, value]) => {
                const ok = value !== null && value !== undefined;
                const count = ok ? (Array.isArray(value) ? value.length : Object.keys(value || {}).length) : '?';
                return `
                    <div class="diagnostic-item">
                        <div class="diagnostic-status \${ok ? 'ok' : 'error'}">
                            \${ok ? '✓' : '✗'}
                        </div>
                        <div style="flex: 1; font-size: 11px;">\${name}</div>
                        <div style="color: #999; font-size: 10px;">\${ok ? count + ' items' : 'NULL'}</div>
                    </div>
                `;
            }).join('');
        }
        
        function showUploadMessage(message, type) {
            uploadMessage.innerHTML = `
                <div class="message \${type}">
                    \${type === 'loading' ? '<div class="spinner"></div>' : ''}
                    <span>\${message}</span>
                </div>
            `;
            if (type !== 'loading') {
                setTimeout(() => { uploadMessage.innerHTML = ''; }, 5000);
            }
        }
        
        // ✅ NEW: Add error to persistent list
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
        
        // ✅ NEW: Show persistent error panel
        function showErrorPanel() {
            errorPanel.classList.add('show');
            errorCount.textContent = errorList.length;
            
            errorDetails.innerHTML = errorList.map((err, idx) => `
                <div class="error-item">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span class="error-code">Line \${err.lineNum} | \${err.code}</span>
                        <span style="color: #999; font-size: 10px;">\${err.timestamp}</span>
                    </div>
                    <div class="error-message">\${err.message}</div>
                    \${err.data ? `
                        <div class="error-details-box">
                            \${JSON.stringify(err.data).substring(0, 200)}
                        </div>
                    ` : ''}
                </div>
            `).join('');
        }
        
        // ✅ NEW: Clear error panel
        function clearErrorPanel() {
            errorPanel.classList.remove('show');
            errorList = [];
        }
        
        // ✅ NEW: Hide error panel
        function hideErrorPanel() {
            errorPanel.classList.remove('show');
        }
    </script>
</body>
</html>
''';
}