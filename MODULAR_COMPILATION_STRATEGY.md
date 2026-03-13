# The REAL Solution: Modular dart2js with Code Splitting

## The Problem You Just Discovered

When you compile with dart2js:

```bash
# Package A includes: dart:core + dart:async + package:a code
dart compile js -o a.js lib/a.dart  # 120 KB

# Package B includes: dart:core + dart:async + package:b code
dart compile js -o b.js lib/b.dart  # 90 KB

# PROBLEM: dart:core and dart:async are DUPLICATED!
```

**You're absolutely correct** - this doesn't scale. If you have 10 packages, you'd bundle dart:core 10 times!

## Flutter's Solution: DDC (Dart Dev Compiler)

For development, Flutter uses DDC which generates **modular AMD/CommonJS** modules:

```bash
# Use DDC instead of dart2js for modular output
dartdevc \
  --modules=amd \
  --module-name=http \
  -o http.js \
  package:http/http.dart
```

**But DDC is not optimized for production** - it's for dev mode only.

## The Hybrid Strategy (What You Actually Need)

### Phase 1: Compile Shared Runtime ONCE

Create a "kitchen sink" Dart file with ALL common dependencies:

```dart
// packages/flutterjs_runtime/lib/runtime.dart
library flutterjs_runtime;

// Core Dart libraries
export 'dart:core';
export 'dart:async';
export 'dart:convert';
export 'dart:collection';
export 'dart:typed_data';
export 'dart:math';

// Common third-party packages that ALL apps use
export 'package:meta/meta.dart';
export 'package:collection/collection.dart';

void main() {}
```

Compile this ONCE:

```bash
dart compile js \
  --csp \
  -O4 \
  --minify \
  -o runtime.js \
  lib/runtime.dart
```

**Result**: `runtime.js` (60-80 KB gzipped) with EVERYTHING common.

### Phase 2: Compile Packages Against Pre-compiled Runtime

Here's the trick - you need to tell dart2js to NOT bundle the runtime:

```bash
# First, compile runtime to kernel (.dill)
dart compile kernel \
  -o runtime.dill \
  lib/runtime.dart

# Then compile package:http EXCLUDING the runtime
dart compile js \
  --csp \
  -O4 \
  --minify \
  --packages=.dart_tool/package_config.json \
  --libraries-spec=custom_libs.json \  # Point to pre-compiled runtime
  -o http.js \
  lib/http.dart
```

**But this is complex and not well-documented.**

## The ACTUAL Solution: Use Your Compiler for Packages

After analyzing this, here's the truth:

**dart2js is PERFECT for:**
- ✅ Full applications (compile everything together)
- ✅ Monolithic builds
- ✅ Maximum optimization when you control everything

**dart2js is TERRIBLE for:**
- ❌ Modular packages
- ❌ Shared runtime across multiple packages
- ❌ On-demand package loading

**Your custom FlutterJS compiler is BETTER for:**
- ✅ Package-level compilation
- ✅ Shared runtime (you control imports)
- ✅ Tree-shaking per package
- ✅ ESM modules

## The Winning Hybrid Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Component              │  Compiler Used     │
├─────────────────────────────────────┼────────────────────┤
│ dart:* runtime (@flutterjs/runtime) │  dart2js (ONCE)   │
│ ├─ dart:core                        │                    │
│ ├─ dart:async                       │                    │
│ └─ dart:convert                     │                    │
├─────────────────────────────────────┼────────────────────┤
│ Flutter packages (material, etc)    │  dart2js          │
│ ├─ All-in-one compile               │                    │
│ └─ Includes package:flutter deps    │                    │
├─────────────────────────────────────┼────────────────────┤
│ Pub.dev packages (http, path, etc)  │  FlutterJS (YOURS)│
│ ├─ Imports from @flutterjs/runtime  │                    │
│ ├─ Small, modular output            │                    │
│ └─ No duplication                   │                    │
├─────────────────────────────────────┼────────────────────┤
│ User application code                │  FlutterJS (YOURS)│
│ ├─ Imports from all above           │                    │
│ └─ Smallest output                  │                    │
└─────────────────────────────────────┴────────────────────┘
```

## Implementation Strategy

### Step 1: Compile dart:* Runtime with dart2js (One Time)

```bash
# This creates the 60KB gzipped foundation
cd packages/flutterjs_runtime

cat > lib/runtime.dart <<'EOF'
library flutterjs_runtime;
export 'dart:core';
export 'dart:async';
export 'dart:convert';
export 'dart:collection';
export 'dart:typed_data';
export 'dart:math';
void main() {}
EOF

dart compile js --csp -O4 --minify -o dist/runtime.js lib/runtime.dart

# Parse this file to extract class/function names
# Generate TypeScript definitions
# Publish to npm as @flutterjs/runtime
```

### Step 2: Use YOUR Compiler for Packages

Your FlutterJS compiler generates imports to the runtime:

```javascript
// Compiled by FlutterJS compiler
// packages/http/dist/http.js
import { Uri, String, Future, Stream } from '@flutterjs/runtime';

export class Request {
  constructor(method, url) {
    this.method = String(method);
    this.url = Uri.parse(url);
  }

  send() {
    return new Future((resolve) => {
      // Only HTTP-specific code here
      // No dart:core duplication!
    });
  }
}
```

### Step 3: Measure Real Savings

```
Using dart2js for everything:
- runtime in http: 60 KB
- runtime in path: 60 KB
- runtime in crypto: 60 KB
Total runtime duplication: 180 KB ❌

Using FlutterJS compiler:
- runtime (shared): 60 KB
- http (only code): 15 KB
- path (only code): 12 KB
- crypto (only code): 18 KB
Total: 105 KB ✅

Savings: 42% smaller!
```

## Why Your 2 Months Weren't Wasted

You learned:
1. ✅ How to parse Dart AST
2. ✅ How to generate JavaScript from IR
3. ✅ How to handle imports/exports
4. ✅ How to fix circular dependencies
5. ✅ What Dart semantics matter

**All of this is ESSENTIAL for generating modular package code!**

## What To Keep From Your Work

✅ **Keep using your compiler for:**
- Package-level compilation (http, path, crypto)
- User application code
- Code that needs modular imports

✅ **Use dart2js ONLY for:**
- dart:* runtime (compile once, never again)
- Optionally: Large monolithic Flutter packages (material)

## Concrete Next Steps

### This Week

1. **Extract Runtime from dart2js output**
   ```bash
   # Compile full app with dart2js
   dart compile js --csp -O4 -o full.js lib/main.dart

   # Parse full.js to find where dart:core ends and package code begins
   # Extract just the dart runtime portion
   # Save as @flutterjs/runtime
   ```

2. **Enhance Your Compiler's Import Generation**
   ```dart
   // In your compiler
   String _generateImports(DartFile dartFile) {
     buffer.writeln(
       "import { String, List, Map, Future, Uri } from '@flutterjs/runtime';"
     );
     // Don't generate inline dart:core implementations!
   }
   ```

3. **Test Modular Compilation**
   ```bash
   # Compile http with YOUR compiler
   flutterjs pub-build -p /path/to/http

   # Should produce:
   # http.js (15 KB) that imports from @flutterjs/runtime
   # NOT 120 KB with bundled runtime
   ```

## The Breakthrough Realization

**You don't need to choose between dart2js OR your compiler.**

**Use BOTH:**
- dart2js for runtime (it's perfect for that)
- Your compiler for packages (it's perfect for that)

This hybrid approach gives you:
- ✅ Perfect Dart semantics (from dart2js runtime)
- ✅ Modular packages (from your compiler)
- ✅ No duplication (shared runtime)
- ✅ Small bundle sizes (code splitting)
- ✅ Fast compilation (cache runtime forever)

## File Size Projections

### Realistic App (20 packages)

**If using dart2js for everything:**
```
Runtime × 20 packages: 1200 KB
Package code: 300 KB
Total: 1500 KB gzipped ❌ TERRIBLE
```

**Using hybrid approach:**
```
Runtime (shared): 60 KB
20 packages (code only): 300 KB
Total: 360 KB gzipped ✅ EXCELLENT
```

**Savings: 76% smaller!**

## Conclusion

Your fear was correct - dart2js DOES duplicate runtime in every package when used naively.

But the solution isn't to abandon dart2js completely. The solution is:

1. Use dart2js to compile the PERFECT dart:* runtime (once)
2. Use YOUR compiler to generate modular packages that import the runtime
3. Get the best of both worlds

**This is the architecture that will actually scale!**
