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
  void writeFunctionBody(FunctionBodyIR? body);
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
      // ========== SECTION 1: Basic Metadata ==========
      final idRef = getStringRef(method.id);
      writeUint32(idRef);
      printlog('  [METHOD] After id ($idRef): ${_buffer.length}');

      final nameRef = getStringRef(method.name);
      writeUint32(nameRef);
      printlog('  [METHOD] After name ($nameRef): ${_buffer.length}');

      writeType(method.returnType);
      printlog('  [METHOD] After returnType: ${_buffer.length}');

      // ========== SECTION 2: Documentation & Annotations ==========
      writeByte(method.documentation != null ? 1 : 0);
      if (method.documentation != null) {
        writeUint32(getStringRef(method.documentation!));
      }
      printlog('  [METHOD] After documentation: ${_buffer.length}');

      // Annotations
      writeUint32(method.annotations.length);
      for (final ann in method.annotations) {
        writeAnnotation(ann);
      }
      printlog(
        '  [METHOD] After annotations (${method.annotations.length}): ${_buffer.length}',
      );

      // ========== SECTION 3: Type Parameters ==========
      writeUint32(method.typeParameters.length);
      for (final tp in method.typeParameters) {
        writeUint32(getStringRef(tp.name));
        writeByte(tp.bound != null ? 1 : 0);
        if (tp.bound != null) {
          writeType(tp.bound!);
        }
      }
      printlog(
        '  [METHOD] After typeParameters (${method.typeParameters.length}): ${_buffer.length}',
      );

      // ========== SECTION 4: Parameters ==========
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

      // ========== SECTION 5: Source Location ==========
      writeSourceLocation(method.sourceLocation);
      printlog('  [METHOD] After sourceLocation: ${_buffer.length}');

      // ========== SECTION 6: Type-Specific Data (Method = funcType 2) ==========
      writeByte(2); // isMethod flag

      writeByte(method.className != null ? 1 : 0);
      if (method.className != null) {
        writeUint32(getStringRef(method.className!));
      }

      writeByte(method.overriddenSignature != null ? 1 : 0);
      if (method.overriddenSignature != null) {
        writeUint32(getStringRef(method.overriddenSignature!));
      }

      writeByte(method.isAsync ? 1 : 0);
      writeByte(method.isGenerator ? 1 : 0);

      // Widget return flag
      final isWidgetReturn = _isWidgetType(method.returnType);
      writeByte(isWidgetReturn ? 1 : 0);

      printlog('[METHOD] Method-specific data written');

      // ========== SECTION 7: Function Body + Extraction Data ==========
      // âœ… NOW DELEGATES TO writeFunctionBody()
      writeFunctionBody(method.body);

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
    printlog('[WRITE ANNOTATION] START: ${ann.name}');

    try {
      writeUint32(getStringRef(ann.name));
      printlog('[WRITE ANNOTATION] Name written');

      writeUint32(ann.arguments.length);
      printlog('[WRITE ANNOTATION] Argument count: ${ann.arguments.length}');

      for (final arg in ann.arguments) {
        writeExpression(arg);
      }

      writeUint32(ann.namedArguments.length);
      printlog(
        '[WRITE ANNOTATION] Named argument count: ${ann.namedArguments.length}',
      );

      for (final entry in ann.namedArguments.entries) {
        writeUint32(getStringRef(entry.key));
        writeExpression(entry.value);
      }

      writeSourceLocation(ann.sourceLocation);
      printlog('[WRITE ANNOTATION] END');
    } catch (e) {
      printlog('[WRITE ANNOTATION ERROR] ${ann.name}: $e');
      rethrow;
    }
  }

  void writeFunctionDecl(FunctionDecl func);

  void writeConstructorDecl(ConstructorDecl constructor) {
    final startOffset = _buffer.length;
    printlog('  [CONSTRUCTOR START] at offset: $startOffset');

    try {
      // ========== SECTION 1: Basic Metadata ==========
      writeUint32(getStringRef(constructor.id));
      writeUint32(getStringRef(constructor.name));
      writeUint32(getStringRef(constructor.returnType.displayName()));
      printlog('  [CONSTRUCTOR] After basic metadata: ${_buffer.length}');

      // ========== SECTION 2: Documentation & Annotations ==========
      writeByte(constructor.documentation != null ? 1 : 0);
      if (constructor.documentation != null) {
        writeUint32(getStringRef(constructor.documentation!));
      }
      printlog('  [CONSTRUCTOR] After documentation: ${_buffer.length}');

      // ========== SECTION 3: Type Parameters ==========
      writeUint32(constructor.typeParameters.length);
      for (final tp in constructor.typeParameters) {
        writeUint32(getStringRef(tp.name));
        writeByte(tp.bound != null ? 1 : 0);
        if (tp.bound != null) {
          writeType(tp.bound!);
        }
      }
      printlog('  [CONSTRUCTOR] After typeParameters: ${_buffer.length}');

      // ========== SECTION 4: Parameters ==========
      writeUint32(constructor.parameters.length);
      for (final param in constructor.parameters) {
        writeParameterDecl(param);
      }
      printlog('  [CONSTRUCTOR] After parameters: ${_buffer.length}');

      // ========== SECTION 5: Source Location ==========
      writeSourceLocation(constructor.sourceLocation);
      printlog('  [CONSTRUCTOR] After sourceLocation: ${_buffer.length}');

      // ========== SECTION 6: Type-Specific Data (Constructor = funcType 1) ==========
      writeByte(1); // isConstructor flag

      writeUint32(getStringRef(constructor.constructorClass ?? ''));
      writeByte(constructor.constructorName != null ? 1 : 0);
      if (constructor.constructorName != null) {
        writeUint32(getStringRef(constructor.constructorName!));
      }

      writeByte(constructor.isConst ? 1 : 0);
      writeByte(constructor.isFactory ? 1 : 0);

      // âœ… Initializers
      writeUint32(constructor.initializers.length);
      for (final init in constructor.initializers) {
        writeUint32(getStringRef(init.fieldName));
        writeByte(init.isThisField ? 1 : 0);
        writeExpression(init.value);
        writeSourceLocation(init.sourceLocation);
      }
      printlog(
        '  [CONSTRUCTOR] After initializers (${constructor.initializers.length}): ${_buffer.length}',
      );

      // âœ… Super call
      writeByte(constructor.superCall != null ? 1 : 0);
      if (constructor.superCall != null) {
        writeByte(constructor.superCall!.constructorName != null ? 1 : 0);
        if (constructor.superCall!.constructorName != null) {
          writeUint32(getStringRef(constructor.superCall!.constructorName!));
        }
        writeUint32(constructor.superCall!.arguments.length);
        for (final arg in constructor.superCall!.arguments) {
          writeExpression(arg);
        }
        writeUint32(constructor.superCall!.namedArguments.length);
        for (final entry in constructor.superCall!.namedArguments.entries) {
          writeUint32(getStringRef(entry.key));
          writeExpression(entry.value);
        }
        writeSourceLocation(constructor.superCall!.sourceLocation);
      }
      printlog('  [CONSTRUCTOR] After superCall: ${_buffer.length}');

      // âœ… Redirected call
      writeByte(constructor.redirectedCall != null ? 1 : 0);
      if (constructor.redirectedCall != null) {
        writeByte(constructor.redirectedCall!.constructorName != null ? 1 : 0);
        if (constructor.redirectedCall!.constructorName != null) {
          writeUint32(
            getStringRef(constructor.redirectedCall!.constructorName!),
          );
        }
        writeUint32(constructor.redirectedCall!.arguments.length);
        for (final arg in constructor.redirectedCall!.arguments) {
          writeExpression(arg);
        }
        writeUint32(constructor.redirectedCall!.namedArguments.length);
        for (final entry
            in constructor.redirectedCall!.namedArguments.entries) {
          writeUint32(getStringRef(entry.key));
          writeExpression(entry.value);
        }
        writeSourceLocation(constructor.redirectedCall!.sourceLocation);
      }
      printlog('  [CONSTRUCTOR] After redirectedCall: ${_buffer.length}');

      // ========== SECTION 7: Function Body + Extraction Data ==========
      // âœ… NOW DELEGATES TO writeFunctionBody()
      writeFunctionBody(constructor.body);

      final endOffset = _buffer.length;
      printlog(
        '  [CONSTRUCTOR END] ${endOffset - startOffset} bytes ($startOffset-$endOffset)\n',
      );
    } catch (e) {
      printlog('  [CONSTRUCTOR ERROR] at offset $_buffer.length: $e');
      rethrow;
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
