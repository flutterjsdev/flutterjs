import 'package:flutterjs_core/flutterjs_core.dart';

import '../../ast_ir/ir/expression_types/cascade_expression_ir.dart';

mixin ExpressionWriter {
  void _writeByte(int value);
  void _writeUint32(int value);
  void _writeInt64(int value);
  void _writeDouble(double value);
  int _getStringRef(String str);
  void writeType(TypeIR type);
  void _writeSourceLocation(SourceLocationIR location);

  void writeExpression(ExpressionIR expr) {
    if (expr is LiteralExpressionIR) {
      _writeByte(BinaryConstants.EXPR_LITERAL);
      _writeLiteralExpression(expr);
    } else if (expr is IdentifierExpressionIR) {
      _writeByte(BinaryConstants.EXPR_IDENTIFIER);
      _writeUint32(_getStringRef(expr.name));
    } else if (expr is BinaryExpressionIR) {
      _writeByte(BinaryConstants.EXPR_BINARY);
      _writeBinaryExpression(expr);
    } else if (expr is MethodCallExpressionIR) {
      _writeByte(BinaryConstants.EXPR_METHOD_CALL);
      _writeMethodCallExpression(expr);
    } else if (expr is PropertyAccessExpressionIR) {
      _writeByte(BinaryConstants.EXPR_PROPERTY_ACCESS);
      _writePropertyAccessExpression(expr);
    } else if (expr is ConditionalExpressionIR) {
      _writeByte(BinaryConstants.EXPR_CONDITIONAL);
      _writeConditionalExpression(expr);
    } else if (expr is ListExpressionIR) {
      _writeByte(BinaryConstants.EXPR_LIST_LITERAL);
      _writeListLiteralExpression(expr);
    } else if (expr is MapExpressionIR) {
      _writeByte(BinaryConstants.EXPR_MAP_LITERAL);
      _writeMapLiteralExpression(expr);
    } else if (expr is SetExpressionIR) {
      _writeByte(BinaryConstants.EXPR_SET_LITERAL);
      _writeSetExpression(expr);
    } else if (expr is UnaryExpressionIR) {
      _writeByte(BinaryConstants.EXPR_UNARY);
      _writeUnaryExpression(expr);
    } else if (expr is CompoundAssignmentExpressionIR) {
      _writeByte(BinaryConstants.EXPR_COMPOUND_ASSIGNMENT);
      _writeCompoundAssignmentExpression(expr);
    } else if (expr is AssignmentExpressionIR) {
      _writeByte(BinaryConstants.EXPR_ASSIGNMENT);
      _writeAssignmentExpression(expr);
    } else if (expr is IndexAccessExpressionIR) {
      _writeByte(BinaryConstants.EXPR_INDEX_ACCESS);
      _writeIndexAccessExpression(expr);
    } else if (expr is CascadeExpressionIR) {
      _writeByte(BinaryConstants.EXPR_CASCADE);
      _writeCascadeExpression(expr);
    } else if (expr is CastExpressionIR) {
      _writeByte(BinaryConstants.EXPR_CAST);
      _writeCastExpression(expr);
    } else if (expr is TypeCheckExpr) {
      _writeByte(BinaryConstants.EXPR_TYPE_CHECK);
      writeTypeCheckExpression(expr);
    } else if (expr is AwaitExpr) {
      _writeByte(BinaryConstants.EXPR_AWAIT);
      _writeAwaitExpression(expr);
    } else if (expr is ThrowExpr) {
      _writeByte(BinaryConstants.EXPR_THROW);
      _writeThrowExpression(expr);
    } else if (expr is NullAwareAccessExpressionIR) {
      _writeByte(BinaryConstants.EXPR_NULL_AWARE);
      _writeNullAwareAccessExpression(expr);
    } else if (expr is NullCoalescingExpressionIR) {
      _writeByte(BinaryConstants.OP_NULL_COALESCE);
      _writeNullCoalescingExpression(expr);
    } else if (expr is FunctionCallExpr) {
      _writeByte(BinaryConstants.EXPR_FUNCTION_CALL);
      _writeFunctionCallExpression(expr);
    } else if (expr is StringInterpolationExpressionIR) {
      _writeByte(BinaryConstants.EXPR_STRING_INTERPOLATION);
      _writeStringInterpolationExpression(expr);
    } else if (expr is InstanceCreationExpressionIR) {
      _writeByte(BinaryConstants.EXPR_INSTANCE_CREATION);
      _writeInstanceCreationExpression(expr);
    } else if (expr is LambdaExpr) {
      _writeByte(BinaryConstants.EXPR_LAMBDA);
      _writeLambdaExpression(expr);
    } else if (expr is ThisExpressionIR) {
      _writeByte(BinaryConstants.EXPR_THIS);
      _writeThisExpression(expr);
    } else if (expr is SuperExpressionIR) {
      _writeByte(BinaryConstants.EXPR_SUPER);
      _writeSuperExpression(expr);
    } else if (expr is ParenthesizedExpressionIR) {
      _writeByte(BinaryConstants.EXPR_PARENTHESIZED);
      _writeParenthesizedExpression(expr);
    } else {
      _writeByte(BinaryConstants.EXPR_UNKNOWN);
    }
  }

  void _writeLiteralExpression(LiteralExpressionIR expr) {
    _writeByte(expr.literalType.index);
    switch (expr.literalType) {
      case LiteralType.stringValue:
        _writeUint32(_getStringRef(expr.value as String));
        break;
      case LiteralType.intValue:
        _writeInt64(int.parse(expr.value.toString()));
        break;
      case LiteralType.doubleValue:
        _writeDouble(double.parse(expr.value.toString()));
        break;
      case LiteralType.boolValue:
        _writeByte((expr.value as bool) ? 1 : 0);
        break;
      case LiteralType.nullValue:
        break;
      default:
        break;
    }
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeBinaryExpression(BinaryExpressionIR expr) {
    writeExpression(expr.left);
    _writeByte(expr.operator.index);
    writeExpression(expr.right);
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeUnaryExpression(UnaryExpressionIR expr) {
    _writeByte(expr.operator.index);
    writeExpression(expr.operand);
    _writeByte(expr.isPrefix ? 1 : 0);
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeCompoundAssignmentExpression(CompoundAssignmentExpressionIR expr) {
    writeExpression(expr.target);
    _writeByte(expr.operator.index);
    writeExpression(expr.value);
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeAssignmentExpression(AssignmentExpressionIR expr) {
    writeExpression(expr.target);
    writeExpression(expr.value);
    _writeSourceLocation(expr.sourceLocation);
    writeType(expr.resultType);
  }

  void _writeIndexAccessExpression(IndexAccessExpressionIR expr) {
    writeExpression(expr.target);
    writeExpression(expr.index);
    writeType(expr.resultType);
    _writeByte(expr.isNullAware ? 1 : 0);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeCascadeExpression(CascadeExpressionIR expr) {
    writeExpression(expr.target);
    _writeUint32(expr.cascadeSections.length);
    for (final section in expr.cascadeSections) {
      writeExpression(section);
    }
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeCastExpression(CastExpressionIR expr) {
    writeExpression(expr.expression);
    writeType(expr.targetType);
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void writeTypeCheckExpression(TypeCheckExpr expr) {
    writeExpression(expr.expression);
    writeType(expr.typeToCheck);
    _writeByte(expr.isNegated ? 1 : 0);
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeAwaitExpression(AwaitExpr expr) {
    writeExpression(expr.futureExpression);
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeThrowExpression(ThrowExpr expr) {
    writeExpression(expr.exceptionExpression);
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeNullAwareAccessExpression(NullAwareAccessExpressionIR expr) {
    writeExpression(expr.target);
    _writeByte(expr.operationType.index);
    _writeByte(expr.operationData != null ? 1 : 0);
    if (expr.operationData != null) {
      _writeUint32(_getStringRef(expr.operationData!));
    }
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeNullCoalescingExpression(NullCoalescingExpressionIR expr) {
    writeExpression(expr.left);
    writeExpression(expr.right);
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeMethodCallExpression(MethodCallExpressionIR expr) {
    _writeByte(expr.target != null ? 1 : 0);
    if (expr.target != null) {
      writeExpression(expr.target!);
    }
    _writeUint32(_getStringRef(expr.methodName));
    _writeUint32(expr.arguments.length);
    for (final arg in expr.arguments) {
      writeExpression(arg);
    }
    _writeUint32(expr.namedArguments.length);
    for (final entry in expr.namedArguments.entries) {
      _writeUint32(_getStringRef(entry.key));
      writeExpression(entry.value);
    }
    _writeByte(expr.isNullAware ? 1 : 0);
    _writeByte(expr.isCascade ? 1 : 0);
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeFunctionCallExpression(FunctionCallExpr expr) {
    _writeUint32(_getStringRef(expr.functionName));
    _writeUint32(expr.arguments.length);
    for (final arg in expr.arguments) {
      writeExpression(arg);
    }
    _writeUint32(expr.namedArguments.length);
    for (final entry in expr.namedArguments.entries) {
      _writeUint32(_getStringRef(entry.key));
      writeExpression(entry.value);
    }
    _writeUint32(expr.typeArguments.length);
    for (final typeArg in expr.typeArguments) {
      writeType(typeArg);
    }
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeInstanceCreationExpression(InstanceCreationExpressionIR expr) {
    writeType(expr.type);
    _writeByte(expr.constructorName != null ? 1 : 0);
    if (expr.constructorName != null) {
      _writeUint32(_getStringRef(expr.constructorName!));
    }
    _writeByte(expr.isConst ? 1 : 0);
    _writeUint32(expr.arguments.length);
    for (final arg in expr.arguments) {
      writeExpression(arg);
    }
    _writeUint32(expr.namedArguments.length);
    for (final entry in expr.namedArguments.entries) {
      _writeUint32(_getStringRef(entry.key));
      writeExpression(entry.value);
    }
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeLambdaExpression(LambdaExpr expr) {
    _writeUint32(expr.parameters.length);
    for (final param in expr.parameters) {
      _writeUint32(_getStringRef(param.id));
      _writeUint32(_getStringRef(param.name));
      writeType(param.type);
      _writeByte(param.isRequired ? 1 : 0);
      _writeByte(param.isNamed ? 1 : 0);
      _writeByte(param.isOptional ? 1 : 0);
      _writeByte(param.defaultValue != null ? 1 : 0);
      if (param.defaultValue != null) {
        writeExpression(param.defaultValue!);
      }
      _writeSourceLocation(param.sourceLocation);
    }
    _writeByte(expr.body != null ? 1 : 0);
    if (expr.body != null) {
      writeExpression(expr.body!);
    }
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeStringInterpolationExpression(
    StringInterpolationExpressionIR expr,
  ) {
    _writeUint32(expr.parts.length);
    for (final part in expr.parts) {
      _writeByte(part.isExpression ? 1 : 0);
      if (part.isExpression) {
        writeExpression(part.expression!);
      } else {
        _writeUint32(_getStringRef(part.text!));
      }
    }
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writePropertyAccessExpression(PropertyAccessExpressionIR expr) {
    writeExpression(expr.target);
    _writeUint32(_getStringRef(expr.propertyName));
    _writeByte(expr.isNullAware ? 1 : 0);
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeConditionalExpression(ConditionalExpressionIR expr) {
    writeExpression(expr.condition);
    writeExpression(expr.thenExpression);
    writeExpression(expr.elseExpression);
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeListLiteralExpression(ListExpressionIR expr) {
    _writeUint32(expr.elements.length);
    for (final elem in expr.elements) {
      writeExpression(elem);
    }
    _writeByte(expr.isConst ? 1 : 0);
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeMapLiteralExpression(MapExpressionIR expr) {
    _writeUint32(expr.entries.length);
    for (final entry in expr.entries) {
      writeExpression(entry.key);
      writeExpression(entry.value);
    }
    _writeByte(expr.isConst ? 1 : 0);
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeSetExpression(SetExpressionIR expr) {
    _writeUint32(expr.elements.length);
    for (final elem in expr.elements) {
      writeExpression(elem);
    }
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeThisExpression(ThisExpressionIR expr) {
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeSuperExpression(SuperExpressionIR expr) {
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeParenthesizedExpression(ParenthesizedExpressionIR expr) {
    writeExpression(expr.innerExpression);
    writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }
}
