import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_core/src/analysis/extraction/flutter_component_system.dart';
import 'package:flutterjs_core/src/analysis/extraction/symmetric_function_extraction.dart';
/// ============================================================================
/// string_collection.dart
/// String Collection – Centralized Interning Pool for IR → Binary Serialization
/// ============================================================================
///
/// Maintains a **global pooled string table** used throughout the FlutterJS IR
/// serialization process.  
///
/// This module ensures:
/// - All strings used in IR are deduplicated  
/// - Each string receives a stable index  
/// - Writers can reference strings using compact integer IDs  
///
/// It acts as the in-memory builder for the binary **StringTable** written later
/// into the output bundle.
///
///
/// # Purpose
///
/// The IR contains a large number of strings:
/// - widget names  
/// - parameter names  
/// - variable identifiers  
/// - type names  
/// - literal values  
///
/// Repeating these strings directly in binary output would:
/// - increase size  
/// - reduce determinism  
/// - break efficient decoding  
///
/// `StringCollection` collects all strings **before writing anything**,
/// guaranteeing a stable ordering throughout the binary writer.
///
///
/// # Responsibilities
///
/// ## 1. Intern Strings
///
/// ```dart
/// int index = collection.intern("Container");
/// ```
///
/// Interning guarantees:
/// - consistent ID assignment  
/// - zero duplicates  
///
///
/// ## 2. Index-Based Lookups
///
/// Retrieve string by index:
/// ```dart
/// final str = collection.lookup(3);
/// ```
///
///
/// ## 3. Reverse Lookup
///
/// Retrieve index for an existing string:
///
/// ```dart
/// final id = collection.indexOf("title");
/// ```
///
///
/// ## 4. Export to `StringTable`
///
/// Before writing binary, the collection outputs:
///
/// ```dart
/// final table = collection.toTable();
/// ```
///
/// A StringTable is then serialized in the binary format using:
/// - UTF-8 byte encoding  
/// - length-prefixed strings  
/// - stable ordering  
///
///
/// ## 5. Enforce Deterministic Ordering
///
/// Ordering is based on **first appearance**, making builds reproducible:
/// - same IR → same string ordering → same binary output  
///
///
/// ## 6. Provide String Indices to Writers
///
/// Used across:
/// - expression_writer  
/// - statement_writer  
/// - declaration_writer  
/// - type_writer  
/// - relationship_writer  
///
/// Example:
/// ```dart
/// writer.writeUint32(collection.indexOf(param.name));
/// ```
///
///
/// # Internal Structure
///
/// Typically:
/// ```dart
/// final List<String> _strings;
/// final Map<String, int> _index;
/// ```
///
/// This ensures:
/// - fast O(1) lookup  
/// - string → index and index → string mapping  
///
///
/// # Binary Flow Overview
///
/// ```
/// IR Nodes
///     ↓
/// StringCollection (intern all strings)
///     ↓
/// StringTable (ready for binary)
///     ↓
/// BinaryWriter (serialize table)
/// ```
///
///
/// # Example Usage
///
/// ```dart
/// final sc = StringCollection();
/// sc.intern("title");
/// sc.intern("subtitle");
///
/// final idx = sc.indexOf("title"); // → 0  
/// final table = sc.toTable();
/// ```
///
///
/// # Error Handling
///
/// Throws when:
/// - attempting to look up an invalid index  
/// - receiving a null or empty string where not allowed  
/// - exporting before all IR strings were registered  
///
///
/// # Notes
///
/// - Strings must be interned before binary writing begins.  
/// - Ordering must stay stable for binary reproducibility.  
/// - Updating this module affects the binary schema; proceed with caution.  
///
///
/// ============================================================================
///

mixin StringCollectionPhase {
  // Ã¢Å"â€¦ Abstract getters that must be provided by implementing class
  List<String> get stringTable;
  bool get isVerbose;
  // Ã¢Å"â€¦ FIXED: Use getter to access verbose flag
  bool get _verbose => isVerbose;

  void printlog(String str);
  void addString(String str);
  void collectStringsFromImport(ImportStmt stm);
  void collectStringsFromExpression(ExpressionIR? expr);
  void collectStringsFromVariable(VariableDecl ver);
  void collectStringsFromClass(ClassDecl classDecl);
  void collectStringsFromAnalysisIssues(DartFile fileIr);
  void collectStringsFromFunction(FunctionDecl func);

  void collectStringsFromStatements(List<StatementIR>? stmts) {
    if (stmts == null) return;
    for (final stmt in stmts) {
      collectStringsFromStatement(stmt);
    }
  }

  void collectStrings(DartFile fileIR) {
    addString(fileIR.filePath);
    addString(fileIR.contentHash);
    addString(fileIR.library ?? "<unknown>");

    printlog('[COLLECT] Starting string collection');
    printlog('[COLLECT] Imports: ${fileIR.imports.length}');

    for (final import in fileIR.imports) {
      addString(import.uri);
      addString(import.sourceLocation.file);
      if (import.prefix != null) addString(import.prefix!);
      for (final show in import.showList) {
        addString(show);
      }
      for (final hide in import.hideList) {
        addString(hide);
      }
      collectStringsFromImport(import);
    }

    printlog('[COLLECT] Exports: ${fileIR.exports.length}');
    for (final export in fileIR.exports) {
      addString(export.uri);
      addString(export.sourceLocation.file);
      for (final show in export.showList) {
        addString(show);
      }
      for (final hide in export.hideList) {
        addString(hide);
      }
    }

    printlog('[COLLECT] Functions: ${fileIR.functionDeclarations.length}');
    for (final func in fileIR.functionDeclarations) {
      collectStringsFromFunction(func);
    }

    printlog('[COLLECT] Variables: ${fileIR.variableDeclarations.length}');
    for (final variable in fileIR.variableDeclarations) {
      collectStringsFromVariable(variable);
    }

    // âœ… THIS MUST BE CALLED
    printlog('[COLLECT] Classes: ${fileIR.classDeclarations.length}');
    for (int i = 0; i < fileIR.classDeclarations.length; i++) {
      final cls = fileIR.classDeclarations[i];
      printlog('[COLLECT CLASS $i] ${cls.name} (id="${cls.id}")');
      collectStringsFromClass(cls);
    }

    printlog('[COLLECT] Issues: ${fileIR.analysisIssues.length}');
    collectStringsFromAnalysisIssues(fileIR);

    printlog('[COLLECT] âœ… String table size: ${stringTable.length}');
    if (_verbose) {
      debugPrintStringTable();
    }
  }

  // ============================================================================
  // ENHANCED: collectStringsFromFunction - NOW COLLECTS ALL FUNCTION DATA
  // ============================================================================

  // ============================================================================
  // NEW: collectStringsFromExtractionData - Collects all extraction strings
  // ============================================================================
  void collectStringsFromExtractionData(FunctionExtractionData data) {
    printlog('[COLLECT EXTRACTION] START');

    // Extraction type
    addString(data.extractionType);

    // Components
    for (final component in data.components) {
      collectStringsFromFlutterComponent(component);
    }

    // Pure function data
    if (data.pureFunctionData != null) {
      collectStringsFromFlutterComponent(data.pureFunctionData!);
    }

    // Analysis map
    for (final entry in data.analysis.entries) {
      addString(entry.key);
      addString(entry.value.toString());
    }

    // Metadata
    addString(data.metadata.name);
    addString(data.metadata.type);
    if (data.metadata.returnType != null) {
      addString(data.metadata.returnType!);
    }

    // Diagnostics
    for (final diag in data.diagnostics) {
      addString(diag.message);
      if (diag.code.isNotEmpty) {
        addString(diag.code);
      }
    }

    printlog('[COLLECT EXTRACTION] END - ${data.components.length} components');
  }

  // ============================================================================
  // EXISTING (but needed for extraction data)
  // ============================================================================
  void collectStringsFromFlutterComponent(FlutterComponent component) {
    addString(component.id);
    addString(component.describe());
    addString(component.sourceLocation.file);

    if (component is WidgetComponent) {
      addString(component.widgetName);
      if (component.constructorName != null) {
        addString(component.constructorName!);
      }
      for (final prop in component.properties) {
        addString(prop.name);
        addString(prop.value);
      }
      for (final child in component.children) {
        collectStringsFromFlutterComponent(child);
      }
    } else if (component is ConditionalComponent) {
      addString(component.conditionCode);
      collectStringsFromFlutterComponent(component.thenComponent);
      if (component.elseComponent != null) {
        collectStringsFromFlutterComponent(component.elseComponent!);
      }
    } else if (component is LoopComponent) {
      addString(component.loopKind);
      if (component.loopVariable != null) {
        addString(component.loopVariable!);
      }
      if (component.iterableCode != null) {
        addString(component.iterableCode!);
      }
      if (component.conditionCode != null) {
        addString(component.conditionCode!);
      }
      collectStringsFromFlutterComponent(component.bodyComponent);
    } else if (component is CollectionComponent) {
      addString(component.collectionKind);
      for (final elem in component.elements) {
        collectStringsFromFlutterComponent(elem);
      }
    } else if (component is BuilderComponent) {
      addString(component.builderName);
      for (final param in component.parameters) {
        addString(param);
      }
      if (component.bodyDescription != null) {
        addString(component.bodyDescription!);
      }
    } else if (component is UnsupportedComponent) {
      addString(component.sourceCode);
      if (component.reason != null) {
        addString(component.reason!);
      }
    } else if (component is ComputationFunctionData) {
      addString(component.displayName);
      addString(component.inputType);
      addString(component.outputType);
      for (final entry in component.analysis.entries) {
        addString(entry.key);
        addString(entry.value.toString());
      }
    } else if (component is ValidationFunctionData) {
      addString(component.displayName);
      addString(component.targetType);
      addString(component.returnType);
      for (final rule in component.validationRules) {
        addString(rule);
      }
      for (final entry in component.analysis.entries) {
        addString(entry.key);
        addString(entry.value.toString());
      }
    } else if (component is FactoryFunctionData) {
      addString(component.displayName);
      addString(component.producedType);
      for (final param in component.parameters) {
        addString(param);
      }
      for (final field in component.initializedFields) {
        addString(field);
      }
      for (final entry in component.analysis.entries) {
        addString(entry.key);
        addString(entry.value.toString());
      }
    } else if (component is HelperFunctionData) {
      addString(component.displayName);
      addString(component.purpose);
      for (final effect in component.sideEffects) {
        addString(effect);
      }
      for (final entry in component.analysis.entries) {
        addString(entry.key);
        addString(entry.value.toString());
      }
    } else if (component is MixedFunctionData) {
      addString(component.displayName);
      for (final subComponent in component.components) {
        collectStringsFromFlutterComponent(subComponent);
      }
      for (final entry in component.analysis.entries) {
        addString(entry.key);
        addString(entry.value.toString());
      }
    } else if (component is ContainerFallbackComponent) {
      addString(component.reason);
      if (component.wrappedComponent != null) {
        collectStringsFromFlutterComponent(component.wrappedComponent!);
      }
    }
  }

  // Ã¢Å"â€¦ Core statement string collection - Parameter is nullable
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

    // Always collect source location
    addString(stmt.sourceLocation.file);
  }

  void debugPrintStringTable() {
    print('\n=== STRING TABLE DEBUG ===');
    print('Total strings: ${stringTable.length}');
    for (int i = 0; i < stringTable.length; i++) {
      print('  [$i] "${stringTable[i]}"');
    }
    print('=== END STRING TABLE ===\n');
  }
}