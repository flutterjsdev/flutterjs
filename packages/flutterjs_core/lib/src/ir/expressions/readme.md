## Expression IR Classes – Maintenance & Safety Guide (updated 2025-12-07)

### 01. ExpressionIR
**Purpose** → Abstract base class for all expression nodes — carries result type, `isConstant` flag, and JSON serialization  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Root of everything. Never remove `isConstant`, `resultType`, or `toJson()` — breaks entire pipeline

### 02. LiteralExpressionIR
**Purpose** → Base class for all literals (int, string, bool, null, list, map) with automatic constancy detection  
**Implemented in** →  
**Used in** →  ['expression_code_generator.dart'](https://github.com/flutterjsdev/flutterjs/blob/cf27c04e0a60c271a674b31eadd337ebe110c14a/packages/flutterjs_gen/lib/src/code_generation/expression/expression_code_generator.dart)

**Last change** → 2025-12-07  
**Before pushing / PR** → Critical for `const` widget detection — run all const-folding tests

### 03. IdentifierExpressionIR
**Purpose** → Simple identifier reference: variable, function, enum value, `this`, `super`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Run scope resolution + `this.` context tests

### 04. BinaryExpressionIR
**Purpose** → Binary operations: `+`, `&&`, `==`, `>`, etc. with left/right operands and const propagation  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Test precedence and folding: `true && false`, `2 + 3`

### 05. UnaryExpressionIR
**Purpose** → Unary ops: `!`, `-`, `++`, `--` (prefix/postfix)  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Test in keys and conditions — affects uniqueness

### 06. MethodCallExpressionIR
**Purpose** → Method call: `obj.method()`, `obj?.method()`, with args, named args, cascades  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Very hot path — test `setState`, `notifyListeners`, `push`

### 07. PropertyAccessExpressionIR
**Purpose** → Property access: `obj.prop`, `obj?.prop`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Test null-aware access in build methods

### 08. IndexAccessExpressionIR
**Purpose** → `list[0]`, `map['key']`, `obj?[index]`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Test null-aware indexing

### 09. ConstructorCallExpressionIR
**Purpose** → General constructor call: `new Class()`, `const Class()`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Foundation for Flutter widgets — run const constructor tests

### 10. FlutterWidgetConstructorIR
**Purpose** → The single most important class — full Flutter widget instantiation with type, key, child, properties  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → ABSOLUTE CORE — run ALL 300+ golden widget tests. Do not break detection

### 11. WidgetPropertyIR
**Purpose** → One named property on a widget: `child:`, `padding:`, `onTap:`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Run hot-reload diffing and property change detection

### 12. NamedArgumentIR
**Purpose** → Named parameter in call: `name: value`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Used heavily in widget constructors — test ordering and defaults

### 13. FunctionExpressionIR
**Purpose**Purpose** → Anonymous function / lambda: `() => ...`, `(x) { ... }`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Must walk inside closures — run `builder:`, `onPressed:` tests

### 14. ConditionalExpressionIR
**Purpose** → Ternary: `condition ? a : b`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Both branches must be scanned — no missing widgets

### 15. ListExpressionIR
**Purpose** → List literal: `[widget1, widget2]` or `const [...]`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Critical for `children:` — test const lists and keys

### 16. MapExpressionIR
**Purpose** → Map literal: `{ 'key': widget }`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**  
**Before pushing / PR** → Test const maps in widget properties

### 17. SetExpressionIR
**Purpose** → Set literal: `<Widget>{w1, w2}`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Rarely used in UI — safe

### 18. CastExpressionIR
**Purpose** → Type cast: `expr as Type`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Safe

### 19. IsExpressionIR
**Purpose** → Type check: `expr is Type`, `expr is! Type`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Safe — used in conditions

### 20. CascadeSection
**Purpose** → Single part of cascade: `..method()` or `..prop = x`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Works with CascadeExpressionIR — test full `widget..prop..method()` chains
### 21. LambdaExpr
**Purpose** → Arrow functions and lambdas: `() => ...`, `(x) => x * 2`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Must deeply analyze body — run all `builder:`, `onTap:`, `itemBuilder:` tests

### 22. AwaitExpr
**Purpose** → `await future` expression in async contexts  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Critical for FutureBuilder auto-detection — run async widget tests

### 23. ThrowExpr
**Purpose** → `throw` used as expression (rare, but valid in ternaries)  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Safe — does not produce widgets

### 24. CastExpr
**Purpose** → Type cast variant: `expr as Type (alternative to CastExpressionIR)  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Prefer CastExpressionIR — this is legacy/parser-specific

### 25. TypeCheckExpr
**Purpose** → `expr is Type` / `expr is! Type` (alternative to IsExpressionIR)  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Prefer IsExpressionIR — keep for compatibility

### 26. CascadeExpressionIR
**Purpose** → Full cascade chain: `widget..padding()..onTap()..child = x`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Extremely common in Flutter — test full cascade chains thoroughly

### 27. NullAwareAccessExpressionIR
**Purpose** → Null-aware operators: `obj?.prop`, `obj?.method()`, `list?[0]`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Test null-safety paths in build methods

### 28. NullCoalescingExpressionIR
**Purpose** → `??` operator: `value ?? fallback`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Safe — test fallback contains widgets

### 29. InstanceCreationExpressionIR
**Purpose** → General object creation: `new Class()` or `Class()` — base for constructors  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Overlaps with ConstructorCallExpressionIR — prefer that one

### 30. CompoundAssignmentExpressionIR
**Purpose** → Compound assignments: `+=`, `-=`, `??=`, etc.  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Affects state mutation tracking — run rebuild analyzer tests

### 31. StringInterpolationExpressionIR
**Purpose** → `'Hello $name, you have ${widget}'` — mixes text + expressions  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Must extract widgets inside `${}` when used in Text()

### 32. ThisExpressionIR
**Purpose** → The `this` keyword inside instance methods  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Critical for correct BuildContext lookup

### 33. SuperExpressionIR
**Purpose** → The `super` keyword  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Safe

### 34. ParenthesizedExpressionIR
**Purpose** → `(expression)` — only affects precedence  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Safe wrapper — no logic

### 35. AssignmentExpressionIR
**Purpose** → Simple assignment: `x = value`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Run state mutation and rebuild detection tests

### 36. StringInterpolationPart
**Purpose** → Single part inside interpolation: either literal text or embedded expression  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Internal — only used by StringInterpolationExpressionIR

### 37. EnumMemberAccessExpressionIR
**Purpose** → Enum access: `.center` or `Alignment.center`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Test both shorthand and qualified forms

### 38. MethodCallExpr
**Purpose** → Alternative/simplified method call node (used in some parser paths)  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Prefer MethodCallExpressionIR — this is legacy

### 39. FunctionCallExpr
**Purpose** → Top-level or static function call  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Test functions returning widgets

### 40. ConstructorCallExpr
**Purpose** → Constructor call variant (overlaps with ConstructorCallExpressionIR)  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Prefer ConstructorCallExpressionIR + FlutterWidgetConstructorIR
### 41. IntLiteralExpr
**Purpose** → Integer literal (e.g., `42`, `-10`) — always marked as constant  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Safe — core constant, test in keys and const widgets

### 42. DoubleLiteralExpr
**Purpose** → Double-precision floating-point literal (e.g., `3.14`, `-0.5`) — always constant  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Safe — used in padding, margins, animations

### 43. StringLiteralExpr
**Purpose** → String literal — constant if no interpolation  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Test Text('hello'), asset paths, const strings

### 44. BoolLiteralExpr
**Purpose** → Boolean literal: `true` or `false` — always constant  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Safe — common in Visible:, enabled:

### 45. NullLiteralExpr
**Purpose** → The `null` literal — always constant  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Safe — test optional child: null cases

### 46. ListLiteralExpr
**Purpose** → List literal `[...]` with optional `const` and type inference  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Overlaps with ListExpressionIR — test `children:` lists

### 47. MapLiteralExpr
**Purpose** → Map literal `{key: value}` with optional `const`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Test in widget properties and style maps

### 48. MapEntryIR
**Purpose** → Single key-value entry inside a map literal  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Internal to MapLiteralExpr — safe

### 49. SetLiteralExpr
**Purpose** → Set literal `<Type>{...}` with optional `const`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Rarely used in Flutter UI — safe

### 50. BinaryOpExpr
**Purpose** → Alternative binary operation node (operator enum + operands)  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Prefer BinaryExpressionIR — this is legacy variant

### 51. UnaryOpExpr
**Purpose** → Alternative unary operation node (operator enum + operand)  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Prefer UnaryExpressionIR — legacy

### 52. AssignmentExpr
**Purpose** → Assignment node (simple + compound) — alternative to AssignmentExpressionIR  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Prefer AssignmentExpressionIR / CompoundAssignmentExpressionIR

### 53. ConditionalExpr
**Purpose** → Ternary expression — alternative to ConditionalExpressionIR  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Prefer ConditionalExpressionIR — test both branches

### 54. IdentifierExpr
**Purpose** → Simplified identifier node — alternative to IdentifierExpressionIR  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Prefer IdentifierExpressionIR

### 55. PropertyAccessExpr
**Purpose** → Property access — alternative to PropertyAccessExpressionIR  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Prefer PropertyAccessExpressionIR

### 56. IndexAccessExpr
**Purpose** → Index access — alternative to IndexAccessExpressionIR  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Prefer IndexAccessExpressionIR

### 57. UnknownExpressionIR
**Purpose** → Catch-all fallback for any unrecognized or partially parsed expression — stores raw source  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Should ideally never appear in real apps — if it does, investigate parser bug