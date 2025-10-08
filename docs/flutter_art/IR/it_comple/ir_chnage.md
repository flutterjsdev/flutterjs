Based on the files you provided, here are the classes affected by the single-pass analysis issue:

## 📁 **impliemntion.md** (implementation.md)

### Affected Classes:
1. **`ProjectAnalyzer`** - Main culprit, analyzes all files at once
2. **`FlutterASTVisitor`** - Tries to resolve everything in one pass
3. **`WidgetExtractor`** - Extracts widgets without dependency context
4. **`IRBuilder`** - Builds entire IR in memory without phasing

## 📁 **ir_main_part1.md**

### Affected Classes:
1. **`ComprehensiveFlutterVisitor`** - Single recursive traversal approach
2. **`FlutterAppIR`** - Holds ALL data (widgets, states, providers) together
3. **`DependencyGraphIR`** - Built after the fact, not used for ordering

## 📁 **Binary Format.md**

### Affected Classes:
1. **`BinaryIRWriter`** - Writes entire app IR at once
2. **`BinaryIRReader`** - Reads entire IR into memory
3. **`_collectStringsAndTypes()`** method - Traverses entire IR tree

## 🎯 Core Problem Classes (Priority Order)

1. **`ProjectAnalyzer`** ⚠️ CRITICAL
2. **`FlutterASTVisitor`** / **`ComprehensiveFlutterVisitor`** ⚠️ CRITICAL
3. **`IRBuilder`** ⚠️ HIGH
4. **`DependencyGraphIR`** ⚠️ HIGH
5. **`FlutterAppIR`** ⚠️ MEDIUM
6. **`BinaryIRWriter`** / **`BinaryIRReader`** ⚠️ MEDIUM
7. **`WidgetExtractor`** ⚠️ MEDIUM

## 📊 Impact Summary

| Class | Issue | Impact |
|-------|-------|--------|
| `ProjectAnalyzer` | Loads all files at once | Memory explosion |
| `FlutterASTVisitor` | No type context | Type resolution failures |
| `IRBuilder` | Monolithic IR generation | Can't handle circular deps |
| `DependencyGraphIR` | Post-analysis only | Wrong analysis order |
| `FlutterAppIR` | Single massive structure | No incremental builds |
| `BinaryIRWriter` | All-or-nothing serialization | Slow, memory-heavy |
| `WidgetExtractor` | No dependency awareness | Missing cross-file refs |

These classes need to be **refactored into multi-pass architecture** with:
- Dependency resolver (new)
- Type registry (new)
- Per-file IR generator (refactor existing)
- IR linker (new)
- Incremental cache manager (new)