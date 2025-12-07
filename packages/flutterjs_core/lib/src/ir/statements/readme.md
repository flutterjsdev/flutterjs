## IR Classes – Maintenance & Safety Guide (updated 2025-12-07)

### 01. StatementIR
**Purpose** → Abstract base class for all statement intermediate representation nodes with built-in widget usage tracking  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → This is the root of the entire IR. Run the full test suite + golden tests. Never remove or rename `widgetUsages`

### 02. ExpressionStmt
**Purpose** → Represents a standalone expression used as a statement (e.g., function call, assignment)  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Run widget extraction tests, especially ones with method calls and operators

### 03. VariableDeclarationStmt
**Purpose** → Declares a variable with optional type, initializer, and mutability flags (final/const/late)  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Test `late final` in build methods and hot reload scenarios

### 04. ReturnStmt
**Purpose** → Represents a `return` statement, optionally returning an expression  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Safe to modify, but check early return widget pruning

### 05. BreakStmt / ContinueStmt
**Purpose** → Represents a `break` or `continue` statement, optionally with a label  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Safe – only affects control flow, not widget tree

### 06. ThrowStmt
**Purpose** → Represents a `throw` statement that throws an exception expression  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Safe – does not affect widget extraction

### 07. BlockStmt
**Purpose** → Groups multiple statements into a block (`{ … }`) and supports nested widget extraction  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Critical path. Run ALL widget extraction and golden tests. Nested widgets must not be lost

### 08. IfStmt
**Purpose** → Represents an `if` statement with a condition, then-branch, and optional else-branch  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Test both branches – no duplicate or missing widgets allowed

### 09. ForStmt
**Purpose** → Classic C-style `for` loop with initialization, condition, updaters, and body  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Test loop variable scope and widget collection inside body

### 10. ForEachStmt
**Purpose** → Represents a `for-in` (or `await for`) loop over an iterable  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Test both sync and `await for` – especially StreamBuilder detection

### 11. WhileStmt / DoWhileStmt
**Purpose** → Represents a `while` or `do-while` loop  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Safe, but check infinite build detection

### 12. SwitchStmt / SwitchCaseStmt
**Purpose** → Represents a `switch` statement and its case/default branches  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Being replaced by pattern matching – avoid new logic here

### 13. TryStmt / CatchClauseStmt
**Purpose** → Represents a `try-catch-finally` block and its catch clauses  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Safe – test error widgets still appear correctly

### 14. AssertStatementIR
**Purpose** → Represents an `assert(condition, message?)` statement  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Only active in debug mode – safe

### 15. EmptyStatementIR
**Purpose** → Represents a standalone semicolon (`;`) with no effect  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Can be safely removed in future

### 16. YieldStatementIR
**Purpose** → Represents a `yield` or `yield*` statement in generators/async* functions  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Critical for StreamBuilder detection – run stream tests

### 17. LabeledStatementIR
**Purpose** → Attaches a label to another statement for use with `break`/`continue`  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Safe – control flow only

### 18. FunctionDeclarationStatementIR
**Purpose** → Represents a local function declaration appearing as a statement  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Must walk inside local functions – run closure widget tests

### 19. WidgetUsageIR
**Purpose** → Captures detailed information about a single Flutter widget instantiation  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Core data structure. Run EVERY test. Never break existing fields

### 20. StatementBodyWidgetAnalysis (extension)
**Purpose** → Adds `getAllWidgetUsages()` to lists of statements for recursive widget collection  
**Implemented in** →  
**Used in** →  
**Last change** → 2025-12-07  
**Before pushing / PR** → Run full golden test suite – no missing or duplicate widgets allowed

## Pattern Matching System (Dart 3.0+) – (WIP)

### PatternIR → Base interface → — → — → 2025-12-07 → Design phase → Still evolving
### WildcardPatternIR → `_` pattern → — → — → 2025-12-07 → Working → Safe
### VariablePatternIR → Variable binding in patterns → — → — → 2025-12-07 → Working → Safe
### ConstantPatternIR → Literal matching → — → — → 2025-12-07 → Stable → Safe
### List/Map/Record/ObjectPatternIR → Structured destructuring → — → — → 2025-12-07 → 70% done → Do not use in prod
### SwitchExpressionIR / IfCaseStmt / PatternCaseStmt → New pattern-based control flow → — → — → 2025-12-07 → Prototype → Only in feature branch
