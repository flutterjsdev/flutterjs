class HtmlScriptsPannel {
  static String getHtmlPannelScript() => '''
// ============================================================================
// PART 2: Analysis Display & Left Panel Management
// ============================================================================

const diagnosticItems = document.getElementById('diagnosticItems');

const leftDetailsPanel = {
    container: null,
    currentExpanded: null,

    init() {
        this.container = document.getElementById('leftDetailsPanel');
        if (!this.container) {
            console.error('Left details panel container not found');
            return;
        }
        console.log('Left panel initialized');
    },

    addFileInfoCard(fileInfo) {
        const card = this.createCard('FILE INFORMATION', 'file-info');
        
        const summary = document.createElement('div');
        summary.className = 'card-summary';
        summary.innerHTML = '<div class="summary-item">' +
            '<span class="summary-label">Library:</span>' +
            '<span class="summary-value">' + escapeHtml((fileInfo.library || 'unknown').split('\\\\\\\\').pop()) + '</span>' +
            '</div>' +
            '<div class="summary-item">' +
            '<span class="summary-label">Size:</span>' +
            '<span class="summary-value">' + ((fileInfo.totalBytes || 0) / 1024).toFixed(1) + ' KB</span>' +
            '</div>';
        card.appendChild(summary);
        
        card.querySelector('.card-header').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showDetailsPanel('FILE INFORMATION', {
                'Library': fileInfo.library || 'unknown',
                'File Path': fileInfo.filePath || 'N/A',
                'Size (Bytes)': fileInfo.totalBytes || 0,
                'Size (KB)': ((fileInfo.totalBytes || 0) / 1024).toFixed(1),
                'Content Hash': fileInfo.contentHash || 'N/A'
            });
        });
        
        this.container.appendChild(card);
    },

    addStatisticsCard(stats) {
        const card = this.createCard('STATISTICS', 'statistics');
        
        const summary = document.createElement('div');
        summary.className = 'card-summary';
        summary.innerHTML = '<div class="summary-item">' +
            '<span class="summary-label">Classes:</span>' +
            '<span class="summary-value">' + (stats.classes || 0) + '</span>' +
            '</div>' +
            '<div class="summary-item">' +
            '<span class="summary-label">Functions:</span>' +
            '<span class="summary-value">' + (stats.functions || 0) + '</span>' +
            '</div>' +
            '<div class="summary-item">' +
            '<span class="summary-label">Variables:</span>' +
            '<span class="summary-value">' + (stats.variables || 0) + '</span>' +
            '</div>' +
            '<div class="summary-item">' +
            '<span class="summary-label">Imports:</span>' +
            '<span class="summary-value">' + (stats.imports || 0) + '</span>' +
            '</div>';
        card.appendChild(summary);
        
        card.querySelector('.card-header').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showDetailsPanel('STATISTICS', {
                'Classes': stats.classes || 0,
                'Total Methods': stats.totalMethods || 0,
                'Total Fields': stats.totalFields || 0,
                'Functions': stats.functions || 0,
                'Variables': stats.variables || 0,
                'Imports': stats.imports || 0,
                'Exports': stats.exports || 0,
                'Analysis Issues': stats.analysisIssues || 0
            });
        });
        
        this.container.appendChild(card);
    },

    addImportsCard(imports) {
        if (!imports || imports.length === 0) return;
        
        const card = this.createCard('IMPORTS (' + imports.length + ')', 'imports');
        
        const summary = document.createElement('div');
        summary.className = 'card-summary';
        summary.innerHTML = '<div class="summary-item" style="font-size: 11px; color: #999;">Click to expand</div>';
        card.appendChild(summary);
        
        card.querySelector('.card-header').addEventListener('click', (e) => {
            e.stopPropagation();
            const importsData = {};
            imports.forEach((imp, idx) => {
                const prefix = imp.prefix ? ' (as ' + imp.prefix + ')' : '';
                const deferred = imp.isDeferred ? ' [deferred]' : '';
                importsData['[' + (idx + 1) + '] ' + imp.uri + prefix + deferred] = imp;
            });
            this.showDetailsPanel('IMPORTS (' + imports.length + ')', importsData);
        });
        
        this.container.appendChild(card);
    },

    addClassesCard(classes) {
        if (!classes || classes.length === 0) return;
        
        const card = this.createCard('CLASSES (' + classes.length + ')', 'classes');
        
        const summary = document.createElement('div');
        summary.className = 'card-summary';
        summary.innerHTML = '<div class="summary-item" style="font-size: 11px; color: #999;">Click to expand</div>';
        card.appendChild(summary);
        
        card.querySelector('.card-header').addEventListener('click', (e) => {
            e.stopPropagation();
            const classesData = {};
            classes.forEach((cls, idx) => {
                const abstract = cls.isAbstract ? '[abstract] ' : '';
                classesData['[' + (idx + 1) + '] ' + abstract + cls.name] = cls;
            });
            this.showDetailsPanel('CLASSES (' + classes.length + ')', classesData);
        });
        
        this.container.appendChild(card);
    },

    addFunctionsCard(functions) {
        if (!functions || functions.length === 0) return;
        
        const card = this.createCard('FUNCTIONS (' + functions.length + ')', 'functions');
        
        const summary = document.createElement('div');
        summary.className = 'card-summary';
        summary.innerHTML = '<div class="summary-item" style="font-size: 11px; color: #999;">Click to expand</div>';
        card.appendChild(summary);
        
        card.querySelector('.card-header').addEventListener('click', (e) => {
            e.stopPropagation();
            const functionsData = {};
            functions.forEach((func, idx) => {
                functionsData['[' + (idx + 1) + '] ' + func.name] = func;
            });
            this.showDetailsPanel('FUNCTIONS (' + functions.length + ')', functionsData);
        });
        
        this.container.appendChild(card);
    },

    addVariablesCard(variables) {
        if (!variables || variables.length === 0) return;
        
        const card = this.createCard('VARIABLES (' + variables.length + ')', 'variables');
        
        const summary = document.createElement('div');
        summary.className = 'card-summary';
        summary.innerHTML = '<div class="summary-item" style="font-size: 11px; color: #999;">Click to expand</div>';
        card.appendChild(summary);
        
        card.querySelector('.card-header').addEventListener('click', (e) => {
            e.stopPropagation();
            const variablesData = {};
            variables.forEach((v, idx) => {
                variablesData['[' + (idx + 1) + '] ' + v.name] = v;
            });
            this.showDetailsPanel('VARIABLES (' + variables.length + ')', variablesData);
        });
        
        this.container.appendChild(card);
    },

    createCard(title, id) {
        const card = document.createElement('div');
        card.className = 'left-detail-card';
        card.id = 'card-' + id;
        
        const header = document.createElement('div');
        header.className = 'card-header';
        header.innerHTML = '<span class="card-toggle">▶</span>' +
            '<span class="card-title">' + escapeHtml(title) + '</span>';

        header.addEventListener('click', () => {
            const toggle = header.querySelector('.card-toggle');
            toggle.textContent = toggle.textContent === '▶' ? '▼' : '▶';
        });

        card.appendChild(header);
        return card;
    },

    showDetailsPanel(title, data) {
        if (this.currentExpanded) {
            this.currentExpanded.remove();
            this.currentExpanded = null;
        }
        
        const allToggles = this.container.querySelectorAll('.card-toggle');
        allToggles.forEach(t => (t.textContent = '▶'));

        const cardTitles = this.container.querySelectorAll('.card-title');
        for (const el of cardTitles) {
            if (el.textContent === title) {
                const toggle = el.parentNode.querySelector('.card-toggle');
                if (toggle) toggle.textContent = '▼';
                break;
            }
        }

        const panel = document.createElement('div');
        panel.className = 'left-expanded-panel';
        
        const header = document.createElement('div');
        header.className = 'expanded-header';
        header.innerHTML = '<span class="expanded-title">' + escapeHtml(title) + '</span>' +
            '<button class="expanded-close" onclick="leftDetailsPanel.closePanel()">✕</button>';
        panel.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'expanded-content';
        content.innerHTML = formatDetailsHTML(data);
        panel.appendChild(content);
        
        this.container.appendChild(panel);
        this.currentExpanded = panel;
        
        setTimeout(() => {
            panel.scrollIntoView({ behavior: 'smooth' });
        }, 10);
    },

    closePanel() {
        if (this.currentExpanded) {
            this.currentExpanded.remove();
            this.currentExpanded = null;
        }
        const allToggles = this.container.querySelectorAll('.card-toggle');
        allToggles.forEach(t => (t.textContent = '▶'));
    },

    clear() {
        if (this.container) {
            const allChildren = Array.from(this.container.children);
            allChildren.forEach(child => child.remove());
            this.currentExpanded = null;
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        leftDetailsPanel.init();
    });
} else {
    leftDetailsPanel.init();
}

// ============================================================================
// ANALYSIS: Process and display results
// ============================================================================

function startProgressiveAnalysisWithLeftPanel(analysis) {
    console.log('Starting analysis display...');
    console.log('Analysis object:', analysis);
    
    if (!analysis || !analysis.success) {
        const errorMsg = analysis?.error || 'Analysis failed';
        analysisContent.innerHTML = '<div class="empty-state" style="color: #f44336;">ERROR: ' + escapeHtml(errorMsg) + '</div>';
        addError('ANALYSIS_FAILED', errorMsg, analysis);
        return;
    }
    
    diagnosticBox.style.display = 'block';
    showDiagnostics(analysis);
    
    leftDetailsPanel.clear();
    const fileInfo = analysis.fileInfo || {};
    const stats = analysis.statistics || {};
    const rawData = analysis.rawData || {};
    
    console.log('Raw data:', rawData);
    
    const rawImports = rawData.imports || [];
    const rawClasses = rawData.classes || [];
    const rawFunctions = rawData.functions || [];
    const rawVariables = rawData.variables || [];
    
    console.log('Imports:', rawImports.length, 'Classes:', rawClasses.length, 'Functions:', rawFunctions.length);
    
    leftDetailsPanel.addFileInfoCard(fileInfo);
    leftDetailsPanel.addStatisticsCard(stats);
    if (rawImports.length > 0) leftDetailsPanel.addImportsCard(rawImports);
    if (rawClasses.length > 0) leftDetailsPanel.addClassesCard(rawClasses);
    if (rawFunctions.length > 0) leftDetailsPanel.addFunctionsCard(rawFunctions);
    if (rawVariables.length > 0) leftDetailsPanel.addVariablesCard(rawVariables);
    
    analysisLines = generateAnalysisLines(analysis);
    currentLineIndex = 0;
    displayProgressiveAnalysis();
}

function generateAnalysisLines(analysis) {
    const lines = [];
    const stats = analysis.statistics || {};
    const fileInfo = analysis.fileInfo || {};
    const rawData = analysis.rawData || {};
    
    lines.push({ type: 'header', text: 'FILE INFORMATION', status: 'ok' });
    lines.push({ type: 'info', text: 'Library: ' + (fileInfo.library || 'unknown'), status: 'ok' });
    lines.push({ type: 'info', text: 'Size: ' + ((fileInfo.totalBytes || 0) / 1024).toFixed(1) + ' KB', status: 'ok' });
    
    lines.push({ type: 'header', text: 'STATISTICS', status: 'ok' });
    lines.push({ type: 'info', text: 'Classes: ' + (stats.classes || 0), status: 'ok' });
    lines.push({ type: 'info', text: 'Functions: ' + (stats.functions || 0), status: 'ok' });
    lines.push({ type: 'info', text: 'Variables: ' + (stats.variables || 0), status: 'ok' });
    lines.push({ type: 'info', text: 'Imports: ' + (stats.imports || 0), status: 'ok' });
    
    const rawImports = rawData.imports || [];
    if (rawImports.length > 0) {
        lines.push({ type: 'header', text: 'IMPORTS (' + rawImports.length + ')', status: 'ok' });
        rawImports.slice(0, 10).forEach((i, idx) => {
            lines.push({
                type: 'item',
                text: '├─ ' + (i.uri || 'unknown'),
                status: 'ok'
            });
        });
        if (rawImports.length > 10) {
            lines.push({ type: 'item', text: '└─ ... and ' + (rawImports.length - 10) + ' more', status: 'ok' });
        }
    }
    
    const rawClasses = rawData.classes || [];
    if (rawClasses.length > 0) {
        lines.push({ type: 'header', text: 'CLASSES (' + rawClasses.length + ')', status: 'ok' });
        rawClasses.slice(0, 10).forEach((c, idx) => {
            lines.push({
                type: 'item',
                text: '├─ ' + (c.name || 'unknown'),
                status: 'ok'
            });
        });
        if (rawClasses.length > 10) {
            lines.push({ type: 'item', text: '└─ ... and ' + (rawClasses.length - 10) + ' more', status: 'ok' });
        }
    }
    
    const rawFunctions = rawData.functions || [];
    if (rawFunctions.length > 0) {
        lines.push({ type: 'header', text: 'FUNCTIONS (' + rawFunctions.length + ')', status: 'ok' });
        rawFunctions.slice(0, 10).forEach((f, idx) => {
            lines.push({
                type: 'item',
                text: '├─ ' + (f.name || 'unknown'),
                status: 'ok'
            });
        });
        if (rawFunctions.length > 10) {
            lines.push({ type: 'item', text: '└─ ... and ' + (rawFunctions.length - 10) + ' more', status: 'ok' });
        }
    }
    
    const rawVariables = rawData.variables || [];
    if (rawVariables.length > 0) {
        lines.push({ type: 'header', text: 'VARIABLES (' + rawVariables.length + ')', status: 'ok' });
        rawVariables.slice(0, 10).forEach((v, idx) => {
            lines.push({
                type: 'item',
                text: '├─ ' + (v.name || 'unknown'),
                status: 'ok'
            });
        });
        if (rawVariables.length > 10) {
            lines.push({ type: 'item', text: '└─ ... and ' + (rawVariables.length - 10) + ' more', status: 'ok' });
        }
    }
    
    lines.push({ type: 'complete', text: 'ANALYSIS COMPLETE', status: 'ok' });
    return lines;
}

function displayProgressiveAnalysis() {
    if (currentLineIndex === 0) {
        analysisContent.innerHTML = '<div class="content-viewer" id="contentViewer"></div>';
    }
    
    const viewer = document.getElementById('contentViewer');
    if (!viewer) return;
    
    if (currentLineIndex < analysisLines.length) {
        const line = analysisLines[currentLineIndex];
        const lineEl = createLineElement(currentLineIndex + 1, line);
        viewer.appendChild(lineEl);
        
        const total = analysisLines.length;
        const percent = Math.round((currentLineIndex + 1) / total * 100);
        progressIndicator.textContent = (currentLineIndex + 1) + '/' + total + ' (' + percent + '%)';
        
        currentLineIndex++;
        const delay = line.type === 'header' ? 200 : 50;
        setTimeout(displayProgressiveAnalysis, delay);
        
        setTimeout(() => {
            viewer.scrollTop = viewer.scrollHeight;
        }, 10);
    } else {
        progressIndicator.textContent = 'Complete';
    }
}

function createLineElement(lineNum, line) {
    const div = document.createElement('div');
    div.className = 'content-line ' + line.status;
    
    const numEl = document.createElement('div');
    numEl.className = 'line-number';
    numEl.innerHTML = '<span>' + lineNum + '</span>';
    
    const statusEl = document.createElement('div');
    statusEl.className = 'line-status';
    const icon = document.createElement('div');
    icon.className = 'status-icon ' + line.status;
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

// ============================================================================
// UTILITIES: Helpers and formatters
// ============================================================================

function formatDetailsHTML(obj, depth = 0) {
    if (depth > 3) return '<span style="color: #999;">...</span>';
    
    let html = '<div class="details-tree">';
    
    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
            html += '<div class="detail-item">' +
                '<span class="detail-key">' + escapeHtml(key) + ':</span>' +
                '<span class="detail-value-null">null</span>' +
                '</div>';
        } else if (Array.isArray(value)) {
            html += '<div class="detail-item">' +
                '<span class="detail-key">' + escapeHtml(key) + ':</span>' +
                '<span class="detail-array-count">[' + value.length + ' items]</span>' +
                '</div>';
        } else if (typeof value === 'object') {
            html += '<div class="detail-item">' +
                '<span class="detail-key">' + escapeHtml(key) + ':</span>' +
                '<span class="detail-object">{...}</span>' +
                '</div>';
            html += formatDetailsHTML(value, depth + 1);
        } else {
            const strValue = escapeHtml(String(value));
            const displayValue = strValue.length > 200 ? strValue.substring(0, 200) + '...' : strValue;
            html += '<div class="detail-item">' +
                '<span class="detail-key">' + escapeHtml(key) + ':</span>' +
                '<span class="detail-value-string">"' + displayValue + '"</span>' +
                '</div>';
        }
    }
    
    html += '</div>';
    return html;
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function showDiagnostics(analysis) {
    diagnosticBox.style.display = 'block';
    const components = {
        'File Info': analysis.fileInfo,
        'Statistics': analysis.statistics,
        'Raw Data': analysis.rawData,
    };
    
    diagnosticItems.innerHTML = Object.entries(components).map(([name, value]) => {
        const ok = value !== null && value !== undefined;
        return '<div class="diagnostic-item">' +
            '<div class="diagnostic-status ' + (ok ? 'ok' : 'error') + '">' +
            (ok ? '✓' : '✕') +
            '</div>' +
            '<div style="flex: 1; font-size: 11px;">' + escapeHtml(name) + '</div>' +
            '</div>';
    }).join('');
}
''';
}