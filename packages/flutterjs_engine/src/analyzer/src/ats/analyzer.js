/**
 * FlutterJS Analyzer - Main Orchestrator
 * Coordinates all analysis phases and report generation
 * 
 * Pipeline: Source → Lexer → Parser → WidgetAnalyzer → StateAnalyzer → ReportGenerator
 */

import fs from 'fs';
import path from 'path';
import { Lexer } from './lexer.js';
import { Parser } from './flutterjs_parser.js';
import { WidgetAnalyzer } from './flutterjs_widget_analyzer.js';
import { StateAnalyzer } from './state_analyzer_implementation.js';
import { ReportGenerator } from './flutterjs_report_generator.js';

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
      includeMetrics: true,
      includeTree: true,
      includeValidation: true,
      includeSuggestions: true,
      prettyPrint: true,
      ...options,
    };

    this.results = {
      source: null,
      tokens: null,
      ast: null,
      widgets: null,
      state: null,
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
    this.log('🚀 FlutterJS ANALYZER - FULL PIPELINE');
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

      // Step 4: Widget Analysis
      this.log('STEP 4: Widget Analysis (Phase 1)...');
      this.analyzeWidgets();
      this.log(`  ✓ ${this.results.widgets.widgets.length} widgets detected\n`);

      // Step 5: State Analysis
      this.log('STEP 5: State Analysis (Phase 2)...');
      this.analyzeState();
      this.log(`  ✓ ${this.results.state.stateClasses.length} state classes analyzed\n`);

      // Step 6: Report Generation
      this.log('STEP 6: Generating Report...');
      this.generateReport();
      this.log('  ✓ Report generated\n');

      // Step 7: Output
      this.log('STEP 7: Output...');
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
        this.log('  ⚠️  Lexer warnings:');
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
        this.log('  ⚠️  Parser errors:');
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
        this.log('  ⚠️  Widget analysis errors:');
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
   * Step 5: Analyze state (Phase 2)
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
        this.log('  ⚠️  State analysis errors:');
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
   * Step 6: Generate report
   */
  generateReport() {
    const start = Date.now();

    try {
      const generator = new ReportGenerator(
        this.results.widgets,
        this.results.state,
        {
          format: this.options.outputFormat,
          includeMetrics: this.options.includeMetrics,
          includeTree: this.options.includeTree,
          includeValidation: this.options.includeValidation,
          includeSuggestions: this.options.includeSuggestions,
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
   * Step 7: Output report (console or file)
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
      // Print to console
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
      state: {
        stateClasses: this.results.state?.stateClasses?.length || 0,
        stateFields: this.results.state?.stateFields?.length || 0,
        setStateCalls: this.results.state?.setStateCalls?.length || 0,
        lifecycleMethods: this.results.state?.lifecycleMethods?.length || 0,
        eventHandlers: this.results.state?.eventHandlers?.length || 0,
        validationIssues: this.results.state?.validationResults?.length || 0,
      },
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

/**
 * Analyze a source code string
 */
function analyzeCode(sourceCode, options = {}) {
  const analyzer = new Analyzer({
    sourceCode,
    ...options,
  });

  return analyzer.analyze();
}

/**
 * Analyze a file
 */
function analyzeFile(sourceFile, options = {}) {
  const analyzer = new Analyzer({
    sourceFile,
    ...options,
  });

  return analyzer.analyze();
}

/**
 * Analyze and save to file
 */
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

/**
 * Run analyzer from command line
 */
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

  // Parse options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-o' || arg === '--output') {
      outputFile = args[++i];
    } else if (arg === '-f' || arg === '--format') {
      outputFormat = args[++i];
    } else if (arg === '-q' || arg === '--quiet') {
      verbose = false;
    } else if (arg === '-h' || arg === '--help') {
      printUsage();
      process.exit(0);
    }
  }

  // Validate format
  if (!['json', 'markdown', 'console'].includes(outputFormat)) {
    console.error(`Invalid format: ${outputFormat}`);
    console.error('Valid formats: json, markdown, console');
    process.exit(1);
  }

  try {
    const analyzer = new Analyzer({
      sourceFile,
      outputFile,
      outputFormat,
      verbose,
    });

    await analyzer.analyze();
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * Print CLI usage
 */
function printUsage() {
  console.log(`
FlutterJS Analyzer

Usage:
  node analyzer.js <source-file> [options]

Options:
  -o, --output <file>    Output file (default: print to console)
  -f, --format <format>  Output format: json, markdown, console (default: json)
  -q, --quiet            Suppress verbose output
  -h, --help             Show this help message

Examples:
  node analyzer.js test.fjs
  node analyzer.js test.fjs -o report.json
  node analyzer.js test.fjs -f markdown -o report.md
  node analyzer.js test.fjs -f console
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

// If run directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI();
}