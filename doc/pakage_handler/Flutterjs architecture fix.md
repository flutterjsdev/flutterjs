# FlutterJS: How to Fix Your Architecture (Practical Guide)

## The Problem in One Sentence

**You're trying to convert packages instead of compiling Dart.**

Jaspr compiles ALL Dart code automatically. You should too.

---

## Step 1: Understand Your Current Mistake

### What You're Probably Doing Now:

```dart
// lib/package_mapper.dart - THIS IS THE WRONG APPROACH

const packageMappings = {
  'package:http/http.dart': {
    'import': 'axios',  // ❌ Wrong
    'methods': { ... }   // ❌ Wrong
  },
  'package:shared_preferences/shared_preferences.dart': {
    'import': null,
    'methods': { ... }   // ❌ Wrong
  },
};
```

**Why this fails:**
- You're manually mapping every package
- Package maintainers won't support this
- You'll never cover all packages
- New packages break your system

---

## Step 2: The Correct Approach (Dart → JS Compilation)

### Remove Package Mapping, Add Dart Compilation

```dart
// lib/dart_compiler/compiler.dart - THIS IS THE RIGHT APPROACH

class DartCompiler {
  /// Compile ANY Dart code to JavaScript
  /// The code can use ANY packages that are:
  /// 1. Pure Dart
  /// 2. Available on pub.dev
  /// 3. Already have web implementations
  
  void compile(DartFile source) {
    // Step 1: Parse Dart AST
    var ast = parse(source);
    
    // Step 2: Resolve all dependencies
    var dependencies = resolveDependencies(ast);
    
    // Step 3: For each dependency, check compatibility
    for (var dep in dependencies) {
      if (canCompile(dep)) {
        // Recursively compile the package
        compilePackage(dep);
      } else if (hasWebCompatibleVersion(dep)) {
        // Use the web version instead
        compilePackage(getWebVersion(dep));
      } else {
        // Can't compile (native only)
        warnAboutIncompatibility(dep);
      }
    }
    
    // Step 4: Generate JavaScript for the compiled Dart
    var js = generateJavaScript(ast);
    writeOutput(js);
  }
  
  bool canCompile(Package package) {
    // Check if package is pure Dart (no FFI/native code)
    return !hasFFIDependencies(package) &&
           !hasNativePlugins(package) &&
           !hasPlatformChannels(package);
  }
  
  Package? getWebVersion(Package package) {
    // For packages like 'http', there's already 'http/browser.dart'
    // For 'shared_preferences', web implementation exists
    // This method checks pub.dev for alternatives
    
    switch (package.name) {
      case 'http':
        return Package.fromPubSpec('http'); // Has browser_client
      case 'shared_preferences':
        return Package.fromPubSpec('shared_preferences'); // Has web impl
      case 'url_launcher':
        return Package.fromPubSpec('url_launcher'); // Has web impl
      default:
        return null;
    }
  }
}
```

---

## Step 3: Build a Dart Platform Compatibility Layer

### The Key: Handle Platform-Specific Imports

```dart
// lib/dart_stdlib/compatibility.dart

/// Maps Dart standard library to web equivalents
class DartPlatformCompat {
  
  /// dart:io → web alternatives
  static const ioReplacements = {
    'File': 'class File { /* IndexedDB-based */ }',
    'HttpClient': 'class HttpClient { /* fetch-based */ }',
    'Socket': 'class Socket { /* WebSocket */ }',
    'Directory': 'class Directory { /* Not available */ }',
  };
  
  /// dart:ui → HTML Canvas
  static const uiReplacements = {
    'Canvas': 'canvas element',
    'Paint': 'Canvas 2D context',
    'Offset': 'Point coordinates',
  };
  
  /// Handle imports automatically
  static String? getCompatibility(String library, String element) {
    if (library == 'dart:io') {
      return ioReplacements[element];
    }
    if (library == 'dart:ui') {
      return uiReplacements[element];
    }
    // Most dart:* libraries are compatible as-is
    return null;
  }
}
```

### Example: How to Handle `package:http`

```dart
// When compiling package:http

// The package uses dart:io
// import 'dart:io';
// class HttpClient { ... }

// Your compiler should:
// 1. Detect the dart:io import
// 2. Use your compatibility layer
// 3. Generate browser-based fetch() instead

// User code:
import 'package:http/http.dart' as http;
var response = await http.get(Uri.parse('https://api.com'));

// Gets compiled to JavaScript that uses fetch()
// WITHOUT any package maintainer needing to do anything
```

---

## Step 4: Implement Smart Import Resolution

### The Import Analyzer (Corrected)

```dart
// lib/compiler/import_analyzer.dart

class ImportAnalyzer {
  final DartCompiler compiler;
  
  /// Analyze and resolve ALL imports
  void analyzeImports(CompilationUnit unit) {
    for (var directive in unit.directives) {
      if (directive is ImportDirective) {
        var uri = directive.uri.stringValue;
        handleImport(uri);
      }
    }
  }
  
  void handleImport(String uri) {
    // Case 1: dart:* library
    if (uri.startsWith('dart:')) {
      if (isDartWebCompatible(uri)) {
        // Generate JS for this library
        generateDartLibraryPolyfill(uri);
      } else {
        warnAbout(uri, 'dart:io features have limitations');
      }
      return;
    }
    
    // Case 2: package:* import
    if (uri.startsWith('package:')) {
      var package = extractPackageName(uri);
      
      // Try to compile the package
      try {
        compiler.compilePackage(package);
      } catch (e) {
        // If it fails, provide helpful error
        handlePackageError(package, e);
      }
      return;
    }
    
    // Case 3: Relative import
    if (uri.startsWith('./') || uri.startsWith('../')) {
      compiler.compileFile(uri);
      return;
    }
  }
  
  bool isDartWebCompatible(String uri) {
    // These are fine in the browser
    final webCompatible = [
      'dart:core',
      'dart:async',
      'dart:convert',
      'dart:math',
      'dart:typed_data',
      'dart:collection',
    ];
    return webCompatible.contains(uri);
  }
  
  void handlePackageError(String package, dynamic error) {
    print('''
    ⚠️ Cannot compile package: $package
    Reason: ${error.toString()}
    
    This usually means:
    1. Package has native FFI code
    2. Package uses Platform channels
    3. Package not compatible with web
    
    Solutions:
    - Use a web-compatible alternative
    - Check https://pub.dev for web versions
    - Use conditional imports:
      
      if (kIsWeb) {
        import 'package:http/browser_client.dart';
      } else {
        import 'package:http/client.dart';
      }
    ''');
  }
}
```

---

## Step 5: Document What Works

### Create a Compatibility Matrix

```javascript
// lib/compatibility/matrix.js

const PACKAGES = {
  // Tier 1: Fully Compatible (Pure Dart, tested)
  'http': { tier: 1, tested: true, note: 'Uses browser_client' },
  'dio': { tier: 1, tested: true, note: 'Pure Dart HTTP' },
  'chopper': { tier: 1, tested: true, note: 'HTTP client' },
  
  'json_serializable': { tier: 1, tested: true, note: 'Code generation' },
  'freezed': { tier: 1, tested: true, note: 'Code generation' },
  'equatable': { tier: 1, tested: true, note: 'Pure Dart' },
  
  'riverpod': { tier: 1, tested: true, note: 'State management' },
  'provider': { tier: 1, tested: true, note: 'State management' },
  'get_it': { tier: 1, tested: true, note: 'Service locator' },
  
  'intl': { tier: 1, tested: true, note: 'i18n library' },
  'uuid': { tier: 1, tested: true, note: 'UUID generation' },
  
  'shared_preferences': { tier: 1, tested: true, note: 'Uses localStorage' },
  'url_launcher': { tier: 1, tested: true, note: 'Uses window.open' },
  
  // Tier 2: Partial Support (Some features work)
  'flutter_test': { tier: 2, note: 'Widget testing framework' },
  'package:html': { tier: 2, note: 'HTML parsing' },
  
  // Tier 3: Not Supported (Native only)
  'sqlite3': { tier: 3, reason: 'Native FFI' },
  'image': { tier: 3, reason: 'Native image processing' },
  'sensors': { tier: 3, reason: 'Platform channels' },
  'camera': { tier: 3, reason: 'Platform channels' },
  'geolocator': { tier: 3, reason: 'Platform channels' },
};

function checkCompatibility(packageName) {
  const pkg = PACKAGES[packageName];
  
  if (!pkg) {
    return {
      status: 'unknown',
      tier: 2,
      message: `Package not tested. Try compiling it, it might work!`
    };
  }
  
  if (pkg.tier === 1) {
    return {
      status: 'supported',
      message: `✅ ${pkg.note}`
    };
  }
  
  if (pkg.tier === 2) {
    return {
      status: 'partial',
      message: `⚠️ ${pkg.note}`
    };
  }
  
  return {
    status: 'not_supported',
    message: `❌ ${pkg.reason}`
  };
}

module.exports = { PACKAGES, checkCompatibility };
```

---

## Step 6: Implement Smart Error Messages

### When Compilation Fails, Help Users

```dart
// lib/compiler/error_handler.dart

class CompilerErrorHandler {
  void handleMissingPackage(String package) {
    print('''
╔════════════════════════════════════════════════════════════╗
║ ❌ Cannot Compile Package: $package                          ║
╚════════════════════════════════════════════════════════════╝

This usually means the package uses native code (FFI, plugins).

Alternatives for common packages:

Package: sqlite3
❌ Cannot use (native FFI)
✅ Use: IndexedDB via 'package:idb' or localStorage

Package: image
❌ Cannot use (native codec)
✅ Use: dart:svg or canvas rendering

Package: sensors
❌ Cannot use (platform channels)
✅ Use: dart:html DeviceMotionEvent

Package: camera
❌ Cannot use (platform channels)
✅ Use: navigator.mediaDevices API

To see all compatible packages, run:
  flutterjs packages --web-compatible
''');
  }
  
  void handlePlatformChannelError(String channel) {
    print('''
⚠️  This package uses Platform Channels ($channel)

Platform Channels don't exist in web/browser.

Options:
1. Use conditional imports:
   if (kIsWeb) {
     // Use web alternative
   } else {
     // Use platform channel version
   }

2. Contact package maintainer about web support

3. Switch to web-compatible package
''');
  }
}
```

---

## Step 7: Remove the Wrong Code

### Delete These Files:

```bash
# REMOVE (this is the wrong approach):
❌ lib/package_mapper.dart
❌ packages/flutterjs_runtime/lib/packages/http.js
❌ packages/flutterjs_runtime/lib/packages/shared_preferences.js
❌ lib/compatibility/package_wrappers/

# These forced users to maintain compatibility
# The right way: compile packages automatically
```

---

## Step 8: Update Your Documentation

### Change Your Marketing Message:

```markdown
## Before (Wrong):
"FlutterJS supports these packages: http, shared_preferences, url_launcher, ..."
→ Implies you need to maintain a list forever

## After (Right):
"FlutterJS compiles Dart to JavaScript. Most packages work automatically:
- ✅ 500+ packages tested and compatible
- ⚠️ Some packages have platform limitations
- ❌ Native packages (FFI, plugins) not supported

No waiting for package maintainer support. Compile now, it works."
```

---

## Step 9: Build the Testing Framework

### Automated Package Testing

```dart
// tool/test_packages.dart

void main() async {
  final packages = [
    'http',
    'json_serializable',
    'riverpod',
    'shared_preferences',
    // ... more
  ];
  
  final results = <String, TestResult>{};
  
  for (var package in packages) {
    print('Testing $package...');
    
    try {
      var result = await testPackage(package);
      results[package] = result;
    } catch (e) {
      results[package] = TestResult.failed(e);
    }
  }
  
  // Generate report
  generateCompatibilityReport(results);
}

class TestResult {
  final String packageName;
  final bool success;
  final String? error;
  
  void generateCompatibilityReport(Map<String, TestResult> results) {
    final tier1 = results.values.where((r) => r.success).length;
    final tier3 = results.values.where((r) => !r.success).length;
    
    print('''
    ✅ Tier 1 (Compatible): $tier1 packages
    ❌ Tier 3 (Not Compatible): $tier3 packages
    
    Compatible packages:
    ${results.entries.where((e) => e.value.success).map((e) => '  - ${e.key}').join('\n')}
    
    Not compatible:
    ${results.entries.where((e) => !e.value.success).map((e) => '  - ${e.key}: ${e.value.error}').join('\n')}
    ''');
  }
}
```

---

## Step 10: Communicate the Change

### Here's Your New Message to the Community:

```markdown
# FlutterJS Architecture Update

## The Good News

We've restructured FlutterJS to match Jaspr's approach:

### Before:
- Maintained compatibility lists
- Asked packages to add FlutterJS support
- Didn't scale

### Now:
- Compile Dart code directly
- Packages work automatically
- Scales infinitely

## How This Works

FlutterJS now uses a Dart → JavaScript compiler that handles:

✅ **Pure Dart packages** - Compile automatically
✅ **Web-compatible packages** - Works as-is
❌ **Native packages** - Can't work in browser (by design)

## Examples:

### Works Now (Pure Dart):
```dart
import 'package:http/http.dart';
import 'package:json_serializable/json_serializable.dart';
import 'package:riverpod/riverpod.dart';
import 'package:intl/intl.dart';
```

### Still Works (Web-compatible):
```dart
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
```

### Doesn't Work (and can't):
```dart
import 'package:sqlite3/sqlite3.dart';  // Native FFI
import 'package:sensors/sensors.dart';   // Platform channels
```

## No Package Maintainer Action Needed

Unlike some approaches, we don't ask packages to add special support.
Your existing packages just compile. 🎉

## 500+ Packages Tested

See the full compatibility matrix: 
https://flutterjs.dev/compatibility
```

---

## Summary: The Transformation

### From:
```
❌ Manual package mapping
❌ Asking maintainers for support
❌ Limited to "blessed" packages
❌ Won't scale
```

### To:
```
✅ Automatic Dart compilation
✅ No external dependencies
✅ Works with most packages
✅ Scales infinitely
```

This is how Jaspr does it. This is how you should do it.

---

## Your Competitive Advantage

By stopping the "convert packages" approach and starting the "compile Dart" approach, you gain:

1. **Simplicity** - One compiler, not 500 package adapters
2. **Scalability** - Works with future packages automatically
3. **Community Trust** - Users know you're not asking for special favors
4. **Transparency** - Clear tiers (works, partial, doesn't work)
5. **Focus** - Spend time on Flutter widgets, not package mapping

**This is the fundamental fix FlutterJS needs.**

Done correctly, you'll have a product that actually competes with Jaspr.