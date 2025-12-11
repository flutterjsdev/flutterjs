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
  final String? expressionType;
  final bool isMethodCall;
  final bool isConstructorCall;
  final bool isAssignment;

  const ExpressionStmt({
    required super.id,
    required super.sourceLocation,
    required this.expression,
    super.metadata,
    super.widgetUsages,
    this.expressionType,
    this.isMethodCall = false,
    this.isConstructorCall = false,
    this.isAssignment = false,
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

  @override
  Map<String, dynamic> toJson() {
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

  @override
  Map<String, dynamic> toJson() {
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

  /// Whether loop destructures (Dart 3.0+)
  final bool usesDestructuring;

  /// Pattern for destructuring (if usesDestructuring is true)
  final PatternIR? destructurePattern;

  /// Types of destructured variables
  final Map<String, TypeIR>? destructuredTypes;

  /// Variables bound by pattern
  final List<String>? boundVariables;

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
    this.usesDestructuring = false,
    this.destructurePattern,
    this.destructuredTypes,
    this.boundVariables,
  });

  @override
  String toShortString() =>
      'for${isAsync ? ' await' : ''} ($loopVariable in ${iterable.toShortString()}) { ... }';

  @override
  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson['loopVariable'] = loopVariable;
    baseJson['loopVariableType'] = loopVariableType?.toJson();
    baseJson['iterable'] = iterable.toJson();
    baseJson['body'] = body.toJson();
    baseJson['isAsync'] = isAsync;
    baseJson['usesDestructuring'] = usesDestructuring;
    if (destructurePattern != null) {
      baseJson['destructurePattern'] = destructurePattern?.toJson();
    }
    baseJson['boundVariables'] = boundVariables;
    // baseJson['destructuredTypes']= destructuredTypes.
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

  @override
  Map<String, dynamic> toJson() {
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
  @override
  Map<String, dynamic> toJson() {
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

  /// Whether this switch uses pattern matching (Dart 3.0+)
  final bool usesPatterns;

  /// Pattern-based cases (for Dart 3.0+)
  final List<PatternCaseStmt>? patternCases;

  /// Guard clauses (when keyword)
  final List<GuardClause>? guardClauses;

  /// Whether switch is exhaustive
  final bool isExhaustive;

  /// Cases that are not handled
  final List<String>? unhandledCases;

  /// Whether uses wildcard or default
  final bool usesWildcardOrDefault;

  const SwitchStmt({
    required super.id,
    required super.sourceLocation,
    required this.expression,
    required this.cases,
    this.defaultCase,
    super.metadata,
    super.widgetUsages,
    this.usesPatterns = false,
    this.patternCases,
    this.guardClauses,
    this.isExhaustive = false,
    this.unhandledCases,
    this.usesWildcardOrDefault = false,
  });

  @override
  String toShortString() =>
      'switch (${expression.toShortString()}) { ${cases.length} cases }';

  @override
  Map<String, dynamic> toJson() {
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

  @override
  Map<String, dynamic> toJson() {
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
  @override
  Map<String, dynamic> toJson() {
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

  @override
  Map<String, dynamic> toJson() {
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

  @override
  Map<String, dynamic> toJson() {
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

  @override
  Map<String, dynamic> toJson() {
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

  @override
  Map<String, dynamic> toJson() {
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

  @override
  Map<String, dynamic> toJson() {
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

  @override
  Map<String, dynamic> toJson() {
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

@immutable
abstract class PatternIR extends IRNode {
  /// Type this pattern matches
  final TypeIR matchedType;

  /// Variables bound by this pattern
  final List<String> boundVariables;

  const PatternIR({
    required super.id,
    required super.sourceLocation,
    required this.matchedType,
    this.boundVariables = const [],
    super.metadata,
  });

  /// Get all variables this pattern binds
  List<String> getBoundVariables();

  @override
  String toShortString();
  Map<String, dynamic> toJson() {
    return {
      ...toJson(),
      "matchedType": matchedType.toJson(),
      "boundVariables": boundVariables,
    };
  }
}

@immutable
class GuardClause extends IRNode {
  /// The guard condition
  final ExpressionIR condition;

  /// Source location

  const GuardClause({
    required this.condition,
    required super.sourceLocation,
    required super.id,
  });

  @override
  String toString() => 'when ${condition.toShortString()}';

  Map<String, dynamic> toJson() {
    return {...toJson(), 'condition': condition.toJson()};
  }
}

@immutable
class PatternCaseStmt extends StatementIR {
  /// Pattern to match
  final PatternIR pattern;

  /// Guard condition (when clause)
  final GuardClause? guard;

  /// Statements to execute
  final List<StatementIR> statements;

  const PatternCaseStmt({
    required super.id,
    required super.sourceLocation,
    required this.pattern,
    this.guard,
    required this.statements,
    super.metadata,
    super.widgetUsages,
  });

  @override
  String toShortString() {
    final guardStr = guard != null ? ' ${guard!.toString()}' : '';
    return 'case ${pattern.toShortString()}$guardStr: ...';
  }

  @override
  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson.addAll({
      'pattern': pattern.toJson(),
      'guard': guard?.toJson(),
      'statements': statements.map((s) => s.toJson()).toList(),
    });
    return baseJson;
  }
}

@immutable
class WildcardPatternIR extends PatternIR {
  const WildcardPatternIR({
    required super.id,
    required super.sourceLocation,
    required super.matchedType,
    super.metadata,
  });

  @override
  List<String> getBoundVariables() => [];

  @override
  String toShortString() => '_';

  @override
  Map<String, dynamic> toJson() {
    return {...super.toJson(), 'type': 'WildcardPattern'};
  }
}

@immutable
class VariablePatternIR extends PatternIR {
  /// Variable name being bound
  final String variableName;

  /// Whether this is final
  final bool isFinal;

  /// Whether explicitly typed
  final bool hasExplicitType;

  VariablePatternIR({
    required super.id,
    required super.sourceLocation,
    required this.variableName,
    required super.matchedType,
    this.isFinal = false,
    this.hasExplicitType = false,
    super.metadata,
  }) : super(boundVariables: [variableName]);

  @override
  List<String> getBoundVariables() => [variableName];

  @override
  String toShortString() {
    final prefix = hasExplicitType ? '${matchedType.displayName()} ' : 'var ';
    final finalStr = isFinal ? 'final ' : '';
    return '$finalStr$prefix$variableName';
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'type': 'VariablePattern',
      'variableName': variableName,
      'isFinal': isFinal,
      'hasExplicitType': hasExplicitType,
    };
  }
}

@immutable
class ConstantPatternIR extends PatternIR {
  /// The constant value
  final ExpressionIR value;

  const ConstantPatternIR({
    required super.id,
    required super.sourceLocation,
    required this.value,
    required super.matchedType,
    super.metadata,
  });

  @override
  List<String> getBoundVariables() => [];

  @override
  String toShortString() => value.toShortString();

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'type': 'ConstantPattern',
      'value': value.toJson(),
    };
  }
}

@immutable
class ListPatternIR extends PatternIR {
  /// Elements in the list
  final List<PatternIR> elements;

  /// Whether has rest element: [first, ...rest]
  final bool hasRestElement;

  /// Rest element variable if present
  final String? restVariableName;

  const ListPatternIR({
    required super.id,
    required super.sourceLocation,
    required this.elements,
    required super.matchedType,
    this.hasRestElement = false,
    this.restVariableName,
    super.metadata,
  });

  @override
  List<String> getBoundVariables() {
    final vars = <String>[];
    for (final elem in elements) {
      vars.addAll(elem.getBoundVariables());
    }
    if (restVariableName != null) {
      vars.add(restVariableName!);
    }
    return vars;
  }

  @override
  String toShortString() {
    final elemStrs = elements.map((e) => e.toShortString()).toList();
    if (hasRestElement && restVariableName != null) {
      elemStrs.add('...$restVariableName');
    }
    return '[${elemStrs.join(', ')}]';
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'type': 'ListPattern',
      'elements': elements.map((e) => e.toJson()).toList(),
      'hasRestElement': hasRestElement,
      'restVariableName': restVariableName,
    };
  }
}

@immutable
class MapPatternIR extends PatternIR {
  /// Key-pattern pairs
  final Map<String, PatternIR> entries;

  /// Whether has rest element
  final bool hasRestElement;

  /// Rest variable name
  final String? restVariableName;

  const MapPatternIR({
    required super.id,
    required super.sourceLocation,
    required this.entries,
    required super.matchedType,
    this.hasRestElement = false,
    this.restVariableName,
    super.metadata,
  });

  @override
  List<String> getBoundVariables() {
    final vars = <String>[];
    for (final pattern in entries.values) {
      vars.addAll(pattern.getBoundVariables());
    }
    if (restVariableName != null) {
      vars.add(restVariableName!);
    }
    return vars;
  }

  @override
  String toShortString() {
    final pairs = entries.entries
        .map((e) => '${e.key}: ${e.value.toShortString()}')
        .toList();
    if (hasRestElement && restVariableName != null) {
      pairs.add('...$restVariableName');
    }
    return '{${pairs.join(', ')}}';
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'type': 'MapPattern',
      'entries': entries.map((k, v) => MapEntry(k, v.toJson())),
      'hasRestElement': hasRestElement,
      'restVariableName': restVariableName,
    };
  }
}

@immutable
class RecordPatternIR extends PatternIR {
  /// Field patterns in order
  final List<PatternIR> fields;

  /// Named field patterns
  final Map<String, PatternIR>? namedFields;

  const RecordPatternIR({
    required super.id,
    required super.sourceLocation,
    required this.fields,
    required super.matchedType,
    this.namedFields,
    super.metadata,
  });

  @override
  List<String> getBoundVariables() {
    final vars = <String>[];
    for (final field in fields) {
      vars.addAll(field.getBoundVariables());
    }
    if (namedFields != null) {
      for (final pattern in namedFields!.values) {
        vars.addAll(pattern.getBoundVariables());
      }
    }
    return vars;
  }

  @override
  String toShortString() {
    final fieldStrs = fields.map((f) => f.toShortString()).toList();
    if (namedFields != null && namedFields!.isNotEmpty) {
      final namedStrs = namedFields!.entries
          .map((e) => '${e.key}: ${e.value.toShortString()}')
          .toList();
      fieldStrs.addAll(namedStrs);
    }
    return '(${fieldStrs.join(', ')})';
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'type': 'RecordPattern',
      'fields': fields.map((f) => f.toJson()).toList(),
      'namedFields': namedFields?.map((k, v) => MapEntry(k, v.toJson())),
    };
  }
}

@immutable
class ObjectPatternIR extends PatternIR {
  /// Class name being destructured
  final String className;

  /// Property patterns
  final Map<String, PatternIR> properties;

  const ObjectPatternIR({
    required super.id,
    required super.sourceLocation,
    required this.className,
    required this.properties,
    required super.matchedType,
    super.metadata,
  });

  @override
  List<String> getBoundVariables() {
    final vars = <String>[];
    for (final pattern in properties.values) {
      vars.addAll(pattern.getBoundVariables());
    }
    return vars;
  }

  @override
  String toShortString() {
    final propStrs = properties.entries
        .map((e) => '${e.key}: ${e.value.toShortString()}')
        .toList();
    return '$className(${propStrs.join(', ')})';
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'type': 'ObjectPattern',
      'className': className,
      'properties': properties.map((k, v) => MapEntry(k, v.toJson())),
    };
  }
}

@immutable
class RelationalPatternIR extends PatternIR {
  /// Operator: >, <, >=, <=, ==, !=
  final String operator;

  /// Value to compare with
  final ExpressionIR operand;

  const RelationalPatternIR({
    required super.id,
    required super.sourceLocation,
    required this.operator,
    required this.operand,
    required super.matchedType,
    super.metadata,
  });

  @override
  List<String> getBoundVariables() => [];

  @override
  String toShortString() => '$operator ${operand.toShortString()}';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'type': 'RelationalPattern',
      'operator': operator,
      'operand': operand.toJson(),
    };
  }
}

/// Logical AND pattern: (var x) && (> 0)
@immutable
class LogicalAndPatternIR extends PatternIR {
  /// Left pattern
  final PatternIR left;

  /// Right pattern
  final PatternIR right;

  const LogicalAndPatternIR({
    required super.id,
    required super.sourceLocation,
    required this.left,
    required this.right,
    required super.matchedType,
    super.metadata,
  });

  @override
  List<String> getBoundVariables() {
    return [...left.getBoundVariables(), ...right.getBoundVariables()];
  }

  @override
  String toShortString() =>
      '${left.toShortString()} && ${right.toShortString()}';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'type': 'LogicalAndPattern',
      'left': left.toJson(),
      'right': right.toJson(),
    };
  }
}

/// Logical OR pattern: 1 || 2 || 3
@immutable
class LogicalOrPatternIR extends PatternIR {
  /// Alternative patterns
  final List<PatternIR> patterns;

  const LogicalOrPatternIR({
    required super.id,
    required super.sourceLocation,
    required this.patterns,
    required super.matchedType,
    super.metadata,
  });

  @override
  List<String> getBoundVariables() {
    // Only variables that are in ALL patterns
    if (patterns.isEmpty) return [];
    final first = patterns.first.getBoundVariables().toSet();
    return first
        .where((v) => patterns.every((p) => p.getBoundVariables().contains(v)))
        .toList();
  }

  @override
  String toShortString() => patterns.map((p) => p.toShortString()).join(' || ');

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'type': 'LogicalOrPattern',
      'patterns': patterns.map((p) => p.toJson()).toList(),
    };
  }
}

/// Null-check pattern: var x?
@immutable
class NullCheckPatternIR extends PatternIR {
  /// Inner pattern
  final PatternIR pattern;

  const NullCheckPatternIR({
    required super.id,
    required super.sourceLocation,
    required this.pattern,
    required super.matchedType,
    super.metadata,
  });

  @override
  List<String> getBoundVariables() => pattern.getBoundVariables();

  @override
  String toShortString() => '${pattern.toShortString()}?';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'type': 'NullCheckPattern',
      'pattern': pattern.toJson(),
    };
  }
}

/// Null-assert pattern: var x!
@immutable
class NullAssertPatternIR extends PatternIR {
  /// Inner pattern
  final PatternIR pattern;

  const NullAssertPatternIR({
    required super.id,
    required super.sourceLocation,
    required this.pattern,
    required super.matchedType,
    super.metadata,
  });

  @override
  List<String> getBoundVariables() => pattern.getBoundVariables();

  @override
  String toShortString() => '${pattern.toShortString()}!';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'type': 'NullAssertPattern',
      'pattern': pattern.toJson(),
    };
  }
}

/// Parenthesized pattern: (var x || var y)
@immutable
class ParenthesizedPatternIR extends PatternIR {
  /// Inner pattern
  final PatternIR pattern;

  const ParenthesizedPatternIR({
    required super.id,
    required super.sourceLocation,
    required this.pattern,
    required super.matchedType,
    super.metadata,
  });

  @override
  List<String> getBoundVariables() => pattern.getBoundVariables();

  @override
  String toShortString() => '(${pattern.toShortString()})';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'type': 'ParenthesizedPattern',
      'pattern': pattern.toJson(),
    };
  }
}

// ============================================================================
// NEW: If-Case Statement (Dart 3.0+)
// ============================================================================

@immutable
class IfCaseStmt extends StatementIR {
  /// Expression being matched
  final ExpressionIR expression;

  /// Pattern to match against
  final PatternIR pattern;

  /// Guard condition
  final GuardClause? guard;

  /// Then branch (if pattern matches)
  final StatementIR thenBranch;

  /// Else branch (if pattern doesn't match)
  final StatementIR? elseBranch;

  /// Variables bound by pattern
  final List<String> boundVariables;

  const IfCaseStmt({
    required super.id,
    required super.sourceLocation,
    required this.expression,
    required this.pattern,
    required this.thenBranch,
    this.guard,
    this.elseBranch,
    this.boundVariables = const [],
    super.metadata,
    super.widgetUsages,
  });

  @override
  String toShortString() {
    final guardStr = guard != null ? ' ${guard!.toString()}' : '';
    return 'if (${expression.toShortString()} case ${pattern.toShortString()}$guardStr) { ... }';
  }

  @override
  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson.addAll({
      'expression': expression.toJson(),
      'pattern': pattern.toJson(),
      'guard': guard?.toJson(),
      'thenBranch': thenBranch.toJson(),
      'elseBranch': elseBranch?.toJson(),
      'boundVariables': boundVariables,
    });
    return baseJson;
  }
}

// ============================================================================
// NEW: Record Destructuring Statement
// ============================================================================

@immutable
class RecordDestructuringStmt extends VariableDeclarationStmt {
  /// Field patterns
  final List<PatternIR> fieldPatterns;

  /// Named field patterns
  final Map<String, PatternIR>? namedPatterns;

  /// Record value being destructured
  final ExpressionIR recordValue;

  /// Variables bound from destructuring
  final List<String> boundVariables;

  const RecordDestructuringStmt({
    required super.id,
    required super.sourceLocation,
    required super.name,
    required this.fieldPatterns,
    required this.recordValue,
    this.namedPatterns,
    this.boundVariables = const [],
    super.type,
    super.initializer,
    super.isFinal = true,
    super.metadata,
    super.widgetUsages,
  });

  @override
  String toShortString() {
    final fieldStrs = fieldPatterns.map((p) => p.toShortString()).toList();
    if (namedPatterns != null && namedPatterns!.isNotEmpty) {
      final namedStrs = namedPatterns!.entries
          .map((e) => '${e.key}: ${e.value.toShortString()}')
          .toList();
      fieldStrs.addAll(namedStrs);
    }
    return 'var (${fieldStrs.join(', ')}) = ${recordValue.toShortString()}';
  }

  @override
  Map<String, dynamic> toJson() {
    final baseJson = super.toJson();
    baseJson.addAll({
      'fieldPatterns': fieldPatterns.map((p) => p.toJson()).toList(),
      'namedPatterns': namedPatterns?.map((k, v) => MapEntry(k, v.toJson())),
      'recordValue': recordValue.toJson(),
      'boundVariables': boundVariables,
    });
    return baseJson;
  }
}

// ============================================================================
// NEW: Switch Expression (Returns value, not statement but expression-like)
// ============================================================================

@immutable
class SwitchExpressionIR extends ExpressionIR {
  /// Expression being switched on
  final ExpressionIR expression;

  /// Pattern cases with expressions
  final List<SwitchExpressionCase> cases;

  /// Whether expression is exhaustive
  final bool isExhaustive;

  /// Unhandled cases
  final List<String>? unhandledCases;

  const SwitchExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.expression,
    required this.cases,
    required super.resultType,
    this.isExhaustive = false,
    this.unhandledCases,
    super.metadata,
  });

  @override
  String toShortString() =>
      'switch (${expression.toShortString()}) { ${cases.length} cases }';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'expression': expression.toJson(),
      'cases': cases.map((c) => c.toJson()).toList(),
      'isExhaustive': isExhaustive,
      'unhandledCases': unhandledCases,
    };
  }
}

@immutable
class SwitchExpressionCase {
  /// Pattern to match
  final PatternIR pattern;

  /// Guard condition
  final GuardClause? guard;

  /// Expression to evaluate (returns value)
  final ExpressionIR body;

  const SwitchExpressionCase({
    required this.pattern,
    required this.body,
    this.guard,
  });

  @override
  String toString() {
    final guardStr = guard != null ? ' ${guard!.toString()}' : '';
    return '${pattern.toShortString()}$guardStr => ${body.toShortString()}';
  }

  Map<String, dynamic> toJson() {
    return {
      'pattern': pattern.toJson(),
      'guard': guard?.toJson(),
      'body': body.toJson(),
    };
  }
}
