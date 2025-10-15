import 'core.dart';
import 'other.dart';
import 'widget.dart';



class StateClassDeclaration  {
  final String id;
  final String name;
  final String widgetName;
  final String filePath;
  final List<StatePropertyDeclaration > stateVariables;
  final List<WidgetMethodDeclaration > methods;
  final InitStateDeclaration ? initState;
  final DisposeDeclaration ? dispose;
  final List<LifecycleMethodDeclaration > lifecycleMethods;
  final SourceLocation location;

  StateClassDeclaration ({
    required this.id,
    required this.name,
    required this.widgetName,
    required this.filePath,
    this.stateVariables = const [],
    this.methods = const [],
    this.initState,
    this.dispose,
    this.lifecycleMethods = const [],
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'widgetName': widgetName,
    'filePath': filePath,
    'stateVariables': stateVariables.map((s) => s.toJson()).toList(),
    'methods': methods.map((m) => m.toJson()).toList(),
    'initState': initState?.toJson(),
    'dispose': dispose?.toJson(),
    'lifecycleMethods': lifecycleMethods.map((l) => l.toJson()).toList(),
    'location': location.toJson(),
  };
  factory StateClassDeclaration.fromJson(Map<String, dynamic> json) {
    return StateClassDeclaration(
      id: json['id'],
      name: json['name'],
      widgetName: json['widgetName'],
      filePath: json['filePath'],
      stateVariables: (json['stateVariables'] as List?)
          ?.map((s) => StatePropertyDeclaration.fromJson(s))
          .toList() ?? [],
      methods: (json['methods'] as List?)
          ?.map((m) => WidgetMethodDeclaration.fromJson(m))
          .toList() ?? [],
      initState: json['initState'] != null 
          ? InitStateDeclaration.fromJson(json['initState']) 
          : null,
      dispose: json['dispose'] != null 
          ? DisposeDeclaration.fromJson(json['dispose']) 
          : null,
      lifecycleMethods: (json['lifecycleMethods'] as List?)
          ?.map((l) => LifecycleMethodDeclaration.fromJson(l))
          .toList() ?? [],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

class InitStateDeclaration  {
  final List<StatementDeclaration > body;
  final SourceLocation location;

  InitStateDeclaration ({
    required this.body,
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'body': body.map((s) => s.toJson()).toList(),
    'location': location.toJson(),
  };
  factory InitStateDeclaration.fromJson(Map<String, dynamic> json) {
    return InitStateDeclaration(
      body: (json['body'] as List?)
          ?.map((s) => StatementDeclaration.fromJson(s))
          .toList() ?? [],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

class DisposeDeclaration  {
  final List<StatementDeclaration > body;
  final SourceLocation location;

  DisposeDeclaration ({
    required this.body,
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'body': body.map((s) => s.toJson()).toList(),
    'location': location.toJson(),
  };
  factory DisposeDeclaration.fromJson(Map<String, dynamic> json) {
    return DisposeDeclaration(
      body: (json['body'] as List?)
          ?.map((s) => StatementDeclaration.fromJson(s))
          .toList() ?? [],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

extension StateClassDeclarationFromJson on StateClassDeclaration {
  static StateClassDeclaration fromJson(Map<String, dynamic> json) {
    return StateClassDeclaration(
      id: json['id'],
      name: json['name'],
      widgetName: json['widgetName'],
      filePath: json['filePath'],
      stateVariables: (json['stateVariables'] as List?)
          ?.map((s) => StatePropertyDeclaration.fromJson(s))
          .toList() ?? [],
      methods: (json['methods'] as List?)
          ?.map((m) => WidgetMethodDeclaration.fromJson(m))
          .toList() ?? [],
      initState: json['initState'] != null 
          ? InitStateDeclaration.fromJson(json['initState']) 
          : null,
      dispose: json['dispose'] != null 
          ? DisposeDeclaration.fromJson(json['dispose']) 
          : null,
      lifecycleMethods: (json['lifecycleMethods'] as List?)
          ?.map((l) => LifecycleMethodDeclaration.fromJson(l))
          .toList() ?? [],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}


class LifecycleMethodDeclaration  {
  final String name;
  final List<StatementDeclaration > body;
  final SourceLocation location;

  LifecycleMethodDeclaration ({
    required this.name,
    required this.body,
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'body': body.map((s) => s.toJson()).toList(),
    'location': location.toJson(),
  };
  factory LifecycleMethodDeclaration.fromJson(Map<String, dynamic> json) {
    return LifecycleMethodDeclaration(
      name: json['name'],
      body: (json['body'] as List?)
          ?.map((s) => StatementDeclaration.fromJson(s))
          .toList() ?? [],
      location: SourceLocation.fromJson(json['location']),
    );
  }
  
}

class StatePropertyDeclaration  {
  final String name;
  final String type;
  final bool isMutable;
  final String? initialValue;
  final SourceLocation location;

  StatePropertyDeclaration ({
    required this.name,
    required this.type,
    this.isMutable = true,
    this.initialValue,
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'type': type,
    'isMutable': isMutable,
    'initialValue': initialValue,
    'location': location.toJson(),
  };
  factory StatePropertyDeclaration.fromJson(Map<String, dynamic> json) {
    return StatePropertyDeclaration(
      name: json['name'],
      type: json['type'],
      isMutable: json['isMutable'] ?? true,
      initialValue: json['initialValue'],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}


// import 'class_model.dart';
// import 'widget.dart';

// /// Base class for all statement Declaration nodes


enum StatementType {
  variableDeclaration,
  expressionStatement,
  returnStatement,
  ifStatement,
  forStatement,
  whileStatement,
  doWhileStatement,
  switchStatement,
  tryStatement,
  block,
  breakStatement,
  continueStatement,
  throwStatement,
  assertStatement,
  emptyStatement,
  unknown,
}

// =============================================================================
// VARIABLE DECLARATION
// =============================================================================

class VariableDeclarationDeclaration extends StatementDeclaration {
  final String name;
  final String variableType;
  final ExpressionDeclaration? initializer;
  final bool isFinal;
  final bool isConst;
  final bool isLate;

  VariableDeclarationDeclaration({
    required this.name,
    required this.variableType,
    this.initializer,
    this.isFinal = false,
    this.isConst = false,
    this.isLate = false,
    required SourceLocation location,
  }) : super(type: StatementType.variableDeclaration, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'name': name,
        'variableType': variableType,
        'initializer': initializer?.toJson(),
        'isFinal': isFinal,
        'isConst': isConst,
        'isLate': isLate,
        'location': location.toJson(),
      };

  factory VariableDeclarationDeclaration.fromJson(Map<String, dynamic> json) {
    return VariableDeclarationDeclaration(
      name: json['name'],
      variableType: json['variableType'],
      initializer: json['initializer'] != null
          ? ExpressionDeclaration.fromJson(json['initializer'])
          : null,
      isFinal: json['isFinal'] ?? false,
      isConst: json['isConst'] ?? false,
      isLate: json['isLate'] ?? false,
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// EXPRESSION STATEMENT
// =============================================================================

class ExpressionStatementDeclaration extends StatementDeclaration {
  final ExpressionDeclaration expression;

  ExpressionStatementDeclaration({
    required this.expression,
    required SourceLocation location,
  }) : super(type: StatementType.expressionStatement, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'expression': expression.toJson(),
        'location': location.toJson(),
      };

  factory ExpressionStatementDeclaration.fromJson(Map<String, dynamic> json) {
    return ExpressionStatementDeclaration(
      expression: ExpressionDeclaration.fromJson(json['expression']),
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// RETURN STATEMENT
// =============================================================================

class ReturnStatementDeclaration extends StatementDeclaration {
  final ExpressionDeclaration? expression;

  ReturnStatementDeclaration({
    this.expression,
    required SourceLocation location,
  }) : super(type: StatementType.returnStatement, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'expression': expression?.toJson(),
        'location': location.toJson(),
      };

  factory ReturnStatementDeclaration.fromJson(Map<String, dynamic> json) {
    return ReturnStatementDeclaration(
      expression: json['expression'] != null
          ? ExpressionDeclaration.fromJson(json['expression'])
          : null,
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// IF STATEMENT
// =============================================================================

class IfStatementDeclaration extends StatementDeclaration {
  final ExpressionDeclaration condition;
  final StatementDeclaration thenStatement;
  final StatementDeclaration? elseStatement;

  IfStatementDeclaration({
    required this.condition,
    required this.thenStatement,
    this.elseStatement,
    required SourceLocation location,
  }) : super(type: StatementType.ifStatement, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'condition': condition.toJson(),
        'thenStatement': thenStatement.toJson(),
        'elseStatement': elseStatement?.toJson(),
        'location': location.toJson(),
      };

  factory IfStatementDeclaration.fromJson(Map<String, dynamic> json) {
    return IfStatementDeclaration(
      condition: ExpressionDeclaration.fromJson(json['condition']),
      thenStatement: StatementDeclaration.fromJson(json['thenStatement']),
      elseStatement: json['elseStatement'] != null
          ? StatementDeclaration.fromJson(json['elseStatement'])
          : null,
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// FOR STATEMENT
// =============================================================================

class ForStatementDeclaration extends StatementDeclaration {
  final StatementDeclaration? initialization;
  final ExpressionDeclaration? condition;
  final List<ExpressionDeclaration> updaters;
  final StatementDeclaration body;
  final bool isForEach;
  final String? loopVariable;

  ForStatementDeclaration({
    this.initialization,
    this.condition,
    this.updaters = const [],
    required this.body,
    this.isForEach = false,
    this.loopVariable,
    required SourceLocation location,
  }) : super(type: StatementType.forStatement, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'initialization': initialization?.toJson(),
        'condition': condition?.toJson(),
        'updaters': updaters.map((u) => u.toJson()).toList(),
        'body': body.toJson(),
        'isForEach': isForEach,
        'loopVariable': loopVariable,
        'location': location.toJson(),
      };

  factory ForStatementDeclaration.fromJson(Map<String, dynamic> json) {
    return ForStatementDeclaration(
      initialization: json['initialization'] != null
          ? StatementDeclaration.fromJson(json['initialization'])
          : null,
      condition: json['condition'] != null
          ? ExpressionDeclaration.fromJson(json['condition'])
          : null,
      updaters: (json['updaters'] as List?)
              ?.map((u) => ExpressionDeclaration.fromJson(u))
              .toList() ??
          [],
      body: StatementDeclaration.fromJson(json['body']),
      isForEach: json['isForEach'] ?? false,
      loopVariable: json['loopVariable'],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// WHILE STATEMENT
// =============================================================================

class WhileStatementDeclaration extends StatementDeclaration {
  final ExpressionDeclaration condition;
  final StatementDeclaration body;

  WhileStatementDeclaration({
    required this.condition,
    required this.body,
    required SourceLocation location,
  }) : super(type: StatementType.whileStatement, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'condition': condition.toJson(),
        'body': body.toJson(),
        'location': location.toJson(),
      };

  factory WhileStatementDeclaration.fromJson(Map<String, dynamic> json) {
    return WhileStatementDeclaration(
      condition: ExpressionDeclaration.fromJson(json['condition']),
      body: StatementDeclaration.fromJson(json['body']),
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// SWITCH STATEMENT
// =============================================================================

class SwitchStatementDeclaration extends StatementDeclaration {
  final ExpressionDeclaration expression;
  final List<SwitchCaseDeclaration> cases;

  SwitchStatementDeclaration({
    required this.expression,
    required this.cases,
    required SourceLocation location,
  }) : super(type: StatementType.switchStatement, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'expression': expression.toJson(),
        'cases': cases.map((c) => c.toJson()).toList(),
        'location': location.toJson(),
      };

  factory SwitchStatementDeclaration.fromJson(Map<String, dynamic> json) {
    return SwitchStatementDeclaration(
      expression: ExpressionDeclaration.fromJson(json['expression']),
      cases: (json['cases'] as List)
          .map((c) => SwitchCaseDeclaration.fromJson(c))
          .toList(),
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

class SwitchCaseDeclaration {
  final List<ExpressionDeclaration> expressions;
  final List<StatementDeclaration> statements;
  final bool isDefault;

  SwitchCaseDeclaration({
    required this.expressions,
    required this.statements,
    this.isDefault = false,
  });

  Map<String, dynamic> toJson() => {
        'expressions': expressions.map((e) => e.toJson()).toList(),
        'statements': statements.map((s) => s.toJson()).toList(),
        'isDefault': isDefault,
      };

  factory SwitchCaseDeclaration.fromJson(Map<String, dynamic> json) {
    return SwitchCaseDeclaration(
      expressions: (json['expressions'] as List)
          .map((e) => ExpressionDeclaration.fromJson(e))
          .toList(),
      statements: (json['statements'] as List)
          .map((s) => StatementDeclaration.fromJson(s))
          .toList(),
      isDefault: json['isDefault'] ?? false,
    );
  }
}

// =============================================================================
// TRY STATEMENT
// =============================================================================

class TryStatementDeclaration extends StatementDeclaration {
  final BlockStatementDeclaration body;
  final List<CatchClauseDeclaration> catchClauses;
  final BlockStatementDeclaration? finallyBlock;

  TryStatementDeclaration({
    required this.body,
    required this.catchClauses,
    this.finallyBlock,
    required SourceLocation location,
  }) : super(type: StatementType.tryStatement, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'body': body.toJson(),
        'catchClauses': catchClauses.map((c) => c.toJson()).toList(),
        'finallyBlock': finallyBlock?.toJson(),
        'location': location.toJson(),
      };

  factory TryStatementDeclaration.fromJson(Map<String, dynamic> json) {
    return TryStatementDeclaration(
      body: BlockStatementDeclaration.fromJson(json['body']),
      catchClauses: (json['catchClauses'] as List)
          .map((c) => CatchClauseDeclaration.fromJson(c))
          .toList(),
      finallyBlock: json['finallyBlock'] != null
          ? BlockStatementDeclaration.fromJson(json['finallyBlock'])
          : null,
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

class CatchClauseDeclaration {
  final String? exceptionType;
  final String? exceptionParameter;
  final String? stackTraceParameter;
  final BlockStatementDeclaration body;

  CatchClauseDeclaration({
    this.exceptionType,
    this.exceptionParameter,
    this.stackTraceParameter,
    required this.body,
  });

  Map<String, dynamic> toJson() => {
        'exceptionType': exceptionType,
        'exceptionParameter': exceptionParameter,
        'stackTraceParameter': stackTraceParameter,
        'body': body.toJson(),
      };

  factory CatchClauseDeclaration.fromJson(Map<String, dynamic> json) {
    return CatchClauseDeclaration(
      exceptionType: json['exceptionType'],
      exceptionParameter: json['exceptionParameter'],
      stackTraceParameter: json['stackTraceParameter'],
      body: BlockStatementDeclaration.fromJson(json['body']),
    );
  }
}

// =============================================================================
// BLOCK STATEMENT
// =============================================================================

class BlockStatementDeclaration extends StatementDeclaration {
  final List<StatementDeclaration> statements;

  BlockStatementDeclaration({
    required this.statements,
    required SourceLocation location,
  }) : super(type: StatementType.block, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'statements': statements.map((s) => s.toJson()).toList(),
        'location': location.toJson(),
      };

  factory BlockStatementDeclaration.fromJson(Map<String, dynamic> json) {
    return BlockStatementDeclaration(
      statements: (json['statements'] as List)
          .map((s) => StatementDeclaration.fromJson(s))
          .toList(),
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// BREAK STATEMENT
// =============================================================================

class BreakStatementDeclaration extends StatementDeclaration {
  final String? label;

  BreakStatementDeclaration({
    this.label,
    required SourceLocation location,
  }) : super(type: StatementType.breakStatement, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'label': label,
        'location': location.toJson(),
      };

  factory BreakStatementDeclaration.fromJson(Map<String, dynamic> json) {
    return BreakStatementDeclaration(
      label: json['label'],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// CONTINUE STATEMENT
// =============================================================================

class ContinueStatementDeclaration extends StatementDeclaration {
  final String? label;

  ContinueStatementDeclaration({
    this.label,
    required SourceLocation location,
  }) : super(type: StatementType.continueStatement, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'label': label,
        'location': location.toJson(),
      };

  factory ContinueStatementDeclaration.fromJson(Map<String, dynamic> json) {
    return ContinueStatementDeclaration(
      label: json['label'],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// THROW STATEMENT
// =============================================================================

class ThrowStatementDeclaration extends StatementDeclaration {
  final ExpressionDeclaration expression;

  ThrowStatementDeclaration({
    required this.expression,
    required SourceLocation location,
  }) : super(type: StatementType.throwStatement, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'expression': expression.toJson(),
        'location': location.toJson(),
      };

  factory ThrowStatementDeclaration.fromJson(Map<String, dynamic> json) {
    return ThrowStatementDeclaration(
      expression: ExpressionDeclaration.fromJson(json['expression']),
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// ASSERT STATEMENT
// =============================================================================

class AssertStatementDeclaration extends StatementDeclaration {
  final ExpressionDeclaration condition;
  final ExpressionDeclaration? message;

  AssertStatementDeclaration({
    required this.condition,
    this.message,
    required SourceLocation location,
  }) : super(type: StatementType.assertStatement, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'condition': condition.toJson(),
        'message': message?.toJson(),
        'location': location.toJson(),
      };

  factory AssertStatementDeclaration.fromJson(Map<String, dynamic> json) {
    return AssertStatementDeclaration(
      condition: ExpressionDeclaration.fromJson(json['condition']),
      message: json['message'] != null
          ? ExpressionDeclaration.fromJson(json['message'])
          : null,
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// EXPRESSIONS
// =============================================================================

/// Base class for all expression Declaration nodes
abstract class ExpressionDeclaration {
  final ExpressionType type;
  final SourceLocation location;

  ExpressionDeclaration({
    required this.type,
    required this.location,
  });

  Map<String, dynamic> toJson();

  factory ExpressionDeclaration.fromJson(Map<String, dynamic> json) {
    final type = ExpressionType.values.firstWhere(
      (t) => t.toString() == json['type'],
      orElse: () => ExpressionType.unknown,
    );

    switch (type) {
      case ExpressionType.literal:
        return LiteralExpressionDeclaration.fromJson(json);
      case ExpressionType.identifier:
        return IdentifierExpressionDeclaration.fromJson(json);
      case ExpressionType.binaryOperation:
        return BinaryOperationDeclaration.fromJson(json);
      case ExpressionType.unaryOperation:
        return UnaryOperationDeclaration.fromJson(json);
      case ExpressionType.methodCall:
        return MethodCallDeclaration.fromJson(json);
      case ExpressionType.propertyAccess:
        return PropertyAccessDeclaration.fromJson(json);
      case ExpressionType.instanceCreation:
        return InstanceCreationDeclaration.fromJson(json);
      case ExpressionType.listLiteral:
        return ListLiteralDeclaration.fromJson(json);
      case ExpressionType.mapLiteral:
        return MapLiteralDeclaration.fromJson(json);
      case ExpressionType.conditionalExpression:
        return ConditionalExpressionDeclaration.fromJson(json);
      case ExpressionType.functionExpression:
        return FunctionExpressionDeclaration.fromJson(json);
      case ExpressionType.assignment:
        return AssignmentExpressionDeclaration.fromJson(json);
      case ExpressionType.awaitExpression:
        return AwaitExpressionDeclaration.fromJson(json);
      case ExpressionType.indexAccess:
        return IndexAccessDeclaration.fromJson(json);
      case ExpressionType.thisExpression:
        return ThisExpressionDeclaration.fromJson(json);
      case ExpressionType.superExpression:
        return SuperExpressionDeclaration.fromJson(json);
      case ExpressionType.cascade:
        return CascadeExpressionDeclaration.fromJson(json);
      case ExpressionType.isExpression:
        return IsExpressionDeclaration.fromJson(json);
      case ExpressionType.asExpression:
        return AsExpressionDeclaration.fromJson(json);
      default:
        throw UnimplementedError('Unknown expression type: $type');
    }
  }
}

enum ExpressionType {
  literal,
  identifier,
  binaryOperation,
  unaryOperation,
  methodCall,
  propertyAccess,
  instanceCreation,
  listLiteral,
  mapLiteral,
  setLiteral,
  conditionalExpression,
  functionExpression,
  assignment,
  awaitExpression,
  indexAccess,
  thisExpression,
  superExpression,
  nullLiteral,
  cascade,
  isExpression,
  asExpression,
  throwExpression,
  unknown,
}

// =============================================================================
// LITERAL EXPRESSION
// =============================================================================

class LiteralExpressionDeclaration extends ExpressionDeclaration {
  final dynamic value;
  final LiteralType literalType;

  LiteralExpressionDeclaration({
    required this.value,
    required this.literalType,
    required SourceLocation location,
  }) : super(type: ExpressionType.literal, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'value': value,
        'literalType': literalType.toString(),
        'location': location.toJson(),
      };

  factory LiteralExpressionDeclaration.fromJson(Map<String, dynamic> json) {
    return LiteralExpressionDeclaration(
      value: json['value'],
      literalType: LiteralType.values.firstWhere(
        (t) => t.toString() == json['literalType'],
        orElse: () => LiteralType.unknown,
      ),
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

enum LiteralType {
  string,
  integer,
  double,
  boolean,
  nullLiteral,
  unknown,
}

// =============================================================================
// IDENTIFIER EXPRESSION
// =============================================================================

class IdentifierExpressionDeclaration extends ExpressionDeclaration {
  final String name;

  IdentifierExpressionDeclaration({
    required this.name,
    required SourceLocation location,
  }) : super(type: ExpressionType.identifier, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'name': name,
        'location': location.toJson(),
      };

  factory IdentifierExpressionDeclaration.fromJson(Map<String, dynamic> json) {
    return IdentifierExpressionDeclaration(
      name: json['name'],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// BINARY OPERATION
// =============================================================================

class BinaryOperationDeclaration extends ExpressionDeclaration {
  final ExpressionDeclaration left;
  final String operator;
  final ExpressionDeclaration right;

  BinaryOperationDeclaration({
    required this.left,
    required this.operator,
    required this.right,
    required SourceLocation location,
  }) : super(type: ExpressionType.binaryOperation, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'left': left.toJson(),
        'operator': operator,
        'right': right.toJson(),
        'location': location.toJson(),
      };

  factory BinaryOperationDeclaration.fromJson(Map<String, dynamic> json) {
    return BinaryOperationDeclaration(
      left: ExpressionDeclaration.fromJson(json['left']),
      operator: json['operator'],
      right: ExpressionDeclaration.fromJson(json['right']),
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// UNARY OPERATION
// =============================================================================

class UnaryOperationDeclaration extends ExpressionDeclaration {
  final String operator;
  final ExpressionDeclaration operand;
  final bool isPrefix;

  UnaryOperationDeclaration({
    required this.operator,
    required this.operand,
    this.isPrefix = true,
    required SourceLocation location,
  }) : super(type: ExpressionType.unaryOperation, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'operator': operator,
        'operand': operand.toJson(),
        'isPrefix': isPrefix,
        'location': location.toJson(),
      };

  factory UnaryOperationDeclaration.fromJson(Map<String, dynamic> json) {
    return UnaryOperationDeclaration(
      operator: json['operator'],
      operand: ExpressionDeclaration.fromJson(json['operand']),
      isPrefix: json['isPrefix'] ?? true,
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// METHOD CALL
// =============================================================================

class MethodCallDeclaration extends ExpressionDeclaration {
  final ExpressionDeclaration? target;
  final String methodName;
  final List<ExpressionDeclaration> arguments;
  final Map<String, ExpressionDeclaration> namedArguments;
  final List<String>? typeArguments;

  MethodCallDeclaration({
    this.target,
    required this.methodName,
    this.arguments = const [],
    this.namedArguments = const {},
    this.typeArguments,
    required SourceLocation location,
  }) : super(type: ExpressionType.methodCall, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'target': target?.toJson(),
        'methodName': methodName,
        'arguments': arguments.map((a) => a.toJson()).toList(),
        'namedArguments':
            namedArguments.map((k, v) => MapEntry(k, v.toJson())),
        'typeArguments': typeArguments,
        'location': location.toJson(),
      };

  factory MethodCallDeclaration.fromJson(Map<String, dynamic> json) {
    return MethodCallDeclaration(
      target: json['target'] != null
          ? ExpressionDeclaration.fromJson(json['target'])
          : null,
      methodName: json['methodName'],
      arguments: (json['arguments'] as List?)
              ?.map((a) => ExpressionDeclaration.fromJson(a))
              .toList() ??
          [],
      namedArguments: (json['namedArguments'] as Map<String, dynamic>?)
              ?.map((k, v) => MapEntry(k, ExpressionDeclaration.fromJson(v))) ??
          {},
      typeArguments: (json['typeArguments'] as List?)?.cast<String>(),
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// PROPERTY ACCESS
// =============================================================================

class PropertyAccessDeclaration extends ExpressionDeclaration {
  final ExpressionDeclaration target;
  final String propertyName;
  final bool isNullAware;

  PropertyAccessDeclaration({
    required this.target,
    required this.propertyName,
    this.isNullAware = false,
    required SourceLocation location,
  }) : super(type: ExpressionType.propertyAccess, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'target': target.toJson(),
        'propertyName': propertyName,
        'isNullAware': isNullAware,
        'location': location.toJson(),
      };

  factory PropertyAccessDeclaration.fromJson(Map<String, dynamic> json) {
    return PropertyAccessDeclaration(
      target: ExpressionDeclaration.fromJson(json['target']),
      propertyName: json['propertyName'],
      isNullAware: json['isNullAware'] ?? false,
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// INSTANCE CREATION
// =============================================================================

class InstanceCreationDeclaration extends ExpressionDeclaration {
  final String className;
  final String? constructorName;
  final List<ExpressionDeclaration> arguments;
  final Map<String, ExpressionDeclaration> namedArguments;
  final List<String>? typeArguments;
  final bool isConst;

  InstanceCreationDeclaration({
    required this.className,
    this.constructorName,
    this.arguments = const [],
    this.namedArguments = const {},
    this.typeArguments,
    this.isConst = false,
    required SourceLocation location,
  }) : super(type: ExpressionType.instanceCreation, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'className': className,
        'constructorName': constructorName,
        'arguments': arguments.map((a) => a.toJson()).toList(),
        'namedArguments':
            namedArguments.map((k, v) => MapEntry(k, v.toJson())),
        'typeArguments': typeArguments,
        'isConst': isConst,
        'location': location.toJson(),
      };

  factory InstanceCreationDeclaration.fromJson(Map<String, dynamic> json) {
    return InstanceCreationDeclaration(
      className: json['className'],
      constructorName: json['constructorName'],
      arguments: (json['arguments'] as List?)
              ?.map((a) => ExpressionDeclaration.fromJson(a))
              .toList() ??
          [],
      namedArguments: (json['namedArguments'] as Map<String, dynamic>?)
              ?.map((k, v) => MapEntry(k, ExpressionDeclaration.fromJson(v))) ??
          {},
      typeArguments: (json['typeArguments'] as List?)?.cast<String>(),
      isConst: json['isConst'] ?? false,
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// LIST LITERAL
// =============================================================================

class ListLiteralDeclaration extends ExpressionDeclaration {
  final List<ExpressionDeclaration> elements;
  final String? typeArgument;
  final bool isConst;

  ListLiteralDeclaration({
    required this.elements,
    this.typeArgument,
    this.isConst = false,
    required SourceLocation location,
  }) : super(type: ExpressionType.listLiteral, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'elements': elements.map((e) => e.toJson()).toList(),
        'typeArgument': typeArgument,
        'isConst': isConst,
        'location': location.toJson(),
      };

  factory ListLiteralDeclaration.fromJson(Map<String, dynamic> json) {
    return ListLiteralDeclaration(
      elements: (json['elements'] as List)
          .map((e) => ExpressionDeclaration.fromJson(e))
          .toList(),
      typeArgument: json['typeArgument'],
      isConst: json['isConst'] ?? false,
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// MAP LITERAL
// =============================================================================

class MapLiteralDeclaration extends ExpressionDeclaration {
  final List<MapEntryDeclaration> entries;
  final String? keyType;
  final String? valueType;
  final bool isConst;

  MapLiteralDeclaration({
    required this.entries,
    this.keyType,
    this.valueType,
    this.isConst = false,
    required SourceLocation location,
  }) : super(type: ExpressionType.mapLiteral, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'entries': entries.map((e) => e.toJson()).toList(),
        'keyType': keyType,
        'valueType': valueType,
        'isConst': isConst,
        'location': location.toJson(),
      };

  factory MapLiteralDeclaration.fromJson(Map<String, dynamic> json) {
    return MapLiteralDeclaration(
      entries: (json['entries'] as List)
          .map((e) => MapEntryDeclaration.fromJson(e))
          .toList(),
      keyType: json['keyType'],
      valueType: json['valueType'],
      isConst: json['isConst'] ?? false,
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

class MapEntryDeclaration {
  final ExpressionDeclaration key;
  final ExpressionDeclaration value;

  MapEntryDeclaration({
    required this.key,
    required this.value,
  });

  Map<String, dynamic> toJson() => {
        'key': key.toJson(),
        'value': value.toJson(),
      };

  factory MapEntryDeclaration.fromJson(Map<String, dynamic> json) {
    return MapEntryDeclaration(
      key: ExpressionDeclaration.fromJson(json['key']),
      value: ExpressionDeclaration.fromJson(json['value']),
    );
  }
}

// =============================================================================
// CONDITIONAL EXPRESSION (Ternary)
// =============================================================================

class ConditionalExpressionDeclaration extends ExpressionDeclaration {
  final ExpressionDeclaration condition;
  final ExpressionDeclaration thenExpression;
  final ExpressionDeclaration elseExpression;

  ConditionalExpressionDeclaration({
    required this.condition,
    required this.thenExpression,
    required this.elseExpression,
    required SourceLocation location,
  }) : super(type: ExpressionType.conditionalExpression, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'condition': condition.toJson(),
        'thenExpression': thenExpression.toJson(),
        'elseExpression': elseExpression.toJson(),
        'location': location.toJson(),
      };

  factory ConditionalExpressionDeclaration.fromJson(Map<String, dynamic> json) {
    return ConditionalExpressionDeclaration(
      condition: ExpressionDeclaration.fromJson(json['condition']),
      thenExpression: ExpressionDeclaration.fromJson(json['thenExpression']),
      elseExpression: ExpressionDeclaration.fromJson(json['elseExpression']),
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// FUNCTION EXPRESSION (Lambda/Closure)
// =============================================================================

class FunctionExpressionDeclaration extends ExpressionDeclaration {
  final List<ParameterDeclaration> parameters;
  final StatementDeclaration? body;
  final ExpressionDeclaration? expressionBody;
  final bool isAsync;
  final bool isGenerator;

  FunctionExpressionDeclaration({
    this.parameters = const [],
    this.body,
    this.expressionBody,
    this.isAsync = false,
    this.isGenerator = false,
    required SourceLocation location,
  }) : super(type: ExpressionType.functionExpression, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'parameters': parameters.map((p) => p.toJson()).toList(),
        'body': body?.toJson(),
        'expressionBody': expressionBody?.toJson(),
        'isAsync': isAsync,
        'isGenerator': isGenerator,
        'location': location.toJson(),
      };

  factory FunctionExpressionDeclaration.fromJson(Map<String, dynamic> json) {
    return FunctionExpressionDeclaration(
      parameters: (json['parameters'] as List?)
              ?.map((p) => ParameterDeclaration.fromJson(p))
              .toList() ??
          [],
      body: json['body'] != null ? StatementDeclaration.fromJson(json['body']) : null,
      expressionBody: json['expressionBody'] != null
          ? ExpressionDeclaration.fromJson(json['expressionBody'])
          : null,
      isAsync: json['isAsync'] ?? false,
      isGenerator: json['isGenerator'] ?? false,
      location: SourceLocation.fromJson(json['location']),
    );
  }
}



// =============================================================================
// ASSIGNMENT EXPRESSION
// =============================================================================

class AssignmentExpressionDeclaration extends ExpressionDeclaration {
  final ExpressionDeclaration target;
  final String operator; // =, +=, -=, *=, /=, etc.
  final ExpressionDeclaration value;

  AssignmentExpressionDeclaration({
    required this.target,
    required this.operator,
    required this.value,
    required SourceLocation location,
  }) : super(type: ExpressionType.assignment, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'target': target.toJson(),
        'operator': operator,
        'value': value.toJson(),
        'location': location.toJson(),
      };

  factory AssignmentExpressionDeclaration.fromJson(Map<String, dynamic> json) {
    return AssignmentExpressionDeclaration(
      target: ExpressionDeclaration.fromJson(json['target']),
      operator: json['operator'],
      value: ExpressionDeclaration.fromJson(json['value']),
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// AWAIT EXPRESSION
// =============================================================================

class AwaitExpressionDeclaration extends ExpressionDeclaration {
  final ExpressionDeclaration expression;

  AwaitExpressionDeclaration({
    required this.expression,
    required SourceLocation location,
  }) : super(type: ExpressionType.awaitExpression, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'expression': expression.toJson(),
        'location': location.toJson(),
      };

  factory AwaitExpressionDeclaration.fromJson(Map<String, dynamic> json) {
    return AwaitExpressionDeclaration(
      expression: ExpressionDeclaration.fromJson(json['expression']),
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// INDEX ACCESS (e.g., array[0])
// =============================================================================

class IndexAccessDeclaration extends ExpressionDeclaration {
  final ExpressionDeclaration target;
  final ExpressionDeclaration index;

  IndexAccessDeclaration({
    required this.target,
    required this.index,
    required SourceLocation location,
  }) : super(type: ExpressionType.indexAccess, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'target': target.toJson(),
        'index': index.toJson(),
        'location': location.toJson(),
      };

  factory IndexAccessDeclaration.fromJson(Map<String, dynamic> json) {
    return IndexAccessDeclaration(
      target: ExpressionDeclaration.fromJson(json['target']),
      index: ExpressionDeclaration.fromJson(json['index']),
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// THIS EXPRESSION
// =============================================================================

class ThisExpressionDeclaration extends ExpressionDeclaration {
  ThisExpressionDeclaration({
    required SourceLocation location,
  }) : super(type: ExpressionType.thisExpression, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'location': location.toJson(),
      };

  factory ThisExpressionDeclaration.fromJson(Map<String, dynamic> json) {
    return ThisExpressionDeclaration(
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// SUPER EXPRESSION
// =============================================================================

class SuperExpressionDeclaration extends ExpressionDeclaration {
  SuperExpressionDeclaration({
    required SourceLocation location,
  }) : super(type: ExpressionType.superExpression, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'location': location.toJson(),
      };

  factory SuperExpressionDeclaration.fromJson(Map<String, dynamic> json) {
    return SuperExpressionDeclaration(
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// CASCADE EXPRESSION (e.g., object..method1()..method2())
// =============================================================================

class CascadeExpressionDeclaration extends ExpressionDeclaration {
  final ExpressionDeclaration target;
  final List<ExpressionDeclaration> cascadeSections;

  CascadeExpressionDeclaration({
    required this.target,
    required this.cascadeSections,
    required SourceLocation location,
  }) : super(type: ExpressionType.cascade, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'target': target.toJson(),
        'cascadeSections': cascadeSections.map((c) => c.toJson()).toList(),
        'location': location.toJson(),
      };

  factory CascadeExpressionDeclaration.fromJson(Map<String, dynamic> json) {
    return CascadeExpressionDeclaration(
      target: ExpressionDeclaration.fromJson(json['target']),
      cascadeSections: (json['cascadeSections'] as List)
          .map((c) => ExpressionDeclaration.fromJson(c))
          .toList(),
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// IS EXPRESSION (type check)
// =============================================================================

class IsExpressionDeclaration extends ExpressionDeclaration {
  final ExpressionDeclaration expression;
  final String checkedType;
  final bool isNegated;

  IsExpressionDeclaration({
    required this.expression,
    required this.checkedType,
    this.isNegated = false,
    required SourceLocation location,
  }) : super(type: ExpressionType.isExpression, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'expression': expression.toJson(),
        'checkedType': checkedType,
        'isNegated': isNegated,
        'location': location.toJson(),
      };

  factory IsExpressionDeclaration.fromJson(Map<String, dynamic> json) {
    return IsExpressionDeclaration(
      expression: ExpressionDeclaration.fromJson(json['expression']),
      checkedType: json['checkedType'],
      isNegated: json['isNegated'] ?? false,
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// AS EXPRESSION (type cast)
// =============================================================================

class AsExpressionDeclaration extends ExpressionDeclaration {
  final ExpressionDeclaration expression;
  final String targetType;

  AsExpressionDeclaration({
    required this.expression,
    required this.targetType,
    required SourceLocation location,
  }) : super(type: ExpressionType.asExpression, location: location);

  @override
  Map<String, dynamic> toJson() => {
        'type': type.toString(),
        'expression': expression.toJson(),
        'targetType': targetType,
        'location': location.toJson(),
      };

  factory AsExpressionDeclaration.fromJson(Map<String, dynamic> json) {
    return AsExpressionDeclaration(
      expression: ExpressionDeclaration.fromJson(json['expression']),
      targetType: json['targetType'],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

