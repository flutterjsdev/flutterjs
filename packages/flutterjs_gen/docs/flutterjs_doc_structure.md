# FlutterJS Doc Generator - Complete Project Structure

```
flutterjs_doc/
├── bin/
│   └── flutterjs_doc.dart          # CLI entry point
├── lib/
│   ├── flutterjs_doc.dart          # Main package export
│   ├── src/
│   │   ├── analyzer/
│   │   │   ├── dart_analyzer.dart       # Dart AST parsing + doc extraction
│   │   │   ├── js_analyzer.dart         # JavaScript code analysis
│   │   │   └── models.dart              # AST models & data classes
│   │   │
│   │   ├── generator/
│   │   │   ├── html_generator.dart      # Core HTML generation
│   │   │   ├── theme_generator.dart     # CSS + theme generation
│   │   │   ├── sitemap_generator.dart   # Sitemap + nav structure
│   │   │   └── search_index.dart        # Full-text search JSON
│   │   │
│   │   ├── templates/
│   │   │   ├── base_template.dart       # HTML5 base + Material 3 shell
│   │   │   ├── class_template.dart      # Class/Widget page template
│   │   │   ├── method_template.dart     # Method detail partial
│   │   │   ├── package_template.dart    # Package overview page
│   │   │   ├── guide_template.dart      # Guide pages (mapping, interop, etc.)
│   │   │   └── search_template.dart     # Client-side search UI
│   │   │
│   │   ├── theme/
│   │   │   ├── material3_theme.dart     # Material 3 CSS generation
│   │   │   ├── colors.dart              # Color palette + customization
│   │   │   └── icons.dart               # Material icons base64 SVGs
│   │   │
│   │   ├── server/
│   │   │   ├── dev_server.dart          # Local dev server with live reload
│   │   │   └── watcher.dart             # File watcher for --serve mode
│   │   │
│   │   ├── config/
│   │   │   ├── config_loader.dart       # flutterjs.yaml parser
│   │   │   └── defaults.dart            # Config defaults
│   │   │
│   │   ├── utils/
│   │   │   ├── markdown_processor.dart  # Dart doc comment → HTML
│   │   │   ├── code_highlighter.dart    # Syntax highlighting (Dart + JS)
│   │   │   ├── slug_generator.dart      # URL-safe slugs
│   │   │   └── logger.dart              # Colorized logging
│   │   │
│   │   ├── commands/
│   │   │   ├── generate_command.dart    # Main doc generation logic
│   │   │   └── serve_command.dart       # Dev server + watch mode
│   │   │
│   │   └── constants.dart               # Global constants
│   │
│   └── assets/
│       ├── css/
│       │   ├── material3.css            # Material 3 styles (generated or embedded)
│       │   ├── responsive.css           # Mobile/responsive
│       │   ├── dark_mode.css            # Dark theme
│       │   └── animations.css           # Smooth transitions
│       │
│       ├── js/
│       │   ├── search.js                # Client-side fuzzy search + highlighting
│       │   ├── theme_switcher.js        # Dark/light mode toggle
│       │   ├── toc_sticky.js            # Sticky TOC with scroll spy
│       │   └── code_copy.js             # Copy-to-clipboard buttons
│       │
│       └── icons/
│           └── material_icons.json      # SVG icons data
│
├── templates/
│   ├── guides/
│   │   ├── flutter_to_js_mapping.md     # Generated guide
│   │   ├── dart_js_interop.md           # Advanced interop guide
│   │   ├── performance_guide.md         # Performance tips
│   │   └── limitations.md               # Known issues & workarounds
│   │
│   └── comment_guidelines.md            # Developer guidelines (generated)
│
├── test/
│   ├── analyzer_test.dart
│   ├── generator_test.dart
│   └── integration_test.dart
│
├── example/
│   ├── sample_project/                  # Example FlutterJS project
│   │   ├── lib/
│   │   │   ├── widgets/
│   │   │   │   └── primary_button.dart
│   │   │   └── views/
│   │   │       └── home_view.dart
│   │   │
│   │   ├── flutterjs.yaml
│   │   └── pubspec.yaml
│   │
│   └── generated_docs/                  # Example output
│       ├── index.html
│       ├── api/
│       │   ├── widgets/
│       │   │   └── PrimaryButton.html
│       │   └── views/
│       │
│       ├── guides/
│       │   └── Flutter-to-JS-Mapping.html
│       │
│       ├── css/
│       ├── js/
│       └── search-index.json
│
├── CHANGELOG.md
├── LICENSE
├── README.md
└── analysis_options.yaml
```

## Key Implementation Files Overview

### 1. **bin/flutterjs_doc.dart** - CLI Entry Point
- Parse arguments: `--output`, `--serve`, `--watch`
- Load `flutterjs.yaml` configuration
- Delegate to GenerateCommand or ServeCommand

### 2. **lib/src/analyzer/dart_analyzer.dart**
- Use `package:analyzer` to parse all `.dart` files
- Extract: classes, methods, properties, doc comments, generics, inheritance
- Build complete AST with type information
- Identify widgets, models, services separately

### 3. **lib/src/analyzer/js_analyzer.dart**
- Parse generated `.js`/`.ts` files using regex patterns or lightweight parser
- Extract function signatures, exported classes
- Map back to original Dart code via source maps (if available)

### 4. **lib/src/generator/html_generator.dart**
- Main orchestrator for doc generation
- For each class: render page using templates
- Generate search index (JSON)
- Create package overview pages
- Generate guide pages (Flutter→JS mapping, etc.)

### 5. **lib/src/theme/material3_theme.dart**
- Generate complete Material 3 CSS
- Support custom color palettes via `flutterjs.yaml`
- Include responsive breakpoints
- Dark mode support with CSS custom properties

### 6. **lib/src/utils/markdown_processor.dart**
- Convert Dart doc comments to HTML
- Support `[ClassName]` cross-references with auto-linking
- Handle `{@tool snippet}` blocks
- Highlight inline code, links, lists

### 7. **lib/src/server/dev_server.dart**
- Lightweight Shelf-based HTTP server
- Serve generated docs with 0ms overhead
- Support live reload when docs/source changes
- Asset versioning to prevent cache issues