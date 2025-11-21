class HtmlScriptsUtilities {
  static String getUtilitiesScript() => '''
// ============================================================================
// UTILITIES: Helpers and formatters (Shared)
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
            (ok ? '&#10004;' : '&#10006;') +
            '</div>' +
            '<div style="flex: 1; font-size: 11px;">' + escapeHtml(name) + '</div>' +
            '</div>';
    }).join('');
}
''';
}
