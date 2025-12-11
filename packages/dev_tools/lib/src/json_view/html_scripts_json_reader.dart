class HtmlScriptsJsonReader {
  static String getJsonReaderScript() => '''
// ============================================================================
// JSON READER: Upload Handlers & Display
// ============================================================================

const jsonUploadZone = document.getElementById('jsonUploadZone');
const jsonFileInput = document.getElementById('jsonFileInput');
const jsonDisplayContainer = document.getElementById('jsonDisplayContainer');
const jsonUploadMessage = document.getElementById('jsonUploadMessage');
const jsonProgressIndicator = document.getElementById('jsonProgressIndicator');

let jsonData = null;
let jsonHandlersSetup = false;

// ============================================================================
// SETUP: JSON Upload handlers initialization
// ============================================================================

function setupJsonUploadHandlers() {
    console.log('Setting up JSON upload handlers...');

    if (jsonHandlersSetup) {
        console.warn('JSON upload handlers already setup');
        return;
    }
    jsonHandlersSetup = true;

    if (!jsonUploadZone || !jsonFileInput) {
        console.error('JSON elements not found!');
        return;
    }

    // Click handler with visibility workaround
    jsonUploadZone.addEventListener('click', (e) => {
        console.log('JSON upload zone clicked');
        e.preventDefault();
        e.stopPropagation();
        if (jsonFileInput) {
            // Workaround: temporarily make visible
            const originalDisplay = jsonFileInput.style.display;
            jsonFileInput.style.display = 'block';
            jsonFileInput.style.position = 'fixed';
            jsonFileInput.style.top = '-9999px';
            jsonFileInput.style.left = '-9999px';
            
            // Reset the value
            jsonFileInput.value = '';
            
            // Trigger click
            console.log('About to click file input');
            jsonFileInput.click();
            
            // Restore
            jsonFileInput.style.display = originalDisplay;
            console.log('File input clicked');
        } else {
            console.error('JSON file input not found!');
        }
    });

    // Drag and drop
    jsonUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        jsonUploadZone.classList.add('dragover');
    });

    jsonUploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        jsonUploadZone.classList.remove('dragover');
    });

    jsonUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        jsonUploadZone.classList.remove('dragover');
        const files = e.dataTransfer?.files;
        if (files?.length) {
            uploadJsonFile(files[0]);
        }
    });

    // File input change
    jsonFileInput.addEventListener('change', (e) => {
        console.log('File input change event fired');
        const files = e.target.files;
        console.log('Files selected:', files?.length);
        if (files?.length) {
            uploadJsonFile(files[0]);
        }
    }, false);

    console.log('✅ JSON upload setup complete');
}

// Setup JSON handlers when page loads
try {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOMContentLoaded - calling setupJsonUploadHandlers');
            setupJsonUploadHandlers();
        });
    } else {
        console.log('Document already loaded - calling setupJsonUploadHandlers');
        setupJsonUploadHandlers();
    }
} catch (e) {
    console.error('Error setting up JSON handlers:', e);
}

// ============================================================================
// UPLOAD: JSON File validation and processing
// ============================================================================

async function uploadJsonFile(file) {
    console.log('Uploading JSON:', file.name);

    const isJsonFile = file.name.toLowerCase().endsWith('.json');
    
    if (!isJsonFile) {
        showJsonUploadMessage('ERROR: Only .json files allowed', 'error');
        jsonFileInput.value = '';
        return;
    }

    const MAX_SIZE = 50 * 1024 * 1024;
    
    if (file.size > MAX_SIZE) {
        showJsonUploadMessage('ERROR: File too large (max 50MB)', 'error');
        jsonFileInput.value = '';
        return;
    }

    showJsonUploadMessage('Processing ' + file.name + '...', 'loading');

    try {
        const fileContent = await file.text();
        
        try {
            jsonData = JSON.parse(fileContent);
            console.log('JSON parsed successfully');
            
            showJsonUploadMessage('SUCCESS: Loaded ' + file.name, 'success');
            displayJsonData(jsonData);
            updateJsonStats(jsonData);
            updateJsonStructure(jsonData);
            
        } catch (parseError) {
            console.error('Parse error:', parseError.message);
            showJsonUploadMessage('ERROR: Invalid JSON - ' + parseError.message, 'error');
            displayJsonError('Invalid JSON', parseError.message);
        }
        
    } catch (readError) {
        console.error('Read error:', readError);
        showJsonUploadMessage('ERROR: Failed to read file', 'error');
        displayJsonError('Read Error', readError.message);
    } finally {
        jsonFileInput.value = '';
    }
}

// ============================================================================
// DISPLAY: JSON formatting with collapsible nodes
// ============================================================================

function displayJsonData(data) {
    console.log('Displaying JSON');
    
    jsonDisplayContainer.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'json-display-wrapper';
    wrapper.id = 'jsonWrapper';
    
    const controls = document.createElement('div');
    controls.className = 'json-controls';
    controls.innerHTML = '<button class="json-control-btn" onclick="expandAllJson()">⬇️ Expand All</button><button class="json-control-btn" onclick="collapseAllJson()">⬆️ Collapse All</button>';
    
    const content = document.createElement('div');
    content.className = 'json-content-area';
    
    renderJsonLine(data, 0, content);
    
    wrapper.appendChild(content);
    jsonDisplayContainer.appendChild(controls);
    jsonDisplayContainer.appendChild(wrapper);
}

function renderJsonLine(data, depth, container) {
    const indent = depth * 20;
    
    if (data === null) {
        const line = createJsonLine(indent, '<span class="json-null">null</span>');
        container.appendChild(line);
        return;
    }

    if (typeof data !== 'object') {
        const value = JSON.stringify(data);
        const className = typeof data === 'string' ? 'json-string' : typeof data === 'number' ? 'json-number' : typeof data === 'boolean' ? 'json-boolean' : '';
        const line = createJsonLine(indent, '<span class="' + className + '">' + escapeHtml(value) + '</span>');
        container.appendChild(line);
        return;
    }

    if (Array.isArray(data)) {
        renderArrayLine(data, indent, container, depth);
    } else {
        renderObjectLine(data, indent, container, depth);
    }
}

function renderArrayLine(arr, indent, container, depth) {
    const nodeId = 'arr_' + Date.now() + '_' + Math.random();
    
    const headerLine = document.createElement('div');
    headerLine.className = 'json-line json-collapsible';
    headerLine.style.paddingLeft = indent + 'px';
    
    const toggle = document.createElement('span');
    toggle.className = 'json-toggle';
    toggle.textContent = '▼';
    toggle.onclick = (e) => {
        e.stopPropagation();
        const nested = document.getElementById(nodeId);
        if (nested.classList.contains('json-nested-hidden')) {
            nested.classList.remove('json-nested-hidden');
            toggle.textContent = '▼';
        } else {
            nested.classList.add('json-nested-hidden');
            toggle.textContent = '▶';
        }
    };
    
    const header = document.createElement('span');
    header.className = 'json-content';
    header.innerHTML = '<span class="json-punctuation">[</span><span class="json-size">' + arr.length + ' items</span><span class="json-punctuation">]</span>';
    
    headerLine.appendChild(toggle);
    headerLine.appendChild(header);
    container.appendChild(headerLine);
    
    const nestedContainer = document.createElement('div');
    nestedContainer.id = nodeId;
    nestedContainer.className = 'json-nested';
    
    arr.forEach((item, idx) => {
        const itemLine = document.createElement('div');
        itemLine.className = 'json-line';
        itemLine.style.paddingLeft = (indent + 20) + 'px';
        
        const index = document.createElement('span');
        index.className = 'json-index';
        index.textContent = '[' + idx + ']';
        
        itemLine.appendChild(index);
        
        if (typeof item === 'object' && item !== null) {
            const subContainer = document.createElement('span');
            subContainer.style.marginLeft = '8px';
            
            if (Array.isArray(item)) {
                subContainer.innerHTML = '<span class="json-punctuation">[' + item.length + ' items]</span>';
                const subId = 'sub_' + Date.now() + '_' + Math.random();
                const subToggle = document.createElement('span');
                subToggle.className = 'json-toggle';
                subToggle.textContent = '▼';
                subToggle.style.marginLeft = '8px';
                subToggle.onclick = (e) => {
                    e.stopPropagation();
                    const sub = document.getElementById(subId);
                    if (sub.classList.contains('json-nested-hidden')) {
                        sub.classList.remove('json-nested-hidden');
                        subToggle.textContent = '▼';
                    } else {
                        sub.classList.add('json-nested-hidden');
                        subToggle.textContent = '▶';
                    }
                };
                subContainer.appendChild(subToggle);
                
                const subNested = document.createElement('div');
                subNested.id = subId;
                subNested.className = 'json-nested';
                renderJsonLine(item, depth + 2, subNested);
                nestedContainer.appendChild(itemLine);
                nestedContainer.appendChild(subNested);
            } else {
                subContainer.innerHTML = '<span class="json-punctuation">{' + Object.keys(item).length + ' keys}</span>';
                const subId = 'sub_' + Date.now() + '_' + Math.random();
                const subToggle = document.createElement('span');
                subToggle.className = 'json-toggle';
                subToggle.textContent = '▼';
                subToggle.style.marginLeft = '8px';
                subToggle.onclick = (e) => {
                    e.stopPropagation();
                    const sub = document.getElementById(subId);
                    if (sub.classList.contains('json-nested-hidden')) {
                        sub.classList.remove('json-nested-hidden');
                        subToggle.textContent = '▼';
                    } else {
                        sub.classList.add('json-nested-hidden');
                        subToggle.textContent = '▶';
                    }
                };
                subContainer.appendChild(subToggle);
                
                const subNested = document.createElement('div');
                subNested.id = subId;
                subNested.className = 'json-nested';
                renderJsonLine(item, depth + 2, subNested);
                nestedContainer.appendChild(itemLine);
                nestedContainer.appendChild(subNested);
            }
            itemLine.appendChild(subContainer);
        } else {
            const value = JSON.stringify(item);
            const className = typeof item === 'string' ? 'json-string' : typeof item === 'number' ? 'json-number' : typeof item === 'boolean' ? 'json-boolean' : '';
            const content = document.createElement('span');
            content.className = 'json-content';
            content.innerHTML = '<span class="' + className + '">' + escapeHtml(value) + '</span>';
            itemLine.appendChild(content);
        }
        
        nestedContainer.appendChild(itemLine);
    });
    
    container.appendChild(nestedContainer);
}

function renderObjectLine(obj, indent, container, depth) {
    const keys = Object.keys(obj);
    const nodeId = 'obj_' + Date.now() + '_' + Math.random();
    
    const headerLine = document.createElement('div');
    headerLine.className = 'json-line json-collapsible';
    headerLine.style.paddingLeft = indent + 'px';
    
    const toggle = document.createElement('span');
    toggle.className = 'json-toggle';
    toggle.textContent = '▼';
    toggle.onclick = (e) => {
        e.stopPropagation();
        const nested = document.getElementById(nodeId);
        if (nested.classList.contains('json-nested-hidden')) {
            nested.classList.remove('json-nested-hidden');
            toggle.textContent = '▼';
        } else {
            nested.classList.add('json-nested-hidden');
            toggle.textContent = '▶';
        }
    };
    
    const header = document.createElement('span');
    header.className = 'json-content';
    header.innerHTML = '<span class="json-punctuation">{</span><span class="json-size">' + keys.length + ' keys</span><span class="json-punctuation">}</span>';
    
    headerLine.appendChild(toggle);
    headerLine.appendChild(header);
    container.appendChild(headerLine);
    
    const nestedContainer = document.createElement('div');
    nestedContainer.id = nodeId;
    nestedContainer.className = 'json-nested';
    
    keys.forEach((key) => {
        const value = obj[key];
        const keyLine = document.createElement('div');
        keyLine.className = 'json-line';
        keyLine.style.paddingLeft = (indent + 20) + 'px';
        
        const keySpan = document.createElement('span');
        keySpan.className = 'json-key';
        keySpan.textContent = '"' + escapeHtml(key) + '"';
        keySpan.style.marginRight = '4px';
        
        keyLine.appendChild(keySpan);
        
        if (typeof value === 'object' && value !== null) {
            const subContainer = document.createElement('span');
            subContainer.style.marginLeft = '4px';
            
            if (Array.isArray(value)) {
                subContainer.innerHTML = '<span class="json-punctuation">[' + value.length + ' items]</span>';
                const subId = 'sub_' + Date.now() + '_' + Math.random();
                const subToggle = document.createElement('span');
                subToggle.className = 'json-toggle';
                subToggle.textContent = '▼';
                subToggle.style.marginLeft = '8px';
                subToggle.onclick = (e) => {
                    e.stopPropagation();
                    const sub = document.getElementById(subId);
                    if (sub.classList.contains('json-nested-hidden')) {
                        sub.classList.remove('json-nested-hidden');
                        subToggle.textContent = '▼';
                    } else {
                        sub.classList.add('json-nested-hidden');
                        subToggle.textContent = '▶';
                    }
                };
                subContainer.appendChild(subToggle);
                
                const subNested = document.createElement('div');
                subNested.id = subId;
                subNested.className = 'json-nested';
                renderJsonLine(value, depth + 2, subNested);
                nestedContainer.appendChild(keyLine);
                nestedContainer.appendChild(subNested);
            } else {
                subContainer.innerHTML = '<span class="json-punctuation">{' + Object.keys(value).length + ' keys}</span>';
                const subId = 'sub_' + Date.now() + '_' + Math.random();
                const subToggle = document.createElement('span');
                subToggle.className = 'json-toggle';
                subToggle.textContent = '▼';
                subToggle.style.marginLeft = '8px';
                subToggle.onclick = (e) => {
                    e.stopPropagation();
                    const sub = document.getElementById(subId);
                    if (sub.classList.contains('json-nested-hidden')) {
                        sub.classList.remove('json-nested-hidden');
                        subToggle.textContent = '▼';
                    } else {
                        sub.classList.add('json-nested-hidden');
                        subToggle.textContent = '▶';
                    }
                };
                subContainer.appendChild(subToggle);
                
                const subNested = document.createElement('div');
                subNested.id = subId;
                subNested.className = 'json-nested';
                renderJsonLine(value, depth + 2, subNested);
                nestedContainer.appendChild(keyLine);
                nestedContainer.appendChild(subNested);
            }
            keyLine.appendChild(subContainer);
        } else {
            const valueStr = JSON.stringify(value);
            const valueClass = typeof value === 'string' ? 'json-string' : typeof value === 'number' ? 'json-number' : typeof value === 'boolean' ? 'json-boolean' : 'json-null';
            const valueSpan = document.createElement('span');
            valueSpan.className = valueClass;
            valueSpan.textContent = escapeHtml(valueStr);
            keyLine.appendChild(valueSpan);
        }
        
        nestedContainer.appendChild(keyLine);
    });
    
    container.appendChild(nestedContainer);
}

function createJsonLine(indent, content) {
    const line = document.createElement('div');
    line.className = 'json-line';
    line.style.paddingLeft = indent + 'px';
    line.innerHTML = content;
    return line;
}

function expandAllJson() {
    const allNested = document.querySelectorAll('.json-nested');
    const allToggles = document.querySelectorAll('.json-toggle');
    
    allNested.forEach(el => el.classList.remove('json-nested-hidden'));
    allToggles.forEach(el => el.textContent = '▼');
}

function collapseAllJson() {
    const allNested = document.querySelectorAll('.json-nested');
    const allToggles = document.querySelectorAll('.json-toggle');
    
    allNested.forEach(el => el.classList.add('json-nested-hidden'));
    allToggles.forEach(el => el.textContent = '▶');
}

function displayJsonError(title, message) {
    jsonDisplayContainer.innerHTML = '<div class="empty-state json-error-state"><div class="json-error-icon">⚠️</div><div class="json-error-message">' + escapeHtml(title) + '</div><div class="json-error-detail">' + escapeHtml(message) + '</div></div>';
}

// ============================================================================
// STATS AND STRUCTURE
// ============================================================================

function updateJsonStats(data) {
    const stats = analyzeJsonStructure(data);
    const fileInfo = document.getElementById('jsonFileInfo');
    const details = document.getElementById('jsonFileDetails');
    
    if (fileInfo && details) {
        fileInfo.style.display = 'block';
        details.innerHTML = '<div class="json-detail-item"><span class="json-detail-label">Total Size</span><span class="json-detail-value">' + formatFileSize(JSON.stringify(data).length) + '</span></div><div class="json-detail-item"><span class="json-detail-label">Top Level Type</span><span class="json-detail-value">' + (Array.isArray(data) ? 'Array' : 'Object') + '</span></div><div class="json-detail-item"><span class="json-detail-label">Items</span><span class="json-detail-value">' + stats.itemCount + '</span></div><div class="json-detail-item"><span class="json-detail-label">Depth</span><span class="json-detail-value">' + stats.maxDepth + '</span></div>';
    }
}

function updateJsonStructure(data) {
    const panel = document.getElementById('jsonStructurePanel');
    const structure = document.getElementById('jsonStructure');
    
    if (panel && structure) {
        panel.style.display = 'block';
        const keys = Array.isArray(data) ? [] : Object.keys(data).slice(0, 10);
        
        let html = '';
        if (Array.isArray(data)) {
            html = '<div class="json-structure-item"><span class="json-structure-type">Array</span><span class="json-structure-key">[' + data.length + ' items]</span></div>';
        } else {
            keys.forEach(key => {
                const value = data[key];
                const type = Array.isArray(value) ? 'Array' : typeof value === 'object' && value !== null ? 'Object' : typeof value;
                html += '<div class="json-structure-item"><span class="json-structure-key">' + escapeHtml(key) + '</span><span class="json-structure-type">' + type + '</span></div>';
            });
        }
        structure.innerHTML = html;
    }
}

function analyzeJsonStructure(data) {
    let maxDepth = 0;
    let itemCount = Array.isArray(data) ? data.length : Object.keys(data).length;

    function getDepth(obj, currentDepth = 0) {
        if (currentDepth > maxDepth) maxDepth = currentDepth;
        if (typeof obj !== 'object' || obj === null) return;
        if (Array.isArray(obj)) {
            obj.forEach(item => getDepth(item, currentDepth + 1));
        } else {
            Object.values(obj).forEach(value => getDepth(value, currentDepth + 1));
        }
    }

    getDepth(data);
    return { itemCount, maxDepth };
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

function showJsonUploadMessage(message, type) {
    jsonUploadMessage.innerHTML = '<div class="message ' + type + '"><div class="' + (type === 'loading' ? 'spinner' : '') + '"></div><span>' + message + '</span></div>';
    if (type !== 'loading') {
        setTimeout(() => { jsonUploadMessage.innerHTML = ''; }, 5000);
    }
}

// Force setup on window load as fallback
window.addEventListener('load', () => {
    console.log('Window load event - ensuring JSON handlers are setup');
    if (!jsonHandlersSetup && jsonUploadZone) {
        setupJsonUploadHandlers();
    }
});
''';
}
