import 'new_ast_IR/class_decl.dart';
import 'new_ast_IR/dart_file_builder.dart';
import 'new_ast_IR/function_decl.dart';
import 'new_ast_IR/ir/statement/statement_ir.dart';
import 'new_ast_IR/state_class_representation/state_class_representation.dart';
import 'new_ast_IR/diagnostics/analysis_issue.dart';
import 'new_ast_IR/diagnostics/issue_category.dart';
import 'new_ast_IR/diagnostics/source_location.dart';

/// Pass 4: Flow Analysis
/// 
/// Input: Typed declarations from Pass 3 (TypeInferencePass)
/// Output: Control flow graphs, rebuild triggers, lifecycle tracking, unreachable code
/// 
/// Responsibilities:
/// 1. Build rebuild trigger graphs for state changes
/// 2. Trace state field access in build methods
/// 3. Analyze method/function body control flow
/// 4. Track lifecycle method execution order
/// 5. Identify unreachable code and unused fields
/// 6. Detect memory leaks (missing disposals)
/// 7. Report performance anti-patterns
class FlowAnalysisPass {
  /// All DartFiles in project (from Pass 3 with type inference)
  final Map<String, DartFile> dartFiles;
  
  /// Type inference info from Pass 3
  final Map<String, dynamic> typeInferenceInfo;
  
  /// Control flow graphs: method_id -> ControlFlowGraph
  final Map<String, ControlFlowGraph> controlFlowGraphs = {};
  
  /// Rebuild trigger graph: state_field_id -> Set<build_method_ids>
  final Map<String, Set<String>> rebuildTriggers = {};
  
  /// State field analysis: field_id -> StateFieldFlowAnalysis
  final Map<String, StateFieldFlowAnalysis> stateFieldAnalysis = {};
  
  /// Lifecycle analysis per State class
  final Map<String, LifecycleFlowAnalysis> lifecycleAnalysis = {};
  
  /// Unused fields/variables: {id, reason}
  final List<UnusedDeclaration> unusedDeclarations = [];
  
  /// Unreachable code locations
  final List<UnreachableCode> unreachableCode = [];
  
  /// Issues found during flow analysis
  final List<AnalysisIssue> flowIssues = [];

  FlowAnalysisPass({
    required this.dartFiles,
    required this.typeInferenceInfo,
  });

  /// Execute complete flow analysis pass
  void analyzeAllFlows() {
    // Step 1: Build control flow graphs for all methods
    _buildControlFlowGraphs();
    
    // Step 2: Trace state field access patterns
    _traceStateFieldAccess();
    
    // Step 3: Build rebuild trigger graph
    _buildRebuildTriggerGraph();
    
    // Step 4: Analyze lifecycle methods
    _analyzeLifecycleMethods();
    
    // Step 5: Detect unreachable code
    _detectUnreachableCode();
    
    // Step 6: Identify unused declarations
    _identifyUnusedDeclarations();
    
    // Step 7: Detect memory leaks
    _detectMemoryLeaks();
    
    // Step 8: Update files with flow information
    _updateDartFilesWithFlowAnalysis();
  }

  // =========================================================================
  // STEP 1: BUILD CONTROL FLOW GRAPHS
  // =========================================================================

  void _buildControlFlowGraphs() {
    for (final dartFile in dartFiles.values) {
      // For each class
      for (final classDecl in dartFile.classDeclarations) {
        // For each method
        for (final method in classDecl.methods) {
          final cfg = _buildMethodCFG(method);
          controlFlowGraphs[method.id] = cfg;
        }
        
        // For each constructor
        if (classDecl is ClassDecl) {
          for (final constructor in classDecl.constructors) {
            final cfg = _buildConstructorCFG(constructor);
            controlFlowGraphs[constructor.id] = cfg;
          }
        }
        
        // For State classes, handle lifecycle methods specially
        if (classDecl is StateDecl) {
          if (classDecl.initState != null) {
            final cfg = _buildLifecycleMethodCFG(
              classDecl.initState!,
              'initState',
              classDecl.sourceLocation,
            );
            controlFlowGraphs['${classDecl.id}_initState'] = cfg;
          }
          
          if (classDecl.dispose != null) {
            final cfg = _buildLifecycleMethodCFG(
              classDecl.dispose!,
              'dispose',
              classDecl.sourceLocation,
            );
            controlFlowGraphs['${classDecl.id}_dispose'] = cfg;
          }
          
          if (classDecl.buildMethod != null) {
            final cfg = _buildBuildMethodCFG(
              classDecl.buildMethod!,
              classDecl.sourceLocation,
            );
            controlFlowGraphs['${classDecl.id}_build'] = cfg;
          }
        }
      }
      
      // For each top-level function
      for (final func in dartFile.functionDeclarations) {
        final cfg = _buildFunctionCFG(func);
        controlFlowGraphs[func.id] = cfg;
      }
    }
  }

  ControlFlowGraph _buildMethodCFG(MethodDecl method) {
    final cfg = ControlFlowGraph(methodId: method.id);
    
    // Entry node
    final entryNode = CFGNode(
      id: '${method.id}_entry',
      type: CFGNodeType.entry,
      label: 'Entry: ${method.name}',
      sourceLocation: method.sourceLocation,
    );
    cfg.addNode(entryNode);
    cfg.entryNode = entryNode;
    
    // Exit node
    final exitNode = CFGNode(
      id: '${method.id}_exit',
      type: CFGNodeType.exit,
      label: 'Exit: ${method.name}',
      sourceLocation: method.sourceLocation,
    );
    cfg.addNode(exitNode);
    cfg.exitNode = exitNode;
    
    if (method.body != null) {
      final bodyNodes = _buildCFGFromStatement(method.body!, cfg, method.id);
      
      if (bodyNodes.isNotEmpty) {
        cfg.addEdge(entryNode, bodyNodes.first, 'normal');
        for (final node in bodyNodes) {
          if (node.type == CFGNodeType.join || node.successors.isEmpty) {
            cfg.addEdge(node, exitNode, 'normal');
          }
        }
      } else {
        cfg.addEdge(entryNode, exitNode, 'normal');
      }
    } else {
      cfg.addEdge(entryNode, exitNode, 'normal');
    }
    
    return cfg;
  }

  ControlFlowGraph _buildLifecycleMethodCFG(
  LifecycleMethodDecl method,
  String methodName,
  SourceLocationIR sourceLocation,
) {
  final cfg = ControlFlowGraph(methodId: '${methodName}_lifecycle');
  
  final entryNode = CFGNode(
    id: '${methodName}_entry',
    type: CFGNodeType.entry,
    label: 'Entry: $methodName',
    sourceLocation: sourceLocation,
  );
  cfg.addNode(entryNode);
  cfg.entryNode = entryNode;
  
  final exitNode = CFGNode(
    id: '${methodName}_exit',
    type: CFGNodeType.exit,
    label: 'Exit: $methodName',
    sourceLocation: sourceLocation,
  );
  cfg.addNode(exitNode);
  cfg.exitNode = exitNode;
  
  // Extract statements from body
  final statements = <StatementIR>[];
  if (method.body != null) {
    if (method.body is BlockStmt) {
      statements.addAll((method.body as BlockStmt).statements);
    } else {
      statements.add(method.body as StatementIR);
    }
  }
  
  // Create nodes for each statement
  if (statements.isNotEmpty) {
    for (int i = 0; i < statements.length; i++) {
      final stmtNode = CFGNode(
        id: '${methodName}_stmt_$i',
        type: CFGNodeType.statement,
        label: 'Statement ${i + 1}',
        sourceLocation: sourceLocation,
      );
      cfg.addNode(stmtNode);
      
      if (i == 0) {
        cfg.addEdge(entryNode, stmtNode, 'normal');
      } else {
        cfg.addEdge(cfg.nodes[cfg.nodes.length - 2], stmtNode, 'normal');
      }
    }
    
    // Connect last statement to exit
    cfg.addEdge(cfg.nodes[cfg.nodes.length - 2], exitNode, 'normal');
  } else {
    // No body - direct edge from entry to exit
    cfg.addEdge(entryNode, exitNode, 'normal');
  }
  
  return cfg;
}

  ControlFlowGraph _buildBuildMethodCFG(
    BuildMethodDecl method,
    SourceLocationIR sourceLocation,
  ) {
    final cfg = ControlFlowGraph(methodId: method.id);
    
    final entryNode = CFGNode(
      id: '${method.id}_entry',
      type: CFGNodeType.entry,
      label: 'Entry: build',
      sourceLocation: sourceLocation,
    );
    cfg.addNode(entryNode);
    cfg.entryNode = entryNode;
    
    final exitNode = CFGNode(
      id: '${method.id}_exit',
      type: CFGNodeType.exit,
      label: 'Exit: build',
      sourceLocation: sourceLocation,
    );
    cfg.addNode(exitNode);
    cfg.exitNode = exitNode;
    
    // Create decision node if has conditionals
    if (method.hasConditionals) {
      final condNode = CFGNode(
        id: '${method.id}_cond',
        type: CFGNodeType.decision,
        label: 'Build conditionals',
        sourceLocation: sourceLocation,
      );
      cfg.addNode(condNode);
      cfg.addEdge(entryNode, condNode, 'normal');
      cfg.addEdge(condNode, exitNode, 'normal');
    } else {
      cfg.addEdge(entryNode, exitNode, 'normal');
    }
    
    // Create loop node if has loops
    if (method.hasLoops) {
      final loopNode = CFGNode(
        id: '${method.id}_loop',
        type: CFGNodeType.loop,
        label: 'Widget loop',
        sourceLocation: sourceLocation,
      );
      cfg.addNode(loopNode);
      // Add loop-back edge
      cfg.addEdge(loopNode, loopNode, 'loop_back');
    }
    
    return cfg;
  }

  ControlFlowGraph _buildConstructorCFG(ConstructorDecl constructor) {
    final cfg = ControlFlowGraph(methodId: constructor.id);
    
    final entryNode = CFGNode(
      id: '${constructor.id}_entry',
      type: CFGNodeType.entry,
      label: 'Constructor Entry',
      sourceLocation: constructor.sourceLocation,
    );
    cfg.addNode(entryNode);
    cfg.entryNode = entryNode;
    
    final exitNode = CFGNode(
      id: '${constructor.id}_exit',
      type: CFGNodeType.exit,
      label: 'Constructor Exit',
      sourceLocation: constructor.sourceLocation,
    );
    cfg.addNode(exitNode);
    cfg.exitNode = exitNode;
    
    cfg.addEdge(entryNode, exitNode, 'normal');
    return cfg;
  }

  ControlFlowGraph _buildFunctionCFG(FunctionDecl func) {
    final cfg = ControlFlowGraph(methodId: func.id);
    
    final entryNode = CFGNode(
      id: '${func.id}_entry',
      type: CFGNodeType.entry,
      label: 'Function Entry: ${func.name}',
      sourceLocation: func.sourceLocation,
    );
    cfg.addNode(entryNode);
    cfg.entryNode = entryNode;
    
    final exitNode = CFGNode(
      id: '${func.id}_exit',
      type: CFGNodeType.exit,
      label: 'Function Exit: ${func.name}',
      sourceLocation: func.sourceLocation,
    );
    cfg.addNode(exitNode);
    cfg.exitNode = exitNode;
    
    cfg.addEdge(entryNode, exitNode, 'normal');
    return cfg;
  }

  List<CFGNode> _buildCFGFromStatement(
    dynamic stmt,
    ControlFlowGraph cfg,
    String contextId,
  ) {
    final nodeCounter = cfg.nodeCounter;
    
    if (stmt is BlockStmt) {
      final allNodes = <CFGNode>[];
      for (final s in stmt.statements) {
        allNodes.addAll(_buildCFGFromStatement(s, cfg, contextId));
      }
      return allNodes;
    } else if (stmt is IfStmt) {
      final conditionNode = CFGNode(
        id: '${contextId}_if_${nodeCounter}',
        type: CFGNodeType.decision,
        label: 'If Condition',
        sourceLocation: stmt.sourceLocation,
      );
      cfg.addNode(conditionNode);
      cfg.nodeCounter++;
      
      final thenNodes = _buildCFGFromStatement(stmt.thenBranch, cfg, contextId);
      final elseNodes = stmt.elseBranch != null
          ? _buildCFGFromStatement(stmt.elseBranch!, cfg, contextId)
          : <CFGNode>[];
      
      if (thenNodes.isNotEmpty) {
        cfg.addEdge(conditionNode, thenNodes.first, 'then');
      }
      if (elseNodes.isNotEmpty) {
        cfg.addEdge(conditionNode, elseNodes.first, 'else');
      } else if (stmt.elseBranch == null) {
        final skipNode = CFGNode(
          id: '${contextId}_skip_${nodeCounter}',
          type: CFGNodeType.join,
          label: 'Skip',
          sourceLocation: stmt.sourceLocation,
        );
        cfg.addNode(skipNode);
        cfg.nodeCounter++;
        cfg.addEdge(conditionNode, skipNode, 'else');
        elseNodes.add(skipNode);
      }
      
      final joinNode = CFGNode(
        id: '${contextId}_join_${nodeCounter}',
        type: CFGNodeType.join,
        label: 'Join',
        sourceLocation: stmt.sourceLocation,
      );
      cfg.addNode(joinNode);
      cfg.nodeCounter++;
      
      for (final n in thenNodes) {
        cfg.addEdge(n, joinNode, 'normal');
      }
      for (final n in elseNodes) {
        cfg.addEdge(n, joinNode, 'normal');
      }
      
      return [joinNode];
    } else if (stmt is ForStmt) {
      final loopNode = CFGNode(
        id: '${contextId}_loop_${nodeCounter}',
        type: CFGNodeType.loop,
        label: 'For Loop',
        sourceLocation: stmt.sourceLocation,
      );
      cfg.addNode(loopNode);
      cfg.nodeCounter++;
      
      final bodyNodes = _buildCFGFromStatement(stmt.body, cfg, contextId);
      
      if (bodyNodes.isNotEmpty) {
        cfg.addEdge(bodyNodes.last, loopNode, 'loop_back');
      }
      
      return [loopNode];
    } else {
      final stmtNode = CFGNode(
        id: '${contextId}_stmt_${nodeCounter}',
        type: CFGNodeType.statement,
        label: 'Statement',
        sourceLocation: stmt.sourceLocation,
      );
      cfg.addNode(stmtNode);
      cfg.nodeCounter++;
      
      return [stmtNode];
    }
  }

  // =========================================================================
  // STEP 2: TRACE STATE FIELD ACCESS
  // =========================================================================

  void _traceStateFieldAccess() {
  for (final dartFile in dartFiles.values) {
    for (final classDecl in dartFile.classDeclarations) {
      if (classDecl is! StateDecl) continue;
      
      // Initialize analysis for each state field
      for (final field in classDecl.stateFields) {
        stateFieldAnalysis[field.name] = StateFieldFlowAnalysis(
          fieldId: field.name,
          fieldName: field.name,
          type: field.type.displayName(), // Convert TypeIR to string
          sourceLocation: field.sourceLocation,
          readLocations: field.buildAccessLines
              .map((line) => SourceLocationIR(
                    id: 'loc_read_$line',
                    file: dartFile.filePath,
                    line: line,
                    column: 0,
                    offset: 0,
                    length: 0,
                  ))
              .toList(),
          writeLocations: field.setStateModificationLines
              .map((line) => SourceLocationIR(
                    id: 'loc_write_$line',
                    file: dartFile.filePath,
                    line: line,
                    column: 0,
                    offset: 0,
                    length: 0,
                  ))
              .toList(),
          affectedBy: field.affectedBy.map((f) => f.name).toList(),
          affects: field.affects.map((f) => f.name).toList(),
          triggersRebuild: field.triggersRebuild,
        );
      }
    }
  }
}

  // =========================================================================
  // STEP 3: BUILD REBUILD TRIGGER GRAPH
  // =========================================================================

  void _buildRebuildTriggerGraph() {
    for (final dartFile in dartFiles.values) {
      for (final classDecl in dartFile.classDeclarations) {
        if (classDecl is! StateDecl) continue;
        if (classDecl.buildMethod == null) continue;
        
        for (final field in classDecl.stateFields) {
          if (!field.isLate && field.triggersRebuild) {
            rebuildTriggers[field.name] = {'${classDecl.id}_build'};
          }
        }
      }
    }
  }

  // =========================================================================
  // STEP 4: ANALYZE LIFECYCLE METHODS
  // =========================================================================

  void _analyzeLifecycleMethods() {
    for (final dartFile in dartFiles.values) {
      for (final classDecl in dartFile.classDeclarations) {
        if (classDecl is! StateDecl) continue;
        
        final analysis = LifecycleFlowAnalysis(
          stateClassId: classDecl.id,
          stateClassName: classDecl.name,
        );
        
        // Analyze initState
        if (classDecl.initState != null) {
          analysis.initStateOperations = _extractOperationsFromLifecycleMethod(
            classDecl.initState!,
          );
          analysis.callsSuperInitState = classDecl.initStateCallsSuper;
        }
        
        // Analyze dispose
        if (classDecl.dispose != null) {
          analysis.disposeOperations = _extractOperationsFromLifecycleMethod(
            classDecl.dispose!,
          );
          analysis.callsSuperDispose = classDecl.disposeCallsSuper;
          
          // Check for undisposed controllers
          _checkControllerDisposal(classDecl, analysis);
        }
        
        lifecycleAnalysis[classDecl.id] = analysis;
      }
    }
  }

List<LifecycleOperation> _extractOperationsFromLifecycleMethod(
  LifecycleMethodDecl method,
) {
  final operations = <LifecycleOperation>[];
  
  // Extract statements from method body
  if (method.body == null) return operations;
  
  final statements = <StatementIR>[];
  if (method.body is BlockStmt) {
    statements.addAll((method.body as BlockStmt).statements);
  } else {
    statements.add(method.body as StatementIR);
  }
  
  for (int i = 0; i < statements.length; i++) {
    operations.add(LifecycleOperation(
      type: 'statement',
      description: statements[i].toString(),
      sourceLocation: SourceLocationIR(
        id: 'loc_stmt_${method.id}_$i',
        file: '',
        line: method.sourceLocation.line + i,
        column: 0,
        offset: 0,
        length: 0,
      ),
    ));
  }
  
  return operations;
}

  // void _checkControllerDisposal(
  //   StateDecl stateClass,
  //   LifecycleFlowAnalysis analysis,
  // ) {
  //   for (final controller in stateClass.controllersMissingDisposal) {
  //     _addFlowIssue(
  //       severity: IssueSeverity.error,
  //       message:
  //           'Controller $controller created but not disposed in dispose()',
  //       sourceLocation: SourceLocationIR(
  //         id: 'loc_undisposed',
  //         file: '',
  //         line: 0,
  //         column: 0,
  //         offset: 0,
  //         length: 0,
  //       ),
  //       code: 'UNDISPOSED_CONTROLLER',
  //     );
  //   }
  // }
  void _checkControllerDisposal(
  StateDecl stateClass,
  LifecycleFlowAnalysis analysis,
) {
  for (final controller in stateClass.controllersMissingDisposal) {
    _addFlowIssue(
      severity: IssueSeverity.error,
      message: 'Controller "${controller.name}" created but not disposed in dispose()',
      sourceLocation: controller.sourceLocation,
      code: 'CONTROLLER_NOT_DISPOSED',
    );
  }
}

  // =========================================================================
  // STEP 5: DETECT UNREACHABLE CODE
  // =========================================================================

  void _detectUnreachableCode() {
    for (final cfg in controlFlowGraphs.values) {
      final reachable = _computeReachableNodes(cfg);
      
      for (final node in cfg.nodes) {
        if (!reachable.contains(node.id) && node.type != CFGNodeType.exit) {
          unreachableCode.add(UnreachableCode(
            nodeId: node.id,
            reason: 'Dead code: no path from entry',
            sourceLocation: node.sourceLocation,
          ));
          
          _addFlowIssue(
            severity: IssueSeverity.warning,
            message: 'Unreachable code detected',
            sourceLocation: node.sourceLocation,
            code: 'UNREACHABLE_CODE',
          );
        }
      }
    }
  }

  Set<String> _computeReachableNodes(ControlFlowGraph cfg) {
    final reachable = <String>{};
    final worklist = <CFGNode>[cfg.entryNode];
    
    while (worklist.isNotEmpty) {
      final node = worklist.removeAt(0);
      
      if (reachable.contains(node.id)) continue;
      reachable.add(node.id);
      
      for (final successor in node.successors) {
        if (!reachable.contains(successor.id)) {
          worklist.add(successor);
        }
      }
    }
    
    return reachable;
  }

  // =========================================================================
  // STEP 6: IDENTIFY UNUSED DECLARATIONS
  // =========================================================================

  void _identifyUnusedDeclarations() {
    for (final dartFile in dartFiles.values) {
      for (final variable in dartFile.variableDeclarations) {
        if (variable.isPrivate) {
          unusedDeclarations.add(UnusedDeclaration(
            id: variable.id,
            name: variable.name,
            kind: 'variable',
            reason: 'Declared but never used',
            sourceLocation: variable.sourceLocation,
          ));
          
          _addFlowIssue(
            severity: IssueSeverity.hint,
            message: 'Variable ${variable.name} is never used',
            sourceLocation: variable.sourceLocation,
            code: 'UNUSED_VARIABLE',
          );
        }
      }
      
      for (final classDecl in dartFile.classDeclarations) {
        if (classDecl is StateDecl) {
          for (final field in classDecl.unusedStateFields) {
            unusedDeclarations.add(UnusedDeclaration(
              id: field.name,
              name: field.name,
              kind: 'state_field',
              reason: 'State field never accessed in build()',
              sourceLocation: SourceLocationIR(
                id: 'loc_unused_${field.name}',
                file: dartFile.filePath,
                line: 0,
                column: 0,
                offset: 0,
                length: 0,
              ),
            ));
            
            _addFlowIssue(
              severity: IssueSeverity.hint,
              message: 'State field ${field.name} is never used',
              sourceLocation: SourceLocationIR(
                id: 'loc_unused_${field.name}',
                file: dartFile.filePath,
                line: 0,
                column: 0,
                offset: 0,
                length: 0,
              ),
              code: 'UNUSED_STATE_FIELD',
            );
          }
        }
      }
    }
  }

  // =========================================================================
  // STEP 7: DETECT MEMORY LEAKS
  // =========================================================================

  void _detectMemoryLeaks() {
    for (final dartFile in dartFiles.values) {
      for (final classDecl in dartFile.classDeclarations) {
        if (classDecl is! StateDecl) continue;
        
        if (classDecl.dispose == null && classDecl.controllers.isNotEmpty) {
          _addFlowIssue(
            severity: IssueSeverity.warning,
            message: '${classDecl.name} has no dispose() method',
            sourceLocation: classDecl.sourceLocation,
            code: 'MISSING_DISPOSE',
          );
        }
        
        for (final issue in classDecl.lifecycleIssues) {
          if (issue.type == LifecycleIssueType.controllerNotDisposed) {
            _addFlowIssue(
              severity: issue.severity,
              message: issue.message,
              sourceLocation: SourceLocationIR(
                id: 'loc_issue_${issue.lineNumber}',
                file: dartFile.filePath,
                line: issue.lineNumber,
                column: 0,
                offset: 0,
                length: 0,
              ),
              code: 'CONTROLLER_NOT_DISPOSED',
            );
          }
        }
      }
    }
  }

  // =========================================================================
  // STEP 8: UPDATE FILES WITH FLOW ANALYSIS
  // =========================================================================

  void _updateDartFilesWithFlowAnalysis() {
    for (final dartFile in dartFiles.values) {
      dartFile.flowAnalysisInfo = FlowAnalysisInfo(
        controlFlowGraphs: controlFlowGraphs,
        rebuildTriggers: rebuildTriggers,
        stateFieldAnalysis: stateFieldAnalysis,
        lifecycleAnalysis: lifecycleAnalysis,
        unusedDeclarations: unusedDeclarations,
        unreachableCode: unreachableCode,
        issues: flowIssues,
      );
    }
  }

  // =========================================================================
  // ISSUE REPORTING
  // =========================================================================

  void _addFlowIssue({
    required IssueSeverity severity,
    required String message,
    required SourceLocationIR sourceLocation,
    required String code,
  }) {
    final issueId =
        'flow_issue_${flowIssues.length}_${DateTime.now().millisecondsSinceEpoch}';
    
    flowIssues.add(AnalysisIssue(
      id: issueId,
      code: code,
      severity: severity,
      category: IssueCategory.controlFlow,
      message: message,
      sourceLocation: sourceLocation,
    ));
  }
}

// =========================================================================
// SUPPORTING TYPES
// =========================================================================

enum CFGNodeType { entry, exit, statement, decision, join, loop }

class CFGNode {
  final String id;
  final CFGNodeType type;
  final String label;
  final SourceLocationIR sourceLocation;
  final List<CFGNode> successors = [];
  final List<CFGNode> predecessors = [];

  CFGNode({
    required this.id,
    required this.type,
    required this.label,
    required this.sourceLocation,
  });
}

class ControlFlowGraph {
  final String methodId;
  late CFGNode entryNode;
  late CFGNode exitNode;
  final List<CFGNode> nodes = [];
  int nodeCounter = 0;

  ControlFlowGraph({required this.methodId});

  void addNode(CFGNode node) => nodes.add(node);

  void addEdge(CFGNode from, CFGNode to, String label) {
    from.successors.add(to);
    to.predecessors.add(from);
  }
}

class StateFieldFlowAnalysis {
  final String fieldId;
  final String fieldName;
  final String type; // Already string
  final SourceLocationIR sourceLocation;
  final List<SourceLocationIR> readLocations;
  final List<SourceLocationIR> writeLocations;
  final List<String> affectedBy;    // Changed to List<String>
  final List<String> affects;       // Changed to List<String>
  final bool triggersRebuild;

  StateFieldFlowAnalysis({
    required this.fieldId,
    required this.fieldName,
    required this.type,
    required this.sourceLocation,
    required this.readLocations,
    required this.writeLocations,
    required this.affectedBy,
    required this.affects,
    required this.triggersRebuild,
  });
}

class LifecycleFlowAnalysis {
  final String stateClassId;
  final String stateClassName;
  List<LifecycleOperation> initStateOperations = [];
  List<LifecycleOperation> disposeOperations = [];
  bool callsSuperInitState = false;
  bool callsSuperDispose = false;

  LifecycleFlowAnalysis({
    required this.stateClassId,
    required this.stateClassName,
  });
}

class LifecycleOperation {
  final String type;
  final String description;
  final SourceLocationIR sourceLocation;

  LifecycleOperation({
    required this.type,
    required this.description,
    required this.sourceLocation,
  });
}

class UnreachableCode {
  final String nodeId;
  final String reason;
  final SourceLocationIR sourceLocation;

  UnreachableCode({
    required this.nodeId,
    required this.reason,
    required this.sourceLocation,
  });
}

class UnusedDeclaration {
  final String id;
  final String name;
  final String kind;
  final String reason;
  final SourceLocationIR sourceLocation;

  UnusedDeclaration({
    required this.id,
    required this.name,
    required this.kind,
    required this.reason,
    required this.sourceLocation,
  });
}

class FlowAnalysisInfo {
  final Map<String, ControlFlowGraph> controlFlowGraphs;
  final Map<String, Set<String>> rebuildTriggers;
  final Map<String, StateFieldFlowAnalysis> stateFieldAnalysis;
  final Map<String, LifecycleFlowAnalysis> lifecycleAnalysis;
  final List<UnusedDeclaration> unusedDeclarations;
  final List<UnreachableCode> unreachableCode;
  final List<AnalysisIssue> issues;

  FlowAnalysisInfo({
    required this.controlFlowGraphs,
    required this.rebuildTriggers,
    required this.stateFieldAnalysis,
    required this.lifecycleAnalysis,
    required this.unusedDeclarations,
    required this.unreachableCode,
    required this.issues,
  });
}

// Extension to DartFile for flow analysis info
extension DartFileFlowAnalysis on DartFile {
  static final _flowAnalysisData = <String, FlowAnalysisInfo>{};

  FlowAnalysisInfo? get flowAnalysisInfo => _flowAnalysisData[filePath];
  set flowAnalysisInfo(FlowAnalysisInfo? value) {
    if (value != null) {
      _flowAnalysisData[filePath] = value;
    } else {
      _flowAnalysisData.remove(filePath);
    }
  }
}