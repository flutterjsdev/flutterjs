# FlutterJS Doc Generator - Complete Implementation Plan

## Phase 1: Foundational Infrastructure (Days 1-2)

### 1.1 CLI & Config Loading
- **File:** `bin/flutterjs_doc.dart` + `lib/src/commands/generate_command.dart`
- Create argument parser for `--output docs`, `--serve`, `--watch`
- Load `flutterjs.yaml` with config validation
- Initialize logging with color output

### 1.2 Data Models
- **File:** `lib/src/analyzer/models.dart`
```dart
class DartElement {
  String name, docString, dartCode, jsCode;
  DartElementType type; // CLASS, METHOD, FUNCTION, PROPERTY
  String? parent, inheritance; // extends/implements
  List<Parameter> parameters;
  String? returnType;
  List<String> tags; // @deprecated, @protected, etc.
  SourceLocation sourceLocation;
}

class Parameter {
  String name, type, defaultValue?;
  String docString; // from /// params comments
  bool isRequired, isPositional, isNamed;
}

class DocPackage {
  String name, version, description;
  List<DartElement> elements;
  Map<String, List<DartElement>> libraryMap; // library → elements
  DateTime generatedAt;
}
```

### 1.3 Constants & Defaults
- **File:** `lib/src/constants.dart` + `lib/src/config/defaults.dart`
- Material 3 color tokens (primary, secondary, error, etc.)
- Typography scales
- Spacing scales
- Animation durations
- Default theme overrides

---

## Phase 2: Dart Analysis Engine (Days 3-4)

### 2.1 Dart AST Parser
- **File:** `lib/src/analyzer/dart_analyzer.dart`

```dart
class DartAnalyzer {
  /// Recursively analyze all .dart files in project
  Future<DocPackage> analyze(String projectRoot) async {
    final files = glob.glob('$projectRoot/lib/**/*.dart');
    final elements = <DartElement>[];
    
    for (final file in files) {
      final unit = parseFile(file);
      for (final decl in unit.declarations) {
        if (decl is ClassDeclaration || decl is FunctionDeclaration) {
          elements.add(await _parseDeclaration(decl, file));
        }
      }
    }
    
    return DocPackage(...);
  }
  
  /// Extract full type information with generics
  Future<DartElement> _parseDeclaration(AstNode node, String filePath) async {
    final docComment = _extractDocComment(node);
    final parameters = _extractParameters(node);
    final inheritance = _extractInheritance(node);
    
    return DartElement(
      name: node.name,
      docString: docComment,
      dartCode: node.toSource(),
      parameters: parameters,
      inheritance: inheritance,
      sourceLocation: SourceLocation(filePath, node.offset),
    );
  }
  
  /// Parse /// comments into structured data
  String _extractDocComment(AstNode node) {
    // Extract preceding doc comment
    // Support: /// descriptions, {@tool snippet}, See also:
    // Return markdown-compatible string
  }
}
```

### 2.2 JavaScript Side-by-Side Mapping
- **File:** `lib/src/analyzer/js_analyzer.dart`

```dart
class JSAnalyzer {
  /// Find corresponding .js file and extract transpiled code
  Future<String?> getJavaScriptEquivalent(DartElement element) async {
    // 1. Check if source map exists
    // 2. If not, use naming convention: PrimaryButton.dart → primary_button.js
    // 3. Extract the class/function from JS file
    // 4. Clean up and format for display
    
    final jsPath = _resolveJsPath(element.sourceLocation.path);
    if (!File(jsPath).existsSync()) return null;
    
    final jsContent = await File(jsPath).readAsString();
    return _extractClassOrFunction(jsContent, element.name);
  }
  
  /// Parse JS to find exported class matching Dart class
  String _extractClassOrFunction(String jsContent, String dartName) {
    final pattern = RegExp(
      r'(?:class|function|const|let)\s+' + dartName + r'\s*[({].*?(?=\n(?:class|function|export|$))',
      dotAll: true,
    );
    
    final match = pattern.firstMatch(jsContent);
    return match?.group(0) ?? '';
  }
}
```

---

## Phase 3: Template & HTML Generation (Days 5-6)

### 3.1 Base HTML Template
- **File:** `lib/src/templates/base_template.dart`

```dart
String generateBaseTemplate({
  required String title,
  required String content,
  required String sidebarNav,
  required String breadcrumbs,
  required String rightToc,
  required Config config,
}) {
  return '''
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>$title - FlutterJS Docs</title>
  <link rel="stylesheet" href="/css/material3.css?v=${DateTime.now().millisecondsSinceEpoch}">
  <link rel="stylesheet" href="/css/responsive.css">
  <link rel="stylesheet" href="/css/dark_mode.css">
  <link rel="stylesheet" href="/css/animations.css">
  <style>
    :root {
      --md-color-primary: ${config.primaryColor};
      --md-color-secondary: ${config.secondaryColor};
      --md-color-tertiary: ${config.tertiaryColor};
    }
  </style>
</head>
<body>
  <header class="md-app-bar">
    <div class="md-app-bar-content">
      <img src="/logo.svg" alt="FlutterJS" class="md-logo">
      <h1>FlutterJS Docs</h1>
      <input type="text" id="search-input" placeholder="Search...">
      <button id="theme-toggle">🌙</button>
    </div>
  </header>
  
  <nav class="md-breadcrumbs">$breadcrumbs</nav>
  
  <div class="md-page-container">
    <aside class="md-sidebar">
      $sidebarNav
    </aside>
    
    <main class="md-content">
      $content
    </main>
    
    <aside class="md-toc-sidebar">
      <h3>In this article</h3>
      $rightToc
    </aside>
  </div>
  
  <script src="/js/search.js"></script>
  <script src="/js/theme_switcher.js"></script>
  <script src="/js/toc_sticky.js"></script>
  <script src="/js/code_copy.js"></script>
</body>
</html>
  ''';
}
```

### 3.2 Class/Widget Page Template
- **File:** `lib/src/templates/class_template.dart`

```dart
String generateClassPage(DartElement element, {required String jsCode}) {
  final heading = '''
    <div class="md-class-header">
      <div class="md-class-badges">
        ${element.tags.contains('@deprecated') ? '<span class="md-badge-deprecated">Deprecated</span>' : ''}
        <span class="md-badge-${element.type.name.toLowerCase()}">${element.type.name}</span>
      </div>
      
      <h1 class="md-class-title">${element.name}</h1>
      
      ${element.inheritance != null ? '''
        <div class="md-inheritance-chain">
          <span class="md-inheritance-label">Inheritance</span>
          <code>${element.inheritance}</code>
        </div>
      ''' : ''}
    </div>
  ''';
  
  final description = '''
    <section class="md-section md-description">
      <h2>Description</h2>
      <div class="md-prose">
        ${_markdownToHtml(element.docString)}
      </div>
    </section>
  ''';
  
  final parameters = element.parameters.isNotEmpty ? '''
    <section class="md-section md-parameters">
      <h2>Parameters</h2>
      <table class="md-params-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${element.parameters.map((p) => '''
            <tr>
              <td><code class="md-param-name">${p.name}</code></td>
              <td><code>${p.type}</code></td>
              <td>${p.defaultValue ?? '—'}</td>
              <td>${_markdownToHtml(p.docString)}</td>
            </tr>
          ''').join()}
        </tbody>
      </table>
    </section>
  ''' : '';
  
  final sourceCode = '''
    <section class="md-section md-source-code">
      <h2>Source Code</h2>
      <div class="md-code-tabs">
        <div class="md-tab-button active" data-tab="dart">Dart</div>
        ${jsCode.isNotEmpty ? '<div class="md-tab-button" data-tab="javascript">JavaScript</div>' : ''}
      </div>
      
      <div class="md-tab-panel active" id="dart-panel">
        <pre><code class="language-dart">${_highlightCode(element.dartCode, 'dart')}</code></pre>
        <button class="md-copy-btn">Copy</button>
      </div>
      
      ${jsCode.isNotEmpty ? '''
        <div class="md-tab-panel" id="javascript-panel">
          <pre><code class="language-javascript">${_highlightCode(jsCode, 'js')}</code></pre>
          <button class="md-copy-btn">Copy</button>
        </div>
      ''' : ''}
    </section>
  ''';
  
  return '$heading $description $parameters $sourceCode';
}
```

---

## Phase 4: Theming & Styling (Days 7-8)

### 4.1 Material 3 CSS Generation
- **File:** `lib/src/theme/material3_theme.dart`

```dart
String generateMaterial3CSS(Config config) {
  return '''
/* Material 3 Design System */

:root {
  /* Color system */
  --md-primary: ${config.primaryColor};
  --md-primary-container: ${config.primaryContainerColor};
  --md-secondary: ${config.secondaryColor};
  --md-tertiary: ${config.tertiaryColor};
  --md-error: #b3261e;
  --md-background: #fffbfe;
  --md-surface: #fffbfe;
  --md-outline: #79747e;
  --md-outline-variant: #cac7d0;
  
  /* Typography */
  --md-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --md-font-size-display-large: 3.5625rem;
  --md-font-size-display-medium: 2.8125rem;
  --md-font-size-headline-large: 2rem;
  --md-font-size-headline-medium: 1.75rem;
  --md-font-size-title-large: 1.375rem;
  --md-font-size-body-large: 1rem;
  --md-font-size-body-medium: 0.875rem;
  --md-font-size-label-large: 0.75rem;
  
  /* Spacing */
  --md-spacing-xs: 0.25rem;
  --md-spacing-sm: 0.5rem;
  --md-spacing-md: 1rem;
  --md-spacing-lg: 1.5rem;
  --md-spacing-xl: 2rem;
  --md-spacing-2xl: 2.5rem;
  
  /* Shadows & elevation */
  --md-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --md-shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --md-shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  --md-shadow-xl: 0 20px 25px rgba(0,0,0,0.1);
  
  /* Border radius */
  --md-border-radius-xs: 0.25rem;
  --md-border-radius-sm: 0.5rem;
  --md-border-radius-md: 1rem;
  --md-border-radius-lg: 1.5rem;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --md-background: #1c1b1f;
    --md-surface: #1c1b1f;
    --md-outline: #9e9da7;
  }
}

/* App Bar */
.md-app-bar {
  display: flex;
  align-items: center;
  padding: var(--md-spacing-md);
  background: var(--md-surface);
  border-bottom: 1px solid var(--md-outline-variant);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--md-shadow-sm);
}

.md-app-bar-content {
  display: flex;
  align-items: center;
  gap: var(--md-spacing-lg);
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.md-logo {
  height: 2rem;
}

#search-input {
  flex: 1;
  max-width: 400px;
  padding: var(--md-spacing-sm) var(--md-spacing-md);
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-border-radius-sm);
  font-family: var(--md-font-family);
}

/* Sidebar */
.md-sidebar {
  width: 280px;
  padding: var(--md-spacing-lg);
  border-right: 1px solid var(--md-outline-variant);
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  position: sticky;
  top: 64px;
}

.md-sidebar-item {
  display: block;
  padding: var(--md-spacing-sm) var(--md-spacing-md);
  text-decoration: none;
  color: var(--md-outline);
  border-radius: var(--md-border-radius-sm);
  transition: all 200ms ease;
}

.md-sidebar-item:hover {
  background: var(--md-primary-container);
  color: var(--md-primary);
}

.md-sidebar-item.active {
  background: var(--md-primary-container);
  color: var(--md-primary);
  font-weight: 500;
}

/* Content Area */
.md-page-container {
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  gap: var(--md-spacing-xl);
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--md-spacing-xl);
}

.md-content {
  font-size: var(--md-font-size-body-large);
  line-height: 1.6;
}

.md-content h2 {
  margin-top: var(--md-spacing-2xl);
  margin-bottom: var(--md-spacing-lg);
  font-size: var(--md-font-size-headline-medium);
  color: var(--md-outline);
}

/* Table of Contents Sidebar */
.md-toc-sidebar {
  width: 320px;
  padding: var(--md-spacing-lg);
  border-left: 1px solid var(--md-outline-variant);
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  position: sticky;
  top: 64px;
}

.md-toc-sidebar ol {
  list-style: none;
  padding: 0;
  margin: 0;
}

.md-toc-sidebar li {
  margin: var(--md-spacing-sm) 0;
}

.md-toc-sidebar a {
  color: var(--md-outline);
  text-decoration: none;
  padding: var(--md-spacing-xs) 0;
  display: inline-block;
  transition: color 200ms;
}

.md-toc-sidebar a:hover {
  color: var(--md-primary);
}

/* Code blocks */
.md-code-tabs {
  display: flex;
  gap: var(--md-spacing-sm);
  margin-bottom: var(--md-spacing-md);
  border-bottom: 1px solid var(--md-outline-variant);
}

.md-tab-button {
  padding: var(--md-spacing-md) var(--md-spacing-lg);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--md-outline);
  border-bottom: 2px solid transparent;
  transition: all 200ms;
}

.md-tab-button.active {
  color: var(--md-primary);
  border-bottom-color: var(--md-primary);
}

pre {
  background: var(--md-surface);
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-border-radius-md);
  padding: var(--md-spacing-lg);
  overflow-x: auto;
}

code {
  font-family: "Fira Code", "Courier New", monospace;
  font-size: 0.9em;
}

/* Tables */
.md-params-table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--md-spacing-lg) 0;
}

.md-params-table th,
.md-params-table td {
  text-align: left;
  padding: var(--md-spacing-md);
  border-bottom: 1px solid var(--md-outline-variant);
}

.md-params-table th {
  background: var(--md-primary-container);
  color: var(--md-primary);
  font-weight: 600;
}

/* Badges */
.md-badge-class,
.md-badge-method,
.md-badge-function {
  display: inline-block;
  padding: var(--md-spacing-xs) var(--md-spacing-sm);
  background: var(--md-primary-container);
  color: var(--md-primary);
  border-radius: var(--md-border-radius-sm);
  font-size: var(--md-font-size-label-large);
  font-weight: 600;
  margin-right: var(--md-spacing-md);
}

.md-badge-deprecated {
  background: var(--md-error);
  color: white;
}

/* Responsive */
@media (max-width: 1200px) {
  .md-page-container {
    grid-template-columns: 1fr 280px;
  }
  
  .md-sidebar {
    display: none;
  }
}

@media (max-width: 768px) {
  .md-page-container {
    grid-template-columns: 1fr;
  }
  
  .md-toc-sidebar {
    display: none;
  }
  
  .md-app-bar-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  #search-input {
    max-width: 100%;
  }
}
  ''';
}
```

---

## Phase 5: Search & Navigation (Days 9)

### 5.1 Search Index Generation
- **File:** `lib/src/generator/search_index.dart`

```dart
String generateSearchIndex(DocPackage package) {
  final index = package.elements.map((el) => {
    'name': el.name,
    'type': el.type.name,
    'library': el.library,
    'description': _stripHtml(el.docString).substring(0, 200),
    'url': '/api/${el.library}/${el.name}.html',
    'keywords': _extractKeywords(el.docString),
  }).toList();
  
  return jsonEncode(index);
}
```

### 5.2 Client-Side Search
- **File:** `lib/assets/js/search.js` (embedded in HTML)

```javascript
class FuzzySearch {
  constructor(indexData) {
    this.index = indexData;
    this.setupListeners();
  }
  
  setupListeners() {
    const input = document.getElementById('search-input');
    input.addEventListener('input', (e) => this.search(e.target.value));
  }
  
  search(query) {
    if (!query) return;
    
    const results = this.index
      .filter(item => this.fuzzyMatch(query, item.name))
      .sort((a, b) => this.calculateScore(query, b.name) - 
                      this.calculateScore(query, a.name))
      .slice(0, 10);
    
    this.displayResults(results);
  }
  
  fuzzyMatch(query, name) {
    let qIdx = 0;
    for (let i = 0; i < name.length && qIdx < query.length; i++) {
      if (name[i].toLowerCase() === query[qIdx].toLowerCase()) {
        qIdx++;
      }
    }
    return qIdx === query.length;
  }
  
  calculateScore(query, name) {
    // Score based on character position, case sensitivity, etc.
    return name.toLowerCase().startsWith(query.toLowerCase()) ? 100 : 50;
  }
  
  displayResults(results) {
    // Display dropdown results
  }
}
```

---

## Phase 6: Guide Generation & Special Pages (Day 10)

### 6.1 Flutter→JS Mapping Guide
- **File:** `lib/src/templates/guide_template.dart`

Automatically generate pages:
- **How Widgets Map to JS**: StatelessWidget → JS class, build() → render()
- **BuildContext → Context Object**: Show actual implementation
- **setState → Reactive Updates**: Document the signal/stream pattern used
- **Material Widgets → DOM**: Table mapping Material buttons, cards, etc. to HTML+CSS

### 6.2 Guide Example (generated markdown)

```markdown
# How FlutterJS Maps Flutter Concepts to JavaScript

## Widgets → JavaScript Classes

### Stateless Widget
\`\`\`dart
class MyButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Text('Hello');
}
\`\`\`

Becomes:

\`\`\`javascript
class MyButton {
  build(context) {
    return new Text('Hello').render();
  }
}
\`\`\`
```

---

## Phase 7: Dev Server & Live Reload (Day 11)

### 7.1 Dev Server
- **File:** `lib/src/server/dev_server.dart`

```dart
class DocServer {
  late shelf.Handler handler;
  late HttpServer server;
  final FileWatcher watcher = FileWatcher('.');
  
  Future<void> serve(String docsDir, {int port = 8080}) async {
    handler = const shelf.Pipeline()
        .addMiddleware(shelf.logRequests())
        .addMiddleware(_liveReloadMiddleware)
        .addHandler((request) => shelf_static.createStaticHandler(
          docsDir,
          defaultDocument: 'index.html',
        )(request));
    
    server = await shelf.serve(handler, 'localhost', port);
    print('📚 Docs server running at http://localhost:$port');
    
    _watchForChanges(docsDir);
  }
  
  void _watchForChanges(String docsDir) {
    watcher.events.listen((event) {
      if (event.path.endsWith('.dart') || event.path.endsWith('.md')) {
        print('🔄 Regenerating docs...');
        _broadcastReload();
      }
    });
  }
  
  Middleware _liveReloadMiddleware(Handler innerHandler) {
    return (Request request) async {
      var response = await innerHandler(request);
      
      if (request.url.path.endsWith('.html')) {
        var body = await response.readAsString();
        body = body.replaceFirst(
          '</body>',
          '<script>window.addEventListener("flutterjs-reload", () => location.reload())</script></body>',
        );
        response = response.change(body: body);
      }
      
      return response;
    };
  }
}
```

---

## Phase 8: Testing & Polish (Days 12-13)

### 8.1 Integration Tests
- Test Dart parsing with real Flutter SDK classes
- Test JS extraction from generated code
- Test HTML generation matches Material 3 spec
- Test search functionality
- Benchmark doc generation speed

### 8.2 Performance Optimization
- Minify CSS/JS
- Compress assets
- Lazy-load code examples
- Cache busting with content hashes

---

## Execution Timeline

| Phase | Days | Deliverable |
|-------|------|-------------|
| 1. Infrastructure | 1-2 | CLI + Config + Models |
| 2. Dart Analysis | 3-4 | Full AST parsing + JS extraction |
| 3. Templates | 5-6 | HTML generation + base styles |
| 4. Theming | 7-8 | Material 3 CSS + dark mode |
| 5. Search | 9 | Full-text search + client-side UI |
| 6. Guides | 10 | Auto-generated mapping guides |
| 7. Dev Server | 11 | Live reload + local serving |
| 8. Testing | 12-13 | Full test suite + optimization |

**Total: 13 days to production-ready tool**