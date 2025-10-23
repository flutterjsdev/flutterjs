# Common Flutter SDK Architecture Mistakes to Avoid

## 1. ❌ Circular Dependencies Between Packages

**The Mistake:**
```yaml
# packages/engine/pubspec.yaml
dependencies:
  cli:
    path: ../cli

# packages/cli/pubspec.yaml
dependencies:
  engine:
    path: ../engine
```

**Why it's bad:**
- Creates circular imports that break the build
- Can't test either package independently
- Hard to publish packages to pub.dev
- Violates dependency inversion principle

**✅ Solution:**
```yaml
# Dependency flow should be one-way:
# cli → engine → dev_utils → (nothing)

# cli depends on engine
# engine depends on dev_utils
# dev_utils depends on nothing (or only external packages)
```

**The Graph:**
```
cli
 ↓
engine
 ↓
dev_utils
 ↓
(external: args, path, etc.)
```

---

## 2. ❌ Mixing Internal (src/) with Public API

**The Mistake:**
```dart
// lib/engine.dart - public API
export 'src/analyzer/analyzer.dart';
export 'src/analyzer/models/internal_model.dart';
export 'src/parser/parser_impl.dart';  // Implementation detail!
export 'src/core/private_helper.dart'; // Should be internal!

// Now users depend on implementation details
// Can't refactor without breaking external code
```

**Why it's bad:**
- Users depend on implementation details
- Can't refactor internals without breaking external code
- Makes the public API too large and confusing
- Hard to maintain versioning

**✅ Solution:**
```dart
// lib/engine.dart - carefully curated public API
export 'src/analyzer/analyzer.dart';      // Main class ✓
export 'src/parser/parser.dart';          // Main class ✓
export 'src/core/types.dart';             // Public types ✓
export 'src/core/exceptions.dart';        // Public exceptions ✓

// DON'T export:
// - Internal models
// - Implementation classes (ParserImpl, AnalyzerImpl)
// - Private helper classes
// - Temporary/debug utilities
```

---

## 3. ❌ No Clear Dependency Layers

**The Mistake:**
```
packages/
├── engine/
│   ├── analyzer/
│   ├── parser/
│   ├── ir/
│   └── passes/
    # Everything imports everything
    # No clear hierarchy
```

**Why it's bad:**
- Hard to understand data flow
- Easy to create accidental circular imports
- Difficult to test components in isolation
- Refactoring becomes risky

**✅ Solution:**
```
packages/engine/lib/src/

Layer 1 (Foundation - no dependencies within engine):
├── core/
│   ├── types.dart        (fundamental types)
│   ├── exceptions.dart   (all exceptions)
│   └── constants.dart

Layer 2 (Parsing - depends on Layer 1):
├── parser/
│   ├── parser.dart
│   ├── tokenizer.dart
│   └── models/

Layer 3 (IR/AST - depends on Layers 1-2):
├── ir/
│   ├── ast.dart
│   └── visitor.dart

Layer 4 (Analysis - depends on Layers 1-3):
├── analyzer/
│   ├── analyzer.dart
│   └── models/

Layer 5 (Passes - depends on Layers 1-4):
├── passes/
│   ├── declaration_pass.dart
│   ├── flow_analysis_pass.dart
│   └── type_inference_pass.dart

Layer 6 (Code Generation - depends on all):
└── code_gen/
    ├── generator.dart
    └── emitters/
```

**Import rules:**
```dart
// ✓ Allowed (going down layers)
// code_gen imports from passes, analyzer, ir, parser, core

// ✓ Allowed (same layer)
// analyzer can import other analyzers

// ❌ NOT allowed (going up layers)
// core should never import from parser
// parser should never import from analyzer
// analyzer should never import from code_gen
```

---

## 4. ❌ Bloated or Missing README.md Files

**The Mistake:**
```markdown
# Engine

It's an engine.
```

**Why it's bad:**
- New contributors don't understand the package
- No clear entry points
- No guidance on what's public vs internal
- Hard to maintain over time

**✅ Solution:**
```markdown
# Engine Package

Core analysis and code generation engine.

## Architecture

- **Parser**: Tokenizes and parses Dart files
- **IR**: Intermediate representation (AST)
- **Analyzer**: Performs type analysis and symbol resolution
- **Passes**: Compilation passes (declaration, flow analysis, validation)
- **CodeGen**: Code generation from IR

## Data Flow

```
Dart File → Parser → IR → Passes → Analyzer → CodeGen → Output
```

## Public API

```dart
import 'package:engine/engine.dart';

// Analyze a project
final engine = Engine();
final result = await engine.analyze('./my_project');

// Initialize a new project
await engine.initProject(config);
```

## Internal Structure

Everything is in `src/`. The public API is defined in `engine.dart`.

## Testing

```bash
cd packages/engine
dart test
```

## Common Patterns

- Use visitor pattern for AST traversal
- Passes are composable and order-dependent
- Immutable models where possible
```

---

## 5. ❌ Test Organization Chaos

**The Mistake:**
```
packages/engine/
├── lib/
│   └── src/
│       ├── analyzer/
│       ├── parser/
│       └── passes/
└── test/
    ├── test.dart         # One giant file
    ├── all_tests.dart    # Another giant file
    └── random_test.dart  # Unorganized tests
```

**Why it's bad:**
- Hard to find tests for specific components
- Can't run subset of tests easily
- Test failures are confusing
- Maintenance nightmare

**✅ Solution:**
```
packages/engine/
├── lib/
│   └── src/
│       ├── analyzer/
│       ├── parser/
│       └── passes/
└── test/
    ├── analyzer/
    │   ├── analyzer_test.dart
    │   ├── models/
    │   │   └── analyzer_model_test.dart
    │   └── fixtures/
    │       └── sample_code.dart
    ├── parser/
    │   ├── parser_test.dart
    │   ├── tokenizer_test.dart
    │   └── fixtures/
    │       └── test_files/
    ├── passes/
    │   ├── declaration_pass_test.dart
    │   └── type_inference_pass_test.dart
    ├── integration/
    │   └── e2e_test.dart
    └── fixtures/
        └── sample_projects/
```

**Run tests:**
```bash
dart test                              # All tests
dart test test/analyzer/               # Just analyzer tests
dart test test/analyzer/analyzer_test.dart  # Single test file
```

---

## 6. ❌ No Version Pinning Strategy

**The Mistake:**
```yaml
# packages/engine/pubspec.yaml
dependencies:
  collection: ^1.17.0
  path: ^1.8.0

# packages/cli/pubspec.yaml
dependencies:
  collection: ^1.16.0  # Different version!
  path: ^1.9.0         # Different version!
```

**Why it's bad:**
- Incompatible dependency versions across packages
- Hard to debug weird issues
- CI/CD becomes unpredictable
- Users get broken combinations

**✅ Solution:**
```yaml
# Create a shared pubspec for consistent versions
# OR use constraint files

# packages/engine/pubspec.yaml
dependencies:
  collection: ^1.17.0
  path: ^1.8.0

# packages/cli/pubspec.yaml
dependencies:
  collection: ^1.17.0  # Same as engine
  path: ^1.8.0         # Same as engine
  engine:
    path: ../engine
```

---

## 7. ❌ CLI Commands Import Implementation Details

**The Mistake:**
```dart
// packages/cli/lib/src/commands/analyze_command.dart
import 'package:engine/src/analyzer/analyzer_impl.dart'; // ❌ Internal!
import 'package:engine/src/parser/internal_parser.dart'; // ❌ Internal!

class AnalyzeCommand extends Command {
  final analyzerImpl = AnalyzerImpl();  // Directly using implementation
  // ...
}
```

**Why it's bad:**
- CLI depends on internal implementation
- When engine refactors, CLI breaks
- Violates encapsulation
- Makes engine changes risky

**✅ Solution:**
```dart
// packages/cli/lib/src/commands/analyze_command.dart
import 'package:engine/engine.dart';  // ✓ Public API only

class AnalyzeCommand extends Command {
  final engine = Engine();  // Use public facade
  
  @override
  Future<void> run() async {
    final result = await engine.analyze(argResults!['path']);
    _printResults(result);
  }
}
```

---

## 8. ❌ No Clear Entry Point (Facade Pattern Missing)

**The Mistake:**
```dart
// lib/engine.dart
export 'src/analyzer/analyzer.dart';
export 'src/parser/parser.dart';
export 'src/ir/ast.dart';
export 'src/passes/all_passes.dart';
export 'src/code_gen/generator.dart';
// User has to know the order and how to use everything
```

**Why it's bad:**
- API is confusing and hard to use
- Users don't know where to start
- Easy to misuse the library
- Lots of documentation needed

**✅ Solution:**
```dart
// lib/engine.dart - Single entry point (Facade)
import 'src/analyzer/analyzer.dart';
import 'src/parser/parser.dart';
import 'src/core/types.dart';

export 'src/core/types.dart';
export 'src/core/exceptions.dart';

/// Main entry point for the engine.
/// 
/// Example:
/// ```dart
/// final engine = Engine();
/// final result = await engine.analyze('./my_project');
/// ```
class Engine {
  final _parser = Parser();
  final _analyzer = Analyzer();
  
  /// Analyze a project
  Future<AnalysisResult> analyze(String projectPath) async {
    final files = _readFiles(projectPath);
    final asts = _parser.parse(files);
    return _analyzer.analyze(asts);
  }
  
  /// Initialize a new project
  Future<void> initProject(ProjectConfig config) async {
    // orchestrate initialization
  }
}
```

---

## 9. ❌ Ignoring Analysis Options Consistency

**The Mistake:**
```
packages/engine/analysis_options.yaml
packages/cli/analysis_options.yaml
packages/dev_utils/analysis_options.yaml

All different! Some are strict, some are loose.
```

**Why it's bad:**
- Inconsistent code quality across packages
- Different lint rules in different places
- Hard to maintain code standards
- CI becomes inconsistent

**✅ Solution:**
```
project_root/
├── analysis_options.yaml    # ← Shared, strict rules
│
└── packages/
    ├── engine/
    │   ├── analysis_options.yaml  # extends ../../analysis_options.yaml
    │   └── ...
    ├── cli/
    │   ├── analysis_options.yaml  # extends ../../analysis_options.yaml
    │   └── ...
    └── dev_utils/
        ├── analysis_options.yaml  # extends ../../analysis_options.yaml
        └── ...
```

```yaml
# analysis_options.yaml (root)
include: package:lints/recommended.yaml

linter:
  rules:
    - avoid_empty_else
    - avoid_null_checks_in_equality_operators
    - prefer_const_constructors
    # ... strict rules

# packages/engine/analysis_options.yaml
include: ../../analysis_options.yaml

# (inherits all root rules, can add engine-specific ones if needed)
```

---

## 10. ❌ Not Using .gitignore Correctly

**The Mistake:**
```
# packages/engine/.gitignore (or missing entirely)
# Nothing! Committing build artifacts
```

**Why it's bad:**
- Huge repository size
- Merge conflicts on generated files
- Cluttered git history
- Slow operations

**✅ Solution:**
```
# .gitignore (root)
# Dart/Flutter
.dart_tool/
build/
*.g.dart
*.config.dart

# Tests
coverage/
.nyc_output/

# IDE
.idea/
.vscode/
*.swp
*.swo
*~
.DS_Store

# Packages
.packages
pubspec.lock  # Usually committed, depends on project
```

---

## Summary Checklist

- ✅ **One-way dependencies**: cli → engine → dev_utils → nothing
- ✅ **Clear public API**: Only export what users need
- ✅ **Layered architecture**: Foundation → intermediate → high-level
- ✅ **Good documentation**: README for each package
- ✅ **Organized tests**: Mirror src/ structure
- ✅ **Consistent versions**: Same dependencies across packages
- ✅ **CLI uses public API**: Never imports `src/`
- ✅ **Facade pattern**: Single entry point (Engine class)
- ✅ **Consistent linting**: Shared analysis_options.yaml
- ✅ **Proper .gitignore**: No build artifacts

---

## Quick Reference: What Should Go Where?

| What | Where | Why |
|------|-------|-----|
| Core types | `engine/core/types.dart` | Foundation layer |
| Exceptions | `engine/core/exceptions.dart` | Used everywhere |
| Parser | `engine/parser/` | Layer 2 (depends only on core) |
| Analyzer | `engine/analyzer/` | Layer 4 (depends on parser, ir, core) |
| Code Gen | `engine/code_gen/` | Top layer (depends on everything) |
| Passes | `engine/passes/` | Layer 5 (composition of analysis) |
| CLI Commands | `cli/commands/` | Thin UI layer, imports engine only |
| Shared Helpers | `dev_utils/` | Used by multiple packages |
| Implementation | `src/` folder | Hidden from public API |
| Tests | Mirror `src/` | Easy to find and run |