class HtmlStylesMaterial3 {
  static String getMaterial3Styles() => '''
/* ============================================================================
   MATERIAL 3: Premium Left Panel Styling - FIXED VERSION
   ============================================================================ */

* {
    box-sizing: border-box;
}

/* ============================================================================
   BASE CARD STYLING
   ============================================================================ */

.material-card {
    background: linear-gradient(135deg, #1e1e2e 0%, #16161e 100%);
    border: 1px solid rgba(66, 165, 245, 0.25);
    border-radius: 16px;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    position: relative;
    backdrop-filter: blur(20px);
}

.material-card:hover {
    border-color: rgba(66, 165, 245, 0.5);
    box-shadow: 0 12px 28px rgba(66, 165, 245, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12);
    transform: translateY(-6px);
    background: linear-gradient(135deg, #252533 0%, #1b1b25 100%);
}

.material-card.expanded {
    box-shadow: 0 16px 40px rgba(66, 165, 245, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    border-color: rgba(66, 165, 245, 0.6);
    background: linear-gradient(135deg, #2a2a3a 0%, #1f1f2a 100%);
}

/* ============================================================================
   CARD HEADER
   ============================================================================ */

.material-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px;
    background: linear-gradient(135deg, rgba(66, 165, 245, 0.08) 0%, rgba(33, 150, 243, 0.04) 100%);
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    border-bottom: 2px solid rgba(66, 165, 245, 0.15);
    user-select: none;
}

.material-header:hover {
    background: linear-gradient(135deg, rgba(66, 165, 245, 0.15) 0%, rgba(33, 150, 243, 0.08) 100%);
    border-bottom-color: rgba(66, 165, 245, 0.5);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
    min-width: 0;
}

.card-icon {
    font-size: 24px;
    flex-shrink: 0;
    opacity: 0.95;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, rgba(66, 165, 245, 0.15), rgba(66, 165, 245, 0.05));
    border-radius: 10px;
    border: 1px solid rgba(66, 165, 245, 0.2);
}

.header-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.card-title {
    font-weight: 700;
    color: #42a5f5;
    font-size: 13px;
    letter-spacing: 0.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-transform: uppercase;
}

.card-toggle {
    font-size: 20px;
    color: #42a5f5;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    flex-shrink: 0;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(66, 165, 245, 0.1);
    border-radius: 8px;
    border: 1px solid rgba(66, 165, 245, 0.2);
}

.material-card.expanded .card-toggle {
    transform: rotate(90deg);
    background: rgba(66, 165, 245, 0.2);
}

/* ============================================================================
   CARD SUMMARY SECTIONS
   ============================================================================ */

.card-summary {
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    background: linear-gradient(135deg, rgba(66, 165, 245, 0.1) 0%, rgba(66, 165, 245, 0.04) 100%);
    border-radius: 10px;
    border-left: 4px solid #42a5f5;
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.summary-item:hover {
    background: linear-gradient(135deg, rgba(66, 165, 245, 0.18) 0%, rgba(66, 165, 245, 0.1) 100%);
    border-left-color: #64b5f6;
    transform: translateX(6px);
    box-shadow: 0 4px 12px rgba(66, 165, 245, 0.15);
}

.summary-label-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.summary-label {
    font-weight: 700;
    color: #e3f2fd;
    font-size: 12px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
}

.summary-sublabel {
    font-size: 11px;
    color: #64b5f6;
    font-weight: 500;
    opacity: 0.85;
}

.summary-value {
    color: #90caf9;
    font-weight: 600;
    font-size: 12px;
    text-align: right;
    word-break: break-word;
}

.summary-value-badge {
    background: linear-gradient(135deg, #42a5f5 0%, #1976d2 100%);
    color: #e3f2fd;
    padding: 8px 14px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 12px;
    box-shadow: 0 4px 12px rgba(66, 165, 245, 0.35);
    letter-spacing: 0.3px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

/* ============================================================================
   STATISTICS GRID
   ============================================================================ */

.stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 12px;
    background: linear-gradient(135deg, rgba(66, 165, 245, 0.08) 0%, rgba(66, 165, 245, 0.03) 100%);
    border-radius: 10px;
    border: 1px solid rgba(66, 165, 245, 0.15);
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 14px;
    background: linear-gradient(135deg, rgba(66, 165, 245, 0.12) 0%, rgba(66, 165, 245, 0.05) 100%);
    border-radius: 10px;
    border: 1px solid rgba(66, 165, 245, 0.25);
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.stat-item:hover {
    background: linear-gradient(135deg, rgba(66, 165, 245, 0.2) 0%, rgba(66, 165, 245, 0.12) 100%);
    border-color: rgba(66, 165, 245, 0.45);
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(66, 165, 245, 0.18);
}

.stat-icon {
    font-size: 24px;
    opacity: 0.95;
}

.stat-value {
    font-size: 20px;
    font-weight: 800;
    color: #64b5f6;
    letter-spacing: 0.5px;
}

.stat-label {
    font-size: 11px;
    color: #90caf9;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
}

.stat-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, #42a5f5 0%, #1976d2 100%);
    color: white;
    border-radius: 12px;
    font-weight: 800;
    font-size: 16px;
    box-shadow: 0 4px 14px rgba(66, 165, 245, 0.35);
    flex-shrink: 0;
    border: 1px solid rgba(255, 255, 255, 0.15);
}

/* ============================================================================
   INDICATOR BADGES
   ============================================================================ */

.indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 13px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 700;
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.indicator.deferred {
    background: linear-gradient(135deg, rgba(255, 152, 0, 0.25) 0%, rgba(255, 152, 0, 0.1) 100%);
    color: #ffb74d;
    border: 1px solid rgba(255, 152, 0, 0.5);
}

.indicator.deferred:hover {
    background: linear-gradient(135deg, rgba(255, 152, 0, 0.35) 0%, rgba(255, 152, 0, 0.2) 100%);
    border-color: rgba(255, 152, 0, 0.7);
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(255, 152, 0, 0.2);
}

.indicator.prefixed {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.25) 0%, rgba(76, 175, 80, 0.1) 100%);
    color: #81c784;
    border: 1px solid rgba(76, 175, 80, 0.5);
}

.indicator.prefixed:hover {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.35) 0%, rgba(76, 175, 80, 0.2) 100%);
    border-color: rgba(76, 175, 80, 0.7);
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
}

.indicator.abstract {
    background: linear-gradient(135deg, rgba(156, 39, 176, 0.25) 0%, rgba(156, 39, 176, 0.1) 100%);
    color: #ce93d8;
    border: 1px solid rgba(156, 39, 176, 0.5);
}

.indicator.abstract:hover {
    background: linear-gradient(135deg, rgba(156, 39, 176, 0.35) 0%, rgba(156, 39, 176, 0.2) 100%);
    border-color: rgba(156, 39, 176, 0.7);
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(156, 39, 176, 0.2);
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
    gap: 10px;
    padding: 12px 14px;
    background: linear-gradient(135deg, rgba(66, 165, 245, 0.12) 0%, rgba(66, 165, 245, 0.05) 100%);
    border-radius: 10px;
    border-left: 4px solid #42a5f5;
    border: 1px solid rgba(66, 165, 245, 0.2);
}

.summary-stat span:last-child {
    color: #90caf9;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

/* ============================================================================
   ISSUE ALERT
   ============================================================================ */

.issue-alert {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: linear-gradient(135deg, rgba(244, 67, 54, 0.18) 0%, rgba(233, 30, 99, 0.1) 100%);
    border-left: 4px solid #ff5252;
    border-radius: 10px;
    border: 1px solid rgba(244, 67, 54, 0.3);
    animation: slideInAlert 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideInAlert {
    from {
        opacity: 0;
        transform: translateX(-10px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.alert-icon {
    font-size: 18px;
    flex-shrink: 0;
}

.alert-text {
    color: #ff6f6f;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

/* ============================================================================
   EXPANDED PANEL
   ============================================================================ */

.material-panel {
    background: linear-gradient(135deg, #1a1a24 0%, #151520 100%);
    border: 2px solid rgba(66, 165, 245, 0.35);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 16px 40px rgba(66, 165, 245, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
    max-height: 600px;
    display: flex;
    flex-direction: column;
    animation: panelExpandSmooth 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    margin-top: 8px;
    backdrop-filter: blur(20px);
}

@keyframes panelExpandSmooth {
    from {
        opacity: 0;
        transform: translateY(-15px);
        max-height: 0;
    }
    to {
        opacity: 1;
        transform: translateY(0);
        max-height: 600px;
    }
}

.material-expanded-header {
    background: linear-gradient(90deg, #1565c0 0%, #0d47a1 100%);
    padding: 18px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    gap: 12px;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.expanded-header-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
}

.expanded-title {
    font-weight: 700;
    color: #e3f2fd;
    font-size: 13px;
    letter-spacing: 0.5px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-transform: uppercase;
}

.expanded-type-badge {
    display: inline-block;
    background: rgba(255, 255, 255, 0.2);
    color: #b3e5fc;
    padding: 6px 12px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    backdrop-filter: blur(10px);
    flex-shrink: 0;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.material-close {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #e3f2fd;
    cursor: pointer;
    font-size: 20px;
    padding: 8px;
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    border-radius: 8px;
    flex-shrink: 0;
    font-weight: bold;
}

.material-close:hover {
    background: rgba(255, 255, 255, 0.3);
    color: white;
    transform: rotate(90deg) scale(1.1);
    box-shadow: 0 4px 12px rgba(255, 255, 255, 0.15);
}

.material-content {
    padding: 20px;
    overflow-y: auto;
    font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
    font-size: 12px;
    background: #1a1a24;
    flex: 1;
    min-height: 0;
    line-height: 1.7;
}

.material-content::-webkit-scrollbar {
    width: 8px;
}

.material-content::-webkit-scrollbar-track {
    background: rgba(66, 165, 245, 0.08);
    border-radius: 4px;
}

.material-content::-webkit-scrollbar-thumb {
    background: rgba(66, 165, 245, 0.35);
    border-radius: 4px;
}

.material-content::-webkit-scrollbar-thumb:hover {
    background: rgba(66, 165, 245, 0.55);
}

.details-tree {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.detail-item {
    display: flex;
    gap: 12px;
    padding: 12px 14px;
    border-left: 4px solid rgba(66, 165, 245, 0.25);
    transition: all 0.2s ease;
    min-width: 0;
    background: rgba(66, 165, 245, 0.05);
    border-radius: 6px;
}

.detail-item:hover {
    background: rgba(66, 165, 245, 0.12);
    border-left-color: #42a5f5;
    padding-left: 16px;
}

.detail-key {
    color: #ffa726;
    font-weight: 700;
    min-width: 150px;
    flex-shrink: 0;
    letter-spacing: 0.3px;
}

.detail-value-string {
    color: #66bb6a;
    word-break: break-all;
    flex: 1;
    min-width: 0;
    background: rgba(102, 187, 106, 0.1);
    padding: 4px 10px;
    border-radius: 4px;
    border-left: 2px solid rgba(102, 187, 106, 0.35);
}

.detail-value-null {
    color: #90a4ae;
    font-style: italic;
    opacity: 0.7;
    font-weight: 500;
}

.detail-array-count {
    background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
    color: #81c784;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 10px;
    flex-shrink: 0;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    box-shadow: 0 2px 6px rgba(46, 125, 50, 0.25);
}

.detail-object {
    background: linear-gradient(135deg, #42a5f5 0%, #1976d2 100%);
    color: #e3f2fd;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 10px;
    flex-shrink: 0;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    box-shadow: 0 2px 6px rgba(66, 165, 245, 0.3);
}

/* ============================================================================
   RESPONSIVE DESIGN
   ============================================================================ */

@media (max-width: 768px) {
    .stats-grid {
        grid-template-columns: 1fr;
    }
    
    .material-card {
        border-radius: 12px;
    }
    
    .card-title {
        font-size: 12px;
    }
}

/* ============================================================================
   ANIMATIONS
   ============================================================================ */

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(-20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.material-card {
    animation: slideIn 0.3s ease-out;
}

/* ============================================================================
   SCROLLBAR STYLING
   ============================================================================ */

::-webkit-scrollbar {
    width: 10px;
    height: 10px;
}

::-webkit-scrollbar-track {
    background: rgba(66, 165, 245, 0.08);
}

::-webkit-scrollbar-thumb {
    background: rgba(66, 165, 245, 0.35);
    border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
    background: rgba(66, 165, 245, 0.55);
}

/* ============================================================================
   ACCESSIBILITY
   ============================================================================ */

.material-card:focus,
.expanded-close:focus {
    outline: 2px solid rgba(66, 165, 245, 0.6);
    outline-offset: 2px;
}

.card-header:focus-visible,
.expanded-close:focus-visible {
    outline: 2px solid #42a5f5;
    outline-offset: 2px;
}

/* ============================================================================
   TEXT SELECTION
   ============================================================================ */

.detail-value-string::selection,
.detail-key::selection {
    background: rgba(66, 165, 245, 0.4);
    color: #e3f2fd;
}

/* ============================================================================
   UTILITIES
   ============================================================================ */

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    color: #90caf9;
}

.badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.3px;
    text-transform: uppercase;
}

.badge-primary {
    background: linear-gradient(135deg, #42a5f5 0%, #1976d2 100%);
    color: #b3e5fc;
}

.divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(66, 165, 245, 0.2), transparent);
    margin: 12px 0;
}
    ''';
}
