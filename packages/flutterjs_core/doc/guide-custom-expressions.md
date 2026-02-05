# Guide: Custom Expression Types

How to add support for new expression patterns in FlutterJS Core.

---

## Creating a Custom Expression IR

```dart
class MyCustomExpressionIR extends ExpressionIR {
  final String customProperty;
  final ExpressionIR child;
  
  MyCustomExpressionIR({
    required this.customProperty,
    required this.child,
    required SourceLocation sourceLocation,
  }) : super(sourceLocation: sourceLocation);
  
  @override
  TypeIR get resultType => child.resultType;
  
  @override
  Map<String, dynamic> toJson() {
    return {
      'type': 'CustomExpression',
      'customProperty': customProperty,
      'child': child.toJson(),
    };
  }
}
```

---

## Extracting from AST

```dart
class ExpressionExtractionPass {
  ExpressionIR extractExpression(Expression node) {
    if (node is MyCustomExpressionAst) {
      return _extractMyCustomExpression(node);
    }
    // ... other expression types
  }
  
  MyCustomExpressionIR _extractMyCustomExpression(
    MyCustomExpressionAst node,
  ) {
    return MyCustomExpressionIR(
      customProperty: node.property,
      child: extractExpression(node.child),
      sourceLocation: _getLocation(node),
    );
  }
}
```

---

## Type Inference

```dart
class TypeInferencePass {
  TypeIR inferType(ExpressionIR expr) {
    if (expr is MyCustomExpressionIR) {
      return _inferCustomExpression(expr);
    }
    // ... other expression types
  }
  
  TypeIR _inferCustomExpression(MyCustomExpressionIR expr) {
    // Infer type based on custom logic
    return expr.child.resultType;
  }
}
```

---

## Validation

```dart
class ValidationPass {
  List<DiagnosticMessage> validateExpression(ExpressionIR expr) {
    if (expr is MyCustomExpressionIR) {
      return _validateCustomExpression(expr);
    }
    return [];
  }
  
  List<DiagnosticMessage> _validateCustomExpression(
    MyCustomExpressionIR expr,
  ) {
    final errors = <DiagnosticMessage>[];
    
    if (expr.customProperty.isEmpty) {
      errors.add(DiagnosticMessage(
        severity: DiagnosticSeverity.error,
        message: 'Custom property cannot be empty',
        location: expr.sourceLocation,
      ));
    }
    
    return errors;
  }
}
```

---

## See Also

- [IR Expressions](ir-expressions.md)
- [Analysis Passes](analysis-passes.md)
