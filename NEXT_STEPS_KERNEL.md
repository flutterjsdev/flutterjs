# Next Steps: Kernel-Based Compilation

Based on our findings from runtime extraction, here's the concrete implementation plan.

## Architecture Decision

**REJECT**: Extracting dart2js runtime wholesale
**ACCEPT**: Kernel compilation + Custom code generation

## Implementation Plan

### Week 1: Kernel → IR Converter

Create `packages/flutterjs_core/lib/src/kernel/kernel_to_ir.dart`:

```dart
import 'package:kernel/kernel.dart' as kernel;
import 'package:flutterjs_core/flutterjs_core.dart';

class KernelToIRConverter {
  /// Convert kernel Component to DartFile IR
  DartFile convertLibrary(kernel.Library library) {
    return DartFile(
      filePath: library.fileUri.toFilePath(),
      libraryUri: library.importUri.toString(),
      imports: _convertImports(library.dependencies),
      exports: _convertExports(library.additionalExports),
      classDeclarations: _convertClasses(library.classes),
      functionDeclarations: _convertProcedures(library.procedures),
      variableDeclarations: _convertFields(library.fields),
    );
  }

  List<DartImport> _convertImports(List<kernel.LibraryDependency> deps) {
    // TODO: Convert kernel imports to DartImport IR
  }

  List<ClassDecl> _convertClasses(List<kernel.Class> classes) {
    // TODO: Convert kernel classes to ClassDecl IR
  }

  ExpressionIR _convertExpression(kernel.Expression expr) {
    // TODO: Convert kernel expressions to ExpressionIR
    // This gives us perfect type information!
  }
}
```

### Week 2: Integrate Kernel into Build Pipeline

Modify `packages/flutterjs_builder/lib/src/package_compiler.dart`:

```dart
Future<CompiledPackage> compilePackage(String packagePath) async {
  // Step 1: Compile to kernel
  final kernelCompiler = KernelCompiler();
  final kernelPath = '$packagePath/.dart_tool/package.dill';

  // Check cache
  final packageConfig = '$packagePath/.dart_tool/package_config.json';
  final needsRecompile = await _needsRecompilation(packagePath, kernelPath);

  kernel.Component component;
  if (needsRecompile) {
    final result = await kernelCompiler.compileToKernel(
      entryPoint: '$packagePath/lib/main.dart',
      outputPath: kernelPath,
      packageConfigPath: packageConfig,
    );

    if (!result.success) {
      throw Exception('Kernel compilation failed: ${result.stderr}');
    }

    component = await kernelCompiler.loadKernel(kernelPath);
  } else {
    // Load cached kernel
    component = await kernelCompiler.loadKernel(kernelPath);
  }

  // Step 2: Convert kernel → IR
  final converter = KernelToIRConverter();
  final library = component.libraries.first; // Find target library
  final dartFile = converter.convertLibrary(library);

  // Step 3: Generate JavaScript (existing code)
  final pipeline = ModelToJSPipeline(packageRegistry);
  final jsCode = await pipeline.generatePackageCode(dartFile);

  return CompiledPackage(
    name: packageName,
    code: jsCode,
    exports: _extractExports(dartFile),
  );
}
```

### Week 3: Tree-Shaking dart:core

Create `packages/flutterjs_gen/lib/src/optimization/tree_shaker.dart`:

```dart
class TreeShaker {
  /// Remove unused dart:core classes from final bundle
  Set<String> analyzeUsedCoreClasses(DartFile dartFile) {
    final used = <String>{};
    final queue = Queue<String>();

    // Start with entry point
    queue.add('main');

    while (queue.isNotEmpty) {
      final symbol = queue.removeFirst();
      if (used.contains(symbol)) continue;

      used.add(symbol);

      // Find dependencies
      final deps = _findDependencies(dartFile, symbol);
      queue.addAll(deps);
    }

    return used;
  }

  /// Generate minimal dart:core import
  String generateMinimalCoreImport(Set<String> usedClasses) {
    return '''
import {
  ${usedClasses.join(',\n  ')}
} from '@flutterjs/dart/core';
''';
  }
}
```

### Week 4: Minification Pipeline

Create `packages/flutterjs_builder/lib/src/minifier.dart`:

```dart
class JSMinifier {
  /// Minify generated JavaScript
  Future<String> minify(String code, {
    bool mangle = true,
    bool compress = true,
    bool sourceMaps = false,
  }) async {
    // Option 1: Shell out to terser
    final result = await Process.run('npx', [
      'terser',
      '-',
      if (mangle) '--mangle',
      if (compress) '--compress',
    ], stdin: code);

    return result.stdout as String;

    // Option 2: Integrate with JS minifier library
    // (requires JS interop or native extension)
  }
}
```

## Testing Strategy

### Test 1: Kernel Compilation
```bash
cd packages/flutterjs_core
dart test test/kernel/kernel_compiler_test.dart
```

### Test 2: Kernel → IR Conversion
```bash
cd packages/flutterjs_core
dart test test/kernel/kernel_to_ir_test.dart
```

### Test 3: End-to-End Package Compilation
```bash
# Compile a test package
flutterjs pub-build -p package:path

# Verify output
ls -lh packages/flutterjs_registry/.cache/path/
cat packages/flutterjs_registry/.cache/path/path.js
```

### Test 4: Bundle Size Measurement
```bash
# Build example app
cd examples/flutterjs_website
flutterjs build web

# Measure sizes
du -sh dist/
ls -lh dist/main.js dist/runtime.js
```

## Success Criteria

### Phase 1 Complete When:
- ✅ Can compile Dart → Kernel
- ✅ Can parse Kernel → DartFile IR
- ✅ Type information preserved in IR
- ✅ Tests pass

### Phase 2 Complete When:
- ✅ Kernel integrated into package_compiler
- ✅ Cache working (.dill files reused)
- ✅ Compilation faster than current approach
- ✅ Generated JS equivalent to current output

### Phase 3 Complete When:
- ✅ Tree-shaking removes unused classes
- ✅ Only used dart:core classes imported
- ✅ Bundle size reduced by 30%+

### Phase 4 Complete When:
- ✅ Minification integrated
- ✅ Final bundle < 1MB for typical app
- ✅ Smaller than Flutter Web by 1MB+

## Key Files to Create

1. `packages/flutterjs_core/lib/src/kernel/kernel_to_ir.dart` - Kernel parser
2. `packages/flutterjs_core/lib/src/kernel/type_resolver.dart` - Type resolution from kernel
3. `packages/flutterjs_gen/lib/src/optimization/tree_shaker.dart` - Dead code elimination
4. `packages/flutterjs_builder/lib/src/minifier.dart` - JS minification
5. `packages/flutterjs_builder/lib/src/cache_manager.dart` - .dill caching

## Dependencies to Add

```yaml
# packages/flutterjs_core/pubspec.yaml
dependencies:
  # Kernel compilation (try without explicit versions first)
  # These should come transitively from analyzer
  # front_end:
  # kernel:
  # vm_service:
```

## Risks and Mitigations

### Risk 1: Kernel API Unstable
**Mitigation**: Pin to specific Dart SDK version, document compatibility

### Risk 2: Kernel Parsing Complex
**Mitigation**: Start with simple cases (classes, functions), expand incrementally

### Risk 3: Performance Regression
**Mitigation**: Measure at each step, cache aggressively

### Risk 4: Type Information Loss
**Mitigation**: Comprehensive tests comparing kernel types vs generated code

## Timeline

- **Week 1**: Kernel → IR converter (basic classes + functions)
- **Week 2**: Integration into build pipeline
- **Week 3**: Tree-shaking implementation
- **Week 4**: Minification + size measurement

**Total**: 1 month to working kernel-based compilation

## Definition of Done

An app compiled with the new pipeline should:
1. **Work**: All functionality identical to current compiler
2. **Faster**: Compilation time < current (thanks to caching)
3. **Smaller**: Bundle size < Flutter Web by ≥1MB
4. **Maintainable**: Type info available, better error messages

This is the path to a production-ready FlutterJS compiler that achieves "1MB less than Flutter" while being maintainable and fast.
