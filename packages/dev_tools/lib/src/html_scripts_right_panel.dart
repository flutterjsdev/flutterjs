class HtmlScriptsLeftPanel {
  static String getLeftPanelScript() => '''
// ============================================================================
// LEFT PANEL: Advanced Material 3 UI with Debug & Error Progress
// ============================================================================

const diagnosticItems = document.getElementById('diagnosticItems');

const leftDetailsPanel = {
    container: null,
    currentExpanded: null,
    debugLogs: [],
    errorLogs: [],

    init() {
        this.container = document.getElementById('leftDetailsPanel');
        if (!this.container) {
            console.error('Left details panel container not found');
            return;
        }
        console.log('Left panel initialized');
    },

    addFileInfoCard(fileInfo) {
        const card = this.createCard('FILE INFORMATION', 'file-info', 'file');
        
        const summary = document.createElement('div');
        summary.className = 'card-summary';
        summary.innerHTML = '<div class="summary-item">' +
            '<div class="summary-label-group">' +
            '<span class="summary-label">Library</span>' +
            '<span class="summary-sublabel">Source Package</span>' +
            '</div>' +
            '<span class="summary-value">' + escapeHtml((fileInfo.library || 'unknown').split('\\\\\\\\').pop()) + '</span>' +
            '</div>' +
            '<div class="summary-item">' +
            '<div class="summary-label-group">' +
            '<span class="summary-label">File Size</span>' +
            '<span class="summary-sublabel">Total bytes</span>' +
            '</div>' +
            '<span class="summary-value-badge">' + ((fileInfo.totalBytes || 0) / 1024).toFixed(1) + ' KB</span>' +
            '</div>';
        card.appendChild(summary);
        
        card.querySelector('.card-header').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showDetailsPanel('FILE INFORMATION', {
                'Library': fileInfo.library || 'unknown',
                'File Path': fileInfo.filePath || 'N/A',
                'Size (Bytes)': fileInfo.totalBytes || 0,
                'Size (KB)': ((fileInfo.totalBytes || 0) / 1024).toFixed(1),
                'Content Hash': fileInfo.contentHash || 'N/A',
                'Last Modified': new Date().toLocaleString()
            }, 'file');
        });
        
        this.container.appendChild(card);
    },

    addStatisticsCard(stats) {
        const card = this.createCard('STATISTICS', 'statistics', 'stats');
        
        const summary = document.createElement('div');
        summary.className = 'card-summary';
        
        const statsGrid = document.createElement('div');
        statsGrid.className = 'stats-grid';
        statsGrid.innerHTML = '<div class="stat-item">' +
            '<span class="stat-value">' + (stats.classes || 0) + '</span>' +
            '<span class="stat-label">Classes</span>' +
            '</div>' +
            '<div class="stat-item">' +
            '<span class="stat-value">' + (stats.functions || 0) + '</span>' +
            '<span class="stat-label">Functions</span>' +
            '</div>' +
            '<div class="stat-item">' +
            '<span class="stat-value">' + (stats.variables || 0) + '</span>' +
            '<span class="stat-label">Variables</span>' +
            '</div>' +
            '<div class="stat-item">' +
            '<span class="stat-value">' + (stats.imports || 0) + '</span>' +
            '<span class="stat-label">Imports</span>' +
            '</div>';
        summary.appendChild(statsGrid);
        
        const issueCount = stats.analysisIssues || 0;
        if (issueCount > 0) {
            const issueAlert = document.createElement('div');
            issueAlert.className = 'issue-alert';
            issueAlert.innerHTML = '<span class="alert-icon">⚠</span>' +
                '<span class="alert-text">' + issueCount + ' Analysis Issue' + (issueCount > 1 ? 's' : '') + ' Found</span>';
            summary.appendChild(issueAlert);
        }
        
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
            }, 'stats');
        });
        
        this.container.appendChild(card);
    },

    addImportsCard(imports) {
        if (!imports || imports.length === 0) return;
        
        const card = this.createCard('IMPORTS (' + imports.length + ')', 'imports', 'import');
        
        const summary = document.createElement('div');
        summary.className = 'card-summary';
        const importSummary = document.createElement('div');
        importSummary.className = 'import-summary';
        importSummary.innerHTML = '<div class="summary-stat">' +
            '<span class="stat-badge">' + imports.length + '</span>' +
            '<span>Total Imports</span>' +
            '</div>' +
            '<div class="import-indicators">' +
            (imports.filter(i => i.isDeferred).length > 0 ? '<div class="indicator deferred"><span>⏱</span> Deferred</div>' : '') +
            (imports.filter(i => i.prefix).length > 0 ? '<div class="indicator prefixed"><span>→</span> Prefixed</div>' : '') +
            '</div>';
        summary.appendChild(importSummary);
        card.appendChild(summary);
        
        card.querySelector('.card-header').addEventListener('click', (e) => {
            e.stopPropagation();
            const importsData = {};
            imports.forEach((imp, idx) => {
                const prefix = imp.prefix ? ' (as ' + imp.prefix + ')' : '';
                const deferred = imp.isDeferred ? ' [deferred]' : '';
                importsData['[' + (idx + 1) + '] ' + imp.uri + prefix + deferred] = imp;
            });
            this.showDetailsPanel('IMPORTS (' + imports.length + ')', importsData, 'import');
        });
        
        this.container.appendChild(card);
    },

    addClassesCard(classes) {
        if (!classes || classes.length === 0) return;
        
        const card = this.createCard('CLASSES (' + classes.length + ')', 'classes', 'class');
        
        const summary = document.createElement('div');
        summary.className = 'card-summary';
        const abstractCount = classes.filter(c => c.isAbstract).length;
        
        const classSummary = document.createElement('div');
        classSummary.className = 'class-summary';
        classSummary.innerHTML = '<div class="summary-stat">' +
            '<span class="stat-badge">' + classes.length + '</span>' +
            '<span>Total Classes</span>' +
            '</div>' +
            (abstractCount > 0 ? '<div class="indicator abstract"><span>◆</span> ' + abstractCount + ' Abstract</div>' : '');
        summary.appendChild(classSummary);
        card.appendChild(summary);
        
        card.querySelector('.card-header').addEventListener('click', (e) => {
            e.stopPropagation();
            const classesData = {};
            classes.forEach((cls, idx) => {
                const abstract = cls.isAbstract ? '[abstract] ' : '';
                classesData['[' + (idx + 1) + '] ' + abstract + cls.name] = cls;
            });
            this.showDetailsPanel('CLASSES (' + classes.length + ')', classesData, 'class');
        });
        
        this.container.appendChild(card);
    },

    addFunctionsCard(functions) {
        if (!functions || functions.length === 0) return;
        
        const card = this.createCard('FUNCTIONS (' + functions.length + ')', 'functions', 'function');
        
        const summary = document.createElement('div');
        summary.className = 'card-summary';
        
        const funcSummary = document.createElement('div');
        funcSummary.className = 'function-summary';
        funcSummary.innerHTML = '<div class="summary-stat">' +
            '<span class="stat-badge">' + functions.length + '</span>' +
            '<span>Total Functions</span>' +
            '</div>';
        summary.appendChild(funcSummary);
        card.appendChild(summary);
        
        card.querySelector('.card-header').addEventListener('click', (e) => {
            e.stopPropagation();
            const functionsData = {};
            functions.forEach((func, idx) => {
                functionsData['[' + (idx + 1) + '] ' + func.name] = func;
            });
            this.showDetailsPanel('FUNCTIONS (' + functions.length + ')', functionsData, 'function');
        });
        
        this.container.appendChild(card);
    },

    addVariablesCard(variables) {
        if (!variables || variables.length === 0) return;
        
        const card = this.createCard('VARIABLES (' + variables.length + ')', 'variables', 'variable');
        
        const summary = document.createElement('div');
        summary.className = 'card-summary';
        
        const varSummary = document.createElement('div');
        varSummary.className = 'variable-summary';
        varSummary.innerHTML = '<div class="summary-stat">' +
            '<span class="stat-badge">' + variables.length + '</span>' +
            '<span>Total Variables</span>' +
            '</div>';
        summary.appendChild(varSummary);
        card.appendChild(summary);
        
        card.querySelector('.card-header').addEventListener('click', (e) => {
            e.stopPropagation();
            const variablesData = {};
            variables.forEach((v, idx) => {
                variablesData['[' + (idx + 1) + '] ' + v.name] = v;
            });
            this.showDetailsPanel('VARIABLES (' + variables.length + ')', variablesData, 'variable');
        });
        
        this.container.appendChild(card);
    },

    createCard(title, id, icon) {
        const card = document.createElement('div');
        card.className = 'left-detail-card material-card';
        card.id = 'card-' + id;
        
        const header = document.createElement('div');
        header.className = 'card-header material-header';
        const iconMap = {
            'file': '📄',
            'stats': '📊',
            'import': '📥',
            'class': '🏛',
            'function': '⚙',
            'variable': '📝'
        };
        
        header.innerHTML = '<div class="header-left">' +
            '<span class="card-icon">' + (iconMap[icon] || '▶') + '</span>' +
            '<div class="header-content">' +
            '<span class="card-title">' + escapeHtml(title) + '</span>' +
            '</div>' +
            '</div>' +
            '<span class="card-toggle">▶</span>';

        header.addEventListener('click', () => {
            const toggle = header.querySelector('.card-toggle');
            const isExpanded = toggle.textContent === '▼';
            toggle.textContent = isExpanded ? '▶' : '▼';
            card.classList.toggle('expanded');
        });

        card.appendChild(header);
        return card;
    },

    showDetailsPanel(title, data, type) {
        if (this.currentExpanded) {
            this.currentExpanded.remove();
            this.currentExpanded = null;
        }
        
        const allToggles = this.container.querySelectorAll('.card-toggle');
        allToggles.forEach(t => (t.textContent = '▶'));

        const cardTitles = this.container.querySelectorAll('.card-title');
        for (const el of cardTitles) {
            if (el.textContent === title) {
                const toggle = el.closest('.card-header').querySelector('.card-toggle');
                if (toggle) toggle.textContent = '▼';
                break;
            }
        }

        const panel = document.createElement('div');
        panel.className = 'left-expanded-panel material-panel';
        
        const header = document.createElement('div');
        header.className = 'expanded-header material-expanded-header';
        header.innerHTML = '<div class="expanded-header-content">' +
            '<span class="expanded-title">' + escapeHtml(title) + '</span>' +
            '<span class="expanded-type-badge">' + (type || 'info') + '</span>' +
            '</div>' +
            '<button class="expanded-close material-close" onclick="leftDetailsPanel.closePanel()">✕</button>';
        panel.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'expanded-content material-content';
        content.innerHTML = formatDetailsHTML(data);
        panel.appendChild(content);
        
        this.container.appendChild(panel);
        this.currentExpanded = panel;
        
        setTimeout(() => {
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
''';
}