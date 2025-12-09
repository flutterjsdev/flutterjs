# FlutterJS Analyzer for VS Code

A custom VS Code extension that analyzes `.fjs` (FlutterJS) files and detects errors in Dart-to-JavaScript transpiled code.

## Features

✅ **Smart Error Detection:**
- Detects unconverted Dart syntax (`final`, `late`, `required`)
- Validates transpiled imports (`@flutterjs/*` vs raw `package:` imports)
- Warns about unknown methods and misplaced type arguments
- Ignores valid JavaScript patterns (like `var`, `const`, etc.)

✅ **Real-time Analysis** - Issues appear instantly in the Problems panel

✅ **Syntax Highlighting** - Proper `.fjs` file recognition and coloring

✅ **Zero Build Time** - Runs directly as JavaScript (no TypeScript compilation)

## Installation & Setup

### Prerequisites

- **Node.js 14+** ([Download](https://nodejs.org/))
- **VS Code 1.75+** ([Download](https://code.visualstudio.com/))
- **Git** (optional, for cloning)

### Quick Start

#### 1. Clone or Download

```bash
git clone <your-repo-url>
cd flutterjs-vscode-extension
```

Or download as ZIP and extract.

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Run in Development

Press **F5** in VS Code (from the extension folder) to open Extension Development Host.

#### 4. Test It

1. Create a test file: `test.fjs`
2. Add test code:

```javascript
// test.fjs

// ✅ Valid - JavaScript syntax
var x = 5;
const y = 10;

// ❌ ERROR - Dart syntax not converted
final z = 20;

// ⚠️ WARNING - Unconverted import
import 'package:flutter/material.dart';

// ✅ Valid - transpiled imports
import { CounterModel } from '@flutterjs/models';

// ✅ Valid - generic methods
const result = context.watch<CounterModel>();
```

3. Open **Problems** panel: `Ctrl+Shift+M`
4. You should see errors and warnings!

## File Structure

```
flutterjs-vscode-extension/
├── .vscode/
│   └── launch.json              # Debug configuration
├── src/
│   ├── extension.js             # Main entry point
│   └── analyzer.js              # Custom analyzer logic
├── syntaxes/
│   └── fjs.tmLanguage.json      # Syntax highlighting
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies & config
├── language-configuration.json  # Bracket & comment rules
└── README.md                    # This file
```

## Customization

### Add Custom Methods

Edit `src/analyzer.js` and add your methods to the `dartMethods` array:

```javascript
this.dartMethods = [
  'increment', 'fetchQuote', 'reset',
  // 👇 Add your custom Dart methods here
  'myCustomMethod', 'anotherOne',
];
```

### Add Custom Rules

Edit the `checkInvalidSyntax()` method in `src/analyzer.js`:

```javascript
const dartOnlyPatterns = [
  { pattern: /\bfinal\s+\w+\s*=/g, message: 'Dart syntax not converted' },
  // 👇 Add your custom patterns here
  { pattern: /\byour_pattern\s+/g, message: 'Your custom error' },
];
```

### Change Error Severity

In `src/analyzer.js`, change `severity`:

```javascript
severity: 'error'   // Shows red squiggles
severity: 'warning' // Shows yellow squiggles
```

## Build & Package

### Package as VSIX (for sharing)

```bash
npm install -g vsce
vsce package
```

This creates `flutterjs-analyzer-1.0.0.vsix`

### Install Locally

1. Open VS Code
2. Press `Ctrl+Shift+P` → Type "Extensions: Install from VSIX"
3. Select the `.vsix` file
4. The extension is installed! 🎉

### Publish to VS Code Marketplace (Optional)

```bash
vsce publish
```

⚠️ **Requires:**
- Personal access token from [dev.azure.com](https://dev.azure.com)
- Publisher account registered on [marketplace.visualstudio.com](https://marketplace.visualstudio.com)

[Read the full guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

## Troubleshooting

### ❌ "CMake does not support automatic debugging"

**Fix:** Make sure `.vscode/launch.json` exists with:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"]
    }
  ]
}
```

### ❌ Extension not activating?

**Fix:** 
- Ensure you have a `.fjs` file open
- The extension only activates on `.fjs` files
- Reload window: `Ctrl+Shift+P` → "Developer: Reload Window"

### ❌ "Cannot find module 'vscode'"

**Fix:**
```bash
npm install
```

### ❌ Problems panel shows no errors

**Checklist:**
1. File extension is `.fjs` (not `.js`)
2. File contains test code with actual errors
3. Check Debug Console: View → Debug Console (in original VS Code window)
4. Reload window: `Ctrl+Shift+P` → "Developer: Reload Window"

## Development

### Debug the Extension

1. Press **F5** to start debugging
2. Set breakpoints in `src/extension.js` or `src/analyzer.js`
3. Open a `.fjs` file to trigger analysis
4. Use the Debug Console (View → Debug Console) to see logs

### View Logs

Add `console.log()` to your code:

```javascript
console.log('🐛 Debugging:', myVariable);
```

Output appears in the **Debug Console** (original VS Code window).

### Reload After Changes

After editing JavaScript files:
- `Ctrl+Shift+P` → "Developer: Reload Window" (in Extension Host window)
- Changes take effect instantly!

## Share Your Extension

### Option 1: GitHub

```bash
git init
git add .
git commit -m "Initial FlutterJS extension"
git push -u origin main
```

### Option 2: Package & Share VSIX

```bash
vsce package
# Share the .vsix file with your team
```

### Option 3: Publish to Marketplace

```bash
vsce publish
# Everyone can install via VS Code marketplace
```

## Configuration

Users can configure the extension in VS Code Settings (`Ctrl+Shift+P` → "Preferences: Open Settings JSON"):

```json
{
  "flutterjs.enableDiagnostics": true,
  "flutterjs.validateImports": true,
  "flutterjs.warnUnusedVariables": false
}
```

## What the Analyzer Checks

### ✅ Allows (No Errors)
- ✓ `var x = 5;` - Valid JavaScript
- ✓ `const x = 10;` - Valid JavaScript
- ✓ `context.watch<CounterModel>()` - Generic methods
- ✓ `import { x } from '@flutterjs/models'` - Transpiled imports
- ✓ `.map()`, `.filter()`, etc. - JS built-in methods

### ❌ Errors (True Problems)
- ✗ `final x = 10;` - Dart syntax, should be converted
- ✗ `late x;` - Dart syntax, should be converted
- ✗ `required param` - Dart syntax, should be converted

### ⚠️ Warnings (Helpful Hints)
- ⚠️ `import 'package:flutter'` - Should use `@flutterjs/*` instead
- ⚠️ `unknownMethod()` - Might be a typo
- ⚠️ Type arguments in unexpected places

## License

MIT - Feel free to use and modify!

## Contributing

Found a bug? Have a feature request? 

1. Open an issue on GitHub
2. Submit a pull request with improvements
3. Share feedback via issues

## Support

Need help?
- Check the **Troubleshooting** section above
- Review `src/analyzer.js` comments
- Check VS Code Extension API docs: [code.visualstudio.com/api](https://code.visualstudio.com/api)

---

**Happy coding! 🚀**
