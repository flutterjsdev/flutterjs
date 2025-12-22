# FlutterJS Complete Learning Document

**Master Guide: From Zero to Expert**

---

## Table of Contents

1. [Section 1: JavaScript Fundamentals](#section-1-javascript-fundamentals)
2. [Section 2: Node.js & npm Ecosystem](#section-2-nodejs--npm-ecosystem)
3. [Section 3: Bundling & esbuild](#section-3-bundling--esbuild)
4. [Section 4: Creating Executables](#section-4-creating-executables)
5. [Section 5: External Packages & Dependencies](#section-5-external-packages--dependencies)
6. [Section 6: FlutterJS Architecture](#section-6-flutterjs-architecture)
7. [Section 7: Building Your Framework](#section-7-building-your-framework)
8. [Section 8: Complete Working Examples](#section-8-complete-working-examples)

---

# SECTION 1: JavaScript Fundamentals

## 1.1 What is JavaScript?

JavaScript is a **programming language** that needs a **runtime** to execute.

### Runtime Types

**Browser Runtime** (for web):
```javascript
// In browser (Chrome, Firefox, Safari)
document.getElementById('app').innerHTML = 'Hello';
alert('Popup message');
```

**Node.js Runtime** (for computers):
```javascript
// On computer (Windows, Mac, Linux)
const fs = require('fs');
const data = fs.readFileSync('file.txt');
console.log(data);
```

### Key Insight
```
JavaScript Code (text file)
        ↓
Runtime Interpreter (browser OR Node.js)
        ↓
Computer (OS) executes it
```

---

## 1.2 JavaScript in Files

### File Structure

```javascript
// index.js
export function add(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}
```

### Importing

**Using it in another file:**
```javascript
// app.js
import { add, multiply } from './index.js';

console.log(add(2, 3));        // 5
console.log(multiply(2, 3));   // 6
```

### Module Systems

**CommonJS (older):**
```javascript
// Export
module.exports = { add, multiply };

// Import
const { add, multiply } = require('./index.js');
```

**ES Modules (modern, recommended):**
```javascript
// Export
export { add, multiply };

// Import
import { add, multiply } from './index.js';
```

**For FlutterJS, use ES Modules** ✓

---

## 1.3 Classes (Important for Flutter)

Classes are **blueprints** for objects:

```javascript
// Define a class
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    console.log(`${this.name} makes a sound`);
  }
}

// Create an object (instance)
const dog = new Animal('Dog');
dog.speak();  // "Dog makes a sound"
```

### Inheritance (Extending)

```javascript
// Parent class
class Animal {
  constructor(name) {
    this.name = name;
  }
}

// Child class extends parent
class Dog extends Animal {
  constructor(name, breed) {
    super(name);  // Call parent constructor
    this.breed = breed;
  }

  bark() {
    console.log(`${this.name} barks!`);
  }
}

const myDog = new Dog('Rex', 'Labrador');
myDog.bark();  // "Rex barks!"
```

**This is exactly what Flutter widgets do:**
```javascript
// Flutter approach
class MyWidget extends StatelessWidget {
  build(context) {
    // Return widget tree
  }
}
```

---

## 1.4 Arrow Functions

Modern shorthand for functions:

```javascript
// Regular function
function add(a, b) {
  return a + b;
}

// Arrow function (same thing)
const add = (a, b) => {
  return a + b;
};

// Short form (implicit return)
const add = (a, b) => a + b;

// Usage
console.log(add(2, 3));  // 5
```

**Why arrow functions?**
- Cleaner syntax
- Shorter code
- Easier to read

---

## 1.5 async/await (For Async Operations)

When you need to wait for something (reading files, network):

```javascript
// Without async/await
function readFile() {
  return new Promise((resolve, reject) => {
    fs.readFile('data.txt', 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

readFile().then(data => console.log(data));

// With async/await (cleaner)
async function readFile() {
  const data = await fs.promises.readFile('data.txt', 'utf8');
  console.log(data);
  return data;
}

readFile();
```

**Key points:**
- `async` function returns a Promise
- `await` pauses until Promise completes
- Makes async code look like sync code

---

# SECTION 2: Node.js & npm Ecosystem

## 2.1 What is Node.js?

Node.js is a **JavaScript runtime for computers**.

### Install Node.js

1. Go to https://nodejs.org
2. Download **LTS** version
3. Install it
4. Verify installation:

```bash
node --version
# v18.17.0

npm --version
# 9.6.7
```

---

## 2.2 Running JavaScript with Node.js

### Create a File

**hello.js:**
```javascript
console.log('Hello from Node.js!');

// Read file
const fs = require('fs');
const content = fs.readFileSync('data.txt', 'utf8');
console.log(content);

// Make HTTP request
const http = require('http');
// ... more code
```

### Run It

```bash
node hello.js
# Output: Hello from Node.js!
```

---

## 2.3 npm - Package Manager

npm is a **tool for managing JavaScript packages**.

### What is a Package?

A package is **reusable JavaScript code**:

```
lodash package:
├── package.json
├── index.js
└── (many other files)
```

### Installing a Package

```bash
# Install lodash
npm install lodash

# Creates:
node_modules/
└── lodash/
    ├── package.json
    ├── index.js
    └── (many files)
```

### Using the Package

```javascript
// After npm install
import lodash from 'lodash';

const numbers = [3, 1, 4, 1, 5, 9];
const unique = lodash.uniq(numbers);
console.log(unique);  // [3, 1, 4, 5, 9]
```

---

## 2.4 package.json - Your Project Manifest

This file describes your project:

```json
{
  "name": "my-flutterjs-app",
  "version": "1.0.0",
  "description": "My awesome Flutter app",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "esbuild src/index.js --bundle --outfile=dist/index.js",
    "start": "node dist/index.js",
    "dev": "node --watch src/index.js"
  },
  "dependencies": {
    "lodash": "^4.17.21",
    "axios": "^1.4.0"
  },
  "devDependencies": {
    "esbuild": "^0.17.0",
    "pkg": "^5.8.0"
  },
  "author": "Your Name",
  "license": "MIT"
}
```

### Understanding Each Section

```json
{
  "name": "my-tool",
  // ↑ Package name (must be unique on npm)

  "version": "1.0.0",
  // ↑ Version format: MAJOR.MINOR.PATCH
  // Increment when: MAJOR (breaking), MINOR (feature), PATCH (bug)

  "main": "dist/index.js",
  // ↑ Entry point (main file)

  "type": "module",
  // ↑ Use ES Modules (import/export syntax)

  "scripts": {
    "build": "npm run build:js && npm run build:exe",
    "build:js": "esbuild src/index.js --bundle --outfile=dist/index.js",
    "build:exe": "pkg dist/index.js --output dist/app.exe"
    // ↑ Run these with: npm run build, npm run build:js, etc.
  },

  "dependencies": {
    "lodash": "^4.17.21"
    // ↑ Needed to RUN the app
  },

  "devDependencies": {
    "esbuild": "^0.17.0"
    // ↑ Needed to BUILD the app (not needed after build)
  }
}
```

---

## 2.5 npm Scripts

These are commands you define:

```json
{
  "scripts": {
    "build": "esbuild src/index.js --bundle --outfile=dist/index.js",
    "dev": "node src/index.js",
    "test": "node test.js"
  }
}
```

### Running Scripts

```bash
npm run build     # Runs: esbuild src/index.js ...
npm run dev       # Runs: node src/index.js
npm run test      # Runs: node test.js

npm start         # Special: runs "start" script
npm test          # Special: runs "test" script
```

---

## 2.6 node_modules Folder

When you run `npm install`:

```
node_modules/
├── lodash/
│   ├── package.json
│   ├── index.js
│   └── (1000+ files)
├── axios/
│   ├── package.json
│   └── (500+ files)
└── (hundreds more packages)
```

### Key Points

- **Large size** (often 500MB+)
- **Auto-generated** (from package.json)
- **Don't commit to git** (add to .gitignore)
- **Can be regenerated** with `npm install`

### Create .gitignore

```
node_modules/          ← Don't upload
dist/                  ← Can be rebuilt
*.log
.env
```

---

## 2.7 package-lock.json

Automatically created by npm:

```json
{
  "name": "my-app",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "my-app",
      "version": "1.0.0",
      "dependencies": {
        "lodash": "^4.17.21"
      }
    },
    "node_modules/lodash": {
      "version": "4.17.21",
      "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
      "integrity": "sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZq8y4nbaTKTA2dkBvstVh8019M2kYLSP9Jrq5+kciBQ=="
    }
  }
}
```

**What it does:**
- Records exact versions installed
- Ensures same versions on all computers
- **Should be committed to git** ✓

---

# SECTION 3: Bundling & esbuild

## 3.1 What is Bundling?

**Problem:**
```
Your code:
src/
├── index.js       (imports utils)
├── utils.js       (imports parser)
├── parser.js      (imports formatter)
└── formatter.js

User must download all 4 files
```

**Solution - Bundling:**
```
dist/
└── index.js       (contains everything combined)

User downloads 1 file
```

---

## 3.2 How Bundling Works

### Step 1: Start with Entry Point
```javascript
// src/index.js
import { parseCode } from './parser.js';
import { format } from './formatter.js';

export function analyze(code) {
  const parsed = parseCode(code);
  return format(parsed);
}
```

### Step 2: Follow Imports
```
index.js imports parser.js and formatter.js
├── Read parser.js
│   ├── It imports formatter.js
│   └── Read formatter.js
└── Collect all code
```

### Step 3: Combine Everything
```javascript
// dist/index.js (bundled)
// (all code combined here)
function parseCode(code) { /* ... */ }
function format(parsed) { /* ... */ }
function analyze(code) { /* ... */ }

export { analyze };
```

---

## 3.3 esbuild - Bundling Tool

esbuild is a **fast JavaScript bundler**.

### Install esbuild

```bash
npm install --save-dev esbuild
```

### Basic Usage

**build.js:**
```javascript
import esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['src/index.js'],      // Start here
  bundle: true,                       // Bundle everything
  outfile: 'dist/index.js',          // Output here
  minify: true,                       // Remove whitespace
  sourcemap: true                     // Add .map file
});
```

**Run it:**
```bash
node build.js
```

**Result:**
```
dist/
├── index.js          (50KB - minified)
└── index.js.map      (debugging info)
```

---

## 3.4 esbuild Options Explained

### Essential Options

```javascript
esbuild.build({
  // INPUTS
  entryPoints: ['src/index.js', 'src/cli.js'],
  // ↑ Can have multiple entry points

  // BUNDLING
  bundle: true,
  // ↑ Combine all imports
  // false = don't combine

  // OUTPUTS
  outfile: 'dist/index.js',
  // ↑ Single output file
  // Use 'outdir' for multiple files

  minify: true,
  // ↑ Remove spaces/newlines
  // Makes file smaller (50KB → 15KB)
  // Original readable (dev): minify: false
  // Production: minify: true

  sourcemap: true,
  // ↑ Create .map file for debugging
  // When error occurs, shows original source location

  // PLATFORM & TARGET
  platform: 'node',
  // ↑ 'node' = for Node.js (CLI tools, servers)
  // 'browser' = for web browsers

  target: ['node14'],
  // ↑ Works on Node.js 14+
  // node16, node18, node20 available

  format: 'esm',
  // ↑ 'esm' = ES Modules (import/export)
  // 'cjs' = CommonJS (require/module.exports)
  // 'iife' = for browsers

  // ADVANCED
  external: ['fs', 'path', 'lodash'],
  // ↑ DON'T bundle these (more on this below)

  define: {
    'process.env.NODE_ENV': '"production"'
  },
  // ↑ Replace variables in code
})
```

---

## 3.5 Development vs Production

### Development Build

```javascript
// build.js - dev
esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/index.js',
  minify: false,           // Readable code
  sourcemap: true,         // Debugging
  platform: 'node',
  target: ['node14']
})
.then(() => console.log('Dev build complete'))
.catch(err => console.error(err));
```

**Benefits:**
- Code is readable
- Debugging info (.map file)
- Easier to find errors

**Run:**
```bash
node build.js
```

### Production Build

```javascript
// build.js - production
esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/index.js',
  minify: true,            // Smaller file
  sourcemap: false,        // No debug info
  platform: 'node',
  target: ['node14']
})
.then(() => console.log('Production build complete'))
.catch(err => console.error(err));
```

**Benefits:**
- Smaller file size
- Faster to download
- No source info exposed

### Both Builds

```javascript
// build.js - both
import esbuild from 'esbuild';

const config = {
  entryPoints: ['src/index.js'],
  bundle: true,
  platform: 'node',
  target: ['node14']
};

// Dev build
esbuild.build({
  ...config,
  outfile: 'dist/index.dev.js',
  minify: false,
  sourcemap: true
});

// Production build
esbuild.build({
  ...config,
  outfile: 'dist/index.prod.js',
  minify: true,
  sourcemap: false
});
```

---

## 3.6 Minification Explained

### Before Minification

```javascript
// Original (readable)
export function analyzeCode(code) {
  const lines = code.split('\n');
  const count = lines.length;
  
  return {
    success: true,
    lineCount: count
  };
}

// Size: 156 bytes
```

### After Minification

```javascript
export function analyzeCode(e){const n=e.split("\n");return{success:!0,lineCount:n.length}}
// Size: 89 bytes (57% smaller!)
```

### Why Minify?

- **Smaller file** (important for distribution)
- **Harder to read** (minor security benefit)
- **Same functionality** (code works the same)

---

# SECTION 4: Creating Executables

## 4.1 What is an Executable?

An executable is a **single file** that runs on a computer:

```
myapp.exe (Windows)
myapp (Mac/Linux)
```

### Inside an Executable

```
myapp.exe (50MB file)
├── Your JavaScript code (bundled)
├── Node.js runtime (v18.0.0)
└── All dependencies
```

**Key point:** The user doesn't need to install Node.js!

---

## 4.2 Understanding analyzer.js and analyzer.js.map

After bundling with esbuild, you get TWO files:

```
dist/
├── analyzer.js        (50KB - bundled JavaScript)
└── analyzer.js.map    (80KB - source mapping for debugging)
```

### What is analyzer.js?

**analyzer.js is still JavaScript**, not compiled binary:

```javascript
// analyzer.js (minified but still JavaScript)
var r=Object.defineProperty;var o=Object.getOwnPropertyDescriptor;
var s=Object.getOwnPropertyNames;var i=Object.prototype.hasOwnProperty;
// ... (hundreds of lines of minified code)
```

**Can you read it?** Technically yes, but it's minified (unreadable)

**Does it need Node.js?** YES ✓

---

### What is analyzer.js.map?

**Source map file** for debugging:

```json
{
  "version": 3,
  "sources": ["../src/analyzer.js", "../src/utils.js"],
  "mappings": "AAAA,SAAS,QAAQ,CAAC,IAAI...",
  "names": ["analyzeCode", "code", "result"]
}
```

**Purpose:**
- When error occurs, shows original source (src/analyzer.js)
- Not in original (minified) code
- Only for development
- Optional for production

**Do users need it?** No, but keep it for debugging

---

### Using analyzer.js WITHOUT pkg (.exe)

#### Method 1: Run with Node.js

```bash
# User must have Node.js installed
node dist/analyzer.js myfile.js
```

**Requirements:**
- ✓ Node.js installed
- ✓ analyzer.js file present
- ✓ analyzer.js.map (optional, for debugging)

#### Method 2: Import in JavaScript

```javascript
// app.js
import { analyzeCode } from './dist/analyzer.js';

const result = analyzeCode('const x = 1;');
console.log(result);
```

**Run:**
```bash
node app.js
```

#### Method 3: Use from Dart/Flutter

```dart
// Dart code
import 'dart:io';

var result = await Process.run('node', [
  'dist/analyzer.js',
  'myfile.js'
]);

print(result.stdout);
```

**Requirements:**
- ✓ Node.js installed
- ✓ analyzer.js file present

---

### Can You Use analyzer.js WITHOUT Node.js?

**Short answer: NO** ✗

analyzer.js is pure JavaScript that needs a runtime:

```
analyzer.js (JavaScript code)
    ↓
Needs Runtime
    ├─ Node.js (on computer)
    └─ Browser (in web page)
```

**If user doesn't have Node.js:**
```bash
node dist/analyzer.js myfile.js
# ✗ ERROR: 'node' is not recognized command
```

**Solution: Create .exe** (see next section)

---

## 4.3 Creating .exe with pkg

`pkg` is a tool that creates executables from Node.js code.

### Install pkg

```bash
npm install --save-dev pkg
```

### Create .exe (From analyzer.js)

**Step 1: You have from esbuild**
```bash
npm run build
# Creates: dist/analyzer.js + dist/analyzer.js.map
```

**Step 2: Create .exe from analyzer.js**
```bash
pkg dist/analyzer.js --output analyzer.exe --targets win
```

**Result:**
```
dist/
├── analyzer.js           (50KB - bundled code)
├── analyzer.js.map       (80KB - debugging info)
└── analyzer.exe          (50MB - standalone executable)
```

---

### What pkg Does

pkg takes your analyzer.js and:

1. Reads the JavaScript code
2. Bundles Node.js runtime inside
3. Creates single .exe file
4. .exe contains everything:
   - Your code (minified)
   - Node.js v18 interpreter
   - All dependencies

**Result:**
```
analyzer.exe (50MB)
├── analyzer.js code (inside, bundled)
├── Node.js runtime (inside, bundled)
└── Dependencies (inside, bundled)
```

---

### Using analyzer.exe WITHOUT pkg (.exe)

**Now user can run WITHOUT Node.js:**

```bash
# User just downloads analyzer.exe
# Works immediately!
analyzer.exe myfile.js

# From Dart:
Process.run('analyzer.exe', ['myfile.js'])
```

**Requirements:**
- ✗ NO Node.js needed
- ✓ analyzer.exe file only
- analyzer.js.map NOT needed

---

## 4.3 pkg Options

### Create Single .exe

```bash
pkg dist/index.js --output myapp.exe --targets win
# Creates: myapp.exe
```

### Create Multiple Formats

```bash
# Windows
pkg dist/index.js --output myapp.exe --targets win

# Mac
pkg dist/index.js --output myapp-mac --targets macos

# Linux
pkg dist/index.js --output myapp-linux --targets linux

# All at once
pkg dist/index.js --output myapp --targets win,macos,linux
```

### With Compression

```bash
pkg dist/index.js --output myapp.exe --targets win --compress=brotli
# Reduces size (slower startup)
```

---

## 4.4 Combining esbuild + pkg

### Complete Build Script

**build.js:**
```javascript
import esbuild from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';

async function buildAll() {
  try {
    console.log('Step 1: Building with esbuild...');
    
    // Build JavaScript
    await esbuild.build({
      entryPoints: ['src/cli.js'],
      bundle: true,
      outfile: 'dist/index.js',
      minify: true,
      platform: 'node',
      target: ['node14'],
      external: ['fs', 'path']
    });
    
    console.log('✓ Built dist/index.js\n');

    console.log('Step 2: Creating Windows .exe...');
    execSync('pkg dist/index.js --output dist/myapp.exe --targets win');
    console.log('✓ Created dist/myapp.exe\n');

    console.log('Step 3: Creating Mac binary...');
    execSync('pkg dist/index.js --output dist/myapp-mac --targets macos');
    console.log('✓ Created dist/myapp-mac\n');

    console.log('Step 4: Creating Linux binary...');
    execSync('pkg dist/index.js --output dist/myapp-linux --targets linux');
    console.log('✓ Created dist/myapp-linux\n');

    console.log('='.repeat(50));
    console.log('✓ BUILD COMPLETE');
    console.log('='.repeat(50));
    console.log('Files created:');
    console.log('  • dist/index.js (Node.js)');
    console.log('  • dist/myapp.exe (Windows)');
    console.log('  • dist/myapp-mac (macOS)');
    console.log('  • dist/myapp-linux (Linux)');

  } catch (error) {
    console.error('✗ Build failed:', error.message);
    process.exit(1);
  }
}

buildAll();
```

### package.json Scripts

```json
{
  "scripts": {
    "build:js": "esbuild src/cli.js --bundle --outfile=dist/index.js --minify --platform=node",
    "build:exe": "pkg dist/index.js --output dist/myapp.exe --targets win",
    "build:mac": "pkg dist/index.js --output dist/myapp-mac --targets macos",
    "build:all": "node build.js"
  }
}
```

### Run It

```bash
npm run build:all
```

---

## 4.5 .exe vs .js Distribution

### If You Give Users analyzer.js

```
User needs:
✓ Node.js installed
✓ JavaScript file (analyzer.js)

User runs:
node analyzer.js myfile.js
```

### If You Give Users analyzer.exe

```
User needs:
✓ .exe file only
✗ NO Node.js needed

User runs:
analyzer.exe myfile.js
```

### Recommendation

**For Flutter developers:** Give .exe
- Single file
- No setup needed
- Works immediately

**For JavaScript developers:** Give npm package
- Proper versioning
- Dependency management
- Easy updates

---

# SECTION 5: External Packages & Dependencies

## 5.1 What Are External Packages?

External packages are **third-party code** from npm:

```javascript
import lodash from 'lodash';           // External
import axios from 'axios';             // External
import fs from 'fs';                   // Built-in (Node.js)
import { myFunction } from './utils';  // Your code
```

---

## 5.2 Installing External Packages

### Search npmjs.com

Visit https://npmjs.com and search for packages:
- `lodash` (utilities)
- `axios` (HTTP requests)
- `chalk` (colored terminal output)
- `yargs` (command-line arguments)

### Install Package

```bash
npm install lodash
```

Creates:
```
node_modules/
└── lodash/
    ├── package.json
    ├── index.js
    └── ...
```

Updates `package.json`:
```json
{
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
```

---

## 5.3 Using External Packages

### Example: Using lodash

**src/index.js:**
```javascript
import lodash from 'lodash';

const numbers = [3, 1, 4, 1, 5, 9, 2, 6];

// Remove duplicates
const unique = lodash.uniq(numbers);
console.log(unique);  // [3, 1, 4, 5, 9, 2, 6]

// Flatten nested arrays
const flat = lodash.flatten([[1, 2], [3, 4]]);
console.log(flat);    // [1, 2, 3, 4]
```

**Run it:**
```bash
npm install lodash
node src/index.js
```

---

## 5.4 The CRITICAL Question: Bundle or External?

When building with esbuild, you must decide for each package:

### Option A: BUNDLE IT (Include in dist/index.js)

```javascript
// build.js
esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/index.js',
  external: ['fs', 'path']  // ← Only built-ins here
  // lodash gets bundled ✓
})
```

**Result:**
```
dist/index.js = 500KB
├── Your code
├── lodash code
└── All dependencies
```

**User experience:**
```bash
# User just downloads dist/index.js
# Works immediately!
node dist/index.js
```

**For .exe:**
```bash
pkg dist/index.js --output myapp.exe
# myapp.exe = 50MB (includes Node.js + all code)
# Works immediately!
```

---

### Option B: KEEP IT EXTERNAL (User Installs)

```javascript
// build.js
esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/index.js',
  external: ['fs', 'path', 'lodash']  // ← Add lodash here
  // lodash stays external ✗
})
```

**Result:**
```
dist/index.js = 100KB
├── Your code only
└── Imports lodash (expects user to have it)
```

**User experience:**
```bash
# User must install lodash
npm install lodash

# Then run
node dist/index.js
```

**For .exe:**
```bash
# User still needs to install lodash!
npm install lodash
myapp.exe
# This WON'T work - lodash not in .exe
```

---

## 5.5 Decision Tree: Bundle or External?

```
Question 1: Is this a built-in Node.js module?
├─ YES (fs, path, util, os, etc.)
│  └─ Keep external: external: ['fs', 'path', ...]
│
└─ NO (lodash, axios, chalk, etc.)
   └─ Question 2: Do you want .exe to work alone?
      ├─ YES
      │  └─ BUNDLE IT: Don't add to external
      │
      └─ NO (users will have Node.js)
         └─ KEEP EXTERNAL: Add to external
```

---

## 5.6 Bundling vs External - Real Examples

### Example 1: Creating .exe for Non-Developers

**Scenario:** Flutter users with NO Node.js

**Decision:** Bundle everything

```javascript
// build.js
esbuild.build({
  entryPoints: ['src/analyzer.js'],
  bundle: true,
  outfile: 'dist/analyzer.js',
  platform: 'node',
  external: ['fs', 'path', 'util']  // Only built-ins
  // Everything else bundled ✓
})
```

**Create .exe:**
```bash
pkg dist/analyzer.js --output analyzer.exe
```

**User gets:**
```bash
analyzer.exe myfile.js
# Works! No setup needed
```

---

### Example 2: npm Package for Developers

**Scenario:** JavaScript developers (already have Node.js)

**Decision:** Keep some external (let them choose versions)

```javascript
// build.js
esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/index.js',
  platform: 'node',
  external: ['fs', 'path', 'lodash', 'axios']  // Keep external
})
```

**package.json:**
```json
{
  "dependencies": {
    "lodash": "^4.17.21",
    "axios": "^1.4.0"
  }
}
```

**User gets:**
```bash
npm install @yourname/mypackage
# Downloads your code + has to install lodash, axios
```

---

## 5.7 Bundling 3rd Party Packages

### How to Bundle External Packages

**Step 1: Install it**
```bash
npm install lodash
```

**Step 2: Import and use it**
```javascript
// src/index.js
import { uniq } from 'lodash';

export function analyze(data) {
  return uniq(data);
}
```

**Step 3: Build WITHOUT putting it in external**
```javascript
// build.js
esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/index.js',
  external: ['fs', 'path']  // ← lodash NOT here
  // esbuild automatically bundles lodash ✓
})
```

**Step 4: Check result**
```bash
ls -la dist/index.js
# Should be large (50KB+ instead of 5KB)
```

**Step 5: lodash is now inside dist/index.js**
```bash
# User doesn't need to npm install lodash
node dist/index.js
# Works!
```

---

## 5.8 Common External Packages & Decision

| Package | Type | For .exe | For npm | Decision |
|---------|------|---------|--------|----------|
| `fs` | Built-in | external | external | Keep external |
| `path` | Built-in | external | external | Keep external |
| `lodash` | Utility | BUNDLE | external | Case by case |
| `axios` | HTTP | BUNDLE | external | Case by case |
| `chalk` | Color output | BUNDLE | BUNDLE | Always bundle |
| `yargs` | CLI args | BUNDLE | external | If CLI tool |

---

## 5.9 Handling Missing Dependencies

### Error: "Cannot find module 'lodash'"

**Cause:** You kept it external but user didn't install it

**Solution A: Bundle it**
```javascript
// Remove from external
external: ['fs', 'path']  // Remove lodash
```

**Solution B: Document it**
```bash
# Tell user to install
npm install lodash
```

---

## 5.10 Your Package Dependencies

For FlutterJS analyzer, typical setup:

```javascript
// build.js
esbuild.build({
  entryPoints: ['src/analyzer.js'],
  bundle: true,
  outfile: 'dist/analyzer.js',
  minify: true,
  platform: 'node',
  target: ['node14'],
  external: [
    'fs',     // Built-in
    'path',   // Built-in
    'util',   // Built-in
    'os'      // Built-in
    // Don't add other packages - bundle them
  ]
})
```

All other packages (even if you npm install them) should be bundled.

---

## 5.11 Building Multiple Packages from One Source

Your scenario: You have **multiple packages** (analyzer, converter, builder) that all need to be built.

### Project Structure

```
flutterjs-framework/
├── src/
│   ├── analyzer.js        ← Package 1
│   ├── converter.js       ← Package 2
│   ├── builder.js         ← Package 3
│   └── shared/
│       ├── utils.js       ← Used by all
│       └── parser.js      ← Used by all
├── dist/
│   ├── analyzer.js        ← Built
│   ├── analyzer.js.map
│   ├── analyzer.exe       ← Can create .exe
│   ├── converter.js       ← Built
│   ├── converter.js.map
│   ├── converter.exe      ← Can create .exe
│   ├── builder.js         ← Built
│   ├── builder.js.map
│   └── builder.exe        ← Can create .exe
├── build.js               ← Build script for all
└── package.json
```

---

### Building All Packages (build.js)

```javascript
import esbuild from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';

const packages = [
  {
    name: 'analyzer',
    entry: 'src/analyzer.js',
    description: 'Code analyzer'
  },
  {
    name: 'converter',
    entry: 'src/converter.js',
    description: 'VNode to DOM converter'
  },
  {
    name: 'builder',
    entry: 'src/builder.js',
    description: 'VNode tree builder'
  }
];

const buildConfig = {
  bundle: true,
  minify: true,
  sourcemap: true,
  platform: 'node',
  target: ['node14'],
  external: ['fs', 'path', 'util', 'os']
};

async function buildAll() {
  try {
    console.log('🚀 Building all packages\n');

    // Build each package with esbuild
    for (const pkg of packages) {
      console.log(`📦 Building ${pkg.name}...`);
      
      await esbuild.build({
        entryPoints: [pkg.entry],
        outfile: `dist/${pkg.name}.js`,
        ...buildConfig
      });
      
      console.log(`   ✓ ${pkg.name}.js (${getFileSize(`dist/${pkg.name}.js`)})`);
      console.log(`   ✓ ${pkg.name}.js.map\n`);
    }

    // Create .exe files for each package
    console.log('Creating executables...\n');
    
    for (const pkg of packages) {
      try {
        console.log(`📦 Creating ${pkg.name}.exe...`);
        execSync(
          `pkg dist/${pkg.name}.js --output dist/${pkg.name}.exe --targets win`,
          { stdio: 'inherit' }
        );
        console.log(`   ✓ ${pkg.name}.exe\n`);
      } catch (e) {
        console.warn(`   ⚠ Failed to create ${pkg.name}.exe\n`);
      }
    }

    // Summary
    console.log('='.repeat(60));
    console.log('✓ BUILD COMPLETE');
    console.log('='.repeat(60));
    
    for (const pkg of packages) {
      console.log(`\n📦 ${pkg.name}`);
      console.log(`   Description: ${pkg.description}`);
      console.log(`   • dist/${pkg.name}.js (Node.js)`);
      console.log(`   • dist/${pkg.name}.js.map (debugging)`);
      
      if (fs.existsSync(`dist/${pkg.name}.exe`)) {
        console.log(`   • dist/${pkg.name}.exe (Windows standalone)`);
      }
    }
    
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('✗ Build failed:', error.message);
    process.exit(1);
  }
}

function getFileSize(filePath) {
  const bytes = fs.statSync(filePath).size;
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildAll();
}
```

---

### Using the Built Packages

#### Option 1: Use as .js (Requires Node.js)

```bash
# Users with Node.js can use directly
node dist/analyzer.js myfile.js
node dist/converter.js input.vnode
node dist/builder.js myapp.js
```

#### Option 2: Use as .exe (No Node.js Needed)

```bash
# Users without Node.js can use .exe
analyzer.exe myfile.js
converter.exe input.vnode
builder.exe myapp.js
```

#### Option 3: From Dart/Flutter

```dart
// Use .exe files (no Node.js required)
var analyzeResult = await Process.run('analyzer.exe', ['file.js']);
var convertResult = await Process.run('converter.exe', ['input.vnode']);
var buildResult = await Process.run('builder.exe', ['app.js']);
```

---

## 5.12 When Building Package Needs Another Build File

Your scenario: `analyzer.js` depends on `converter.js` being built first.

### Example: Analyzer Imports Converter

**src/analyzer.js:**
```javascript
import { convertVNode } from './converter.js';  // Imports converter

export function analyzeCode(code) {
  // ... analyzer code
  const vnode = parseCode(code);
  const dom = convertVNode(vnode);  // Uses converter
  return { /* result */ };
}
```

### The Build Process

**Step 1: esbuild handles this automatically**

When you build analyzer.js:
```javascript
esbuild.build({
  entryPoints: ['src/analyzer.js'],
  bundle: true,  // ← This bundles converter.js inside!
  outfile: 'dist/analyzer.js'
})
```

**What happens:**
1. esbuild reads src/analyzer.js
2. Finds `import from './converter.js'`
3. Reads converter.js
4. Bundles both together
5. Creates dist/analyzer.js with BOTH

**Result:**
```
dist/analyzer.js
├── analyzer code
└── converter code (bundled inside)
```

**User doesn't need separate converter.js!** ✓

---

### Multiple Packages Sharing Code

**Scenario:** All packages use shared utils

**src/shared/utils.js:**
```javascript
export function parseCode(code) {
  // Common parsing logic
}

export function validateStructure(structure) {
  // Common validation
}
```

**src/analyzer.js:**
```javascript
import { parseCode, validateStructure } from './shared/utils.js';

export function analyzeCode(code) {
  const parsed = parseCode(code);
  validateStructure(parsed);
  return { /* result */ };
}
```

**src/converter.js:**
```javascript
import { parseCode } from './shared/utils.js';

export function convert(code) {
  const parsed = parseCode(code);
  return { /* converted */ };
}
```

### Building with Shared Code

```javascript
// build.js - builds all packages
const packages = ['analyzer', 'converter', 'builder'];

for (const name of packages) {
  await esbuild.build({
    entryPoints: [`src/${name}.js`],
    bundle: true,  // ← Bundles shared/utils.js for EACH package
    outfile: `dist/${name}.js`
  });
}
```

**Result:**
```
dist/analyzer.js
├── analyzer code
├── shared/utils.js code (bundled)
└── (50KB total)

dist/converter.js
├── converter code
├── shared/utils.js code (bundled)
└── (40KB total)

dist/builder.js
├── builder code
├── shared/utils.js code (bundled)
└── (45KB total)
```

**Important:** Shared code is duplicated in each package (50KB + 40KB + 45KB instead of 30KB if separate)

**This is OK because:**
- Each .exe works independently ✓
- Users get standalone executables ✓
- No external dependencies ✓
- Size is acceptable for distribution ✓

---

### Optimization: Shared Library

If code duplication is a problem, create separate library:

```
src/
├── shared-lib.js      ← Shared library (separate build)
├── analyzer.js        ← Uses shared-lib.js
├── converter.js       ← Uses shared-lib.js
└── builder.js         ← Uses shared-lib.js
```

**build.js:**
```javascript
// Build shared library
await esbuild.build({
  entryPoints: ['src/shared-lib.js'],
  bundle: true,
  outfile: 'dist/shared-lib.js'
});

// Build packages with shared-lib as external
const packages = ['analyzer', 'converter', 'builder'];

for (const name of packages) {
  await esbuild.build({
    entryPoints: [`src/${name}.js`],
    bundle: true,
    outfile: `dist/${name}.js`,
    external: ['fs', 'path', './shared-lib.js']
  });
}
```

**Result:**
```
dist/shared-lib.js     (30KB - shared code)
dist/analyzer.js       (25KB - uses shared-lib)
dist/converter.js      (20KB - uses shared-lib)
dist/builder.js        (22KB - uses shared-lib)
Total: 97KB instead of 135KB
```

**Trade-off:**
- Smaller files ✓
- But users need all 4 files to use any package ✗
- Better for npm packages, not for .exe

---

## 5.13 npm Packages That Depend on Build Files

Your scenario: Publishing to npm where some packages build from others.

### package.json Setup

```json
{
  "name": "@yourname/flutterjs-framework",
  "version": "1.0.0",
  "main": "dist/index.js",
  "exports": {
    ".": "./dist/index.js",
    "./analyzer": "./dist/analyzer.js",
    "./converter": "./dist/converter.js",
    "./builder": "./dist/builder.js"
  },
  "scripts": {
    "build": "node build.js",
    "build:exe": "npm run build && pkg dist/analyzer.exe dist/converter.exe dist/builder.exe",
    "prepublishOnly": "npm run build"
  },
  "files": [
    "dist/"
  ]
}
```

### How It Works

**When you publish:**
```bash
npm publish
```

**npm automatically:**
1. Runs `prepublishOnly` script
2. Builds all packages
3. Publishes only files in `files` array
4. Users get built .js files (not source .ts or src/)

**Users can:**
```bash
npm install @yourname/flutterjs-framework
```

```javascript
// Use main package
import framework from '@yourname/flutterjs-framework';

// Or use specific packages
import { analyzeCode } from '@yourname/flutterjs-framework/analyzer';
import { convert } from '@yourname/flutterjs-framework/converter';
import { build } from '@yourname/flutterjs-framework/builder';
```

---

## 5.14 Distribution Strategy for Multiple Packages

### For Flutter/Non-Developers

**Distribute .exe files:**

```
releases/v1.0.0/
├── analyzer.exe        ← Analyzer tool
├── converter.exe       ← Converter tool
├── builder.exe         ← Builder tool
└── README.md           ← Instructions
```

**Users:**
```dart
// Use without Node.js
Process.run('analyzer.exe', ['file.js'])
Process.run('converter.exe', ['input.vnode'])
Process.run('builder.exe', ['app.js'])
```

---

### For npm/JavaScript Developers

**Publish to npm:**

```bash
npm publish @yourname/flutterjs-framework
```

**Users:**
```bash
npm install @yourname/flutterjs-framework
```

```javascript
import { analyzeCode } from '@yourname/flutterjs-framework/analyzer';
import { convert } from '@yourname/flutterjs-framework/converter';
```

---

### For Internal Development

**Use .js files locally:**

```bash
node dist/analyzer.js myfile.js
node dist/converter.js input.vnode
```

**Keep .js.map for debugging:**
```
dist/
├── analyzer.js
├── analyzer.js.map      ← Debugging info
├── converter.js
├── converter.js.map     ← Debugging info
└── ...
```

---

## 5.15 Complete Build System for Multiple Packages

```javascript
// build.js - production-ready

import esbuild from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const packages = [
  {
    name: 'analyzer',
    entry: 'src/analyzer.js',
    description: 'Analyze code structure'
  },
  {
    name: 'converter',
    entry: 'src/converter.js',
    description: 'Convert VNode to DOM'
  },
  {
    name: 'builder',
    entry: 'src/builder.js',
    description: 'Build VNode tree'
  }
];

const config = {
  bundle: true,
  minify: true,
  sourcemap: true,
  platform: 'node',
  target: ['node14'],
  external: ['fs', 'path', 'util', 'os']
};

async function buildAll() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 FlutterJS Multi-Package Build System');
  console.log('='.repeat(70) + '\n');

  const startTime = Date.now();

  try {
    // Step 1: Build JavaScript packages
    console.log('📦 Building JavaScript packages...\n');

    for (const pkg of packages) {
      console.log(`  Building ${pkg.name}...`);
      
      const buildStart = Date.now();
      
      await esbuild.build({
        entryPoints: [pkg.entry],
        outfile: `dist/${pkg.name}.js`,
        ...config
      });
      
      const jsSize = getFileSize(`dist/${pkg.name}.js`);
      const mapSize = getFileSize(`dist/${pkg.name}.js.map`);
      const buildTime = ((Date.now() - buildStart) / 1000).toFixed(2);
      
      console.log(`    ✓ ${pkg.name}.js (${jsSize}) [${buildTime}s]`);
      console.log(`    ✓ ${pkg.name}.js.map (${mapSize})`);
      console.log('');
    }

    // Step 2: Create executables
    console.log('📦 Creating executables...\n');

    for (const pkg of packages) {
      try {
        console.log(`  Creating ${pkg.name}.exe...`);
        
        execSync(
          `pkg dist/${pkg.name}.js --output dist/${pkg.name}.exe --targets win`,
          { stdio: 'pipe' }
        );
        
        const exeSize = getFileSize(`dist/${pkg.name}.exe`);
        console.log(`    ✓ ${pkg.name}.exe (${exeSize})\n`);
      } catch (e) {
        console.warn(`    ⚠ Failed (pkg not installed?)\n`);
      }
    }

    // Step 3: Generate summary
    console.log('='.repeat(70));
    console.log('✓ BUILD COMPLETE');
    console.log('='.repeat(70));
    console.log('\n📊 BUILD SUMMARY:\n');

    for (const pkg of packages) {
      console.log(`  ${pkg.name}`);
      console.log(`    • Description: ${pkg.description}`);
      
      const jsSize = getFileSize(`dist/${pkg.name}.js`);
      console.log(`    • dist/${pkg.name}.js (${jsSize})`);
      
      const mapSize = getFileSize(`dist/${pkg.name}.js.map`);
      console.log(`    • dist/${pkg.name}.js.map (${mapSize})`);
      
      if (fs.existsSync(`dist/${pkg.name}.exe`)) {
        const exeSize = getFileSize(`dist/${pkg.name}.exe`);
        console.log(`    • dist/${pkg.name}.exe (${exeSize})`);
      }
      
      console.log('');
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱  Total build time: ${totalTime}s`);
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('✗ BUILD FAILED');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function getFileSize(filePath) {
  if (!fs.existsSync(filePath)) return 'N/A';
  
  const bytes = fs.statSync(filePath).size;
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// Run
buildAll();
```

**Usage:**
```bash
npm run build
```

**Output:**
```
======================================================================
🚀 FlutterJS Multi-Package Build System
======================================================================

📦 Building JavaScript packages...

  Building analyzer...
    ✓ analyzer.js (52.3KB) [0.45s]
    ✓ analyzer.js.map (85.2KB)

  Building converter...
    ✓ converter.js (38.1KB) [0.38s]
    ✓ converter.js.map (62.4KB)

  Building builder...
    ✓ builder.js (45.7KB) [0.41s]
    ✓ builder.js.map (71.8KB)

📦 Creating executables...

  Creating analyzer.exe...
    ✓ analyzer.exe (50.1MB)

  Creating converter.exe...
    ✓ converter.exe (50.1MB)

  Creating builder.exe...
    ✓ builder.exe (50.1MB)

======================================================================
✓ BUILD COMPLETE
======================================================================

📊 BUILD SUMMARY:

  analyzer
    • Description: Analyze code structure
    • dist/analyzer.js (52.3KB)
    • dist/analyzer.js.map (85.2KB)
    • dist/analyzer.exe (50.1MB)

  converter
    • Description: Convert VNode to DOM
    • dist/converter.js (38.1KB)
    • dist/converter.js.map (62.4KB)
    • dist/converter.exe (50.1MB)

  builder
    • Description: Build VNode tree
    • dist/builder.js (45.7KB)
    • dist/builder.js.map (71.8KB)
    • dist/builder.exe (50.1MB)

⏱  Total build time: 3.28s
======================================================================
```

---

# SECTION 6: FlutterJS Architecture

## 6.1 Your Framework Components

### Overall Structure

```
FlutterJS Framework
│
├─ SDK (what you provide)
│  ├─ @flutterjs/widgets
│  │  ├─ StatelessWidget
│  │  ├─ StatefulWidget
│  │  ├─ MaterialApp
│  │  └─ (all other widgets)
│  ├─ @flutterjs/core
│  │  ├─ BuildContext
│  │  ├─ State
│  │  └─ (core classes)
│  └─ @flutterjs/material
│     ├─ Material Design theme
│     ├─ Styles
│     └─ Components
│
├─ Analyzer (flutterjs.exe contains this)
│  ├─ Parser (read main.fjs + myflutter.js)
│  ├─ Analyzer (check completeness)
│  └─ Validator (check syntax)
│
├─ Compiler/Converter (flutterjs.exe contains this)
│  ├─ VNode Builder (create widget tree)
│  ├─ DOM Converter (VNode → HTML/CSS)
│  └─ Output Generator (write files)
│
└─ Runtime (flutterjs.exe contains this)
   ├─ Widget engine
   ├─ State management
   └─ DOM binding
```

---

## 6.2 User's Project Structure

```
user-project/
├─ main.fjs              ← Widget definitions (partial)
├─ myflutter.js          ← Implementation (complete)
├─ app/                  ← Generated output
│  ├─ index.html         ← Ready for browser
│  ├─ styles.css
│  └─ app.js
└─ assets/               ← Images, etc.
```

---

## 6.3 The Three Files: main.fjs, myflutter.js, and Output

### main.fjs (Widget Definition - Partial)

```javascript
// main.fjs - Just the structure

import { 
  StatelessWidget, 
  MaterialApp, 
  Scaffold, 
  AppBar, 
  Text 
} from '@flutterjs/widgets';

class MyApp extends StatelessWidget {
  // Empty - implementation in myflutter.js
}

class MyHomePage extends StatelessWidget {
  constructor({ title }) {
    this.title = title;
  }
  // Empty - implementation in myflutter.js
}

export { MyApp, MyHomePage };
```

**Purpose:**
- Defines what classes exist
- Shows widget structure
- Can be analyzed for completeness

---

### myflutter.js (Implementation - Complete)

```javascript
// myflutter.js - Full implementation

import { 
  StatelessWidget, 
  MaterialApp, 
  Scaffold, 
  AppBar, 
  Text 
} from '@flutterjs/widgets';

class MyApp extends StatelessWidget {
  build(context) {
    return new MaterialApp({
      title: "My App",
      home: new MyHomePage({ title: "Home" })
    });
  }
}

class MyHomePage extends StatelessWidget {
  constructor({ title }) {
    super();
    this.title = title;
  }
  
  build(context) {
    return new Scaffold({
      appBar: new AppBar({
        title: new Text(this.title)
      }),
      body: new Text("Hello!")
    });
  }
}

export { MyApp, MyHomePage };
```

**Purpose:**
- Complete, runnable implementation
- All methods defined
- All logic included

---

### Generated Output (app/index.html)

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="root">
    <div class="material-app">
      <div class="scaffold">
        <div class="app-bar">
          <h1>Home</h1>
        </div>
        <div class="body">
          <p>Hello!</p>
        </div>
      </div>
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>
```

**Purpose:**
- Ready for browser
- Can be opened directly
- User's app is live!

---

## 6.4 The Conversion Pipeline (Detailed)

### High-Level Flow

```
main.fjs + myflutter.js
        ↓
    (flutterjs.exe)
        ↓
    Analyzer (check completeness)
        ↓
    Parser (read JavaScript)
        ↓
    VNode Builder (create widget tree)
        ↓
    DOM Converter (VNode → HTML)
        ↓
    Output Writer (write files)
        ↓
app/index.html + app/styles.css + app/app.js
```

---

### Step-by-Step Conversion

**Step 1: Input Files**
```
main.fjs: 200 lines (partial)
myflutter.js: 500 lines (complete)
```

**Step 2: Analyzer**
```
Check:
✓ MyApp class in main.fjs
✓ MyApp.build() in myflutter.js
✓ MyHomePage class in main.fjs
✓ MyHomePage.build() in myflutter.js
✓ All imports resolved
Result: OK ✓
```

**Step 3: Parser**
```
Parse JavaScript → AST (Abstract Syntax Tree)
```

**Step 4: Execute User Code**
```
Execute myflutter.js:
  → new MyApp().build() returns VNode tree
  → VNode represents the widget structure
```

**Step 5: VNode Tree**
```
VNode {
  type: 'MaterialApp',
  props: {
    title: 'My App',
    home: VNode {
      type: 'Scaffold',
      props: { /* ... */ },
      children: [
        VNode { type: 'AppBar', ... },
        VNode { type: 'Text', text: 'Hello!' }
      ]
    }
  }
}
```

**Step 6: Convert to HTML**
```javascript
vnodeToDom(vnode) {
  // Recursively convert each VNode to HTML element
  // Apply styles
  // Create DOM structure
}
```

**Step 7: Extract CSS**
```css
.material-app { /* Material Design styles */ }
.scaffold { display: flex; flex-direction: column; }
.app-bar { background: #6750a4; }
/* ... more styles ... */
```

**Step 8: Output Files**
```
app/
├─ index.html (2.4 KB)
├─ styles.css (8.7 KB)
└─ app.js (4.1 KB)
```

---

## 6.5 What flutterjs.exe Contains

Inside the 50MB .exe:

```
flutterjs.exe
│
├─ Node.js Runtime (v18.17.0) [50MB]
│  └─ JavaScript interpreter
│
├─ Your Code (bundled) [50KB]
│  ├─ analyzer.js
│  ├─ converter.js
│  ├─ parser.js
│  └─ cli.js
│
├─ SDK Code (bundled) [100KB]
│  ├─ Widget classes
│  ├─ Material Design
│  └─ Utilities
│
└─ Dependencies (bundled) [~100KB]
   ├─ Any npm packages you used
   └─ Utilities
```

**Total:** ~50MB

---

# SECTION 7: Building Your Framework

## 7.1 Project Structure

Your development project:

```
flutterjs-framework/
│
├─ src/
│  ├─ cli.js                ← Entry point (handles commands)
│  ├─ analyzer.js           ← Check completeness
│  ├─ parser.js             ← Parse JavaScript
│  ├─ converter.js          ← VNode → HTML/CSS
│  ├─ vnode-builder.js      ← Build VNode tree
│  ├─ widgets.js            ← Widget definitions
│  └─ utils.js              ← Helper functions
│
├─ sdk/
│  ├─ material.js           ← Material Design widgets
│  ├─ core.js               ← Core classes
│  └─ theme.js              ← Theme/styling
│
├─ dist/
│  ├─ flutterjs.js          ← Bundled (Node.js)
│  └─ flutterjs.exe         ← Executable (Windows)
│
├─ build.js                 ← Build script
├─ package.json
└─ README.md
```

---

## 7.2 package.json Setup

```json
{
  "name": "@yourname/flutterjs-framework",
  "version": "1.0.0",
  "description": "Flutter-like framework for JavaScript",
  "main": "dist/flutterjs.js",
  "type": "module",
  "bin": {
    "flutterjs": "./dist/flutterjs.js"
  },
  "scripts": {
    "build:js": "esbuild src/cli.js --bundle --outfile=dist/flutterjs.js --minify --platform=node --target=node14",
    "build:exe": "pkg dist/flutterjs.js --output dist/flutterjs.exe --targets win",
    "build:all": "npm run build:js && npm run build:exe",
    "dev": "node src/cli.js",
    "test": "node test.js"
  },
  "devDependencies": {
    "esbuild": "^0.17.0",
    "pkg": "^5.8.0"
  },
  "dependencies": {}
}
```

---

## 7.3 Build Script (build.js)

```javascript
import esbuild from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';

async function build() {
  try {
    console.log('🚀 Building FlutterJS Framework\n');

    // Step 1: Bundle JavaScript
    console.log('[1/3] Bundling with esbuild...');
    await esbuild.build({
      entryPoints: ['src/cli.js'],
      bundle: true,
      outfile: 'dist/flutterjs.js',
      minify: true,
      sourcemap: true,
      platform: 'node',
      target: ['node14'],
      external: ['fs', 'path', 'util', 'os']
    });
    console.log('✓ Bundled: dist/flutterjs.js\n');

    // Step 2: Create Windows .exe
    console.log('[2/3] Creating Windows executable...');
    try {
      execSync('pkg dist/flutterjs.js --output dist/flutterjs.exe --targets win', 
        { stdio: 'inherit' }
      );
      console.log('✓ Created: dist/flutterjs.exe\n');
    } catch (e) {
      console.warn('⚠ pkg not installed or failed. Run: npm install -g pkg\n');
    }

    // Step 3: Create Linux/Mac binaries (optional)
    console.log('[3/3] Creating cross-platform binaries...');
    try {
      execSync('pkg dist/flutterjs.js --output dist/flutterjs-linux --targets linux',
        { stdio: 'inherit' }
      );
      console.log('✓ Created: dist/flutterjs-linux\n');
    } catch (e) {
      console.warn('⚠ Failed to create Linux binary\n');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('✓ BUILD COMPLETE');
    console.log('='.repeat(60));
    console.log('Files created:');
    console.log('  • dist/flutterjs.js (Node.js - for npm)');
    
    if (fs.existsSync('dist/flutterjs.exe')) {
      console.log('  • dist/flutterjs.exe (Windows - standalone)');
    }
    if (fs.existsSync('dist/flutterjs-linux')) {
      console.log('  • dist/flutterjs-linux (Linux - standalone)');
    }
    
    console.log('\nUsage:');
    console.log('  npm: npm install @yourname/flutterjs-framework');
    console.log('  exe: flutterjs.exe --build main.fjs myflutter.js');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('✗ Build failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  build();
}
```

---

## 7.4 CLI Entry Point (src/cli.js)

```javascript
import fs from 'fs';
import path from 'path';
import { analyzeFiles } from './analyzer.js';
import { buildApp } from './vnode-builder.js';
import { convertVNodeToDOM } from './converter.js';

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const mainFile = args[1];
const userFile = args[2];
const outputDir = args[3] === '--output' ? args[4] : 'app';

async function main() {
  if (command === '--build') {
    await buildApp(mainFile, userFile, outputDir);
  } else if (command === '--help') {
    showHelp();
  } else if (command === '--version') {
    console.log('FlutterJS v1.0.0');
  } else {
    console.error('Unknown command:', command);
    showHelp();
    process.exit(1);
  }
}

async function buildApp(mainFile, userFile, outputDir) {
  try {
    console.log('\n🚀 FlutterJS Build Process\n');

    // Validate inputs
    if (!mainFile || !userFile) {
      console.error('✗ Usage: flutterjs --build main.fjs myflutter.js [--output app/]');
      process.exit(1);
    }

    if (!fs.existsSync(mainFile)) {
      console.error(`✗ File not found: ${mainFile}`);
      process.exit(1);
    }

    if (!fs.existsSync(userFile)) {
      console.error(`✗ File not found: ${userFile}`);
      process.exit(1);
    }

    // Step 1: Read files
    console.log('📖 Reading files...');
    const mainContent = fs.readFileSync(mainFile, 'utf8');
    const userContent = fs.readFileSync(userFile, 'utf8');
    console.log('  ✓ Files read\n');

    // Step 2: Analyze
    console.log('🔍 Analyzing...');
    const analysis = analyzeFiles(mainContent, userContent);
    
    if (analysis.errors.length > 0) {
      console.error('\n✗ Analysis failed:');
      analysis.errors.forEach(e => console.error(`  • ${e}`));
      process.exit(1);
    }
    console.log('  ✓ Analysis complete\n');

    // Step 3: Build VNode tree
    console.log('🏗  Building widget tree...');
    const vnode = await buildApp(userContent);
    console.log('  ✓ VNode tree created\n');

    // Step 4: Convert to DOM
    console.log('🎨 Converting to HTML/CSS...');
    const { html, css, js } = convertVNodeToDOM(vnode);
    console.log('  ✓ Conversion complete\n');

    // Step 5: Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Step 6: Write files
    console.log('📝 Writing output files...');
    fs.writeFileSync(path.join(outputDir, 'index.html'), html);
    fs.writeFileSync(path.join(outputDir, 'styles.css'), css);
    fs.writeFileSync(path.join(outputDir, 'app.js'), js);
    console.log('  ✓ Files written\n');

    // Success
    console.log('='.repeat(60));
    console.log('✓ BUILD SUCCESSFUL');
    console.log('='.repeat(60));
    console.log(`\n📁 Output directory: ${path.resolve(outputDir)}`);
    console.log(`   • index.html (${(html.length / 1024).toFixed(1)} KB)`);
    console.log(`   • styles.css (${(css.length / 1024).toFixed(1)} KB)`);
    console.log(`   • app.js (${(js.length / 1024).toFixed(1)} KB)`);
    console.log('\n🌐 Open app/index.html in your browser to view the app!\n');

  } catch (error) {
    console.error('\n✗ Build failed');
    console.error('Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
FlutterJS Framework v1.0.0

Usage:
  flutterjs --build <main.fjs> <impl.js> [--output <dir>]
  flutterjs --version
  flutterjs --help

Examples:
  flutterjs --build main.fjs myflutter.js
  flutterjs --build main.fjs myflutter.js --output dist/

Description:
  Converts FlutterJS code to web app (HTML/CSS/JS)
  `);
}

main();
```

---

# SECTION 8: Complete Working Examples

## 8.1 Example 1: Simple Counter App

### User Creates main.fjs

```javascript
// main.fjs
import { StatelessWidget, MaterialApp, Scaffold, AppBar, Text, FloatingActionButton } from '@flutterjs/widgets';

class MyApp extends StatelessWidget {}

class CounterPage extends StatelessWidget {
  constructor({ title }) {
    this.title = title;
  }
}

export { MyApp, CounterPage };
```

### User Creates myflutter.js

```javascript
// myflutter.js
import { StatelessWidget, MaterialApp, Scaffold, AppBar, Text, FloatingActionButton, Icon, Icons } from '@flutterjs/widgets';

class MyApp extends StatelessWidget {
  build(context) {
    return new MaterialApp({
      title: "Counter App",
      home: new CounterPage({ title: "Counter" })
    });
  }
}

class CounterPage extends StatelessWidget {
  constructor({ title }) {
    super();
    this.title = title;
  }
  
  build(context) {
    return new Scaffold({
      appBar: new AppBar({
        title: new Text(this.title)
      }),
      body: new Text("Count: 0"),
      floatingActionButton: new FloatingActionButton({
        child: new Icon(Icons.add),
        onPressed: () => console.log('Increment')
      })
    });
  }
}

export { MyApp, CounterPage };
```

### User Runs

```bash
flutterjs --build main.fjs myflutter.js --output app/
```

### Output

```
✓ BUILD SUCCESSFUL
Output directory: app/
  • index.html
  • styles.css
  • app.js
```

### User Opens app/index.html in Browser

```
┌─────────────────────────────┐
│ Counter App                 │
├─────────────────────────────┤
│                             │
│  Count: 0                   │
│                             │
├─────────────────────────────┤
│                        [+]  │
└─────────────────────────────┘
```

---

## 8.2 Example 2: Using External Package

### Scenario: You Want to Use lodash in Your Framework

### Step 1: Install lodash

```bash
npm install lodash
```

### Step 2: Use in Your Code

**src/utils.js:**
```javascript
import lodash from 'lodash';

export function parseWidgetTree(widgets) {
  // Use lodash for deep operations
  return lodash.cloneDeep(widgets);
}
```

### Step 3: Build WITHOUT putting lodash in external

```javascript
// build.js
esbuild.build({
  entryPoints: ['src/cli.js'],
  bundle: true,
  outfile: 'dist/flutterjs.js',
  platform: 'node',
  external: ['fs', 'path', 'util']  // ← lodash NOT here
  // lodash gets bundled ✓
})
```

### Step 4: Create .exe

```bash
npm run build:all
# dist/flutterjs.exe now contains lodash ✓
```

### Step 5: Users Don't Need to Install Anything

```bash
flutterjs --build main.fjs myflutter.js
# Works! lodash is inside flutterjs.exe
```

---

## 8.3 Example 3: Publishing to npm

### Step 1: Setup

```bash
npm adduser
# Username: yourname
# Password: ****
# Email: your@email.com
```

### Step 2: Update package.json

```json
{
  "name": "@yourname/flutterjs-framework",
  "version": "1.0.0",
  "description": "Flutter-like framework for JavaScript",
  "main": "dist/flutterjs.js",
  "bin": {
    "flutterjs": "./dist/flutterjs.js"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/yourname/flutterjs-framework"
  },
  "keywords": ["flutter", "web", "javascript"],
  "author": "Your Name",
  "license": "MIT"
}
```

### Step 3: Build

```bash
npm run build:all
```

### Step 4: Publish

```bash
npm publish --access public
```

### Step 5: Users Install

```bash
npm install -g @yourname/flutterjs-framework
flutterjs --help
```

---

## 8.4 Complete File Structure Checklist

### Before Building

```
✓ src/cli.js exists
✓ src/analyzer.js exists
✓ src/converter.js exists
✓ package.json configured
✓ build.js created
✓ All imports use ES modules
```

### Building

```bash
npm install          # Install dependencies
npm run build:all    # Build JS + .exe
```

### After Building

```
✓ dist/flutterjs.js exists
✓ dist/flutterjs.exe exists
✓ Can run: flutterjs --help
✓ Can build apps: flutterjs --build main.fjs myflutter.js
```

---

# SUMMARY & QUICK REFERENCE

## What You've Learned

1. **JavaScript** - Programming language
2. **Node.js** - Runtime for computers
3. **npm** - Package manager
4. **esbuild** - Bundler (combines files)
5. **pkg** - Creates executables (.exe)
6. **Dependencies** - External packages (bundle or external)
7. **FlutterJS** - Your framework (converts Flutter-like code to web)

---

## Key Decisions

| Scenario | Action |
|----------|--------|
| Want .exe to work alone | Bundle external packages |
| Want npm package | Keep packages external |
| Creating distributable | Use pkg to make .exe |
| For Flutter users | Distribute .exe file |
| For JS developers | Publish to npm |

---

## Useful Commands

```bash
# Development
npm install                  # Install dependencies
npm run build:js            # Build JavaScript only
npm run build:all           # Build JS + .exe
node src/cli.js            # Test locally

# Distribution
npm publish                 # Publish to npm
pkg dist/flutterjs.js      # Create .exe manually

# Testing
node dist/flutterjs.js --help
flutterjs.exe --help
```

---

## File Sizes Reference

```
dist/flutterjs.js     ~50KB    (JavaScript)
dist/flutterjs.exe    ~50MB    (includes Node.js)
node_modules/         ~500MB   (all packages)
```

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| Cannot find module 'X' | Package not installed/bundled | npm install X or add to external |
| 'node' not found | Node.js not installed | Install from nodejs.org |
| .exe doesn't work | Missing dependencies | Bundle all packages (remove from external) |
| File too large | Bundling too much | Remove unnecessary dependencies |
| Import syntax error | Mixed CommonJS/ES | Use only ES modules (import/export) |

---

## Next Steps

1. ✓ Understand this document
2. ✓ Set up package.json
3. ✓ Create build.js
4. ✓ Build analyzer module
5. ✓ Build converter module
6. ✓ Build CLI entry point
7. ✓ Test locally
8. ✓ Create .exe
9. ✓ Publish to npm
10. ✓ Distribute to users

---

**Congratulations! You now understand the complete JavaScript/Node.js/npm/esbuild/pkg ecosystem and how to build and distribute FlutterJS.**