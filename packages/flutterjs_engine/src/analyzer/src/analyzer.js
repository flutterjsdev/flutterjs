/**
 * FlutterJS Analyzer - Main Orchestrator (FIXED Logger Integration)
 * Properly integrates centralized logging system
 */

import fs from 'fs';
import { Lexer } from './lexer.js';
import { Parser } from './flutterjs_parser.js';
import { WidgetAnalyzer } from './flutterjs_widget_analyzer.js';
import { StateAnalyzer } from './state_analyzer_implementation.js';
import { ContextAnalyzer } from './context_analyzer.js';
import { SSRAnalyzer } from './ssr_analyzer.js';
import { ReportGenerator } from './flutterjs_report_generator.js';
import { ImportResolver } from './flutter_import_resolver.js';
import { resolverConfig } from './flutter_resolver_config.js';
import { initLogger, getLogger } from './flutterjs_logger.js';

// ============================================================================
// MAIN ANALYZER CLASS
// ============================================================================

class Analyzer {
  constructor(options = {}) {
    this.options = {
      sourceFile: null,
      sourceCode: null,
      outputFormat: 'json',
      outputFile: null,
      verbose: true,
      strict: false,
      projectRoot: process.cwd(),
      includeMetrics: true,
      includeTree: true,
      includeValidation: true,
      includeSuggestions: true,
      includeContext: true,
      includeSsr: true,
      includeImports: true,
      ignoreUnresolvedImports: true,
      prettyPrint: true,
      debugLevel: 'info',  // NEW: Add debug level option
      ...options,
    };

    // FIXED: Properly initialize logger
    this.logger = initLogger({
      level: this.options.debugLevel,
      writeToFile: true,
      writeToConsole: false,
      debugDir: '.debug',
    });

    const loggerInstance = this.logger.createComponentLogger('Analyzer');
    this.log = loggerInstance;  // Store logger instance

    // Initialize import resolver
    this.importResolver = new ImportResolver({
      projectRoot: this.options.projectRoot,
      ignoreUnresolved: this.options.ignoreUnresolvedImports,
      ...resolverConfig,
    });

    this.results = {
      source: null,
      tokens: null,
      ast: null,
      widgets: null,
      importResolution: null,
      state: null,
      context: null,
      ssr: null,
      report: null,
    };

    this.errors = [];
    this.timings = {};
  }

  /**
   * Main entry point - run full analysis pipeline
   */
  async analyze() {
    const logger = this.log;

    logger.startSession('FullAnalyzerPipeline');

    try {
      logger.info('\n' + '='.repeat(80));
      logger.info('🚀 FlutterJS ANALYZER - FULL PIPELINE');
      logger.info('='.repeat(80));

      // Step 1: Load source code
      logger.startSession('LoadSource');
      logger.info('STEP 1: Loading source code...');
      await this.loadSource();
      logger.success('Source loaded');
      logger.endSession('LoadSource');

      // Step 2: Lexing
      logger.startSession('Lexing');
      logger.info('STEP 2: Tokenizing (Lexing)...');
      this.lex();
      logger.trace('Tokens generated', this.results.tokens.length);
      logger.success('Lexing complete');
      logger.endSession('Lexing');

      // Step 3: Parsing
      logger.startSession('Parsing');
      logger.info('STEP 3: Building AST (Parsing)...');
      this.parse();
      logger.trace('Top-level items', this.results.ast.body.length);
      logger.success('Parsing complete');
      logger.endSession('Parsing');

      // Step 4: Widget Analysis (Phase 1)
      logger.startSession('WidgetAnalysis');
      logger.info('STEP 4: Widget Analysis (Phase 1)...');
      this.analyzeWidgets();
      logger.trace('Widgets detected', this.results.widgets.widgets.length);
      logger.success('Widget analysis complete');
      logger.endSession('WidgetAnalysis');

      // Step 5: Import Resolution
      if (this.options.includeImports) {
        logger.startSession('ImportResolution');
        logger.info('STEP 5: Resolving Imports...');
        this.analyzeImports();
        const summary = this.results.importResolution?.summary;
        logger.trace('Imports resolved', summary?.resolved || 0);
        logger.trace('Imports unresolved', summary?.unresolved || 0);
        logger.success('Import resolution complete');
        logger.endSession('ImportResolution');
      }

      // Step 6: State Analysis (Phase 2)
      logger.startSession('StateAnalysis');
      logger.info('STEP 6: State Analysis (Phase 2)...');
      this.analyzeState();
      logger.trace('State classes analyzed', this.results.state.stateClasses.length);
      logger.success('State analysis complete');
      logger.endSession('StateAnalysis');

      // Step 7: Context Analysis (Phase 3)
      if (this.options.includeContext) {
        logger.startSession('ContextAnalysis');
        logger.info('STEP 7: Context Analysis (Phase 3)...');
        this.analyzeContext();
        logger.trace('Inherited widgets detected', this.results.context.inheritedWidgets?.length || 0);
        logger.success('Context analysis complete');
        logger.endSession('ContextAnalysis');
      }

      // Step 8: SSR Analysis (Phase 3)
      if (this.options.includeSsr) {
        logger.startSession('SSRAnalysis');
        logger.info('STEP 8: SSR Compatibility Analysis (Phase 3)...');
        this.analyzeSsr();
        logger.trace('SSR Compatibility Score', this.results.ssr.ssrCompatibilityScore);
        logger.success('SSR analysis complete');
        logger.endSession('SSRAnalysis');
      }

      // Step 9: Report Generation
      logger.startSession('ReportGeneration');
      logger.info('STEP 9: Generating Report...');
      this.generateReport();
      logger.success('Report generated');
      logger.endSession('ReportGeneration');

      // Step 10: Output
      logger.startSession('Output');
      logger.info('STEP 10: Output...');
      this.output();
      logger.success('Output complete');
      logger.endSession('Output');

      logger.info('='.repeat(80));
      logger.success('✅ ANALYSIS COMPLETE');
      logger.info('='.repeat(80) + '\n');

      // Save logs to files
      this.logger.saveLogs();

      return this.getResults();
    } catch (error) {
      logger.error('ANALYSIS FAILED');
      logger.failure('Analysis pipeline', error.message);
      logger.endSession('FullAnalyzerPipeline');
      throw error;
    }
  }

  /**
   * Step 5: Resolve all imports
   */
  analyzeImports() {
    const start = Date.now();
    const logger = this.log;

    try {
      if (!this.results.widgets) {
        logger.warn('No widgets found, skipping import analysis');
        return;
      }

      const imports = this.results.widgets.imports || [];

      if (imports.length === 0) {
        logger.info('No imports found in source');
        this.results.importResolution = {
          imports: {
            resolved: [],
            unresolved: [],
            errors: [],
          },
          summary: {
            total: 0,
            resolved: 0,
            unresolved: 0,
            errors: 0,
            resolutionRate: 'N/A',
            bySource: { framework: 0, local: 0, cache: 0 },
          },
        };
        return;
      }

      logger.info(`Found ${imports.length} imports to resolve`);

      // Resolve imports
      const resolution = this.importResolver.resolveImports(
        imports.map((imp) => ({
          source: imp.source,
          items: imp.items,
        }))
      );

      // Store resolution results
      this.results.importResolution = resolution;

      // Log resolution statistics
      logger.debug(`Resolved: ${resolution.imports.resolved.length}`);
      logger.debug(`Unresolved: ${resolution.imports.unresolved.length}`);
      logger.debug(`Errors: ${resolution.imports.errors.length}`);

      // Check for errors (unless ignoreUnresolvedImports is set)
      if (!this.options.ignoreUnresolvedImports &&
        resolution.imports.errors.length > 0) {
        throw new Error(
          `${resolution.imports.errors.length} imports could not be resolved`
        );
      }
    } catch (error) {
      logger.error(`Import resolution failed: ${error.message}`);
      throw new Error(`Import resolution failed: ${error.message}`);
    }

    this.timings.analyzeImports = Date.now() - start;
  }

  /**
   * Step 1: Load source code from file or use provided code
   */
  async loadSource() {
    const start = Date.now();
    const logger = this.log;

    if (this.options.sourceCode) {
      this.results.source = this.options.sourceCode;
      logger.debug('Using provided source code');
    } else if (this.options.sourceFile) {
      try {
        this.results.source = fs.readFileSync(this.options.sourceFile, 'utf-8');
        logger.debug(`Loaded from file: ${this.options.sourceFile}`);
        logger.trace('Source file size', this.results.source.length);
      } catch (error) {
        logger.error(`Cannot read file "${this.options.sourceFile}"`);
        throw new Error(`Cannot read file "${this.options.sourceFile}": ${error.message}`);
      }
    } else {
      logger.error('No source code or source file provided');
      throw new Error('No source code or source file provided');
    }

    this.timings.loadSource = Date.now() - start;
  }

  /**
   * Step 2: Lex source code into tokens
   */
  lex() {
    const start = Date.now();
    const logger = this.log;

    try {
      const lexer = new Lexer(this.results.source);
      this.results.tokens = lexer.tokenize();

      if (lexer.getErrors().length > 0) {
        logger.warn(`Lexer produced ${lexer.getErrors().length} warnings`);
        lexer.getErrors().forEach((err) => {
          logger.debug(`Lexer: ${err.message}`);
        });
      }
    } catch (error) {
      logger.error(`Lexing failed: ${error.message}`);
      throw new Error(`Lexing failed: ${error.message}`);
    }

    this.timings.lex = Date.now() - start;
  }

  /**
   * Step 3: Parse tokens into AST
   */
  parse() {
    const start = Date.now();
    const logger = this.log;

    try {
      const parser = new Parser(this.results.tokens);
      this.results.ast = parser.parse();

      if (parser.getErrors().length > 0) {
        logger.warn(`Parser produced ${parser.getErrors().length} errors`);
        parser.getErrors().forEach((err) => {
          logger.debug(`Parser: ${err.message}`);
        });

        if (this.options.strict) {
          throw new Error(`${parser.getErrors().length} parser errors found`);
        }
      }
    } catch (error) {
      logger.error(`Parsing failed: ${error.message}`);
      throw new Error(`Parsing failed: ${error.message}`);
    }

    this.timings.parse = Date.now() - start;
  }

  /**
   * Step 4: Analyze widgets (Phase 1)
   */
  analyzeWidgets() {
    const start = Date.now();
    const logger = this.log;

    try {
      const analyzer = new WidgetAnalyzer(this.results.ast);
      this.results.widgets = analyzer.analyze();

      if (this.results.widgets.errors.length > 0) {
        logger.warn(`Widget analysis produced ${this.results.widgets.errors.length} errors`);
        this.results.widgets.errors.forEach((err) => {
          logger.debug(`Widget: ${err.message}`);
        });
      }
    } catch (error) {
      logger.error(`Widget analysis failed: ${error.message}`);
      throw new Error(`Widget analysis failed: ${error.message}`);
    }

    this.timings.analyzeWidgets = Date.now() - start;
  }

  /**
   * Step 6: Analyze state (Phase 2)
   */
  analyzeState() {
    const start = Date.now();
    const logger = this.log;

    try {
      const analyzer = new StateAnalyzer(
        this.results.ast,
        this.results.widgets.widgets,
        { strict: this.options.strict }
      );
      this.results.state = analyzer.analyze();

      if (this.results.state.errors.length > 0) {
        logger.warn(`State analysis produced ${this.results.state.errors.length} errors`);
        this.results.state.errors.forEach((err) => {
          logger.debug(`State: ${err.message}`);
        });
      }
    } catch (error) {
      logger.error(`State analysis failed: ${error.message}`);
      throw new Error(`State analysis failed: ${error.message}`);
    }

    this.timings.analyzeState = Date.now() - start;
  }

  /**
   * Step 7: Analyze context (Phase 3)
   */
  analyzeContext() {
    const start = Date.now();
    const logger = this.log;

    try {
      const analyzer = new ContextAnalyzer(
        this.results.ast,
        this.results.widgets.widgets,
        { strict: this.options.strict }
      );
      this.results.context = analyzer.analyze();

      if (this.results.context.errors && this.results.context.errors.length > 0) {
        logger.warn(`Context analysis produced ${this.results.context.errors.length} errors`);
        this.results.context.errors.forEach((err) => {
          logger.debug(`Context: ${err.message}`);
        });
      }
    } catch (error) {
      logger.error(`Context analysis failed: ${error.message}`);
      throw new Error(`Context analysis failed: ${error.message}`);
    }

    this.timings.analyzeContext = Date.now() - start;
  }

  /**
   * Step 8: Analyze SSR compatibility (Phase 3)
   */
  analyzeSsr() {
    const start = Date.now();
    const logger = this.log;

    try {
      const analyzer = new SSRAnalyzer(
        this.results.context,
        this.results.state,
        { strict: this.options.strict }
      );
      this.results.ssr = analyzer.analyze();

      if (this.results.ssr.errors && this.results.ssr.errors.length > 0) {
        logger.warn(`SSR analysis produced ${this.results.ssr.errors.length} errors`);
        this.results.ssr.errors.forEach((err) => {
          logger.debug(`SSR: ${err.message}`);
        });
      }
    } catch (error) {
      logger.error(`SSR analysis failed: ${error.message}`);
      throw new Error(`SSR analysis failed: ${error.message}`);
    }

    this.timings.analyzeSsr = Date.now() - start;
  }

  /**
   * Step 9: Generate report
   */
  generateReport() {
    const start = Date.now();
    const logger = this.log;

    try {
      const generator = new ReportGenerator(
        this.results.widgets,
        this.results.state,
        this.results.context,
        this.results.ssr,
        {
          format: this.options.outputFormat,
          includeMetrics: this.options.includeMetrics,
          includeTree: this.options.includeTree,
          includeValidation: this.options.includeValidation,
          includeSuggestions: this.options.includeSuggestions,
          includeContext: this.options.includeContext,
          includeSsr: this.options.includeSsr,
          prettyPrint: this.options.prettyPrint,
        }
      );

      this.results.report = generator.generate();
    } catch (error) {
      logger.error(`Report generation failed: ${error.message}`);
      throw new Error(`Report generation failed: ${error.message}`);
    }

    this.timings.generateReport = Date.now() - start;
  }

  /**
   * Step 10: Output report (console or file)
   */
  output() {
    const logger = this.log;

    if (this.options.outputFile) {
      try {
        fs.writeFileSync(this.options.outputFile, this.results.report, 'utf-8');
        logger.success(`Report saved to: ${this.options.outputFile}`);
      } catch (error) {
        logger.error(`Cannot write to file "${this.options.outputFile}"`);
        throw new Error(`Cannot write to file "${this.options.outputFile}": ${error.message}`);
      }
    } else {
      // Only print report to console if not verbose logging
      if (this.options.outputFormat !== 'console') {
        console.log(this.results.report);
      }
    }
  }

  /**
   * Get analysis results - FIXED: Include logger info
   */
  getResults() {
    return {
      source: {
        length: this.results.source?.length || 0,
        file: this.options.sourceFile,
      },
      tokens: {
        count: this.results.tokens?.length || 0,
      },
      ast: {
        items: this.results.ast?.body?.length || 0,
      },
      widgets: {
        count: this.results.widgets?.widgets?.length || 0,
        stateless: this.results.widgets?.widgets?.filter((w) => w.type === 'stateless').length || 0,
        stateful: this.results.widgets?.widgets?.filter((w) => w.type === 'stateful').length || 0,
        stateClasses: this.results.widgets?.widgets?.filter((w) => w.type === 'state').length || 0,
      },
      imports: this.options.includeImports ? {
        total: this.results.importResolution?.summary?.total || 0,
        resolved: this.results.importResolution?.summary?.resolved || 0,
        unresolved: this.results.importResolution?.summary?.unresolved || 0,
        errors: this.results.importResolution?.summary?.errors || 0,
        resolutionRate: this.results.importResolution?.summary?.resolutionRate || 'N/A',
      } : null,
      state: {
        stateClasses: this.results.state?.stateClasses?.length || 0,
        stateFields: this.results.state?.stateFields?.length || 0,
        setStateCalls: this.results.state?.setStateCalls?.length || 0,
        lifecycleMethods: this.results.state?.lifecycleMethods?.length || 0,
        eventHandlers: this.results.state?.eventHandlers?.length || 0,
        validationIssues: this.results.state?.validationResults?.length || 0,
      },
      context: this.options.includeContext ? {
        inheritedWidgets: this.results.context?.inheritedWidgets?.length || 0,
        changeNotifiers: this.results.context?.changeNotifiers?.length || 0,
        providers: this.results.context?.providers?.length || 0,
        contextAccessPoints: this.results.context?.contextAccessPoints?.length || 0,
      } : null,
      ssr: this.options.includeSsr ? {
        compatibility: this.results.ssr?.overallCompatibility || 'unknown',
        compatibilityScore: this.results.ssr?.ssrCompatibilityScore || 0,
        safePatterns: this.results.ssr?.ssrSafePatterns?.length || 0,
        unsafePatterns: this.results.ssr?.ssrUnsafePatterns?.length || 0,
        hydrationNeeded: this.results.ssr?.hydrationCount || 0,
        migrationSteps: this.results.ssr?.ssrMigrationPath?.length || 0,
        estimatedEffort: this.results.ssr?.estimatedEffort || 'unknown',
      } : null,
      timings: this.timings,
      report: this.results.report,
      // FIXED: Include logger report and debug files
      logger: this.logger.getReport(),
      debugFiles: this.logger.readDebugFiles(),
    };
  }
}

// ============================================================================
// STATIC HELPER METHODS
// ============================================================================

async function analyzeCode(sourceCode, options = {}) {
  const analyzer = new Analyzer({
    sourceCode,
    ...options,
  });

  return analyzer.analyze();
}

async function analyzeFile(sourceFile, options = {}) {
  const analyzer = new Analyzer({
    sourceFile,
    ...options,
  });

  return analyzer.analyze();
}

async function analyzeAndSave(sourceFile, outputFile, options = {}) {
  const analyzer = new Analyzer({
    sourceFile,
    outputFile,
    ...options,
  });

  return analyzer.analyze();
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function runCLI() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(0);
  }

  const sourceFile = args[0];
  let outputFile = null;
  let outputFormat = 'json';
  let verbose = true;
  let includeImports = true;
  let includeContext = true;
  let includeSsr = true;
  let debugLevel = 'info';

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-o' || arg === '--output') {
      outputFile = args[++i];
    } else if (arg === '-f' || arg === '--format') {
      outputFormat = args[++i];
    } else if (arg === '-q' || arg === '--quiet') {
      verbose = false;
    } else if (arg === '--debug') {
      debugLevel = args[++i] || 'debug';
    } else if (arg === '--no-imports') {
      includeImports = false;
    } else if (arg === '--no-context') {
      includeContext = false;
    } else if (arg === '--no-ssr') {
      includeSsr = false;
    } else if (arg === '--phase1') {
      includeImports = false;
      includeContext = false;
      includeSsr = false;
    } else if (arg === '-h' || arg === '--help') {
      printUsage();
      process.exit(0);
    }
  }

  if (!['json', 'markdown', 'console'].includes(outputFormat)) {
    console.error(`Invalid format: ${outputFormat}`);
    process.exit(1);
  }

  try {
    const analyzer = new Analyzer({
      sourceFile,
      outputFile,
      outputFormat,
      verbose,
      includeImports,
      includeContext,
      includeSsr,
      debugLevel,
    });

    const results = await analyzer.analyze();

    // Show debug info location
    if (debugLevel !== 'info') {
      console.log('\n📊 Debug logs saved to: .debug/');
      console.log('   View with: node debug_viewer.js\n');
    }

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

function printUsage() {
  console.log(`
FlutterJS Analyzer (Phase 1 + Import Resolution + Phase 2 + 3)

Usage:
  node analyzer.js <source-file> [options]

Options:
  -o, --output <file>      Output file (default: print to console)
  -f, --format <format>    Output format: json, markdown, console (default: json)
  -q, --quiet              Suppress verbose output
  --debug <level>          Enable debug logging: trace, debug, info (default: info)
  --no-imports             Skip import resolution
  --no-context             Skip Phase 3 context analysis
  --no-ssr                 Skip Phase 3 SSR analysis
  --phase1                 Only Phase 1 (widgets + imports)
  -h, --help               Show this help message

Examples:
  node analyzer.js test.fjs
  node analyzer.js test.fjs -o report.json
  node analyzer.js test.fjs --debug trace
  node analyzer.js test.fjs -f markdown
  node analyzer.js test.fjs --phase1
`);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  Analyzer,
  analyzeCode,
  analyzeFile,
  analyzeAndSave,
  runCLI,
};

// ============================================================================
// CLI EXECUTION
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI();
}