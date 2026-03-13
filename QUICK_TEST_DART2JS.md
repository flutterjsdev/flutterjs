# Quick Test - dart2js Integration (5 Minutes)

**For rapid validation on Claude desktop app**

---

## 🚀 Quick Commands (Copy & Paste)

```bash
# 1. Navigate to test project
cd C:\Jay\_Plugin\flutterjs\examples\flutterjs_website

# 2. Clean build (optional but recommended)
rm -rf build/flutterjs/node_modules build/flutterjs/dist

# 3. Install packages with dart2js
dart ../../packages/pubjs/bin/pubjs.dart get

# 4. Build application
dart ../../bin/flutterjs.dart build --mode dev

# 5. Check success
ls build/flutterjs/node_modules/async/async.js
grep '"async":' build/flutterjs/dist/index.html

# 6. Serve and test
cd build/flutterjs/dist
python -m http.server 8000
# Open browser: http://localhost:8000
```

---

## ✅ Success Indicators

After running the commands above, check:

### 1. Packages Compiled
```bash
ls build/flutterjs/node_modules/async/
```
**Should see:** `async.js`, `async.js.deps`, `exports.json`, `package.json`

### 2. Import Map Updated
```bash
grep '"async":' build/flutterjs/dist/index.html
```
**Should see:** `"async": "/node_modules/async/async.js"`

### 3. Website Loads
Open `http://localhost:8000` in browser
**Should see:** Website loads without console errors

---

## ❌ Failure Indicators

### Build Failed
```bash
# Check error output
dart ../../packages/pubjs/bin/pubjs.dart get 2>&1 | grep -i error
```

### No dart2js Packages
```bash
# Should show files, not empty
ls build/flutterjs/node_modules/async/
```

### Wrong Import Map
```bash
# Should show /node_modules/async/async.js, NOT @flutterjs/dart
grep '"async":' build/flutterjs/dist/index.html
```

### Browser Errors
Open DevTools Console (F12)
**Should NOT see:** "Failed to resolve module", "404 Not Found"

---

## 📊 Expected Results

```
✅ flutterjs get: 15-20 packages compiled (60-120s)
✅ flutterjs build: Build complete (2-3s)
✅ Import map: Contains dart2js packages
✅ Browser: Loads without errors
```

---

## 🐛 Quick Debug

### If get fails:
```bash
dart --version  # Check Dart installed
dart pub get    # Try standard pub get
```

### If build fails:
```bash
dart ../../bin/flutterjs.dart clean
dart ../../bin/flutterjs.dart build --mode dev --verbose
```

### If imports wrong:
```bash
# Force HTML regeneration
rm build/flutterjs/dist/index.html
dart ../../bin/flutterjs.dart build --mode dev
```

### If browser errors:
```bash
# Check files exist
ls build/flutterjs/node_modules/async/async.js
ls build/flutterjs/dist/index.html

# Check serving from correct directory
pwd  # Should be in build/flutterjs/dist
```

---

## 📝 One-Line Report

After testing, provide this summary:

**Result:** [PASS/FAIL]
**Issues:** [None / List issues]
**Packages compiled:** [Number]
**Browser loads:** [Yes/No]

---

## 📚 Full Testing

For comprehensive testing, see: `TESTING_INSTRUCTIONS_DART2JS.md`

---

**This quick test validates the core dart2js integration in 5 minutes.**
