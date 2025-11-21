class HtmlStylesMaterial3 {
  static String getMaterial3Styles() => '''
/* ============================================================================
   MATERIAL 3: Advanced Left Panel Styling
   ============================================================================ */

.material-card {
    background: #2d2d40;
    border: 1px solid #3f3f52;
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
    position: relative;
}

.material-card:hover {
    border-color: #42a5f5;
    box-shadow: 0 3px 6px rgba(66, 165, 245, 0.15), 0 2px 4px rgba(0, 0, 0, 0.3);
    transform: translateY(-2px);
}

.material-card.expanded {
    box-shadow: 0 5px 12px rgba(66, 165, 245, 0.25);
}

.material-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: linear-gradient(135deg, #353550 0%, #2d2d40 100%);
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 2px solid transparent;
    user-select: none;
}

.material-header:hover {
    background: linear-gradient(135deg, #3f3f5a 0%, #353550 100%);
    border-bottom-color: #42a5f5;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
}

.card-icon {
    font-size: 18px;
    flex-shrink: 0;
    opacity: 0.9;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.header-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.card-title {
    font-weight: 600;
    color: #42a5f5;
    font-size: 13px;
    letter-spacing: 0.3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.card-toggle {
    font-size: 12px;
    color: #42a5f5;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    font-weight: bold;
}

.material-card.expanded .card-toggle {
    transform: rotate(90deg);
}

/* ============================================================================
   CARD SUMMARY SECTIONS
   ============================================================================ */

.card-summary {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: rgba(66, 165, 245, 0.05);
    border-radius: 8px;
    border-left: 3px solid #42a5f5;
    transition: all 0.2s ease;
}

.summary-item:hover {
    background: rgba(66, 165, 245, 0.1);
    border-left-color: #64b5f6;
}

.summary-label-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.summary-label {
    font-weight: 600;
    color: #e0e0e0;
    font-size: 12px;
    letter-spacing: 0.2px;
}

.summary-sublabel {
    font-size: 10px;
    color: #999;
    font-weight: 400;
}

.summary-value {
    color: #42a5f5;
    font-weight: 500;
    font-size: 12px;
    text-align: right;
    word-break: break-word;
}

.summary-value-badge {
    background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
    color: #e3f2fd;
    padding: 6px 12px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 12px;
    box-shadow: 0 2px 4px rgba(21, 101, 192, 0.3);
}

/* ============================================================================
   STATISTICS GRID
   ============================================================================ */

.stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 12px;
    background: rgba(66, 165, 245, 0.05);
    border-radius: 8px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px;
    background: rgba(66, 165, 245, 0.08);
    border-radius: 8px;
    border: 1px solid rgba(66, 165, 245, 0.15);
    transition: all 0.2s ease;
}

.stat-item:hover {
    background: rgba(66, 165, 245, 0.15);
    border-color: rgba(66, 165, 245, 0.3);
    transform: translateY(-1px);
}

.stat-value {
    font-size: 16px;
    font-weight: 700;
    color: #42a5f5;
    letter-spacing: 0.5px;
}

.stat-label {
    font-size: 10px;
    color: #999;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.stat-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #42a5f5 0%, #1976d2 100%);
    color: white;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    box-shadow: 0 2px 4px rgba(66, 165, 245, 0.3);
}

/* ============================================================================
   INDICATOR BADGES
   ============================================================================ */

.indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    transition: all 0.2s ease;
}

.indicator.deferred {
    background: rgba(255, 152, 0, 0.15);
    color: #ff9800;
    border: 1px solid rgba(255, 152, 0, 0.3);
}

.indicator.deferred:hover {
    background: rgba(255, 152, 0, 0.25);
    border-color: rgba(255, 152, 0, 0.5);
}

.indicator.prefixed {
    background: rgba(76, 175, 80, 0.15);
    color: #4caf50;
    border: 1px solid rgba(76, 175, 80, 0.3);
}

.indicator.prefixed:hover {
    background: rgba(76, 175, 80, 0.25);
    border-color: rgba(76, 175, 80, 0.5);
}

.indicator.abstract {
    background: rgba(156, 39, 176, 0.15);
    color: #9c27b0;
    border: 1px solid rgba(156, 39, 176, 0.3);
}

.indicator.abstract:hover {
    background: rgba(156, 39, 176, 0.25);
    border-color: rgba(156, 39, 176, 0.5);
}

.import-indicators,
.import-summary,
.class-summary,
.function-summary,
.variable-summary {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.summary-stat {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: rgba(66, 165, 245, 0.08);
    border-radius: 8px;
    border-left: 3px solid #42a5f5;
}

.summary-stat span:last-child {
    color: #999;
    font-size: 11px;
    font-weight: 500;
}

/* ============================================================================
   ISSUE ALERT
   ============================================================================ */

.issue-alert {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(233, 30, 99, 0.05) 100%);
    border-left: 3px solid #f44336;
    border-radius: 6px;
    animation: slideIn 0.3s ease-out;
}

.alert-icon {
    font-size: 14px;
    font-weight: bold;
}

.alert-text {
    color: #ff5252;
    font-size: 11px;
    font-weight: 500;
}

/* ============================================================================
   EXPANDED PANEL - MATERIAL 3
   ============================================================================ */

.material-panel {
    background: #2d2d40;
    border: 2px solid #42a5f5;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(66, 165, 245, 0.25);
    flex-shrink: 0;
    max-height: 500px;
    display: flex;
    flex-direction: column;
    animation: panelExpand 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes panelExpand {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.material-expanded-header {
    background: linear-gradient(90deg, #1565c0 0%, #0d47a1 100%);
    padding: 14px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    gap: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.expanded-header-content {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
}

.expanded-title {
    font-weight: 600;
    color: #e3f2fd;
    font-size: 13px;
    letter-spacing: 0.3px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.expanded-type-badge {
    display: inline-block;
    background: rgba(255, 255, 255, 0.2);
    color: #b3e5fc;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    backdrop-filter: blur(10px);
}

.material-close {
    background: rgba(255, 255, 255, 0.15);
    border: none;
    color: #e3f2fd;
    cursor: pointer;
    font-size: 16px;
    padding: 6px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    border-radius: 6px;
    flex-shrink: 0;
    font-weight: bold;
}

.material-close:hover {
    background: rgba(255, 255, 255, 0.3);
    color: white;
    transform: rotate(90deg);
}

.material-content {
    padding: 16px;
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
    gap: 6px;
}

.detail-item {
    display: flex;
    gap: 8px;
    padding: 8px 10px;
    border-left: 3px solid #3f3f52;
    padding-left: 12px;
    transition: all 0.2s ease;
    min-width: 0;
    background: rgba(66, 165, 245, 0.02);
    border-radius: 4px;
}

.detail-item:hover {
    background: rgba(66, 165, 245, 0.08);
    border-left-color: #42a5f5;
    padding-left: 14px;
}

.detail-key {
    color: #ff9800;
    font-weight: bold;
    min-width: 140px;
    flex-shrink: 0;
}

.detail-value-string {
    color: #4caf50;
    word-break: break-all;
    flex: 1;
    min-width: 0;
    background: rgba(76, 175, 80, 0.08);
    padding: 2px 6px;
    border-radius: 3px;
}

.detail-value-null {
    color: #999;
    font-style: italic;
    opacity: 0.7;
}

.detail-array-count {
    background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
    color: #81c784;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 9px;
    flex-shrink: 0;
    font-weight: 600;
}

.detail-object {
    background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
    color: #42a5f5;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 9px;
    flex-shrink: 0;
    font-weight: 600;
}
''';
}