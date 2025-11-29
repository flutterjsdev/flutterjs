// lib/src/ir/statement/statement_ir.dart
// Complete Statement IR hierarchy with Widget Analysis

import 'package:meta/meta.dart';
import '../declarations/function_decl.dart';
import '../expressions/expression_ir.dart';
import '../core/ir_node.dart';
import '../types/type_ir.dart';

/// =============================================================================
///  STATEMENT IR HIERARCHY
///  Complete Intermediate Representation for Dart statements
/// =============================================================================
///
/// PURPOSE
/// -------
/// Defines immutable IR nodes for all Dart statement types, with built-in
/// support for widget analysis via WidgetUsageIR.
///
/// Covers:
/// • Simple: expressions, declarations, returns, break/continue, throw
/// • Control: if/else, for/foreach, while/do-while
/// • Blocks: nested statements
/// • Exceptions: try/catch/finally
/// • Switching: switch/case/default
///
/// KEY FEATURES
/// ------------
/// • Widget integration: widgetUsages list on every statement
/// • Human-readable toShortString()
/// • Recursive widget extraction via extensions
/// • Immutable + metadata support
/// • Easy nested traversal
///
/// EXTENSION: StatementBodyWidgetAnalysis
/// --------------------------------------
/// Provides getAllWidgetUsages() for recursive widget collection from bodies.
///
/// RELATED FILES
/// -------------
/// • ir_node.dart           → Base IRNode
/// • expression_ir.dart     → Expressions in statements
/// • type_ir.dart           → Types in declarations
/// • function_decl.dart     → Function body integration
/// • statement_widget_analyzer.dart → Populates widgetUsages
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
@immutable
abstract class StatementIR extends IRNode {
  // ✅ NEW: Widget analysis data
  final List<WidgetUsageIR>? widgetUsages;

  const StatementIR({
    required super.id,
    required super.sourceLocation,
    super.metadata,
    this.widgetUsages,
  });

  /// Extract all widgets used in this statement
  List<WidgetUsageIR> getWidgetUsages() => widgetUsages ?? [];

  /// Check if this statement contains any widgets
  bool hasWidgets() => widgetUsages != null && widgetUsages!.isNotEmpty;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sourceLocation': sourceLocation.toJson(),
      'metadata': metadata,
      'widgetUsages': widgetUsages?.map((w) => w.toJson()).toList(),
    };
  }
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
    super.widgetUsages,
  });

  @override
  String toShortString() => expression.toShortString();
  @override
  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['expression'] = expression.toJson();
    return baseJson;
  }
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
    super.widgetUsages,
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

  @override
  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson.addAll({
      'name': name,
      'type': type?.toJson(),
      'initializer': initializer?.toJson(),
      'isFinal': isFinal,
      'isConst': isConst,
      'isLate': isLate,
      'isMutable': isMutable,
    });
    return baseJson;
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
    super.widgetUsages,
  });

  @override
  String toShortString() =>
      'return${expression != null ? ' ${expression!.toShortString()}' : ''}';

  @override
  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['expression'] = expression?.toJson();
    return baseJson;
  }
}

@immutable
class BreakStmt extends StatementIR {
  final String? label;

  const BreakStmt({
    required super.id,
    required super.sourceLocation,
    this.label,
    super.metadata,
    super.widgetUsages,
  });

  @override
  String toShortString() => 'break${label != null ? ' $label' : ''}';

  @override
  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['label'] = label;
    return baseJson;
  }
}

@immutable
class ContinueStmt extends StatementIR {
  final String? label;

  const ContinueStmt({
    required super.id,
    required super.sourceLocation,
    this.label,
    super.metadata,
    super.widgetUsages,
  });

  @override
  String toShortString() => 'continue${label != null ? ' $label' : ''}';

  @override
  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['label'] = label;
    return baseJson;
  }
}

@immutable
class ThrowStmt extends StatementIR {
  final ExpressionIR exceptionExpression;

  const ThrowStmt({
    required super.id,
    required super.sourceLocation,
    required this.exceptionExpression,
    super.metadata,
    super.widgetUsages,
  });

  @override
  String toShortString() => 'throw ${exceptionExpression.toShortString()}';
  @override
  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['exceptionExpression'] = exceptionExpression.toJson();
    return baseJson;
  }
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
    super.widgetUsages,
  });

  @override
  String toShortString() => '{ ${statements.length} statements }';

  /// Get all widgets from all nested statements
  List<WidgetUsageIR> getAllNestedWidgets() {
    final widgets = <WidgetUsageIR>[];

    for (final stmt in statements) {
      widgets.addAll(stmt.getWidgetUsages());

      // Recursively get from nested blocks
      if (stmt is BlockStmt) {
        widgets.addAll(stmt.getAllNestedWidgets());
      }
    }

    return widgets;
  }

    @override
  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['statements'] = statements.map((s) => s.toJson()).toList();
    return baseJson;
  }
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
    super.widgetUsages,
  });

  @override
  String toShortString() =>
      'if (${condition.toShortString()}) { ... }${elseBranch != null ? ' else { ... }' : ''}';

  /// Get all possible widgets from both branches
  List<WidgetUsageIR> getAllBranchWidgets() {
    final widgets = <WidgetUsageIR>[];

    widgets.addAll(thenBranch.getWidgetUsages());
    if (thenBranch is BlockStmt) {
      widgets.addAll((thenBranch as BlockStmt).getAllNestedWidgets());
    }

    if (elseBranch != null) {
      widgets.addAll(elseBranch!.getWidgetUsages());
      if (elseBranch is BlockStmt) {
        widgets.addAll((elseBranch as BlockStmt).getAllNestedWidgets());
      }
    }

    return widgets;
  }


  @override  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['condition'] = condition.toJson();
    baseJson['thenBranch'] = thenBranch.toJson();
    baseJson['elseBranch'] = elseBranch?.toJson();
    return baseJson;
  }
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
    super.widgetUsages,
  });

  @override
  String toShortString() => 'for (...) { ... }';


  @override  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['initialization'] = initialization?.toJson();
    baseJson['condition'] = condition?.toJson();
    baseJson['updaters'] = updaters.map((u) => u.toJson()).toList();
    baseJson['body'] = body.toJson();
    return baseJson;

  }
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
    super.widgetUsages,
  });

  @override
  String toShortString() =>
      'for${isAsync ? ' await' : ''} ($loopVariable in ${iterable.toShortString()}) { ... }';

  @override  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['loopVariable'] = loopVariable;
    baseJson['loopVariableType'] = loopVariableType?.toJson();
    baseJson['iterable'] = iterable.toJson();
    baseJson['body'] = body.toJson();
    baseJson['isAsync'] = isAsync;
    return baseJson;
  }
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
    super.widgetUsages,
  });

  @override
  String toShortString() => 'while (${condition.toShortString()}) { ... }';

  @override  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['condition'] = condition.toJson();
    baseJson['body'] = body.toJson();
    return baseJson;
  }
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
    super.widgetUsages,
  });

  @override
  String toShortString() => 'do { ... } while (${condition.toShortString()})';
  @override  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['body'] = body.toJson();
    baseJson['condition'] = condition.toJson();
    return baseJson;
  }
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
    super.widgetUsages,
  });

  @override
  String toShortString() =>
      'switch (${expression.toShortString()}) { ${cases.length} cases }';

  @override  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['expression'] = expression.toJson();
    baseJson['cases'] = cases.map((c) => c.toJson()).toList();
    baseJson['defaultCase'] = defaultCase?.toJson();
    return baseJson;
  }
}

@immutable
class SwitchCaseStmt extends StatementIR {
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

  @override  
  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['patterns'] = patterns?.map((p) => p.toJson()).toList();
    baseJson['statements'] = statements.map((s) => s.toJson()).toList();
    baseJson['isDefault'] = isDefault;
    return baseJson;
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
    super.widgetUsages,
  });

  @override
  String toShortString() =>
      'try { ... } catch (${catchClauses.length} clauses)${finallyBlock != null ? ' finally { ... }' : ''}';

  @override  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['tryBlock'] = tryBlock.toJson();
    baseJson['catchClauses'] = catchClauses.map((c) => c.toJson()).toList();
    baseJson['finallyBlock'] = finallyBlock?.toJson();
    return baseJson;
  }
}

@immutable
class CatchClauseStmt extends StatementIR {
  final TypeIR? exceptionType;
  final String? exceptionParameter;
  final String? stackTraceParameter;
  final StatementIR body;

  const CatchClauseStmt({
    required super.id,
    required super.sourceLocation,
    this.exceptionType,
    this.exceptionParameter,
    this.stackTraceParameter,
    required this.body,
    super.metadata,
    super.widgetUsages,
  });

  @override
  String toShortString() => 'catch (${exceptionParameter ?? 'error'}) { ... }';
  @override  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['exceptionType'] = exceptionType?.toJson();
    baseJson['exceptionParameter'] = exceptionParameter;
    baseJson['stackTraceParameter'] = stackTraceParameter;
    baseJson['body'] = body.toJson();
    return baseJson;
  }
}

// =============================================================================
// OTHER STATEMENTS
// =============================================================================

@immutable
class AssertStatementIR extends StatementIR {
  final ExpressionIR condition;
  final ExpressionIR? message;

  const AssertStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.condition,
    this.message,
    super.metadata,
    super.widgetUsages,
  });

  @override
  String toShortString() => message != null
      ? 'assert(${condition.toShortString()}, ${message!.toShortString()})'
      : 'assert(${condition.toShortString()})';

  @override  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['condition'] = condition.toJson();
    baseJson['message'] = message?.toJson();
    return baseJson;
  }
}

@immutable
class EmptyStatementIR extends StatementIR {
  const EmptyStatementIR({
    required super.id,
    required super.sourceLocation,
    super.metadata,
    super.widgetUsages,
  });

  @override
  String toShortString() => ';';

  @override  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    return baseJson;
  }
}

@immutable
class YieldStatementIR extends StatementIR {
  final ExpressionIR value;
  final bool isYieldEach;

  const YieldStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.value,
    this.isYieldEach = false,
    super.metadata,
    super.widgetUsages,
  });

  @override
  String toShortString() =>
      'yield${isYieldEach ? '*' : ''} ${value.toShortString()}';

  @override  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['value'] = value.toJson();
    baseJson['isYieldEach'] = isYieldEach;
    return baseJson;
  }
}

@immutable
class LabeledStatementIR extends StatementIR {
  final String label;
  final StatementIR statement;

  const LabeledStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.label,
    required this.statement,
    super.metadata,
    super.widgetUsages,
  });

  @override
  String toShortString() => '$label: ${statement.toShortString()}';

  @override  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['label'] = label;
    baseJson['statement'] = statement.toJson();
    return baseJson;
  }
}

@immutable
class FunctionDeclarationStatementIR extends StatementIR {
  final FunctionDecl function;

  const FunctionDeclarationStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.function,
    super.metadata,
    super.widgetUsages,
  });

  @override
  String toShortString() => 'function ${function.name}() { ... }';

  @override  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['function'] = function.toJson();
    return baseJson;
  }
}

// =============================================================================
// WIDGET USAGE DATA MODEL
// =============================================================================

/// ✅ NEW: Represents a widget usage within a statement
@immutable
class WidgetUsageIR extends StatementIR {
  /// Widget class name: Scaffold, Container, Text, etc.
  final String widgetName;

  /// Constructor name if using named constructor: Container.shrink()
  final String? constructorName;

  /// Widget properties passed as named arguments
  final Map<String, String> properties;

  /// Statement type where widget is used: 'return', 'variable', 'expression'
  final String statementType;

  /// Variable name if this is a variable assignment
  final String? assignedToVariable;

  /// Parent widget if nested
  final String? parentWidget;

  /// All positional arguments
  final List<String> positionalArgs;

  /// Whether this widget is conditional (in if/ternary)
  final bool isConditional;

  const WidgetUsageIR({
    required super.id,
    required super.sourceLocation,
    required this.widgetName,
    this.constructorName,
    this.properties = const {},
    required this.statementType,
    this.assignedToVariable,
    this.parentWidget,
    this.positionalArgs = const [],
    this.isConditional = false,
    super.metadata,
  });

  @override
  String toShortString() {
    final varStr = assignedToVariable != null ? '$assignedToVariable = ' : '';
    return '$varStr$widgetName(${properties.length} props)';
  }

  /// Get human-readable description
  String describe() {
    final sb = StringBuffer();
    sb.write(widgetName);

    if (constructorName != null) {
      sb.write('.${constructorName!}');
    }

    if (assignedToVariable != null) {
      sb.write(' → $assignedToVariable');
    }

    if (isConditional) {
      sb.write(' [conditional]');
    }

    if (properties.isNotEmpty) {
      sb.write(' {${properties.keys.join(', ')}}');
    }

    return sb.toString();
  }

  @override  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();  
    baseJson.addAll({
      'widgetName': widgetName,
      'constructorName': constructorName,
      'properties': properties,
      'statementType': statementType,
      'assignedToVariable': assignedToVariable,
      'parentWidget': parentWidget,
      'positionalArgs': positionalArgs,
      'isConditional': isConditional,
    });
    return baseJson;
  }
}

// =============================================================================
// EXTENSION: Add widget extraction to statement body
// =============================================================================

/// ✅ NEW: Extension for easy widget analysis on statement bodies
extension StatementBodyWidgetAnalysis on List<StatementIR> {
  /// Get all widgets from all statements in body
  List<WidgetUsageIR> getAllWidgetUsages() {
    final widgets = <WidgetUsageIR>[];

    for (final stmt in this) {
      widgets.addAll(stmt.getWidgetUsages());

      // Recursively extract from nested blocks
      _extractFromNestedStatements(stmt, widgets);
    }

    return widgets;
  }

  void _extractFromNestedStatements(
    StatementIR stmt,
    List<WidgetUsageIR> widgets,
  ) {
    if (stmt is BlockStmt) {
      widgets.addAll(stmt.getAllNestedWidgets());
    } else if (stmt is IfStmt) {
      widgets.addAll(stmt.getAllBranchWidgets());
    } else if (stmt is ForStmt || stmt is ForEachStmt || stmt is WhileStmt) {
      if (stmt is ForStmt) {
        _extractFromNestedStatements(stmt.body, widgets);
      } else if (stmt is ForEachStmt) {
        _extractFromNestedStatements(stmt.body, widgets);
      } else if (stmt is WhileStmt) {
        _extractFromNestedStatements(stmt.body, widgets);
      }
    } else if (stmt is TryStmt) {
      _extractFromNestedStatements(stmt.tryBlock, widgets);
      for (final catchClause in stmt.catchClauses) {
        _extractFromNestedStatements(catchClause.body, widgets);
      }
      if (stmt.finallyBlock != null) {
        _extractFromNestedStatements(stmt.finallyBlock!, widgets);
      }
    }
  }
}
