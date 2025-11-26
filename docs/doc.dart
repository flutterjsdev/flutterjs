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


/// <---------------------------------------------------------------------------->
/// type_inference_pass.dart
/// ----------------------------------------------------------------------------
///
/// Bottom-up type inference engine for expressions and declarations (Pass 3).
///
/// Infers types for all expressions ([ExpressionIR]) using resolved symbols,
/// operator rules, and compatibility graphs. Replaces [UnresolvedTypeIR] with
/// concrete types and reports mismatches.
///
/// Primary class: [TypeInferencePass] – traverses files to infer types recursively,
/// caching results and building a compatibility graph for hierarchies/subtypes.
///
/// Features:
/// • Literal inference (int, string, list, map, etc.)
/// • Binary/unary op type propagation (e.g., int + double → double)
/// • Function call/return type resolution with generics
/// • Scope-based variable type tracking
/// • Custom IR for wrappers (FutureTypeIR, StreamTypeIR)
/// • Provider-specific inference (state types from registries)
/// • Issue reporting for mismatches/incompatibilities
///
/// Example:
/// dart /// final inferred = inferer.inferExpressionType(expr); /// if (inferred is UnresolvedTypeIR) { report error } ///
///
/// Enables:
/// • Flow analysis (Pass 4) with typed statements
/// • Validation (Pass 5) for type-safe patterns
/// • Optimization hints (e.g., unnecessary casts)
/// • Advanced queries (e.g., "find all Future<Widget> returns")
///
/// Types are immutable; info stored as [TypeInferenceInfo] per file.
/// <---------------------------------------------------------------------------->

/// <---------------------------------------------------------------------------->
/// symbol_resolution.dart
/// ----------------------------------------------------------------------------
///
/// Symbol resolution engine for a multi-file Dart/Flutter project analyzer (Pass 2).
///
/// Takes raw declarations and links references to definitions, resolving imports,
/// types, and associations (e.g., StatefulWidget → State). It builds a global
/// symbol table and handles qualified names, prefixes, and relative paths.
///
/// Main class: [SymbolResolutionPass] – performs resolution across all files,
/// producing [ResolutionInfo] with bindings, registries, and issues.
///
/// Features:
/// • Global registry for classes/functions/variables
/// • Import/export resolution (absolute/relative/package URIs)
/// • Widget-State pairing via generics and createState overrides
/// • Provider detection (ChangeNotifier, Bloc, etc.) with type classification
/// • Type reference resolution (simple → fully qualified, with generics)
/// • Built-in type checks and fallback handling
/// • Issue reporting for unresolved symbols/circular imports
///
/// Example:
/// dart /// resolver.resolveAllSymbols(); /// final state = file.resolutionInfo.widgetStateBindings[widgetName]; ///
///
/// Essential for:
/// • Type inference (Pass 3)
/// • Flow analysis (Pass 4)
/// • Cross-file diagnostics (unused imports, dead code)
/// • IDE-like features (go-to-definition, rename refactoring)
///
/// All registries use immutable maps; issues as [AnalysisIssue] with codes/suggestions.
/// <---------------------------------------------------------------------------->

/// <---------------------------------------------------------------------------->
/// statement_extraction_pass.dart
/// ----------------------------------------------------------------------------
///
/// AST-to-IR converter for Dart statements and expressions in a Flutter analyzer.
///
/// This pass extracts executable code (bodies of methods/functions/constructors)
/// into a structured IR ([StatementIR], [ExpressionIR]) for further analysis.
/// It handles all major statement types (blocks, ifs, loops, switches, etc.)
/// and expressions (literals, binaries, calls, cascades, etc.).
///
/// Core class: [StatementExtractionPass] – traverses AST nodes to build IR trees,
/// preserving source locations, metadata, and structural details.
///
/// Key features:
/// • Recursive extraction with null-safety and error handling
/// • Support for modern Dart (patterns, records, cascades, null-aware ops)
/// • Enum mappings for operators ([BinaryOperatorIR], [UnaryOperatorIR])
/// • Specialized IR for complex constructs (e.g., [CascadeExpressionIR])
/// • Debug utilities for body type inspection and extraction logging
///
/// Typical usage:
/// dart /// final statements = extractor.extractBodyStatements(functionBody); /// // Now analyze statements for flows, types, etc. ///
///
/// Powers:
/// • Control flow graph building
/// • Type inference on expressions
/// • Pattern matching for anti-patterns (e.g., setState in loops)
/// • Code generation/refactoring tools
///
/// IR nodes are immutable, JSON-serializable, and provide toShortString for summaries.
/// <---------------------------------------------------------------------------->

/// <---------------------------------------------------------------------------->
/// flow_analysis_pass.dart
/// ----------------------------------------------------------------------------
///
/// Control flow and data flow analysis module for a multi-pass Flutter analyzer.
///
/// This pass (Pass 4) takes typed declarations and builds:
/// • Control flow graphs ([ControlFlowGraph]) for methods/constructors
/// • Rebuild trigger mappings ([rebuildTriggers]) linking state fields to builds
/// • State field access traces ([StateFieldFlowAnalysis]) for reads/writes
/// • Lifecycle operation tracking ([LifecycleFlowAnalysis]) for State classes
/// • Detection of unreachable code, unused declarations, and memory leaks
///
/// Primary class: [FlowAnalysisPass] – orchestrates the analysis, producing
/// a [FlowAnalysisInfo] per file with graphs, traces, and issues.
///
/// Features:
/// • Bottom-up CFG construction with node types (entry, exit, decision, etc.)
/// • Transitive rebuild trigger computation
/// • Scope-aware variable tracking and mutation analysis
/// • Integration with prior passes (types, resolutions) for accurate flows
/// • JSON-serializable IR for external visualization (e.g., graph exports)
///
/// Used by downstream passes for:
/// • Dead code elimination
/// • Performance diagnostics (unnecessary rebuilds)
/// • Bug detection (use-before-init, missing dispose)
/// • Optimization suggestions (batch setState, lazy init)
///
/// All data is immutable post-analysis; issues are reported as [AnalysisIssue].
/// <---------------------------------------------------------------------------->


/// <---------------------------------------------------------------------------->
/// declaration_pass.dart
/// ----------------------------------------------------------------------------
///
/// Initial AST traversal and declaration extraction for a Flutter/Dart analyzer (Pass 1).
///
/// Visits the AST to collect top-level declarations (classes, functions, variables,
/// imports/exports/parts) and builds an intermediate representation ([DartFileBuilder]).
/// Integrates widget detection and component extraction for Flutter-specific insights.
///
/// Core class: [DeclarationPass] – a [RecursiveAstVisitor] that populates collections
/// for classes, functions, etc., and extracts components via [ComponentExtractor].
///
/// Key features:
/// • Handles all declaration types with metadata (annotations, docs, visibility)
/// • Widget detection via [WidgetProducerDetector] for classes/functions
/// • Symmetric function extraction for pure/impure classification
/// • Component system for Flutter widgets (constructors, properties, children)
/// • Scope tracking and inheritance chain resolution
/// • Built-in type checks and source location mapping
///
/// Usage:
/// dart /// final pass = DeclarationPass(...); /// compilationUnit.accept(pass); /// final dartFile = pass.buildDartFile(); ///
///
/// Outputs feed into:
/// • Symbol resolution (Pass 2)
/// • Type inference (Pass 3)
/// • Widget tree analysis and validation
/// • Component-based diagnostics (missing props, empty children)
///
/// Includes extensions for convenience (e.g., [ForStatementHelper]) and rich debugging.
/// <---------------------------------------------------------------------------->

// <---------------------------------------------------------------------------->
/// analyzer_widget_detection_setup.dart
/// ----------------------------------------------------------------------------
///
/// Production-grade widget detection utilities for a Flutter static analyzer.
///
/// This module focuses on robust, recursive identification of code that produces
/// Flutter widgets, handling both classes and functions. It integrates with the
/// Dart Analyzer's AST and element model to trace inheritance chains, return types,
/// and builder patterns without relying on unstable APIs.
///
/// Core entity: [WidgetProducerDetector] – a stateful detector that resolves
/// whether any Dart element (class, method, constructor, field) ultimately produces
/// a Widget subtype. It uses:
/// • Type resolution via [InterfaceType] and [DartType]
/// • Recursion guards and caching to handle circular dependencies
/// • Heuristics for common patterns (e.g., builder functions, const constructors)
///
/// Key features:
/// • Detects direct Widget subclasses, StatefulWidget States, and indirect producers
/// • Handles generics, factories, redirects, and inherited types
/// • Stable ID generation for elements to enable caching and cycle detection
/// • Extensible for custom widget-like types (e.g., third-party frameworks)
///
/// Typical usage in an analysis pass:
/// dart:disable-run /// final detector = WidgetProducerDetector(widgetInterfaceType); /// if (detector.producesWidget(classElement)) { /* process as widget */ } ///
///
/// Designed for:
/// • IDE plugins / linters needing precise widget identification
/// • Architecture auditors (e.g., count Stateful vs Stateless)
/// • Refactoring tools (e.g., extract-widget)
/// • Performance analyzers (widget tree depth / rebuild tracking)
///
/// All methods are pure and thread-safe except for the detector's internal cache,
/// which is per-instance. Classes provide rich toString for debugging.
/// <---------------------------------------------------------------------------->
///



/// <---------------------------------------------------------------------------->
/// build_method_ir.dart
/// ----------------------------------------------------------------------------
///
/// Defines the IR representation of a widget's `build()` method in Flutter.js.
/// This structure is responsible for capturing the resulting widget tree
/// produced during the build phase.
///
/// Responsibilities:
/// • Encapsulate the return expression of build()
/// • Preserve source location for debugging and refactoring
/// • Provide type-safe access to widget tree root
/// • Integrate with statement/expression IR extraction
///
/// BuildMethodIR is used by:
/// • Widget tree analyzers
/// • Code generators
/// • Dev tools (visual inspectors)
/// • Hot-reload / hot-restart rebuild diffing
///
/// Design goals:
/// • Minimal, predictable, immutable IR
/// • Clean separation from AST nodes
/// • Full JSON support for serialization
///


/// <---------------------------------------------------------------------------->
/// key_type_ir.dart
/// ----------------------------------------------------------------------------
///
/// IR representation of different widget key types used within Flutter.js.
///
/// Purpose:
/// • Track key usage on IR-based widget nodes  
/// • Support compiler-time validation (e.g., duplicated keys in lists)  
/// • Represent key types in a JSON-friendly, enum-stable form  
///
/// Supported key forms:
/// • `ValueKey<T>`  
/// • `ObjectKey`  
/// • `UniqueKey`  
/// • `GlobalKey` (limited structural representation)
///
/// This module helps ensure:
/// • Consistency across widget-level IR  
/// • Predictable diffing behavior for rebuilds  
/// • Accurate AST-to-IR conversion for key-based widgets  
///


/// <---------------------------------------------------------------------------->
/// widget_node_ir.dart
/// ----------------------------------------------------------------------------
///
/// Core IR structure representing a single widget node in the widget tree.
///
/// Responsibilities:
/// • Capture widget constructor type and arguments  
/// • Hold references to child widget nodes  
/// • Store metadata (keys, attributes, source locations)  
///
/// WidgetNodeIR is used in:
/// • Build method IR output  
/// • Widget tree diffing / reconciliation  
/// • Visual widget tree inspectors  
/// • Code transformation (e.g., automated refactoring)  
///
/// Design Principles:
/// • Immutable, clean IR  
/// • JSON serializable  
/// • Independent of Flutter runtime (pure data)  
/// • Supports complex nested widget structures  
///
/// This file forms the **foundation of the entire widget IR system**.



/// <---------------------------------------------------------------------------->
/// widget_tree_ir.dart
/// ----------------------------------------------------------------------------
///
/// Represents the full widget tree IR generated from a widget's build() method.
///
/// Purpose:
/// • Provide a root node for all WidgetNodeIR descendants
/// • Serve as a context for tree-wide operations (search, diff, validate)
/// • Support dev tools like tree visualizers and code explorers
///
/// Features:
/// • Immutable root reference
/// • Simple traversal utilities
/// • Serializable structure for JSON inspection
/// • Clean separation from AST and live Flutter elements
///
/// This IR is the bridge between:
/// • The AST-based extraction layer
/// • The UI analysis / visualization tooling
/// • The runtime diffing logic for rebuild optimization
///


/// <---------------------------------------------------------------------------->
/// analysis_issue.dart
/// ----------------------------------------------------------------------------
///
/// This file defines the core data model for static analysis issues in a
/// Flutter/Dart codebase analyzer (custom linter, IDE plugin, CI tool, etc.).
///
/// The primary entity is [AnalysisIssue] — an immutable representation of a
/// single diagnostic message produced during source code analysis.
///
/// Key features:
/// • Four severity levels: error, warning, info, hint
/// • Machine-readable unique [id] and [code] for deduplication and IDE actions
/// • Rich location information via [SourceLocationIR]
/// • Optional auto-fix [suggestion]
/// • Support for related/secondary locations (e.g., "defined here")
/// • Full JSON serialization/deserialization for persistence or IPC
/// • Human-readable formatting methods ([displayMessage], [fullReport])
/// • Convenience factory constructors per severity
/// • Built-in deduplication flag ([isDuplicate])
/// • Optional link to external documentation
///
/// Typical usage:
/// ```dart
/// final issue = AnalysisIssue.warning(
///   id: 'my_linter.unused_local_variable_42',
///   code: 'unused_local_variable',
///   message: 'The variable "temp" is declared but never used.',
///   sourceLocation: SourceLocationIR(...),
///   category: IssueCategory.performance,
///   suggestion: 'Remove the unused variable or prefix it with "_".',
///   documentationUrl: 'https://my-linter.dev/rules/unused_local_variable',
/// );
/// print(issue.fullReport);
/// ```
///
/// This class is designed to be consumed by:
/// • IDE extensions (VS Code, IntelliJ/Android Studio)
/// • CLI reporters
/// • Web dashboards / CI result visualizers
/// • In-memory analysis engines that need to merge/deduplicate issues
///
/// All fields are immutable and the class provides value-based equality/hashCode
/// based on the most stable identifiers (id + code + location + severity).
/// This guarantees correct deduplication even when the same logical issue is
/// reported multiple times from different analysis passes.
/// <---------------------------------------------------------------------------->



/// <---------------------------------------------------------------------------->
/// issue_categorizer.dart
/// ----------------------------------------------------------------------------
///
/// Central intelligence engine for classifying raw analysis issues into meaningful,
/// human- and machine-friendly categories.
///
/// This utility uses a multi-layered fallback strategy to determine the best
/// [IssueCategory] for any [AnalysisIssue]:
///
/// 1. Primary: Exact code matching (Dart analyzer, flutter_lints, custom rules)
/// 2. Secondary: Message pattern matching (regex-free, fast keyword detection)
/// 3. Tertiary: Source context analysis (when file content is available)
///
/// Features:
/// • Comprehensive mapping of official Dart analyzer diagnostic codes
/// • Special handling for all major Flutter lint rules
/// • Heuristic fallbacks for unknown or custom linters
/// • Context-aware detection (e.g., setState() inside build(), missing dispose)
/// • Fully static — no instance needed
///
/// Used by [IssueCollector], CLI reporters, IDE plugins, and web dashboards
/// to group, filter, prioritize, and visualize issues effectively.
///
/// Example:
/// ```dart
/// final category = IssueCategorizer.categorize(issue, fileContent: sourceCode);
/// ```
///
/// Maintainers: Add new codes to the appropriate `_xxxCodes` sets or extend
/// the switch expressions for maximum accuracy.
/// <---------------------------------------------------------------------------->



/// <---------------------------------------------------------------------------->
/// issue_category.dart
/// ----------------------------------------------------------------------------
///
/// Exhaustive, Flutter-first taxonomy of analysis issue categories.
///
/// Defines over 100 finely-grained categories covering:
/// • Core Dart issues (syntax, types, null safety, etc.)
/// • Flutter widget lifecycle & best practices
/// • State management patterns (Provider, Bloc, Riverpod, setState, etc.)
/// • Performance, memory leaks, async gaps
/// • Navigation, localization, accessibility, security
/// • Testing, build system, platform channels
///
/// Each category includes:
/// • Human-readable display name
/// • Color code for UI badges
/// • Critical flag (for blocking CI or highlighting)
/// • Related category grouping
/// • Flutter-specific detection logic
///
/// Used everywhere:
/// • Issue filtering & grouping
/// • Dashboard widgets & charts
/// • Severity prioritization
/// • Rule documentation linking
///
/// New categories should be added here first — then mapped in
/// [IssueCategorizer] for detection.
///
/// Goal: Make every issue instantly understandable at a glance.
/// <---------------------------------------------------------------------------->


/// <---------------------------------------------------------------------------->
/// issue_collector.dart
/// ----------------------------------------------------------------------------
///
/// In-memory collector and processor for analysis results.
///
/// Acts as the central registry for all [AnalysisIssue]s produced during a
/// static analysis run (Dart analyzer, custom linters, flutter analyze, etc.).
///
/// Key responsibilities:
/// • Collect & store issues immutably
/// • Deduplicate aggressively (by location + code or location only)
/// • Auto-categorize uncategorized issues via [IssueCategorizer]
/// • Provide rich filtering, grouping, and statistics
/// • Generate beautiful console reports
/// • Export structured JSON or text summaries
/// • Sort issues by severity → file → line (perfect for IDEs and CI)
///
/// Designed for use in:
/// • CLI tools (`flutter analyze`, custom linters)
/// • IDE extensions (VS Code, IntelliJ)
/// • CI/CD pipelines and web dashboards
/// • Testing & benchmarking frameworks
///
/// Thread-safe for single analysis runs. Reset with `clear()` between projects.
///
/// Example:
/// ```dart
/// final collector = IssueCollector();
/// collector.addIssues(issuesFromAnalyzer);
/// collector.deduplicateByLocation();
/// collector.categorizeAll(fileContent: source);
/// collector.printAllIssues();
/// ```
/// <---------------------------------------------------------------------------->



/// <---------------------------------------------------------------------------->
/// source_location.dart
/// ----------------------------------------------------------------------------
///
/// Immutable, rich representation of a source code location.
///
/// Used universally across the analyzer ecosystem to pinpoint where an
/// [AnalysisIssue] occurs — with support for:
/// • Human-readable display (`lib/main.dart:42:8`)
/// • IDE navigation (line/col 1-based)
/// • LSP (Language Server Protocol) compatibility
/// • Byte offsets for precise parsing
/// • Range spanning (multi-line nodes)
/// • JSON serialization
/// • Value-based equality & hashing
///
/// Also includes smart extensions for:
/// • Distance calculations
/// • Range creation
/// • Nearby location checks
/// • Debug-friendly formatting
///
/// This is the single source of truth for "where" in the entire analysis pipeline.
///
/// Preferred over raw maps or analyzer's SourceLocation for consistency
/// and richer functionality.
/// <---------------------------------------------------------------------------->





/// =============================================================================
/// expression_visitor.dart 
/// EXPRESSION & STATEMENT VISITOR FRAMEWORK
///  Core analysis infrastructure for the custom Dart IR
/// =============================================================================
///
/// OVERVIEW
/// --------
/// This file contains the complete visitor pattern implementation for
/// traversing and analyzing the `ExpressionIR` and `StatementIR` AST.
///
/// It enables multiple independent analyses (type inference, constant folding,
/// metrics, linting, etc.) without coupling them to the node classes.
///
/// KEY VISITORS INCLUDED
/// ---------------------
/// • DepthCalculator          → Maximum expression nesting depth
/// • TypeInferencer            → Bottom-up type inference with context
/// • ConstantFolder            → Evaluates compile-time constant expressions
/// • DependencyExtractor       → Extracts function/method/constructor dependencies
/// • StatementCounter          → Counts statements and control-flow nodes
/// • VariableDeclarationExtractor → Finds all declared variables in a block
/// • ReachabilityAnalyzer      → Detects unreachable code after return/throw/break
///
/// EXTENDING THE FRAMEWORK
/// -----------------------
/// To create a new analysis:
///   1. Implement `ExpressionVisitor<R>` and/or `StatementVisitor<R>`
///   2. Use the provided `_visit()` dispatcher for clean type-switching
///   3. Return meaningful results or mutate internal state as needed
///
/// All visitors are designed to be fast, reusable, and composable.
///
/// PERFORMANCE
/// -----------
/// Visitors use direct `is` checks + private `_visit()` dispatchers for
/// maximum performance (avoids virtual method overhead where possible).
///
/// RELATED FILES
/// -------------
/// • variable_collector.dart → Specialized collector for referenced variables
/// • expression_ir.dart      → Core node definitions
/// • statement_ir.dart       → Control-flow node definitions
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
/// Base visitor interface for traversing expressions



/// =============================================================================
/// variable_collector.dart
/// VARIABLE COLLECTOR
///  Part of the custom Dart IR (Intermediate Representation) analyzer
/// =============================================================================
///
/// PURPOSE
/// -------
/// Recursively traverses an expression tree and collects every variable
/// (identifier) that is *read* or *referenced* within it.
///
/// This is extremely useful for:
/// • Detecting undeclared variables
/// • Building dependency graphs
/// • Implementing "find all usages"
/// • Supporting refactoring tools
/// • Analyzing closure-captured variables
/// • Linter rules (e.g. "no unused variables")
///
/// FEATURES
/// --------
/// • Handles all expression kinds (literals, operations, calls, etc.)
/// • Properly walks inside string interpolations
/// • Ignores literals and constants — only collects IdentifierExpr nodes
/// • Thread-safe: can be reused across multiple expressions
/// • Result available via the public `variables` Set<String>
///
/// USAGE EXAMPLE
/// -------------
/// ```dart
/// final collector = VariableCollector();
/// collector.visit(someComplexExpression);
/// print(collector.variables); // → {'count', 'user', 'isActive'}
/// ```
///
/// NOTE
/// ----
/// This visitor only collects *references*, not declarations.
/// For declarations, use `VariableDeclarationExtractor` from expression_visitor.dart.
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
/// Collects all variable references




/// =============================================================================
///advanced.dart
///  FUNCTION, METHOD & CONSTRUCTOR CALLS
///  Invocation expressions in the IR
/// =============================================================================
///
/// PURPOSE
/// -------
/// Represents all forms of callable invocations:
/// • Free functions: print("hello")
/// • Methods: obj.doSomething()
/// • Constructors: MyWidget(), const Text("hi")
/// • Null-aware and cascade calls
///
/// Critical for:
/// • Dependency analysis
/// • Widget tree extraction
/// • Performance profiling
/// • Refactoring
///
/// KEY COMPONENTS
/// --------------
/// • FunctionCallExpr       → print(), myFunc()
/// • MethodCallExpr         → obj.method(), obj?.call(), obj..update()
/// • ConstructorCallExpr    → Widget(), const Padding()
///
/// FEATURES
/// --------
/// • Positional + named arguments
/// • Generic type arguments <T>()
/// • Null-aware and cascade support
/// • const constructor detection
/// • Rich metadata attachment
///
/// RELATED FILES
/// -------------
/// • expression_ir.dart
/// • constructor_call_expr.dart (legacy)
/// • statement_widget_analyzer.dart → Heavily uses ConstructorCallExpr
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================



/// =============================================================================
/// function_method_calls.dart
/// FUNCTION, METHOD & CONSTRUCTOR CALLS
///  Invocation expressions in the IR
/// =============================================================================
///
/// PURPOSE
/// -------
/// Represents all forms of callable invocations:
/// • Free functions: print("hello")
/// • Methods: obj.doSomething()
/// • Constructors: MyWidget(), const Text("hi")
/// • Null-aware and cascade calls
///
/// Critical for:
/// • Dependency analysis
/// • Widget tree extraction
/// • Performance profiling
/// • Refactoring
///
/// KEY COMPONENTS
/// --------------
/// • FunctionCallExpr       → print(), myFunc()
/// • MethodCallExpr         → obj.method(), obj?.call(), obj..update()
/// • ConstructorCallExpr    → Widget(), const Padding()
///
/// FEATURES
/// --------
/// • Positional + named arguments
/// • Generic type arguments <T>()
/// • Null-aware and cascade support
/// • const constructor detection
/// • Rich metadata attachment
///
/// RELATED FILES
/// -------------
/// • expression_ir.dart
/// • constructor_call_expr.dart (legacy)
/// • statement_widget_analyzer.dart → Heavily uses ConstructorCallExpr
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================


/// =============================================================================
/// literals.dart
///  LITERAL EXPRESSIONS
///  Constants and collection literals in the IR
/// =============================================================================
///
/// PURPOSE
/// -------
/// Represents compile-time known values and collection literals:
/// • Primitives: 42, 3.14, true, "hello", null
/// • Collections: [1, 2], {'a': 1}, <int>{1, 2}
/// • String interpolation: "Hello $name"
///
/// Used heavily in:
/// • Constant evaluation
/// • Widget optimization (const widgets)
/// • Code generation
/// • Dead code elimination
///
/// KEY COMPONENTS
/// --------------
/// • Int/Double/String/Bool/NullLiteralExpr
/// • ListLiteralExpr, MapLiteralExpr, SetLiteralExpr
/// • MapEntryIR (for map entries)
/// • isConstant flag (true for pure literals)
///
/// FEATURES
/// --------
/// • Full interpolation support in strings
/// • Type information for collections
/// • JSON serialization
/// • Smart toShortString() with element counts
///
/// RELATED FILES
/// -------------
/// • expression_ir.dart
/// • type_ir.dart
/// • constant_evaluator.dart (future)
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================


/// =============================================================================
/// operations.dart 
/// OPERATOR EXPRESSIONS
///  Binary, unary, assignment, and conditional operations
/// =============================================================================
///
/// PURPOSE
/// -------
/// Models all Dart operators as first-class IR nodes:
/// • Arithmetic: +, -, *, /, ~/
/// • Comparison: ==, !=, <, >, <=, >=
/// • Logical: &&, ||
/// • Bitwise: &, |, ^, <<, >>>
/// • Null coalescing: ??>
/// • Assignments: =, +=, ??=
/// • Ternary: condition ? a : b
///
/// Essential for:
/// • Constant folding
/// • Optimization
/// • Code transformation
/// • Linter rules
///
/// KEY COMPONENTS
/// --------------
/// • BinaryOpExpr           → left + right
/// • UnaryOpExpr            → !value, ++count
/// • AssignmentExpr         → x = 5, y += 1
/// • ConditionalExpr        → isTrue ? a : b
///
/// FEATURES
/// --------
/// • Full enum coverage of Dart operators
/// • Compound assignment support
/// • isConstant flag for folding
/// • Rich toShortString()
///
/// RELATED FILES
/// -------------
/// • expression_ir.dart
/// • type_ir.dart
/// • constant_folder.dart (future)
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================



/// =============================================================================
/// vaibales_access.dart 
/// VARIABLES & MEMBER ACCESS EXPRESSIONS
///  Identifier, property access, and index access in the IR
/// =============================================================================
///
/// PURPOSE
/// -------
/// Represents how code reads from variables and accesses object members:
/// • Simple identifiers: count, userName, MyClass
/// • Property access: obj.property, obj?.property
/// • Index access: list[0], map['key']
///
/// Critical for:
/// • Variable usage analysis
/// • Refactoring (rename symbol)
/// • Null-safety checking
/// • Dependency extraction
///
/// KEY COMPONENTS
/// --------------
/// • IdentifierExpr         → Variable, function, or type name
/// • PropertyAccessExpr     → obj.property (with null-aware support)
/// • IndexAccessExpr        → collection[index]
///
/// FEATURES
/// --------
/// • Null-aware property access (?.)
/// • Type reference detection (e.g., int in var x = int;)
/// • Human-readable toShortString()
/// • Immutable + metadata support
///
/// RELATED FILES
/// -------------
/// • expression_ir.dart
/// • variable_collector.dart  → Uses IdentifierExpr heavily
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// NOTE:    File was previously named "vaibales_access.dart" — renamed for correctness
/// =============================================================================



/// =============================================================================
/// cascade_expression_ir.dart 
/// ADVANCED EXPRESSION IR REPRESENTATIONS
///  Cascade, null-aware, coalescing, and other complex expressions
/// =============================================================================
///
/// PURPOSE
/// -------
/// Extends the core ExpressionIR with advanced Dart features:
/// • Cascades: obj..method()..prop = value
/// • Null-aware: obj?.method(), obj?[index]
/// • Coalescing: value ?? default
/// • Spreads: [...list, ...?nullable]
/// • Compound assignments: x += 1
/// • Parenthesized: (a + b) * c
/// • Simple assignments: x = 5
/// • String interpolations: "Hello $name"
///
/// Critical for accurate analysis of modern Dart/Flutter code.
///
/// KEY COMPONENTS
/// --------------
/// 1. CascadeExpressionIR          → obj..a()..b=1
/// 2. NullAwareAccessExpressionIR  → obj?.prop
/// 3. NullCoalescingExpressionIR   → a ?? b
/// 4. SpreadExpressionIR           → ...list
/// 5. CompoundAssignmentExpressionIR → x += y
/// 6. ParenthesizedExpressionIR    → (expr)
/// 7. AssignmentExpressionIR       → target = value
/// 8. StringInterpolationPart      → Text or $expr in strings
///
/// FEATURES
/// --------
/// • Full JSON serialization (toJson/fromJson)
/// • Human-readable toShortString()
/// • Immutable + metadata
/// • Enum-based types (e.g., NullAwareOperationType)
/// • Validation asserts in constructors
///
/// USAGE EXAMPLE
/// -------------
/// ```dart
/// final cascade = CascadeExpressionIR(
///   target: IdentifierExpressionIR(... 'obj' ...),
///   cascadeSections: [methodCall, assignment],
///   resultType: objType,
/// );
/// print(cascade.toShortString()); // "obj..2 cascade(s)"
/// ```
///
/// RELATED FILES
/// -------------
/// • expression_ir.dart     → Base ExpressionIR
/// • type_ir.dart           → Result types
/// • operations.dart        → Binary/unary ops
/// • literals.dart          → String literals with interpolation
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================


/// =============================================================================
/// statement_ir.dart 
/// STATEMENT IR HIERARCHY
///  Complete Intermediate Representation for Dart statements
/// =============================================================================
///
/// PURPOSE
/// -------
/// Defines immutable IR nodes for all Dart statement types, with built-in
/// support for widget analysis via WidgetUsageIR.
///
/// Covers:
/// • Simple: expressions, declarations, returns, break/continue, throw
/// • Control: if/else, for/foreach, while/do-while
/// • Blocks: nested statements
/// • Exceptions: try/catch/finally
/// • Switching: switch/case/default
///
/// KEY FEATURES
/// ------------
/// • Widget integration: widgetUsages list on every statement
/// • Human-readable toShortString()
/// • Recursive widget extraction via extensions
/// • Immutable + metadata support
/// • Easy nested traversal
///
/// EXTENSION: StatementBodyWidgetAnalysis
/// --------------------------------------
/// Provides getAllWidgetUsages() for recursive widget collection from bodies.
///
/// RELATED FILES
/// -------------
/// • ir_node.dart           → Base IRNode
/// • expression_ir.dart     → Expressions in statements
/// • type_ir.dart           → Types in declarations
/// • function_decl.dart     → Function body integration
/// • statement_widget_analyzer.dart → Populates widgetUsages
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================


/// =============================================================================
/// statement_widget_analyzer.dart 
/// STATEMENT WIDGET ANALYZER
///  Flutter-specific widget usage extractor for statements
/// =============================================================================
///
/// PURPOSE
/// -------
/// Analyzes Dart statements (from AST) to identify and extract Flutter widget
/// usages, adding WidgetUsageIR metadata to each StatementIR.
///
/// Handles all common patterns:
/// • Direct returns: return Scaffold(...);
/// • Assignments: final w = Container(...);
/// • Conditionals: if (...) Text(...) else Icon(...);
/// • Cascades: Scaffold()..body = Text(...);
/// • Null-aware/coalescing: obj?.widget ?? Default();
/// • Collections: children: [Text(), Icon()];
/// • Nested blocks/loops/try-catch
///
/// Integrates with DartFileBuilder for full analysis pipeline.
///
/// USAGE
/// -----
/// ```dart
/// final analyzer = StatementWidgetAnalyzer(
///   filePath: 'lib/main.dart',
///   fileContent: sourceCode,
///   builder: myBuilder,
/// );
/// analyzer.analyzeStatementsForWidgets(statementsList);
/// ```
///
/// After analysis, access via stmt.widgetUsages.
///
/// DESIGN NOTES
/// ------------
/// • Recursive extraction for nested structures
/// • Preserves original StatementIR via immutable updates
/// • Flutter-specific: Focuses on constructor calls like Scaffold()
/// • Extensible: Add more patterns in _extractWidgetsFromExpression()
///
/// RELATED FILES
/// -------------
/// • statement_ir.dart      → StatementIR + WidgetUsageIR
/// • expression_ir.dart     → Expression handling
/// • cascade_expression_ir.dart → Cascade support
/// • flutterjs_core.dart    → Core Flutter analysis utils
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================


/// =============================================================================
///  class_type_ir.dart
///  CLASS TYPE REPRESENTATION
///  Core type for user-defined and library classes
/// =============================================================================
///
/// PURPOSE
/// -------
/// Represents references to real Dart classes (e.g., Widget, MyController)
/// with full support for generics, nullability, library origin, and metadata.
///
/// Used heavily in Flutter analysis, widget tree building, and inheritance checks.
///
/// KEY FEATURES
/// ------------
/// • Fully qualified names (libraryUri + className)
/// • Generic type arguments (List<String>, Future<int>?)
/// • Nullability support (toNullable() / toNonNullable())
/// • Abstract class detection
/// • Rich JSON serialization
/// • Immutable + deep equality
///
/// COMMON EXAMPLES
/// ---------------
/// ```dart
/// final widgetType = ClassTypeIR(
///   id: 'type_widget',
///   name: 'Widget',
///   className: 'Widget',
///   libraryUri: 'package:flutter/widgets.dart',
///   sourceLocation: loc,
/// );
///
/// final stateful = widgetType.withTypeArguments([genericT]);
/// ```
///
/// RELATED FILES
/// -------------
/// • type_ir.dart
/// • generic_type_ir.dart
/// • nullable_type_ir.dart
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
/// Represents class references: Widget, MyCustomClass, etc.


/// =============================================================================
///  function_type_ir.dart
///  FUNCTION TYPE REPRESENTATION
///  Full Dart function signature modeling
/// =============================================================================
///
/// PURPOSE
/// -------
/// Models function, method, and closure types with complete parameter and
/// generic information — critical for type checking, refactoring, and code gen.
///
/// Supports:
/// • Positional, optional, named parameters
/// • Required named parameters
/// • Generic functions (T Function<U>(U))
/// • Nullability on the function type itself
///
/// USAGE
/// -----
/// ```dart
/// final callbackType = FunctionTypeIR(
///   id: 'type_callback',
///   name: 'void Function(String)',
///   returnType: PrimitiveTypeIR.void_(...),
///   parameters: [paramString],
///   sourceLocation: loc,
/// );
/// ```
///
/// RICH DISPLAY
/// ------------
/// ```
/// (String name, [int? age], {required bool active}) → void
/// <T>(T value) → T?
/// ```
///
/// RELATED FILES
/// -------------
/// • parameter_ir.dart
/// • type_ir.dart
/// • primitive_type_ir.dart
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================


/// =============================================================================
///  generic_type_ir.dart
///  GENERIC TYPE REPRESENTATION
///  List<T>, Map<K,V>, FutureOr<T>, etc.
/// =============================================================================
///
/// PURPOSE
/// -------
/// Represents instantiated generic types with concrete type arguments
/// and optional type parameters (for generic type aliases or declarations).
///
/// Used in:
/// • Type inference
/// • Generic method resolution
/// • Bounds checking
///
/// EXAMPLE
/// -------
/// ```dart
/// GenericTypeIR(
///   name: 'List',
///   typeArguments: [stringType],
///   // → List<String>
/// )
/// ```
///
/// RELATED FILES
/// -------------
/// • type_ir.dart
/// • class_type_ir.dart
/// • function_type_ir.dart
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================


/// =============================================================================
///  nullable_type_ir.dart
///  NULLABLE TYPE WRAPPER
///  Safe wrapper for nullable types in the custom Dart IR
/// =============================================================================
///
/// PURPOSE
/// -------
/// Explicitly represents a nullable type (T?) while preventing dangerous
/// double-wrapping (T??). Used throughout the type system to maintain
/// correctness during type inference, serialization, and analysis.
///
/// KEY FEATURES
/// ------------
/// • Prevents double-nullable wrapping via assert + flatten()
/// • Safe unwrapping with unwrap()
/// • Factory .flatten() removes nested nullability
/// • Full JSON serialization support
/// • Immutable + proper equality/hashCode
///
/// USAGE
/// -----
/// ```dart
/// final stringNullable = NullableTypeIR.flatten(
///   id: 'type_str_nullable',
///   name: 'String',
///   sourceLocation: loc,
///   type: someStringType, // even if already nullable
/// );
/// print(stringNullable.displayName()); // "String?"
/// ```
///
/// DESIGN NOTES
/// ------------
/// This is the canonical way to represent nullability in the IR.
/// Never create T? manually — always go through NullableTypeIR or .toNullable().
///
/// RELATED FILES
/// -------------
/// • type_ir.dart           → Base TypeIR
/// • class_type_ir.dart     → Uses toNullable()/toNonNullable()
/// • primitive_type_ir.dart → Primitives are non-nullable by default
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================


/// =============================================================================
/// parameter_ir.dart
/// FUNCTION/METHOD PARAMETER MODEL
///  Complete parameter representation in the IR
/// =============================================================================
///
/// PURPOSE
/// -------
/// Represents a single parameter in functions, methods, constructors, etc.
/// with full metadata: type, name, optionality, default values, and source info.
///
/// Essential for:
/// • Call site checking
/// • Overload resolution
/// • Refactoring (rename parameter)
/// • Code generation
///
/// FEATURES
/// --------
/// • Positional / named / optional
/// • Required named parameters (Dart 2.0+)
/// • Default values (as ExpressionIR)
/// • Variadic detection (...args)
/// • Rich string formatting (signature, declaration)
///
/// EXAMPLE
/// -------
/// ```dart
/// ParameterIR(
///   name: 'callback',
///   type: functionType,
///   isNamed: true,
///   isRequired: true,
///   defaultValue: null,
/// )
/// // → "required void Function() callback"
/// ```
///
/// RELATED FILES
/// -------------
/// • function_type_ir.dart
/// • expression_ir.dart
/// • type_ir.dart
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
/// Represents a parameter in a function, method, or constructor



/// =============================================================================
/// primitive_type_ir.dart 
///  PRIMITIVE & BUILT-IN TYPE REPRESENTATIONS
///  int, double, bool, String, void, dynamic, Never
/// =============================================================================
///
/// PURPOSE
/// -------
/// Canonical, fast representations of Dart’s built-in types with proper
/// semantics, nullability, and factory constructors.
///
/// Used everywhere performance and correctness matter.
///
/// FEATURES
/// --------
/// • Enum-based kind (PrimitiveKind)
/// • Dedicated factory methods: .int(), .string(), .void_(), etc.
/// • Proper isBuiltIn = true
/// • Optimized for frequent use
/// • Full serialization
///
/// BEST PRACTICE
/// -------------
/// Always use the factories:
/// ```dart
/// PrimitiveTypeIR.string(id: 'str', sourceLocation: loc, isNullable: true)
/// ```
/// Never: new PrimitiveTypeIR(name: 'String', ...)
///
/// RELATED FILES
/// -------------
/// • type_ir.dart
/// • nullable_type_ir.dart
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================


/// =============================================================================
/// type_hierarchy.dart
///  DART TYPE HIERARCHY & RELATIONSHIP CHECKER
///  Subtype, assignability, and common supertype logic
/// =============================================================================
///
/// PURPOSE
/// -------
/// Provides correct Dart type system semantics:
/// • isSubtypeOf(A, B)
/// • isAssignableTo(A, B)
/// • commonSupertype(A, B)
///
/// Handles:
/// • Null safety rules
/// • Promotion (int → double)
/// • Built-in hierarchy (num, Iterable, etc.)
/// • Never and dynamic special cases
///
/// STATUS
/// ------
/// Currently partially implemented — full version requires inheritance
/// metadata from ClassDeclaration analysis.
///
/// FUTURE WORK
/// -----------
/// • Integrate with ClassIR inheritance graph
/// • Support extension types
/// • Add promotion rules (int → num)
///
/// RELATED FILES
/// -------------
/// • type_ir.dart
/// • class_type_ir.dart
/// • primitive_type_ir.dart
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
/// Type relationship utilities for Dart type hierarchy



/// =============================================================================
///  unresolved_type_ir.dart
///  UNRESOLVED TYPE PLACEHOLDER
///  For multi-pass analysis and forward references
/// =============================================================================
///
/// PURPOSE
/// -------
/// Represents a type that could not be resolved in the current analysis pass.
/// Acts as a safe placeholder with full diagnostic information.
///
/// Used in:
/// • Incremental analysis
/// • Library import cycles
/// • Forward declarations
/// • Error recovery
///
/// FEATURES
/// --------
/// • Tracks resolution attempts
/// • Rich error messages
/// • Pass numbering
/// • Safe nullability handling
/// • Can be marked for next pass
///
/// WORKFLOW
/// --------
/// Pass 1 → UnresolvedTypeIR
/// Pass 2 → Replace with real type (ClassTypeIR, etc.)
///
/// RELATED FILES
/// -------------
/// • type_ir.dart
/// • analysis_pass.dart (future)
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================


/// =============================================================================
///  expression_ir.dart 
///  EXPRESSION IR REPRESENTATIONS
///  Core for expression analysis in the custom Dart IR
/// =============================================================================
///
/// PURPOSE
/// -------
/// Models all possible Dart expressions as immutable IR nodes, enabling:
/// • Type inference
/// • Constant evaluation
/// • Dependency analysis
/// • Code generation
/// • Linting/optimization
///
/// Covers literals, operations, calls, collections, and more.
///
/// KEY COMPONENTS
/// --------------
/// 1. ExpressionIR         → Abstract base for all expressions
/// 2. LiteralExpressionIR  → Numbers, strings, booleans, null
/// 3. IdentifierExpressionIR → Variable references (this, super)
/// 4. BinaryExpressionIR   → Arithmetic/logical operations
/// 5. MethodCallExpressionIR → obj.method(args)
/// 6. PropertyAccessExpressionIR → obj.property
/// 7. ConditionalExpressionIR → cond ? then : else
/// 8. List/Map/SetExpressionIR → Collection literals
/// 9. IndexAccessExpressionIR → obj[index]
/// 10. UnaryExpressionIR   → !operand, ++var
/// 11. CastExpressionIR    → expr as Type
/// 12. ConstructorCallExpressionIR → Class(args)
/// 13. FunctionExpressionIR → (params) => body
/// 14. Specialized: FlutterWidgetConstructorIR, WidgetPropertyIR, etc.
///
/// FEATURES
/// --------
/// • Result type tracking (resultType)
/// • Const detection (isConstant)
/// • Null-aware/cascade support
/// • JSON serialization (toJson/fromJson)
/// • Human-readable toShortString()
/// • Content equality checks
///
/// USAGE EXAMPLE
/// -------------
/// ```dart
/// // Create a binary expression: x + 1
/// final binExpr = BinaryExpressionIR(
///   id: 'bin1',
///   sourceLocation: loc,
///   left: IdentifierExpressionIR(... 'x' ...),
///   operator: BinaryOperatorIR.add,
///   right: LiteralExpressionIR(... 1 ...),
///   resultType: intType,
/// );
///
/// // Check if constant
/// if (binExpr.isConstant) { ... }
///
/// // Serialize
/// final json = binExpr.toJson();
/// ```
///
/// EXTENSIBILITY
/// -------------
/// • Add new expression types by subclassing ExpressionIR
/// • Implement custom visitors (see expression_visitor.dart)
/// • Use metadata for framework-specific data (e.g., Flutter)
///
/// RELATED FILES
/// -------------
/// • ir_node.dart                → Base IRNode
/// • type_ir.dart                → Type representations
/// • expression_types/operations/operations.dart → Binary/Unary details
/// • variable_collector.dart     → Example visitor
/// • expression_visitor.dart     → Traversal framework
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================




/// =============================================================================
/// ir_node.dart 
/// IR NODE BASE CLASSES
///  Foundation for the custom Dart Intermediate Representation (IR)
/// =============================================================================
///
/// PURPOSE
/// -------
/// Defines the core building blocks for all IR nodes in the analyzer/compiler.
/// Every piece of parsed/analyzed Dart code is represented as an IRNode subclass.
///
/// This ensures:
/// • Consistent identity tracking (unique IDs)
/// • Source traceability (file/line/column)
/// • Debuggability (timestamps, metadata)
/// • Extensibility (metadata map for custom data)
/// • Equality checks (content-based, not reference)
///
/// KEY COMPONENTS
/// --------------
/// 1. IRNode              → Abstract base for all IR elements
/// 2. SourceLocationIR    → (Commented out) Tracks code positions
/// 3. AnalysisIssueIR     → Represents lint warnings/errors
///
/// FEATURES
/// --------
/// • Immutable by default (@immutable)
/// • Debug-friendly toString() and toShortString()
/// • Content equality for testing/comparison
/// • Factory constructors for common cases (errors, warnings)
/// • JSON serialization (toJson/fromJson)
///
/// USAGE EXAMPLE
/// -------------
/// ```dart
/// // Create a custom node
/// class MyCustomNode extends IRNode {
///   final String data;
///   MyCustomNode({
///     required String id,
///     required SourceLocationIR sourceLocation,
///     required this.data,
///   }) : super(id: id, sourceLocation: sourceLocation);
///
///   @override
///   String toShortString() => 'MyCustom($data)';
///
///   @override
///   bool contentEquals(IRNode other) =>
///     other is MyCustomNode && data == other.data;
/// }
///
/// // Create an issue
/// final issue = AnalysisIssueIR.error(
///   id: 'err_001',
///   message: 'Something wrong',
///   code: 'my.lint',
///   sourceLocation: myLocation,
/// );
/// ```
///
/// EXTENSION GUIDE
/// ---------------
/// See the commented "EXTENSION GUIDE" section for patterns on:
/// • Creating new IR classes
/// • Integrating with AST visitors
/// • Generating issues
/// • Traversing trees
/// • Serialization
/// • Example Widget IR
///
/// RELATED FILES
/// -------------
/// • type_ir.dart        → Type representations
/// • expression_ir.dart  → Expression nodes
/// • statement_ir.dart   → (Assumed) Statement/control-flow nodes
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
///
///



/// =============================================================================
///  type_ir.dart 
///  TYPE IR REPRESENTATIONS
///  Part of the custom Dart IR analyzer
/// =============================================================================
///
/// PURPOSE
/// -------
/// Defines a unified way to represent Dart types in the IR, including:
/// • Simple types (int, String)
/// • Generic types (List<T>)
/// • Function types
/// • Special types (dynamic, void, Never)
///
/// Supports nullability, assignability checks, and common factory methods.
///
/// KEY COMPONENTS
/// --------------
/// 1. TypeIR              → Abstract base for all types
/// 2. SimpleTypeIR        → Non-generic or generic class types
/// 3. DynamicTypeIR       → The 'dynamic' type
/// 4. VoidTypeIR          → The 'void' type
/// 5. NeverTypeIR         → The 'Never' type
/// 6. TypeParameterIR     → For generic parameters (T extends Bound)
///
/// FEATURES
/// --------
/// • Nullability support (? operator)
/// • Display names (e.g., "List<String>?")
/// • Assignability/isSubtypeOf checks
/// • Built-in detection (int, bool, etc.)
/// • JSON serialization (toJson/fromJson)
/// • Factories for common types (widget(), future(T), list(T))
///
/// USAGE EXAMPLE
/// -------------
/// ```dart
/// // Create a nullable List<int>
/// final listType = TypeIR.list(
///   SimpleTypeIR(id: 'int', name: 'int', sourceLocation: loc)
/// ).copyWith(isNullable: true);
///
/// // Check assignability
/// if (myVarType.isAssignableTo(listType)) { ... }
///
/// // Display
/// print(listType.displayName()); // "List<int>?"
/// ```
///
/// EXTENSIBILITY
/// -------------
/// • Override displayName() for custom formatting
/// • Extend isAssignableTo() for hierarchy-aware checks
/// • Add more factories for domain-specific types
///
/// RELATED FILES
/// -------------
/// • ir_node.dart          → Base IRNode class
/// • expression_ir.dart    → Expressions using these types
/// • types/function_type_ir.dart → Function signatures
/// • types/generic_type_ir.dart  → Generic handling
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================



/// <---------------------------------------------------------------------------->
/// lifecycle_analysis.dart
/// ----------------------------------------------------------------------------
///
/// Deep lifecycle correctness analysis for `State<T>` classes (initState,
/// didUpdateWidget, dispose, etc.).
///
/// Primary entity: [LifecycleAnalysis] – aggregates every operation that occurs
/// in each lifecycle method and validates resource acquisition/disposal order,
/// super-call requirements, async safety, and error handling.
///
/// Key sub-models:
/// • [LifecycleOperationIR] – a single statement in a lifecycle method
/// • [ResourceLeakIR], [UseBeforeInitIR], [OrderingIssueIR] – concrete problems
/// • Comprehensive issue list with severity and fix suggestions
///
/// Detects critical bugs such as:
/// • AnimationController created but never disposed
/// • Field used before initState runs
/// • Missing `super.initState()` / `super.dispose()`
/// • Async operations in initState without proper handling
///
/// Provides a health score (0-100) and a human-readable summary used by IDE
/// quick-fixes, CI reports, and architecture dashboards.
///
/// All classes are immutable, JSON-serializable, and designed for incremental
/// analysis passes and result merging.
/// <---------------------------------------------------------------------------->
///
///
///
///
///
///
///
///
/// Comprehensive analysis of State lifecycle methods and their correctness
///
/// Tracks what operations happen at each lifecycle stage and detects:
/// - Resource leaks (created but not disposed)
/// - Use-before-initialize bugs
/// - Ordering issues
/// - Missing lifecycle operations
///
/// Example analysis:
/// ```dart
/// class _MyState extends State<MyWidget> {
///   late AnimationController _controller;
///
///   @override
///   void initState() {
///     super.initState();
///     _controller = AnimationController(...); // Initialized
///   }
///
///   @override
///   void dispose() {
///     _controller.dispose(); // Properly disposed
///     super.dispose();
///   }
/// }
/// ```



/// <---------------------------------------------------------------------------->
/// rebuild_trigger_graph.dart
/// ----------------------------------------------------------------------------
///
/// Directed graph that models **which state field changes trigger which build
/// method executions** (the “rebuild trigger” graph).
///
/// Core entities:
/// • [RebuildTriggerGraph] – container for nodes, edges, transitive closure
/// • [RebuildEdge] – source field → target build method with detailed cost info
/// • [RebuildCostIR] – estimated ms cost, widget count, const-ratio, nesting depth…
/// • Comprehensive analysis ([GraphAnalysisIR]) and issue containers
///
/// The graph powers advanced diagnostics:
/// • Unnecessary rebuild detection
/// • Expensive / cascading rebuild identification
/// • High-impact field discovery (“changing this one field rebuilds 87 widgets”)
/// • Optimization suggestions (add const, extract widget, memoize, split state…)
///
/// Features:
/// • Transitive closure pre-computed for O(1) “what does X affect?” queries
/// • Cost model that respects loops, conditionals, dynamic children, etc.
/// • Rich JSON export for visualisation tools
/// • Immutable design with value-equality for safe incremental updates
///
/// Typical usage:
/// ```dart
/// final graph = RebuildTriggerGraph.buildFrom(project);
/// final cascades = graph.findCascades();
/// for (final c in cascades) { report “field X triggers ${c.cascadeLength} rebuilds” }
/// ```
/// <---------------------------------------------------------------------------->



/// <---------------------------------------------------------------------------->
/// state_class_representation.dart
/// ----------------------------------------------------------------------------
///
/// Rich, analysis-oriented representation of a Flutter `State<T>` class.
///
/// Extends the generic class model with State-specific entities:
/// • Lifecycle method declarations ([LifecycleMethodDecl]) with super-call tracking
/// • Enhanced field model ([StateFieldDecl]) that knows about build access,
///   controller status, and disposal correctness
/// • Detailed `setState()` call model ([SetStateCallDecl]) with severity rating
/// • Extended `build()` model ([BuildMethodDecl]) containing tree depth,
///   loop detection, widget-in-loop flags, ancestor/provider reads, etc.
///
/// The file also contains [StateAnalyzer] – a pure-static utility that runs
/// dozens of heuristic checks and produces:
/// • Lists of [LifecycleIssue] (missing super, resource leaks, async build, …)
/// • Health reports and scores for each State class
///
/// This is the central hub consumed by UI-facing diagnostics:
/// • “This StatefulWidget could be Stateless”
/// • “Missing dispose() for 3 controllers”
/// • “setState() called inside a loop → critical”
/// • “build() creates widgets in loops → suggest ListView.builder”
///
/// All data structures are immutable and optimized for serialization,
/// deduplication, and presentation in IDEs, CLI tools, or web dashboards.
/// <---------------------------------------------------------------------------->
/// Information about a State lifecycle method





/// <---------------------------------------------------------------------------->
/// state_field_analysis.dart
/// ----------------------------------------------------------------------------
///
/// Fine-grained analysis of individual state fields inside StatefulWidget State
/// classes (or any class that uses `setState` / reactive patterns).
///
/// Core entity: [StateFieldAnalysis] – describes one field’s lifecycle,
/// usage, and impact on the widget tree:
/// • Where it is read in `build()` (or never → dead code)
/// • Where it is mutated via `setState()`
/// • Resource handling (controllers, streams, listeners) and disposal checks
/// • Dependency graph (which other fields it depends on / affects)
/// • Performance impact and high-impact field detection
///
/// Additional IR:
/// • [SetStateModificationIR] – details of every `setState` call that touches the field
/// • [FieldInitializationIR] / [FieldDisposalIR] – init/dispose paths
/// • Issue containers ([StateFieldIssueIR]) and rebuild-trigger edges
///
/// Used for:
/// • Detecting unused / dead state fields
/// • Finding “modified in build()” bugs
/// • Resource-leak diagnostics (controller not disposed)
/// • Recommending field extraction or conversion to provider/selectors
/// • Building the global rebuild-trigger graph (see rebuild_trigger_graph.dart)
///
/// All types are immutable, provide rich `toJson` and human-readable summaries,
/// and are designed for incremental analysis and merging of results.
/// <---------------------------------------------------------------------------->




/// <---------------------------------------------------------------------------->
/// state_management.dart
/// ----------------------------------------------------------------------------
///
/// Data model for state-management entities (ChangeNotifier, Bloc, Cubit,
/// InheritedWidget, Riverpod, GetX, MobX, etc.) in a Flutter static-analysis suite.
///
/// Primary entity: [ProviderClassDecl] – an immutable, enriched view of a class
/// that participates in state management. It captures:
/// • Provider type ([ProviderTypeIR])
/// • Managed state type and field-level mutation tracking
/// • All `notifyListeners()` / event emission points
/// • Consumption sites (`watch`, `read`, `select`, Consumer widgets, etc.)
/// • Dependency graph (which providers depend on which)
/// • Performance & health metrics (over-notification, dead code, circular deps…)
///
/// Supporting IR nodes:
/// • [NotifyListenerCallIR], [StateMutationIR], [ProviderConsumerIR]
/// • Stream operation tracking, consumption analysis, issue reporting
///
/// The model powers:
/// • Provider-overuse / “god-provider” detection
/// • Missing-notification & over-notification diagnostics
/// • Dead-code elimination of unused providers
/// • Refactoring suggestions (“split this provider”, “use selector”, etc.)
/// • Visual dependency graphs in IDEs / web dashboards
///
/// Every class is immutable, JSON-serializable, and implements value-equality
/// based on stable identifiers, guaranteeing correct deduplication when the
/// same provider is analysed in multiple passes.
///
/// Example:
/// ```dart
/// final provider = ProviderClassDecl( … );
/// if (provider.isDeadCode) { report unused provider … }
/// if (provider.overNotifies) { suggest batching notifyListeners() … }
/// ```
/// <---------------------------------------------------------------------------->
///
///
///
/// Represents a state management provider class
///
/// Extends ClassDecl to add provider-specific analysis for:
/// - ChangeNotifier-based providers
/// - BLoC pattern classes
/// - Cubit pattern classes
/// - InheritedWidget subclasses
/// - Custom state management
///
/// Examples:
/// ```dart
/// class CounterProvider extends ChangeNotifier {
///   int _count = 0;
///   int get count => _count;
///
///   void increment() {
///     _count++;
///     notifyListeners();
///   }
/// }
///
/// class UserBloc extends Bloc<UserEvent, UserState> {
///   UserBloc() : super(UserInitial());
/// }
/// ```



/// <---------------------------------------------------------------------------->
/// widget_classification.dart
/// ----------------------------------------------------------------------------
///
/// Core model and classification engine for Flutter widgets in a static-analysis
/// tool (custom linter, IDE plugin, architecture auditor, performance profiler, etc.).
///
/// This file provides:
/// • Enums that categorise widgets by type, purpose, performance impact, and child-handling
/// • [WidgetDecl] – an immutable, enriched representation of a widget class that extends
///   the generic [ClassDecl] with widget-specific diagnostics (const-constructible,
///   rebuild frequency, known anti-patterns, etc.)
/// • [WidgetProperty] & [ChildHandling] – metadata for common widget parameters
/// • [WidgetClassifier] – a pure-static service that automatically classifies any
///   [ClassDecl] into a fully-populated [WidgetDecl] using heuristics, name-based
///   look-ups, and deep analysis of constructors, fields, and the build method.
///
/// The classifier is deliberately stateless and side-effect-free so it can be used
/// both in a one-pass analyzer and in incremental/re-entrant analysis pipelines.
///
/// Typical usage inside an analyzer:
/// ```dart
/// final widgetDecl = WidgetClassifier.classify(classDecl);
/// print('Widget ${widgetDecl.name} → ${widgetDecl.characteristics}');
/// if (widgetDecl.knownIssues.isNotEmpty) { … report issues … }
/// ```
///
/// The data produced here is consumed by:
/// • Performance dashboards (expensive rebuild detection)
/// • Architecture linters (StatelessWidget with mutable fields, etc.)
/// • Widget-tree visualisers
/// • Automatic refactoring tools (extract-widget, add-const, etc.)
///
/// All classes are `@immutable` and provide value-equality, JSON serialization
/// helpers (via `toJson` on related IR nodes), and rich `toString` overrides for
/// debugging and reporting.
/// <---------------------------------------------------------------------------->
/// Categorizes different widget types in Flutter



/// <---------------------------------------------------------------------------->
/// class_decl.dart
/// ----------------------------------------------------------------------------
///
/// Rich IR models for Dart class declarations and hierarchy analysis.
///
/// Defines [ClassDecl] as the base for all class-like structures, with
/// extensions like [EnhancedClassDecl] for post-analysis metadata.
///
/// Highlights:
/// • Inheritance: superclass, interfaces, mixins
/// • Members: fields, methods, constructors (with factories/const)
/// • Modifiers: abstract, final, sealed, mixin
/// • Flutter-specific: widget detection, categories, build methods
/// • Utilities: [ClassHierarchyUtils] for subclass checks, method inheritance
///
/// Also includes:
/// • [FieldDecl]: Specialized fields with getter/setter support
/// • [FieldInitializer]: Constructor field init expressions
///
/// Used in:
/// • Type checking and resolution
/// • Inheritance validation (cycles, unimplemented abstracts)
/// • Code metrics (depth, usage counts)
/// • Flutter-specific optimizations
/// <---------------------------------------------------------------------------->




/// <---------------------------------------------------------------------------->
/// dart_file_builder.dart
/// ----------------------------------------------------------------------------
///
/// Core builder pattern implementation for constructing complete Dart file IR.
///
/// This file provides the [DartFile] model — a comprehensive, immutable
/// representation of a single .dart source file — and its associated
/// [DartFileBuilder] for progressive construction during analysis passes.
///
/// Key components:
/// • File metadata ([LibraryMetadata]): library directives, annotations, etc.
/// • Top-level declarations: classes, functions, variables, enums, etc.
/// • Directives: imports, exports, parts, part-of
/// • Analysis integration: issues, content hash for change detection
/// • Timestamps: creation and last analysis times
///
/// Usage in analysis pipeline:
/// 1. Create builder: `DartFileBuilder(filePath: 'lib/main.dart')`
/// 2. Populate during visitor passes: addImport(), addClass(), etc.
/// 3. Finalize: `builder.build()` to get immutable [DartFile]
///
/// Designed for:
/// • Static analyzers and linters
/// • Code generators and transformers
/// • IDE features (refactoring, navigation)
/// • Documentation tools
/// • Serialization to JSON/binary for caching or transfer
///
/// All collections are immutable in the final [DartFile] for thread-safety.
/// <---------------------------------------------------------------------------->



/// <---------------------------------------------------------------------------->
/// function_decl.dart
/// ----------------------------------------------------------------------------
///
/// Detailed IR for functions, methods, and constructors in Dart.
///
/// [FunctionDecl] base: returns, params, body, async/generator modifiers.
///
/// Specializations:
/// • [MethodDecl]: Class methods with override/external
/// • [ConstructorDecl]: Inits, super calls, redirects, factories
///
/// Includes:
/// • [ConstructorInitializer]: Field inits
/// • [SuperConstructorCall]: Super invocations
/// • [RedirectedConstructorCall]: Redirects
///
/// Features:
/// • Signature strings
/// • Override checks
/// • JSON serialization
/// • Operator/constructor specifics
///
/// Key for:
/// • Call graph construction
/// • Async analysis
/// • Constructor validation
/// <---------------------------------------------------------------------------->



/// <---------------------------------------------------------------------------->
/// import_export_stmt.dart
/// ----------------------------------------------------------------------------
///
/// Models for Dart's directive statements: imports, exports, parts, and part-of.
///
/// Provides immutable representations for precise tracking of library
/// dependencies, visibility controls (show/hide), and file composition.
///
/// Core classes:
/// • [ImportStmt]: Full import details with prefix, show/hide, deferred
/// • [ExportStmt]: Export directives with selective visibility
/// • [PartStmt]: Part inclusions for multi-file libraries
/// • [PartOfStmt]: Markers for part files linking to main library
///
/// Features:
/// • Exposure checks: shows(), exposes() for name visibility
/// • Effective exposure calculation for analysis
/// • JSON serialization for persistence
/// • Human-readable string representations
///
/// Essential for:
/// • Dependency graphs and resolution
/// • Name conflict detection
/// • Library boundary enforcement
/// • Refactoring tools (e.g., rename imports)
/// <---------------------------------------------------------------------------->


/// <---------------------------------------------------------------------------->
/// ir_id_generator.dart
/// ----------------------------------------------------------------------------
///
/// Robust ID generation for IR nodes, ensuring uniqueness and determinism.
///
/// [IRIdGenerator] produces readable, collision-free IDs with strategies:
/// • Counter-based: Fast, session-unique
/// • Contextual: Nested (e.g., class.method)
/// • Deterministic: Hash-based for caching
/// • Simple: Temporary nodes
///
/// Includes:
/// • File hashing for cross-file uniqueness
/// • Name sanitization
/// • Reset for multi-file analysis
///
/// Recommendations:
/// • Use in [DartFileBuilder] for declaration passes
/// • Format spec: {type}_{context}_{name}_{counter}
///
/// Vital for:
/// • Node referencing in graphs
/// • Cache keys
/// • Debug logging
/// <---------------------------------------------------------------------------->



/// <---------------------------------------------------------------------------->
/// parameter_decl.dart
/// ----------------------------------------------------------------------------
///
/// Declarations for function parameters and type parameters in Dart.
///
/// [ParameterDecl] captures all parameter flavors: positional, named,
/// required, optional, with defaults and annotations.
///
/// [TypeParameterDecl] handles generics: bounds, constraints.
///
/// Features:
/// • Kind detection: optionalPositional, requiredNamed, etc.
/// • String representations matching Dart syntax
/// • JSON for serialization
/// • Mutual exclusivity checks (positional vs named)
///
/// Critical for:
/// • Signature matching and overload resolution
/// • Default value evaluation
/// • Generic type inference
/// • API documentation generation
/// <---------------------------------------------------------------------------->




/// <---------------------------------------------------------------------------->
/// variable_decl.dart
/// ----------------------------------------------------------------------------
///
/// Comprehensive models for variable and field declarations in Dart.
///
/// [VariableDecl] base covers locals, globals, fields, parameters with
/// modifiers (final, const, late, static) and initializers.
///
/// Extensions:
/// • [FieldDecl]: Class fields with getter/setter, abstract
/// • [ParameterDecl]: Signature params with kinds (required, named)
///
/// Also:
/// • [VisibilityModifier]: Enum for access levels
/// • [ParameterKind]: Enum for parameter types
/// • [AnnotationIR]: Metadata like @override
///
/// Supports:
/// • Mutability checks
/// • Compile-time constancy
/// • Declaration strings
/// • JSON serialization
/// <---------------------------------------------------------------------------->


// ignore_for_file: dangling_library_doc_comments

/// <---------------------------------------------------------------------------->
/// widget_metadata.dart
/// ----------------------------------------------------------------------------
///
/// Flutter-specific metadata aggregation for widgets and state management.
///
/// [WidgetMetadata] collects analysis results: build methods, state connections,
/// hierarchies, lifecycles, trees, implementers, call/access graphs.
///
/// Utilities:
/// • Checks: isStatefulWidget(), isStateClass()
/// • Getters: getBuildMethod(), getRootWidgetType()
/// • Serialization: toJson()
/// • From registry: fromRegistry()
///
/// [WidgetTreeNode]: Hierarchical widget structure with prettyPrint()
///
/// Extension on [DartFile] for attachment/caching.
///
/// For:
/// • Flutter optimizations
/// • Widget tree visualization
/// • State analysis
/// • Performance insights