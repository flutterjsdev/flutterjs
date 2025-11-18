// lib/src/ir/statement/statement_ir.dart
// Complete Statement IR hierarchy for Phase 2

import 'package:meta/meta.dart';
import '../../function_decl.dart';
import '../expression_ir.dart';
import '../ir_node.dart';
import '../type_ir.dart';




/// Base class for all statement IR nodes
@immutable
abstract class StatementIR extends IRNode {
  const StatementIR({
    required super.id,
    required super.sourceLocation,
    super.metadata,
  });
}

// =============================================================================
// SIMPLE STATEMENTS
// =============================================================================

@immutable
class ExpressionStmt extends StatementIR {
  final ExpressionIR expression;

  const ExpressionStmt({
    required super.id,
    required super.sourceLocation,
    required this.expression,
    super.metadata,
  });

  @override
  String toShortString() => expression.toShortString();
}

@immutable
class VariableDeclarationStmt extends StatementIR {
  final String name;
  final TypeIR? type;
  final ExpressionIR? initializer;
  final bool isFinal;
  final bool isConst;
  final bool isLate;
  final bool isMutable;

  const VariableDeclarationStmt({
    required super.id,
    required super.sourceLocation,
    required this.name,
    this.type,
    this.initializer,
    this.isFinal = false,
    this.isConst = false,
    this.isLate = false,
    super.metadata,
  }) : isMutable = !isFinal && !isConst;

  @override
  String toShortString() {
    final modifier = isConst
        ? 'const'
        : isFinal
        ? 'final'
        : 'var';
    final typeStr = type != null ? '${type!.displayName} ' : '';
    return '$modifier $typeStr$name${initializer != null ? ' = ${initializer!.toShortString()}' : ''}';
  }
}

@immutable
class ReturnStmt extends StatementIR {
  final ExpressionIR? expression;

  const ReturnStmt({
    required super.id,
    required super.sourceLocation,
    this.expression,
    super.metadata,
  });

  @override
  String toShortString() =>
      'return${expression != null ? ' ${expression!.toShortString()}' : ''}';
}

@immutable
class BreakStmt extends StatementIR {
  final String? label;

  const BreakStmt({
    required super.id,
    required super.sourceLocation,
    this.label,
    super.metadata,
  });

  @override
  String toShortString() => 'break${label != null ? ' $label' : ''}';
}

@immutable
class ContinueStmt extends StatementIR {
  final String? label;

  const ContinueStmt({
    required super.id,
    required super.sourceLocation,
    this.label,
    super.metadata,
  });

  @override
  String toShortString() => 'continue${label != null ? ' $label' : ''}';
}

@immutable
class ThrowStmt extends StatementIR {
  final ExpressionIR exceptionExpression;

  const ThrowStmt({
    required super.id,
    required super.sourceLocation,
    required this.exceptionExpression,
    super.metadata,
  });

  @override
  String toShortString() => 'throw ${exceptionExpression.toShortString()}';
}

// =============================================================================
// COMPOUND STATEMENTS
// =============================================================================

@immutable
class BlockStmt extends StatementIR {
  final List<StatementIR> statements;

  const BlockStmt({
    required super.id,
    required super.sourceLocation,
    required this.statements,
    super.metadata,
  });

  @override
  String toShortString() => '{ ${statements.length} statements }';
}

@immutable
class IfStmt extends StatementIR {
  final ExpressionIR condition;
  final StatementIR thenBranch;
  final StatementIR? elseBranch;

  const IfStmt({
    required super.id,
    required super.sourceLocation,
    required this.condition,
    required this.thenBranch,
    this.elseBranch,
    super.metadata,
  });

  @override
  String toShortString() =>
      'if (${condition.toShortString()}) { ... }${elseBranch != null ? ' else { ... }' : ''}';
}

@immutable
class ForStmt extends StatementIR {
  final ExpressionIR? initialization;
  final ExpressionIR? condition;
  final List<ExpressionIR> updaters;
  final StatementIR body;

  const ForStmt({
    required super.id,
    required super.sourceLocation,
    this.initialization,
    this.condition,
    this.updaters = const [],
    required this.body,
    super.metadata,
  });

  @override
  String toShortString() => 'for (...) { ... }';
}

@immutable
class ForEachStmt extends StatementIR {
  final String loopVariable;
  final TypeIR? loopVariableType;
  final ExpressionIR iterable;
  final StatementIR body;
  final bool isAsync;

  const ForEachStmt({
    required super.id,
    required super.sourceLocation,
    required this.loopVariable,
    required this.iterable,
    required this.body,
    this.loopVariableType,
    this.isAsync = false,
    super.metadata,
  });

  @override
  String toShortString() =>
      'for${isAsync ? ' await' : ''} ($loopVariable in ${iterable.toShortString()}) { ... }';
}

@immutable
class WhileStmt extends StatementIR {
  final ExpressionIR condition;
  final StatementIR body;

  const WhileStmt({
    required super.id,
    required super.sourceLocation,
    required this.condition,
    required this.body,
    super.metadata,
  });

  @override
  String toShortString() => 'while (${condition.toShortString()}) { ... }';
}

@immutable
class DoWhileStmt extends StatementIR {
  final StatementIR body;
  final ExpressionIR condition;

  const DoWhileStmt({
    required super.id,
    required super.sourceLocation,
    required this.body,
    required this.condition,
    super.metadata,
  });

  @override
  String toShortString() => 'do { ... } while (${condition.toShortString()})';
}

@immutable
class SwitchStmt extends StatementIR {
  final ExpressionIR expression;
  final List<SwitchCaseStmt> cases;
  final SwitchCaseStmt? defaultCase;

  const SwitchStmt({
    required super.id,
    required super.sourceLocation,
    required this.expression,
    required this.cases,
    this.defaultCase,
    super.metadata,
  });

  @override
  String toShortString() =>
      'switch (${expression.toShortString()}) { ${cases.length} cases }';
}

@immutable
class SwitchCaseStmt extends IRNode {
  final List<ExpressionIR>? patterns;
  final List<StatementIR> statements;
  final bool isDefault;

  const SwitchCaseStmt({
    required super.id,
    required super.sourceLocation,
    this.patterns,
    required this.statements,
    this.isDefault = false,
    super.metadata,
  });

  @override
  String toShortString() {
    if (isDefault) return 'default: ...';
    return 'case: ...';
  }
}

@immutable
class TryStmt extends StatementIR {
  final StatementIR tryBlock;
  final List<CatchClauseStmt> catchClauses;
  final StatementIR? finallyBlock;

  const TryStmt({
    required super.id,
    required super.sourceLocation,
    required this.tryBlock,
    required this.catchClauses,
    this.finallyBlock,
    super.metadata,
  });

  @override
  String toShortString() =>
      'try { ... } catch (${catchClauses.length} clauses)${finallyBlock != null ? ' finally { ... }' : ''}';
}

@immutable
class CatchClauseStmt extends StatementIR {
  /// Type of exception being caught (e.g., Exception, CustomError)
  /// Can be null to catch all types
  final TypeIR? exceptionType;

  /// Name of the variable holding the exception instance
  /// Default: 'error' if not specified
  final String? exceptionParameter;

  /// Optional: Name of the variable holding the stack trace
  /// Default: null (not used in JavaScript)
  final String? stackTraceParameter;

  /// The catch block statements
  final StatementIR body;

  const CatchClauseStmt({
    required super.id,
    required super.sourceLocation,
    this.exceptionType,
    this.exceptionParameter,
    this.stackTraceParameter,
    required this.body,
    super.metadata,
  });

  @override
  String toShortString() => 'catch (${exceptionParameter ?? 'error'}) { ... }';
}

// =============================================================================
// ASSERT STATEMENT
// =============================================================================

/// Represents an assert statement in Dart
/// Used for debugging and enforcing runtime conditions
///
/// Example: `assert(value > 0);`, `assert(value != null, 'Value cannot be null');`
@immutable
class AssertStatementIR extends StatementIR {
  /// The condition being asserted
  final ExpressionIR condition;

  /// Optional message to display if assertion fails
  final ExpressionIR? message;

  const AssertStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.condition,
    this.message,
    super.metadata,
  });

  @override
  String toShortString() => message != null
      ? 'assert(${condition.toShortString()}, ${message!.toShortString()})'
      : 'assert(${condition.toShortString()})';
}

// =============================================================================
// EMPTY STATEMENT
// =============================================================================

/// Represents an empty statement in Dart
/// A statement that does nothing
///
/// Example: `;` (just a semicolon)
@immutable
class EmptyStatementIR extends StatementIR {
  const EmptyStatementIR({
    required super.id,
    required super.sourceLocation,
    super.metadata,
  });

  @override
  String toShortString() => ';';
}

// =============================================================================
// YIELD STATEMENT
// =============================================================================

/// Represents a yield statement in Dart
/// Used in generator functions to produce values
///
/// Example: `yield value;`, `yield* iterable;`
@immutable
class YieldStatementIR extends StatementIR {
  /// The value being yielded
  final ExpressionIR value;

  /// Whether this is a yield* (yield each) operation
  final bool isYieldEach;

  const YieldStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.value,
    this.isYieldEach = false,
    super.metadata,
  });

  @override
  String toShortString() =>
      'yield${isYieldEach ? '*' : ''} ${value.toShortString()}';
}

@immutable
class LabeledStatementIR extends StatementIR {
  /// The label identifier
  final String label;

  /// The statement being labeled
  final StatementIR statement;

  const LabeledStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.label,
    required this.statement,
    super.metadata,
  });

  @override
  String toShortString() => '$label: ${statement.toShortString()}';
}

// =============================================================================
// FUNCTION DECLARATION STATEMENT
// =============================================================================

/// Represents a function declaration as a statement
/// Used for nested functions declared inside other functions or blocks
///
/// Example:
/// ```dart
/// void outer() {
///   void inner() {  // <-- This is a FunctionDeclarationStmt
///     print('nested');
///   }
///   inner();
/// }
/// ```
@immutable
class FunctionDeclarationStatementIR extends StatementIR {
  /// The function being declared
  final FunctionDecl function;

  const FunctionDeclarationStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.function,
    super.metadata,
  });

  @override
  String toShortString() => 'function ${function.name}() { ... }';
}


