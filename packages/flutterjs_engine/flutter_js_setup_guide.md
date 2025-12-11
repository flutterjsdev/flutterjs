# Setting Up flutter_js Global Command

## Option 1: Link Your Local Development Version (Recommended for Development)

This makes `flutter_js` available globally while you're developing it.

### Step 1: Navigate to your CLI package root
```bash
cd C:/Jay/_Plugin/flutterjs  # Your framework root
```

### Step 2: Link it globally
```bash
npm link
```

This creates a symlink in your global node_modules, so `flutter_js` command points to your local code.

### Step 3: Verify it works
```bash
flutter_js --version
```

Should output: `flutter_js v1.0.0` (or whatever version you have)

### Step 4: Create a test project
```bash
# Navigate anywhere
cd D:/projects

# Create a new project
flutter_js init my-app

# Go into project
cd my-app

# Run it
flutter_js run
```

---

## Option 2: Publish to NPM (For Distribution)

If you want other developers to use your tool:

### Step 1: Setup your package.json
Make sure your main `package.json` has:

```json
{
  "name": "flutter-js",
  "version": "1.0.0",
  "description": "Flutter to JavaScript compiler",
  "bin": {
    "flutter_js": "./bin/index.js"
  },
  "main": "index.js",
  "engines": {
    "node": ">=14.0.0"
  }
}
```

### Step 2: Publish to NPM
```bash
npm publish
```

Users can then install it:
```bash
npm install -g flutter-js
flutter_js init my-app
```

---

## Your Project Structure Should Look Like This

```
flutterjs/
├── bin/
│   ├── index.js              # CLI entry point (the one with #!/usr/bin/env node)
│   └── commands/
│       ├── init.js
│       ├── run.js            # NEW: The run command
│       ├── dev.js
│       ├── build.js
│       └── preview.js
├── src/
│   ├── utils/
│   │   ├── config.js
│   │   └── fjs.js
│   └── ... other files
├── templates/
│   ├── src/
│   ├── assets/
│   └── .vscode/
├── package.json              # Main package.json with "bin" field
└── README.md
```

---

## Key: The `bin` field in package.json

This tells Node where your CLI entry point is:

```json
{
  "bin": {
    "flutter_js": "./bin/index.js"
  }
}
```

The first line of `bin/index.js` must be:
```javascript
#!/usr/bin/env node
```

---

## Testing After Setup

### Test 1: Check if command exists
```bash
which flutter_js
# Should output the path to your CLI
```

### Test 2: Run help
```bash
flutter_js --help
```

### Test 3: Create a project
```bash
cd /tmp/test
flutter_js init test-app
cd test-app
flutter_js run
```

---

## Troubleshooting

### "flutter_js command not found"

**Solution 1:** Unlink and re-link
```bash
cd C:/Jay/_Plugin/flutterjs
npm unlink -g flutter-js
npm link
```

**Solution 2:** Check if npm bin directory is in PATH
```bash
# On Windows
echo %PATH%

# On Mac/Linux
echo $PATH
```

Should contain your npm global directory. If not, add it to your PATH.

**Solution 3:** Use full path temporarily
```bash
node C:/Jay/_Plugin/flutterjs/bin/index.js run
```

### Permissions error on Mac/Linux

```bash
chmod +x ./bin/index.js
npm link
```

---

## Development Workflow

While developing, use `npm link`:

```bash
# In your framework directory
cd C:/Jay/_Plugin/flutterjs
npm link

# Now anywhere you can use flutter_js
cd ~/projects/my-flutter-app
flutter_js run

# When you make changes to your CLI code,
# they're reflected immediately (no reinstall needed)
```

---

## In Your Dart Transpiler

Once `flutter_js` is available globally, you can call it from your Dart code:

```dart
// In your Dart transpiler
void main() {
  // After Dart transpilation to .fjs is complete:
  
  // Call the JavaScript runner
  final result = Process.runSync('flutter_js', ['run', '--port', '3000']);
  print(result.stdout);
}
```

Or in JavaScript:

```javascript
const { exec } = require('child_process');

// After Dart transpilation
exec('flutter_js run --port 3000', (error, stdout, stderr) => {
  if (error) console.error(error);
  console.log(stdout);
});
```