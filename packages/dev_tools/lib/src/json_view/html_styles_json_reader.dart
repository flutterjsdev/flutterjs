class HtmlStylesJsonReader {
  static String getJsonReaderStyles() => '''
/* JSON READER STYLES */

.json-upload-zone {
    border: 2px dashed #2196f3;
    border-radius: 8px;
    padding: 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: #2d2d40;
    flex-shrink: 0;
}

.json-upload-zone:hover {
    border-color: #42a5f5;
    background: #353550;
}

.json-upload-zone.dragover {
    background: #2196f3;
    border-color: #1565c0;
    color: white;
}

.json-file-info {
    background: #2d2d40;
    border: 1px solid #3f3f52;
    border-radius: 8px;
    padding: 12px;
    flex-shrink: 0;
    margin-top: 12px;
}

.json-info-header {
    font-weight: 600;
    color: #42a5f5;
    font-size: 12px;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border-bottom: 2px solid #3f3f52;
    padding-bottom: 8px;
}

.json-detail-item {
    display: flex;
    justify-content: space-between;
    padding: 8px;
    background: #353550;
    border-radius: 6px;
    border-left: 3px solid #42a5f5;
    margin-bottom: 6px;
    font-size: 11px;
}

.json-detail-label {
    color: #999;
    font-weight: 500;
}

.json-detail-value {
    color: #42a5f5;
    font-weight: 600;
}

.json-structure-panel {
    background: #2d2d40;
    border: 1px solid #3f3f52;
    border-radius: 8px;
    padding: 12px;
    flex-shrink: 0;
    margin-top: 12px;
}

.json-structure-header {
    font-weight: 600;
    color: #42a5f5;
    font-size: 12px;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border-bottom: 2px solid #3f3f52;
    padding-bottom: 8px;
}

.json-structure-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    font-size: 11px;
    border-left: 3px solid #42a5f5;
    color: #b3e5fc;
    margin-bottom: 4px;
    background: rgba(66, 165, 245, 0.05);
    border-radius: 4px;
}

.json-structure-key {
    color: #ff9800;
    font-weight: 600;
}

.json-structure-type {
    background: #42a5f5;
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 9px;
    font-weight: bold;
}

.json-display-container {
    background: #1a1a2e;
    border-radius: 8px;
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    border: 1px solid #3f3f52;
}

.json-controls {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    background: #2d2d40;
    border-bottom: 1px solid #3f3f52;
    flex-shrink: 0;
}

.json-control-btn {
    padding: 8px 14px;
    background: #42a5f5;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.2s ease;
    flex: 1;
}

.json-control-btn:hover {
    background: #64b5f6;
    transform: translateY(-2px);
}

.json-display-wrapper {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.8;
    background: #1a1a2e;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px 0;
}

.json-content-area {
    display: flex;
    flex-direction: column;
}

.json-line {
    display: flex;
    align-items: center;
    border-bottom: 1px solid rgba(66, 165, 245, 0.08);
    transition: background 0.15s ease;
    min-height: 24px;
    padding-right: 12px;
}

.json-line:hover {
    background: rgba(66, 165, 245, 0.08);
}

.json-collapsible {
    cursor: pointer;
    user-select: none;
}

.json-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    cursor: pointer;
    color: #42a5f5;
    font-size: 12px;
    font-weight: bold;
    background: rgba(66, 165, 245, 0.1);
    border-radius: 3px;
    margin: 0 4px 0 0;
}

.json-toggle:hover {
    background: rgba(66, 165, 245, 0.25);
    transform: scale(1.15);
}

.json-content {
    flex: 1;
    padding: 0 8px;
    display: flex;
    gap: 4px;
    align-items: center;
    word-break: break-all;
}

.json-nested {
    display: block;
}

.json-nested.json-nested-hidden {
    display: none;
}

.json-size {
    background: rgba(76, 175, 80, 0.2);
    color: #81c784;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
}

.json-index {
    color: #64b5f6;
    font-weight: 600;
    background: rgba(100, 181, 246, 0.1);
    padding: 2px 4px;
    border-radius: 2px;
    flex-shrink: 0;
}

.json-key {
    color: #ff9800;
    font-weight: 600;
    flex-shrink: 0;
}

.json-string {
    color: #66bb6a;
}

.json-number {
    color: #ef9a9a;
}

.json-boolean {
    color: #42a5f5;
    font-weight: 600;
}

.json-null {
    color: #90a4ae;
    font-style: italic;
}

.json-punctuation {
    color: #b0bec5;
}

.json-error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    color: #ff6f6f;
}

.json-error-icon {
    font-size: 48px;
    margin-bottom: 16px;
}

.json-error-message {
    font-size: 14px;
    margin-bottom: 8px;
    font-weight: 600;
}

.json-error-detail {
    font-size: 12px;
    color: #ffb6b6;
    font-family: 'Consolas', 'Monaco', monospace;
}

.json-display-wrapper::-webkit-scrollbar {
    width: 10px;
}

.json-display-wrapper::-webkit-scrollbar-track {
    background: rgba(66, 165, 245, 0.05);
}

.json-display-wrapper::-webkit-scrollbar-thumb {
    background: rgba(66, 165, 245, 0.3);
    border-radius: 5px;
}

.json-display-wrapper::-webkit-scrollbar-thumb:hover {
    background: rgba(66, 165, 245, 0.5);
}
  ''';
}
