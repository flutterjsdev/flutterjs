# FlutterJS Output Architecture

## Recommended Approach: Follow Flutter's Build Conventions

### Directory Structure

```
my_flutter_project/
├── lib/                          # Flutter app code
├── web/                          # Flutter web template (source)
│   ├── index.html               # Original template
│   └── manifest.json
├── flutterjs_pubspace/          # FlutterJS source files
│   ├── js/
│   │   ├── my-library.js
│   │   └── package.json
│   ├── assets/
│   │   └── images/
│   └── config.yaml
├── .flutterjs-cache/            # Temporary processing (gitignored)
│   ├── processed_js/
│   └── bundle.js
└── build/                       # Final output (gitignored)
    └── web/                     # ⭐ DEPLOYMENT READY
        ├── index.html           # Injected with FlutterJS
        ├── main.dart.js         # Flutter compiled
        ├── flutterjs/           # Your processed JS/assets
        │   ├── bundle.js
        │   └── assets/
        └── assets/              # Flutter assets
```

---

## Workflow Details

### 1️⃣ Development Mode (`flutterjs dev` or `flutter run`)

```bash
$ flutterjs dev
# or
$ flutter run -d chrome
```

**Process:**
1. Watch `flutterjs_pubspace/` for changes
2. Process JS/assets → `.flutterjs-cache/`
3. Temporarily inject into `web/index.html` (in-memory)
4. Start Flutter dev server with hot reload
5. On changes: reprocess and hot reload

**Key Points:**
- ✅ No permanent modifications to `web/` folder
- ✅ Hot reload works seamlessly
- ✅ Fast iteration cycle
- ✅ `.flutterjs-cache/` holds temporary files

---

### 2️⃣ Build Mode (`flutterjs build`)

```bash
$ flutterjs build --release
```

**Process:**
1. Process `flutterjs_pubspace/`
   - Bundle JS files
   - Minify if `--release`
   - Process assets
   - Generate source maps if needed

2. Run `flutter build web --release`

3. Post-process `build/web/`:
   - Inject `<script>` tags into `build/web/index.html`
   - Copy processed files to `build/web/flutterjs/`
   - Update asset references
   - Generate integrity hashes (optional)

4. Output ready: `build/web/` ✅

**Final `build/web/index.html`:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My App</title>
  
  <!-- FlutterJS injected scripts -->
  <script src="flutterjs/bundle.js" defer></script>
  
  <!-- Flutter scripts -->
  <script src="main.dart.js" type="application/javascript"></script>
</head>
<body>
  <script>
    // FlutterJS initialization
    window.flutterJSConfig = {...};
  </script>
</body>
</html>
```

---

### 3️⃣ Clean Mode (`flutterjs clean`)

```bash
$ flutterjs clean
```

Removes:
- `.flutterjs-cache/`
- `build/`
- `flutterjs_pubspace/js/node_modules/` (if exists)

---

## File Flow Diagram

```
┌─────────────────────────┐
│ flutterjs_pubspace/     │ (User edits here)
│   ├── js/               │
│   ├── assets/           │
│   └── config.yaml       │
└───────────┬─────────────┘
            │
            │ [flutterjs process]
            ▼
┌─────────────────────────┐
│ .flutterjs-cache/       │ (Temporary, gitignored)
│   ├── processed_js/     │
│   ├── bundle.js         │
│   └── asset_manifest.json│
└───────────┬─────────────┘
            │
            │ [flutter build web]
            ▼
┌─────────────────────────┐
│ build/web/              │ (Final output, deploy this!)
│   ├── index.html        │ ← Injected with FlutterJS
│   ├── main.dart.js      │ ← Flutter compiled
│   ├── flutterjs/        │ ← Your JS/assets
│   │   ├── bundle.js     │
│   │   └── assets/       │
│   └── assets/           │ ← Flutter assets
└─────────────────────────┘
```

---

## .gitignore Setup

```gitignore
# Flutter
/build/

# FlutterJS
/.flutterjs-cache/
/flutterjs_pubspace/js/node_modules/
/flutterjs_pubspace/js/package-lock.json
/flutterjs_pubspace/js/yarn.lock

# Don't ignore source files
!/flutterjs_pubspace/
!/flutterjs_pubspace/js/*.js
!/flutterjs_pubspace/assets/
```

---

## Advantages of This Approach

### ✅ **Follows Flutter Conventions**
- Developers know `build/` is output
- `flutter clean` removes everything
- Works with existing CI/CD pipelines

### ✅ **Clean Separation**
- Source: `flutterjs_pubspace/`
- Temporary: `.flutterjs-cache/`
- Output: `build/web/`

### ✅ **Version Control Friendly**
- Only source files are committed
- Output is always gitignored
- No generated file conflicts

### ✅ **Deployment Simple**
```bash
$ flutterjs build --release
$ firebase deploy --only hosting  # Just deploy build/web/
```

### ✅ **IDE Integration**
- VS Code, IntelliJ understand Flutter structure
- No custom configurations needed
- Standard Flutter debugging works

---

## Alternative: Hybrid with Watch Mode

For advanced users who want more control:

```yaml
# flutterjs_pubspace/config.yaml
build:
  output_strategy: "standard"  # or "custom"
  
  custom_output:
    enabled: false
    path: "dist/"  # Custom output directory
```

But **default should always be standard Flutter build folder** for consistency.

---

## Commands Summary

```bash
# Initialize
$ flutterjs init

# Development (watches for changes)
$ flutterjs dev
$ flutter run -d chrome  # Also works

# Build for production
$ flutterjs build --release

# Clean build artifacts
$ flutterjs clean

# Check status
$ flutterjs status
```

---

## Decision: Use Flutter's Standard Build Pattern ✅

**Why:**
1. Zero learning curve for Flutter developers
2. Works with all Flutter tools out of the box
3. Industry standard - expected behavior
4. Simple deployment workflow
5. Compatible with hosting platforms (Firebase, Netlify, etc.)

The tool should **enhance** Flutter's workflow, not replace it.