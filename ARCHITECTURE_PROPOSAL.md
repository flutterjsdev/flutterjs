# FlutterJS Architecture Proposal - Hybrid Runtime

## Problem Statement
Converting entire Flutter packages from Dart to JavaScript is unsustainable:
- Manual fixes for every package (path, source_span, http, etc.)
- Circular dependency issues
- Dart semantics don't map 1:1 to JavaScript
- 2+ months fixing individual packages with no clear completion path

## Proposed Solution: Hybrid Architecture

### High-Level Design
```
┌─────────────────────────────────────────────────────────┐
│                      Browser                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐         ┌──────────────────┐     │
│  │   JS Runtime     │◄───────►│  Dart Runtime    │     │
│  │                  │  Bridge │  (WASM)          │     │
│  ├──────────────────┤         ├──────────────────┤     │
│  │ • Widget Render  │         │ • dart:core      │     │
│  │ • DOM Updates    │         │ • dart:async     │     │
│  │ • Event Handling │         │ • dart:convert   │     │
│  │ • CSS/Layout     │         │ • package:http   │     │
│  │                  │         │ • package:path   │     │
│  │ User App Code    │         │ • All pub.dev    │     │
│  │ (Compiled to JS) │         │   packages       │     │
│  └──────────────────┘         └──────────────────┘     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. JavaScript Layer (Your Current Work - Keep This!)
- **Widget Rendering Engine** ✅ Already built
- **DOM Manipulation** ✅ Already built
- **User Application Code** - FlutterJS compiler converts Dart → JS
- **Event System** - Bridges browser events to Dart
- **Hot Reload** - Your dev experience features

#### 2. Dart Runtime Layer (New - Use Existing Tech)
- **dart2wasm** - Official Dart WASM compiler (Google maintains)
- **dart:* libraries** - Run natively in WASM
- **package:* packages** - Load as Dart kernel (.dill files)
- **Package Resolution** - On-demand loading from pub.dev

#### 3. Bridge Layer (New - Build This)
```dart
// Dart side
@JS()
class JSWidget {
  external void render(Map<String, dynamic> props);
}

// JS side
class DartPackageRuntime {
  async loadPackage(name, version) {
    // Load .dill from CDN or pub.dev
    // Execute in WASM runtime
  }

  async callDartFunction(packageName, functionName, args) {
    // Bridge call to WASM
  }
}
```

## Implementation Phases

### Phase 1: Proof of Concept (1-2 weeks)
**Goal**: Run a single Dart package in WASM alongside your JS renderer

1. Integrate dart2wasm into build pipeline
2. Create minimal bridge (JS calls Dart, Dart returns JSON)
3. Test with simple package (package:http GET request)
4. Measure performance overhead

**Success Criteria**:
- User code (Dart) compiled to JS calls package:http running in WASM
- HTTP response flows back to JS rendering layer
- Performance acceptable (<100ms overhead)

### Phase 2: Core Package Migration (2-3 weeks)
**Goal**: Move problematic packages to WASM runtime

Migrate these packages OUT of JS transpilation:
- ❌ package:path → ✅ Run in Dart WASM
- ❌ package:source_span → ✅ Run in Dart WASM
- ❌ package:http → ✅ Run in Dart WASM
- ❌ All dart:* libraries → ✅ Run in Dart WASM

**Success Criteria**:
- No more manual circular dependency fixes
- No more dart:core class implementations
- Packages work "out of the box"

### Phase 3: Dynamic Package Loading (3-4 weeks)
**Goal**: Load any pub.dev package on demand

```dart
// User code (still compiles to JS for UI)
import 'package:crypto/crypto.dart';

void main() {
  // FlutterJS detects this import
  // Loads package:crypto as .dill into WASM
  final hash = sha256.convert(utf8.encode('data'));

  // Result bridges back to JS for rendering
  Text(hash.toString());
}
```

**Implementation**:
1. Build .dill cache/CDN for popular packages
2. On-demand compilation for uncached packages
3. Smart caching (browser IndexedDB)
4. Lazy loading (only load when used)

### Phase 4: Optimization (2-3 weeks)
- Reduce WASM bundle size
- Preload common packages
- Tree-shake unused package code
- Optimize bridge calls (batch, cache)

## Technical Details

### Using dart2wasm
```bash
# Compile Dart packages to WASM
dart compile wasm package:http -o http.wasm

# Generates:
# - http.wasm (runtime)
# - http.mjs (JS loader)
```

### Bridge Communication Pattern
```javascript
// JS → Dart call
const result = await dartRuntime.invoke('package:http', 'get', ['https://api.example.com']);

// Dart → JS callback (for async operations)
dartRuntime.registerCallback('http_response', (data) => {
  // Update JS UI with response
  updateWidget(data);
});
```

### Package Loading Strategy
```
1. Parse user imports
   └─> import 'package:crypto/crypto.dart'

2. Check if package needs WASM
   └─> Check manifest: crypto → WASM ✓

3. Load from CDN
   └─> https://cdn.flutterjs.dev/packages/crypto/1.0.0/crypto.wasm

4. Initialize in WASM runtime
   └─> dartRuntime.loadPackage('crypto')

5. Bridge is ready
   └─> User code can call crypto functions
```

## Benefits Over Current Approach

### Maintenance
- ❌ Before: Fix every package manually (infinite work)
- ✅ After: Dart packages "just work" (Google maintains runtime)

### Compatibility
- ❌ Before: Dart semantics broken in JS (null checks, async, etc.)
- ✅ After: Perfect Dart semantics (actual Dart runtime)

### Ecosystem Access
- ❌ Before: Limited to manually ported packages
- ✅ After: All 30,000+ pub.dev packages available

### Development Speed
- ❌ Before: 2 months fixing packages, no end in sight
- ✅ After: Focus on your unique value (widget rendering, DX)

## What You Keep From Current Work

✅ **FlutterJS Compiler** - Still compiles user app code to JS
✅ **Widget System** - Still renders to DOM
✅ **Build Pipeline** - Enhanced with WASM loading
✅ **Dev Tools** - Hot reload, debugging, etc.

**You DON'T throw away your work** - you're just delegating package execution to the proper runtime!

## Proof That This Works

### Flutter Web Does This!
Flutter's official web target uses a similar approach:
- CanvasKit renderer (C++ → WASM)
- Dart code → dart2js OR dart2wasm
- Hybrid approach for best performance

### Other Successful Examples
- **Pyodide**: Python in browser (CPython → WASM)
- **Ruby.wasm**: Ruby in browser
- **Blazor**: .NET in browser (CoreCLR → WASM)

## Next Steps (Immediate)

### This Week
1. **Stop** fixing individual package issues (path, source_span, etc.)
2. **Research** dart2wasm integration
3. **Prototype** minimal bridge (1 package in WASM)
4. **Measure** performance overhead

### Questions to Answer
- [ ] What's the WASM bundle size for dart runtime?
- [ ] Can we strip unused dart:* libraries?
- [ ] What's the bridge call overhead? (<10ms is acceptable)
- [ ] Can we pre-compile popular packages?
- [ ] How do we handle dart:html? (Already in browser, might not need)

## Conclusion

You spent 2 months learning what DOESN'T work. That's not wasted time - that's valuable knowledge.

**The insight you just had is correct**: Don't fight Dart semantics in JavaScript. Use actual Dart for packages, use JS for what JS is good at (DOM rendering, your custom widget system).

This hybrid approach is:
- **Technically proven** (Flutter Web, Pyodide, etc.)
- **Maintainable** (leverage Google's Dart team)
- **Scalable** (access entire pub.dev ecosystem)
- **Realistic** (achievable in 2-3 months)

Your FlutterJS vision is still achievable - you just need the right architecture!
