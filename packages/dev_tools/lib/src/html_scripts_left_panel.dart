class HtmlScriptsLeftPanel {
  static String getLeftPanelScript() => '''
// ============================================================================
// LEFT PANEL: Analysis Display & Left Panel Management
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
        header.innerHTML = '<span class="card-toggle">â–¶</span>' +
            '<span class="card-title">' + escapeHtml(title) + '</span>';

        header.addEventListener('click', () => {
            const toggle = header.querySelector('.card-toggle');
            toggle.textContent = toggle.textContent === 'â–¶' ? 'â–¼' : 'â–¶';
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
        allToggles.forEach(t => (t.textContent = 'â–¶'));

        const cardTitles = this.container.querySelectorAll('.card-title');
        for (const el of cardTitles) {
            if (el.textContent === title) {
                const toggle = el.parentNode.querySelector('.card-toggle');
                if (toggle) toggle.textContent = 'â–¼';
                break;
            }
        }

        const panel = document.createElement('div');
        panel.className = 'left-expanded-panel';
        
        const header = document.createElement('div');
        header.className = 'expanded-header';
        header.innerHTML = '<span class="expanded-title">' + escapeHtml(title) + '</span>' +
            '<button class="expanded-close" onclick="leftDetailsPanel.closePanel()">âœ•</button>';
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
        allToggles.forEach(t => (t.textContent = 'â–¶'));
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
