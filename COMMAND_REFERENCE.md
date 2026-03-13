# FlutterJS Command Reference Card

## Essential Commands

### 1. Get Packages
```bash
dart packages/pubjs/bin/pubjs.dart get
```
Installs and compiles all dependencies to `build/flutterjs/node_modules/`

### 2. Run Development Server
```bash
dart bin/flutterjs.dart run --to-js --serve
```
Builds your app and starts the development server

### 3. Build for Production
```bash
dart bin/flutterjs.dart build web
```
Creates optimized production build in `build/flutterjs/dist/`

## Quick Start Workflow

```bash
cd examples/flutterjs_website

# Step 1: Get packages (do this once or after adding new dependencies)
dart ../../packages/pubjs/bin/pubjs.dart get

# Step 2: Run dev server (do this to see your app)
dart ../../bin/flutterjs.dart run --to-js --serve --hot-reload
```

Open http://localhost:3000 in your browser!

## Common Flag Combinations

### Development
```bash
# Basic dev server
dart bin/flutterjs.dart run --to-js --serve

# With hot reload
dart bin/flutterjs.dart run --to-js --serve --hot-reload

# With browser auto-open
dart bin/flutterjs.dart run --to-js --serve --open-browser

# Custom port
dart bin/flutterjs.dart run --to-js --serve --server-port 8080
```

### Package Management
```bash
# Get packages (basic)
dart packages/pubjs/bin/pubjs.dart get

# Force rebuild all packages
dart packages/pubjs/bin/pubjs.dart get --force

# Verbose output
dart packages/pubjs/bin/pubjs.dart get --verbose

# Production mode
dart packages/pubjs/bin/pubjs.dart get --production

# Rebuild specific packages
dart packages/pubjs/bin/pubjs.dart get --override http,path
```

### Future (Kernel Compilation)
```bash
# Fast builds with kernel
dart packages/pubjs/bin/pubjs.dart get --use-kernel

# Kernel + production
dart packages/pubjs/bin/pubjs.dart get --use-kernel --production
```

## Flag Reference

### flutterjs get
| Flag | Description |
|------|-------------|
| `-p, --path` | Project path |
| `-b, --build-dir` | Build directory |
| `-v, --verbose` | Verbose output |
| `-f, --force` | Force rebuild |
| `--use-kernel` | Kernel compilation ⚡ |
| `--production` | Production mode 📦 |
| `--override` | Rebuild specific packages |

### flutterjs run
| Flag | Description |
|------|-------------|
| `--to-js` | Convert to JavaScript ✅ |
| `--serve` | Start dev server ✅ |
| `--hot-reload` | Auto-rebuild on changes |
| `--server-port` | Custom port (default: 3000) |
| `--open-browser` | Auto-open browser |
| `--clear-cache` | Clear cache |
| `--incremental` | Only rebuild changed files |
| `--js-optimization-level` | 0-3 (default: 1) |

### flutterjs build
| Flag | Description |
|------|-------------|
| `--release` | Production build |
| `--tree-shake-icons` | Remove unused icons |
| `--source-maps` | Generate source maps |

## Directory Structure

```
project/
├── lib/main.dart                  # Your source code
├── pubspec.yaml                   # Dependencies
└── build/flutterjs/
    ├── node_modules/              # Compiled packages ← flutterjs get
    │   └── @flutterjs/
    │       ├── dart/
    │       ├── material/
    │       └── ...
    ├── ir/                        # IR files ← flutterjs run
    │   └── *.ir
    └── dist/                      # JS output ← flutterjs run --to-js
        ├── index.html
        ├── main.js
        └── ...
```

## Workflow Shortcuts

### First Time Setup
```bash
cd your_project
dart path/to/pubjs.dart get
dart path/to/flutterjs.dart run --to-js --serve
```

### Daily Development
```bash
# Already have packages? Just run:
dart bin/flutterjs.dart run --to-js --serve --hot-reload
```

### After Adding Packages
```bash
# Update pubspec.yaml, then:
dart packages/pubjs/bin/pubjs.dart get
dart bin/flutterjs.dart run --to-js --serve
```

### Clean Rebuild
```bash
rm -rf build/
dart packages/pubjs/bin/pubjs.dart get --force
dart bin/flutterjs.dart run --to-js --serve --clear-cache
```

### Production Deploy
```bash
dart packages/pubjs/bin/pubjs.dart get --production
dart bin/flutterjs.dart build web --release
# Deploy build/flutterjs/dist/
```

## Performance

### Current (Analyzer-Based)
- Get packages: ~10 seconds
- Build app: ~1 second
- Hot reload: ~500ms

### Future (With Kernel)
- Get packages (first): ~10 seconds
- Get packages (cached): ~4 seconds (55% faster!)
- Production bundles: 99% smaller!

## Troubleshooting Quick Fixes

### Packages not found?
```bash
dart packages/pubjs/bin/pubjs.dart get --force
```

### Server won't start?
```bash
# Try different port
dart bin/flutterjs.dart run --to-js --serve --server-port 8080
```

### Build failing?
```bash
# Clear cache
dart bin/flutterjs.dart run --to-js --serve --clear-cache
```

### Need debug info?
```bash
dart packages/pubjs/bin/pubjs.dart get --verbose
dart bin/flutterjs.dart run --to-js --serve --show-analysis
```

## Current Status

✅ **flutterjs get** - Working (22 packages, 1,202 exports)
✅ **flutterjs run --to-js --serve** - Working (61ms builds)
✅ **flutterjs build web** - Working (306KB output)
🔄 **--use-kernel** - Ready (needs kernel package dependency)
🔄 **--production** - Partial (needs minification pipeline)

---

**Quick Help**: Run any command with `--help` for more options
