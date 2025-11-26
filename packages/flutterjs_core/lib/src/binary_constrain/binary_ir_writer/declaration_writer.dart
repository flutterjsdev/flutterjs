import 'dart:typed_data';

import 'package:flutterjs_core/flutterjs_core.dart';

/// ============================================================================
/// declaration_writer.dart
/// Declaration Writer — Serializes Declarations in the FlutterJS IR
/// ============================================================================
///
/// Responsible for writing **all declaration-level IR structures** to the
/// binary output.  
///
/// A *declaration* represents any named construct in the FlutterJS IR:
/// - Variables
/// - Functions
/// - Classes / Widget Declarations
/// - Parameters
/// - Scoped identifiers
///
/// This writer ensures each declaration is translated into a compact and stable
/// binary format consistent with the global IR schema.
///
/// It is invoked by the master orchestrator:  
/// → `binary_ir_writer.dart`  
///
///
/// # Purpose
///
/// In FlutterJS IR, declarations define the "vocabulary" of the UI execution
/// environment.  
///
/// This module converts these declarations into binary form by encoding:
///
/// - identifiers  
/// - annotations  
/// - declaration type  
/// - parent scope  
/// - assigned expressions  
/// - declaration visibility  
///
///
/// # Responsibilities
///
/// ## 1. Serialize Declaration Metadata
///
/// Writes:
//  - declaration type (variable, function, class, etc.)
//  - string-table index for name
//  - modifiers (const, final, static, external, etc.)
//  - access scope (public/private)
///
///
/// ## 2. Serialize Types for Declarations
///
/// Ensures that *declared types* reference:
/// - type indices created by `type_writer.dart`
/// - generic constraints
/// - nullability flags
///
/// Example:
/// ```dart
/// writer.writeTypeRef(declaration.type);
/// ```
///
///
/// ## 3. Serialize Initial Values (If Present)
///
/// For variable or field declarations:
///
/// ```dart
/// writeExpression(declaration.initializer);
/// ```
///
/// Uses the expression writer for encoding the assigned value.
///
///
/// ## 4. Serialize Function & Method Declarations
///
/// Includes:
/// - parameter list  
/// - parameter types  
/// - return type  
/// - async/async* markers  
/// - function body → forwarded to `statement_writer.dart`  
///
///
/// ## 5. Ordering Guarantees
///
/// Declarations must be written in a deterministic order to ensure:
/// - reproducible binary output  
/// - stable indices  
///
/// The order typically enforced:
///
/// 1. Type declarations  
/// 2. Global declarations  
/// 3. Class members  
/// 4. Local declarations  
///
///
/// # Binary Structure Example
///
/// ```
/// [DECLARATION_TAG]
/// [DECL_KIND]
/// [NAME_INDEX]
/// [TYPE_INDEX]
/// [FLAGS]
/// [INIT_EXPR?]
/// [PARAMETERS?]
/// [FUNCTION_BODY?]
/// ```
///
///
/// # Example Usage
///
/// ```dart
/// final dw = DeclarationWriter(writer, stringTable);
/// dw.writeDeclaration(myIRDeclaration);
/// ```
///
/// Usually invoked indirectly via:
///
/// ```dart
/// BinaryIRWriter().write(irRoot);
/// ```
///
///
/// # Integration
///
/// Works closely with:
/// - `type_writer.dart`  
/// - `expression_writer.dart`  
/// - `statement_writer.dart`  
/// - `string_collection.dart`  
///
/// Ensures each string and type is registered and referenced correctly.
///
///
/// # Error Handling
///
/// Throws validation errors when:
/// - a declaration is missing a required name  
/// - an invalid type reference is used  
/// - a function body references undeclared symbols  
/// - modifiers conflict (e.g., const + mutable)  
///
///
/// # Notes
///
/// - Must always write declarations **before** writing their usage.
/// - Changing declaration structure requires binary schema updates.
/// - Deeply tied to IR design—update both together.
/// - All strings must be added to the global string table before writing.
///
///
/// ============================================================================
///


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
  void collectStringsFromExpression(ExpressionIR? expr);
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

  void writeClassDecl(ClassDecl classDecl);

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

  /// Helper method to check if return type is Widget or generic Widget variant
  bool _isWidgetType(TypeIR returnType) {
    final displayName = returnType.displayName();
    return displayName == 'Widget' ||
        displayName.startsWith('State<') ||
        displayName == 'StatefulWidget' ||
        displayName == 'StatelessWidget';
  }

  @override
  void writeMethodDecl(MethodDecl method) {
    final startOffset = _buffer.length;
    printlog('  [METHOD START] ${method.name} at offset: $startOffset');

    try {
      // ID
      final idRef = getStringRef(method.id);
      writeUint32(idRef);
      printlog('  [METHOD] After id ($idRef): ${_buffer.length}');

      // Name
      final nameRef = getStringRef(method.name);
      writeUint32(nameRef);
      printlog('  [METHOD] After name ($nameRef): ${_buffer.length}');

      // Return type - full type info including generics
      writeType(method.returnType);
      printlog('  [METHOD] After returnType: ${_buffer.length}');

      // Widget type flag - indicates this is a Widget-returning method
      final isWidgetReturn = _isWidgetType(method.returnType);
      writeByte(isWidgetReturn ? 1 : 0);
      printlog('  [METHOD] Is Widget type: $isWidgetReturn');

      // Flags
      writeByte(method.isAsync ? 1 : 0);
      writeByte(method.isGenerator ? 1 : 0);
      writeByte(method.isStatic ? 1 : 0);
      writeByte(method.isAbstract ? 1 : 0);
      writeByte(method.isGetter ? 1 : 0);
      writeByte(method.isSetter ? 1 : 0);
      printlog('  [METHOD] After flags: ${_buffer.length}');

      // Parameters
      printlog('  [METHOD] params count: ${method.parameters.length}');
      writeUint32(method.parameters.length);
      printlog('  [METHOD] After paramCount write: ${_buffer.length}');

      for (int i = 0; i < method.parameters.length; i++) {
        final paramStartOffset = _buffer.length;
        writeParameterDecl(method.parameters[i]);
        final paramEndOffset = _buffer.length;
        printlog(
          '  [METHOD] Param $i: ${paramEndOffset - paramStartOffset} bytes',
        );
      }
      printlog('  [METHOD] After parameters loop: ${_buffer.length}');

      // Source location
      writeSourceLocation(method.sourceLocation);
      printlog('  [METHOD] After sourceLocation: ${_buffer.length}');

      // Body - properly handle both Widget methods and regular methods
      writeByte(method.body != null ? 1 : 0);
      printlog('  [METHOD] Body exists flag written');

      if (method.body != null) {
        writeUint32(method.body!.length);
        printlog('  [METHOD] Body statement count: ${method.body!.length}');

        if (method.body!.isEmpty && isWidgetReturn) {
          printlog(
            '  [METHOD] WARNING: Empty body for Widget-returning method: ${method.name}',
          );
        }

        for (int i = 0; i < method.body!.length; i++) {
          final stmtStartOffset = _buffer.length;
          writeStatement(method.body![i]);
          final stmtEndOffset = _buffer.length;
          printlog(
            '  [METHOD] Statement $i written: ${stmtEndOffset - stmtStartOffset} bytes',
          );
        }
        printlog('  [METHOD] All ${method.body!.length} statements written');
      } else {
        printlog('  [METHOD] ${method.name} has null body');
      }

      final endOffset = _buffer.length;
      printlog(
        '  [METHOD END] ${method.name}: ${endOffset - startOffset} bytes\n',
      );
    } catch (e) {
      printlog('  [METHOD ERROR] ${method.name}: $e');
      rethrow;
    }
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
