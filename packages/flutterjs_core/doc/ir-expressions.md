# IR Expression Models

All expression types in FlutterJS Core IR.

---

## Literal Expressions

```dart
LiteralExpressionIR(42)              // int
LiteralExpressionIR('hello')         // String
LiteralExpressionIR(true)            // bool
LiteralExpressionIR(3.14)            // double
LiteralExpressionIR(null)            // null
```

---

## Identifier Expressions

```dart
IdentifierExpressionIR('count')      // Variable reference
IdentifierExpressionIR('MyClass')    // Class reference
```

---

## Method Call Expressions

```dart
MethodCallExpressionIR(
  receiver: IdentifierExpressionIR('obj'),
  methodName: 'toString',
  arguments: [],
)
```

---

## Instance Creation

```dart
InstanceCreationExpressionIR(
  type: NamedTypeIR('Text'),
  arguments: [LiteralExpressionIR('Hello')],
  namedArguments: {},
)
```

---

## Binary Expressions

```dart
BinaryExpressionIR(
  left: IdentifierExpressionIR('a'),
  operator: '+',
  right: IdentifierExpressionIR('b'),
) // a + b
```

**Operators**: `+`, `-`, `*`, `/`, `==`, `!=`, `<`, `>`, `<=`, `>=`, `&&`, `||`

---

## Collection Literals

```dart
// List
ListLiteralExpressionIR([
  LiteralExpressionIR(1),
  LiteralExpressionIR(2),
])

// Map
MapLiteralExpressionIR({
  LiteralExpressionIR('key'): LiteralExpressionIR('value'),
})
```

---

## See Also

- [IR System Overview](ir-system-overview.md)
- [Analysis Passes](analysis-passes.md)
