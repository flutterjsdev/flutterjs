class HtmlStylesRightPanelMaterial3 {
  static String getRightPanelStyles() => '''
/* ============================================================================
   MATERIAL 3: Advanced Right Panel Analysis Display
   ============================================================================ */

.progressive-viewer {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.7;
    background: #1a1a2e;
    border-radius: 8px;
    overflow: hidden;
    flex: 1;
    min-height: 0;
    border: 1px solid #3f3f52;
}

.material-line {
    display: flex;
    border-bottom: 1px solid rgba(66, 165, 245, 0.1);
    transition: all 0.2s ease;
    animation: lineSlideIn 0.3s ease-out;
    background: transparent;
}

@keyframes lineSlideIn {
    from {
        opacity: 0;
        transform: translateX(-10px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.material-line:hover {
    background: rgba(66, 165, 245, 0.08);
    border-bottom-color: rgba(66, 165, 245, 0.2);
}

.material-line.ok {
    background: transparent;
}

.material-line.error {
    background: rgba(244, 67, 54, 0.08);
    border-bottom-color: rgba(244, 67, 54, 0.15);
}

.material-line.error:hover {
    background: rgba(244, 67, 54, 0.15);
}

.material-line.warning {
    background: rgba(255, 152, 0, 0.08);
    border-bottom-color: rgba(255, 152, 0, 0.15);
}

.material-line.warning:hover {
    background: rgba(255, 152, 0, 0.15);
}

.material-line.line-type-header {
    background: linear-gradient(90deg, rgba(66, 165, 245, 0.15) 0%, rgba(66, 165, 245, 0) 100%);
    border-bottom: 2px solid rgba(66, 165, 245, 0.3);
    padding: 10px 0;
}

.material-line.line-type-header:hover {
    background: linear-gradient(90deg, rgba(66, 165, 245, 0.25) 0%, rgba(66, 165, 245, 0.05) 100%);
}

.material-line-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    background: linear-gradient(180deg, #252535 0%, #1e1e2e 100%);
    color: #666;
    padding: 8px 0;
    text-align: right;
    flex-shrink: 0;
    border-right: 1px solid #3f3f52;
    user-select: none;
    font-weight: 500;
    font-size: 11px;
}

.material-line-number span {
    display: inline-block;
    width: 40px;
    text-align: right;
    letter-spacing: 0.3px;
}

.material-line-status {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    flex-shrink: 0;
    padding: 8px;
}

.material-status-icon {
    font-size: 13px;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    flex-shrink: 0;
    font-weight: bold;
    transition: all 0.2s ease;
}

.material-status-icon.ok {
    background: rgba(76, 175, 80, 0.2);
    color: #4caf50;
}

.material-status-icon.error {
    background: rgba(244, 67, 54, 0.2);
    color: #f44336;
}

.material-status-icon.warning {
    background: rgba(255, 152, 0, 0.2);
    color: #ff9800;
}

.material-line-content {
    flex: 1;
    padding: 8px 12px;
    word-wrap: break-word;
    white-space: pre-wrap;
    color: #e0e0e0;
    overflow-x: auto;
    min-width: 0;
    transition: all 0.2s ease;
}

.material-line-content.header-line {
    color: #42a5f5;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    font-size: 11px;
}

.material-line-content.item-line {
    color: #b3e5fc;
    padding-left: 16px;
}

/* ============================================================================
   PROGRESS CONTAINER - Material 3
   ============================================================================ */

.analysis-footer {
    margin-top: 16px;
    padding: 0;
}

.progress-container {
    background: linear-gradient(135deg, #2d2d40 0%, #252535 100%);
    border: 1px solid #3f3f52;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    gap: 8px;
}

.progress-title {
    font-weight: 600;
    color: #42a5f5;
    font-size: 12px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
}

.progress-percent {
    background: linear-gradient(135deg, #42a5f5 0%, #1976d2 100%);
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 12px;
    min-width: 50px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(66, 165, 245, 0.3);
}

.progress-bar-wrapper {
    margin-bottom: 12px;
}

.progress-bar-bg {
    background: rgba(66, 165, 245, 0.1);
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid rgba(66, 165, 245, 0.2);
}

.progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #1976d2 0%, #42a5f5 50%, #64b5f6 100%);
    border-radius: 4px;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 8px rgba(66, 165, 245, 0.4);
    animation: progressPulse 1.5s ease-in-out infinite;
}

@keyframes progressPulse {
    0%, 100% {
        box-shadow: 0 0 8px rgba(66, 165, 245, 0.4);
    }
    50% {
        box-shadow: 0 0 12px rgba(66, 165, 245, 0.6);
    }
}

.progress-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}

.stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: rgba(66, 165, 245, 0.05);
    border: 1px solid rgba(66, 165, 245, 0.15);
    border-radius: 8px;
    transition: all 0.2s ease;
}

.stat:hover {
    background: rgba(66, 165, 245, 0.12);
    border-color: rgba(66, 165, 245, 0.3);
}

.stat-label {
    font-size: 10px;
    color: #999;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.2px;
}

.stat-value {
    font-size: 12px;
    color: #42a5f5;
    font-weight: 700;
    margin-left: 8px;
    letter-spacing: 0.3px;
}

/* ============================================================================
   COMPLETION CONTAINER - Material 3
   ============================================================================ */

.completion-container {
    background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%);
    border: 2px solid #4caf50;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.25);
    animation: successPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes successPop {
    0% {
        opacity: 0;
        transform: scale(0.8) translateY(20px);
    }
    50% {
        transform: scale(1.05);
    }
    100% {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.completion-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid rgba(76, 175, 80, 0.3);
}

.completion-icon {
    font-size: 24px;
    color: #4caf50;
    font-weight: bold;
    animation: completionBounce 0.6s ease-in-out;
}

@keyframes completionBounce {
    0%, 100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.2);
    }
}

.completion-title {
    font-weight: 700;
    color: #c8e6c9;
    font-size: 14px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
}

.completion-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
}

.completion-stat {
    background: rgba(0, 0, 0, 0.2);
    padding: 12px;
    border-radius: 8px;
    text-align: center;
    border: 1px solid rgba(76, 175, 80, 0.2);
    transition: all 0.2s ease;
}

.completion-stat:hover {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(76, 175, 80, 0.4);
    transform: translateY(-2px);
}

.completion-stat-label {
    display: block;
    font-size: 10px;
    color: #a5d6a7;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.2px;
    margin-bottom: 6px;
}

.completion-stat-value {
    display: block;
    font-size: 16px;
    color: #4caf50;
    font-weight: 700;
    letter-spacing: 0.3px;
}

/* ============================================================================
   SCROLLBAR STYLING
   ============================================================================ */

.progressive-viewer::-webkit-scrollbar {
    width: 8px;
}

.progressive-viewer::-webkit-scrollbar-track {
    background: rgba(66, 165, 245, 0.05);
}

.progressive-viewer::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #42a5f5 0%, #1976d2 100%);
    border-radius: 4px;
    transition: all 0.2s ease;
}

.progressive-viewer::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #64b5f6 0%, #42a5f5 100%);
    box-shadow: 0 0 6px rgba(66, 165, 245, 0.4);
}

/* ============================================================================
   RESPONSIVE ADJUSTMENTS
   ============================================================================ */

@media (max-width: 1200px) {
    .progress-stats,
    .completion-stats {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .progress-stats,
    .completion-stats {
        grid-template-columns: 1fr;
    }
    
    .material-line-number {
        width: 40px;
    }
    
    .material-line-number span {
        width: 30px;
    }
}
''';
}