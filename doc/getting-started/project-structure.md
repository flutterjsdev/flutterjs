# Project Structure

Understanding how a FlutterJS project is organized.

## Overview

A FlutterJS project has two main layers:

1. **Dart/Flutter Layer** — Your source code
2. **JavaScript Layer** — Generated output

```
my-flutterjs-app/
├── lib/                      # 📝 Your Dart/Flutter code (SOURCE)
│   ├── main.dart
│   └── widgets/
│
├── build/                    # 🔧 Generated files (AUTO-GENERATED)
│   ├── reports/              # Conversion reports
│   │   ├── conversion_report.json
│   │   └── summary_report.json
│   │
│   └── flutterjs/            # Generated JavaScript project
│       ├── flutterjs.config.js
│       ├── package.json
│       ├── src/              # Generated .fjs files
│       │   └── main.fjs
│       └── public/
│           └── index.html
│
├── pubspec.yaml              # 📦 Dart dependencies
├── README.md
└── .gitignore
```

---

## Dart/Flutter Layer

### `lib/` Directory

This is where you write your Flutter/Dart code.

**Key files:**
- `lib/main.dart` — Entry point, contains `main()` function
- `lib/widgets/` — Custom widgets (optional)
- `lib/screens/` — App screens (optional)

**Example:**
```
lib/
├── main.dart
├── screens/
│   ├── home_screen.dart
│   └── profile_screen.dart
└── widgets/
    ├── custom_button.dart
    └── user_card.dart
```

### `pubspec.yaml`

Defines Dart dependencies and project metadata:

```yaml
name: my_flutterjs_app
description: My awesome FlutterJS app
version: 1.0.0

environment:
  sdk: '>=2.17.0 <3.0.0'

dependencies:
  flutter:
    sdk: flutter
```

---

## Build Output Layer

### `build/` Directory

**⚠️ Auto-generated** — Do not edit files here manually!

This directory is created by the Dart CLI during the build process.

#### `build/reports/`

Contains conversion reports showing:
- Which files were processed
- Conversion statistics
- Any warnings or errors

#### `build/flutterjs/`

The generated JavaScript project. This is a **complete standalone project** that can run in a browser.

**Structure:**
```
build/flutterjs/
├── flutterjs.config.js    # Auto-generated config
├── package.json           # Auto-generated manifest
├── src/                   # Generated JavaScript files
│   └── main.fjs          # Your Dart code → JavaScript
└── public/
    └── index.html        # Entry HTML file
```

**How it works:**

1. **Dart CLI** reads `lib/main.dart`
2. **Dart CLI** generates `build/flutterjs/src/main.fjs`
3. **JavaScript CLI** serves `build/flutterjs/` directory
4. **Browser** loads `public/index.html` → runs `src/main.fjs`

---

> [!TIP]
> Want to understand exactly how the Dart CLI generates these files? Read the [Dart CLI Pipeline Architecture](../architecture/dart-cli-pipeline.md).

---


## Configuration Files

### `.gitignore`

Recommended `.gitignore` for FlutterJS projects:

```gitignore
# Build outputs
build/
dist/
.dev/

# Dependencies
node_modules/
.dart_tool/
.packages

# IDE
.idea/
.vscode/
*.iml

# Logs
*.log

# OS
.DS_Store
Thumbs.db
```

---

## File Extensions

| Extension | Description |
|-----------|-------------|
| `.dart` | Your source Dart code |
| `.fjs` | Generated JavaScript from Dart (FlutterJS format) |
| `.js` | Standard JavaScript files |
| `.json` | Configuration and data files |
| `.yaml` | Dart configuration (pubspec.yaml) |

---

## Development Workflow

### 1. Edit Source Code

```bash
# Edit lib/main.dart
code lib/main.dart
```

### 2. Run Development Server

```bash
dart run bin/flutterjs.dart run --to-js --serve
```

### 3. View Changes

The Dart CLI:
1. Detects your changes in `lib/`
2. Regenerates `build/flutterjs/src/*.fjs`
3. Dev server automatically refreshes (with hot reload support planned)

---

## Production Build

For deployment, create a production build:

```bash
flutterjs build
```

This creates:

```
dist/
├── index.html
├── app.min.js         # Minified and bundled
└── styles.min.css     # Minified styles
```

Deploy the `dist/` folder to your hosting service.

---

## Best Practices

### ✅ Do

- Write all code in `lib/` directory
- Commit `lib/` and `pubspec.yaml` to git
- Add `build/` to `.gitignore`
- Use meaningful file and folder names

### ❌ Don't

- Edit files in `build/` manually
- Commit `build/` or `node_modules/` to git
- Mix JavaScript code with Dart code

---

## Next Steps

- Learn about [CLI Commands](cli-commands.md)
- Explore the [Widget Catalog](../guides/widget-catalog.md)
- Understand [State Management](../guides/state-management.md)
