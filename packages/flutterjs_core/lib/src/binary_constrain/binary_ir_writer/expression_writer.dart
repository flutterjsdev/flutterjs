import 'package:flutterjs_core/flutterjs_core.dart';

import '../../ast_ir/ir/expression_types/cascade_expression_ir.dart';
import 'ir_relationship_registry.dart';

// ============================================================================
// FILE: expression_writer.dart (UPDATED)
// Widget tracking integrated into expression writing
// ============================================================================

mixin ExpressionWriter {
  void writeByte(int value);
  void writeUint32(int value);
  void writeInt64(int value);
  void writeDouble(double value);
  int getStringRef(String str);
  void writeType(TypeIR type);
  void writeSourceLocation(SourceLocationIR location);

  // ✓ NEW: Access to relationship registry and string collection

  void addString(String str);

  void writeExpression(ExpressionIR expr);

  // ✓ UPDATED: Widget tracking added
  void writeInstanceCreationExpression(InstanceCreationExpressionIR expr) {
    writeType(expr.type);

    // ✓ TRACK: Capture widget class name
    final widgetClassName = expr.type.displayName();
    addString(widgetClassName);

    writeByte(expr.constructorName != null ? 1 : 0);
    if (expr.constructorName != null) {
      writeUint32(getStringRef(expr.constructorName!));
    }

    writeByte(expr.isConst ? 1 : 0);

    writeUint32(expr.arguments.length);
    for (final arg in expr.arguments) {
      writeExpression(arg);
    }

    writeUint32(expr.namedArguments.length);
    for (final entry in expr.namedArguments.entries) {
      // ✓ TRACK: Named parameters like "child", "children", "body"
      addString(entry.key);
      writeUint32(getStringRef(entry.key));
      writeExpression(entry.value);
    }

    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeLiteralExpression(LiteralExpressionIR expr) {
    writeByte(expr.literalType.index);
    switch (expr.literalType) {
      case LiteralType.stringValue:
        writeUint32(getStringRef(expr.value as String));
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

  void writeBinaryExpression(BinaryExpressionIR expr) {
    writeExpression(expr.left);
    writeByte(expr.operator.index);
    writeExpression(expr.right);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeUnaryExpression(UnaryExpressionIR expr) {
    writeByte(expr.operator.index);
    writeExpression(expr.operand);
    writeByte(expr.isPrefix ? 1 : 0);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeCompoundAssignmentExpression(CompoundAssignmentExpressionIR expr) {
    writeExpression(expr.target);
    writeByte(expr.operator.index);
    writeExpression(expr.value);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeAssignmentExpression(AssignmentExpressionIR expr) {
    writeExpression(expr.target);
    writeExpression(expr.value);
    writeSourceLocation(expr.sourceLocation);
    writeType(expr.resultType);
  }

  void writeIndexAccessExpression(IndexAccessExpressionIR expr) {
    writeExpression(expr.target);
    writeExpression(expr.index);
    writeType(expr.resultType);
    writeByte(expr.isNullAware ? 1 : 0);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeCascadeExpression(CascadeExpressionIR expr) {
    writeExpression(expr.target);
    writeUint32(expr.cascadeSections.length);
    for (final section in expr.cascadeSections) {
      writeExpression(section);
    }
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeCastExpression(CastExpressionIR expr) {
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

  void writeAwaitExpression(AwaitExpr expr) {
    writeExpression(expr.futureExpression);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeThrowExpression(ThrowExpr expr) {
    writeExpression(expr.exceptionExpression);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeNullAwareAccessExpression(NullAwareAccessExpressionIR expr) {
    writeExpression(expr.target);
    writeByte(expr.operationType.index);
    writeByte(expr.operationData != null ? 1 : 0);
    if (expr.operationData != null) {
      writeUint32(getStringRef(expr.operationData!));
    }
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeNullCoalescingExpression(NullCoalescingExpressionIR expr) {
    writeExpression(expr.left);
    writeExpression(expr.right);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeMethodCallExpression(MethodCallExpressionIR expr) {
    writeByte(expr.target != null ? 1 : 0);
    if (expr.target != null) {
      writeExpression(expr.target!);
    }
    writeUint32(getStringRef(expr.methodName));
    writeUint32(expr.arguments.length);
    for (final arg in expr.arguments) {
      writeExpression(arg);
    }
    writeUint32(expr.namedArguments.length);
    for (final entry in expr.namedArguments.entries) {
      writeUint32(getStringRef(entry.key));
      writeExpression(entry.value);
    }
    writeByte(expr.isNullAware ? 1 : 0);
    writeByte(expr.isCascade ? 1 : 0);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeFunctionCallExpression(FunctionCallExpr expr) {
    writeUint32(getStringRef(expr.functionName));
    writeUint32(expr.arguments.length);
    for (final arg in expr.arguments) {
      writeExpression(arg);
    }
    writeUint32(expr.namedArguments.length);
    for (final entry in expr.namedArguments.entries) {
      writeUint32(getStringRef(entry.key));
      writeExpression(entry.value);
    }
    writeUint32(expr.typeArguments.length);
    for (final typeArg in expr.typeArguments) {
      writeType(typeArg);
    }
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeStringInterpolationExpression(
    StringInterpolationExpressionIR expr,
  ) {
    writeUint32(expr.parts.length);
    for (final part in expr.parts) {
      writeByte(part.isExpression ? 1 : 0);
      if (part.isExpression) {
        writeExpression(part.expression!);
      } else {
        writeUint32(getStringRef(part.text!));
      }
    }
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writePropertyAccessExpression(PropertyAccessExpressionIR expr) {
    writeExpression(expr.target);
    writeUint32(getStringRef(expr.propertyName));
    writeByte(expr.isNullAware ? 1 : 0);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeConditionalExpression(ConditionalExpressionIR expr) {
    writeExpression(expr.condition);
    writeExpression(expr.thenExpression);
    writeExpression(expr.elseExpression);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeListLiteralExpression(ListExpressionIR expr) {
    writeUint32(expr.elements.length);
    for (final elem in expr.elements) {
      writeExpression(elem);
    }
    writeByte(expr.isConst ? 1 : 0);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeMapLiteralExpression(MapExpressionIR expr) {
    writeUint32(expr.entries.length);
    for (final entry in expr.entries) {
      writeExpression(entry.key);
      writeExpression(entry.value);
    }
    writeByte(expr.isConst ? 1 : 0);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeSetExpression(SetExpressionIR expr) {
    writeUint32(expr.elements.length);
    for (final elem in expr.elements) {
      writeExpression(elem);
    }
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeThisExpression(ThisExpressionIR expr) {
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeSuperExpression(SuperExpressionIR expr) {
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeParenthesizedExpression(ParenthesizedExpressionIR expr) {
    writeExpression(expr.innerExpression);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
  }

  void writeLambdaExpression(LambdaExpr expr) {
    writeUint32(expr.parameters.length);
    for (final param in expr.parameters) {
      writeUint32(getStringRef(param.id));
      writeUint32(getStringRef(param.name));
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
}
