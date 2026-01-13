# IR Declaration Models

Class, method, and field declaration IR models.

---

## ClassDeclIR

Represents a class declaration.

```dart
class ClassDeclIR {
  final String name;
  final String? superClass;
  final List<String> interfaces;
  final List<String> mixins;
  final List<FieldDeclIR> fields;
  final List<MethodDeclIR> methods;
  final List<ConstructorDeclIR> constructors;
  final bool isAbstract;
  final SourceLocation sourceLocation;
}
```

---

## MethodDeclIR

Represents a method declaration.

```dart
class MethodDeclIR {
  final String name;
  final TypeIR returnType;
  final List<ParameterIR> parameters;
  final List<StatementIR> body;
  final bool isAsync;
  final bool isStatic;
  final bool isOverride;
  final SourceLocation sourceLocation;
}
```

---

## FieldDeclIR

Represents a field declaration.

```dart
class FieldDeclIR {
  final String name;
  final TypeIR type;
  final ExpressionIR? initializer;
  final bool isFinal;
  final bool isStatic;
  final bool isConst;
  final SourceLocation sourceLocation;
}
```

---

## See Also

- [IR System Overview](ir-system-overview.md)
- [Analysis Passes](analysis-passes.md)
