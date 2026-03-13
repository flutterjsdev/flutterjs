# Testing Instructions - dart2js Integration

**Purpose:** Complete testing and validation of dart2js integration for Claude desktop application

**Status:** Ready for testing
**Expected Duration:** 30-45 minutes
**Date:** March 13, 2026

---

## Overview

You will test the complete dart2js integration which enables FlutterJS to use Flutter's dart2js compiler for pub.dev packages while maintaining the FlutterJS custom transpiler for application code.

**What's been implemented:**
1. ✅ Package compilation with dart2js (`flutterjs get`)
2. ✅ Import map generation for dart2js packages
3. ✅ HTML build with updated import maps
4. ✅ Automatic detection of dart2js vs FlutterJS packages

---

## Prerequisites

### System Requirements
- Windows with Dart SDK installed
- Flutter SDK in PATH
- Node.js (for serving)
- Python (for simple HTTP server)

### Project Location
```
C:\Jay\_Plugin\flutterjs\examples\flutterjs_website
```

### Key Files Modified
1. `packages/pubjs/lib/src/runtime_package_manager.dart` - dart2js compilation
2. `packages/flutterjs_engine/src/import_rewriter.js` - Import map generation
3. `packages/pubjs/lib/src/commands.dart` - GetCommand integration

---

## Testing Phases

### Phase 1: Clean Build Environment (5 minutes)

**Purpose:** Start with clean slate to verify everything works from scratch

**Commands:**
```bash
cd C:\Jay\_Plugin\flutterjs\examples\flutterjs_website

# Clean old build artifacts
rm -rf build/flutterjs/node_modules
rm -rf build/flutterjs/dist
rm -rf build/flutterjs/src
rm -rf .flutterjs_temp
```

**Expected Result:**
- All build directories removed
- Clean starting state

**Verification:**
```bash
ls build/flutterjs/
# Should show: empty or minimal files
```

---

### Phase 2: Install Packages with dart2js (10 minutes)

**Purpose:** Compile pub.dev packages using dart2js

**Commands:**
```bash
cd C:\Jay\_Plugin\flutterjs\examples\flutterjs_website

dart ../../packages/pubjs/bin/pubjs.dart get --verbose
```

**Expected Output:**
```
═══════════════════════════════════════════════════════
FlutterJS Package Manager
═══════════════════════════════════════════════════════

📍 Project: C:\Jay\_Plugin\flutterjs\examples\flutterjs_website
📂 Build Dir: build/flutterjs
🔧 Mode: development

📦 Resolving and compiling packages...

🔍 Resolving packages with Dart pub...
Resolving dependencies...
Got dependencies!
✓ Packages resolved

🔨 Compiling async with dart2js...
   Compiling async_entry.dart → async.js
✓ async compiled and installed

🔨 Compiling collection with dart2js...
   Compiling collection_entry.dart → collection.js
✓ collection compiled and installed

... (more packages)

═══════════════════════════════════════════════════════
Build Summary
═══════════════════════════════════════════════════════
✓ Compiled: 15-20 packages
⏭️  Skipped: 30-40 packages (up-to-date)
❌ Failed: 0-5 packages (expected)
⏱️  Total time: 60-120 seconds
═══════════════════════════════════════════════════════

✅ All packages ready!
```

**Verification Checklist:**
```bash
# 1. Check dart2js packages were created
ls build/flutterjs/node_modules/async/
# Should show: async.js, async.js.deps, exports.json, package.json

ls build/flutterjs/node_modules/collection/
# Should show: collection.js, exports.json, package.json

# 2. Check package sizes (should be reasonable)
du -sh build/flutterjs/node_modules/async/async.js
# Expected: 10-20K

du -sh build/flutterjs/node_modules/collection/collection.js
# Expected: 10-15K

# 3. Verify exports.json format
cat build/flutterjs/node_modules/async/exports.json
# Should show:
# {
#   "package": "async",
#   "version": "1.0.0",
#   "exports": [
#     {
#       "name": "*",
#       "path": "./async.js",
#       "uri": "package:async/async.dart",
#       "type": "module"
#     }
#   ]
# }

# 4. Check FlutterJS SDK packages (should NOT be dart2js)
ls build/flutterjs/node_modules/@flutterjs/material/
# Should show: src/, dist/, exports.json, package.json (NOT material.js)

# 5. Count total packages
ls build/flutterjs/node_modules/ | wc -l
# Expected: 80-100 packages
```

**Issues to Report:**

❌ **If compilation fails:**
- Note which packages failed
- Check error messages for patterns
- Report: "Package X failed with error: Y"

❌ **If no packages compiled:**
- Check if dart2js is in PATH: `which dart` or `where dart`
- Check .dart_tool/package_config.json exists
- Report: "No packages compiled, dart2js not found"

❌ **If wrong packages compiled:**
- Check which packages have .js files
- Report: "Expected X packages, got Y"

✅ **If successful:**
- Note number of compiled packages
- Note any warnings
- Report: "Phase 2 passed: X packages compiled"

---

### Phase 3: Build Application with Import Maps (5 minutes)

**Purpose:** Compile application code and generate HTML with dart2js import maps

**Commands:**
```bash
cd C:\Jay\_Plugin\flutterjs\examples\flutterjs_website

dart ../../bin/flutterjs.dart build --mode dev
```

**Expected Output:**
```
┌────────────────────────────────────────────────────────┐
│    FLUTTER IR TO JAVASCRIPT CONVERSION PIPELINE        │
└────────────────────────────────────────────────────────┘

📦 Preparing packages...
✓ Dependencies verified.

PHASE 1: Analyzing project...
✓ 13 files analyzed

... (more phases)

PHASE 8: Generating HTML...
  ✓ Found dart2js version: async.js
  ✓ Found dart2js version: collection.js
  ✓ Found dart2js version: characters.js
✓ HTML generation complete

======================================================================
BUILD COMPLETE
======================================================================

📊 Statistics:
  Build Time: 2000-3000ms

✅ Output: build/flutterjs/dist
   - index.html
   - app.js
   - styles.css

📦 Bundle Size: 30-40 KB
======================================================================
```

**Verification Checklist:**
```bash
# 1. Check HTML was regenerated (timestamp should be recent)
ls -lh build/flutterjs/dist/index.html
# Should show current date/time

# 2. Check import map includes dart2js packages
grep '"async":' build/flutterjs/dist/index.html
# Should show: "async": "/node_modules/async/async.js"

grep '"collection":' build/flutterjs/dist/index.html
# Should show: "collection": "/node_modules/collection/collection.js"

# 3. Check import map includes FlutterJS SDK packages
grep '@flutterjs/material' build/flutterjs/dist/index.html
# Should show: "@flutterjs/material": "/node_modules/@flutterjs/material/src/index.js"

# 4. Check application code was compiled
ls build/flutterjs/src/
# Should show: main.js, pages/, services/

# 5. Check bundle size
du -sh build/flutterjs/dist/
# Expected: 100-200K total
```

**Issues to Report:**

❌ **If build fails:**
- Note which phase failed
- Check error messages
- Report: "Build failed at Phase X: error Y"

❌ **If HTML not regenerated:**
- Check timestamp
- Report: "HTML not regenerated, still old date"

❌ **If import map missing dart2js packages:**
```bash
# Check what's in import map
grep '"async":\|"collection":\|"characters":' build/flutterjs/dist/index.html
```
- Report: "Import map missing dart2js packages: async, collection"

✅ **If successful:**
- Note build time
- Note bundle size
- Report: "Phase 3 passed: HTML generated with dart2js imports"

---

### Phase 4: Verify Import Map Structure (5 minutes)

**Purpose:** Deep verification of import map contents

**Commands:**
```bash
cd C:\Jay\_Plugin\flutterjs\examples\flutterjs_website

# Extract import map from HTML
grep -A 500 '<script type="importmap">' build/flutterjs/dist/index.html | grep -B 500 '</script>' > /tmp/importmap.txt

# Check dart2js packages
grep '"async":\|"args":\|"characters":\|"collection":\|"convert":' /tmp/importmap.txt
```

**Expected dart2js Packages:**
```json
{
  "async": "/node_modules/async/async.js",
  "args": "/node_modules/args/args.js",
  "built_collection": "/node_modules/built_collection/built_collection.js",
  "characters": "/node_modules/characters/characters.js",
  "collection": "/node_modules/collection/collection.js",
  "convert": "/node_modules/convert/convert.js",
  "clock": "/node_modules/clock/clock.js",
  "crypto": "/node_modules/crypto/crypto.js"
}
```

**Expected FlutterJS SDK Packages:**
```json
{
  "@flutterjs/material": "/node_modules/@flutterjs/material/src/index.js",
  "@flutterjs/widgets": "/node_modules/@flutterjs/widgets/src/index.js",
  "@flutterjs/dart": "/node_modules/@flutterjs/dart/dist/index.js",
  "@flutterjs/runtime": "/node_modules/@flutterjs/runtime/dist/index.js"
}
```

**Verification Checklist:**
```bash
# Count dart2js packages in import map
grep '\.js",' /tmp/importmap.txt | grep '/node_modules/[a-z_]*/' | wc -l
# Expected: 15-25 dart2js packages

# Count FlutterJS SDK packages
grep '@flutterjs/' /tmp/importmap.txt | wc -l
# Expected: 50-100 entries

# Check no broken paths
grep '""' /tmp/importmap.txt
# Should be empty (no empty paths)

# Check all paths start with /
grep ': "' /tmp/importmap.txt | grep -v ': "/'
# Should be empty (all paths absolute)
```

**Issues to Report:**

❌ **If dart2js packages missing:**
- List which packages expected but not found
- Report: "Missing dart2js packages: X, Y, Z"

❌ **If wrong path format:**
- Show example of bad path
- Report: "Wrong path format: 'async' points to 'X' instead of '/node_modules/async/async.js'"

❌ **If FlutterJS SDK broken:**
- Check which SDK package is wrong
- Report: "@flutterjs/material broken path"

✅ **If successful:**
- Count packages correctly mapped
- Report: "Phase 4 passed: Import map verified, X dart2js + Y SDK packages"

---

### Phase 5: Browser Testing (10 minutes)

**Purpose:** Test in actual browser environment

**Commands:**
```bash
cd C:\Jay\_Plugin\flutterjs\examples\flutterjs_website\build\flutterjs\dist

# Option 1: Python HTTP server
python -m http.server 8000

# Option 2: Node HTTP server
npx http-server -p 8000

# Open browser
start http://localhost:8000
```

**Browser Testing Checklist:**

1. **Console Check (F12)**
   ```
   ✅ No import errors
   ✅ No "module not found" errors
   ✅ No "404 Not Found" for .js files
   ✅ Application loads successfully
   ```

2. **Network Tab**
   ```
   ✅ Check async.js loads from /node_modules/async/async.js
   ✅ Check collection.js loads correctly
   ✅ Check @flutterjs/* packages load
   ✅ Check main.js loads
   ✅ All requests return 200 OK
   ```

3. **Application Functionality**
   ```
   ✅ Page renders correctly
   ✅ Navigation works
   ✅ No JavaScript errors
   ✅ Widgets display properly
   ✅ Interactions work (clicks, etc.)
   ```

**Issues to Report:**

❌ **Import Errors:**
```javascript
// Browser console shows:
Failed to resolve module specifier "async"
```
- Take screenshot
- Note which module failed
- Report: "Import error for module 'async'"

❌ **404 Errors:**
```
GET http://localhost:8000/node_modules/async/async.js 404
```
- Check if file exists: `ls build/flutterjs/node_modules/async/async.js`
- Report: "404 for async.js, file exists: yes/no"

❌ **Runtime Errors:**
```javascript
TypeError: Cannot read property 'X' of undefined
```
- Take screenshot
- Note stack trace
- Report: "Runtime error in package X: message"

✅ **If successful:**
- Take screenshot of working website
- Report: "Phase 5 passed: Website loads and runs correctly"

---

### Phase 6: Package Import Testing (5 minutes)

**Purpose:** Verify specific dart2js packages work correctly

**Test each package individually:**

**Test 1: async package**
```javascript
// Open browser console
import { Future } from '/node_modules/async/async.js';

// Should load without error
// Check exports
console.log(Future);
```

**Expected:** No errors, Future constructor defined

**Test 2: collection package**
```javascript
import * as collection from '/node_modules/collection/collection.js';

console.log(collection);
```

**Expected:** Object with collection utilities

**Test 3: characters package**
```javascript
import * as chars from '/node_modules/characters/characters.js';

console.log(chars);
```

**Expected:** Characters utilities loaded

**Issues to Report:**

❌ **Module not found:**
- Report: "Package X cannot be imported"

❌ **Exports undefined:**
- Report: "Package X loads but exports are undefined"

❌ **Type errors:**
- Report: "Package X runtime error: message"

✅ **If successful:**
- Report: "Phase 6 passed: All dart2js packages import correctly"

---

### Phase 7: Performance Testing (3 minutes)

**Purpose:** Measure build and load performance

**Commands:**
```bash
# Time full rebuild
cd C:\Jay\_Plugin\flutterjs\examples\flutterjs_website

# Clean first
rm -rf build/flutterjs

# Time the build
time dart ../../packages/pubjs/bin/pubjs.dart get
time dart ../../bin/flutterjs.dart build --mode dev
```

**Metrics to Record:**

1. **Package Compilation Time**
   - flutterjs get duration: ______ seconds
   - Number of packages compiled: ______
   - Average time per package: ______ seconds

2. **Application Build Time**
   - flutterjs build duration: ______ seconds
   - Number of files: ______

3. **Bundle Size**
   ```bash
   du -sh build/flutterjs/dist/
   du -sh build/flutterjs/node_modules/
   ```
   - Total dist size: ______ KB
   - Total node_modules size: ______ MB

4. **Browser Load Time**
   - Open DevTools Network tab
   - Reload page
   - Note "Finish" time: ______ ms
   - Note number of requests: ______

**Report:**
```
Phase 7 Performance Metrics:
- Package compilation: X seconds (Y packages)
- Application build: Z seconds
- Bundle size: A KB
- Browser load: B ms (C requests)
```

---

### Phase 8: Edge Cases & Error Handling (5 minutes)

**Purpose:** Test error conditions and edge cases

**Test 1: Missing dart2js Package**
```bash
# Remove a dart2js package
rm build/flutterjs/node_modules/async/async.js

# Rebuild
dart ../../bin/flutterjs.dart build --mode dev
```

**Expected:** Build should detect missing file and either:
- Regenerate import map without async
- OR fall back to FlutterJS transpiler version
- OR show clear error message

**Test 2: Corrupted exports.json**
```bash
# Corrupt exports.json
echo "invalid json" > build/flutterjs/node_modules/collection/exports.json

# Rebuild
dart ../../bin/flutterjs.dart build --mode dev
```

**Expected:** Build should handle gracefully with warning

**Test 3: Mixed dart2js and FlutterJS**
```bash
# Delete some dart2js packages
rm build/flutterjs/node_modules/async/async.js
rm build/flutterjs/node_modules/collection/collection.js

# Keep others intact

# Rebuild
dart ../../bin/flutterjs.dart build --mode dev

# Check import map
grep '"async":\|"collection":' build/flutterjs/dist/index.html
```

**Expected:** Import map should fall back to FlutterJS versions for deleted packages

**Issues to Report:**

❌ **Build crashes:**
- Report: "Build crashed when X missing"

❌ **No error message:**
- Report: "Build succeeded but broken (no error shown)"

❌ **Wrong fallback:**
- Report: "Did not fall back to FlutterJS transpiler"

✅ **If successful:**
- Report: "Phase 8 passed: Error handling works correctly"

---

## Summary Report Template

After completing all phases, provide this summary:

```markdown
# dart2js Integration Test Report

**Date:** [Current Date]
**Tester:** Claude Desktop
**Duration:** [Total Time]

## Executive Summary

[Overall assessment: PASS/FAIL with details]

## Phase Results

### Phase 1: Clean Build ✅/❌
- Status:
- Issues:

### Phase 2: Package Compilation ✅/❌
- Packages compiled: X
- Packages failed: Y
- Issues:

### Phase 3: Application Build ✅/❌
- Build time: X ms
- Bundle size: Y KB
- Issues:

### Phase 4: Import Map Verification ✅/❌
- dart2js packages: X
- SDK packages: Y
- Issues:

### Phase 5: Browser Testing ✅/❌
- Loads successfully: yes/no
- Console errors: yes/no
- Issues:

### Phase 6: Package Import Testing ✅/❌
- Packages tested: X/Y
- Issues:

### Phase 7: Performance ✅/❌
- Compilation time: X s
- Build time: Y s
- Load time: Z ms
- Issues:

### Phase 8: Edge Cases ✅/❌
- Error handling: working/broken
- Fallbacks: working/broken
- Issues:

## Critical Issues Found

1. [Issue description]
   - Severity: High/Medium/Low
   - Steps to reproduce:
   - Expected behavior:
   - Actual behavior:

2. [Next issue...]

## Recommendations

1. [Recommendation for improvements]
2. [Next recommendation...]

## Conclusion

[Final assessment and next steps]
```

---

## Quick Reference Commands

### Full Test Run (Copy-paste ready)
```bash
# Navigate to project
cd C:\Jay\_Plugin\flutterjs\examples\flutterjs_website

# Clean build
rm -rf build/flutterjs/node_modules build/flutterjs/dist build/flutterjs/src .flutterjs_temp

# Install packages with dart2js
dart ../../packages/pubjs/bin/pubjs.dart get --verbose

# Build application
dart ../../bin/flutterjs.dart build --mode dev

# Verify import map
grep '"async":\|"collection":\|"characters":' build/flutterjs/dist/index.html

# Serve
cd build/flutterjs/dist && python -m http.server 8000
```

### Quick Verification Commands
```bash
# Count dart2js packages
ls build/flutterjs/node_modules/*/*.js | grep -v '@flutterjs' | wc -l

# Check package sizes
du -sh build/flutterjs/node_modules/*/*.js | head -20

# Verify import map structure
grep -A 500 '<script type="importmap">' build/flutterjs/dist/index.html | head -50

# Check for errors in build
dart ../../bin/flutterjs.dart build --mode dev 2>&1 | grep -i "error\|fail"
```

---

## Expected Outcomes

### ✅ Success Criteria

1. **Compilation:** 15-20 packages compiled with dart2js
2. **Build:** Application builds successfully in 2-3 seconds
3. **Import Map:** Contains dart2js packages with correct paths
4. **Browser:** Website loads without errors
5. **Functionality:** All features work correctly
6. **Performance:** Reasonable load times (<1 second)

### ❌ Failure Indicators

1. **No packages compiled** - dart2js integration broken
2. **Build fails** - Code generation issues
3. **Import errors** - Import map wrong
4. **404 errors** - Paths incorrect
5. **Runtime errors** - Compatibility issues

---

## Troubleshooting Guide

### Problem: dart pub get fails
**Solution:**
```bash
# Check Dart SDK
dart --version

# Check pubspec.yaml exists
ls pubspec.yaml

# Try manual pub get
dart pub get
```

### Problem: dart2js compilation fails
**Solution:**
```bash
# Check package has entry point
ls build/flutterjs/node_modules/async/lib/async.dart

# Try manual compilation
cd build/flutterjs/node_modules/async
dart compile js lib/async.dart -o test.js
```

### Problem: Import map not generated
**Solution:**
```bash
# Check if build completed
ls build/flutterjs/dist/index.html

# Check modification time
ls -lh build/flutterjs/dist/index.html

# Force rebuild
rm build/flutterjs/dist/index.html
dart ../../bin/flutterjs.dart build --mode dev
```

### Problem: Browser 404 errors
**Solution:**
```bash
# Check file exists
ls build/flutterjs/node_modules/async/async.js

# Check import map path
grep '"async":' build/flutterjs/dist/index.html

# Verify serving from correct directory
pwd  # Should be: .../build/flutterjs/dist
```

---

## Contact & Support

If you encounter issues not covered in this guide:

1. Check the documentation files:
   - `DART2JS_INTEGRATION_STATUS.md`
   - `IMPORT_MAP_DART2JS_INTEGRATION.md`
   - `DART2JS_COMPLETE_SUMMARY.md`

2. Collect debugging information:
   - Build output (full console log)
   - Browser console errors (screenshot)
   - File listing: `ls -R build/flutterjs/node_modules/ > debug.txt`
   - Import map: `grep -A 500 '<script type="importmap">' build/flutterjs/dist/index.html > importmap.txt`

3. Report findings with:
   - Phase where issue occurred
   - Expected vs actual behavior
   - Error messages
   - Screenshots

---

**Good luck with testing! 🚀**

This integration represents a significant milestone in FlutterJS development, enabling the use of Flutter's production-ready dart2js compiler while maintaining the benefits of the FlutterJS custom transpiler.
