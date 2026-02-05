# Guide: Extending Analysis

How to add custom analysis passes to FlutterJS Core.

---

## Creating a Custom Pass

```dart
class MyCustomAnalysisPass {
  Future<void> execute(FileIR fileIR) async {
    // Your analysis logic
    for (final widget in fileIR.widgets) {
      _analyzeWidget(widget);
    }
  }
  
  void _analyzeWidget(WidgetIR widget) {
    // Custom widget analysis
  }
}
```

---

## Integrating with Pipeline

```dart
final pipeline = AnalysisPipeline([
  DeclarationPass(),
  SymbolResolutionPass(),
  MyCustomAnalysisPass(),  // Add here
  TypeInferencePass(),
  ValidationPass(),
]);

await pipeline.execute(ast, fileIR);
```

---

## Example: Performance Analysis

```dart
class PerformanceAnalysisPass {
  final List<PerformanceWarning> warnings = [];
  
  Future<void> execute(FileIR fileIR) async {
    for (final method in fileIR.methods) {
      _checkMethodComplexity(method);
    }
  }
  
  void _checkMethodComplexity(MethodDeclIR method) {
    final complexity = _calculateComplexity(method);
    
    if (complexity > 10) {
      warnings.add(PerformanceWarning(
        message: 'Method too complex: ${method.name}',
        location: method.sourceLocation,
      ));
    }
  }
  
  int _calculateComplexity(MethodDeclIR method) {
    // Calculate cyclomatic complexity
    int edgeCount = 0;
    // ... complexity calculation
    return edgeCount;
  }
}
```

---

## See Also

- [Analysis Passes](analysis-passes.md)
- [IR System Overview](ir-system-overview.md)
