class HtmlStyles {
  static String getStyles() => '''
* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
    width: 100%;
    height: 100%;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #1a1a2e;
    color: #e0e0e0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.header {
    background: linear-gradient(90deg, #0d47a1, #1565c0);
    padding: 16px 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    border-bottom: 2px solid #0d47a1;
    flex-shrink: 0;
}

.header h1 { 
    font-size: 22px; 
    margin-bottom: 4px; 
    color: #e3f2fd;
    font-weight: 600;
}

.header p { 
    font-size: 12px; 
    color: #b3e5fc;
    margin: 0;
}

.main-container {
    display: flex;
    flex: 1;
    overflow: hidden;
    gap: 0;
    width: 100%;
}

.section-left {
    width: 32%;
    background: #252535;
    border-right: 2px solid #3f3f52;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
    flex-shrink: 0;
}

.section-right {
    flex: 1;
    background: #1e1e2e;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
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
    flex-shrink: 0;
}

.progress-indicator {
    font-size: 11px;
    color: #999;
    font-weight: normal;
}

.left-scrollable {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.right-scrollable {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.upload-zone {
    border: 2px dashed #2196f3;
    border-radius: 8px;
    padding: 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: #2d2d40;
    flex-shrink: 0;
}

.upload-zone:hover { 
    border-color: #42a5f5;
    background: #353550;
}

.upload-zone.dragover {
    background: #2196f3;
    border-color: #1565c0;
    color: white;
}

input[type="file"] { 
    display: none; 
}

#uploadMessage {
    flex-shrink: 0;
}

.message {
    padding: 12px;
    border-radius: 4px;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
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
    border-left: 3px solid #2196f3;
}

.error-panel {
    background: #b71c1c;
    border: 2px solid #f44336;
    border-radius: 6px;
    padding: 16px;
    display: none;
    flex-shrink: 0;
    max-height: 300px;
    overflow-y: auto;
}

.error-panel.show {
    display: block;
    animation: slideIn 0.3s ease-out;
}

.error-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    border-bottom: 2px solid #f44336;
    padding-bottom: 12px;
    flex-shrink: 0;
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
    min-width: 24px;
    text-align: center;
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
    flex-shrink: 0;
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
    display: inline-block;
    font-family: 'Consolas', 'Monaco', monospace;
}

.error-message {
    color: #ffcdd2;
    margin-top: 8px;
    word-wrap: break-word;
    word-break: break-word;
}

.diagnostic-box {
    background: #2d2d40;
    border-radius: 6px;
    padding: 12px;
    border-left: 3px solid #ff9800;
    flex-shrink: 0;
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

.analysis-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
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
    animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.content-line.ok {
    background: transparent;
}

.content-line.error {
    background: rgba(90, 26, 26, 0.5);
}

.content-line.warning {
    background: rgba(74, 58, 26, 0.5);
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
    user-select: none;
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
    flex-shrink: 0;
}

.status-icon.ok {
    background: #2e7d32;
    color: #4caf50;
}

.status-icon.error {
    background: #b71c1c;
    color: #f44336;
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
    min-width: 0;
}

.empty-state {
    text-align: center;
    color: #666;
    padding: 20px;
    font-size: 12px;
}

.spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid #3f3f52;
    border-top-color: #2196f3;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
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

.left-details-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.left-detail-card {
    background: #2d2d40;
    border: 1px solid #3f3f52;
    border-radius: 6px;
    overflow: hidden;
    transition: all 0.2s;
    flex-shrink: 0;
}

.left-detail-card:hover {
    border-color: #42a5f5;
    box-shadow: 0 2px 8px rgba(66, 165, 245, 0.1);
}

.card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: #353550;
    cursor: pointer;
    transition: all 0.2s;
    border-bottom: 1px solid #3f3f52;
    user-select: none;
}

.card-header:hover {
    background: #3f3f5a;
    border-bottom-color: #42a5f5;
}

.card-toggle {
    font-size: 10px;
    color: #42a5f5;
    transition: transform 0.2s;
    flex-shrink: 0;
}

.card-title {
    font-weight: bold;
    color: #42a5f5;
    font-size: 12px;
    flex: 1;
    min-width: 0;
}

.card-summary {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.summary-item {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    gap: 8px;
}

.summary-label {
    color: #999;
    flex-shrink: 0;
}

.summary-value {
    color: #42a5f5;
    font-weight: 500;
    text-align: right;
    word-break: break-word;
    flex: 1;
}

.left-expanded-panel {
    background: #2d2d40;
    border: 2px solid #42a5f5;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(66, 165, 245, 0.2);
    flex-shrink: 0;
    max-height: 400px;
    display: flex;
    flex-direction: column;
}

.expanded-header {
    background: #1565c0;
    padding: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    gap: 12px;
}

.expanded-title {
    font-weight: bold;
    color: #e3f2fd;
    font-size: 12px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.expanded-close {
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
    flex-shrink: 0;
}

.expanded-close:hover {
    color: white;
    transform: scale(1.1);
}

.expanded-content {
    padding: 12px;
    overflow-y: auto;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 11px;
    background: #1a1a2e;
    flex: 1;
    min-height: 0;
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
    transition: all 0.2s;
    min-width: 0;
}

.detail-item:hover {
    background: #252535;
    border-left-color: #42a5f5;
}

.detail-key {
    color: #ff9800;
    font-weight: bold;
    min-width: 120px;
    flex-shrink: 0;
}

.detail-value-string {
    color: #4caf50;
    word-break: break-all;
    flex: 1;
    min-width: 0;
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
    flex-shrink: 0;
}
.detail-toggle {
    transition: transform 0.2s ease;
}
.detail-object {
    background: #1565c0;
    color: #42a5f5;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    flex-shrink: 0;
}
''';
}
