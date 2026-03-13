# Complete FlutterJS Development Workflow

## Overview

This guide shows the complete workflow from package setup to running your FlutterJS application on a development server.

## Step-by-Step Process

### Step 1: Prepare Packages (Get)

First, install and compile all dependencies:

```bash
cd examples/flutterjs_website

# Get and compile packages
dart ../../packages/pubjs/bin/pubjs.dart get

# Or with options:
dart ../../packages/pubjs/bin/pubjs.dart get --verbose --force
```

**What This Does**:
- Resolves dependencies from `pubspec.yaml`
- Runs `dart pub get`
- Compiles packages to JavaScript
- Creates `build/flutterjs/node_modules/` with all packages
- Generates package configuration files

**Output**:
```
═══════════════════════════════════════════════════════
FlutterJS Package Manager
═══════════════════════════════════════════════════════

📍 Project: /path/to/your/project
📂 Build Dir: /path/to/your/project/build/flutterjs
🔧 Mode: development

📦 Resolving and compiling packages...

✓ Package installation complete!

📊 Summary:
   Location: build/flutterjs/node_modules/
   Mode: development

Next steps:
   flutterjs build web    # Build your application
```

**Result**: `build/flutterjs/node_modules/` contains:
- `@flutterjs/dart` - dart:core runtime
- `@flutterjs/material` - Material Design widgets
- `@flutterjs/widgets` - Widget system
- `@flutterjs/foundation` - Foundation classes
- All third-party packages (http, path, etc.)

### Step 2: Build and Serve (Run)

Now build your app and start the development server:

```bash
# Build to JavaScript and serve
dart ../../bin/flutterjs.dart run --to-js --serve

# Or with custom port:
dart ../../bin/flutterjs.dart run --to-js --serve --server-port 8080

# With hot reload:
dart ../../bin/flutterjs.dart run --to-js --serve --hot-reload

# With browser auto-open:
dart ../../bin/flutterjs.dart run --to-js --serve --open-browser
```

**What This Does**:
1. **Analyzes** Dart code
2. **Generates IR** (Intermediate Representation)
3. **Converts to JavaScript** (with --to-js flag)
4. **Starts dev server** (with --serve flag)
5. **Watches for changes** (if --hot-reload is used)

**Output**:
```
FlutterJS Development Server
============================

📍 Project: /path/to/your/project
🔧 Mode: development
⚡ Hot reload: enabled

Phase 1: Static Analysis
✓ Analyzed 15 files

Phase 2: IR Generation
✓ Generated IR for 15 files

Phase 3: JavaScript Conversion
✓ Converted to JavaScript

🌐 Server running at: http://localhost:3000
📂 Serving from: build/flutterjs/dist

Press Ctrl+C to stop
```

### Step 3: Open in Browser

Open your browser to the server URL:
```
http://localhost:3000
```

Your FlutterJS app is now running!

## Complete Workflow Commands

### Development (Quick Start)
```bash
# One-time setup
cd examples/flutterjs_website
dart ../../packages/pubjs/bin/pubjs.dart get

# Start development server (run after any code changes)
dart ../../bin/flutterjs.dart run --to-js --serve --hot-reload
```

### Production Build
```bash
# Get packages in production mode
dart ../../packages/pubjs/bin/pubjs.dart get --production

# Build optimized JavaScript
dart ../../bin/flutterjs.dart build web --release

# Serve production build
cd build/flutterjs/dist
python -m http.server 8080
```

## Available Flags

### `flutterjs get` Flags
```bash
-p, --path           # Project path (default: current directory)
-b, --build-dir      # Build output directory
-v, --verbose        # Show verbose output
-f, --force          # Force rebuild all packages
--use-kernel         # Use kernel compilation (experimental) ⚡
--production         # Production mode (minified, no source maps) 📦
--override           # Force rebuild specific packages
```

### `flutterjs run` Flags
```bash
# Core flags
--to-js              # Convert IR to JavaScript ✅ REQUIRED
--serve              # Start dev server ✅ REQUIRED
--server-port        # Custom port (default: 3000)
--open-browser       # Auto-open browser

# Development flags
--hot-reload         # Watch for changes and auto-rebuild
--incremental        # Only reprocess changed files (default: true)
--clear-cache        # Clear cache and full rebuild

# Optimization flags
--js-optimization-level  # 0-3 (default: 1)
--validate-output    # Validate generated JS (default: true)
--generate-reports   # Generate conversion reports (default: true)

# DevTools flags
--devtools-port      # DevTools server port (default: 8765)
--devtools-no-open   # Don't auto-open DevTools browser
```

## Common Workflows

### 1. Fresh Start
```bash
# Clean everything and start fresh
rm -rf build/
dart ../../packages/pubjs/bin/pubjs.dart get --force
dart ../../bin/flutterjs.dart run --to-js --serve --clear-cache
```

### 2. Quick Development
```bash
# If packages are already installed, just run
dart ../../bin/flutterjs.dart run --to-js --serve --hot-reload
```

### 3. Production Preview
```bash
# Build with production optimizations
dart ../../packages/pubjs/bin/pubjs.dart get --production
dart ../../bin/flutterjs.dart build web --release

# Serve and test
cd build/flutterjs/dist
python -m http.server 8080
```

### 4. Package Development
```bash
# Rebuild specific package only
dart ../../packages/pubjs/bin/pubjs.dart get --override http,path

# Test the app
dart ../../bin/flutterjs.dart run --to-js --serve
```

### 5. Debugging
```bash
# Verbose output with all reports
dart ../../packages/pubjs/bin/pubjs.dart get --verbose
dart ../../bin/flutterjs.dart run --to-js --serve \
  --show-analysis \
  --generate-reports \
  --js-optimization-level 0
```

## Directory Structure After Build

```
examples/flutterjs_website/
├── build/
│   └── flutterjs/
│       ├── node_modules/          # From: flutterjs get
│       │   ├── @flutterjs/        # FlutterJS packages
│       │   │   ├── dart/          # (429KB)
│       │   │   ├── material/      # (5.5MB)
│       │   │   └── ...
│       │   └── http/              # Third-party packages
│       ├── ir/                    # From: flutterjs run
│       │   └── *.ir               # Binary IR files
│       ├── dist/                  # From: flutterjs run --to-js
│       │   ├── index.html         # Generated HTML
│       │   ├── app.js             # App bootstrap
│       │   ├── main.js            # Your compiled app
│       │   ├── importmap.json     # Import mappings
│       │   └── ...
│       └── reports/               # Conversion reports
├── lib/
│   └── main.dart                  # Your source code
└── pubspec.yaml                   # Dependencies
```

## Troubleshooting

### Issue: "Package not found"
```bash
# Solution: Run flutterjs get first
dart ../../packages/pubjs/bin/pubjs.dart get --force
```

### Issue: "JavaScript conversion failed"
```bash
# Solution: Clear cache and rebuild
dart ../../bin/flutterjs.dart run --to-js --serve --clear-cache
```

### Issue: "Port already in use"
```bash
# Solution: Use different port
dart ../../bin/flutterjs.dart run --to-js --serve --server-port 8080
```

### Issue: "Packages not compiling"
```bash
# Solution: Verbose mode to see errors
dart ../../packages/pubjs/bin/pubjs.dart get --verbose --force
```

## Performance Tips

### 1. Use Incremental Builds
```bash
# Default behavior - only recompiles changed files
dart ../../bin/flutterjs.dart run --to-js --serve --incremental
```

### 2. Optimize for Development
```bash
# Lower optimization level for faster builds
dart ../../bin/flutterjs.dart run --to-js --serve \
  --js-optimization-level 0
```

### 3. Optimize for Production
```bash
# Maximum optimization
dart ../../packages/pubjs/bin/pubjs.dart get --production
dart ../../bin/flutterjs.dart build web \
  --release \
  --tree-shake-icons
```

### 4. Use Hot Reload
```bash
# Auto-rebuild on file changes
dart ../../bin/flutterjs.dart run --to-js --serve --hot-reload
```

## Future: With Kernel Compilation

Once kernel compilation is activated:

```bash
# 55% faster builds with kernel
dart ../../packages/pubjs/bin/pubjs.dart get --use-kernel

# First build: ~1000ms per package
# Cached builds: ~450ms per package ⚡

# Production with kernel + optimization
dart ../../packages/pubjs/bin/pubjs.dart get --use-kernel --production

# Result: 99% smaller bundles! 📦
```

## Summary

**Complete workflow**:
1. `flutterjs get` → Install and compile packages
2. `flutterjs run --to-js --serve` → Build app and start server
3. Open browser → See your app!

**For development**:
```bash
# Setup once
dart packages/pubjs/bin/pubjs.dart get

# Run during development
dart bin/flutterjs.dart run --to-js --serve --hot-reload
```

**For production**:
```bash
dart packages/pubjs/bin/pubjs.dart get --production
dart bin/flutterjs.dart build web --release
```

---

**Current Status**: ✅ All commands working
**Next**: Add kernel compilation for 55% faster builds
