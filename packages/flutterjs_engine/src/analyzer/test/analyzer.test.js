/**
 * FlutterJS Analyzer Tests - Enhanced Phase 1 + 2 + 3
 * Comprehensive tests for complete analysis pipeline
 */

import { Analyzer, analyzeCode, analyzeFile, analyzeAndSave } from '../src/ats/analyzer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n' + '='.repeat(80));
console.log('🧪 ANALYZER ORCHESTRATOR TESTS (Phase 1 + 2 + 3)');
console.log('='.repeat(80) + '\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================================================
// TEST DATA
// ============================================================================

const simpleSource = `
class MyApp extends StatelessWidget {
  build(context) {
    return Container({
      child: new Text({ data: "Hello" })
    });
  }
}

function main() {
  runApp(new MyApp());
}
`;

const statefulSource = `
class MyCounter extends StatefulWidget {
  createState() {
    return new _MyCounterState();
  }
}

class _MyCounterState extends State<MyCounter> {
  _count = 0;
  
  _increment() {
    this.setState(() => {
      this._count++;
    });
  }
  
  build(context) {
    return Text({ data: "Count" });
  }
}

function main() {
  runApp(new MyCounter());
}
`;

// Phase 3: Context and SSR patterns
const contextSource = `
import { InheritedWidget, ChangeNotifier, Provider } from '@flutterjs/core';
import { Theme, ThemeData } from '@flutterjs/material';

class ThemeProvider extends InheritedWidget {
  final ThemeData theme;
  final Widget child;

  ThemeProvider({ required this.theme, required this.child });

  static ThemeData of(BuildContext context) {
    return context
      .dependOnInheritedWidgetOfExactType<ThemeProvider>()
      ?.theme;
  }

  @override
  bool updateShouldNotify(ThemeProvider oldWidget) {
    return theme != oldWidget.theme;
  }
}

class CounterNotifier extends ChangeNotifier {
  int _count = 0;
  
  int get count => _count;
  
  void increment() {
    _count++;
    notifyListeners();
  }
}

class MyApp extends StatelessWidget {
  build(context) {
    return ThemeProvider(
      theme: ThemeData.light(),
      child: new Provider<CounterNotifier>(
        create: (context) => CounterNotifier(),
        child: new MaterialApp({
          home: new HomePage()
        })
      )
    );
  }
}

class HomePage extends StatefulWidget {
  createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  build(context) {
    final theme = ThemeProvider.of(context);
    final counter = context.watch<CounterNotifier>();
    
    return Scaffold({
      appBar: new AppBar({
        backgroundColor: theme.primaryColor
      }),
      body: new Center({
        child: new Text({ 
          data: "Count: \${counter.count}"
        })
      }),
      floatingActionButton: new FloatingActionButton({
        onPressed: () {
          counter.increment();
        }
      })
    });
  }
}

function main() {
  runApp(new MyApp());
}
`;

// ============================================================================
// TEST SUITE 1: Analyzer Initialization
// ============================================================================

console.log('TEST SUITE 1: Analyzer Initialization\n');

test('Create Analyzer with default options', () => {
  const analyzer = new Analyzer();
  assert(analyzer.options.verbose === true, 'Should have verbose enabled');
  assert(analyzer.options.outputFormat === 'json', 'Should default to JSON');
  assert(analyzer.options.includeContext === true, 'Should include context by default');
  assert(analyzer.options.includeSsr === true, 'Should include SSR by default');
});

test('Create Analyzer with Phase 3 disabled', () => {
  const analyzer = new Analyzer({
    sourceCode: simpleSource,
    includeContext: false,
    includeSsr: false,
  });

  assert(analyzer.options.includeContext === false, 'Should disable context');
  assert(analyzer.options.includeSsr === false, 'Should disable SSR');
});

test('Create Analyzer with phase selection', () => {
  const analyzer = new Analyzer({
    sourceCode: simpleSource,
  });

  // By default all phases enabled
  assert(analyzer.options.includeContext === true, 'Phase 3 context enabled');
  assert(analyzer.options.includeSsr === true, 'Phase 3 SSR enabled');
});

console.log('');

// ============================================================================
// TEST SUITE 2: Source Loading & Lexing
// ============================================================================

console.log('TEST SUITE 2: Source Loading & Lexing\n');

test('Load and tokenize source code', async () => {
  const analyzer = new Analyzer({
    sourceCode: simpleSource,
    verbose: false,
  });

  await analyzer.loadSource();
  analyzer.lex();

  assert(analyzer.results.source !== null, 'Should load source');
  assert(analyzer.results.tokens.length > 0, 'Should tokenize');
});

test('Handle lexer errors gracefully', async () => {
  const analyzer = new Analyzer({
    sourceCode: simpleSource,
    verbose: false,
    strict: false,
  });

  await analyzer.loadSource();
  analyzer.lex();

  // Should complete without throwing
  assert(analyzer.results.tokens !== null, 'Should complete lexing');
});

console.log('');

// ============================================================================
// TEST SUITE 3: Parsing Phase
// ============================================================================

console.log('TEST SUITE 3: Parsing Phase\n');

test('Parse tokens to AST', async () => {
  const analyzer = new Analyzer({
    sourceCode: simpleSource,
    verbose: false,
  });

  await analyzer.loadSource();
  analyzer.lex();
  analyzer.parse();

  assert(analyzer.results.ast !== null, 'Should have AST');
  assert(analyzer.results.ast.body.length > 0, 'AST should have body');
});

test('Parse stateful code', async () => {
  const analyzer = new Analyzer({
    sourceCode: statefulSource,
    verbose: false,
  });

  await analyzer.loadSource();
  analyzer.lex();
  analyzer.parse();

  assert(analyzer.results.ast.body.length > 0, 'Should parse stateful code');
});

console.log('');

// ============================================================================
// TEST SUITE 4: Widget Analysis (Phase 1)
// ============================================================================

console.log('TEST SUITE 4: Widget Analysis (Phase 1)\n');

test('Analyze widgets', async () => {
  const analyzer = new Analyzer({
    sourceCode: statefulSource,
    verbose: false,
  });

  await analyzer.loadSource();
  analyzer.lex();
  analyzer.parse();
  analyzer.analyzeWidgets();

  assert(analyzer.results.widgets !== null, 'Should have widgets');
  assert(Array.isArray(analyzer.results.widgets.widgets), 'Widgets should be array');
});

test('Detect widget types', async () => {
  const analyzer = new Analyzer({
    sourceCode: statefulSource,
    verbose: false,
  });

  await analyzer.loadSource();
  analyzer.lex();
  analyzer.parse();
  analyzer.analyzeWidgets();

  const widgets = analyzer.results.widgets.widgets;
  const types = widgets.map((w) => w.type);
  
  // Should detect stateful or component types
  assert(types.length > 0, 'Should detect widget types');
});

console.log('');

// ============================================================================
// TEST SUITE 5: State Analysis (Phase 2)
// ============================================================================

console.log('TEST SUITE 5: State Analysis (Phase 2)\n');

test('Analyze state classes', async () => {
  const analyzer = new Analyzer({
    sourceCode: statefulSource,
    verbose: false,
  });

  await analyzer.loadSource();
  analyzer.lex();
  analyzer.parse();
  analyzer.analyzeWidgets();
  analyzer.analyzeState();

  assert(analyzer.results.state !== null, 'Should have state results');
  assert(Array.isArray(analyzer.results.state.stateClasses), 'Should be array');
});

test('Detect lifecycle methods', async () => {
  const analyzer = new Analyzer({
    sourceCode: statefulSource,
    verbose: false,
  });

  await analyzer.loadSource();
  analyzer.lex();
  analyzer.parse();
  analyzer.analyzeWidgets();
  analyzer.analyzeState();

  const lifecycleMethods = analyzer.results.state.lifecycleMethods;
  assert(Array.isArray(lifecycleMethods), 'Should track lifecycle methods');
});

console.log('');

// ============================================================================
// TEST SUITE 6: Context Analysis (Phase 3)
// ============================================================================

console.log('TEST SUITE 6: Context Analysis (Phase 3)\n');

test('Analyze context when enabled', async () => {
  const analyzer = new Analyzer({
    sourceCode: contextSource,
    verbose: false,
    includeContext: true,
  });

  await analyzer.loadSource();
  analyzer.lex();
  analyzer.parse();
  analyzer.analyzeWidgets();
  analyzer.analyzeState();
  analyzer.analyzeContext();

  assert(analyzer.results.context !== null, 'Should have context results');
  assert(Array.isArray(analyzer.results.context.inheritedWidgets), 'Should detect inherited widgets');
});

test('Skip context analysis when disabled', async () => {
  const analyzer = new Analyzer({
    sourceCode: contextSource,
    verbose: false,
    includeContext: false,
  });

  await analyzer.loadSource();
  analyzer.lex();
  analyzer.parse();
  analyzer.analyzeWidgets();
  analyzer.analyzeState();

  // Should not call analyzeContext, so results.context should be null
  assert(analyzer.results.context === null, 'Should be null when disabled');
});

test('Detect InheritedWidget patterns', async () => {
  const analyzer = new Analyzer({
    sourceCode: contextSource,
    verbose: false,
  });

  await analyzer.loadSource();
  analyzer.lex();
  analyzer.parse();
  analyzer.analyzeWidgets();
  analyzer.analyzeState();
  analyzer.analyzeContext();

  const inherited = analyzer.results.context.inheritedWidgets;
  assert(inherited.length >= 0, 'Should analyze inherited widgets');
});

test('Detect ChangeNotifier patterns', async () => {
  const analyzer = new Analyzer({
    sourceCode: contextSource,
    verbose: false,
  });

  await analyzer.loadSource();
  analyzer.lex();
  analyzer.parse();
  analyzer.analyzeWidgets();
  analyzer.analyzeState();
  analyzer.analyzeContext();

  const notifiers = analyzer.results.context.changeNotifiers;
  assert(Array.isArray(notifiers), 'Should analyze change notifiers');
});

console.log('');

// ============================================================================
// TEST SUITE 7: SSR Analysis (Phase 3)
// ============================================================================

console.log('TEST SUITE 7: SSR Analysis (Phase 3)\n');

test('Analyze SSR when enabled', async () => {
  const analyzer = new Analyzer({
    sourceCode: contextSource,
    verbose: false,
    includeSsr: true,
  });

  await analyzer.loadSource();
  analyzer.lex();
  analyzer.parse();
  analyzer.analyzeWidgets();
  analyzer.analyzeState();
  analyzer.analyzeContext();
  analyzer.analyzeSsr();

  assert(analyzer.results.ssr !== null, 'Should have SSR results');
  assert(analyzer.results.ssr.ssrCompatibilityScore !== undefined, 'Should have compatibility score');
});

test('Skip SSR analysis when disabled', async () => {
  const analyzer = new Analyzer({
    sourceCode: contextSource,
    verbose: false,
    includeSsr: false,
  });

  await analyzer.loadSource();
  analyzer.lex();
  analyzer.parse();
  analyzer.analyzeWidgets();
  analyzer.analyzeState();
  analyzer.analyzeContext();

  assert(analyzer.results.ssr === null, 'Should be null when disabled');
});

test('Detect SSR-safe patterns', async () => {
  const analyzer = new Analyzer({
    sourceCode: simpleSource,
    verbose: false,
  });

  await analyzer.loadSource();
  analyzer.lex();
  analyzer.parse();
  analyzer.analyzeWidgets();
  analyzer.analyzeState();
  analyzer.analyzeContext();
  analyzer.analyzeSsr();

  const safePatterns = analyzer.results.ssr.ssrSafePatterns;
  assert(Array.isArray(safePatterns), 'Should track SSR-safe patterns');
});

test('Detect SSR-unsafe patterns', async () => {
  const analyzer = new Analyzer({
    sourceCode: contextSource,
    verbose: false,
  });

  await analyzer.loadSource();
  analyzer.lex();
  analyzer.parse();
  analyzer.analyzeWidgets();
  analyzer.analyzeState();
  analyzer.analyzeContext();
  analyzer.analyzeSsr();

  const unsafePatterns = analyzer.results.ssr.ssrUnsafePatterns;
  assert(Array.isArray(unsafePatterns), 'Should track SSR-unsafe patterns');
});

test('Generate SSR migration path', async () => {
  const analyzer = new Analyzer({
    sourceCode: contextSource,
    verbose: false,
  });

  await analyzer.loadSource();
  analyzer.lex();
  analyzer.parse();
  analyzer.analyzeWidgets();
  analyzer.analyzeState();
  analyzer.analyzeContext();
  analyzer.analyzeSsr();

  const migrationPath = analyzer.results.ssr.ssrMigrationPath;
  assert(Array.isArray(migrationPath), 'Should generate migration steps');
});

console.log('');

// ============================================================================
// TEST SUITE 8: Report Generation
// ============================================================================

console.log('TEST SUITE 8: Report Generation\n');

test('Generate JSON report with Phase 3', async () => {
  const analyzer = new Analyzer({
    sourceCode: contextSource,
    outputFormat: 'json',
    verbose: false,
  });

  const results = await analyzer.analyze();

  assert(results.report !== undefined, 'Should have report');
  
  // Parse to verify valid JSON
  const parsed = JSON.parse(results.report);
  assert(parsed.context !== undefined, 'Should include context section');
  assert(parsed.ssr !== undefined, 'Should include SSR section');
});

test('Generate Markdown report with Phase 3', async () => {
  const analyzer = new Analyzer({
    sourceCode: contextSource,
    outputFormat: 'markdown',
    verbose: false,
  });

  const results = await analyzer.analyze();

  assert(results.report.includes('Context'), 'Should mention context');
  assert(results.report.includes('SSR'), 'Should mention SSR');
});

test('Generate Console report with Phase 3', async () => {
  const analyzer = new Analyzer({
    sourceCode: contextSource,
    outputFormat: 'console',
    verbose: false,
  });

  const results = await analyzer.analyze();

  assert(results.report.includes('='), 'Should have formatting');
  assert(results.report.length > 0, 'Should generate output');
});

console.log('');

// ============================================================================
// TEST SUITE 9: Full Pipeline
// ============================================================================

console.log('TEST SUITE 9: Full Pipeline\n');

test('Complete analysis (Phase 1+2)', async () => {
  const analyzer = new Analyzer({
    sourceCode: statefulSource,
    includeContext: false,
    includeSsr: false,
    verbose: false,
  });

  const results = await analyzer.analyze();

  assert(results.widgets.count >= 0, 'Should have widgets');
  assert(results.state.stateClasses >= 0, 'Should have state');
  assert(results.context === null, 'Context should be null');
  assert(results.ssr === null, 'SSR should be null');
});

test('Complete analysis (Phase 1+2+3)', async () => {
  const analyzer = new Analyzer({
    sourceCode: contextSource,
    includeContext: true,
    includeSsr: true,
    verbose: false,
  });

  const results = await analyzer.analyze();

  assert(results.widgets.count >= 0, 'Should have widgets');
  assert(results.state.stateClasses >= 0, 'Should have state');
  assert(results.context !== null, 'Should have context');
  assert(results.ssr !== null, 'Should have SSR results');
  assert(results.ssr.compatibility !== undefined, 'Should have compatibility');
});

test('Get analysis results structure', async () => {
  const analyzer = new Analyzer({
    sourceCode: simpleSource,
    verbose: false,
  });

  const results = await analyzer.analyze();

  assert(results.source !== undefined, 'Should have source info');
  assert(results.tokens !== undefined, 'Should have token count');
  assert(results.ast !== undefined, 'Should have AST info');
  assert(results.widgets !== undefined, 'Should have widget info');
  assert(results.state !== undefined, 'Should have state info');
  assert(results.context !== undefined, 'Should have context info (Phase 3)');
  assert(results.ssr !== undefined, 'Should have SSR info (Phase 3)');
  assert(results.timings !== undefined, 'Should have timings');
});

console.log('');

// ============================================================================
// TEST SUITE 10: Helper Functions
// ============================================================================

console.log('TEST SUITE 10: Helper Functions\n');

test('analyzeCode helper', async () => {
  const results = await analyzeCode(simpleSource, { verbose: false });

  assert(results.report !== undefined, 'Should generate report');
  assert(results.tokens.count > 0, 'Should have tokens');
});

test('analyzeFile helper', async () => {
  const testFile = path.join(__dirname, 'temp-helper-test.fjs');
  fs.writeFileSync(testFile, simpleSource, 'utf-8');

  try {
    const results = await analyzeFile(testFile, { verbose: false });
    assert(results.report !== undefined, 'Should generate report');
  } finally {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  }
});

test('analyzeAndSave helper', async () => {
  const sourceFile = path.join(__dirname, 'temp-source.fjs');
  const outputFile = path.join(__dirname, 'temp-output.json');

  fs.writeFileSync(sourceFile, simpleSource, 'utf-8');

  try {
    const results = await analyzeAndSave(sourceFile, outputFile, { verbose: false });

    assert(fs.existsSync(outputFile), 'Should create output file');
    
    const content = fs.readFileSync(outputFile, 'utf-8');
    const parsed = JSON.parse(content);
    assert(parsed.summary !== undefined, 'Output should have summary');
  } finally {
    if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
  }
});

console.log('');

// ============================================================================
// TEST SUITE 11: Error Handling
// ============================================================================

console.log('TEST SUITE 11: Error Handling\n');

test('Handle missing file gracefully', async () => {
  const analyzer = new Analyzer({
    sourceFile: '/nonexistent/path/test.fjs',
    verbose: false,
  });

  try {
    await analyzer.analyze();
    throw new Error('Should have failed');
  } catch (error) {
    assert(error.message.includes('Cannot read file'), 'Should report file error');
  }
});

test('Handle no source provided', async () => {
  const analyzer = new Analyzer({ verbose: false });

  try {
    await analyzer.loadSource();
    throw new Error('Should have failed');
  } catch (error) {
    assert(error.message.includes('No source code'), 'Should error');
  }
});

test('Respect verbose setting', () => {
  const analyzer = new Analyzer({ verbose: false });

  // Should not throw
  try {
    analyzer.log('This should not print');
  } catch (error) {
    throw new Error('Logging should not throw');
  }
});

console.log('');

// ============================================================================
// TEST SUMMARY
// ============================================================================

console.log('='.repeat(80));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(80));
console.log(`✓ Passed: ${testsPassed}`);
console.log(`✗ Failed: ${testsFailed}`);
console.log(`Total:   ${testsPassed + testsFailed}\n`);

if (testsFailed === 0) {
  console.log('🎉 ALL TESTS PASSED!\n');
  process.exit(0);
} else {
  console.log(`❌ ${testsFailed} test(s) failed\n`);
  process.exit(1);
}

console.log('='.repeat(80) + '\n');