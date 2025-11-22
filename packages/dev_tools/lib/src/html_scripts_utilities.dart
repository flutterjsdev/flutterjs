class HtmlScriptsUtilities {
  static String getUtilitiesScript() => '''
// ============================================================================
// UTILITIES: Helpers and formatters (Shared)
// ============================================================================


function formatDetailsHTML(obj, depth = 0, parentKey = '') {
    if (depth > 5) return '<span style="color: #999;">...</span>';
    
    let html = '<div class="details-tree">';
    
    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
            html += createDetailItem(key, 'null', null, depth);
        } else if (Array.isArray(value)) {
            if (value.length === 0) {
                html += createDetailItem(key, 'array-empty', [], depth);
            } else if (typeof value[0] === 'object' && value[0] !== null) {
                // Array of objects - create expandable section
                html += createExpandableArraySection(key, value, depth);
            } else {
                // Array of primitives
                html += createDetailItem(key, 'array', value, depth);
            }
        } else if (typeof value === 'object') {
            // Object - create expandable section
            html += createExpandableObjectSection(key, value, depth);
        } else if (typeof value === 'string') {
            html += createDetailItem(key, 'string', value, depth);
        } else if (typeof value === 'number') {
            html += createDetailItem(key, 'number', value, depth);
        } else if (typeof value === 'boolean') {
            html += createDetailItem(key, 'boolean', value, depth);
        } else {
            html += createDetailItem(key, 'unknown', value, depth);
        }
    }
    
    html += '</div>';
    return html;
}

function createDetailItem(key, type, value, depth) {
    const keyClass = 'detail-key';
    const depthClass = `data-depth="\${depth}"`;
    
    let valueHtml = '';
    
    switch(type) {
        case 'null':
            valueHtml = '<span class="detail-value-null">null</span>';
            break;
        case 'string':
            const displayStr = escapeHtml(String(value)).length > 150 
                ? escapeHtml(String(value)).substring(0, 150) + '...' 
                : escapeHtml(String(value));
            valueHtml = `<span class="detail-value-string">"\${displayStr}"</span>`;
            break;
        case 'number':
            valueHtml = `<span class="detail-value-number">\${value}</span>`;
            break;
        case 'boolean':
            valueHtml = `<span class="detail-value-number">\${value}</span>`;
            break;
        case 'array':
            valueHtml = `<span class="detail-array-count">[\${value.length} items]</span>`;
            break;
        case 'array-empty':
            valueHtml = `<span class="detail-array-count">[empty]</span>`;
            break;
        default:
            valueHtml = '<span class="detail-value-unknown">unknown</span>';
    }
    
    return `<div class="detail-item" \${depthClass}>
        <span class="\${keyClass}">\${escapeHtml(key)}:</span>
        \${valueHtml}
    </div>`;
}

function createExpandableArraySection(key, arrayValue, depth) {
    const sectionId = `array-\${key}-\${Math.random().toString(36).substr(2, 9)}`;
    const itemsHtml = arrayValue.map((item, idx) => {
        if (typeof item === 'object' && item !== null) {
            return formatObjectAsTreeItem(item, idx, depth + 1);
        } else {
            return `<div class="detail-item array-item" data-depth="\${depth + 1}">
                <span class="detail-index">[\${idx}]</span>
                <span class="detail-value-string">\${escapeHtml(String(item))}</span>
            </div>`;
        }
    }).join('');
    
    return `<div class="detail-item" data-depth="\${depth}">
        <span class="detail-toggle" onclick="toggleArraySection('\${sectionId}')">▶</span>
        <span class="detail-key">\${escapeHtml(key)}:</span>
        <span class="detail-array-count">[\${arrayValue.length} items]</span>
    </div>
    <div id="\${sectionId}" class="detail-nested array-tree" style="display: none;">
        \${itemsHtml}
    </div>`;
}

function createExpandableObjectSection(key, objValue, depth) {
    const sectionId = `obj-\${key}-\${Math.random().toString(36).substr(2, 9)}`;
    const objHtml = formatDetailsHTML(objValue, depth + 1, key);
    
    return `<div class="detail-item" data-depth="\${depth}">
        <span class="detail-toggle" onclick="toggleObjectSection('\${sectionId}')">▶</span>
        <span class="detail-key">\${escapeHtml(key)}:</span>
        <span class="detail-object-badge">{...}</span>
    </div>
    <div id="\${sectionId}" class="detail-nested" style="display: none;">
        \${objHtml}
    </div>`;
}


function formatObjectAsTreeItem(obj, index, depth) {
    const sectionId = `item-\${index}-\${Math.random().toString(36).substr(2, 9)}`;
    const objHtml = formatDetailsHTML(obj, depth + 1);
    
    // Try to get a display name from common properties
    let displayName = '';
    if (obj.name) displayName = obj.name;
    else if (obj.id) displayName = obj.id;
    else if (obj.title) displayName = obj.title;
    else displayName = `Item \${index}`;
    
    return `<div class="detail-item array-item" data-depth="\${depth}">
        <span class="detail-toggle" onclick="toggleObjectSection('\${sectionId}')">▶</span>
        <span class="detail-index">[\${index}]</span>
        <span class="detail-key">\${escapeHtml(displayName)}</span>
        <span class="detail-object-badge">{...}</span>
    </div>
    <div id="\${sectionId}" class="detail-nested" style="display: none;">
        \${objHtml}
    </div>`;
}
function toggleArraySection(sectionId) {
    const section = document.getElementById(sectionId);
    const toggle = section?.previousElementSibling?.querySelector('.detail-toggle');
    
    if (section && toggle) {
        const isHidden = section.style.display === 'none';
        section.style.display = isHidden ? 'flex' : 'none';
        toggle.textContent = isHidden ? '▼' : '▶';
        toggle.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(0deg)';
    }
}

function toggleObjectSection(sectionId) {
    const section = document.getElementById(sectionId);
    const toggle = section?.previousElementSibling?.querySelector('.detail-toggle');
    
    if (section && toggle) {
        const isHidden = section.style.display === 'none';
        section.style.display = isHidden ? 'flex' : 'none';
        toggle.textContent = isHidden ? '▼' : '▶';
        toggle.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(0deg)';
    }
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
