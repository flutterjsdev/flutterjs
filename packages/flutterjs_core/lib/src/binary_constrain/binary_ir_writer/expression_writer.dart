import 'package:flutterjs_core/flutterjs_core.dart';

import '../../ir/expressions/cascade_expression_ir.dart';
import 'ir_relationship_registry.dart';

/// ============================================================================
/// expression_writer.dart
/// Expression Writer — Serializes Expression IR Nodes into Binary Format
/// ============================================================================
///
/// Handles the serialization of **all expression types** in the FlutterJS
/// Intermediate Representation.  
///
/// Expressions form the computational logic behind UI metadata:
/// - widget parameters
/// - conditional logic
/// - computed values
/// - callbacks
/// - mathematical/boolean operations
///
/// This writer produces a compact, schema-compliant binary encoding for each
/// expression node using the tags and rules defined in:
/// - `binary_constain.dart`  
/// - `string_collection.dart`  
///
/// Called internally by:
/// → `binary_ir_writer.dart`  
/// → `statement_writer.dart`  
/// → `declaration_writer.dart`  
///
///
/// # Purpose
///
/// Expressions are **the most complex and most frequently occurring IR nodes**.
/// The ExpressionWriter ensures that:
///
/// - each node is encoded deterministically  
/// - binary size remains small  
/// - the decoder can reconstruct the exact tree  
/// - all string identifiers reference the string table  
///
/// The output is a fully traversable expression tree stored in binary form.
///
///
/// # Responsibilities
///
/// ## 1. Write Expression Type Tags
///
/// Before writing the payload of any expression, the writer emits the tag:
///
/// ```dart
/// writer.writeUint8(expr.kindTag);
/// ```
///
/// Tags include:
/// - literal string  
/// - literal number  
/// - literal boolean  
/// - literal null  
/// - variable reference  
/// - property reference  
/// - unary op  
/// - binary op  
/// - function call  
/// - list literal  
/// - map literal  
///
///
/// ## 2. Literal Expressions
///
/// Example:
/// ```dart
/// "hello"  → (TAG_STRING + STRING_INDEX)
/// 42       → (TAG_NUMBER + double/int payload)
/// true     → (TAG_BOOL + 1)
/// null     → (TAG_NULL)
/// ```
///
///
/// ## 3. Variable & Property References
///
/// Writes:
/// - string index for variable name  
/// - optional parent object reference  
///
/// Ensures all strings exist in the string table beforehand.
///
///
/// ## 4. Unary Expressions
///
/// ```dart
/// !flag
/// -count
/// ~value
/// ```
///
/// Binary structure:
/// ```
/// [TAG_UNARY]
/// [OPERATOR_CODE]
/// [OPERAND_EXPRESSION]
/// ```
///
///
/// ## 5. Binary Expressions
///
/// ```dart
/// a + b
/// width >= 200
/// isDark && hasContrast
/// ```
///
/// Structure:
/// ```
/// [TAG_BINARY]
/// [OPERATOR_CODE]
/// [LEFT_EXPR]
/// [RIGHT_EXPR]
/// ```
///
///
/// ## 6. Function Call / Callback Expressions
///
/// Encodes:
/// - target expression (function reference)  
/// - positional arguments  
/// - named arguments  
///
/// This powers:
/// - onTap handlers  
/// - builder functions  
/// - closure wrappers  
///
///
/// ## 7. Collection Literals
///
/// ### List
/// ```dart
/// [1, 2, computeValue()]
/// ```
///
/// ### Map
/// ```dart
/// {"name": user.name, "age": 21}
/// ```
///
/// Writer encodes:
/// - element count  
/// - each item key/value recursively  
///
///
/// ## 8. Recursion Handling
///
/// The writer is fully recursive — each expression node calls back into:
///
/// ```dart
/// writeExpression(node.child);
/// ```
///
/// guaranteeing correct nested encoding.
///
///
/// # Binary Example
///
/// ```
/// TAG_BINARY
///   OP_ADD
///   TAG_VARIABLE("a")
///   TAG_LITERAL_NUMBER(10)
/// ```
///
///
/// # Integration
///
/// ```dart
/// final ew = ExpressionWriter(writer, strings);
/// ew.write(expr);
/// ```
///
/// Never called directly by end-users — only by higher-level writers.
///
///
/// # Error Handling
///
/// Throws on:
/// - encountering unsupported IR expression type  
/// - unknown operator  
/// - null operand for required expressions  
/// - invalid string-table reference  
///
///
/// # Notes
///
/// - Very performance-sensitive due to recursive traversal.
/// - Must mirror decoder structure exactly.
/// - Schema changes must be updated in both writer and reader.
/// - String interning must occur **before** writing expression payloads.
///
///
/// ============================================================================
///

mixin ExpressionWriter {
  void writeByte(int value);
  void writeUint32(int value);
  void writeInt64(int value);
  void writeDouble(double value);
  int getStringRef(String str);
  void writeType(TypeIR type);
  void writeSourceLocation(SourceLocationIR location);

  // ✓ NEW: Access to relationship registry and string collection

  void writeExpression(ExpressionIR expr);

  // ✅ HELPER: Write expression metadata consistently
  void _writeExpressionMetadata(ExpressionIR expr) {
    writeUint32(getStringRef(expr.id));
    writeType(expr.resultType);
    writeUint32(expr.metadata.length);
    for (final entry in expr.metadata.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value.toString()));
    }
  }

  // ✓ UPDATED: Widget tracking added
  void writeInstanceCreationExpression(InstanceCreationExpressionIR expr) {
    writeType(expr.type);

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
      writeUint32(getStringRef(entry.key));
      writeExpression(entry.value);
    }

    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
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
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writeUnaryExpression(UnaryExpressionIR expr) {
    writeByte(expr.operator.index);
    writeExpression(expr.operand);
    writeByte(expr.isPrefix ? 1 : 0);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writeCompoundAssignmentExpression(CompoundAssignmentExpressionIR expr) {
    writeExpression(expr.target);
    writeByte(expr.operator.index);
    writeExpression(expr.value);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writeAssignmentExpression(AssignmentExpressionIR expr) {
    writeExpression(expr.target);
    writeExpression(expr.value);
    writeSourceLocation(expr.sourceLocation);
    writeType(expr.resultType);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writeIndexAccessExpression(IndexAccessExpressionIR expr) {
    writeExpression(expr.target);
    writeExpression(expr.index);
    writeType(expr.resultType);
    writeByte(expr.isNullAware ? 1 : 0);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writeCascadeExpression(CascadeExpressionIR expr) {
    writeExpression(expr.target);
    writeUint32(expr.cascadeSections.length);
    for (final section in expr.cascadeSections) {
      writeExpression(section);
    }
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writeCastExpression(CastExpressionIR expr) {
    writeExpression(expr.expression);
    writeType(expr.targetType);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writeTypeCheckExpression(TypeCheckExpr expr) {
    writeExpression(expr.expression);
    writeType(expr.typeToCheck);
    writeByte(expr.isNegated ? 1 : 0);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writeAwaitExpression(AwaitExpr expr) {
    writeExpression(expr.futureExpression);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writeThrowExpression(ThrowExpr expr) {
    writeExpression(expr.exceptionExpression);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
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
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writeNullCoalescingExpression(NullCoalescingExpressionIR expr) {
    writeExpression(expr.left);
    writeExpression(expr.right);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
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
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
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
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
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
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writePropertyAccessExpression(PropertyAccessExpressionIR expr) {
    writeExpression(expr.target);
    writeUint32(getStringRef(expr.propertyName));
    writeByte(expr.isNullAware ? 1 : 0);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writeConditionalExpression(ConditionalExpressionIR expr) {
    writeExpression(expr.condition);
    writeExpression(expr.thenExpression);
    writeExpression(expr.elseExpression);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writeListLiteralExpression(ListExpressionIR expr) {
    writeUint32(expr.elements.length);
    for (final elem in expr.elements) {
      writeExpression(elem);
    }
    writeByte(expr.isConst ? 1 : 0);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
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
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writeSetExpression(SetExpressionIR expr) {
    writeUint32(expr.elements.length);
    for (final elem in expr.elements) {
      writeExpression(elem);
    }
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writeThisExpression(ThisExpressionIR expr) {
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writeSuperExpression(SuperExpressionIR expr) {
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }

  void writeParenthesizedExpression(ParenthesizedExpressionIR expr) {
    writeExpression(expr.innerExpression);
    writeType(expr.resultType);
    writeSourceLocation(expr.sourceLocation);
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
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
     _writeExpressionMetadata(expr);  // ✅ ADD THIS
  }
}
