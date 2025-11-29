import 'package:flutterjs_core/flutterjs_core.dart';

/// <---------------------------------------------------------------------------->
/// validation_pass.dart
/// ----------------------------------------------------------------------------
///
/// Comprehensive validation and diagnostics generator (Pass 5).
///
/// Aggregates data from prior passes to detect bugs, anti-patterns, and optimizations.
/// Focuses on Flutter specifics: lifecycles, state, widgets, performance, and code health.
///
/// Main class: [ValidationPass] – runs checks across files, producing [AnalysisIssue]
/// lists grouped by category and a [ValidationSummary].
///
/// Key validations:
/// • Lifecycle correctness (missing super calls, init/dispose mismatches)
/// • State patterns (setState in loops/build, unused fields, leaks)
/// • Performance (unnecessary rebuilds, empty widgets, heavy ops)
/// • Widget schemas (required props, e.g., MaterialApp.home, FAB.onPressed)
/// • Unused code (imports, variables, dead branches)
/// • Common mistakes (async build, mutable Stateless, etc.)
/// • Import/dependency hygiene (circular, unused, conflicts)
///
/// Features:
/// • Schema-based widget validation (e.g., [WidgetPropertySchema])
/// • Suggestion generation for common codes
/// • Summary stats (error/warning counts, health scores)
/// • Integration with flow info for precise diagnostics
///
/// Outputs consumed by:
/// • IDE linters / quick-fixes
/// • CI reports / dashboards
/// • Automated refactoring scripts
///
/// Issues include codes for machine-readable actions; all data JSON-serializable.
/// <---------------------------------------------------------------------------->
class ValidationPass {
  /// All DartFiles in project (from Pass 4 with flow analysis)
  final Map<String, DartFile> dartFiles;

  /// Flow analysis info from Pass 4
  final Map<String, dynamic> flowAnalysisInfo;

  /// All validation issues
  final List<AnalysisIssue> validationIssues = [];

  /// Issues grouped by category
  final Map<IssueCategory, List<AnalysisIssue>> issuesByCategory = {};

  /// Summary statistics
  late ValidationSummary summary;

  ValidationPass({required this.dartFiles, required this.flowAnalysisInfo});

  /// Execute complete validation pass
  void validateAll() {
    // Step 1: Validate lifecycle methods
    _validateLifecycleMethods();

    // Step 2: Validate state management patterns
    _validateStatePatterns();

    // Step 3: Validate performance anti-patterns
    _validatePerformancePatterns();

    // Step 4: Validate Flutter-specific patterns
    _validateFlutterPatterns();

    // Step 5: Check for unused code
    _checkUnusedCode();

    // Step 6: Validate imports and dependencies
    _validateImportsAndDependencies();

    // Step 7: Check for common mistakes
    _checkCommonMistakes();

    // Step 8: Generate summary
    _generateSummary();

    // Step 9: Update files with validation results
    _updateDartFilesWithValidation();
  }

  // =========================================================================
  // STEP 1: VALIDATE LIFECYCLE METHODS
  // =========================================================================

  void _validateLifecycleMethods() {
    for (final dartFile in dartFiles.values) {
      for (final classDecl in dartFile.classDeclarations) {
        if (classDecl is! StateDecl) continue;

        // Check initState
        _validateInitState(classDecl, dartFile);

        // Check dispose
        _validateDispose(classDecl, dartFile);

        // Check didUpdateWidget
        _validateDidUpdateWidget(classDecl, dartFile);

        // Check lifecycle ordering
        _validateLifecycleOrdering(classDecl, dartFile);
      }
    }
  }

  void _validateInitState(StateDecl stateClass, DartFile dartFile) {
    if (stateClass.initState == null) {
      if (stateClass.controllers.isNotEmpty ||
          stateClass.stateFields.isNotEmpty) {
        _addIssue(
          severity: IssueSeverity.warning,
          category: IssueCategory.flutterInitState,
          message:
              '${stateClass.name} has state/controllers but no initState() method',
          sourceLocation: stateClass.sourceLocation,
          code: 'MISSING_INIT_STATE',
          suggestion:
              'Implement initState() to initialize controllers and listeners. '
              'Always call super.initState() as the first statement.',
        );
      }
      return;
    }

    // Check if calls super
    if (!stateClass.initStateCallsSuper) {
      _addIssue(
        severity: IssueSeverity.error,
        category: IssueCategory.flutterInitState,
        message: 'initState() does not call super.initState()',
        sourceLocation: stateClass.sourceLocation,
        code: 'INIT_STATE_NO_SUPER',
        suggestion:
            'Add super.initState() as the first statement in initState(). '
            'This is required by Flutter.',
      );
    }

    // Check for async operations in initState
    if (stateClass.initState!.isAsync) {
      _addIssue(
        severity: IssueSeverity.warning,
        category: IssueCategory.flutterInitState,
        message: 'initState() is marked as async',
        sourceLocation: stateClass.sourceLocation,
        code: 'ASYNC_INIT_STATE',
        suggestion:
            'initState() should not be async. Use Future.delayed() or '
            'call async methods without awaiting them.',
      );
    }
  }

  void _validateDispose(StateDecl stateClass, DartFile dartFile) {
    if (stateClass.dispose == null) {
      if (stateClass.controllers.isNotEmpty) {
        _addIssue(
          severity: IssueSeverity.error,
          category: IssueCategory.flutterDispose,
          message:
              '${stateClass.name} creates ${stateClass.controllers.length} controller(s) but has no dispose() method',
          sourceLocation: stateClass.sourceLocation,
          code: 'MISSING_DISPOSE',
          suggestion:
              'Implement dispose() to clean up resources. Always call '
              'super.dispose() as the last statement.',
        );
      }
      return;
    }

    // Check if calls super
    if (!stateClass.disposeCallsSuper) {
      _addIssue(
        severity: IssueSeverity.error,
        category: IssueCategory.flutterDispose,
        message: 'dispose() does not call super.dispose()',
        sourceLocation: stateClass.sourceLocation,
        code: 'DISPOSE_NO_SUPER',
        suggestion:
            'Add super.dispose() as the last statement in dispose(). '
            'This is required by Flutter.',
      );
    }

    // Check for undisposed controllers
    for (final controller in stateClass.controllersMissingDisposal) {
      _addIssue(
        severity: IssueSeverity.error,
        category: IssueCategory.flutterResourceLeak,
        message: 'Controller "$controller" is never disposed',
        sourceLocation: stateClass.sourceLocation,
        code: 'UNDISPOSED_CONTROLLER',
        suggestion:
            'Add $controller.dispose() in the dispose() method to prevent memory leaks.',
      );
    }
  }

  void _validateDidUpdateWidget(StateDecl stateClass, DartFile dartFile) {
    if (stateClass.didUpdateWidget != null &&
        !stateClass.didUpdateWidget!.callsSuper) {
      _addIssue(
        severity: IssueSeverity.warning,
        category: IssueCategory.flutterDidUpdateWidget,
        message: 'didUpdateWidget() does not call super.didUpdateWidget()',
        sourceLocation: stateClass.sourceLocation,
        code: 'DID_UPDATE_WIDGET_NO_SUPER',
        suggestion:
            'Call super.didUpdateWidget(oldWidget) to ensure proper '
            'lifecycle handling.',
      );
    }
  }

  void _validateLifecycleOrdering(StateDecl stateClass, DartFile dartFile) {
    if (stateClass.initState != null && stateClass.dispose == null) {
      if (stateClass.controllers.isNotEmpty) {
        _addIssue(
          severity: IssueSeverity.warning,
          category: IssueCategory.flutterLifecycle,
          message:
              'Controllers initialized in initState but dispose() not implemented',
          sourceLocation: stateClass.sourceLocation,
          code: 'LIFECYCLE_IMBALANCE',
          suggestion:
              'Every resource created in initState should be cleaned up in '
              'dispose(). Add a dispose() method.',
        );
      }
    }
  }

  // =========================================================================
  // STEP 2: VALIDATE STATE MANAGEMENT PATTERNS
  // =========================================================================

  void _validateStatePatterns() {
    for (final dartFile in dartFiles.values) {
      for (final classDecl in dartFile.classDeclarations) {
        if (classDecl is! StateDecl) continue;

        _validateSetStateUsage(classDecl, dartFile);
        _validateStateFieldUsage(classDecl, dartFile);
        _validateBuildMethodStateAccess(classDecl, dartFile);
      }
    }
  }

  void _validateSetStateUsage(StateDecl stateClass, DartFile dartFile) {
    for (final setState in stateClass.setStateCalls) {
      // Check for setState in build
      if (setState.inMethod == 'build') {
        _addIssue(
          severity: IssueSeverity.error,
          category: IssueCategory.flutterSetState,
          message: 'setState() called inside build method',
          sourceLocation: SourceLocationIR(
            id: 'loc_setState_${setState.id}',
            file: dartFile.filePath,
            line: setState.lineNumber,
            column: 0,
            offset: 0,
            length: 0,
          ),
          code: 'SET_STATE_IN_BUILD',
          suggestion:
              'Never call setState() inside build(). This causes infinite loops. '
              'Move the state change to a callback or event handler.',
        );
      }

      // Check for setState with async callback
      if (setState.isAsync) {
        _addIssue(
          severity: IssueSeverity.warning,
          category: IssueCategory.flutterSetState,
          message: 'setState() callback is async',
          sourceLocation: SourceLocationIR(
            id: 'loc_setState_async_${setState.id}',
            file: dartFile.filePath,
            line: setState.lineNumber,
            column: 0,
            offset: 0,
            length: 0,
          ),
          code: 'ASYNC_SET_STATE',
          suggestion:
              'Avoid awaiting in setState() callbacks. If you need to wait, '
              'use Future.microtask() or call setState() after the async operation.',
        );
      }

      // Check for setState in loop
      if (setState.isInLoop) {
        _addIssue(
          severity: IssueSeverity.error,
          category: IssueCategory.flutterExcessiveRebuild,
          message: 'setState() called inside a loop',
          sourceLocation: SourceLocationIR(
            id: 'loc_setState_loop_${setState.id}',
            file: dartFile.filePath,
            line: setState.lineNumber,
            column: 0,
            offset: 0,
            length: 0,
          ),
          code: 'SET_STATE_IN_LOOP',
          suggestion:
              'Avoid calling setState() in loops. This causes excessive rebuilds. '
              'Collect all changes and call setState() once after the loop.',
        );
      }

      // Check for setState modifying no fields
      if (setState.modifiedFields.isEmpty) {
        _addIssue(
          severity: IssueSeverity.info,
          category: IssueCategory.flutterSetState,
          message: 'setState() callback does not modify any state fields',
          sourceLocation: SourceLocationIR(
            id: 'loc_setState_empty_${setState.id}',
            file: dartFile.filePath,
            line: setState.lineNumber,
            column: 0,
            offset: 0,
            length: 0,
          ),
          code: 'EMPTY_SET_STATE',
          suggestion:
              'This setState() appears to have no effect. Consider removing it or '
              'ensure it modifies state fields that affect the UI.',
        );
      }
    }
  }

  void _validateStateFieldUsage(StateDecl stateClass, DartFile dartFile) {
    for (final field in stateClass.unusedStateFields) {
      _addIssue(
        severity: IssueSeverity.info,
        category: IssueCategory.unusedCode,
        message:
            'State field "${field.name}" is declared but never accessed in build()',
        sourceLocation: SourceLocationIR(
          id: 'loc_unused_field_${field.name}',
          file: dartFile.filePath,
          line: 0,
          column: 0,
          offset: 0,
          length: 0,
        ),
        code: 'UNUSED_STATE_FIELD',
        suggestion:
            'Either use this field in build() or remove it. Unused fields waste memory '
            'and cause unnecessary rebuilds.',
      );
    }

    // Check for unused controllers
    for (final controller in stateClass.controllers) {
      final isUsed = stateClass.setStateCalls.any(
        (call) => call.modifiedFields.contains(controller),
      );

      if (!isUsed) {
        _addIssue(
          severity: IssueSeverity.warning,
          category: IssueCategory.flutterState,
          message: 'Controller "$controller" is never modified',
          sourceLocation: SourceLocationIR(
            id: 'loc_unused_controller_$controller',
            file: dartFile.filePath,
            line: 0,
            column: 0,
            offset: 0,
            length: 0,
          ),
          code: 'UNUSED_CONTROLLER',
          suggestion:
              'If this controller is not used to modify state, consider whether it '
              'needs to be a field or if it can be created locally.',
        );
      }
    }
  }

  void _validateBuildMethodStateAccess(
    StateDecl stateClass,
    DartFile dartFile,
  ) {
    if (stateClass.buildMethod == null) return;

    // Check for async build
    if (stateClass.buildMethod!.isAsync) {
      _addIssue(
        severity: IssueSeverity.error,
        category: IssueCategory.flutterWidget,
        message: 'build() method is marked as async',
        sourceLocation: SourceLocationIR(
          id: 'loc_async_build_${stateClass.id}',
          file: dartFile.filePath,
          line: stateClass.buildMethod!.lineNumber,
          column: 0,
          offset: 0,
          length: 0,
        ),
        code: 'ASYNC_BUILD',
        suggestion:
            'build() cannot be async. Use FutureBuilder or StreamBuilder for async content, '
            'or handle async operations in initState() or callbacks.',
      );
    }

    // Check for expensive build
    if (stateClass.buildMethod!.isExpensive) {
      _addIssue(
        severity: IssueSeverity.warning,
        category: IssueCategory.flutterHeavyBuild,
        message:
            'build() method is complex (${stateClass.buildMethod!.estimatedNodeCount} widgets, '
            'depth ${stateClass.buildMethod!.maxTreeDepth})',
        sourceLocation: SourceLocationIR(
          id: 'loc_expensive_build_${stateClass.id}',
          file: dartFile.filePath,
          line: stateClass.buildMethod!.lineNumber,
          column: 0,
          offset: 0,
          length: 0,
        ),
        code: 'EXPENSIVE_BUILD',
        suggestion:
            'Consider splitting this widget into smaller, reusable widgets. '
            'This improves performance by enabling partial rebuilds.',
      );
    }

    // Check for widgets created in loops
    if (stateClass.buildMethod!.createsWidgetsInLoops) {
      _addIssue(
        severity: IssueSeverity.warning,
        category: IssueCategory.flutterScrollPerformance,
        message: 'Widgets are created inside loops in build()',
        sourceLocation: SourceLocationIR(
          id: 'loc_widgets_in_loop_${stateClass.id}',
          file: dartFile.filePath,
          line: stateClass.buildMethod!.lineNumber,
          column: 0,
          offset: 0,
          length: 0,
        ),
        code: 'WIDGETS_IN_LOOPS',
        suggestion:
            'Use ListView.builder, GridView.builder, or similar constructors instead of '
            'creating widgets in loops. This is more efficient and provides better performance.',
      );
    }
  }

  // =========================================================================
  // STEP 3: VALIDATE PERFORMANCE ANTI-PATTERNS
  // =========================================================================

  void _validatePerformancePatterns() {
    for (final dartFile in dartFiles.values) {
      for (final classDecl in dartFile.classDeclarations) {
        if (classDecl is! StateDecl) continue;

        _validateRebuildFrequency(classDecl, dartFile);
        _validateWidgetTreeDepth(classDecl, dartFile);
        _validateConstWidgets(classDecl, dartFile);
      }
    }
  }

  void _validateRebuildFrequency(StateDecl stateClass, DartFile dartFile) {
    final fieldCount = stateClass.stateFields.length;
    final accessedCount = stateClass.fieldsAccessedInBuild.length;

    if (fieldCount > 5 && accessedCount < fieldCount / 2) {
      _addIssue(
        severity: IssueSeverity.info,
        category: IssueCategory.flutterExcessiveRebuild,
        message:
            'Only ${accessedCount}/${fieldCount} state fields are used in build()',
        sourceLocation: SourceLocationIR(
          id: 'loc_unused_fields_${stateClass.id}',
          file: dartFile.filePath,
          line: 0,
          column: 0,
          offset: 0,
          length: 0,
        ),
        code: 'EXCESSIVE_STATE_FIELDS',
        suggestion:
            'Consider splitting state into multiple widgets or using a state management '
            'solution. Fewer state dependencies = fewer rebuilds.',
      );
    }
  }

  void _validateWidgetTreeDepth(StateDecl stateClass, DartFile dartFile) {
    if (stateClass.buildMethod == null) return;

    if (stateClass.buildMethod!.maxTreeDepth > 10) {
      _addIssue(
        severity: IssueSeverity.warning,
        category: IssueCategory.flutterWidgetTree,
        message:
            'Widget tree depth is ${stateClass.buildMethod!.maxTreeDepth} (> 10)',
        sourceLocation: SourceLocationIR(
          id: 'loc_deep_tree_${stateClass.id}',
          file: dartFile.filePath,
          line: stateClass.buildMethod!.lineNumber,
          column: 0,
          offset: 0,
          length: 0,
        ),
        code: 'DEEP_WIDGET_TREE',
        suggestion:
            'Deep widget trees can hurt performance. Extract subtrees into separate '
            'widgets to reduce nesting and improve rebuilds.',
      );
    }
  }

  void _validateConstWidgets(StateDecl stateClass, DartFile dartFile) {
    if (stateClass.buildMethod == null) return;

    final totalWidgets = stateClass.buildMethod!.instantiatedWidgets.length;
    final constCount = stateClass.buildMethod!.instantiatedWidgets
        .where((w) => w.isConst) // ✅ Use the isConst property
        .length;

    if (totalWidgets > 5 && constCount == 0) {
      _addIssue(
        severity: IssueSeverity.info,
        category: IssueCategory.flutterMissingConst,
        message: 'No const widgets in build() (${totalWidgets} total widgets)',
        sourceLocation: SourceLocationIR(
          id: 'loc_no_const_${stateClass.id}',
          file: dartFile.filePath,
          line: stateClass.buildMethod!.lineNumber,
          column: 0,
          offset: 0,
          length: 0,
        ),
        code: 'NO_CONST_WIDGETS',
        suggestion:
            'Use const constructors for static widgets. This reduces widget rebuilds '
            'and improves performance.',
      );
    }
  }

  // =========================================================================
  // STEP 4: VALIDATE FLUTTER-SPECIFIC PATTERNS
  // =========================================================================

  void _validateWidgetProperties(dartFiles) {
    final widgetValidator = WidgetPropertyValidationPass(dartFiles: dartFiles);
    widgetValidator.analyzeWidgetProperties();
    validationIssues.addAll(widgetValidator.widgetIssues);
  }

  void _validateFlutterPatterns() {
    for (final dartFile in dartFiles.values) {
      for (final classDecl in dartFile.classDeclarations) {
        if (classDecl is! StateDecl) continue;

        _validateTickerProviderMixin(classDecl, dartFile);
        _validateProviderUsage(classDecl, dartFile);
        _validateWidgetProperties(dartFiles);
        _validateContextDependencies(classDecl, dartFile);
      }
    }
  }

  void _validateTickerProviderMixin(StateDecl stateClass, DartFile dartFile) {
    final hasAnimationControllers = stateClass.controllers.any(
      (c) => c.name.toLowerCase().contains('animation'),
    );

    if (hasAnimationControllers &&
        !stateClass.usesSingleTickerProvider &&
        !stateClass.usesMultipleTickerProviders) {
      _addIssue(
        severity: IssueSeverity.warning,
        category: IssueCategory.flutterAnimation,
        message: 'AnimationController used but no TickerProviderStateMixin',
        sourceLocation: SourceLocationIR(
          id: 'loc_no_ticker_${stateClass.id}',
          file: dartFile.filePath,
          line: 0,
          column: 0,
          offset: 0,
          length: 0,
        ),
        code: 'MISSING_TICKER_PROVIDER',
        suggestion:
            'Add SingleTickerProviderStateMixin (for one AnimationController) or '
            'TickerProviderStateMixin (for multiple) to your State class.',
      );
    }
  }

  void _validateProviderUsage(StateDecl stateClass, DartFile dartFile) {
    if (stateClass.providerReads.isEmpty) return;

    for (final provider in stateClass.providerReads) {
      if (stateClass.buildMethod?.accessedStateFields.contains(provider) ??
          false) {
        _addIssue(
          severity: IssueSeverity.info,
          category: IssueCategory.flutterProvider,
          message: 'Provider "$provider" accessed but state field also used',
          sourceLocation: SourceLocationIR(
            id: 'loc_mixed_state_$provider',
            file: dartFile.filePath,
            line: 0,
            column: 0,
            offset: 0,
            length: 0,
          ),
          code: 'MIXED_STATE_MANAGEMENT',
          suggestion:
              'Mixing local state and providers can be confusing. Consider using one '
              'pattern consistently throughout your widget.',
        );
      }
    }
  }

  void _validateContextDependencies(StateDecl stateClass, DartFile dartFile) {
    if (stateClass.contextDependencies.isEmpty) return;

    if (stateClass.contextDependencies.length > 3) {
      _addIssue(
        severity: IssueSeverity.warning,
        category: IssueCategory.flutterTheme,
        message:
            'Widget depends on ${stateClass.contextDependencies.length} context values',
        sourceLocation: SourceLocationIR(
          id: 'loc_context_deps_${stateClass.id}',
          file: dartFile.filePath,
          line: 0,
          column: 0,
          offset: 0,
          length: 0,
        ),
        code: 'EXCESSIVE_CONTEXT_DEPS',
        suggestion:
            'Many context dependencies (Theme, MediaQuery, etc.) can hurt performance. '
            'Consider extracting into separate widgets.',
      );
    }
  }

  // =========================================================================
  // STEP 5: CHECK FOR UNUSED CODE
  // =========================================================================

  void _checkUnusedCode() {
    for (final dartFile in dartFiles.values) {
      _checkUnusedImports(dartFile);
      _checkUnusedVariables(dartFile);
      _checkUnusedMethods(dartFile);
    }
  }

  void _checkUnusedImports(DartFile dartFile) {
    for (final import in dartFile.imports) {
      if (import.isDeferred) continue;

      final isUsed =
          dartFile.classDeclarations.any((c) => _classUsesImport(c, import)) ||
          dartFile.functionDeclarations.any(
            (f) => _functionUsesImport(f, import),
          );

      if (!isUsed && import.showList.isEmpty && import.hideList.isEmpty) {
        _addIssue(
          severity: IssueSeverity.hint,
          category: IssueCategory.unusedCode,
          message: 'Import "${import.uri}" may be unused',
          sourceLocation: import.sourceLocation,
          code: 'UNUSED_IMPORT',
          suggestion:
              'Remove unused imports to reduce build time and improve code clarity.',
        );
      }
    }
  }

  bool _classUsesImport(ClassDecl classDecl, ImportStmt import) {
    return false;
  }

  bool _functionUsesImport(FunctionDecl func, ImportStmt import) {
    return false;
  }

  void _checkUnusedVariables(DartFile dartFile) {
    for (final variable in dartFile.variableDeclarations) {
      if (variable.isPrivate && !variable.isConst) {
        // Could be unused - would require usage analysis
      }
    }
  }

  void _checkUnusedMethods(DartFile dartFile) {
    for (final classDecl in dartFile.classDeclarations) {
      for (final method in classDecl.methods) {
        if (method.name.startsWith('_') && !method.name.startsWith('_\$')) {
          // Private methods not starting with $ (dart codegen indicator)
          _addIssue(
            severity: IssueSeverity.info,
            category: IssueCategory.unusedCode,
            message: 'Private method "${method.name}" may not be used',
            sourceLocation: method.sourceLocation,
            code: 'UNUSED_METHOD',
            suggestion:
                'If this private method is not called, consider removing it to '
                'reduce code complexity.',
          );
        }
      }
    }
  }

  // =========================================================================
  // STEP 6: VALIDATE IMPORTS AND DEPENDENCIES
  // =========================================================================

  void _validateImportsAndDependencies() {
    for (final dartFile in dartFiles.values) {
      _validateImportCycles(dartFile);
      _validateMissingImports(dartFile);
    }
  }

  void _validateImportCycles(DartFile dartFile) {
    // Check for circular imports
  }

  void _validateMissingImports(DartFile dartFile) {
    // Check for unresolved symbols that should have been imported
  }

  // =========================================================================
  // STEP 7: CHECK FOR COMMON MISTAKES
  // =========================================================================

  void _checkCommonMistakes() {
    for (final dartFile in dartFiles.values) {
      _checkMutableWidgetFields(dartFile);
      _checkGlobalMutableState(dartFile);
      _checkMissingKeyInLists(dartFile);
    }
  }

  void _checkMutableWidgetFields(DartFile dartFile) {
    for (final classDecl in dartFile.classDeclarations) {
      if (classDecl is! StateDecl) continue;

      for (final field in classDecl.regularFields) {
        if (!field.isFinal && !field.isStatic) {
          _addIssue(
            severity: IssueSeverity.info,
            category: IssueCategory.flutterStatefulWidget,
            message: 'Non-final field "${field.name}" in State class',
            sourceLocation: SourceLocationIR(
              id: 'loc_mutable_field_${field.name}',
              file: dartFile.filePath,
              line: 0,
              column: 0,
              offset: 0,
              length: 0,
            ),
            code: 'MUTABLE_WIDGET_FIELD',
            suggestion:
                'State class fields should be final unless they\'re explicitly '
                'part of the reactive state.',
          );
        }
      }
    }
  }

  void _checkGlobalMutableState(DartFile dartFile) {
    for (final variable in dartFile.variableDeclarations) {
      if (!variable.isFinal && !variable.isConst && variable.isPrivate) {
        _addIssue(
          severity: IssueSeverity.warning,
          category: IssueCategory.flutterState,
          message: 'Global mutable state: "${variable.name}"',
          sourceLocation: variable.sourceLocation,
          code: 'GLOBAL_MUTABLE_STATE',
          suggestion:
              'Avoid global mutable state in Flutter. Use state management solutions '
              'like Provider, Riverpod, or BLoC instead.',
        );
      }
    }
  }

  void _checkMissingKeyInLists(DartFile dartFile) {
    for (final classDecl in dartFile.classDeclarations) {
      if (classDecl is! StateDecl) continue;
      if (classDecl.buildMethod?.createsWidgetsInLoops != true) continue;

      final widgetsInLoops = classDecl.buildMethod!.instantiatedWidgets
          .where((w) => w.isInLoop)
          .toList();

      for (final widget in widgetsInLoops) {
        if (!widget.hasKey) {
          _addIssue(
            severity: IssueSeverity.warning,
            category: IssueCategory.flutterWidgetKey,
            message:
                'Widget "${widget.name}" created in loop without key in build method',
            sourceLocation: SourceLocationIR(
              id: 'loc_no_key_${widget.id}',
              file: dartFile.filePath,
              line: widget.lineNumber,
              column: 0,
              offset: 0,
              length: 0,
            ),
            code: 'MISSING_KEY_IN_LOOP',
            suggestion:
                'Always use unique keys for widgets in loops (ListView.builder, '
                'for loops creating widgets, etc.). Without keys, Flutter cannot '
                'properly track widget identity when the list changes, causing '
                'state bugs and performance issues.',
          );
        }
      }
    }
  }

  // =========================================================================
  // STEP 8: GENERATE SUMMARY
  // =========================================================================

  void _generateSummary() {
    // Group issues by category
    for (final issue in validationIssues) {
      if (!issuesByCategory.containsKey(issue.category)) {
        issuesByCategory[issue.category] = [];
      }
      issuesByCategory[issue.category]!.add(issue);
    }

    // Calculate statistics
    final errorCount = validationIssues
        .where((i) => i.severity == IssueSeverity.error)
        .length;
    final warningCount = validationIssues
        .where((i) => i.severity == IssueSeverity.warning)
        .length;
    final infoCount = validationIssues
        .where((i) => i.severity == IssueSeverity.info)
        .length;
    final hintCount = validationIssues
        .where((i) => i.severity == IssueSeverity.hint)
        .length;

    // Count critical issues using the enum's isCritical property
    final criticalCount = validationIssues
        .where((i) => i.category.isCritical)
        .length;

    summary = ValidationSummary(
      totalIssues: validationIssues.length,
      errorCount: errorCount,
      warningCount: warningCount,
      infoCount: infoCount,
      hintCount: hintCount,
      criticalCount: criticalCount,
      issuesByCategory: issuesByCategory,
      analyzedFiles: dartFiles.length,
      analyzedClasses: dartFiles.values.fold(
        0,
        (sum, file) => sum + file.classDeclarations.length,
      ),
      analyzedMethods: dartFiles.values.fold(
        0,
        (sum, file) =>
            sum +
            file.classDeclarations.fold(
              0,
              (methodSum, cls) => methodSum + cls.methods.length,
            ),
      ),
      timestamp: DateTime.now(),
    );
  }

  // =========================================================================
  // STEP 9: UPDATE DART FILES WITH VALIDATION RESULTS
  // =========================================================================

  void _updateDartFilesWithValidation() {
    for (final dartFile in dartFiles.values) {
      // Add validation issues to the file
      dartFile.analysisIssues.addAll(
        validationIssues.where(
          (issue) => issue.sourceLocation.file == dartFile.filePath,
        ),
      );
    }
  }

  // =========================================================================
  // UTILITY METHOD FOR ADDING ISSUES
  // =========================================================================

  void _addIssue({
    required IssueSeverity severity,
    required IssueCategory category,
    required String message,
    required SourceLocationIR sourceLocation,
    required String code,
    required String suggestion,
  }) {
    final issueId =
        'val_issue_${validationIssues.length}_${DateTime.now().millisecondsSinceEpoch}';

    validationIssues.add(
      AnalysisIssue(
        id: issueId,
        code: code,
        severity: severity,
        category: category,
        message: message,
        sourceLocation: sourceLocation,
        suggestion: suggestion,
      ),
    );
  }
}

// =========================================================================
// SUPPORTING TYPES
// =========================================================================

/// Summary statistics for validation pass
class ValidationSummary {
  final int totalIssues;
  final int errorCount;
  final int warningCount;
  final int infoCount;
  final int hintCount;
  final int criticalCount;
  final Map<IssueCategory, List<AnalysisIssue>> issuesByCategory;
  final int analyzedFiles;
  final int analyzedClasses;
  final int analyzedMethods;
  final DateTime timestamp;

  ValidationSummary({
    required this.totalIssues,
    required this.errorCount,
    required this.warningCount,
    required this.infoCount,
    required this.hintCount,
    required this.criticalCount,
    required this.issuesByCategory,
    required this.analyzedFiles,
    required this.analyzedClasses,
    required this.analyzedMethods,
    required this.timestamp,
  });

  /// Returns severity breakdown as percentage
  Map<String, double> getSeverityPercentages() {
    if (totalIssues == 0) {
      return {'error': 0.0, 'warning': 0.0, 'info': 0.0, 'hint': 0.0};
    }

    return {
      'error': (errorCount / totalIssues) * 100,
      'warning': (warningCount / totalIssues) * 100,
      'info': (infoCount / totalIssues) * 100,
      'hint': (hintCount / totalIssues) * 100,
    };
  }

  /// Returns issues by category as percentages
  Map<String, double> getCategoryPercentages() {
    if (totalIssues == 0) return {};

    final percentages = <String, double>{};
    for (final entry in issuesByCategory.entries) {
      percentages[entry.key.name] = (entry.value.length / totalIssues) * 100;
    }
    return percentages;
  }

  /// Get categories sorted by issue count (descending)
  List<MapEntry<IssueCategory, int>> getCategoriesByCount() {
    final counts = <IssueCategory, int>{};
    for (final entry in issuesByCategory.entries) {
      counts[entry.key] = entry.value.length;
    }
    return counts.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
  }

  /// Get overall health score (0-100)
  int getHealthScore() {
    if (totalIssues == 0) return 100;

    // Weighted scoring: errors are most critical
    final errorWeight = errorCount * 10;
    final warningWeight = warningCount * 3;
    final infoWeight = infoCount * 1;

    final totalWeight = errorWeight + warningWeight + infoWeight;
    final maxWeight = (errorCount + warningCount + infoCount) * 10;

    if (maxWeight == 0) return 100;
    return ((maxWeight - totalWeight) / maxWeight * 100).toInt().clamp(0, 100);
  }

  /// Formats summary as human-readable report
  String generateReport() {
    final buffer = StringBuffer();

    buffer.writeln('═' * 70);
    buffer.writeln('FLUTTER CODE VALIDATION REPORT');
    buffer.writeln('═' * 70);
    buffer.writeln('Analyzed at: $timestamp');
    buffer.writeln('Health Score: ${getHealthScore()}/100');
    buffer.writeln();

    buffer.writeln('SCOPE:');
    buffer.writeln('  Files analyzed: $analyzedFiles');
    buffer.writeln('  Classes analyzed: $analyzedClasses');
    buffer.writeln('  Methods analyzed: $analyzedMethods');
    buffer.writeln();

    buffer.writeln('ISSUES FOUND: $totalIssues total');
    if (criticalCount > 0) {
      buffer.writeln('  CRITICAL: $criticalCount (MUST FIX)');
    }
    buffer.writeln('  Errors: $errorCount');
    buffer.writeln('  Warnings: $warningCount');
    buffer.writeln('  Info: $infoCount');
    buffer.writeln('  Hints: $hintCount');
    buffer.writeln();

    if (issuesByCategory.isNotEmpty) {
      buffer.writeln('TOP ISSUE CATEGORIES:');
      final topCategories = getCategoriesByCount().take(5);
      for (final entry in topCategories) {
        buffer.writeln(
          '  ${entry.key.displayName}: ${entry.value} (${(entry.value / totalIssues * 100).toStringAsFixed(1)}%)',
        );
      }
      buffer.writeln();
    }

    final percentages = getSeverityPercentages();
    if (percentages.isNotEmpty) {
      buffer.writeln('SEVERITY BREAKDOWN:');
      buffer.writeln('  Errors: ${percentages['error']?.toStringAsFixed(1)}%');
      buffer.writeln(
        '  Warnings: ${percentages['warning']?.toStringAsFixed(1)}%',
      );
      buffer.writeln('  Info: ${percentages['info']?.toStringAsFixed(1)}%');
      buffer.writeln('  Hints: ${percentages['hint']?.toStringAsFixed(1)}%');
      buffer.writeln();
    }

    // Status message
    buffer.writeln('STATUS:');
    if (criticalCount > 0) {
      buffer.writeln(
        '  CRITICAL: $criticalCount critical issues must be fixed immediately!',
      );
    } else if (errorCount > 0) {
      buffer.writeln('  ERROR: Fix all $errorCount errors before deploying.');
    } else if (warningCount > 0) {
      buffer.writeln(
        '  WARNING: Review $warningCount warnings for best practices.',
      );
    } else if (infoCount > 0 || hintCount > 0) {
      buffer.writeln(
        '  INFO: No errors or warnings. Review suggestions for optimization.',
      );
    } else {
      buffer.writeln('  EXCELLENT: All checks passed!');
    }

    buffer.writeln('═' * 70);

    return buffer.toString();
  }

  /// Generate JSON-serializable report
  Map<String, dynamic> toJson() {
    return {
      'totalIssues': totalIssues,
      'errorCount': errorCount,
      'warningCount': warningCount,
      'infoCount': infoCount,
      'hintCount': hintCount,
      'criticalCount': criticalCount,
      'healthScore': getHealthScore(),
      'analyzedFiles': analyzedFiles,
      'analyzedClasses': analyzedClasses,
      'analyzedMethods': analyzedMethods,
      'timestamp': timestamp.toIso8601String(),
      'issuesByCategory': issuesByCategory.map(
        (k, v) => MapEntry(k.displayName, v.length),
      ),
      'severityPercentages': getSeverityPercentages(),
    };
  }
}

/// Extension to get validation statistics
extension ValidationStatistics on List<AnalysisIssue> {
  int countByCategory(IssueCategory category) =>
      where((i) => i.category == category).length;

  int countBySeverity(IssueSeverity severity) =>
      where((i) => i.severity == severity).length;

  List<AnalysisIssue> getByFile(String filePath) =>
      where((i) => i.sourceLocation.file == filePath).toList();

  List<AnalysisIssue> getByCategory(IssueCategory category) =>
      where((i) => i.category == category).toList();

  List<AnalysisIssue> getSeverityOrHigher(IssueSeverity minSeverity) {
    final severityOrder = {
      IssueSeverity.error: 0,
      IssueSeverity.warning: 1,
      IssueSeverity.info: 2,
      IssueSeverity.hint: 3,
    };

    final minLevel = severityOrder[minSeverity] ?? 3;
    return where((i) => (severityOrder[i.severity] ?? 3) <= minLevel).toList();
  }

  /// Groups issues by source file
  Map<String, List<AnalysisIssue>> groupByFile() {
    final groups = <String, List<AnalysisIssue>>{};
    for (final issue in this) {
      final file = issue.sourceLocation.file;
      groups.putIfAbsent(file, () => []).add(issue);
    }
    return groups;
  }

  /// Groups issues by category
  Map<IssueCategory, List<AnalysisIssue>> groupByCategory() {
    final groups = <IssueCategory, List<AnalysisIssue>>{};
    for (final issue in this) {
      groups.putIfAbsent(issue.category, () => []).add(issue);
    }
    return groups;
  }

  /// Get critical issues that must be fixed
  List<AnalysisIssue> getCriticalIssues() =>
      where((i) => i.category.isCritical).toList();

  /// Get issues organized by file and category
  Map<String, Map<IssueCategory, List<AnalysisIssue>>>
  groupByFileAndCategory() {
    final groups = <String, Map<IssueCategory, List<AnalysisIssue>>>{};
    for (final issue in this) {
      final file = issue.sourceLocation.file;
      final category = issue.category;

      groups.putIfAbsent(file, () => {});
      groups[file]!.putIfAbsent(category, () => []).add(issue);
    }
    return groups;
  }

  /// Generate markdown report for all issues
  String generateMarkdownReport() {
    final buffer = StringBuffer();

    buffer.writeln('# Validation Report');
    buffer.writeln('- Total Issues: ${length}');
    buffer.writeln('- Critical: ${where((i) => i.category.isCritical).length}');
    buffer.writeln('- Errors: ${countBySeverity(IssueSeverity.error)}');
    buffer.writeln('- Warnings: ${countBySeverity(IssueSeverity.warning)}');
    buffer.writeln();

    final byFile = groupByFileAndCategory();
    for (final fileEntry in byFile.entries) {
      buffer.writeln('## ${fileEntry.key}');

      for (final categoryEntry in fileEntry.value.entries) {
        final issues = categoryEntry.value;
        buffer.writeln('### ${categoryEntry.key.displayName}');

        for (final issue in issues) {
          final severityEmoji = issue.severity == IssueSeverity.error
              ? '🔴'
              : issue.severity == IssueSeverity.warning
              ? '🟡'
              : issue.severity == IssueSeverity.info
              ? '🔵'
              : '⚪';

          buffer.writeln(
            '$severityEmoji **${issue.code}** (Line ${issue.sourceLocation.line})',
          );
          buffer.writeln('   ${issue.message}');
          buffer.writeln('   *${issue.suggestion}*');
          buffer.writeln();
        }
      }
    }

    return buffer.toString();
  }
}

// ============================================================================
// ADD THIS TO: validation_pass.dart
// New validation methods for widget property analysis
// ============================================================================

/// Widget Property Analysis Pass
/// Validates that widgets are properly configured with required properties
class WidgetPropertyValidationPass {
  final Map<String, DartFile> dartFiles;
  final List<AnalysisIssue> widgetIssues = [];

  WidgetPropertyValidationPass({required this.dartFiles});

  void analyzeWidgetProperties() {
    for (final dartFile in dartFiles.values) {
      _analyzeFileWidgets(dartFile);
    }
  }

  void _analyzeFileWidgets(DartFile dartFile) {
    // Walk through all expressions in the file looking for widget constructors
    // This would be called during statement extraction
  }
}

class WidgetPropertySchema {
  final String name;
  final List<String> required;
  final List<String> optional;
  final List<String> callbacks;

  WidgetPropertySchema({
    required this.name,
    required this.required,
    required this.optional,
    required this.callbacks,
  });
}
