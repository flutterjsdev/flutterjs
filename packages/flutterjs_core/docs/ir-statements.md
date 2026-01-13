# IR Statement Models

All statement types in FlutterJS Core IR.

---

## Variable Declaration

```dart
VariableDeclarationStmtIR(
  name: 'count',
  type: NamedTypeIR('int'),
  initializer: LiteralExpressionIR(0),
  isFinal: false,
)
```

---

## Expression Statement

```dart
ExpressionStmtIR(
  expression: MethodCallExpressionIR(...),
)
```

---

## Return Statement

```dart
ReturnStmtIR(
  value: IdentifierExpressionIR('result'),
)
```

---

## If Statement

```dart
IfStmtIR(
  condition: BinaryExpressionIR(...),
  thenBranch: BlockStmtIR(...),
  elseBranch: BlockStmtIR(...),
)
```

---

## For Loop

```dart
ForStmtIR(
  initialization: VariableDeclarationStmtIR(...),
  condition: BinaryExpressionIR(...),
  update: ExpressionStmtIR(...),
  body: BlockStmtIR(...),
)
```

---

## While Loop

```dart
WhileStmtIR(
  condition: BinaryExpressionIR(...),
  body: BlockStmtIR(...),
)
```

---

## Block Statement

```dart
BlockStmtIR(
  statements: [
    VariableDeclarationStmtIR(...),
    ReturnStmtIR(...),
  ],
)
```

---

## See Also

- [IR System Overview](ir-system-overview.md)
- [Analysis Passes](analysis-passes.md)
