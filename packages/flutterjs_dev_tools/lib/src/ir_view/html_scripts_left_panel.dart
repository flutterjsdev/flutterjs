// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

class HtmlScriptsLeftPanel {
  static String getLeftPanelScript() => '''
// ============================================================================
// RIGHT PANEL: Progressive Analysis Display - Material 3 Advanced UI
// ============================================================================

let analysisState = {
    totalLines: 0,
    processedLines: 0,
    successCount: 0,
    warningCount: 0,
    errorCount: 0,
    startTime: null,
    endTime: null
};

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
    analysisState.totalLines = analysisLines.length;
    analysisState.startTime = Date.now();
    analysisState.processedLines = 0;
    analysisState.successCount = 0;
    analysisState.warningCount = 0;
    analysisState.errorCount = 0;
    
    currentLineIndex = 0;
    displayProgressiveAnalysis();
}

function generateAnalysisLines(analysis) {
    const lines = [];
    const stats = analysis.statistics || {};
    const fileInfo = analysis.fileInfo || {};
    const rawData = analysis.rawData || {};
    
    lines.push({ type: 'header', text: 'FILE INFORMATION', status: 'ok', section: 'info' });
    lines.push({ type: 'info', text: 'Library: ' + (fileInfo.library || 'unknown'), status: 'ok', section: 'info' });
    lines.push({ type: 'info', text: 'Size: ' + ((fileInfo.totalBytes || 0) / 1024).toFixed(1) + ' KB', status: 'ok', section: 'info' });
    lines.push({ type: 'info', text: 'Hash: ' + ((fileInfo.contentHash || 'N/A').substring(0, 16) + '...'), status: 'ok', section: 'info' });
    
    lines.push({ type: 'header', text: 'STATISTICS', status: 'ok', section: 'stats' });
    lines.push({ type: 'info', text: 'Classes: ' + (stats.classes || 0), status: 'ok', section: 'stats' });
    lines.push({ type: 'info', text: 'Functions: ' + (stats.functions || 0), status: 'ok', section: 'stats' });
    lines.push({ type: 'info', text: 'Variables: ' + (stats.variables || 0), status: 'ok', section: 'stats' });
    lines.push({ type: 'info', text: 'Imports: ' + (stats.imports || 0), status: 'ok', section: 'stats' });
    
    const rawImports = rawData.imports || [];
    if (rawImports.length > 0) {
        lines.push({ type: 'header', text: 'IMPORTS (' + rawImports.length + ')', status: 'ok', section: 'imports' });
        rawImports.slice(0, 10).forEach((i, idx) => {
            lines.push({
                type: 'item',
                text: '├─ ' + (i.uri || 'unknown'),
                status: 'ok',
                section: 'imports'
            });
            analysisState.successCount++;
        });
        if (rawImports.length > 10) {
            lines.push({ type: 'item', text: '└─ ... and ' + (rawImports.length - 10) + ' more', status: 'ok', section: 'imports' });
        }
    }
    
    const rawClasses = rawData.classes || [];
    if (rawClasses.length > 0) {
        lines.push({ type: 'header', text: 'CLASSES (' + rawClasses.length + ')', status: 'ok', section: 'classes' });
        rawClasses.slice(0, 10).forEach((c, idx) => {
            lines.push({
                type: 'item',
                text: '├─ ' + (c.name || 'unknown'),
                status: 'ok',
                section: 'classes'
            });
            analysisState.successCount++;
        });
        if (rawClasses.length > 10) {
            lines.push({ type: 'item', text: '└─ ... and ' + (rawClasses.length - 10) + ' more', status: 'ok', section: 'classes' });
        }
    }
    
    const rawFunctions = rawData.functions || [];
    if (rawFunctions.length > 0) {
        lines.push({ type: 'header', text: 'FUNCTIONS (' + rawFunctions.length + ')', status: 'ok', section: 'functions' });
        rawFunctions.slice(0, 10).forEach((f, idx) => {
            lines.push({
                type: 'item',
                text: '├─ ' + (f.name || 'unknown'),
                status: 'ok',
                section: 'functions'
            });
            analysisState.successCount++;
        });
        if (rawFunctions.length > 10) {
            lines.push({ type: 'item', text: '└─ ... and ' + (rawFunctions.length - 10) + ' more', status: 'ok', section: 'functions' });
        }
    }
    
    const rawVariables = rawData.variables || [];
    if (rawVariables.length > 0) {
        lines.push({ type: 'header', text: 'VARIABLES (' + rawVariables.length + ')', status: 'ok', section: 'variables' });
        rawVariables.slice(0, 10).forEach((v, idx) => {
            lines.push({
                type: 'item',
                text: '├─ ' + (v.name || 'unknown'),
                status: 'ok',
                section: 'variables'
            });
            analysisState.successCount++;
        });
        if (rawVariables.length > 10) {
            lines.push({ type: 'item', text: '└─ ... and ' + (rawVariables.length - 10) + ' more', status: 'ok', section: 'variables' });
        }
    }
    
    lines.push({ type: 'complete', text: 'ANALYSIS COMPLETE', status: 'ok', section: 'complete' });
    return lines;
}

function displayProgressiveAnalysis() {
    if (currentLineIndex === 0) {
        analysisContent.innerHTML = '<div class="progressive-viewer" id="contentViewer"></div><div class="analysis-footer" id="analysisFooter"></div>';
        updateAnalysisProgress();
    }
    
    const viewer = document.getElementById('contentViewer');
    if (!viewer) return;
    
    if (currentLineIndex < analysisLines.length) {
        const line = analysisLines[currentLineIndex];
        const lineEl = createLineElement(currentLineIndex + 1, line);
        viewer.appendChild(lineEl);
        
        analysisState.processedLines = currentLineIndex + 1;
        updateAnalysisProgress();
        
        currentLineIndex++;
        const delay = line.type === 'header' ? 200 : 50;
        setTimeout(displayProgressiveAnalysis, delay);
        
        setTimeout(() => {
            viewer.scrollTop = viewer.scrollHeight;
        }, 10);
    } else {
        analysisState.endTime = Date.now();
        progressIndicator.textContent = 'Complete';
        updateAnalysisFooter();
    }
}

function createLineElement(lineNum, line) {
    const div = document.createElement('div');
    div.className = 'content-line material-line ' + line.status + ' line-type-' + line.type;
    
    const numEl = document.createElement('div');
    numEl.className = 'line-number material-line-number';
    numEl.innerHTML = '<span>' + lineNum + '</span>';
    
    const statusEl = document.createElement('div');
    statusEl.className = 'line-status material-line-status';
    const icon = document.createElement('div');
    icon.className = 'status-icon material-status-icon ' + line.status;
    icon.textContent = getStatusIcon(line.status);
    statusEl.appendChild(icon);
    
    const contentEl = document.createElement('div');
    contentEl.className = 'line-content material-line-content';
    
    if (line.type === 'header') {
        contentEl.classList.add('header-line');
        contentEl.innerHTML = '<strong>' + escapeHtml(line.text) + '</strong>';
    } else if (line.type === 'item') {
        contentEl.classList.add('item-line');
        contentEl.textContent = line.text;
    } else {
        contentEl.textContent = line.text;
    }
    
    div.appendChild(numEl);
    div.appendChild(statusEl);
    div.appendChild(contentEl);
    
    return div;
}

function updateAnalysisProgress() {
    const footer = document.getElementById('analysisFooter');
    if (!footer) return;
    
    const total = analysisState.totalLines;
    const processed = analysisState.processedLines;
    const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
    const elapsed = analysisState.startTime ? Date.now() - analysisState.startTime : 0;
    const estimatedTotal = elapsed > 0 ? Math.round((elapsed / (processed || 1)) * total) : 0;
    const remaining = Math.max(0, estimatedTotal - elapsed);
    
    let timeStr = formatTime(remaining);
    
    footer.innerHTML = '<div class="progress-container">' +
        '<div class="progress-header">' +
        '<span class="progress-title">Analysis Progress</span>' +
        '<span class="progress-percent">' + percent + '%</span>' +
        '</div>' +
        '<div class="progress-bar-wrapper">' +
        '<div class="progress-bar-bg">' +
        '<div class="progress-bar-fill" style="width: ' + percent + '%"></div>' +
        '</div>' +
        '</div>' +
        '<div class="progress-stats">' +
        '<div class="stat"><span class="stat-label">Processed:</span><span class="stat-value">' + processed + '/' + total + '</span></div>' +
        '<div class="stat"><span class="stat-label">Remaining:</span><span class="stat-value">' + timeStr + '</span></div>' +
        '<div class="stat"><span class="stat-label">Elapsed:</span><span class="stat-value">' + formatTime(elapsed) + '</span></div>' +
        '</div>' +
        '</div>';
}

function updateAnalysisFooter() {
    const footer = document.getElementById('analysisFooter');
    if (!footer) return;
    
    const total = analysisState.totalLines;
    const processed = analysisState.processedLines;
    const elapsed = analysisState.endTime ? analysisState.endTime - analysisState.startTime : 0;
    const speed = elapsed > 0 ? Math.round((processed / elapsed) * 1000) : 0;
    
    footer.innerHTML = '<div class="completion-container">' +
        '<div class="completion-header">' +
        '<span class="completion-icon">✓</span>' +
        '<span class="completion-title">Analysis Complete</span>' +
        '</div>' +
        '<div class="completion-stats">' +
        '<div class="completion-stat">' +
        '<span class="completion-stat-label">Total Lines</span>' +
        '<span class="completion-stat-value">' + total + '</span>' +
        '</div>' +
        '<div class="completion-stat">' +
        '<span class="completion-stat-label">Processing Time</span>' +
        '<span class="completion-stat-value">' + formatTime(elapsed) + '</span>' +
        '</div>' +
        '<div class="completion-stat">' +
        '<span class="completion-stat-label">Speed</span>' +
        '<span class="completion-stat-value">' + speed + ' lines/sec</span>' +
        '</div>' +
        '</div>' +
        '</div>';
}

function formatTime(ms) {
    if (ms < 1000) return Math.round(ms) + 'ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
    return (ms / 60000).toFixed(1) + 'm';
}
''';
}
