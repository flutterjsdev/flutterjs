/**
 * State Analyzer Data Classes - Unit Tests
 * Tests for all data structures used in Phase 2
 */

import {
  StateClassMetadata,
  StateField,
  LifecycleMethod,
  StateUpdateCall,
  EventHandler,
  DependencyGraph,
  ValidationResult,
  AnalysisSummary,
} from '../src/ats/state_analyzer_data.js';

console.log('\n' + '='.repeat(80));
console.log('🧪 STATE ANALYZER DATA CLASSES - UNIT TESTS');
console.log('='.repeat(80) + '\n');

let testsPassed = 0;
let testsFailed = 0;

/**
 * Test helper
 */
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
// TEST SUITE 1: StateClassMetadata
// ============================================================================

console.log('TEST SUITE 1: StateClassMetadata\n');

test('Create basic StateClassMetadata', () => {
  const metadata = new StateClassMetadata('_MyWidgetState', { line: 10, column: 0 });
  assert(metadata.name === '_MyWidgetState', 'Name should be set');
  assert(metadata.stateFields.length === 0, 'Should start with no fields');
  assert(metadata.lifecycleMethods.length === 0, 'Should start with no lifecycle methods');
});

test('Link StatefulWidget to State class', () => {
  const metadata = new StateClassMetadata('_MyWidgetState', { line: 10, column: 0 }, 'MyWidget');
  assert(metadata.linkedStatefulWidget === 'MyWidget', 'Should link to widget');
});

test('Add state field to metadata', () => {
  const metadata = new StateClassMetadata('_MyWidgetState', { line: 10, column: 0 });
  const field = new StateField('_count', 'number', 0, { line: 11, column: 2 });
  
  metadata.addStateField(field);
  assert(metadata.stateFields.length === 1, 'Should have 1 field');
  assert(metadata.stateFields[0].name === '_count', 'Field should be added');
});

test('Add lifecycle method to metadata', () => {
  const metadata = new StateClassMetadata('_MyWidgetState', { line: 10, column: 0 });
  const lifecycle = new LifecycleMethod('initState', { line: 15, column: 2 }, [], true);
  
  metadata.addLifecycleMethod(lifecycle);
  assert(metadata.lifecycleMethods.length === 1, 'Should have 1 lifecycle method');
  assert(metadata.lifecycleMethods[0].name === 'initState', 'Method should be added');
});

test('Get StateClassMetadata summary', () => {
  const metadata = new StateClassMetadata('_MyWidgetState', { line: 10, column: 0 }, 'MyWidget');
  const field = new StateField('_count', 'number', 0, { line: 11, column: 2 });
  metadata.addStateField(field);
  
  const summary = metadata.summary();
  assert(summary.name === '_MyWidgetState', 'Summary should include name');
  assert(summary.fieldCount === 1, 'Summary should show field count');
  assert(summary.statefulWidget === 'MyWidget', 'Summary should show linked widget');
});

console.log('');

// ============================================================================
// TEST SUITE 2: StateField
// ============================================================================

console.log('TEST SUITE 2: StateField\n');

test('Create StateField with initial value', () => {
  const field = new StateField('_count', 'number', 0, { line: 11, column: 2 });
  assert(field.name === '_count', 'Name should be set');
  assert(field.type === 'number', 'Type should be number');
  assert(field.initialValue === 0, 'Initial value should be 0');
  assert(field.initialValueString === '0', 'Initial value string should be "0"');
});

test('Create StateField with string value', () => {
  const field = new StateField('_name', 'string', 'John', { line: 12, column: 2 });
  assert(field.type === 'string', 'Type should be string');
  assert(field.initialValueString === '"John"', 'String value should be quoted');
});

test('Create StateField with boolean value', () => {
  const field = new StateField('_isLoading', 'boolean', false, { line: 13, column: 2 });
  assert(field.type === 'boolean', 'Type should be boolean');
  assert(field.initialValueString === 'false', 'Boolean value should be stringified');
});

test('Record usage of state field', () => {
  const field = new StateField('_count', 'number', 0, { line: 11, column: 2 });
  
  field.recordUsage('build');
  field.recordUsage('_increment');
  
  assert(field.usedInMethods.length === 2, 'Should record 2 usages');
  assert(field.usedInMethods.includes('build'), 'Should include build method');
  assert(field.usedInMethods.includes('_increment'), 'Should include _increment method');
});

test('Record mutation of state field', () => {
  const field = new StateField('_count', 'number', 0, { line: 11, column: 2 });
  
  field.recordMutation('_increment', '++');
  field.recordMutation('_decrement', '--');
  
  assert(field.mutations.length === 2, 'Should record 2 mutations');
  assert(field.mutatedInMethods.length === 2, 'Should have 2 mutating methods');
});

test('Check if field is used', () => {
  const field = new StateField('_count', 'number', 0, { line: 11, column: 2 });
  
  assert(!field.isUsed(), 'Field should not be used initially');
  
  field.recordUsage('build');
  assert(field.isUsed(), 'Field should be used after recording usage');
});

test('Get StateField summary', () => {
  const field = new StateField('_count', 'number', 0, { line: 11, column: 2 });
  field.recordUsage('build');
  field.recordMutation('_increment', '++');
  
  const summary = field.summary();
  assert(summary.name === '_count', 'Summary should include name');
  assert(summary.type === 'number', 'Summary should include type');
  assert(summary.isUsed === true, 'Summary should show usage');
  assert(summary.mutationCount === 1, 'Summary should show mutations');
});

console.log('');

// ============================================================================
// TEST SUITE 3: LifecycleMethod
// ============================================================================

console.log('TEST SUITE 3: LifecycleMethod\n');

test('Create LifecycleMethod - initState', () => {
  const method = new LifecycleMethod('initState', { line: 20, column: 2 }, [], true);
  assert(method.name === 'initState', 'Name should be initState');
  assert(method.callsSuper === true, 'Should call super');
});

test('Create LifecycleMethod - dispose', () => {
  const method = new LifecycleMethod('dispose', { line: 30, column: 2 }, [], true, true);
  assert(method.name === 'dispose', 'Name should be dispose');
  assert(method.hasSideEffects === true, 'Should have side effects');
});

test('Mark lifecycle method must call super', () => {
  const method = new LifecycleMethod('dispose', { line: 30, column: 2 }, [], false);
  method.setMustCallSuper(true);
  
  assert(method.shouldCallSuper === true, 'Should mark as must call super');
});

test('Add validation issue to lifecycle method', () => {
  const method = new LifecycleMethod('initState', { line: 20, column: 2 }, [], false);
  method.addIssue('missing-super', 'initState should call super.initState()', 'warning');
  
  assert(method.validationIssues.length === 1, 'Should have 1 issue');
  assert(method.validationIssues[0].type === 'missing-super', 'Issue type should be correct');
});

test('Validate lifecycle method - dispose without super is invalid', () => {
  const method = new LifecycleMethod('dispose', { line: 30, column: 2 }, [], false);
  assert(!method.isValid(), 'dispose() without super should be invalid');
});

test('Validate lifecycle method - dispose with super is valid', () => {
  const method = new LifecycleMethod('dispose', { line: 30, column: 2 }, [], true);
  assert(method.isValid(), 'dispose() with super should be valid');
});

test('Get LifecycleMethod summary', () => {
  const method = new LifecycleMethod('initState', { line: 20, column: 2 }, [], true);
  const summary = method.summary();
  
  assert(summary.name === 'initState', 'Summary should include name');
  assert(summary.callsSuper === true, 'Summary should show super calls');
  assert(summary.isValid === true, 'Summary should show validity');
});

console.log('');

// ============================================================================
// TEST SUITE 4: StateUpdateCall
// ============================================================================

console.log('TEST SUITE 4: StateUpdateCall\n');

test('Create StateUpdateCall', () => {
  const call = new StateUpdateCall(
    { line: 28, column: 4 },
    '_increment',
    ['_count'],
    '_MyWidgetState'
  );
  
  assert(call.method === '_increment', 'Method should be set');
  assert(call.updates.includes('_count'), 'Should update _count');
  assert(call.isValid === true, 'Should be valid initially');
});

test('Add validation issue to setState call', () => {
  const call = new StateUpdateCall(
    { line: 28, column: 4 },
    '_increment',
    ['_count'],
    '_MyWidgetState'
  );
  
  call.addIssue('unknown-field', 'Unknown state field _count', 'error');
  assert(call.isValid === false, 'Should be invalid after error');
  assert(call.issues.length === 1, 'Should have 1 issue');
});

test('Check if setState call updates specific field', () => {
  const call = new StateUpdateCall(
    { line: 28, column: 4 },
    '_increment',
    ['_count', '_name'],
    '_MyWidgetState'
  );
  
  assert(call.updatesField('_count'), 'Should update _count');
  assert(call.updatesField('_name'), 'Should update _name');
  assert(!call.updatesField('_other'), 'Should not update _other');
});

test('Get StateUpdateCall summary', () => {
  const call = new StateUpdateCall(
    { line: 28, column: 4 },
    '_increment',
    ['_count'],
    '_MyWidgetState'
  );
  
  const summary = call.summary();
  assert(summary.method === '_increment', 'Summary should include method');
  assert(summary.updates.includes('_count'), 'Summary should include updates');
  assert(summary.isValid === true, 'Summary should show validity');
});

console.log('');

// ============================================================================
// TEST SUITE 5: EventHandler
// ============================================================================

console.log('TEST SUITE 5: EventHandler\n');

test('Create EventHandler', () => {
  const handler = new EventHandler(
    'onPressed',
    '_increment',
    { line: 50, column: 6 },
    'ElevatedButton'
  );
  
  assert(handler.event === 'onPressed', 'Event should be onPressed');
  assert(handler.handler === '_increment', 'Handler should be _increment');
  assert(handler.component === 'ElevatedButton', 'Component should be ElevatedButton');
  assert(handler.isValid === true, 'Should be valid initially');
});

test('Add validation issue to EventHandler', () => {
  const handler = new EventHandler('onPressed', '_missing', { line: 50, column: 6 });
  handler.addIssue('missing-handler', 'Handler _missing not found', 'error');
  
  assert(handler.isValid === false, 'Should be invalid');
  assert(handler.issues.length === 1, 'Should have 1 issue');
});

test('Mark EventHandler triggers setState', () => {
  const handler = new EventHandler('onPressed', '_increment', { line: 50, column: 6 });
  handler.marksSetState(true);
  
  assert(handler.triggersSetState === true, 'Should mark as triggers setState');
});

test('Get EventHandler summary', () => {
  const handler = new EventHandler(
    'onChange',
    '_handleChange',
    { line: 55, column: 6 },
    'TextField'
  );
  handler.marksSetState(true);
  
  const summary = handler.summary();
  assert(summary.event === 'onChange', 'Summary should include event');
  assert(summary.handler === '_handleChange', 'Summary should include handler');
  assert(summary.triggersSetState === true, 'Summary should show setState trigger');
});

console.log('');

// ============================================================================
// TEST SUITE 6: DependencyGraph
// ============================================================================

console.log('TEST SUITE 6: DependencyGraph\n');

test('Create DependencyGraph', () => {
  const graph = new DependencyGraph();
  assert(graph.stateToMethods.size === 0, 'Should start empty');
});

test('Add state → method mapping', () => {
  const graph = new DependencyGraph();
  graph.addStateUse('_count', 'build');
  graph.addStateUse('_count', '_increment');
  
  const methods = graph.getMethodsForState('_count');
  assert(methods.length === 2, 'Should have 2 methods');
  assert(methods.includes('build'), 'Should include build');
  assert(methods.includes('_increment'), 'Should include _increment');
});

test('Add method → state mapping', () => {
  const graph = new DependencyGraph();
  graph.addMethodStateUse('_increment', '_count');
  
  const states = graph.getStateForMethod('_increment');
  assert(states.length === 1, 'Should have 1 state');
  assert(states.includes('_count'), 'Should include _count');
});

test('Add event → state mapping', () => {
  const graph = new DependencyGraph();
  graph.addEventStateUse('onPressed', '_count');
  
  const states = graph.getStateForEvent('onPressed');
  assert(states.length === 1, 'Should have 1 state');
  assert(states.includes('_count'), 'Should include _count');
});

test('Get DependencyGraph summary', () => {
  const graph = new DependencyGraph();
  graph.addStateUse('_count', 'build');
  graph.addStateUse('_count', '_increment');
  graph.addMethodStateUse('_increment', '_count');
  graph.addEventStateUse('onPressed', '_count');
  
  const summary = graph.summary();
  assert(Object.keys(summary.stateToMethods).length > 0, 'Summary should include mappings');
});

console.log('');

// ============================================================================
// TEST SUITE 7: ValidationResult
// ============================================================================

console.log('TEST SUITE 7: ValidationResult\n');

test('Create ValidationResult', () => {
  const result = new ValidationResult(
    'unused-state',
    'Field _unused is never used',
    'warning'
  );
  
  assert(result.type === 'unused-state', 'Type should be unused-state');
  assert(result.severity === 'warning', 'Severity should be warning');
});

test('Add suggestion to ValidationResult', () => {
  const result = new ValidationResult(
    'unused-state',
    'Field _unused is never used',
    'warning'
  );
  
  result.withSuggestion('Remove the unused field or implement its usage');
  assert(result.suggestion !== null, 'Should have suggestion');
});

test('Set affected item on ValidationResult', () => {
  const result = new ValidationResult(
    'unused-state',
    'Field _unused is never used',
    'warning'
  );
  
  result.affecting('_unused');
  assert(result.affectedItem === '_unused', 'Should set affected item');
});

test('Convert ValidationResult to object', () => {
  const result = new ValidationResult(
    'unused-state',
    'Field _unused is never used',
    'warning'
  );
  result.withSuggestion('Remove or use the field');
  
  const obj = result.toObject();
  assert(obj.type === 'unused-state', 'Object should include type');
  assert(obj.message !== undefined, 'Object should include message');
  assert(obj.suggestion !== undefined, 'Object should include suggestion');
});

console.log('');

// ============================================================================
// TEST SUITE 8: AnalysisSummary
// ============================================================================

console.log('TEST SUITE 8: AnalysisSummary\n');

test('Create AnalysisSummary', () => {
  const summary = new AnalysisSummary();
  assert(summary.stateClassCount === 0, 'Should start with 0 state classes');
  assert(summary.errorCount === 0, 'Should start with 0 errors');
});

test('Calculate complexity score', () => {
  const summary = new AnalysisSummary();
  summary.stateFieldCount = 3;
  summary.setStateCallCount = 5;
  summary.eventHandlerCount = 2;
  
  const score = summary.calculateComplexity();
  assert(score > 0, 'Complexity should be calculated');
  assert(score <= 100, 'Score should not exceed 100');
});

test('Calculate health score', () => {
  const summary = new AnalysisSummary();
  summary.stateFieldCount = 2;
  summary.setStateCallCount = 2;
  summary.errorCount = 0;
  summary.warningCount = 0;
  
  summary.calculateComplexity();
  const health = summary.calculateHealth();
  
  assert(health > 0, 'Health should be positive');
  assert(health <= 100, 'Health should not exceed 100');
});

test('Calculate health score with errors', () => {
  const summary = new AnalysisSummary();
  summary.errorCount = 2;
  summary.warningCount = 1;
  
  const health = summary.calculateHealth();
  assert(health < 100, 'Health should be reduced with errors');
});

test('Get AnalysisSummary object', () => {
  const summary = new AnalysisSummary();
  summary.stateClassCount = 1;
  summary.stateFieldCount = 2;
  summary.setStateCallCount = 3;
  
  const obj = summary.toObject();
  assert(obj.stateClasses === 1, 'Should include state class count');
  assert(obj.stateFields === 2, 'Should include state field count');
  assert(obj.setStateCalls === 3, 'Should include setState call count');
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