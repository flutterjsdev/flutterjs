import 'dart:typed_data';

import 'package:flutterjs_core/flutterjs_core.dart';

import '../../ast_ir/ir/expression_types/cascade_expression_ir.dart';

mixin DeclarationWriter {
  void writeByte(int value);
  void writeUint32(int value);
  int getStringRef(String str);
  void addString(String str);
  void writeType(TypeIR type);

  void writeSourceLocation(SourceLocationIR location);
  void writeExpression(ExpressionIR expr);
  void printlog(String str);
  void writeStatement(StatementIR stmt);

  BytesBuilder get buffer;

  BytesBuilder get _buffer => buffer;

  // ✅ Abstract method signatures that must be implemented by mixins
  void collectStringsFromExpression(ExpressionIR? expr) ;
  void collectStringsFromStatements(
    List<StatementIR>? stmts,
  ); // ✅ Nullable parameter

  // ✅ FIXED: Parameter is nullable to handle optional statements
  void collectStringsFromStatement(StatementIR? stmt) {
    if (stmt == null) return;

    if (stmt is ExpressionStmt) {
      collectStringsFromExpression(stmt.expression);
    } else if (stmt is VariableDeclarationStmt) {
      addString(stmt.name);
      if (stmt.type != null) {
        addString(stmt.type!.displayName());
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
      addString(stmt.loopVariable);
      if (stmt.loopVariableType != null) {
        addString(stmt.loopVariableType!.displayName());
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
          addString(catchClause.exceptionType!.displayName());
        }
        if (catchClause.exceptionParameter != null) {
          addString(catchClause.exceptionParameter!);
        }
        if (catchClause.stackTraceParameter != null) {
          addString(catchClause.stackTraceParameter!);
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
        addString(stmt.label!);
      }
    } else if (stmt is ContinueStmt) {
      if (stmt.label != null) {
        addString(stmt.label!);
      }
    } else if (stmt is LabeledStatementIR) {
      addString(stmt.label);
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
    addString(stmt.sourceLocation.file);
  }

  void writeClassDecl(ClassDecl classDecl) {
    printlog('[WRITE CLASS] START - buffer: ${buffer.length}');

    writeUint32(getStringRef(classDecl.id));
    printlog('[WRITE CLASS] After id: ${buffer.length}');

    writeUint32(getStringRef(classDecl.name));
    printlog('[WRITE CLASS] After name: ${buffer.length}');

    writeByte(classDecl.isAbstract ? 1 : 0);
    printlog('[WRITE CLASS] After isAbstract: ${buffer.length}');

    writeByte(classDecl.isFinal ? 1 : 0);
    printlog('[WRITE CLASS] After isFinal: ${buffer.length}');

    writeByte(classDecl.superclass != null ? 1 : 0);
    printlog('[WRITE CLASS] After hasSuperclass: ${buffer.length}');

    if (classDecl.superclass != null) {
      writeType(classDecl.superclass!);
    }
    printlog('[WRITE CLASS] After superclass: ${buffer.length}');

    writeUint32(classDecl.interfaces.length);
    printlog('[WRITE CLASS] After interfaceCount: ${buffer.length}');

    for (final iface in classDecl.interfaces) {
      writeType(iface);
    }
    printlog('[WRITE CLASS] After interfaces: ${buffer.length}');

    writeUint32(classDecl.mixins.length);
    printlog('[WRITE CLASS] After mixinCount: ${buffer.length}');

    for (final mixin in classDecl.mixins) {
      writeType(mixin);
    }
    printlog('[WRITE CLASS] After mixins: ${buffer.length}');

    writeUint32(classDecl.fields.length);
    printlog('[WRITE CLASS] After fieldCount: ${buffer.length}');

    for (final field in classDecl.fields) {
      writeFieldDecl(field);
    }
    printlog('[WRITE CLASS] After fields: ${buffer.length}');

    writeUint32(classDecl.methods.length);
    printlog('[WRITE CLASS] After methodCount: ${buffer.length}');

    for (final method in classDecl.methods) {
      writeMethodDecl(method);
    }
    printlog('[WRITE CLASS] After methods: ${buffer.length}');

    writeUint32(classDecl.constructors.length);
    printlog('[WRITE CLASS] After constructorCount: ${buffer.length}');

    for (final constructor in classDecl.constructors) {
      writeConstructorDecl(constructor);
    }
    printlog('[WRITE CLASS] After constructors: ${buffer.length}');

    writeSourceLocation(classDecl.sourceLocation);
    printlog('[WRITE CLASS] After sourceLocation: ${buffer.length}');
    printlog('[WRITE CLASS] END');
  }

  void writeFieldDecl(FieldDecl field) {
    writeUint32(getStringRef(field.id));
    writeUint32(getStringRef(field.name));
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
    printlog('[WRITE CLASS Method] Start: ${buffer.length}');

    writeUint32(getStringRef(method.id));
    printlog('[WRITE CLASS Method] after id: ${buffer.length}');

    writeUint32(getStringRef(method.name));
    printlog('[WRITE CLASS Method] after name: ${buffer.length}');

    writeType(method.returnType);
    printlog('[WRITE CLASS Method] after returnType: ${buffer.length}');

    writeByte(method.isAsync ? 1 : 0);
    printlog('[WRITE CLASS Method] after isAsync: ${buffer.length}');

    writeByte(method.isGenerator ? 1 : 0);
    printlog('[WRITE CLASS Method] after isGenerator: ${buffer.length}');

    writeByte(method.isStatic ? 1 : 0);
    printlog('[WRITE CLASS Method] after isStatic: ${buffer.length}');

    writeByte(method.isAbstract ? 1 : 0);
    printlog('[WRITE CLASS Method] after isAbstract: ${buffer.length}');

    writeByte(method.isGetter ? 1 : 0);
    printlog('[WRITE CLASS Method] after isGetter: ${buffer.length}');

    writeByte(method.isSetter ? 1 : 0);
    printlog('[WRITE CLASS Method] after isSetter: ${buffer.length}');

    writeUint32(method.parameters.length);
    printlog(
      '[WRITE CLASS Method] after paramCount: ${buffer.length} (count: ${method.parameters.length})',
    );

    for (final param in method.parameters) {
      writeParameterDecl(param);
    }
    printlog('[WRITE CLASS Method] after parameters loop: ${buffer.length}');

    writeSourceLocation(method.sourceLocation);
    printlog('[WRITE CLASS Method] after sourceLocation: ${buffer.length}');

    writeByte(method.body != null ? 1 : 0);
    printlog('[WRITE CLASS Method] after hasBody: ${buffer.length}');

    if (method.body != null) {
      writeUint32(method.body!.length);
      printlog(
        '[WRITE CLASS Method] after bodyStmtCount: ${buffer.length} (count: ${method.body!.length})',
      );
      for (final stmt in method.body!) {
        writeStatement(stmt);
      }
      printlog('[WRITE CLASS Method] after bodyStatements: ${buffer.length}');
    }

    printlog('[WRITE CLASS Method] END\n');
  }

  void writeAnnotation(AnnotationIR ann) {
    writeUint32(getStringRef(ann.name));

    writeUint32(ann.arguments.length);
    for (final arg in ann.arguments) {
      writeExpression(arg);
    }

    writeUint32(ann.namedArguments.length);
    for (final entry in ann.namedArguments.entries) {
      writeUint32(getStringRef(entry.key));
      writeExpression(entry.value);
    }

    writeSourceLocation(ann.sourceLocation);
  }

  void writeFunctionDecl(FunctionDecl func);


  void writeConstructorDecl(ConstructorDecl constructor) {
    writeUint32(getStringRef(constructor.id));
    writeUint32(getStringRef(constructor.constructorClass ?? "<unknown>"));

    writeByte(constructor.constructorName != null ? 1 : 0);
    if (constructor.constructorName != null) {
      writeUint32(getStringRef(constructor.constructorName!));
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
      writeUint32(getStringRef(init.fieldName));
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
    writeUint32(getStringRef(param.id));
    writeUint32(getStringRef(param.name));
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
    writeUint32(getStringRef(issue.id));
    writeUint32(getStringRef(issue.code));
    writeUint32(getStringRef(issue.message));

    writeByte(issue.severity.index);
    writeByte(issue.category.index);

    writeByte(issue.suggestion != null ? 1 : 0);
    if (issue.suggestion != null) {
      writeUint32(getStringRef(issue.suggestion!));
    }

    writeSourceLocation(issue.sourceLocation);
  }



  void writeVariableDecl(VariableDecl variable) {
    printlog('[WRITE Variable] START - buffer offset: ${buffer.length}');
    writeUint32(getStringRef(variable.id));
    printlog('[WRITE Variable] After id: ${buffer.length}');
    writeUint32(getStringRef(variable.name));
    printlog('[WRITE Variable] After name: ${buffer.length}');
    writeType(variable.type);
    printlog('[WRITE Variable] After type: ${buffer.length}');
    writeByte(variable.isFinal ? 1 : 0);
    printlog('[WRITE Variable] After isFinal: ${buffer.length}');
    writeByte(variable.isConst ? 1 : 0);
    printlog('[WRITE Variable] After isConst: ${buffer.length}');
    writeByte(variable.isStatic ? 1 : 0);
    printlog('[WRITE Variable] After isStatic: ${buffer.length}');
    writeByte(variable.isLate ? 1 : 0);
    printlog('[WRITE Variable] After isLate: ${buffer.length}');
    writeByte(variable.isPrivate ? 1 : 0);
    printlog('[WRITE Variable] After isPrivate: ${buffer.length}');

    writeByte(variable.initializer != null ? 1 : 0);
    printlog('[WRITE Variable] After initializer: ${buffer.length}');
    if (variable.initializer != null) {
      writeExpression(variable.initializer!);
    }
    printlog('[WRITE Variable] After initializer: ${buffer.length}');

    writeSourceLocation(variable.sourceLocation);
    printlog('[WRITE Variable] After sourceLocation: ${buffer.length}');
    printlog('[WRITE Variable] END');
  }

  void collectStringsFromImport(ImportStmt import);


  void collectStringsFromFunction(FunctionDecl func);
}
