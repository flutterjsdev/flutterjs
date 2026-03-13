# FlutterJS Testing Instructions for Claude Code Desktop App

## Overview

This document provides complete testing instructions for verifying the FlutterJS compiler system on the Claude Code desktop app.

## Prerequisites

- Claude Code desktop app installed
- Dart SDK installed
- Python installed (for serving)
- Git bash or similar terminal

## Project Location

```
C:\Jay\_Plugin\flutterjs
```

## Testing Checklist

### Phase 1: Verify Build System ✓

#### Test 1.1: Check Package Structure
```bash
# Navigate to project
cd C:\Jay\_Plugin\flutterjs

# List FlutterJS packages
ls packages/flutterjs_*/

# Expected: 22 packages
# flutterjs_analyzer, flutterjs_animation, flutterjs_builder, flutterjs_core,
# flutterjs_cupertino, flutterjs_dart, flutterjs_dev_tools, flutterjs_dev_utils,
# flutterjs_engine, flutterjs_foundation, flutterjs_gen, flutterjs_gestures,
# flutterjs_material, flutterjs_painting, flutterjs_rendering, flutterjs_runtime,
# flutterjs_seo, flutterjs_server, flutterjs_services, flutterjs_tools,
# flutterjs_vdom, flutterjs_widgets
```

**Expected Result**: All 22 packages present

#### Test 1.2: Check dart:core Implementation
```bash
# Navigate to dart package
cd packages/flutterjs_dart

# List core implementations
ls -lh dist/core/*.js

# Check exports
cat exports.json | head -20

# Expected: DateTime, Uri, Exception, StringBuffer, Duration, etc.
```

**Expected Result**:
- 8 core files present
- 151 exports in exports.json
- Total size ~100KB

#### Test 1.3: Verify Kernel Infrastructure
```bash
# Check kernel compiler
cat packages/flutterjs_core/lib/src/kernel/kernel_compiler.dart | head -50

# Test kernel compilation
dart tools/test_kernel_compilation.dart

# Expected output:
# ✓ Kernel compilation test passed!
# Magic number: 0x90ABCDEF
```

**Expected Result**: Test passes, .dill file created with correct magic number

---

### Phase 2: Test Package Manager ✓

#### Test 2.1: Check GetCommand Implementation
```bash
# View get command
cat packages/pubjs/lib/src/commands.dart | grep -A 30 "class GetCommand"

# Test help
dart packages/pubjs/bin/pubjs.dart get --help

# Expected: Shows all flags including --use-kernel and --production
```

**Expected Result**: Help shows:
- `--use-kernel` flag
- `--production` flag
- `--force` flag
- `--verbose` flag

#### Test 2.2: Run Package Get (Dry Run)
```bash
# Navigate to example
cd examples/flutterjs_website

# Run get with verbose
dart ../../packages/pubjs/bin/pubjs.dart get --verbose

# Expected:
# - Packages resolved
# - node_modules created
# - All packages compiled
```

**Expected Result**:
- `build/flutterjs/node_modules/` created
- `@flutterjs/` packages present
- Third-party packages present
- Total size ~13MB

#### Test 2.3: Verify node_modules Structure
```bash
# Check FlutterJS packages
ls -la build/flutterjs/node_modules/@flutterjs/

# Check specific package
ls -lh build/flutterjs/node_modules/@flutterjs/dart/dist/core/

# Check third-party packages
ls build/flutterjs/node_modules/ | grep -v "@flutterjs"
```

**Expected Result**:
- 18 @flutterjs packages
- dart:core files present
- http, path, collection packages present

---

### Phase 3: Test Build System ✓

#### Test 3.1: Build Website Example
```bash
# From examples/flutterjs_website
dart ../../bin/flutterjs.dart build web

# Expected:
# - Build completes successfully
# - Output in build/flutterjs/dist/
# - Bundle size ~306KB
```

**Expected Result**:
- Build time: ~60ms
- Files created: index.html, app.js, main.js
- Total size: ~306KB

#### Test 3.2: Verify Generated Files
```bash
# Check dist directory
ls -lh build/flutterjs/dist/

# Check main.js (your compiled app)
head -50 build/flutterjs/dist/main.js

# Check importmap
cat build/flutterjs/dist/importmap.json | head -20
```

**Expected Result**:
- All files present (index.html, app.js, main.js, etc.)
- main.js contains compiled widgets
- importmap contains @flutterjs packages

#### Test 3.3: Verify Import Resolution
```bash
# Check imports in main.js
grep "import.*@flutterjs" build/flutterjs/dist/main.js | head -5

# Expected: Imports from @flutterjs/dart/core, @flutterjs/material, etc.
```

**Expected Result**: All imports resolve to correct packages

---

### Phase 4: Test Development Server ✓

#### Test 4.1: Start HTTP Server
```bash
# Navigate to dist
cd build/flutterjs/dist

# Start server
python -m http.server 8000 &

# Wait 2 seconds
sleep 2

# Test connection
curl -I http://localhost:8000/

# Expected: HTTP/1.0 200 OK
```

**Expected Result**: Server starts on port 8000, returns 200 OK

#### Test 4.2: Verify Page Loads
```bash
# Check HTML content
curl -s http://localhost:8000/ | grep -E "(title|script|FlutterJS)" | head -10

# Expected: Title, script tags, importmap present
```

**Expected Result**: HTML contains all necessary tags

#### Test 4.3: Verify JavaScript Loading
```bash
# Check app.js loads
curl -s http://localhost:8000/app.js | head -30

# Check main.js loads
curl -s http://localhost:8000/main.js | head -30

# Expected: Valid JavaScript, imports present
```

**Expected Result**: JavaScript files load correctly with ES6 modules

#### Test 4.4: Stop Server
```bash
# Find and kill server
pkill -f "http.server 8000" || killall -9 python

# Verify stopped
curl -I http://localhost:8000/ 2>&1 | grep -q "Failed to connect"
echo $?  # Should be 0 (success = connection failed)
```

**Expected Result**: Server stops successfully

---

### Phase 5: Test Documentation ✓

#### Test 5.1: Verify Documentation Files
```bash
# List documentation
ls -1 *.md | grep -E "(KERNEL|QUICK|COMMAND|WORKFLOW|SESSION)"

# Expected files:
# - QUICK_START.md
# - COMMAND_REFERENCE.md
# - COMPLETE_WORKFLOW.md
# - SESSION_SUMMARY.md
# - KERNEL_*.md files
```

**Expected Result**: All 11 documentation files present

#### Test 5.2: Check Documentation Content
```bash
# Check quick start
head -30 QUICK_START.md

# Check command reference
head -50 COMMAND_REFERENCE.md

# Check workflow guide
head -50 COMPLETE_WORKFLOW.md
```

**Expected Result**: All documentation is complete and readable

---

### Phase 6: Performance Measurements ✓

#### Test 6.1: Measure Build Time
```bash
# Clean build
rm -rf build/

# Time the build
time dart bin/flutterjs.dart build web

# Expected: < 100ms total
```

**Expected Result**: Build completes in ~60-100ms

#### Test 6.2: Measure Bundle Size
```bash
# Check total bundle size
du -sh build/flutterjs/dist/

# Check individual files
ls -lh build/flutterjs/dist/*.js

# Expected:
# - Total: ~306KB
# - main.js: ~23KB
# - app.js: ~9KB
```

**Expected Result**: Sizes match expected values

#### Test 6.3: Count Exported Symbols
```bash
# Count dart:core exports
cat packages/flutterjs_dart/exports.json | grep -o '\".*\"' | wc -l

# Count all package exports
find packages -name "exports.json" -exec cat {} \; | grep -o '\".*\"' | wc -l

# Expected:
# - dart:core: ~151 symbols
# - Total: ~1,202 symbols
```

**Expected Result**: Symbol counts match expected values

---

### Phase 7: Test Kernel Compilation Infrastructure ✓

#### Test 7.1: Test Kernel Compiler
```bash
# Run kernel test
dart tools/test_kernel_compilation.dart

# Check output
# Expected:
# - Compilation successful
# - .dill file created
# - Magic number verified (0x90ABCDEF)
# - Size: ~8MB
```

**Expected Result**: Kernel compilation works, .dill file valid

#### Test 7.2: Extract Runtime (Reference)
```bash
# Run extraction tool
dart tools/extract_runtime.dart

# Check generated files
ls -lh packages/flutterjs_dart/dist/runtime_*.js

# Expected:
# - runtime_extracted.js (~73KB minified)
# - runtime_full_reference.js (~73KB)
```

**Expected Result**: Runtime extraction completes, files generated

#### Test 7.3: Verify Kernel-to-IR Stub
```bash
# Check stub implementation
cat packages/flutterjs_core/lib/src/kernel/kernel_to_ir.dart | head -100

# Expected: Stub classes with TODO comments
```

**Expected Result**: Stub classes present, ready for kernel package

---

### Phase 8: Integration Tests ✓

#### Test 8.1: Full Workflow Test
```bash
cd examples/flutterjs_website

# Step 1: Get packages
dart ../../packages/pubjs/bin/pubjs.dart get

# Step 2: Build
dart ../../bin/flutterjs.dart build web

# Step 3: Verify output
ls -la build/flutterjs/dist/
ls -la build/flutterjs/node_modules/@flutterjs/

# Expected: All files present, build successful
```

**Expected Result**: Complete workflow succeeds

#### Test 8.2: Test Flag Combinations
```bash
# Test verbose
dart ../../packages/pubjs/bin/pubjs.dart get --verbose

# Test force rebuild
dart ../../packages/pubjs/bin/pubjs.dart get --force

# Test production flag (shows in output)
dart ../../packages/pubjs/bin/pubjs.dart get --production

# Test kernel flag (shows in output)
dart ../../packages/pubjs/bin/pubjs.dart get --use-kernel
```

**Expected Result**: All flags work, output shows correct mode

---

## Summary Report Template

After running all tests, provide this summary:

```
FlutterJS Test Results
======================

Date: [DATE]
Platform: Windows 11
Dart SDK: [VERSION]

Phase 1: Package Structure ✅/❌
  - 22 packages present: ✅/❌
  - dart:core implementation: ✅/❌
  - Kernel infrastructure: ✅/❌

Phase 2: Package Manager ✅/❌
  - GetCommand flags: ✅/❌
  - Package compilation: ✅/❌
  - node_modules structure: ✅/❌

Phase 3: Build System ✅/❌
  - Website build: ✅/❌
  - Generated files: ✅/❌
  - Import resolution: ✅/❌

Phase 4: Development Server ✅/❌
  - HTTP server: ✅/❌
  - Page loading: ✅/❌
  - JavaScript loading: ✅/❌

Phase 5: Documentation ✅/❌
  - All files present: ✅/❌
  - Content complete: ✅/❌

Phase 6: Performance ✅/❌
  - Build time: [TIME]ms (target: <100ms)
  - Bundle size: [SIZE]KB (target: ~306KB)
  - Symbol count: [COUNT] (target: 1,202)

Phase 7: Kernel Infrastructure ✅/❌
  - Kernel compilation: ✅/❌
  - Runtime extraction: ✅/❌
  - Stub implementation: ✅/❌

Phase 8: Integration ✅/❌
  - Full workflow: ✅/❌
  - Flag combinations: ✅/❌

Overall Status: ✅ PASS / ❌ FAIL

Issues Found:
[List any issues here]

Next Steps:
[Recommendations]
```

---

## Quick Test Commands

For rapid testing, run these commands:

```bash
# Navigate to project
cd C:\Jay\_Plugin\flutterjs

# Quick verification
echo "=== Package Count ==="
ls -d packages/flutterjs_*/ | wc -l

echo "=== Kernel Test ==="
dart tools/test_kernel_compilation.dart 2>&1 | grep -E "(✓|✗|PASS|FAIL)"

echo "=== Build Test ==="
cd examples/flutterjs_website
rm -rf build/
time dart ../../bin/flutterjs.dart build web 2>&1 | tail -20

echo "=== Bundle Size ==="
du -sh build/flutterjs/dist/

echo "=== Package Count in node_modules ==="
ls build/flutterjs/node_modules/@flutterjs/ | wc -l

echo "=== Server Test ==="
cd build/flutterjs/dist
python -m http.server 8000 &
sleep 2
curl -I http://localhost:8000/ 2>&1 | head -5
pkill -f "http.server 8000"

cd ../../../..
echo "=== All Tests Complete ==="
```

---

## Expected Final State

After all tests pass:

```
✅ 22 packages compiled
✅ 1,202 symbols exported
✅ 13MB node_modules (development)
✅ ~306KB bundle size
✅ ~60ms build time
✅ All imports resolving
✅ Server running successfully
✅ Kernel infrastructure ready
✅ All documentation complete
```

## Troubleshooting

If any test fails:

1. **Build fails**: Run `dart pub get` in the project root
2. **Server fails**: Check if port 8000 is already in use
3. **Import errors**: Verify node_modules structure
4. **Kernel test fails**: Check Dart SDK version (need 3.10+)
5. **Permission errors**: Run terminal as administrator

---

**Status**: All systems operational and ready for testing! ✅
