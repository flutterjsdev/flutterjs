import 'package:flutterjs_core/flutterjs_core.dart';

import '../../ast_ir/ir/expression_types/cascade_expression_ir.dart';

mixin ExpressionWriter {
  void writeByte(int value);
  void writeUint32(int value);
  void writeInt64(int value);
  void writeDouble(double value);
  int _getStringRef(String str);
  void writeType(TypeIR type);
  void writeSourceLocation(SourceLocationIR location);

  void writeExpression(ExpressionIR expr) {
    if (expr is LiteralExpressionIR) {
      writeByte(BinaryConstants.EXPR_LITERAL);
      _writeLiteralExpression(expr);
    } else if (expr is IdentifierExpressionIR) {
      writeByte(BinaryConstants.EXPR_IDENTIFIER);
      writeUint32(_getStringRef(expr.name));
    } else if (expr is BinaryExpressionIR) {
      writeByte(BinaryConstants.EXPR_BINARY);
      _writeBinaryExpression(expr);
    } else if (expr is MethodCallExpressionIR) {
      writeByte(BinaryConstants.EXPR_METHOD_CALL);
      _writeMethodCallExpression(expr);
    } else if (expr is PropertyAccessExpressionIR) {
      writeByte(BinaryConstants.EXPR_PROPERTY_ACCESS);
      _writePropertyAccessExpression(expr);
    } else if (expr is ConditionalExpressionIR) {
      writeByte(BinaryConstants.EXPR_CONDITIONAL);
      _writeConditionalExpression(expr);
    } else if (expr is ListExpressionIR) {
      writeByte(BinaryConstants.EXPR_LIST_LITERAL);
      _writeListLiteralExpression(expr);
    } else if (expr is MapExpressionIR) {
      writeByte(BinaryConstants.EXPR_MAP_LITERAL);
      _writeMapLiteralExpression(expr);
    } else if (expr is SetExpressionIR) {
      writeByte(BinaryConstants.EXPR_SET_LITERAL);
      _writeSetExpression(expr);
    } else if (expr is UnaryExpressionIR) {
      writeByte(BinaryConstants.EXPR_UNARY);
      _writeUnaryExpression(expr);
    } else if (expr is CompoundAssignmentExpressionIR) {
      writeByte(BinaryConstants.EXPR_COMPOUND_ASSIGNMENT);
      _writeCompoundAssignmentExpression(expr);
    } else if (expr is AssignmentExpressionIR) {
      writeByte(BinaryConstants.EXPR_ASSIGNMENT);
      _writeAssignmentExpression(expr);
    } else if (expr is IndexAccessExpressionIR) {
      writeByte(BinaryConstants.EXPR_INDEX_ACCESS);
      _writeIndexAccessExpression(expr);
    } else if (expr is CascadeExpressionIR) {
      writeByte(BinaryConstants.EXPR_CASCADE);
      _writeCascadeExpression(expr);
    } else if (expr is CastExpressionIR) {
      writeByte(BinaryConstants.EXPR_CAST);
      _writeCastExpression(expr);
    } else if (expr is TypeCheckExpr) {
      writeByte(BinaryConstants.EXPR_TYPE_CHECK);
      writeTypeCheckExpression(expr);
    } else if (expr is AwaitExpr) {
      writeByte(BinaryConstants.EXPR_AWAIT);
      _writeAwaitExpression(expr);
    } else if (expr is ThrowExpr) {
      writeByte(BinaryConstants.EXPR_THROW);
      _writeThrowExpression(expr);
    } else if (expr is NullAwareAccessExpressionIR) {
      writeByte(BinaryConstants.EXPR_NULL_AWARE);
      _writeNullAwareAccessExpression(expr);
    } else if (expr is NullCoalescingExpressionIR) {
      writeByte(BinaryConstants.OP_NULL_COALESCE);
      _writeNullCoalescingExpression(expr);
    } else if (expr is FunctionCallExpr) {
      writeByte(BinaryConstants.EXPR_FUNCTION_CALL);
      _writeFunctionCallExpression(expr);
    } else if (expr is StringInterpolationExpressionIR) {
      writeByte(BinaryConstants.EXPR_STRING_INTERPOLATION);
      _writeStringInterpolationExpression(expr);
    } else if (expr is InstanceCreationExpressionIR) {
      writeByte(BinaryConstants.EXPR_INSTANCE_CREATION);
      _writeInstanceCreationExpression(expr);
    } else if (expr is LambdaExpr) {
      writeByte(BinaryConstants.EXPR_LAMBDA);
      _writeLambdaExpression(expr);
    } else if (expr is ThisExpressionIR) {
      writeByte(BinaryConstants.EXPR_THIS);
      _writeThisExpression(expr);
    } else if (expr is SuperExpressionIR) {
      writeByte(BinaryConstants.EXPR_SUPER);
      _writeSuperExpression(expr);
    } else if (expr is ParenthesizedExpressionIR) {
      writeByte(BinaryConstants.EXPR_PARENTHESIZED);
      _writeParenthesizedExpression(expr);
    } else {
      writeByte(BinaryConstants.EXPR_UNKNOWN);
    }
  }

  void _writeLiteralExpression(LiteralExpressionIR expr) {
    writeByte(expr.literalType.index);
    switch (expr.literalType) {
      case LiteralType.stringValue:
        writeUint32(_getStringRef(expr.value as String));
        break;
      case LiteralType.intValue:
        writeInt64(int.parse(expr.value.toString()));
        break;
      case LiteralType.doubleValue:
        writeDouble(double.parse(expr.value.toString()));
        break;
      case LiteralType.boolValue:
        writeByte((expr.value as bool) ? 1 : 0);
        break;
      case LiteralType.nullValue:
        break;
      default:
        break;
    }
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeBinaryExpression(BinaryExpressionIR expr) {
    writeExpression(expr.left);
    writeByte(expr.operator.index);
    writeExpression(expr.right);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeUnaryExpression(UnaryExpressionIR expr) {
    writeByte(expr.operator.index);
    writeExpression(expr.operand);
    writeByte(expr.isPrefix ? 1 : 0);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeCompoundAssignmentExpression(CompoundAssignmentExpressionIR expr) {
    writeExpression(expr.target);
    writeByte(expr.operator.index);
    writeExpression(expr.value);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeAssignmentExpression(AssignmentExpressionIR expr) {
    writeExpression(expr.target);
    writeExpression(expr.value);
    writeSourceLocation(expr.sourceLocation);
    writeType(expr.resultType);
  }

  void _writeIndexAccessExpression(IndexAccessExpressionIR expr) {
    writeExpression(expr.target);
    writeExpression(expr.index);
    writeType(expr.resultType);
    writeByte(expr.isNullAware ? 1 : 0);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeCascadeExpression(CascadeExpressionIR expr) {
    writeExpression(expr.target);
    writeUint32(expr.cascadeSections.length);
    for (final section in expr.cascadeSections) {
      writeExpression(section);
    }
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeCastExpression(CastExpressionIR expr) {
    writeExpression(expr.expression);
    writeType(expr.targetType);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeTypeCheckExpression(TypeCheckExpr expr) {
    writeExpression(expr.expression);
    writeType(expr.typeToCheck);
    writeByte(expr.isNegated ? 1 : 0);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeAwaitExpression(AwaitExpr expr) {
    writeExpression(expr.futureExpression);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeThrowExpression(ThrowExpr expr) {
    writeExpression(expr.exceptionExpression);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeNullAwareAccessExpression(NullAwareAccessExpressionIR expr) {
    writeExpression(expr.target);
    writeByte(expr.operationType.index);
    writeByte(expr.operationData != null ? 1 : 0);
    if (expr.operationData != null) {
      writeUint32(_getStringRef(expr.operationData!));
    }
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeNullCoalescingExpression(NullCoalescingExpressionIR expr) {
    writeExpression(expr.left);
    writeExpression(expr.right);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeMethodCallExpression(MethodCallExpressionIR expr) {
    writeByte(expr.target != null ? 1 : 0);
    if (expr.target != null) {
      writeExpression(expr.target!);
    }
    writeUint32(_getStringRef(expr.methodName));
    writeUint32(expr.arguments.length);
    for (final arg in expr.arguments) {
      writeExpression(arg);
    }
    writeUint32(expr.namedArguments.length);
    for (final entry in expr.namedArguments.entries) {
      writeUint32(_getStringRef(entry.key));
      writeExpression(entry.value);
    }
    writeByte(expr.isNullAware ? 1 : 0);
    writeByte(expr.isCascade ? 1 : 0);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeFunctionCallExpression(FunctionCallExpr expr) {
    writeUint32(_getStringRef(expr.functionName));
    writeUint32(expr.arguments.length);
    for (final arg in expr.arguments) {
      writeExpression(arg);
    }
    writeUint32(expr.namedArguments.length);
    for (final entry in expr.namedArguments.entries) {
      writeUint32(_getStringRef(entry.key));
      writeExpression(entry.value);
    }
    writeUint32(expr.typeArguments.length);
    for (final typeArg in expr.typeArguments) {
      writeType(typeArg);
    }
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeInstanceCreationExpression(InstanceCreationExpressionIR expr) {
    writeType(expr.type);
    writeByte(expr.constructorName != null ? 1 : 0);
    if (expr.constructorName != null) {
      writeUint32(_getStringRef(expr.constructorName!));
    }
    writeByte(expr.isConst ? 1 : 0);
    writeUint32(expr.arguments.length);
    for (final arg in expr.arguments) {
      writeExpression(arg);
    }
    writeUint32(expr.namedArguments.length);
    for (final entry in expr.namedArguments.entries) {
      writeUint32(_getStringRef(entry.key));
      writeExpression(entry.value);
    }
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeLambdaExpression(LambdaExpr expr) {
    writeUint32(expr.parameters.length);
    for (final param in expr.parameters) {
      writeUint32(_getStringRef(param.id));
      writeUint32(_getStringRef(param.name));
      writeType(param.type);
      writeByte(param.isRequired ? 1 : 0);
      writeByte(param.isNamed ? 1 : 0);
      writeByte(param.isOptional ? 1 : 0);
      writeByte(param.defaultValue != null ? 1 : 0);
      if (param.defaultValue != null) {
        writeExpression(param.defaultValue!);
      }
      writeSourceLocation(param.sourceLocation);
    }
    writeByte(expr.body != null ? 1 : 0);
    if (expr.body != null) {
      writeExpression(expr.body!);
    }
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeStringInterpolationExpression(
    StringInterpolationExpressionIR expr,
  ) {
    writeUint32(expr.parts.length);
    for (final part in expr.parts) {
      writeByte(part.isExpression ? 1 : 0);
      if (part.isExpression) {
        writeExpression(part.expression!);
      } else {
        writeUint32(_getStringRef(part.text!));
      }
    }
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writePropertyAccessExpression(PropertyAccessExpressionIR expr) {
    writeExpression(expr.target);
    writeUint32(_getStringRef(expr.propertyName));
    writeByte(expr.isNullAware ? 1 : 0);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeConditionalExpression(ConditionalExpressionIR expr) {
    writeExpression(expr.condition);
    writeExpression(expr.thenExpression);
    writeExpression(expr.elseExpression);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeListLiteralExpression(ListExpressionIR expr) {
    writeUint32(expr.elements.length);
    for (final elem in expr.elements) {
      writeExpression(elem);
    }
    writeByte(expr.isConst ? 1 : 0);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeMapLiteralExpression(MapExpressionIR expr) {
    writeUint32(expr.entries.length);
    for (final entry in expr.entries) {
      writeExpression(entry.key);
      writeExpression(entry.value);
    }
    writeByte(expr.isConst ? 1 : 0);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeSetExpression(SetExpressionIR expr) {
    writeUint32(expr.elements.length);
    for (final elem in expr.elements) {
      writeExpression(elem);
    }
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeThisExpression(ThisExpressionIR expr) {
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeSuperExpression(SuperExpressionIR expr) {
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void _writeParenthesizedExpression(ParenthesizedExpressionIR expr) {
    writeExpression(expr.innerExpression);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }
}
