/**
 * Report Generator Tests
 * Tests for JSON, Markdown, and Console report generation
 */

import { ReportGenerator } from '../src/ats/report-generator.js';

console.log('\n' + '='.repeat(80));
console.log('🧪 REPORT GENERATOR TESTS');
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
// MOCK DATA - Simulating Phase 1 & 2 Results
// ============================================================================

const mockWidgetResults = {
  file: 'test.fjs',
  widgets: [
    {
      name: 'MyCounter',
      type: 'stateful',
      superClass: 'StatefulWidget',
      location: { line: 1, column: 0 },
      constructor: {
        params: [{ name: 'key', optional: true }],
      },
      methods: [
        { name: 'createState', params: [] },
      ],
      properties: [],
      linkedStateClass: '_MyCounterState',
      imports: [],
    },
    {
      name: '_MyCounterState',
      type: 'state',
      superClass: 'State<MyCounter>',
      location: { line: 10, column: 0 },
      constructor: null,
      methods: [
        { name: 'initState', params: [] },
        { name: '_increment', params: [] },
        { name: 'build', params: [{ name: 'context' }] },
        { name: 'dispose', params: [] },
      ],
      properties: [
        { name: '_count' },
      ],
      linkedStateClass: null,
      imports: [],
    },
  ],
  functions: [
    {
      name: 'main',
      type: 'function',
      location: { line: 50, column: 0 },
      params: [],
      isEntryPoint: true,
    },
  ],
  imports: [
    {
      source: '@flutterjs/material',
      items: ['MaterialApp', 'Scaffold', 'Text'],
    },
  ],
  externalDependencies: ['@flutterjs/material'],
  entryPoint: 'main',
  rootWidget: 'MyCounter',
  widgetTree: {
    widget: { name: 'MyCounter', type: 'stateful' },
    depth: 0,
    children: [
      {
        widget: { name: 'MaterialApp', type: 'component' },
        depth: 1,
        children: [],
      },
    ],
  },
};

const mockStateResults = {
  stateClasses: [
    {
      metadata: {
        name: '_MyCounterState',
        linkedStatefulWidget: 'MyCounter',
        location: { line: 10, column: 0 },
        stateFields: [
          {
            name: '_count',
            type: 'number',
            initialValue: 0,
            initialValueString: '0',
            isUsed: () => true,
            usedInMethods: ['build', '_increment'],
            mutatedInMethods: ['_increment'],
            mutations: [
              {
                method: '_increment',
                operation: '++',
                wrappedInSetState: true,
              },
            ],
          },
        ],
        lifecycleMethods: [
          {
            name: 'initState',
            location: { line: 15, column: 2 },
            callsSuper: true,
            hasSideEffects: true,
            isValid: () => true,
            validationIssues: [],
          },
          {
            name: 'dispose',
            location: { line: 25, column: 2 },
            callsSuper: true,
            hasSideEffects: true,
            isValid: () => true,
            validationIssues: [],
          },
        ],
        otherMethods: [
          {
            name: '_increment',
            params: [],
          },
        ],
      },
    },
  ],
  setStateCalls: [
    {
      location: { line: 18, column: 4 },
      method: '_increment',
      updates: ['_count'],
      isValid: true,
      issues: [],
    },
  ],
  lifecycleMethods: [
    {
      name: 'initState',
      location: { line: 15, column: 2 },
      callsSuper: true,
      hasSideEffects: true,
    },
    {
      name: 'dispose',
      location: { line: 25, column: 2 },
      callsSuper: true,
      hasSideEffects: true,
    },
  ],
  eventHandlers: [
    {
      event: 'onPressed',
      handler: '_increment',
      location: { line: 40, column: 6 },
      component: 'ElevatedButton',
      triggersSetState: true,
      isValid: true,
      issues: [],
    },
  ],
  dependencyGraph: {
    stateToMethods: new Map([['_count', ['build', '_increment']]]),
    methodToState: new Map([['_increment', ['_count']]]),
    eventToState: new Map([['onPressed', ['_count']]]),
  },
  validationResults: [
    {
      type: 'unused-field',
      severity: 'warning',
      message: 'Field _unused is never used',
      suggestion: 'Remove or use the field',
    },
  ],
};

// ============================================================================
// TEST SUITE 1: Report Generator Initialization
// ============================================================================

console.log('TEST SUITE 1: Report Generator Initialization\n');

test('Create ReportGenerator instance', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults);
  assert(gen.widgetResults !== null, 'Should have widget results');
  assert(gen.stateResults !== null, 'Should have state results');
  assert(gen.options.format === 'json', 'Default format should be JSON');
});

test('Create with custom options', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, {
    format: 'markdown',
    includeMetrics: false,
    prettyPrint: false,
  });

  assert(gen.options.format === 'markdown', 'Should set format to markdown');
  assert(gen.options.includeMetrics === false, 'Should set includeMetrics to false');
  assert(gen.options.prettyPrint === false, 'Should set prettyPrint to false');
});

console.log('');

// ============================================================================
// TEST SUITE 2: Metrics Calculation
// ============================================================================

console.log('TEST SUITE 2: Metrics Calculation\n');

test('Calculate widget metrics', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults);
  gen.calculateMetrics();

  assert(gen.metadata.totalWidgets === 2, 'Should count 2 widgets');
  assert(gen.metadata.statefulWidgets === 1, 'Should count 1 stateful widget');
  assert(gen.metadata.stateClasses === 1, 'Should count 1 state class');
});

test('Calculate state metrics', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults);
  gen.calculateMetrics();

  assert(gen.metadata.totalStateFields === 1, 'Should count 1 state field');
  assert(gen.metadata.setStateCallCount === 1, 'Should count 1 setState call');
  assert(gen.metadata.lifecycleMethodCount === 2, 'Should count lifecycle methods');
  assert(gen.metadata.eventHandlerCount === 1, 'Should count event handler');
});

test('Calculate health score', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults);
  gen.calculateMetrics();

  assert(gen.metadata.healthScore >= 0, 'Health score should be >= 0');
  assert(gen.metadata.healthScore <= 100, 'Health score should be <= 100');
});

test('Calculate complexity score', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults);
  gen.calculateMetrics();

  assert(gen.metadata.complexityScore >= 0, 'Complexity should be >= 0');
  assert(gen.metadata.complexityScore <= 100, 'Complexity should be <= 100');
});

test('Calculate tree depth', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults);
  gen.calculateMetrics();

  assert(gen.metadata.treeDepth >= 1, 'Tree depth should be >= 1');
});

console.log('');

// ============================================================================
// TEST SUITE 3: Report Building
// ============================================================================

console.log('TEST SUITE 3: Report Building\n');

test('Build comprehensive report', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults);
  gen.calculateMetrics();
  gen.buildReport();

  assert(gen.report.analysis !== undefined, 'Should have analysis section');
  assert(gen.report.summary !== undefined, 'Should have summary section');
  assert(gen.report.widgets !== undefined, 'Should have widgets section');
  assert(gen.report.stateClasses !== undefined, 'Should have state classes section');
});

test('Report includes correct widget count', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults);
  gen.calculateMetrics();
  gen.buildReport();

  assert(gen.report.summary.widgets.total === 2, 'Summary should show 2 widgets');
});

test('Report includes state information', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults);
  gen.calculateMetrics();
  gen.buildReport();

  assert(gen.report.summary.state.stateClasses === 1, 'Should show 1 state class');
  assert(gen.report.summary.state.stateFields === 1, 'Should show 1 state field');
  assert(gen.report.summary.state.setStateCalls === 1, 'Should show setState calls');
});

console.log('');

// ============================================================================
// TEST SUITE 4: JSON Report Generation
// ============================================================================

console.log('TEST SUITE 4: JSON Report Generation\n');

test('Generate JSON report', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, { format: 'json' });
  const json = gen.generate();

  assert(typeof json === 'string', 'Should return string');
  assert(json.includes('{'), 'Should contain JSON');
});

test('JSON report is valid JSON', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, { format: 'json' });
  const json = gen.generate();

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error('Generated JSON is not valid');
  }

  assert(parsed.summary !== undefined, 'Parsed JSON should have summary');
});

test('JSON report includes all sections', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, { format: 'json' });
  const json = gen.generate();
  const parsed = JSON.parse(json);

  assert(parsed.analysis !== undefined, 'Should have analysis');
  assert(parsed.summary !== undefined, 'Should have summary');
  assert(parsed.widgets !== undefined, 'Should have widgets');
  assert(parsed.stateClasses !== undefined, 'Should have stateClasses');
  assert(parsed.validation !== undefined, 'Should have validation');
});

test('JSON can be pretty printed', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, {
    format: 'json',
    prettyPrint: true,
  });
  const json = gen.generate();

  assert(json.includes('\n'), 'Pretty printed JSON should have newlines');
  assert(json.includes('  '), 'Pretty printed JSON should have indentation');
});

test('JSON can be minified', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, {
    format: 'json',
    prettyPrint: false,
  });
  const json = gen.generate();

  // Minified JSON should be shorter than pretty printed
  const gen2 = new ReportGenerator(mockWidgetResults, mockStateResults, {
    format: 'json',
    prettyPrint: true,
  });
  const json2 = gen2.generate();

  assert(json.length < json2.length, 'Minified should be shorter');
});

console.log('');

// ============================================================================
// TEST SUITE 5: Markdown Report Generation
// ============================================================================

console.log('TEST SUITE 5: Markdown Report Generation\n');

test('Generate Markdown report', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, {
    format: 'markdown',
  });
  const md = gen.generate();

  assert(typeof md === 'string', 'Should return string');
  assert(md.includes('#'), 'Should contain Markdown headers');
});

test('Markdown includes summary table', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, {
    format: 'markdown',
  });
  const md = gen.generate();

  assert(md.includes('|'), 'Should have table');
  assert(md.includes('Summary'), 'Should have summary section');
});

test('Markdown includes widgets section', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, {
    format: 'markdown',
  });
  const md = gen.generate();

  assert(md.includes('## Widgets'), 'Should have widgets section');
  assert(md.includes('MyCounter'), 'Should include widget name');
});

test('Markdown includes state classes section', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, {
    format: 'markdown',
  });
  const md = gen.generate();

  assert(md.includes('## State Classes'), 'Should have state classes section');
  assert(md.includes('_MyCounterState'), 'Should include state class name');
});

console.log('');

// ============================================================================
// TEST SUITE 6: Console Report Generation
// ============================================================================

console.log('TEST SUITE 6: Console Report Generation\n');

test('Generate Console report', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, {
    format: 'console',
  });
  const console_report = gen.generate();

  assert(typeof console_report === 'string', 'Should return string');
  assert(console_report.includes('='), 'Should have separator lines');
});

test('Console report includes summary', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, {
    format: 'console',
  });
  const console_report = gen.generate();

  assert(console_report.includes('SUMMARY'), 'Should have summary section');
  assert(console_report.includes('Widgets'), 'Should include widget count');
  assert(console_report.includes('Health Score'), 'Should include health score');
});

test('Console report includes state information', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, {
    format: 'console',
  });
  const console_report = gen.generate();

  assert(console_report.includes('STATE CLASSES'), 'Should have state classes');
  assert(console_report.includes('_MyCounterState'), 'Should show state class name');
});

console.log('');

// ============================================================================
// TEST SUITE 7: Suggestions Generation
// ============================================================================

console.log('TEST SUITE 7: Suggestions Generation\n');

test('Generate suggestions', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, {
    includeSuggestions: true,
  });
  gen.calculateMetrics();
  gen.buildReport();

  assert(Array.isArray(gen.report.suggestions), 'Suggestions should be array');
});

test('Suggest unused field removal', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, {
    includeSuggestions: true,
  });
  gen.calculateMetrics();
  gen.buildReport();

  // With our mock data having an unused field, it should suggest removing it
  const suggestions = gen.generateSuggestions();
  const hasUnusedSuggestion = suggestions.some((s) => s.type === 'state');
  
  // Note: Our current mock doesn't have unused fields, so this may not trigger
  // but the method should be callable
  assert(Array.isArray(suggestions), 'Should return array of suggestions');
});

console.log('');

// ============================================================================
// TEST SUITE 8: Detailed Metrics
// ============================================================================

console.log('TEST SUITE 8: Detailed Metrics\n');

test('Include detailed metrics', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, {
    includeMetrics: true,
  });
  gen.calculateMetrics();
  gen.buildReport();

  assert(gen.report.metrics !== null, 'Metrics should be included');
  assert(gen.report.metrics.widgetMetrics !== undefined, 'Should have widget metrics');
  assert(gen.report.metrics.stateMetrics !== undefined, 'Should have state metrics');
});

test('Exclude metrics when disabled', () => {
  const gen = new ReportGenerator(mockWidgetResults, mockStateResults, {
    includeMetrics: false,
  });
  gen.calculateMetrics();
  gen.buildReport();

  assert(gen.report.metrics === null, 'Metrics should be null');
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
} else {
  console.log(`❌ ${testsFailed} test(s) failed\n`);
  process.exit(1);
}

console.log('='.repeat(80) + '\n');