// ============================================================================
// MAIN EXPORTS - FlutterJS Analyzer Suite
// ============================================================================

// Analyzer (Main entry point)
export {
    Analyzer,
    analyzeCode,
    analyzeFile,
    analyzeAndSave,
    runCLI
} from "./analyzer.js";

// Lexer (Tokenization)
export {
    Token,
    Lexer,
    TokenType
} from "ats/lexer.js";

// Parser (AST generation)
export {
    Parser,
    Program,
    ImportDeclaration,
    ImportSpecifier,
    ClassDeclaration,
    ClassBody,
    FieldDeclaration,
    MethodDeclaration,
    Parameter,
    FunctionDeclaration,
    BlockStatement,
    ReturnStatement,
    ExpressionStatement,
    Identifier,
    Literal,
    CallExpression,
    NewExpression,
    ObjectLiteral,
    Property,
    ArrowFunctionExpression,
    MemberExpression,
    ASTNode
} from "ast/flutterjs_parser.js";

// Widget Analyzer (Phase 1)
export {
    WidgetAnalyzer
} from "ats/flutterjs_widget_analyzer.js";

// State Analyzer (Phase 2)
export {
    StateAnalyzer,
    StateClassMetadata,
    StateField,
    LifecycleMethod,
    StateUpdateCall,
    DependencyGraph
} from "ast/state_analyzer_implementation.js";

// State Analyzer Data Classes
export {
    StateClassMetadata as StateMetadata,
    StateField,
    LifecycleMethod,
    StateUpdateCall,
    EventHandler,
    DependencyGraph,
    ValidationResult,
    AnalysisSummary
} from "ast/state_analyzer_data.js";

// Context Analyzer (Phase 3)
export {
    ContextAnalyzer
} from "ast/context_analyzer.js";

// Context Analyzer Data Classes
export {
    InheritedWidgetMetadata,
    ChangeNotifierAnalysis,
    ProviderAnalysis,
    ContextDependency,
    ContextUsagePattern,
    HydrationRequirement,
    LazyLoadOpportunity,
    ContextRequirementsSummary
} from "ast/context_analyzer_data.js";

// SSR Analyzer (Phase 3)
export {
    SSRAnalyzer
} from "ast/ssr_analyzer.js";

// Report Generator
export {
    ReportGenerator
} from "ast/flutterjs_report_generator.js";


export {
ImportResolver
} from "ats/flutter_import_resolver.js";

export{
resolverConfig,
createResolver,
presets
} from "ats/flutter_resolver_config.js";