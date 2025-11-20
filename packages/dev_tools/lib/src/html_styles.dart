class HtmlStyles {
  static String getStyles() => '''
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

.expand-details-btn {
    background: transparent;
    border: none;
    color: #42a5f5;
    cursor: pointer;
    font-size: 11px;
    padding: 0 8px;
    transition: all 0.2s;
    flex-shrink: 0;
}

.expand-details-btn:hover {
    color: #64b5f6;
    transform: scale(1.2);
}

.details-panel {
    background: #2d2d40;
    border: 2px solid #42a5f5;
    border-radius: 6px;
    margin: 12px 0;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(66, 165, 245, 0.2);
}

.details-header {
    background: #1565c0;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #0d47a1;
}

.details-title {
    font-weight: bold;
    color: #e3f2fd;
    font-size: 12px;
}

.details-close-btn {
    background: transparent;
    border: none;
    color: #e3f2fd;
    cursor: pointer;
    font-size: 16px;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.details-close-btn:hover {
    color: #fff;
    transform: scale(1.1);
}

.details-content {
    padding: 16px;
    max-height: 400px;
    overflow-y: auto;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 11px;
    line-height: 1.6;
    background: #1a1a2e;
}

.details-tree {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.detail-item {
    display: flex;
    gap: 8px;
    padding: 4px 8px;
    border-left: 2px solid #3f3f52;
    padding-left: 12px;
}

.detail-item:hover {
    background: #252535;
    border-left-color: #42a5f5;
}

.detail-key {
    color: #ff9800;
    font-weight: bold;
    min-width: 150px;
    flex-shrink: 0;
}

.detail-value-string {
    color: #4caf50;
}

.detail-value-number {
    color: #64b5f6;
}

.detail-value-bool {
    color: #ab47bc;
    font-weight: bold;
}

.detail-value-null {
    color: #999;
    font-style: italic;
}

.detail-array-count {
    background: #2e7d32;
    color: #81c784;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
}

.detail-object {
    background: #1565c0;
    color: #42a5f5;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
}

.detail-sublist {
    margin-left: 20px;
    margin-top: 6px;
    padding: 8px;
    background: #252535;
    border-left: 2px solid #3f3f52;
    border-radius: 3px;
}

.detail-subitem {
    color: #b3e5fc;
    font-size: 10px;
    padding: 3px 0;
    word-break: break-all;
}

/* Scrollbar styling for details panel */
.details-content::-webkit-scrollbar {
    width: 6px;
}

.details-content::-webkit-scrollbar-track {
    background: #252535;
}

.details-content::-webkit-scrollbar-thumb {
    background: #3f3f52;
    border-radius: 3px;
}

.details-content::-webkit-scrollbar-thumb:hover {
    background: #4f4f62;
}
''';
}
