import 'dart:typed_data';

import 'package:flutterjs_core/flutterjs_core.dart';

import '../../ast_ir/ir/expression_types/cascade_expression_ir.dart';

mixin DeclarationWriter {
  void writeByte(int value);
  void writeUint32(int value);
  int _getStringRef(String str);
  void _addString(String str);
  void writeType(TypeIR type);

  void writeSourceLocation(SourceLocationIR location);
  void writeExpression(ExpressionIR expr);
  void printlog(String str);
  void writeStatement(StatementIR stmt);
  
  BytesBuilder get _buffer;

  // ✅ Abstract method signatures that must be implemented by mixins
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
    } else if (expr is ThisExpressionIR) {
      // No strings to collect
    } else if (expr is SuperExpressionIR) {
      // No strings to collect
    } else if (expr is ParenthesizedExpressionIR) {
      collectStringsFromExpression(expr.innerExpression);
    } else if (expr is CompoundAssignmentExpressionIR) {
      collectStringsFromExpression(expr.target);
      collectStringsFromExpression(expr.value);
    } else if (expr is CascadeExpressionIR) {
      collectStringsFromExpression(expr.target);
      for (final section in expr.cascadeSections) {
        collectStringsFromExpression(section);
      }
    }
  }

  void collectStringsFromStatements(List<StatementIR>? stmts); // ✅ Nullable parameter

  // ✅ FIXED: Parameter is nullable to handle optional statements
  void collectStringsFromStatement(StatementIR? stmt) {
    if (stmt == null) return;

    if (stmt is ExpressionStmt) {
      collectStringsFromExpression(stmt.expression);
    } else if (stmt is VariableDeclarationStmt) {
      _addString(stmt.name);
      if (stmt.type != null) {
        _addString(stmt.type!.displayName());
      }
      if (stmt.initializer != null) {
        collectStringsFromExpression(stmt.initializer);
      }
    } else if (stmt is BlockStmt) {
      for (final s in stmt.statements) {
        collectStringsFromStatement(s);
      }
    } else if (stmt is IfStmt) {
      collectStringsFromExpression(stmt.condition);
      collectStringsFromStatement(stmt.thenBranch);
      // ✅ FIXED: elseBranch is nullable, pass without force unwrap
      collectStringsFromStatement(stmt.elseBranch);
    } else if (stmt is ForStmt) {
      if (stmt.initialization is VariableDeclarationStmt) {
        collectStringsFromStatement(
          stmt.initialization as VariableDeclarationStmt,
        );
      } else if (stmt.initialization is ExpressionIR) {
        collectStringsFromExpression(stmt.initialization as ExpressionIR);
      }
      if (stmt.condition != null) {
        collectStringsFromExpression(stmt.condition);
      }
      for (final update in stmt.updaters) {
        collectStringsFromExpression(update);
      }
      collectStringsFromStatement(stmt.body);
    } else if (stmt is ForEachStmt) {
      _addString(stmt.loopVariable);
      if (stmt.loopVariableType != null) {
        _addString(stmt.loopVariableType!.displayName());
      }
      collectStringsFromExpression(stmt.iterable);
      collectStringsFromStatement(stmt.body);
    } else if (stmt is WhileStmt) {
      collectStringsFromExpression(stmt.condition);
      collectStringsFromStatement(stmt.body);
    } else if (stmt is DoWhileStmt) {
      collectStringsFromStatement(stmt.body);
      collectStringsFromExpression(stmt.condition);
    } else if (stmt is SwitchStmt) {
      collectStringsFromExpression(stmt.expression);
      for (final switchCase in stmt.cases) {
        if (switchCase.patterns != null) {
          for (final pattern in switchCase.patterns!) {
            collectStringsFromExpression(pattern);
          }
        }
        for (final s in switchCase.statements) {
          collectStringsFromStatement(s);
        }
      }
      if (stmt.defaultCase != null) {
        for (final s in stmt.defaultCase!.statements) {
          collectStringsFromStatement(s);
        }
      }
    } else if (stmt is TryStmt) {
      collectStringsFromStatement(stmt.tryBlock);
      for (final catchClause in stmt.catchClauses) {
        if (catchClause.exceptionType != null) {
          _addString(catchClause.exceptionType!.displayName());
        }
        if (catchClause.exceptionParameter != null) {
          _addString(catchClause.exceptionParameter!);
        }
        if (catchClause.stackTraceParameter != null) {
          _addString(catchClause.stackTraceParameter!);
        }
        collectStringsFromStatement(catchClause.body);
      }
      // ✅ FIXED: finallyBlock is nullable, pass without force unwrap
      collectStringsFromStatement(stmt.finallyBlock);
    } else if (stmt is ReturnStmt) {
      if (stmt.expression != null) {
        collectStringsFromExpression(stmt.expression);
      }
    } else if (stmt is ThrowStmt) {
      collectStringsFromExpression(stmt.exceptionExpression);
    } else if (stmt is BreakStmt) {
      if (stmt.label != null) {
        _addString(stmt.label!);
      }
    } else if (stmt is ContinueStmt) {
      if (stmt.label != null) {
        _addString(stmt.label!);
      }
    } else if (stmt is LabeledStatementIR) {
      _addString(stmt.label);
      collectStringsFromStatement(stmt.statement);
    } else if (stmt is YieldStatementIR) {
      collectStringsFromExpression(stmt.value);
    } else if (stmt is FunctionDeclarationStatementIR) {
      collectStringsFromFunction(stmt.function);
    } else if (stmt is AssertStatementIR) {
      collectStringsFromExpression(stmt.condition);
      if (stmt.message != null) {
        collectStringsFromExpression(stmt.message);
      }
    }
    _addString(stmt.sourceLocation.file);
  }

  void writeClassDecl(ClassDecl classDecl) {
    printlog('[WRITE CLASS] START - buffer: ${_buffer.length}');

    writeUint32(_getStringRef(classDecl.id));
    printlog('[WRITE CLASS] After id: ${_buffer.length}');

    writeUint32(_getStringRef(classDecl.name));
    printlog('[WRITE CLASS] After name: ${_buffer.length}');

    writeByte(classDecl.isAbstract ? 1 : 0);
    printlog('[WRITE CLASS] After isAbstract: ${_buffer.length}');

    writeByte(classDecl.isFinal ? 1 : 0);
    printlog('[WRITE CLASS] After isFinal: ${_buffer.length}');

    writeByte(classDecl.superclass != null ? 1 : 0);
    printlog('[WRITE CLASS] After hasSuperclass: ${_buffer.length}');

    if (classDecl.superclass != null) {
      writeType(classDecl.superclass!);
    }
    printlog('[WRITE CLASS] After superclass: ${_buffer.length}');

    writeUint32(classDecl.interfaces.length);
    printlog('[WRITE CLASS] After interfaceCount: ${_buffer.length}');

    for (final iface in classDecl.interfaces) {
      writeType(iface);
    }
    printlog('[WRITE CLASS] After interfaces: ${_buffer.length}');

    writeUint32(classDecl.mixins.length);
    printlog('[WRITE CLASS] After mixinCount: ${_buffer.length}');

    for (final mixin in classDecl.mixins) {
      writeType(mixin);
    }
    printlog('[WRITE CLASS] After mixins: ${_buffer.length}');

    writeUint32(classDecl.fields.length);
    printlog('[WRITE CLASS] After fieldCount: ${_buffer.length}');

    for (final field in classDecl.fields) {
      writeFieldDecl(field);
    }
    printlog('[WRITE CLASS] After fields: ${_buffer.length}');

    writeUint32(classDecl.methods.length);
    printlog('[WRITE CLASS] After methodCount: ${_buffer.length}');

    for (final method in classDecl.methods) {
      writeMethodDecl(method);
    }
    printlog('[WRITE CLASS] After methods: ${_buffer.length}');

    writeUint32(classDecl.constructors.length);
    printlog('[WRITE CLASS] After constructorCount: ${_buffer.length}');

    for (final constructor in classDecl.constructors) {
      writeConstructorDecl(constructor);
    }
    printlog('[WRITE CLASS] After constructors: ${_buffer.length}');

    writeSourceLocation(classDecl.sourceLocation);
    printlog('[WRITE CLASS] After sourceLocation: ${_buffer.length}');
    printlog('[WRITE CLASS] END');
  }

  void writeFieldDecl(FieldDecl field) {
    writeUint32(_getStringRef(field.id));
    writeUint32(_getStringRef(field.name));
    writeType(field.type);

    writeByte(field.isFinal ? 1 : 0);
    writeByte(field.isConst ? 1 : 0);
    writeByte(field.isStatic ? 1 : 0);
    writeByte(field.isLate ? 1 : 0);
    writeByte(field.isPrivate ? 1 : 0);

    writeByte(field.initializer != null ? 1 : 0);
    if (field.initializer != null) {
      writeExpression(field.initializer!);
    }

    writeSourceLocation(field.sourceLocation);
  }

  void writeMethodDecl(MethodDecl method) {
    printlog('[WRITE CLASS Method] Start: ${_buffer.length}');

    writeUint32(_getStringRef(method.id));
    printlog('[WRITE CLASS Method] after id: ${_buffer.length}');

    writeUint32(_getStringRef(method.name));
    printlog('[WRITE CLASS Method] after name: ${_buffer.length}');

    writeType(method.returnType);
    printlog('[WRITE CLASS Method] after returnType: ${_buffer.length}');

    writeByte(method.isAsync ? 1 : 0);
    printlog('[WRITE CLASS Method] after isAsync: ${_buffer.length}');

    writeByte(method.isGenerator ? 1 : 0);
    printlog('[WRITE CLASS Method] after isGenerator: ${_buffer.length}');

    writeByte(method.isStatic ? 1 : 0);
    printlog('[WRITE CLASS Method] after isStatic: ${_buffer.length}');

    writeByte(method.isAbstract ? 1 : 0);
    printlog('[WRITE CLASS Method] after isAbstract: ${_buffer.length}');

    writeByte(method.isGetter ? 1 : 0);
    printlog('[WRITE CLASS Method] after isGetter: ${_buffer.length}');

    writeByte(method.isSetter ? 1 : 0);
    printlog('[WRITE CLASS Method] after isSetter: ${_buffer.length}');

    writeUint32(method.parameters.length);
    printlog(
      '[WRITE CLASS Method] after paramCount: ${_buffer.length} (count: ${method.parameters.length})',
    );

    for (final param in method.parameters) {
      writeParameterDecl(param);
    }
    printlog('[WRITE CLASS Method] after parameters loop: ${_buffer.length}');

    writeSourceLocation(method.sourceLocation);
    printlog('[WRITE CLASS Method] after sourceLocation: ${_buffer.length}');

    writeByte(method.body != null ? 1 : 0);
    printlog('[WRITE CLASS Method] after hasBody: ${_buffer.length}');

    if (method.body != null) {
      writeUint32(method.body!.length);
      printlog(
        '[WRITE CLASS Method] after bodyStmtCount: ${_buffer.length} (count: ${method.body!.length})',
      );
      for (final stmt in method.body!) {
        writeStatement(stmt);
      }
      printlog('[WRITE CLASS Method] after bodyStatements: ${_buffer.length}');
    }

    printlog('[WRITE CLASS Method] END\n');
  }

  void writeAnnotation(AnnotationIR ann) {
    writeUint32(_getStringRef(ann.name));

    writeUint32(ann.arguments.length);
    for (final arg in ann.arguments) {
      writeExpression(arg);
    }

    writeUint32(ann.namedArguments.length);
    for (final entry in ann.namedArguments.entries) {
      writeUint32(_getStringRef(entry.key));
      writeExpression(entry.value);
    }

    writeSourceLocation(ann.sourceLocation);
  }

  void writeFunctionDecl(FunctionDecl func) {
    printlog(
      '[WRITE FUNCTION] START - ${func.name} at offset ${_buffer.length}',
    );

    writeUint32(_getStringRef(func.id));
    writeUint32(_getStringRef(func.name));
    writeUint32(_getStringRef(func.returnType.displayName()));

    int flags = 0;
    if (func.isAsync) flags |= 0x01;
    if (func.isGenerator) flags |= 0x02;
    if (func.isSyncGenerator) flags |= 0x04;
    if (func.isStatic) flags |= 0x08;
    if (func.isAbstract) flags |= 0x10;
    if (func.isGetter) flags |= 0x20;
    if (func.isSetter) flags |= 0x40;
    if (func.isOperator) flags |= 0x80;
    writeByte(flags);

    int flags2 = 0;
    if (func.isFactory) flags2 |= 0x01;
    if (func.isConst) flags2 |= 0x02;
    if (func.isExternal) flags2 |= 0x04;
    if (func.isLate) flags2 |= 0x08;
    if (func.documentation != null) flags2 |= 0x10;
    if (func is MethodDecl && func.markedOverride) flags2 |= 0x20;
    writeByte(flags2);

    final visibilityValue = func.visibility == VisibilityModifier.private
        ? 1
        : 0;
    writeByte(visibilityValue);

    printlog('[WRITE FUNCTION] After flags: ${_buffer.length}');

    writeType(func.returnType);

    if (func.documentation != null) {
      writeUint32(_getStringRef(func.documentation!));
    }

    writeUint32(func.annotations.length);
    for (final ann in func.annotations) {
      writeAnnotation(ann);
    }
    printlog('[WRITE FUNCTION] After annotations: ${_buffer.length}');

    writeUint32(func.typeParameters.length);
    for (final tp in func.typeParameters) {
      writeUint32(_getStringRef(tp.name));
      writeByte(tp.bound != null ? 1 : 0);
      if (tp.bound != null) {
        writeType(tp.bound!);
      }
    }
    printlog('[WRITE FUNCTION] After type params: ${_buffer.length}');

    writeUint32(func.parameters.length);
    for (final param in func.parameters) {
      writeParameterDecl(param);
    }
    printlog('[WRITE FUNCTION] After parameters: ${_buffer.length}');

    writeSourceLocation(func.sourceLocation);

    if (func is ConstructorDecl) {
      writeByte(1);
      writeUint32(_getStringRef(func.constructorClass ?? ''));
      writeByte(func.constructorName != null ? 1 : 0);
      if (func.constructorName != null) {
        writeUint32(_getStringRef(func.constructorName!));
      }

      writeUint32(func.initializers.length);
      for (final init in func.initializers) {
        writeUint32(_getStringRef(init.fieldName));
        writeByte(init.isThisField ? 1 : 0);
        writeExpression(init.value);
        writeSourceLocation(init.sourceLocation);
      }

      writeByte(func.superCall != null ? 1 : 0);
      if (func.superCall != null) {
        writeByte(func.superCall!.constructorName != null ? 1 : 0);
        if (func.superCall!.constructorName != null) {
          writeUint32(_getStringRef(func.superCall!.constructorName!));
        }
        writeUint32(func.superCall!.arguments.length);
        for (final arg in func.superCall!.arguments) {
          writeExpression(arg);
        }
        writeUint32(func.superCall!.namedArguments.length);
        for (final entry in func.superCall!.namedArguments.entries) {
          writeUint32(_getStringRef(entry.key));
          writeExpression(entry.value);
        }
        writeSourceLocation(func.superCall!.sourceLocation);
      }

      writeByte(func.redirectedCall != null ? 1 : 0);
      if (func.redirectedCall != null) {
        writeByte(func.redirectedCall!.constructorName != null ? 1 : 0);
        if (func.redirectedCall!.constructorName != null) {
          writeUint32(_getStringRef(func.redirectedCall!.constructorName!));
        }
        writeUint32(func.redirectedCall!.arguments.length);
        for (final arg in func.redirectedCall!.arguments) {
          writeExpression(arg);
        }
        writeUint32(func.redirectedCall!.namedArguments.length);
        for (final entry in func.redirectedCall!.namedArguments.entries) {
          writeUint32(_getStringRef(entry.key));
          writeExpression(entry.value);
        }
        writeSourceLocation(func.redirectedCall!.sourceLocation);
      }

      printlog('[WRITE FUNCTION] Constructor-specific data written');
    } else {
      writeByte(0);
    }

    if (func is MethodDecl) {
      writeByte(1);
      writeByte(func.className != null ? 1 : 0);
      if (func.className != null) {
        writeUint32(_getStringRef(func.className!));
      }
      writeByte(func.overriddenSignature != null ? 1 : 0);
      if (func.overriddenSignature != null) {
        writeUint32(_getStringRef(func.overriddenSignature!));
      }
      printlog('[WRITE FUNCTION] Method-specific data written');
    } else {
      writeByte(0);
    }

    // ✅ FIXED: body is always List<StatementIR>?, no type check needed
    if (func is! ConstructorDecl && func is! MethodDecl) {
      writeByte(func.body != null ? 1 : 0);
      if (func.body != null) {
        writeUint32(func.body!.length);
        for (final stmt in func.body!) {
          writeStatement(stmt);
        }
        printlog('[WRITE FUNCTION] Body statements written: ${func.body!.length}');
      }
    }

    printlog('[WRITE FUNCTION] END - ${func.name} at offset ${_buffer.length}');
  }

  void writeConstructorDecl(ConstructorDecl constructor) {
    writeUint32(_getStringRef(constructor.id));
    writeUint32(_getStringRef(constructor.constructorClass ?? "<unknown>"));

    writeByte(constructor.constructorName != null ? 1 : 0);
    if (constructor.constructorName != null) {
      writeUint32(_getStringRef(constructor.constructorName!));
    }

    writeByte(constructor.isConst ? 1 : 0);
    writeByte(constructor.isFactory ? 1 : 0);

    writeUint32(constructor.parameters.length);
    for (final param in constructor.parameters) {
      writeParameterDecl(param);
    }

    writeSourceLocation(constructor.sourceLocation);

    writeUint32(constructor.initializers.length);
    for (final init in constructor.initializers) {
      writeUint32(_getStringRef(init.fieldName));
      writeByte(init.isThisField ? 1 : 0);
      writeExpression(init.value);
      writeSourceLocation(init.sourceLocation);
    }

    writeByte(constructor.body != null ? 1 : 0);
    if (constructor.body != null) {
      writeUint32(constructor.body!.length);
      for (final stmt in constructor.body!) {
        writeStatement(stmt);
      }
    }
  }

  void writeParameterDecl(ParameterDecl param) {
    writeUint32(_getStringRef(param.id));
    writeUint32(_getStringRef(param.name));
    writeType(param.type);

    writeByte(param.isRequired ? 1 : 0);
    writeByte(param.isNamed ? 1 : 0);
    writeByte(param.isPositional ? 1 : 0);

    writeByte(param.defaultValue != null ? 1 : 0);
    if (param.defaultValue != null) {
      writeExpression(param.defaultValue!);
    }

    writeSourceLocation(param.sourceLocation);
  }

  void writeAnalysisIssue(AnalysisIssue issue) {
    writeUint32(_getStringRef(issue.id));
    writeUint32(_getStringRef(issue.code));
    writeUint32(_getStringRef(issue.message));

    writeByte(issue.severity.index);
    writeByte(issue.category.index);

    writeByte(issue.suggestion != null ? 1 : 0);
    if (issue.suggestion != null) {
      writeUint32(_getStringRef(issue.suggestion!));
    }

    writeSourceLocation(issue.sourceLocation);
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

  void writeVariableDecl(VariableDecl variable) {
    printlog('[WRITE Variable] START - buffer offset: ${_buffer.length}');
    writeUint32(_getStringRef(variable.id));
    printlog('[WRITE Variable] After id: ${_buffer.length}');
    writeUint32(_getStringRef(variable.name));
    printlog('[WRITE Variable] After name: ${_buffer.length}');
    writeType(variable.type);
    printlog('[WRITE Variable] After type: ${_buffer.length}');
    writeByte(variable.isFinal ? 1 : 0);
    printlog('[WRITE Variable] After isFinal: ${_buffer.length}');
    writeByte(variable.isConst ? 1 : 0);
    printlog('[WRITE Variable] After isConst: ${_buffer.length}');
    writeByte(variable.isStatic ? 1 : 0);
    printlog('[WRITE Variable] After isStatic: ${_buffer.length}');
    writeByte(variable.isLate ? 1 : 0);
    printlog('[WRITE Variable] After isLate: ${_buffer.length}');
    writeByte(variable.isPrivate ? 1 : 0);
    printlog('[WRITE Variable] After isPrivate: ${_buffer.length}');

    writeByte(variable.initializer != null ? 1 : 0);
    printlog('[WRITE Variable] After initializer: ${_buffer.length}');
    if (variable.initializer != null) {
      writeExpression(variable.initializer!);
    }
    printlog('[WRITE Variable] After initializer: ${_buffer.length}');

    writeSourceLocation(variable.sourceLocation);
    printlog('[WRITE Variable] After sourceLocation: ${_buffer.length}');
    printlog('[WRITE Variable] END');
  }

  void collectStringsFromImport(ImportStmt import) {
    for (final ann in import.annotations) {
      _addString(ann.name);
    }
  }

  void collectStringsFromClass(ClassDecl classDecl) {
    _addString(classDecl.id);
    _addString(classDecl.name);
    _addString(classDecl.sourceLocation.file);
    if (classDecl.documentation != null) _addString(classDecl.documentation!);
    if (classDecl.superclass != null) {
      _addString(classDecl.superclass!.displayName());
    }

    for (final iface in classDecl.interfaces) {
      _addString(iface.displayName());
    }

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
      if (method.body != null) {
        collectStringsFromStatements(method.body!);
      }
    }

    for (final constructor in classDecl.constructors) {
      _addString(constructor.id);
      _addString(constructor.name);
      _addString(constructor.constructorClass ?? "<unknown>");
      if (constructor.constructorName != null) {
        _addString(constructor.constructorName!);
      }
      _addString(constructor.sourceLocation.file);

      for (final param in constructor.parameters) {
        _addString(param.id);
        _addString(param.name);
        _addString(param.type.displayName());
        _addString(param.sourceLocation.file);
        if (param.defaultValue != null) {
          collectStringsFromExpression(param.defaultValue);
        }
      }
      for (final init in constructor.initializers) {
        _addString(init.fieldName);
        collectStringsFromExpression(init.value);
      }

      if (constructor.body != null) {
        collectStringsFromStatements(constructor.body!);
      }
    }
  }

  void collectStringsFromFunction(FunctionDecl func) {
    printlog('[COLLECT FUNCTION] ${func.name}');

    _addString(func.id);
    _addString(func.name);
    _addString(func.returnType.displayName());
    _addString(func.sourceLocation.file);

    if (func.documentation != null) {
      _addString(func.documentation!);
    }

    for (final param in func.parameters) {
      _addString(param.id);
      _addString(param.name);
      _addString(param.type.displayName());
      _addString(param.sourceLocation.file);
      if (param.defaultValue != null) {
        collectStringsFromExpression(param.defaultValue);
      }
    }

    for (final ann in func.annotations) {
      _addString(ann.name);
    }

    for (final tp in func.typeParameters) {
      _addString(tp.name);
      if (tp.bound != null) {
        _addString(tp.bound!.displayName());
      }
    }

    if (func is ConstructorDecl) {
      if (func.constructorClass != null) {
        _addString(func.constructorClass!);
      }
      if (func.constructorName != null) {
        _addString(func.constructorName!);
      }
      for (final init in func.initializers) {
        _addString(init.fieldName);
        collectStringsFromExpression(init.value);
      }

      if (func.superCall != null) {
        for (final arg in func.superCall!.arguments) {
          collectStringsFromExpression(arg);
        }
        for (final arg in func.superCall!.namedArguments.values) {
          collectStringsFromExpression(arg);
        }
      }

      if (func.redirectedCall != null) {
        for (final arg in func.redirectedCall!.arguments) {
          collectStringsFromExpression(arg);
        }
        for (final arg in func.redirectedCall!.namedArguments.values) {
          collectStringsFromExpression(arg);
        }
      }

      if (func.body != null) {
        collectStringsFromStatements(func.body!);
      }
    }

    if (func is MethodDecl) {
      if (func.className != null) {
        _addString(func.className!);
      }
      if (func.overriddenSignature != null) {
        _addString(func.overriddenSignature!);
      }
      if (func.body != null) {
        collectStringsFromStatements(func.body!);
      }
    }
    if (func.body != null && func is! ConstructorDecl && func is! MethodDecl) {
      collectStringsFromStatements(func.body!);
    }
  }

  void collectStringsFromVariable(VariableDecl variable) {
    _addString(variable.id);
    _addString(variable.name);
    _addString(variable.type.displayName());
    _addString(variable.sourceLocation.file);
    if (variable.initializer != null) {
      collectStringsFromExpression(variable.initializer);
    }
  }
}