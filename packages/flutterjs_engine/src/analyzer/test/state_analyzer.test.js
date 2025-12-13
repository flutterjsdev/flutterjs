/**
 * FlutterJS State Analyzer Tests
 * Phase 2 Implementation
 * 
 * Tests for state detection, setState tracking, lifecycle validation, etc.
 */

import { Lexer } from '../src/ats/lexer.js';
import { Parser } from '../src/ats/flutterjs_parser.js';
import { WidgetAnalyzer } from '../src/ats/flutterjs_widget_analyzer.js';
import { StateAnalyzer } from '../src/ats/state_analyzer_implementation.js';

// ============================================================================
// TEST 1: Simple Counter Widget (Basic State)
// ============================================================================

const counterSource = `
class MyCounter extends StatefulWidget {
  constructor({ key = undefined } = {}) {
    this.key = key;
  }
  
  createState() {
    return new _MyCounterState();
  }
}

class _MyCounterState extends State<MyCounter> {
  _count = 0;
  _isLoading = false;
  
  initState() {
    super.initState();
    console.log("Counter initialized");
  }
  
  _incrementCounter() {
    this.setState(() => {
      this._count++;
    });
  }
  
  _decrementCounter() {
    this.setState(() => {
      this._count--;
    });
  }
  
  dispose() {
    console.log("Cleaning up");
    super.dispose();
  }
  
  build(context) {
    return Scaffold({
      body: new Text({ data: "Count: " + this._count })
    });
  }
}

function main() {
  runApp(new MyCounter());
}
`;

console.log('🧪 STATE ANALYZER TEST SUITE\n');
console.log('='.repeat(70) + '\n');

// ============================================================================
// TEST 1: Counter Widget
// ============================================================================

console.log('TEST 1: Simple Counter Widget\n');
console.log('Source:');
console.log(counterSource);
console.log('\n' + '='.repeat(70) + '\n');

try {
  const lexer = new Lexer(counterSource);
  const tokens = lexer.tokenize();
  console.log(`✓ Lexing: ${tokens.length} tokens\n`);

  const parser = new Parser(tokens);
  const ast = parser.parse();
  console.log(`✓ Parsing: ${ast.body.length} top-level items\n`);

  const widgetAnalyzer = new WidgetAnalyzer(ast);
  const widgetResults = widgetAnalyzer.analyze();
  console.log(`✓ Widget Analysis: ${widgetResults.widgets.length} widgets found\n`);

  console.log('Widgets detected:');
  widgetResults.widgets.forEach((w) => {
    console.log(`  - ${w.name} (${w.type})`);
  });
  console.log('');

  const stateAnalyzer = new StateAnalyzer(ast, widgetResults.widgets);
  const stateResults = stateAnalyzer.analyze();

  console.log('STATE ANALYSIS RESULTS:\n');

  // State Classes
  console.log(`State Classes: ${stateResults.stateClasses.length}`);
  stateResults.stateClasses.forEach((sc) => {
    console.log(`  Name: ${sc.metadata.name}`);
    console.log(`  Linked to: ${sc.metadata.linkedStatefulWidget}`);
    console.log(`  State Fields: ${sc.metadata.stateFields.length}`);
    sc.metadata.stateFields.forEach((f) => {
      console.log(`    - ${f.name}: ${f.type} = ${f.initialValue}`);
    });
  });
  console.log('');

  // setState Calls
  console.log(`setState Calls: ${stateResults.setStateCalls.length}`);
  stateResults.setStateCalls.forEach((call) => {
    console.log(`  Method: ${call.method}`);
    console.log(`  Updates: ${call.updates.join(', ')}`);
    console.log(`  Valid: ${call.isValid}`);
  });
  console.log('');

  // Lifecycle Methods
  console.log(`Lifecycle Methods: ${stateResults.lifecycleMethods.length}`);
  stateResults.lifecycleMethods.forEach((lc) => {
    console.log(`  - ${lc.name} (calls super: ${lc.callsSuper})`);
  });
  console.log('');

  // Event Handlers
  console.log(`Event Handlers: ${stateResults.eventHandlers.length}`);
  stateResults.eventHandlers.forEach((eh) => {
    console.log(`  - ${eh.event}: ${eh.handler}`);
  });
  console.log('');

  // Validation Results
  console.log(`Validation Issues: ${stateResults.validationResults.length}`);
  if (stateResults.validationResults.length > 0) {
    stateResults.validationResults.forEach((result) => {
      console.log(`  [${result.severity.toUpperCase()}] ${result.type}: ${result.message}`);
      if (result.suggestion) {
        console.log(`    → ${result.suggestion}`);
      }
    });
  } else {
    console.log('  ✓ No validation issues');
  }
  console.log('');

  // Dependency Graph
  console.log('Dependency Graph:');
  console.log('  State to Methods:');
  stateResults.dependencyGraph.stateToMethods.forEach((methods, state) => {
    console.log(`    ${state} → [${methods.join(', ')}]`);
  });
  console.log('');

  // Errors
  if (stateResults.errors.length > 0) {
    console.log(`❌ Analysis Errors: ${stateResults.errors.length}`);
    stateResults.errors.forEach((err) => {
      console.log(`  - ${err.message}`);
    });
  } else {
    console.log('✓ No analysis errors');
  }

  console.log('\n' + '='.repeat(70) + '\n');
} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error(error.stack);
  console.log('\n' + '='.repeat(70) + '\n');
}

// ============================================================================
// TEST 2: Widget with Event Handlers
// ============================================================================

const eventHandlerSource = `
class MyForm extends StatefulWidget {
  createState() {
    return new _MyFormState();
  }
}

class _MyFormState extends State<MyForm> {
  _name = "";
  _email = "";
  
  _handleNameChange(value) {
    this.setState(() => {
      this._name = value;
    });
  }
  
  _handleEmailChange(value) {
    this.setState(() => {
      this._email = value;
    });
  }
  
  _handleSubmit() {
    console.log("Form submitted: " + this._name);
    // Process form
  }
  
  build(context) {
    return Column({
      children: [
        new TextField({
          value: this._name,
          onChange: (val) => this._handleNameChange(val)
        }),
        new TextField({
          value: this._email,
          onChange: (val) => this._handleEmailChange(val)
        }),
        new Button({
          onPressed: () => this._handleSubmit(),
          child: new Text({ data: "Submit" })
        })
      ]
    });
  }
}
`;

console.log('TEST 2: Widget with Event Handlers\n');
console.log('Source:');
console.log(eventHandlerSource);
console.log('\n' + '='.repeat(70) + '\n');

try {
  const lexer = new Lexer(eventHandlerSource);
  const tokens = lexer.tokenize();
  console.log(`✓ Lexing: ${tokens.length} tokens\n`);

  const parser = new Parser(tokens);
  const ast = parser.parse();
  console.log(`✓ Parsing: ${ast.body.length} top-level items\n`);

  const widgetAnalyzer = new WidgetAnalyzer(ast);
  const widgetResults = widgetAnalyzer.analyze();
  console.log(`✓ Widget Analysis: ${widgetResults.widgets.length} widgets\n`);

  const stateAnalyzer = new StateAnalyzer(ast, widgetResults.widgets);
  const stateResults = stateAnalyzer.analyze();

  console.log('STATE ANALYSIS RESULTS:\n');

  console.log('State Fields:');
  stateResults.stateClasses.forEach((sc) => {
    sc.metadata.stateFields.forEach((f) => {
      console.log(`  - ${f.name}: ${f.type} = "${f.initialValue}"`);
    });
  });
  console.log('');

  console.log(`Event Handlers Found: ${stateResults.eventHandlers.length}`);
  stateResults.eventHandlers.forEach((eh) => {
    console.log(`  - ${eh.event}: ${eh.handler}`);
  });
  console.log('');

  console.log('setState Calls (that update fields):');
  stateResults.setStateCalls.forEach((call) => {
    console.log(`  ${call.method}() updates: [${call.updates.join(', ')}]`);
  });
  console.log('');

  if (stateResults.validationResults.length > 0) {
    console.log('Validation Issues:');
    stateResults.validationResults.forEach((result) => {
      console.log(`  [${result.severity}] ${result.message}`);
    });
  } else {
    console.log('✓ No validation issues\n');
  }

  console.log('\n' + '='.repeat(70) + '\n');
} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error(error.stack);
  console.log('\n' + '='.repeat(70) + '\n');
}

// ============================================================================
// TEST 3: Validation - Unused State Field
// ============================================================================

const unusedStateSource = `
class MyWidget extends StatefulWidget {
  createState() {
    return new _MyWidgetState();
  }
}

class _MyWidgetState extends State<MyWidget> {
  _count = 0;
  _unused = "never used";
  
  _increment() {
    this.setState(() => {
      this._count++;
    });
  }
  
  build(context) {
    return Text({ data: "Count: " + this._count });
  }
}
`;

console.log('TEST 3: Validation - Unused State Field\n');
console.log('Source:');
console.log(unusedStateSource);
console.log('\n' + '='.repeat(70) + '\n');

try {
  const lexer = new Lexer(unusedStateSource);
  const tokens = lexer.tokenize();

  const parser = new Parser(tokens);
  const ast = parser.parse();

  const widgetAnalyzer = new WidgetAnalyzer(ast);
  const widgetResults = widgetAnalyzer.analyze();

  const stateAnalyzer = new StateAnalyzer(ast, widgetResults.widgets);
  const stateResults = stateAnalyzer.analyze();

  console.log('STATE ANALYSIS RESULTS:\n');

  console.log('State Fields Detected:');
  stateResults.stateClasses.forEach((sc) => {
    sc.metadata.stateFields.forEach((f) => {
      console.log(`  - ${f.name}`);
    });
  });
  console.log('');

  if (stateResults.validationResults.length > 0) {
    console.log('⚠️  VALIDATION WARNINGS/ERRORS:');
    stateResults.validationResults.forEach((result) => {
      console.log(`  [${result.type}] ${result.message}`);
      console.log(`    Severity: ${result.severity}`);
      console.log(`    Suggestion: ${result.suggestion}`);
    });
  } else {
    console.log('✓ No validation issues');
  }

  console.log('\n' + '='.repeat(70) + '\n');
} catch (error) {
  console.error('❌ ERROR:', error.message);
}

// ============================================================================
// TEST 4: Lifecycle Validation
// ============================================================================

const lifecycleSource = `
class MyWidget extends StatefulWidget {
  createState() {
    return new _MyWidgetState();
  }
}

class _MyWidgetState extends State<MyWidget> {
  _timer = null;
  
  initState() {
    super.initState();
    this._timer = setTimeout(() => {}, 1000);
  }
  
  dispose() {
    clearTimeout(this._timer);
    super.dispose();
  }
  
  build(context) {
    return Text({ data: "Ready" });
  }
}
`;

console.log('TEST 4: Lifecycle Methods Validation\n');
console.log('Source:');
console.log(lifecycleSource);
console.log('\n' + '='.repeat(70) + '\n');

try {
  const lexer = new Lexer(lifecycleSource);
  const tokens = lexer.tokenize();

  const parser = new Parser(tokens);
  const ast = parser.parse();

  const widgetAnalyzer = new WidgetAnalyzer(ast);
  const widgetResults = widgetAnalyzer.analyze();

  const stateAnalyzer = new StateAnalyzer(ast, widgetResults.widgets);
  const stateResults = stateAnalyzer.analyze();

  console.log('LIFECYCLE METHODS DETECTED:\n');

  stateResults.lifecycleMethods.forEach((lc) => {
    console.log(`  ${lc.name}()`);
    console.log(`    Calls super: ${lc.callsSuper}`);
    console.log(`    Has side effects: ${lc.hasSideEffects}`);
  });
  console.log('');

  if (stateResults.validationResults.length > 0) {
    console.log('Validation Results:');
    stateResults.validationResults.forEach((result) => {
      console.log(`  [${result.severity}] ${result.message}`);
    });
  } else {
    console.log('✓ Lifecycle validation passed');
  }

  console.log('\n' + '='.repeat(70) + '\n');
} catch (error) {
  console.error('❌ ERROR:', error.message);
}

// ============================================================================
// TEST 5: Stateless Widget (Should not have state)
// ============================================================================

const statelessSource = `
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

console.log('TEST 5: Stateless Widget (No State Expected)\n');
console.log('Source:');
console.log(statelessSource);
console.log('\n' + '='.repeat(70) + '\n');

try {
  const lexer = new Lexer(statelessSource);
  const tokens = lexer.tokenize();

  const parser = new Parser(tokens);
  const ast = parser.parse();

  const widgetAnalyzer = new WidgetAnalyzer(ast);
  const widgetResults = widgetAnalyzer.analyze();

  console.log(`Widgets: ${widgetResults.widgets.length}`);
  widgetResults.widgets.forEach((w) => {
    console.log(`  - ${w.name}: ${w.type}`);
  });
  console.log('');

  const stateAnalyzer = new StateAnalyzer(ast, widgetResults.widgets);
  const stateResults = stateAnalyzer.analyze();

  console.log(`State Classes: ${stateResults.stateClasses.length}`);
  if (stateResults.stateClasses.length === 0) {
    console.log('  ✓ Correctly identified as stateless widget');
  }
  console.log('');

  console.log(`setState Calls: ${stateResults.setStateCalls.length}`);
  if (stateResults.setStateCalls.length === 0) {
    console.log('  ✓ No setState found (as expected)');
  }

  console.log('\n' + '='.repeat(70) + '\n');
} catch (error) {
  console.error('❌ ERROR:', error.message);
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('✅ TESTS COMPLETED\n');
console.log('Summary:');
console.log('  - Test 1: Simple Counter (state fields, setState, lifecycle)');
console.log('  - Test 2: Form Widget (event handlers, multiple fields)');
console.log('  - Test 3: Unused State (validation warnings)');
console.log('  - Test 4: Lifecycle Validation (super calls)');
console.log('  - Test 5: Stateless Widget (no state expected)');
console.log('\nNext: Run with: node test/state-analyzer.test.js');