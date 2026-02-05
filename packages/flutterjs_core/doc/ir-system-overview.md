# IR System Overview

Understanding the Intermediate Representation (IR) system in FlutterJS Core.

---

## What is IR?

**Intermediate Representation (IR)** is a structured, language-independent representation of code that sits between the source language (Dart) and the target language (JavaScript).

```
Dart Source Code → Dart AST → IR → JavaScript Code
```

---

## Why Use IR?

### 1. **Abstraction**
- Decouples Dart-specific constructs from JavaScript generation
- Allows multiple code generation backends
- Easier to reason about than raw AST

### 2. **Optimization**
- IR can be optimized independently
- Dead code elimination
- Constant folding
- Simplification passes

### 3. **Validation**
- Check for unsupported patterns
- Type checking
- Semantic validation

### 4. **Serialization**
- IR can be serialized to binary format
- Enables caching and incremental builds
- Efficient storage and transmission

---

## IR Design Principles

### 1. Immutability

All IR nodes are immutable:

```dart
// ❌ Bad: Modifying IR
widgetIR.name = 'NewName';

// ✅ Good: Creating new IR
final newWidgetIR = widgetIR.copyWith(name: 'NewName');
```

### 2. Type Safety

IR is strongly typed:

```dart
// Every expression knows its type
ExpressionIR expr = ...;
TypeIR exprType = expr.resultType;
```

### 3. Complete Information

IR contains all information needed for code generation:

```dart
class MethodDeclIR {
  final String name;
  final TypeIR returnType;
  final List<ParameterIR> parameters;
  final List<StatementIR> body;
  final bool isAsync;
  final bool isStatic;
  final SourceLocation location;  // For error reporting
}
```

### 4. Semantic Correctness

IR represents semantically valid code:

```dart
// AST might have syntax errors
// IR represents only valid, semantically correct code
```

---

## IR Type Hierarchy

```
BaseIR (abstract)
├── DeclarationIR (abstract)
│   ├── ClassDeclIR
│   ├── MethodDeclIR
│   ├── FieldDeclIR
│   ├── ConstructorDeclIR
│   └── ParameterIR
│
├── StatementIR (abstract)
│   ├── VariableDeclarationStmtIR
│   ├── ExpressionStmtIR
│   ├── ReturnStmtIR
│   ├── IfStmtIR
│   ├── ForStmtIR
│   ├── WhileStmtIR
│   └── BlockStmtIR
│
├── ExpressionIR (abstract)
│   ├── LiteralExpressionIR
│   ├── IdentifierExpressionIR
│   ├── MethodCallExpressionIR
│   ├── InstanceCreationExpressionIR
│   ├── BinaryExpressionIR
│   ├── UnaryExpressionIR
│   ├── ConditionalExpressionIR
│   ├── CascadeExpressionIR
│   ├── ListLiteralExpressionIR
│   └── MapLiteralExpressionIR
│
├── TypeIR (abstract)
│   ├── NamedTypeIR
│   ├── GenericTypeIR
│   ├── FunctionTypeIR
│   ├── VoidTypeIR
│   └── DynamicTypeIR
│
└── WidgetIR (Flutter-specific)
    ├── WidgetDeclIR
    ├── StateClassIR
    └── BuildMethodIR
```

---

## IR Structure Example

### Dart Code

```dart
class Counter extends StatelessWidget {
  final int count;
  
  Counter({required this.count});
  
  @override
  Widget build(BuildContext context) {
    return Text('Count: $count');
  }
}
```

### Corresponding IR

```dart
ClassDeclIR(
  name: 'Counter',
  superClass: 'StatelessWidget',
  fields: [
    FieldDeclIR(
      name: 'count',
      type: NamedTypeIR('int'),
      isFinal: true,
    ),
  ],
  constructors: [
    ConstructorDeclIR(
      parameters: [
        ParameterIR(
          name: 'count',
          type: NamedTypeIR('int'),
          isRequired: true,
          isNamed: true,
        ),
      ],
    ),
  ],
  methods: [
    MethodDeclIR(
      name: 'build',
      returnType: NamedTypeIR('Widget'),
      isOverride: true,
      parameters: [
        ParameterIR(
          name: 'context',
          type: NamedTypeIR('BuildContext'),
        ),
      ],
      body: [
        ReturnStmtIR(
          value: InstanceCreationExpressionIR(
            type: NamedTypeIR('Text'),
            arguments: [
              BinaryExpressionIR(
                left: LiteralExpressionIR('Count: '),
                operator: '+',
                right: IdentifierExpressionIR('count'),
              ),
            ],
          ),
        ),
      ],
    ),
  ],
)
```

---

## IR Serialization Format

IR can be serialized to a compact binary format for caching.

### Binary Format Structure

```
File IR Binary Format:
├── Header (magic number, version)
├── String Table (all strings used in IR)
├── Type Table (all types referenced)
├── Declarations
│   ├── Classes
│   ├── Methods
│   └── Fields
├── Statements
└── Expressions
```

### String Table

All strings are deduplicated:

```
String Table:
[0] "Counter"
[1] "StatelessWidget"
[2] "count"
[3] "int"
[4] "build"
[5] "Widget"
[6] "context"
[7] "BuildContext"
[8] "Count: "
```

Then IR references strings by index:

```dart
ClassDeclIR {
  nameRef: 0,  // "Counter"
  superClassRef: 1,  // "StatelessWidget"
  // ...
}
```

---

## IR Validation

IR must be validated before code generation:

### Validation Checks

1. **Type Consistency**
   - Method return types match
   - Parameter types are valid
   - Expression types are compatible

2. **Widget Structure**
   - Widgets extend proper base class
   - build() method exists
   - Proper override annotations

3. **Control Flow**
   - All code paths return values
   - No unreachable code
   - Break/continue used correctly

4. **Semantic Rules**
   - No duplicate field names
   - No invalid widget nesting
   - Proper async/await usage

---

## IR Optimization

IR can be optimized before code generation:

### Common Optimizations

1. **Constant Folding**
   ```dart
   // Before
   BinaryExpressionIR(
     left: LiteralExpressionIR(2),
     operator: '+',
     right: LiteralExpressionIR(3),
   )
   
   // After
   LiteralExpressionIR(5)
   ```

2. **Dead Code Elimination**
   ```dart
   // Before
   if (false) { /* code */ }
   
   // After
   // (removed)
   ```

3. **Widget Tree Flattening**
   ```dart
   // Before
   Container(child: Container(child: Text('Hi')))
   
   // After
   Container(child: Text('Hi'))
   ```

---

## Working with IR

### Creating IR

```dart
// Manual construction
final widgetIR = WidgetIR(
  name: 'MyWidget',
  type: WidgetType.stateless,
  buildMethod: buildMethodIR,
);

// From Dart AST
final declarationPass = DeclarationPass();
final widgetIR = declarationPass.extractWidget(classNode);
```

### Traversing IR

```dart
// Visitor pattern
class MyIRVisitor extends IRVisitor {
  @override
  void visitMethod(MethodDeclIR method) {
    print('Method: ${method.name}');
    super.visitMethod(method);
  }
  
  @override
  void visitExpression(ExpressionIR expr) {
    if (expr is MethodCallExpressionIR) {
      print('Call: ${expr.methodName}');
    }
    super.visitExpression(expr);
  }
}

// Use
final visitor = MyIRVisitor();
visitor.visit(fileIR);
```

### Transforming IR

```dart
// Create transformer
class ConstantFolder extends IRTransformer {
  @override
  ExpressionIR transformExpression(ExpressionIR expr) {
    if (expr is BinaryExpressionIR) {
      if (expr.left is LiteralExpressionIR &&
          expr.right is LiteralExpressionIR) {
        // Fold constants
        return evaluateConstant(expr);
      }
    }
    return super.transformExpression(expr);
  }
}

// Use
final folder = ConstantFolder();
final optimizedIR = folder.transform(fileIR);
```

---

## Best Practices

### 1. Always Validate

```dart
final validationPass = ValidationPass();
final errors = validationPass.validate(fileIR);
if (errors.isNotEmpty) {
  throw ValidationException(errors);
}
```

### 2. Use Type Information

```dart
// Leverage type information for optimizations
if (expr.resultType is VoidTypeIR) {
  // Don't generate return value handling
}
```

### 3. Preserve Source Locations

```dart
// Always include source locations for error reporting
final methodIR = MethodDeclIR(
  name: 'foo',
  sourceLocation: SourceLocation(
    file: 'main.dart',
    line: 42,
    column: 5,
  ),
);
```

### 4. Document IR Extensions

```dart
/// Custom IR for platform-specific widgets
/// 
/// Example:
/// ```dart
/// PlatformWidgetIR(
///   iosWidget: CupertinoButton(...),
///   androidWidget: MaterialButton(...),
/// )
/// ```
class PlatformWidgetIR extends WidgetIR {
  final WidgetIR iosWidget;
  final WidgetIR androidWidget;
  // ...
}
```

---

## Future Enhancements

- [ ] Pattern matching IR
- [ ] Record type IR
- [ ] Sealed class IR
- [ ] Extension method IR
- [ ] Null safety improvements
- [ ] Better error recovery

---

## See Also

- [Analysis Passes](analysis-passes.md)
- [IR Declarations](ir-declarations.md)
- [IR Expressions](ir-expressions.md)
- [Widget IR](ir-widgets.md)
