class HtmlStylesJsonReader {
  static String getJsonReaderStyles() => '''
/* JSON READER STYLES */

.json-upload-zone {
    border: 2px dashed rgba(66, 165, 245, 0.5);
    border-radius: 16px;
    padding: 32px 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: linear-gradient(135deg, rgba(66, 165, 245, 0.08) 0%, rgba(33, 150, 243, 0.04) 100%);
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
}

.json-upload-zone::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 30% 30%, rgba(66, 165, 245, 0.1) 0%, transparent 50%);
    pointer-events: none;
}

.json-upload-zone:hover {
    border-color: #42a5f5;
    background: linear-gradient(135deg, rgba(66, 165, 245, 0.15) 0%, rgba(33, 150, 243, 0.08) 100%);
    box-shadow: 0 12px 32px rgba(66, 165, 245, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
}

.json-upload-zone.dragover {
    background: linear-gradient(135deg, #42a5f5 0%, #1976d2 100%);
    border-color: #1565c0;
    color: white;
    box-shadow: 0 16px 40px rgba(66, 165, 245, 0.4);
    transform: translateY(-4px);
}

.json-file-info {
    background: linear-gradient(135deg, #2d2d40 0%, #252535 100%);
    border: 1px solid rgba(66, 165, 245, 0.25);
    border-radius: 12px;
    padding: 16px;
    flex-shrink: 0;
    margin-top: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.json-file-info:hover {
    border-color: rgba(66, 165, 245, 0.5);
    box-shadow: 0 8px 24px rgba(66, 165, 245, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.json-info-header {
    font-weight: 700;
    color: #42a5f5;
    font-size: 12px;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid rgba(66, 165, 245, 0.2);
    padding-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.json-detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    background: rgba(66, 165, 245, 0.06);
    border-radius: 8px;
    border-left: 4px solid #42a5f5;
    margin-bottom: 8px;
    font-size: 11px;
    transition: all 0.2s ease;
}

.json-detail-item:last-child {
    margin-bottom: 0;
}

.json-detail-item:hover {
    background: rgba(66, 165, 245, 0.12);
    border-left-color: #64b5f6;
    transform: translateX(4px);
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
    background: linear-gradient(135deg, #2d2d40 0%, #252535 100%);
    border: 1px solid rgba(76, 175, 80, 0.25);
    border-radius: 12px;
    padding: 16px;
    flex-shrink: 0;
    margin-top: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.json-structure-header {
    font-weight: 700;
    color: #81c784;
    font-size: 12px;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid rgba(76, 175, 80, 0.2);
    padding-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.json-structure-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    font-size: 11px;
    border-left: 4px solid #81c784;
    color: #a5d6a7;
    margin-bottom: 8px;
    background: rgba(76, 175, 80, 0.06);
    border-radius: 8px;
    transition: all 0.2s ease;
}

.json-structure-item:last-child {
    margin-bottom: 0;
}

.json-structure-item:hover {
    background: rgba(76, 175, 80, 0.12);
    border-left-color: #a5d6a7;
    transform: translateX(4px);
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
    border-radius: 12px;
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    border: 1px solid rgba(66, 165, 245, 0.2);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.json-controls {
    display: flex;
    gap: 10px;
    padding: 14px 16px;
    background: linear-gradient(180deg, #2d2d40 0%, #252535 100%);
    border-bottom: 1px solid rgba(66, 165, 245, 0.15);
    flex-shrink: 0;
}

.json-control-btn {
    padding: 10px 16px;
    background: linear-gradient(135deg, #42a5f5 0%, #1976d2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    flex: 1;
    box-shadow: 0 2px 8px rgba(66, 165, 245, 0.3);
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.json-control-btn:hover {
    background: linear-gradient(135deg, #64b5f6 0%, #42a5f5 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(66, 165, 245, 0.4);
}

.json-control-btn:active {
    transform: translateY(0);
}

.json-display-wrapper {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.9;
    background: #1a1a2e;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0;
}

.json-content-area {
    display: flex;
    flex-direction: column;
}

.json-line {
    display: flex;
    align-items: center;
    border-bottom: 1px solid rgba(66, 165, 245, 0.06);
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    min-height: 28px;
    padding: 0 16px 0 12px;
}

.json-line:hover {
    background: rgba(66, 165, 245, 0.1);
    border-bottom-color: rgba(66, 165, 245, 0.15);
}

.json-collapsible {
    cursor: pointer;
    user-select: none;
}

.json-collapsible:hover {
    background: rgba(66, 165, 245, 0.12);
}

.json-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    cursor: pointer;
    color: #42a5f5;
    font-size: 12px;
    font-weight: bold;
    background: rgba(66, 165, 245, 0.12);
    border-radius: 4px;
    margin: 0 6px 0 0;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid rgba(66, 165, 245, 0.2);
}

.json-toggle:hover {
    background: rgba(66, 165, 245, 0.25);
    border-color: rgba(66, 165, 245, 0.4);
    transform: scale(1.1);
    box-shadow: 0 2px 6px rgba(66, 165, 245, 0.2);
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
