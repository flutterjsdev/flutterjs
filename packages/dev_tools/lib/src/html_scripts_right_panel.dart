class HtmlScriptsRightPanel {
  static String getRightPanelScript() => '''
// ============================================================================
// RIGHT PANEL: Progressive Analysis Display
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
                text: 'â"œâ"€ ' + (i.uri || 'unknown'),
                status: 'ok'
            });
        });
        if (rawImports.length > 10) {
            lines.push({ type: 'item', text: 'â""â"€ ... and ' + (rawImports.length - 10) + ' more', status: 'ok' });
        }
    }
    
    const rawClasses = rawData.classes || [];
    if (rawClasses.length > 0) {
        lines.push({ type: 'header', text: 'CLASSES (' + rawClasses.length + ')', status: 'ok' });
        rawClasses.slice(0, 10).forEach((c, idx) => {
            lines.push({
                type: 'item',
                text: 'â"œâ"€ ' + (c.name || 'unknown'),
                status: 'ok'
            });
        });
        if (rawClasses.length > 10) {
            lines.push({ type: 'item', text: 'â""â"€ ... and ' + (rawClasses.length - 10) + ' more', status: 'ok' });
        }
    }
    
    const rawFunctions = rawData.functions || [];
    if (rawFunctions.length > 0) {
        lines.push({ type: 'header', text: 'FUNCTIONS (' + rawFunctions.length + ')', status: 'ok' });
        rawFunctions.slice(0, 10).forEach((f, idx) => {
            lines.push({
                type: 'item',
                text: 'â"œâ"€ ' + (f.name || 'unknown'),
                status: 'ok'
            });
        });
        if (rawFunctions.length > 10) {
            lines.push({ type: 'item', text: 'â""â"€ ... and ' + (rawFunctions.length - 10) + ' more', status: 'ok' });
        }
    }
    
    const rawVariables = rawData.variables || [];
    if (rawVariables.length > 0) {
        lines.push({ type: 'header', text: 'VARIABLES (' + rawVariables.length + ')', status: 'ok' });
        rawVariables.slice(0, 10).forEach((v, idx) => {
            lines.push({
                type: 'item',
                text: 'â"œâ"€ ' + (v.name || 'unknown'),
                status: 'ok'
            });
        });
        if (rawVariables.length > 10) {
            lines.push({ type: 'item', text: 'â""â"€ ... and ' + (rawVariables.length - 10) + ' more', status: 'ok' });
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
''';
}
