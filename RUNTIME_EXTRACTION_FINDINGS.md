# Runtime Extraction Findings

## Experiment Results

### What We Did
1. Created `tools/extract_runtime.dart` to extract dart2js runtime
2. Compiled minimal Dart program with dart2js
3. Extracted runtime components (setup, helpers, type system)
4. Analyzed both minified and unminified output

### Key Findings

#### Size Comparison
| Version | Size | Lines | Notes |
|---------|------|-------|-------|
| **dart2js minified (O4)** | 73.3 KB | 2,758 | Heavily mangled, unreadable |
| **dart2js unminified (O0)** | 491.0 KB | 8,350 | Readable but huge |
| **Our manual dart:core** | 107 KB | ~500 | Clean, modular ES6 code |

#### Runtime Breakdown (Unminified)
- Setup code: 0 KB (wrapped in IIFE)
- Helper functions: 0 KB (inline)
- Type system: 205.7 KB (42% of output!)
- User code: 285.3 KB (58%)

### Critical Insight: Why NOT to Extract dart2js Runtime

#### 1. **Whole-Program Compilation Philosophy**
dart2js is designed for whole-program compilation:
- Class names are mangled (`aH`, `aK`, `a7`)
- Code is heavily inlined and optimized
- Type information is encoded in complex runtime structures
- No clear module boundaries

#### 2. **What's Actually in the Runtime**
The "runtime" includes:
- **Interceptors**: JS type wrappers (JSString, JSArray, JSNumber)
- **Type System**: Complex runtime type checking (Rti structures)
- **Internal Machinery**: TearOff closures, lazy initialization, late variables
- **dart:core internals**: Private implementations (_Future, _Completer, _StreamController)

#### 3. **Not Designed for Modular Use**
- dart2js runtime expects to be the ONLY runtime
- Uses global state (`v.types`, `v.isolateTag`, `$.O`)
- Not compatible with ES6 modules
- Can't be imported piece by piece

### What We SHOULD Extract from dart2js

Instead of extracting the full runtime, we should:

#### ✅ Extract Individual Class Implementations
Compile single-class programs and extract the implementation:

```bash
# Extract Future implementation
cat > test_future.dart <<EOF
import 'dart:async';
void main() {
  Future.value(42);
}
EOF

dart compile js --csp --no-minify -o future.js test_future.dart
# Parse future.js to find _Future class implementation
```

#### ✅ Extract Specific Algorithms
For complex operations like:
- DateTime parsing (ISO 8601, RFC 3339)
- RegExp compilation
- JSON encoding/decoding
- UTF-8 string handling

#### ✅ Learn Semantics, Not Code
Use dart2js output as **reference** for:
- Correct null handling
- Type coercion rules
- Edge cases
- Performance patterns

## Recommended Path Forward

### Phase 1: Keep Manual dart:core (Current Approach) ✅
- **Why**: Clean, modular, maintainable
- **What**: Continue implementing dart:core classes manually
- **Benefit**: 107KB vs 491KB unminified

### Phase 2: Use Kernel Compilation for Packages
Instead of extracting dart2js runtime, use **Kernel compilation** for better type info:

```dart
// Compile Dart → Kernel
final compiler = KernelCompiler();
final component = await compiler.compileToKernel(
  'lib/main.dart',
  '.dart_tool/package_config.json',
);

// Parse kernel → Your IR
final converter = KernelToIRConverter();
final dartFile = converter.convertComponent(component, 'package:http');

// Generate modular JavaScript
final jsGenerator = JSGenerator();
final code = jsGenerator.generatePackageCode(dartFile);
```

**Benefits**:
- Perfect type resolution (from Dart's CFE)
- No need to parse Dart AST ourselves
- Can cache .dill files (packages are immutable)
- Type information already resolved

### Phase 3: Reference dart2js for Correctness
When implementing complex dart:core classes:
1. Write manual implementation
2. Compile test program with dart2js
3. Compare behavior and fix edge cases
4. Keep manual implementation (don't copy dart2js code)

## File Size Targets

### Goal: 1MB Less Than Flutter

**Current Flutter Web** (estimated):
- Runtime: ~200 KB (minified)
- Framework: ~300 KB
- App code: ~500 KB
- **Total**: ~1 MB base size

**FlutterJS Target**:
- Runtime (dart:core): 30 KB (minified from 107 KB)
- Framework: 100 KB (tree-shaken)
- App code: Variable
- **Total Base**: ~130 KB (87% reduction!)

### How to Achieve This

1. **Minify dart:core implementations**
   ```bash
   cd packages/flutterjs_dart
   node build.js --minify
   ```

2. **Tree-shake unused classes**
   - Only include dart:core classes actually used
   - Generate imports based on usage analysis

3. **Use kernel compilation for better optimization**
   - Constant folding at compile time
   - Dead code elimination
   - Type-based optimizations

4. **Modular architecture**
   - Each package is separate module
   - Shared runtime imported once
   - No duplication across packages

## Conclusion

**DO NOT** try to extract and use dart2js runtime wholesale. Instead:

1. ✅ Keep manual dart:core implementations (cleaner, modular)
2. ✅ Use kernel compilation for type resolution
3. ✅ Reference dart2js for correctness verification
4. ✅ Focus on tree-shaking and minification
5. ✅ Build modular package architecture

This approach gives us:
- **Best semantics**: Learn from dart2js
- **Best modularity**: Our custom compiler
- **Best size**: Tree-shaking + minification
- **Best maintainability**: Clean, readable code

**Next Steps**:
1. Implement KernelToIRConverter (parse .dill → DartFile IR)
2. Add tree-shaking pass to remove unused dart:core classes
3. Set up minification pipeline for final output
4. Measure actual bundle sizes vs Flutter Web
