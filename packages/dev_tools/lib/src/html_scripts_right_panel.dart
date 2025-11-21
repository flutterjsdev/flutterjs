class HtmlScriptsRightPanel {
  static String getRightPanelScript() => '''
// ============================================================================
// LEFT PANEL: Premium Material 3 UI with Enhanced Visuals
// ============================================================================

const leftDetailsPanel = {
    container: null,
    currentExpanded: null,
    expandedAfter: null,
    debugLogs: [],
    errorLogs: [],

    iconMap: {
        document: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
        chart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5H17"/><path d="M3 12h4"/><path d="M20.5 12h.5"/></svg>',
        import: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        class: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
        function: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
        variable: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6m3-3H9"/></svg>'
    },

    init() {
        this.container = document.getElementById('leftDetailsPanel');
        if (!this.container) {
            console.error('Left details panel container not found');
            return;
        }
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.gap = '12px';
        console.log('Left panel initialized');
    },

    addFileInfoCard(fileInfo) {
        const card = this.createCard('FILE INFORMATION', 'file-info', 'document');
        
        const summary = document.createElement('div');
        summary.className = 'card-summary';
        summary.innerHTML = '<div class="summary-item">' +
            '<div class="summary-label-group">' +
            '<span class="summary-label">Library</span>' +
            '<span class="summary-sublabel">Source Package</span>' +
            '</div>' +
            '<span class="summary-value">' + escapeHtml((fileInfo.library || 'unknown').split('\\\\').pop()) + '</span>' +
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
            this.toggleDetailsPanel(card, 'FILE INFORMATION', {
                'Library': fileInfo.library || 'unknown',
                'File Path': fileInfo.filePath || 'N/A',
                'Size (Bytes)': fileInfo.totalBytes || 0,
                'Size (KB)': ((fileInfo.totalBytes || 0) / 1024).toFixed(1),
                'Content Hash': fileInfo.contentHash || 'N/A',
                'Last Modified': new Date().toLocaleString()
            }, 'document');
        });
        
        this.container.appendChild(card);
    },

    addStatisticsCard(stats) {
        const card = this.createCard('STATISTICS', 'statistics', 'chart');
        
        const summary = document.createElement('div');
        summary.className = 'card-summary';
        
        const statsGrid = document.createElement('div');
        statsGrid.className = 'stats-grid';
        statsGrid.innerHTML = '<div class="stat-item">' +
            '<span class="stat-icon">📦</span>' +
            '<span class="stat-value">' + (stats.classes || 0) + '</span>' +
            '<span class="stat-label">Classes</span>' +
            '</div>' +
            '<div class="stat-item">' +
            '<span class="stat-icon">⚙️</span>' +
            '<span class="stat-value">' + (stats.functions || 0) + '</span>' +
            '<span class="stat-label">Functions</span>' +
            '</div>' +
            '<div class="stat-item">' +
            '<span class="stat-icon">📋</span>' +
            '<span class="stat-value">' + (stats.variables || 0) + '</span>' +
            '<span class="stat-label">Variables</span>' +
            '</div>' +
            '<div class="stat-item">' +
            '<span class="stat-icon">📥</span>' +
            '<span class="stat-value">' + (stats.imports || 0) + '</span>' +
            '<span class="stat-label">Imports</span>' +
            '</div>';
        summary.appendChild(statsGrid);
        
        const issueCount = stats.analysisIssues || 0;
        if (issueCount > 0) {
            const issueAlert = document.createElement('div');
            issueAlert.className = 'issue-alert';
            issueAlert.innerHTML = '<span class="alert-icon">⚠️</span>' +
                '<span class="alert-text">' + issueCount + ' Analysis Issue' + (issueCount > 1 ? 's' : '') + ' Found</span>';
            summary.appendChild(issueAlert);
        }
        
        card.appendChild(summary);
        
        card.querySelector('.card-header').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDetailsPanel(card, 'STATISTICS', {
                'Classes': stats.classes || 0,
                'Total Methods': stats.totalMethods || 0,
                'Total Fields': stats.totalFields || 0,
                'Functions': stats.functions || 0,
                'Variables': stats.variables || 0,
                'Imports': stats.imports || 0,
                'Exports': stats.exports || 0,
                'Analysis Issues': stats.analysisIssues || 0
            }, 'chart');
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
            (imports.filter(i => i.isDeferred).length > 0 ? '<div class="indicator deferred">⏱️ Deferred</div>' : '') +
            (imports.filter(i => i.prefix).length > 0 ? '<div class="indicator prefixed">🏷️ Prefixed</div>' : '') +
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
            this.toggleDetailsPanel(card, 'IMPORTS (' + imports.length + ')', importsData, 'import');
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
            (abstractCount > 0 ? '<div class="indicator abstract">◇ ' + abstractCount + ' Abstract</div>' : '');
        summary.appendChild(classSummary);
        card.appendChild(summary);
        
        card.querySelector('.card-header').addEventListener('click', (e) => {
            e.stopPropagation();
            const classesData = {};
            classes.forEach((cls, idx) => {
                const abstract = cls.isAbstract ? '[abstract] ' : '';
                classesData['[' + (idx + 1) + '] ' + abstract + cls.name] = cls;
            });
            this.toggleDetailsPanel(card, 'CLASSES (' + classes.length + ')', classesData, 'class');
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
            this.toggleDetailsPanel(card, 'FUNCTIONS (' + functions.length + ')', functionsData, 'function');
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
            this.toggleDetailsPanel(card, 'VARIABLES (' + variables.length + ')', variablesData, 'variable');
        });
        
        this.container.appendChild(card);
    },

    createCard(title, id, icon) {
        const card = document.createElement('div');
        card.className = 'left-detail-card material-card';
        card.id = 'card-' + id;
        card.setAttribute('data-expanded', 'false');
        
        const header = document.createElement('div');
        header.className = 'card-header material-header';
        
        const iconSvg = this.iconMap[icon] || this.iconMap.document;
        
        header.innerHTML = '<div class="header-left">' +
            '<div class="card-icon">' + iconSvg + '</div>' +
            '<div class="header-content">' +
            '<span class="card-title">' + escapeHtml(title) + '</span>' +
            '</div>' +
            '</div>' +
            '<span class="card-toggle">›</span>';

        header.addEventListener('click', () => {
            const toggle = header.querySelector('.card-toggle');
            const isExpanded = card.getAttribute('data-expanded') === 'true';
            toggle.textContent = isExpanded ? '›' : '∨';
            card.setAttribute('data-expanded', !isExpanded);
            card.classList.toggle('expanded');
        });

        card.appendChild(header);
        return card;
    },

    toggleDetailsPanel(card, title, data, type) {
        const cardId = card.id;
        const isCurrentlyExpanded = this.expandedAfter && this.expandedAfter.getAttribute('data-for-card') === cardId;
        
        if (this.expandedAfter) {
            const prevCardId = this.expandedAfter.getAttribute('data-for-card');
            const prevCard = document.getElementById(prevCardId);
            if (prevCard) {
                prevCard.setAttribute('data-expanded', 'false');
                prevCard.classList.remove('expanded');
                prevCard.querySelector('.card-toggle').textContent = '›';
            }
            this.expandedAfter.remove();
            this.expandedAfter = null;
        }
        
        if (isCurrentlyExpanded) {
            card.setAttribute('data-expanded', 'false');
            card.classList.remove('expanded');
            card.querySelector('.card-toggle').textContent = '›';
            return;
        }
        
        const panel = document.createElement('div');
        panel.className = 'left-expanded-panel material-panel';
        panel.setAttribute('data-for-card', cardId);
        
        const header = document.createElement('div');
        header.className = 'expanded-header material-expanded-header';
        header.innerHTML = '<div class="expanded-header-content">' +
            '<span class="expanded-title">' + escapeHtml(title) + '</span>' +
            '<span class="expanded-type-badge">' + (type || 'info') + '</span>' +
            '</div>' +
            '<button class="expanded-close material-close">✕</button>';
        
        const closeBtn = header.querySelector('.expanded-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closePanel(cardId);
        });
        
        panel.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'expanded-content material-content';
        content.innerHTML = formatDetailsHTML(data);
        panel.appendChild(content);
        
        card.parentNode.insertBefore(panel, card.nextSibling);
        this.expandedAfter = panel;
        this.currentExpanded = panel;
        
        card.setAttribute('data-expanded', 'true');
        card.classList.add('expanded');
        card.querySelector('.card-toggle').textContent = '∨';
        
        setTimeout(() => {
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
    },

    closePanel(cardId) {
        if (this.expandedAfter) {
            if (cardId) {
                const card = document.getElementById(cardId);
                if (card) {
                    card.setAttribute('data-expanded', 'false');
                    card.classList.remove('expanded');
                    card.querySelector('.card-toggle').textContent = '›';
                }
            }
            this.expandedAfter.remove();
            this.expandedAfter = null;
        }
        this.currentExpanded = null;
    },

    clear() {
        if (this.container) {
            const allChildren = Array.from(this.container.children);
            allChildren.forEach(child => child.remove());
            this.currentExpanded = null;
            this.expandedAfter = null;
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
