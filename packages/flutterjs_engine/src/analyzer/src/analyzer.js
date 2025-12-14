/**
 * FlutterJS Analyzer - Main Orchestrator (Enhanced with Phase 3 + Import Resolution)
 * Coordinates all analysis phases including import resolution
 * 
 * Pipeline: Source → Lexer → Parser → WidgetAnalyzer (Phase 1)
 *           → ImportResolver (NEW!)
 *           → StateAnalyzer (Phase 2)
 *           → ContextAnalyzer (Phase 3)
 *           → SSRAnalyzer (Phase 3)
 *           → ReportGenerator
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

// ============================================================================
// MAIN ANALYZER CLASS
// ============================================================================

class Analyzer {
  constructor(options = {}) {
    this.options = {
      sourceFile: null,
      sourceCode: null,
      outputFormat: 'json',          // 'json', 'markdown', 'console'
      outputFile: null,              // If specified, save to file
      verbose: true,                 // Print debug info
      strict: false,                 // Strict error mode
      projectRoot: process.cwd(),    // Project root for import resolution
      includeMetrics: true,
      includeTree: true,
      includeValidation: true,
      includeSuggestions: true,
      includeContext: true,          // Phase 3: Include context analysis
      includeSsr: true,              // Phase 3: Include SSR analysis
      includeImports: true,          // Include import analysis (NEW!)
      ignoreUnresolvedImports: true, // Don't fail if imports unresolved
      prettyPrint: true,
      ...options,
    };

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
      importResolution: null,  // NEW!
      state: null,
      context: null,           // Phase 3
      ssr: null,               // Phase 3
      report: null,
    };

    this.errors = [];
    this.timings = {};
  }

  /**
   * Main entry point - run full analysis pipeline
   */
  async analyze() {
    this.log('\n' + '='.repeat(80));
    this.log('🚀 FlutterJS ANALYZER - FULL PIPELINE (Phase 1 + Import Resolution + Phase 2 + 3)');
    this.log('='.repeat(80) + '\n');

    try {
      // Step 1: Load source code
      this.log('STEP 1: Loading source code...');
      await this.loadSource();
      this.log('  ✓ Source loaded\n');

      // Step 2: Lexing
      this.log('STEP 2: Tokenizing (Lexing)...');
      this.lex();
      this.log(`  ✓ ${this.results.tokens.length} tokens generated\n`);

      // Step 3: Parsing
      this.log('STEP 3: Building AST (Parsing)...');
      this.parse();
      this.log(`  ✓ ${this.results.ast.body.length} top-level items\n`);

      // Step 4: Widget Analysis (Phase 1)
      this.log('STEP 4: Widget Analysis (Phase 1)...');
      this.analyzeWidgets();
      this.log(`  ✓ ${this.results.widgets.widgets.length} widgets detected\n`);

      // Step 5: Import Resolution (NEW!)
      if (this.options.includeImports) {
        this.log('STEP 5: Resolving Imports (NEW!)...');
        this.analyzeImports();
        const summary = this.results.importResolution?.summary;
        this.log(`  ✓ ${summary?.resolved || 0} resolved, ${summary?.unresolved || 0} unresolved\n`);
      }

      // Step 6: State Analysis (Phase 2)
      this.log('STEP 6: State Analysis (Phase 2)...');
      this.analyzeState();
      this.log(`  ✓ ${this.results.state.stateClasses.length} state classes analyzed\n`);

      // Step 7: Context Analysis (Phase 3)
      if (this.options.includeContext) {
        this.log('STEP 7: Context Analysis (Phase 3)...');
        this.analyzeContext();
        this.log(`  ✓ ${this.results.context.inheritedWidgets?.length || 0} inherited widgets detected\n`);
      }

      // Step 8: SSR Analysis (Phase 3)
      if (this.options.includeSsr) {
        this.log('STEP 8: SSR Compatibility Analysis (Phase 3)...');
        this.analyzeSsr();
        this.log(`  ✓ SSR Score: ${this.results.ssr.ssrCompatibilityScore}/100\n`);
      }

      // Step 9: Report Generation
      this.log('STEP 9: Generating Report...');
      this.generateReport();
      this.log('  ✓ Report generated\n');

      // Step 10: Output
      this.log('STEP 10: Output...');
      this.output();
      this.log('  ✓ Output complete\n');

      this.log('='.repeat(80));
      this.log('✅ ANALYSIS COMPLETE');
      this.log('='.repeat(80) + '\n');

      return this.getResults();
    } catch (error) {
      this.log('\n❌ ANALYSIS FAILED');
      this.log(`Error: ${error.message}\n`);
      throw error;
    }
  }

  /**
   * Step 5: Resolve all imports (NEW!)
   */
  analyzeImports() {
    const start = Date.now();

    try {
      if (!this.results.widgets) {
        this.log('  ⚠ No widgets found, skipping import analysis');
        return;
      }

      const imports = this.results.widgets.imports || [];

      if (imports.length === 0) {
        this.log('  (No imports found)');
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

      this.log(`  Found ${imports.length} imports to resolve...`);

      // Resolve imports
      const resolution = this.importResolver.resolveImports(
        imports.map((imp) => ({
          source: imp.source,
          items: imp.items,
        }))
      );

      // Store resolution results
      this.results.importResolution = resolution;

      // Print resolution report
      console.log(this.importResolver.generateReport());

      // Check for errors (unless ignoreUnresolvedImports is set)
      if (!this.options.ignoreUnresolvedImports &&
        resolution.imports.errors.length > 0) {
        throw new Error(
          `${resolution.imports.errors.length} imports could not be resolved`
        );
      }
    } catch (error) {
      throw new Error(`Import resolution failed: ${error.message}`);
    }

    this.timings.analyzeImports = Date.now() - start;
  }

  /**
   * Step 1: Load source code from file or use provided code
   */
  async loadSource() {
    const start = Date.now();

    if (this.options.sourceCode) {
      this.results.source = this.options.sourceCode;
      this.log('  (Using provided source code)');
    } else if (this.options.sourceFile) {
      try {
        this.results.source = fs.readFileSync(this.options.sourceFile, 'utf-8');
        this.log(`  (From file: ${this.options.sourceFile})`);
      } catch (error) {
        throw new Error(`Cannot read file "${this.options.sourceFile}": ${error.message}`);
      }
    } else {
      throw new Error('No source code or source file provided');
    }

    this.timings.loadSource = Date.now() - start;
  }

  /**
   * Step 2: Lex source code into tokens
   */
  lex() {
    const start = Date.now();

    try {
      const lexer = new Lexer(this.results.source);
      this.results.tokens = lexer.tokenize();

      if (lexer.getErrors().length > 0) {
        this.log('  ⚠️ Lexer warnings:');
        lexer.getErrors().forEach((err) => {
          this.log(`    - ${err.message}`);
        });
      }
    } catch (error) {
      throw new Error(`Lexing failed: ${error.message}`);
    }

    this.timings.lex = Date.now() - start;
  }

  /**
   * Step 3: Parse tokens into AST
   */
  parse() {
    const start = Date.now();

    try {
      const parser = new Parser(this.results.tokens);
      this.results.ast = parser.parse();

      if (parser.getErrors().length > 0) {
        this.log('  ⚠️ Parser errors:');
        parser.getErrors().forEach((err) => {
          this.log(`    - ${err.message}`);
        });

        if (this.options.strict) {
          throw new Error(`${parser.getErrors().length} parser errors found`);
        }
      }
    } catch (error) {
      throw new Error(`Parsing failed: ${error.message}`);
    }

    this.timings.parse = Date.now() - start;
  }

  /**
   * Step 4: Analyze widgets (Phase 1)
   */
  analyzeWidgets() {
    const start = Date.now();

    try {
      const analyzer = new WidgetAnalyzer(this.results.ast);
      this.results.widgets = analyzer.analyze();

      if (this.results.widgets.errors.length > 0) {
        this.log('  ⚠️ Widget analysis errors:');
        this.results.widgets.errors.forEach((err) => {
          this.log(`    - ${err.message}`);
        });
      }
    } catch (error) {
      throw new Error(`Widget analysis failed: ${error.message}`);
    }

    this.timings.analyzeWidgets = Date.now() - start;
  }

  /**
   * Step 6: Analyze state (Phase 2)
   */
  analyzeState() {
    const start = Date.now();

    try {
      const analyzer = new StateAnalyzer(
        this.results.ast,
        this.results.widgets.widgets,
        { strict: this.options.strict }
      );
      this.results.state = analyzer.analyze();

      if (this.results.state.errors.length > 0) {
        this.log('  ⚠️ State analysis errors:');
        this.results.state.errors.forEach((err) => {
          this.log(`    - ${err.message}`);
        });
      }
    } catch (error) {
      throw new Error(`State analysis failed: ${error.message}`);
    }

    this.timings.analyzeState = Date.now() - start;
  }

  /**
   * Step 7: Analyze context (Phase 3)
   */
  analyzeContext() {
    const start = Date.now();

    try {
      const analyzer = new ContextAnalyzer(
        this.results.ast,
        this.results.widgets.widgets,
        { strict: this.options.strict }
      );
      this.results.context = analyzer.analyze();

      if (this.results.context.errors && this.results.context.errors.length > 0) {
        this.log('  ⚠️ Context analysis errors:');
        this.results.context.errors.forEach((err) => {
          this.log(`    - ${err.message}`);
        });
      }
    } catch (error) {
      throw new Error(`Context analysis failed: ${error.message}`);
    }

    this.timings.analyzeContext = Date.now() - start;
  }

  /**
   * Step 8: Analyze SSR compatibility (Phase 3)
   */
  analyzeSsr() {
    const start = Date.now();

    try {
      const analyzer = new SSRAnalyzer(
        this.results.context,
        this.results.state,
        { strict: this.options.strict }
      );
      this.results.ssr = analyzer.analyze();

      if (this.results.ssr.errors && this.results.ssr.errors.length > 0) {
        this.log('  ⚠️ SSR analysis errors:');
        this.results.ssr.errors.forEach((err) => {
          this.log(`    - ${err.message}`);
        });
      }
    } catch (error) {
      throw new Error(`SSR analysis failed: ${error.message}`);
    }

    this.timings.analyzeSsr = Date.now() - start;
  }

  /**
   * Step 9: Generate report
   */
  generateReport() {
    const start = Date.now();

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
      throw new Error(`Report generation failed: ${error.message}`);
    }

    this.timings.generateReport = Date.now() - start;
  }

  /**
   * Step 10: Output report (console or file)
   */
  output() {
    if (this.options.outputFile) {
      try {
        fs.writeFileSync(this.options.outputFile, this.results.report, 'utf-8');
        this.log(`  Saved to: ${this.options.outputFile}`);
      } catch (error) {
        throw new Error(`Cannot write to file "${this.options.outputFile}": ${error.message}`);
      }
    } else {
      console.log(this.results.report);
    }
  }

  /**
   * Get analysis results
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
    };
  }

  /**
   * Print to console if verbose
   */
  log(message) {
    if (this.options.verbose) {
      console.log(message);
    }
  }
}

// ============================================================================
// STATIC HELPER METHODS
// ============================================================================

function analyzeCode(sourceCode, options = {}) {
  const analyzer = new Analyzer({
    sourceCode,
    ...options,
  });

  return analyzer.analyze();
}

function analyzeFile(sourceFile, options = {}) {
  const analyzer = new Analyzer({
    sourceFile,
    ...options,
  });

  return analyzer.analyze();
}

function analyzeAndSave(sourceFile, outputFile, options = {}) {
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

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-o' || arg === '--output') {
      outputFile = args[++i];
    } else if (arg === '-f' || arg === '--format') {
      outputFormat = args[++i];
    } else if (arg === '-q' || arg === '--quiet') {
      verbose = false;
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
    });

    await analyzer.analyze();
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
  --no-imports             Skip import resolution
  --no-context             Skip Phase 3 context analysis
  --no-ssr                 Skip Phase 3 SSR analysis
  --phase1                 Only Phase 1 (widgets + imports)
  -h, --help               Show this help message

Examples:
  node analyzer.js test.fjs
  node analyzer.js test.fjs -o report.json
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