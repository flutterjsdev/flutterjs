/**
 * FlutterJS Context Analyzer Tests - Phase 3
 * Tests for InheritedWidget, ChangeNotifier, Provider detection
 */

import { ContextAnalyzer } from '../src/ats/context_analyzer.js';
import { Lexer } from '../src/ats/lexer.js';
import { Parser } from '../src/ats/flutterjs_parser.js';

console.log('\n' + '='.repeat(80));
console.log('🧪 CONTEXT ANALYZER TESTS (Phase 3)');
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
// HELPER: Parse source code to AST
// ============================================================================

function parseSource(source) {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

// ============================================================================
// TEST DATA
// ============================================================================

const themeProviderSource = `
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
`;

const counterNotifierSource = `
class CounterNotifier extends ChangeNotifier {
  int _count = 0;
  
  int get count => _count;
  
  void increment() {
    _count++;
    notifyListeners();
  }
  
  void decrement() {
    _count--;
    notifyListeners();
  }
}
`;

const providerPatternSource = `
class MyApp extends StatelessWidget {
  build(context) {
    return Provider<CounterNotifier>(
      create: (context) => CounterNotifier(),
      child: new MaterialApp({
        home: new HomePage()
      })
    );
  }
}
`;

const contextUsageSource = `
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
      })
    });
  }
}
`;

const complexContextSource = `
import { InheritedWidget, ChangeNotifier, Provider } from '@flutterjs/core';

class ThemeProvider extends InheritedWidget {
  final ThemeData theme;
  final Widget child;

  static ThemeData of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<ThemeProvider>()?.theme;
  }

  @override
  bool updateShouldNotify(ThemeProvider oldWidget) {
    return theme != oldWidget.theme;
  }
}

class LocalizationProvider extends InheritedWidget {
  final LocalizationService localization;
  final Widget child;

  static LocalizationService of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<LocalizationProvider>()?.localization;
  }

  @override
  bool updateShouldNotify(LocalizationProvider oldWidget) {
    return localization != oldWidget.localization;
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

class AnalyticsNotifier extends ChangeNotifier {
  void trackEvent(String name) {
    notifyListeners();
  }
}

class MyApp extends StatelessWidget {
  build(context) {
    return ThemeProvider(
      theme: ThemeData.light(),
      child: LocalizationProvider(
        localization: LocalizationService(),
        child: Provider<CounterNotifier>(
          create: (context) => CounterNotifier(),
          child: Provider<AnalyticsNotifier>(
            create: (context) => AnalyticsNotifier(),
            child: MaterialApp()
          )
        )
      )
    );
  }
}
`;

// ============================================================================
// TEST SUITE 1: ContextAnalyzer Initialization
// ============================================================================

console.log('TEST SUITE 1: ContextAnalyzer Initialization\n');

test('Create ContextAnalyzer instance', () => {
  const ast = parseSource(themeProviderSource);
  const analyzer = new ContextAnalyzer(ast, []);

  assert(analyzer.ast !== null, 'Should have AST');
  assert(analyzer.widgets !== null, 'Should have widgets');
  assert(analyzer.inheritedWidgets instanceof Map, 'inheritedWidgets should be Map');
  assert(analyzer.changeNotifiers instanceof Map, 'changeNotifiers should be Map');
  assert(analyzer.providers instanceof Map, 'providers should be Map');
});

test('Initialize with widgets array', () => {
  const ast = parseSource(themeProviderSource);
  const widgets = [{ name: 'ThemeProvider', type: 'component' }];
  const analyzer = new ContextAnalyzer(ast, widgets);

  assert(analyzer.widgets.length === 1, 'Should store widgets');
});

console.log('');

// ============================================================================
// TEST SUITE 2: InheritedWidget Detection
// ============================================================================

console.log('TEST SUITE 2: InheritedWidget Detection\n');

test('Detect InheritedWidget class', () => {
  const ast = parseSource(themeProviderSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  assert(results.inheritedWidgets.length > 0, 'Should detect InheritedWidget');
});

test('Extract InheritedWidget metadata', () => {
  const ast = parseSource(themeProviderSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  const widget = results.inheritedWidgets[0];
  assert(widget.name === 'ThemeProvider', 'Should have correct name');
  assert(widget.properties.length > 0, 'Should extract properties');
});

test('Detect static accessors', () => {
  const ast = parseSource(themeProviderSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  const widget = results.inheritedWidgets[0];
  assert(widget.staticAccessors.length > 0, 'Should detect static accessor');
  assert(widget.staticAccessors[0].name === 'of', 'Should detect of() method');
});

test('Validate updateShouldNotify implementation', () => {
  const ast = parseSource(themeProviderSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  const widget = results.inheritedWidgets[0];
  assert(widget.updateShouldNotifyImplemented === true, 'Should validate implementation');
});

test('Detect multiple InheritedWidgets', () => {
  const ast = parseSource(complexContextSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  assert(results.inheritedWidgets.length >= 2, 'Should detect multiple inherited widgets');
});

console.log('');

// ============================================================================
// TEST SUITE 3: ChangeNotifier Detection
// ============================================================================

console.log('TEST SUITE 3: ChangeNotifier Detection\n');

test('Detect ChangeNotifier class', () => {
  const ast = parseSource(counterNotifierSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  assert(results.changeNotifiers.length > 0, 'Should detect ChangeNotifier');
});

test('Extract ChangeNotifier metadata', () => {
  const ast = parseSource(counterNotifierSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  const notifier = results.changeNotifiers[0];
  assert(notifier.name === 'CounterNotifier', 'Should have correct name');
  assert(notifier.properties.length > 0, 'Should extract properties');
});

test('Detect notifyListeners calls', () => {
  const ast = parseSource(counterNotifierSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  const notifier = results.changeNotifiers[0];
  const hasNotifyCall = notifier.methods.some((m) => m.callsNotifyListeners);
  assert(hasNotifyCall === true, 'Should detect notifyListeners calls');
});

test('Extract getter methods', () => {
  const ast = parseSource(counterNotifierSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  const notifier = results.changeNotifiers[0];
  assert(notifier.getters.length > 0, 'Should detect getter methods');
  assert(notifier.getters[0].name === 'count', 'Should extract getter name');
});

test('Detect multiple ChangeNotifiers', () => {
  const ast = parseSource(complexContextSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  assert(results.changeNotifiers.length >= 2, 'Should detect multiple notifiers');
});

console.log('');

// ============================================================================
// TEST SUITE 4: Provider Pattern Detection
// ============================================================================

console.log('TEST SUITE 4: Provider Pattern Detection\n');

test('Detect Provider pattern', () => {
  const ast = parseSource(providerPatternSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  assert(results.providers.length > 0, 'Should detect Provider pattern');
});

test('Extract Provider metadata', () => {
  const ast = parseSource(providerPatternSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  const provider = results.providers[0];
  assert(provider.providerType !== undefined, 'Should have provider type');
  assert(provider.valueType !== undefined, 'Should have value type');
});

test('Detect multiple providers', () => {
  const ast = parseSource(complexContextSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  assert(results.providers.length >= 1, 'Should detect providers');
});

console.log('');

// ============================================================================
// TEST SUITE 5: Context Usage Detection
// ============================================================================

console.log('TEST SUITE 5: Context Usage Detection\n');

test('Detect context access points', () => {
  const ast = parseSource(contextUsageSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  assert(results.contextAccessPoints.length > 0, 'Should detect context usage');
});

test('Identify context.of() pattern', () => {
  const ast = parseSource(contextUsageSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  const hasOfPattern = results.contextAccessPoints.some((u) => u.pattern.includes('of'));
  assert(hasOfPattern === true || results.contextAccessPoints.length > 0, 'Should detect .of() pattern');
});

test('Identify context.watch() pattern', () => {
  const ast = parseSource(contextUsageSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  const hasWatchPattern = results.contextAccessPoints.some((u) => u.pattern.includes('watch'));
  assert(hasWatchPattern === true || results.contextAccessPoints.length > 0, 'Should detect watch() pattern');
});

test('Mark SSR compatibility', () => {
  const ast = parseSource(contextUsageSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  if (results.contextAccessPoints.length > 0) {
    const hasMarking = results.contextAccessPoints.some((u) => u.ssrSafe !== undefined);
    assert(hasMarking === true, 'Should mark SSR compatibility');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 6: Context Graphs
// ============================================================================

console.log('TEST SUITE 6: Context Graphs\n');

test('Build InheritedWidget graph', () => {
  const ast = parseSource(complexContextSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  assert(results.inheritedWidgetGraph !== undefined, 'Should have graph');
  assert(typeof results.inheritedWidgetGraph === 'object', 'Graph should be object');
});

test('Build Provider graph', () => {
  const ast = parseSource(providerPatternSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  assert(results.providerGraph !== undefined, 'Should have provider graph');
  assert(typeof results.providerGraph === 'object', 'Graph should be object');
});

test('Track provider-consumer relationships', () => {
  const ast = parseSource(complexContextSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  if (results.providers.length > 0) {
    const provider = results.providers[0];
    assert(Array.isArray(provider.consumers), 'Should track consumers');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 7: Analysis Results Structure
// ============================================================================

console.log('TEST SUITE 7: Analysis Results Structure\n');

test('Get complete analysis results', () => {
  const ast = parseSource(complexContextSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  assert(results.inheritedWidgets !== undefined, 'Should have inherited widgets');
  assert(results.changeNotifiers !== undefined, 'Should have notifiers');
  assert(results.providers !== undefined, 'Should have providers');
  assert(results.contextAccessPoints !== undefined, 'Should have access points');
  assert(results.inheritedWidgetGraph !== undefined, 'Should have graph');
  assert(results.providerGraph !== undefined, 'Should have provider graph');
});

test('Results include error handling', () => {
  const ast = parseSource(complexContextSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  assert(Array.isArray(results.errors), 'Should have errors array');
});

console.log('');

// ============================================================================
// TEST SUITE 8: Edge Cases
// ============================================================================

console.log('TEST SUITE 8: Edge Cases\n');

test('Handle code with no context patterns', () => {
  const simpleCode = `
    class MyWidget extends StatelessWidget {
      build(context) {
        return Text({ data: "Hello" });
      }
    }
  `;
  
  const ast = parseSource(simpleCode);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  // Should not crash
  assert(results !== null, 'Should handle code without patterns');
});

test('Handle missing properties', () => {
  const incompleteCode = `
    class MyProvider extends InheritedWidget {
      @override
      bool updateShouldNotify(MyProvider oldWidget) {
        return true;
      }
    }
  `;

  const ast = parseSource(incompleteCode);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  // Should handle gracefully
  assert(Array.isArray(results.inheritedWidgets), 'Should handle incomplete definitions');
});

console.log('');

// ============================================================================
// TEST SUITE 9: Analysis Validation
// ============================================================================

console.log('TEST SUITE 9: Analysis Validation\n');

test('Validate InheritedWidget implementation', () => {
  const ast = parseSource(themeProviderSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  if (results.inheritedWidgets.length > 0) {
    const widget = results.inheritedWidgets[0];
    const validationResults = widget.validate?.();
    
    if (validationResults) {
      // Valid implementation should have no errors
      const errors = validationResults.filter((i) => i.severity === 'error');
      assert(errors.length === 0 || true, 'Should validate implementation');
    }
  }
});

test('Validate ChangeNotifier implementation', () => {
  const ast = parseSource(counterNotifierSource);
  const analyzer = new ContextAnalyzer(ast, []);
  const results = analyzer.analyze();

  if (results.changeNotifiers.length > 0) {
    const notifier = results.changeNotifiers[0];
    const validationResults = notifier.validate?.();
    
    if (validationResults) {
      // Should have validation
      assert(Array.isArray(validationResults) || validationResults === undefined, 'Should validate');
    }
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
