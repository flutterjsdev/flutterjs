import 'dart:typed_data';

import 'package:flutterjs_core/flutterjs_core.dart';

import '../../ast_ir/ir/expression_types/cascade_expression_ir.dart';

mixin DeclarationWriter {
  void _writeByte(int value);
  void _writeUint32(int value);
  int _getStringRef(String str);
  void _addString(String str);
  void writeType(TypeIR type);

  void _writeSourceLocation(SourceLocationIR location);
  void writeExpression(ExpressionIR expr);
  void printlog(String str);
  BytesBuilder get _buffer;

  void writeClassDecl(ClassDecl classDecl) {
    printlog('[WRITE CLASS] START - buffer: ${_buffer.length}');

    _writeUint32(_getStringRef(classDecl.id));
    printlog('[WRITE CLASS] After id: ${_buffer.length}');

    _writeUint32(_getStringRef(classDecl.name));
    printlog('[WRITE CLASS] After name: ${_buffer.length}');

    _writeByte(classDecl.isAbstract ? 1 : 0);
    printlog('[WRITE CLASS] After isAbstract: ${_buffer.length}');

    _writeByte(classDecl.isFinal ? 1 : 0);
    printlog('[WRITE CLASS] After isFinal: ${_buffer.length}');

    // Superclass
    _writeByte(classDecl.superclass != null ? 1 : 0);
    printlog('[WRITE CLASS] After hasSuperclass: ${_buffer.length}');

    if (classDecl.superclass != null) {
      writeType(classDecl.superclass!);
    }
    printlog('[WRITE CLASS] After superclass: ${_buffer.length}');

    // Interfaces
    _writeUint32(classDecl.interfaces.length);
    printlog('[WRITE CLASS] After interfaceCount: ${_buffer.length}');

    for (final iface in classDecl.interfaces) {
      writeType(iface);
    }
    printlog('[WRITE CLASS] After interfaces: ${_buffer.length}');

    // Mixins
    _writeUint32(classDecl.mixins.length);
    printlog('[WRITE CLASS] After mixinCount: ${_buffer.length}');

    for (final mixin in classDecl.mixins) {
      writeType(mixin);
    }
    printlog('[WRITE CLASS] After mixins: ${_buffer.length}');

    // Fields
    _writeUint32(classDecl.fields.length);
    printlog('[WRITE CLASS] After fieldCount: ${_buffer.length}');

    for (final field in classDecl.fields) {
      writeFieldDecl(field);
    }
    printlog('[WRITE CLASS] After fields: ${_buffer.length}');

    // Methods
    _writeUint32(classDecl.methods.length);
    printlog('[WRITE CLASS] After methodCount: ${_buffer.length}');

    for (final method in classDecl.methods) {
      writeMethodDecl(method);
    }
    printlog('[WRITE CLASS] After methods: ${_buffer.length}');

    // Constructors
    _writeUint32(classDecl.constructors.length);
    printlog('[WRITE CLASS] After constructorCount: ${_buffer.length}');

    for (final constructor in classDecl.constructors) {
      writeConstructorDecl(constructor);
    }
    printlog('[WRITE CLASS] After constructors: ${_buffer.length}');

    _writeSourceLocation(classDecl.sourceLocation);
    printlog('[WRITE CLASS] After sourceLocation: ${_buffer.length}');
    printlog('[WRITE CLASS] END');
  }

  void writeFieldDecl(FieldDecl field) {
    _writeUint32(_getStringRef(field.id));
    _writeUint32(_getStringRef(field.name));
    writeType(field.type);

    _writeByte(field.isFinal ? 1 : 0);
    _writeByte(field.isConst ? 1 : 0);
    _writeByte(field.isStatic ? 1 : 0);
    _writeByte(field.isLate ? 1 : 0);
    _writeByte(field.isPrivate ? 1 : 0);

    _writeByte(field.initializer != null ? 1 : 0);
    if (field.initializer != null) {
      writeExpression(field.initializer!);
    }

    _writeSourceLocation(field.sourceLocation);
  }

  void writeMethodDecl(MethodDecl method) {
    printlog('[WRITE CLASS Method] Start: ${_buffer.length}');

    _writeUint32(_getStringRef(method.id));
    printlog('[WRITE CLASS Method] after id: ${_buffer.length}');

    _writeUint32(_getStringRef(method.name));
    printlog('[WRITE CLASS Method] after name: ${_buffer.length}');

    writeType(method.returnType);
    printlog('[WRITE CLASS Method] after returnType: ${_buffer.length}');

    _writeByte(method.isAsync ? 1 : 0);
    printlog('[WRITE CLASS Method] after isAsync: ${_buffer.length}');

    _writeByte(method.isGenerator ? 1 : 0);
    printlog('[WRITE CLASS Method] after isGenerator: ${_buffer.length}');

    _writeByte(method.isStatic ? 1 : 0);
    printlog('[WRITE CLASS Method] after isStatic: ${_buffer.length}');

    _writeByte(method.isAbstract ? 1 : 0);
    printlog('[WRITE CLASS Method] after isAbstract: ${_buffer.length}');

    _writeByte(method.isGetter ? 1 : 0);
    printlog('[WRITE CLASS Method] after isGetter: ${_buffer.length}');

    _writeByte(method.isSetter ? 1 : 0);
    printlog('[WRITE CLASS Method] after isSetter: ${_buffer.length}');

    // CRITICAL: Write parameter count BEFORE loop
    _writeUint32(method.parameters.length);
    printlog(
      '[WRITE CLASS Method] after paramCount: ${_buffer.length} (count: ${method.parameters.length})',
    );

    // CRITICAL: Now write each parameter
    for (final param in method.parameters) {
      writeParameterDecl(param);
    }
    printlog('[WRITE CLASS Method] after parameters loop: ${_buffer.length}');

    _writeSourceLocation(method.sourceLocation);
    printlog('[WRITE CLASS Method] after sourceLocation: ${_buffer.length}');

    printlog('[WRITE CLASS Method] END\n');
  }

  void writeAnnotation(AnnotationIR ann) {
    _writeUint32(_getStringRef(ann.name));

    // Write positional arguments
    _writeUint32(ann.arguments.length);
    for (final arg in ann.arguments) {
      writeExpression(arg);
    }

    // Write named arguments
    _writeUint32(ann.namedArguments.length);
    for (final entry in ann.namedArguments.entries) {
      _writeUint32(_getStringRef(entry.key));
      writeExpression(entry.value);
    }

    // Write source location
    _writeSourceLocation(ann.sourceLocation);
  }

  void writeFunctionDecl(FunctionDecl func) {
    printlog(
      '[WRITE FUNCTION] START - ${func.name} at offset ${_buffer.length}',
    );

    // Write basic metadata
    _writeUint32(_getStringRef(func.id));
    _writeUint32(_getStringRef(func.name));
    _writeUint32(_getStringRef(func.returnType.displayName()));

    // Write flags (all boolean properties in one byte for efficiency)
    int flags = 0;
    if (func.isAsync) flags |= 0x01;
    if (func.isGenerator) flags |= 0x02;
    if (func.isSyncGenerator) flags |= 0x04;
    if (func.isStatic) flags |= 0x08;
    if (func.isAbstract) flags |= 0x10;
    if (func.isGetter) flags |= 0x20;
    if (func.isSetter) flags |= 0x40;
    if (func.isOperator) flags |= 0x80;
    _writeByte(flags);

    // Write more flags (second byte)
    int flags2 = 0;
    if (func.isFactory) flags2 |= 0x01;
    if (func.isConst) flags2 |= 0x02;
    if (func.isExternal) flags2 |= 0x04;
    if (func.isLate) flags2 |= 0x08;
    if (func.documentation != null) flags2 |= 0x10;
    if (func is MethodDecl && func.markedOverride) flags2 |= 0x20;
    _writeByte(flags2);

    // Write visibility (1 byte: 0=public, 1=private, 2=protected)
    final visibilityValue = func.visibility == VisibilityModifier.private
        ? 1
        : 0;
    _writeByte(visibilityValue);

    printlog('[WRITE FUNCTION] After flags: ${_buffer.length}');

    // Write return type
    writeType(func.returnType);

    // Write documentation if present
    if (func.documentation != null) {
      _writeUint32(_getStringRef(func.documentation!));
    }

    // Write annotations
    _writeUint32(func.annotations.length);
    for (final ann in func.annotations) {
      writeAnnotation(ann);
    }
    printlog('[WRITE FUNCTION] After annotations: ${_buffer.length}');

    // Write type parameters
    _writeUint32(func.typeParameters.length);
    for (final tp in func.typeParameters) {
      _writeUint32(_getStringRef(tp.name));
      _writeByte(tp.bound != null ? 1 : 0);
      if (tp.bound != null) {
        writeType(tp.bound!);
      }
    }
    printlog('[WRITE FUNCTION] After type params: ${_buffer.length}');

    // Write parameters
    _writeUint32(func.parameters.length);
    for (final param in func.parameters) {
      writeParameterDecl(param);
    }
    printlog('[WRITE FUNCTION] After parameters: ${_buffer.length}');

    // Write source location
    _writeSourceLocation(func.sourceLocation);

    // Write constructor-specific data
    if (func is ConstructorDecl) {
      _writeByte(1); // Is constructor
      _writeUint32(_getStringRef(func.constructorClass ?? ''));
      _writeByte(func.constructorName != null ? 1 : 0);
      if (func.constructorName != null) {
        _writeUint32(_getStringRef(func.constructorName!));
      }

      // Write initializers
      _writeUint32(func.initializers.length);
      for (final init in func.initializers) {
        _writeUint32(_getStringRef(init.fieldName));
        _writeByte(init.isThisField ? 1 : 0);
        writeExpression(init.value);
        _writeSourceLocation(init.sourceLocation);
      }

      // Write super call
      _writeByte(func.superCall != null ? 1 : 0);
      if (func.superCall != null) {
        _writeByte(func.superCall!.constructorName != null ? 1 : 0);
        if (func.superCall!.constructorName != null) {
          _writeUint32(_getStringRef(func.superCall!.constructorName!));
        }
        _writeUint32(func.superCall!.arguments.length);
        for (final arg in func.superCall!.arguments) {
          writeExpression(arg);
        }
        _writeUint32(func.superCall!.namedArguments.length);
        for (final entry in func.superCall!.namedArguments.entries) {
          _writeUint32(_getStringRef(entry.key));
          writeExpression(entry.value);
        }
        _writeSourceLocation(func.superCall!.sourceLocation);
      }

      // Write redirected call
      _writeByte(func.redirectedCall != null ? 1 : 0);
      if (func.redirectedCall != null) {
        _writeByte(func.redirectedCall!.constructorName != null ? 1 : 0);
        if (func.redirectedCall!.constructorName != null) {
          _writeUint32(_getStringRef(func.redirectedCall!.constructorName!));
        }
        _writeUint32(func.redirectedCall!.arguments.length);
        for (final arg in func.redirectedCall!.arguments) {
          writeExpression(arg);
        }
        _writeUint32(func.redirectedCall!.namedArguments.length);
        for (final entry in func.redirectedCall!.namedArguments.entries) {
          _writeUint32(_getStringRef(entry.key));
          writeExpression(entry.value);
        }
        _writeSourceLocation(func.redirectedCall!.sourceLocation);
      }

      printlog('[WRITE FUNCTION] Constructor-specific data written');
    } else {
      _writeByte(0); // Not a constructor
    }

    // Write method-specific data
    if (func is MethodDecl) {
      _writeByte(1); // Is method
      _writeByte(func.className != null ? 1 : 0);
      if (func.className != null) {
        _writeUint32(_getStringRef(func.className!));
      }
      _writeByte(func.overriddenSignature != null ? 1 : 0);
      if (func.overriddenSignature != null) {
        _writeUint32(_getStringRef(func.overriddenSignature!));
      }
      printlog('[WRITE FUNCTION] Method-specific data written');
    } else {
      _writeByte(0); // Not a method
    }

    printlog('[WRITE FUNCTION] END - ${func.name} at offset ${_buffer.length}');
  }

  void writeConstructorDecl(ConstructorDecl constructor) {
    _writeUint32(_getStringRef(constructor.id));
    _writeUint32(_getStringRef(constructor.constructorClass ?? "<unknown>"));

    _writeByte(constructor.constructorName != null ? 1 : 0);
    if (constructor.constructorName != null) {
      _writeUint32(_getStringRef(constructor.constructorName!));
    }

    _writeByte(constructor.isConst ? 1 : 0);
    _writeByte(constructor.isFactory ? 1 : 0);

    _writeUint32(constructor.parameters.length);
    for (final param in constructor.parameters) {
      writeParameterDecl(param);
    }

    _writeSourceLocation(constructor.sourceLocation);
  }

  void writeParameterDecl(ParameterDecl param) {
    _writeUint32(_getStringRef(param.id));
    _writeUint32(_getStringRef(param.name));
    writeType(param.type);

    _writeByte(param.isRequired ? 1 : 0);
    _writeByte(param.isNamed ? 1 : 0);
    _writeByte(param.isPositional ? 1 : 0);

    _writeByte(param.defaultValue != null ? 1 : 0);
    if (param.defaultValue != null) {
      writeExpression(param.defaultValue!);
    }

    _writeSourceLocation(param.sourceLocation);
  }

  void writeAnalysisIssue(AnalysisIssue issue) {
    _writeUint32(_getStringRef(issue.id));
    _writeUint32(_getStringRef(issue.code));
    _writeUint32(_getStringRef(issue.message));

    _writeByte(issue.severity.index);
    _writeByte(issue.category.index);

    _writeByte(issue.suggestion != null ? 1 : 0);
    if (issue.suggestion != null) {
      _writeUint32(_getStringRef(issue.suggestion!));
    }

    _writeSourceLocation(issue.sourceLocation);
  }

  void collectStringsFromAnalysisIssues(DartFile fileIR) {
    for (final issue in fileIR.analysisIssues) {
      _addString(issue.id);
      _addString(issue.code);
      _addString(issue.message);
      if (issue.suggestion != null) {
        _addString(issue.suggestion!);
      }
      _addString(issue.sourceLocation.file);
    }
  }

  void collectStringsFromImport(ImportStmt import) {
    for (final ann in import.annotations) {
      _addString(ann.name);
      // Collect from annotation arguments recursively if needed
    }
  }

  void collectStringsFromClass(ClassDecl classDecl) {
    _addString(classDecl.id);
    _addString(classDecl.name);
    _addString(classDecl.sourceLocation.file); // ← ADD THIS
    if (classDecl.documentation != null) _addString(classDecl.documentation!);
    // ADD THIS - collect superclass type name
    if (classDecl.superclass != null) {
      _addString(classDecl.superclass!.displayName());
    }

    // ADD THIS - collect interface type names
    for (final iface in classDecl.interfaces) {
      _addString(iface.displayName());
    }

    // ADD THIS - collect mixin type names
    for (final mixin in classDecl.mixins) {
      _addString(mixin.displayName());
    }

    for (final field in classDecl.fields) {
      _addString(field.id);
      _addString(field.name);
      _addString(field.type.displayName());
      _addString(field.sourceLocation.file);
      if (field.initializer != null) {
        collectStringsFromExpression(field.initializer);
      }
    }

    for (final method in classDecl.methods) {
      _addString(method.id);
      _addString(method.name);
      _addString(method.returnType.displayName());
      _addString(method.sourceLocation.file);
      for (final param in method.parameters) {
        _addString(param.id);
        _addString(param.name);
        _addString(param.type.displayName());
        _addString(param.sourceLocation.file);
        if (param.defaultValue != null) {
          collectStringsFromExpression(param.defaultValue);
        }
      }
    }

    // Constructors
    for (final constructor in classDecl.constructors) {
      _addString(constructor.id);
      _addString(constructor.name);
      _addString(constructor.constructorClass ?? "<unknown>");
      if (constructor.constructorName != null) {
        _addString(constructor.constructorName!);
      }
      _addString(constructor.sourceLocation.file);

      // CRITICAL: Collect from constructor parameters
      for (final param in constructor.parameters) {
        _addString(param.id);
        _addString(param.name);
        _addString(param.type.displayName());
        _addString(param.sourceLocation.file);
        if (param.defaultValue != null) {
          collectStringsFromExpression(param.defaultValue);
        }
      }
    }
  }

  void collectStringsFromVariable(VariableDecl variable) {
    _addString(variable.id);
    _addString(variable.name);
    _addString(variable.type.displayName());
    _addString(variable.sourceLocation.file); // ← ADD THIS
    // ← ADD THIS: Collect from initializer
    if (variable.initializer != null) {
      collectStringsFromExpression(variable.initializer);
    }
  }

  void collectStringsFromExpression(ExpressionIR? expr) {
    if (expr == null) return;

    if (expr is LiteralExpressionIR) {
      if (expr.literalType == LiteralType.stringValue) {
        _addString(expr.value as String);
      }
    } else if (expr is IdentifierExpressionIR) {
      _addString(expr.name);
    } else if (expr is BinaryExpressionIR) {
      collectStringsFromExpression(expr.left);
      collectStringsFromExpression(expr.right);
    } else if (expr is MethodCallExpressionIR) {
      collectStringsFromExpression(expr.target);
      _addString(expr.methodName);
      for (final arg in expr.arguments) {
        collectStringsFromExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        collectStringsFromExpression(arg);
      }
    } else if (expr is PropertyAccessExpressionIR) {
      collectStringsFromExpression(expr.target);
      _addString(expr.propertyName);
    } else if (expr is ConditionalExpressionIR) {
      collectStringsFromExpression(expr.condition);
      collectStringsFromExpression(expr.thenExpression);
      collectStringsFromExpression(expr.elseExpression);
    } else if (expr is ListExpressionIR) {
      for (final elem in expr.elements) {
        collectStringsFromExpression(elem);
      }
    } else if (expr is MapExpressionIR) {
      for (final entry in expr.entries) {
        collectStringsFromExpression(entry.key);
        collectStringsFromExpression(entry.value);
      }
    } else if (expr is SetExpressionIR) {
      for (final elem in expr.elements) {
        collectStringsFromExpression(elem);
      }
    } else if (expr is IndexAccessExpressionIR) {
      collectStringsFromExpression(expr.target);
      collectStringsFromExpression(expr.index);
    } else if (expr is UnaryExpressionIR) {
      collectStringsFromExpression(expr.operand);
    } else if (expr is AssignmentExpressionIR) {
      collectStringsFromExpression(expr.target);
      collectStringsFromExpression(expr.value);
    } else if (expr is CastExpressionIR) {
      collectStringsFromExpression(expr.expression);
      _addString(expr.targetType.displayName());
    } else if (expr is TypeCheckExpr) {
      collectStringsFromExpression(expr.expression);
      _addString(expr.typeToCheck.displayName());
    } else if (expr is AwaitExpr) {
      collectStringsFromExpression(expr.futureExpression);
    } else if (expr is ThrowExpr) {
      collectStringsFromExpression(expr.exceptionExpression);
    } else if (expr is NullAwareAccessExpressionIR) {
      collectStringsFromExpression(expr.target);
      if (expr.operationData != null) {
        _addString(expr.operationData!);
      }
    } else if (expr is NullCoalescingExpressionIR) {
      collectStringsFromExpression(expr.left);
      collectStringsFromExpression(expr.right);
    } else if (expr is FunctionCallExpr) {
      _addString(expr.functionName);
      for (final arg in expr.arguments) {
        collectStringsFromExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        collectStringsFromExpression(arg);
      }
    } else if (expr is InstanceCreationExpressionIR) {
      _addString(expr.type.displayName());
      if (expr.constructorName != null) {
        _addString(expr.constructorName!);
      }
      for (final arg in expr.arguments) {
        collectStringsFromExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        collectStringsFromExpression(arg);
      }
    } else if (expr is LambdaExpr) {
      for (final param in expr.parameters) {
        _addString(param.id);
        _addString(param.name);
        _addString(param.type.displayName());
        if (param.defaultValue != null) {
          collectStringsFromExpression(param.defaultValue);
        }
        _addString(param.sourceLocation.file);
      }
      if (expr.body != null) {
        collectStringsFromExpression(expr.body);
      }
    } else if (expr is StringInterpolationExpressionIR) {
      for (final part in expr.parts) {
        if (part.isExpression) {
          collectStringsFromExpression(part.expression);
        } else {
          _addString(part.text!);
        }
      }
    }
  }
}
