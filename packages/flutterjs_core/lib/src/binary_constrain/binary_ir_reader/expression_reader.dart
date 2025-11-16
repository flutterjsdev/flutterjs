import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_core/src/ast_ir/ir/expression_types/cascade_expression_ir.dart';

mixin ExpressionReader {
  int readByte();
  SourceLocationIR readSourceLocation();
  String readStringRef();
  int readUint32();
  double readDouble();
  ParameterDecl readParameterDecl();
  int readInt64();

  TypeIR readType();

  ExpressionIR readExpression();

  LiteralExpressionIR readLiteralExpression() {
    final literalTypeIndex = readByte();
    final literalType = LiteralType.values[literalTypeIndex];

    dynamic value;
    switch (literalType) {
      case LiteralType.stringValue:
        value = readStringRef();
        break;
      case LiteralType.intValue:
        value = readInt64();
        break;
      case LiteralType.doubleValue:
        value = readDouble();
        break;
      case LiteralType.boolValue:
        value = readByte() != 0;
        break;
      case LiteralType.nullValue:
        value = null;
        break;
      default:
        value = null;
    }

    final sourceLocation = readSourceLocation();

    return LiteralExpressionIR(
      id: 'expr_lit_$value',
      resultType: DynamicTypeIR(
        id: 'type_dynamic',
        sourceLocation: sourceLocation,
      ),
      sourceLocation: sourceLocation,
      value: value,
      literalType: literalType,
    );
  }

  PropertyAccessExpressionIR readPropertyAccessExpression() {
    final target = readExpression();
    final propertyName = readStringRef();
    final sourceLocation = readSourceLocation();
    final resultType = readType();

    return PropertyAccessExpressionIR(
      resultType: resultType,
      id: 'expr_prop',
      target: target,
      propertyName: propertyName,
      sourceLocation: sourceLocation,
    );
  }

  ConditionalExpressionIR readConditionalExpression() {
    final condition = readExpression();
    final thenExpression = readExpression();
    final elseExpression = readExpression();
    final sourceLocation = readSourceLocation();
    final resultType = readType();

    return ConditionalExpressionIR(
      resultType: resultType,
      id: 'expr_cond',
      condition: condition,
      thenExpression: thenExpression,
      elseExpression: elseExpression,
      sourceLocation: sourceLocation,
    );
  }

  BinaryExpressionIR readBinaryExpression() {
    final left = readExpression();
    final operatorIndex = readByte();
    final operator = BinaryOperatorIR.values[operatorIndex];
    final right = readExpression();
    final resultType = readType();
    final sourceLocation = readSourceLocation();

    return BinaryExpressionIR(
      id: 'expr_bin',
      left: left,
      operator: operator,
      right: right,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  UnaryExpressionIR readUnaryExpression() {
    final operatorIndex = readByte();
    final operator = UnaryOperator.values[operatorIndex];
    final operand = readExpression();
    final resultType = readType();
    final sourceLocation = readSourceLocation();

    return UnaryExpressionIR(
      id: 'expr_unary',
      operator: operator,
      operand: operand,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  CompoundAssignmentExpressionIR readCompoundAssignmentExpression() {
    final target = readExpression();
    final operatorIndex = readByte();
    final operator = BinaryOperatorIR.values[operatorIndex];
    final value = readExpression();
    final resultType = readType();
    final sourceLocation = readSourceLocation();

    return CompoundAssignmentExpressionIR(
      id: 'expr_compound_assign',
      target: target,
      operator: operator,
      value: value,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  // --- Assignment & Access ---

  AssignmentExpressionIR readAssignmentExpression() {
    final target = readExpression();
    final value = readExpression();
    // final isCompound = readByte() != 0;
    final sourceLocation = readSourceLocation();
    final resultType = readType();
    return AssignmentExpressionIR(
      id: 'expr_assign',
      target: target,
      value: value,
      resultType: resultType,

      sourceLocation: sourceLocation,
    );
  }

  SetExpressionIR readSetLiteralExpression() {
    final elementCount = readUint32();
    final elements = <ExpressionIR>[];
    for (int i = 0; i < elementCount; i++) {
      elements.add(readExpression());
    }
    final elementType = readType();
    final sourceLocation = readSourceLocation();

    return SetExpressionIR(
      id: 'expr_set',
      elements: elements,
      resultType: elementType,

      // resultType: DynamicTypeIR(id: 'type_set', sourceLocation: sourceLocation),
      sourceLocation: sourceLocation,
    );
  }

  IndexAccessExpressionIR readIndexAccessExpression() {
    final target = readExpression();
    final index = readExpression();
    final resultType = readType();
    final isNullAware = readByte() != 0;
    final sourceLocation = readSourceLocation();

    return IndexAccessExpressionIR(
      id: 'expr_index',
      target: target,
      index: index,
      resultType: resultType,
      isNullAware: isNullAware,
      sourceLocation: sourceLocation,
    );
  }

  CascadeExpressionIR readCascadeExpression() {
    final target = readExpression();
    final sectionCount = readUint32();
    final cascadeSections = <ExpressionIR>[];
    for (int i = 0; i < sectionCount; i++) {
      cascadeSections.add(readExpression());
    }
    final sourceLocation = readSourceLocation();
    final resultType = readType();
    return CascadeExpressionIR(
      id: 'expr_cascade',
      target: target,
      cascadeSections: cascadeSections,
      sourceLocation: sourceLocation,
      resultType: resultType,
    );
  }

  // --- Type Operations ---

  CastExpressionIR readCastExpression() {
    final expression = readExpression();
    final targetType = readType();
    final sourceLocation = readSourceLocation();
    final resultType = readType();
    return CastExpressionIR(
      resultType: resultType,
      id: 'expr_cast',
      expression: expression,
      targetType: targetType,
      sourceLocation: sourceLocation,
    );
  }

  TypeCheckExpr readTypeCheckExpression() {
    final expression = readExpression();
    final checkType = readType();
    final isNegated = readByte() != 0;
    final sourceLocation = readSourceLocation();
    final resultType = readType();
    return TypeCheckExpr(
      id: 'expr_typecheck',
      expression: expression,
      typeToCheck: checkType,
      resultType: resultType,
      isNegated: isNegated,
      sourceLocation: sourceLocation,
    );
  }

  // --- Async Operations ---

  AwaitExpr readAwaitExpression() {
    final futureExpression = readExpression();
    final resultType = readType();
    final sourceLocation = readSourceLocation();

    return AwaitExpr(
      id: 'expr_await',
      futureExpression: futureExpression,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  ThrowExpr readThrowExpression() {
    final exception = readExpression();
    final sourceLocation = readSourceLocation();
    final resultType = readType();
    return ThrowExpr(
      id: 'expr_throw',
      // exception: exception,
      exceptionExpression: exception,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  // --- Null-Aware Operations ---

  NullAwareAccessExpressionIR readNullAwareAccessExpression() {
    final target = readExpression();
    final operationTypeIndex = readByte();
    final operationType = NullAwareOperationType.values[operationTypeIndex];
    final hasOperationData = readByte() != 0;
    final operationData = hasOperationData ? readStringRef() : null;
    final resultType = readType();
    final sourceLocation = readSourceLocation();

    return NullAwareAccessExpressionIR(
      id: 'expr_nullaware',
      target: target,
      operationType: operationType,
      operationData: operationData,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  NullCoalescingExpressionIR readNullCoalescingExpression() {
    final left = readExpression();
    final right = readExpression();
    final resultType = readType();
    final sourceLocation = readSourceLocation();

    return NullCoalescingExpressionIR(
      id: 'expr_nullcoalesce',
      left: left,
      right: right,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  // --- Function & Method Calls ---

  MethodCallExpressionIR readMethodCallExpression() {
    final hasTarget = readByte() != 0;
    ExpressionIR? target;
    if (hasTarget) {
      target = readExpression();
    }

    final methodName = readStringRef();

    final argCount = readUint32();
    final arguments = <ExpressionIR>[];
    for (int i = 0; i < argCount; i++) {
      arguments.add(readExpression());
    }

    final namedArgCount = readUint32();
    final namedArguments = <String, ExpressionIR>{};
    for (int i = 0; i < namedArgCount; i++) {
      final key = readStringRef();
      final value = readExpression();
      namedArguments[key] = value;
    }

    final isNullAware = readByte() != 0;
    final isCascade = readByte() != 0;
    final resultType = readType();
    final sourceLocation = readSourceLocation();

    return MethodCallExpressionIR(
      id: 'expr_method',
      target: target,
      methodName: methodName,
      arguments: arguments,
      namedArguments: namedArguments,
      isNullAware: isNullAware,
      isCascade: isCascade,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  FunctionCallExpr readFunctionCallExpression() {
    final functionName = readStringRef();

    final argCount = readUint32();
    final arguments = <ExpressionIR>[];
    for (int i = 0; i < argCount; i++) {
      arguments.add(readExpression());
    }

    final namedArgCount = readUint32();
    final namedArguments = <String, ExpressionIR>{};
    for (int i = 0; i < namedArgCount; i++) {
      final key = readStringRef();
      final value = readExpression();
      namedArguments[key] = value;
    }

    final typeArgCount = readUint32();
    final typeArguments = <TypeIR>[];
    for (int i = 0; i < typeArgCount; i++) {
      typeArguments.add(readType());
    }

    final resultType = readType();
    final sourceLocation = readSourceLocation();

    return FunctionCallExpr(
      id: 'expr_func_call',
      functionName: functionName,
      arguments: arguments,
      namedArguments: namedArguments,
      typeArguments: typeArguments,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  InstanceCreationExpressionIR readInstanceCreationExpression() {
    final type = readType();
    final hasConstructorName = readByte() != 0;
    final constructorName = hasConstructorName ? readStringRef() : null;
    final isConst = readByte() != 0;

    final argCount = readUint32();
    final arguments = <ExpressionIR>[];
    for (int i = 0; i < argCount; i++) {
      arguments.add(readExpression());
    }

    final namedArgCount = readUint32();
    final namedArguments = <String, ExpressionIR>{};
    for (int i = 0; i < namedArgCount; i++) {
      final key = readStringRef();
      final value = readExpression();
      namedArguments[key] = value;
    }

    final resultType = readType();
    final sourceLocation = readSourceLocation();

    return InstanceCreationExpressionIR(
      id: 'expr_instance_create',
      type: type,
      constructorName: constructorName,
      isConst: isConst,
      arguments: arguments,
      namedArguments: namedArguments,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  LambdaExpr readLambdaExpression() {
    final paramCount = readUint32();
    final parameters = <ParameterIR>[];
    for (int i = 0; i < paramCount; i++) {
      final paramDecl = readParameterDecl();
      // Convert ParameterDecl to ParameterIR
      parameters.add(
        ParameterIR(
          id: paramDecl.id,
          name: paramDecl.name,
          type: paramDecl.type,
          isRequired: paramDecl.isRequired,
          isNamed: paramDecl.isNamed,
          isOptional: !paramDecl.isRequired,
          defaultValue: paramDecl.defaultValue,
          sourceLocation: paramDecl.sourceLocation,
        ),
      );
    }

    final hasBody = readByte() != 0;
    ExpressionIR? body;
    if (hasBody) {
      body = readExpression();
    }

    final returnType = readType();
    final sourceLocation = readSourceLocation();

    return LambdaExpr(
      id: 'expr_lambda',
      parameters: parameters,
      body: body,
      resultType: returnType,
      sourceLocation: sourceLocation,
    );
  }

  // --- String Interpolation ---

  StringInterpolationExpressionIR readStringInterpolationExpression() {
    final partCount = readUint32();
    final parts = <StringInterpolationPart>[];
    for (int i = 0; i < partCount; i++) {
      final isExpression = readByte() != 0;
      if (isExpression) {
        parts.add(StringInterpolationPart.expression(readExpression()));
      } else {
        parts.add(StringInterpolationPart.text(readStringRef()));
      }
    }
    final resultType = readType();
    final sourceLocation = readSourceLocation();

    return StringInterpolationExpressionIR(
      id: 'expr_string_interp',
      parts: parts,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  // --- Identifiers & Access ---

  IdentifierExpressionIR readIdentifierExpression() {
    final name = readStringRef();
    final resultType = readType();
    final sourceLocation = readSourceLocation();

    return IdentifierExpressionIR(
      id: 'expr_id_$name',
      name: name,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  // --- Collections ---

  ListExpressionIR readListLiteralExpression() {
    final elementCount = readUint32();
    final elements = <ExpressionIR>[];
    for (int i = 0; i < elementCount; i++) {
      elements.add(readExpression());
    }

    final isConst = readByte() != 0;
    final resultType = readType();
    final sourceLocation = readSourceLocation();

    return ListExpressionIR(
      id: 'expr_list',
      elements: elements,

      isConst: isConst,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  // --- Special ---

  ThisExpressionIR readThisExpression() {
    final sourceLocation = readSourceLocation();
    final resultType = readType();
    return ThisExpressionIR(
      id: 'expr_this',
      sourceLocation: sourceLocation,
      resultType: resultType,
    );
  }

  SuperExpressionIR readSuperExpression() {
    final sourceLocation = readSourceLocation();
    final resultType = readType();
    return SuperExpressionIR(
      id: 'expr_super',
      sourceLocation: sourceLocation,
      resultType: resultType,
    );
  }

  ParenthesizedExpressionIR readParenthesizedExpression() {
    final innerExpression = readExpression();
    final sourceLocation = readSourceLocation();
    final resultType = readType();
    return ParenthesizedExpressionIR(
      id: 'expr_paren',
      innerExpression: innerExpression,
      sourceLocation: sourceLocation,
      resultType: resultType,
    );
  }
}
