/**
 * FlutterJS SSR Analyzer & Context Data Classes Tests - Phase 3
 * Tests for SSR compatibility analysis and context data structures
 */

import {
  InheritedWidgetMetadata,
  ChangeNotifierAnalysis,
  ProviderAnalysis,
  ContextDependency,
  ContextUsagePattern,
  HydrationRequirement,
  LazyLoadOpportunity,
  ContextRequirementsSummary,
} from '../src/ats/context_analyzer_data.js';
import { SSRAnalyzer } from '../src/ats/ssr_analyzer.js';

console.log('\n' + '='.repeat(80));
console.log('🧪 SSR ANALYZER & CONTEXT DATA TESTS (Phase 3)');
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
// TEST SUITE 1: InheritedWidgetMetadata
// ============================================================================

console.log('TEST SUITE 1: InheritedWidgetMetadata\n');

test('Create InheritedWidgetMetadata', () => {
  const metadata = new InheritedWidgetMetadata('ThemeProvider', { line: 1, column: 0 });

  assert(metadata.name === 'ThemeProvider', 'Should have correct name');
  assert(metadata.properties.length === 0, 'Should start with no properties');
  assert(metadata.staticAccessors.length === 0, 'Should start with no accessors');
});

test('Add properties', () => {
  const metadata = new InheritedWidgetMetadata('ThemeProvider', { line: 1, column: 0 });
  metadata.addProperty('theme', 'ThemeData', true);
  metadata.addProperty('child', 'Widget', true);

  assert(metadata.properties.length === 2, 'Should have 2 properties');
  assert(metadata.hasChildProperty === true, 'Should detect child property');
});

test('Add static accessors', () => {
  const metadata = new InheritedWidgetMetadata('ThemeProvider', { line: 1, column: 0 });
  metadata.addStaticAccessor('of', 'static ThemeData of(BuildContext)', { line: 10, column: 2 });

  assert(metadata.staticAccessors.length === 1, 'Should have 1 accessor');
  assert(metadata.staticAccessors[0].name === 'of', 'Should have correct name');
});

test('Record usage', () => {
  const metadata = new InheritedWidgetMetadata('ThemeProvider', { line: 1, column: 0 });
  metadata.recordUsage('HomePage');
  metadata.recordUsage('DetailsPage');

  assert(metadata.usageCount === 2, 'Should track usage count');
  assert(metadata.usedIn.includes('HomePage'), 'Should track which widgets use it');
});

test('Validate InheritedWidget', () => {
  const metadata = new InheritedWidgetMetadata('ThemeProvider', { line: 1, column: 0 });
  metadata.addProperty('theme', 'ThemeData', true);
  metadata.addProperty('child', 'Widget', true);
  metadata.addStaticAccessor('of', 'static ThemeData of(BuildContext)', { line: 10, column: 2 });
  metadata.updateShouldNotifyImplemented = true;

  const issues = metadata.validate();
  assert(issues.length === 0, 'Valid implementation should have no issues');
});

test('Get metadata summary', () => {
  const metadata = new InheritedWidgetMetadata('ThemeProvider', { line: 1, column: 0 });
  metadata.addProperty('theme', 'ThemeData', true);
  metadata.recordUsage('HomePage');

  const summary = metadata.summary();
  assert(summary.name === 'ThemeProvider', 'Summary should include name');
  assert(summary.properties === 1, 'Summary should show property count');
  assert(summary.usageCount === 1, 'Summary should show usage');
});

console.log('');

// ============================================================================
// TEST SUITE 2: ChangeNotifierAnalysis
// ============================================================================

console.log('TEST SUITE 2: ChangeNotifierAnalysis\n');

test('Create ChangeNotifierAnalysis', () => {
  const analysis = new ChangeNotifierAnalysis('CounterNotifier', { line: 20, column: 0 });

  assert(analysis.name === 'CounterNotifier', 'Should have correct name');
  assert(analysis.type === 'ChangeNotifier', 'Should have correct type');
  assert(analysis.properties.length === 0, 'Should start with no properties');
});

test('Add properties and getters', () => {
  const analysis = new ChangeNotifierAnalysis('CounterNotifier', { line: 20, column: 0 });
  analysis.addProperty('_count', 'number', 0);
  analysis.addGetter('count', 'number', { line: 25, column: 2 });

  assert(analysis.properties.length === 1, 'Should have 1 property');
  assert(analysis.getters.length === 1, 'Should have 1 getter');
});

test('Add methods', () => {
  const analysis = new ChangeNotifierAnalysis('CounterNotifier', { line: 20, column: 0 });
  analysis.addMethod('increment', { line: 30, column: 2 }, true, ['_count']);

  assert(analysis.methods.length === 1, 'Should have 1 method');
  assert(analysis.methods[0].callsNotifyListeners === true, 'Should track notifyListeners');
  assert(analysis.methods[0].mutatesFields.includes('_count'), 'Should track mutations');
});

test('Record consumers', () => {
  const analysis = new ChangeNotifierAnalysis('CounterNotifier', { line: 20, column: 0 });
  analysis.recordConsumer('HomePage', 'watch');
  analysis.recordConsumer('DetailsPage', 'read');

  assert(analysis.consumers.length === 2, 'Should track consumers');
  assert(analysis.consumers.includes('HomePage'), 'Should include consumer');
});

test('Validate ChangeNotifier', () => {
  const analysis = new ChangeNotifierAnalysis('CounterNotifier', { line: 20, column: 0 });
  analysis.addProperty('_count', 'number', 0);
  analysis.addMethod('increment', { line: 30, column: 2 }, true, ['_count']);

  const issues = analysis.validate();
  // Valid implementation should have minimal issues
  assert(Array.isArray(issues), 'Should return issues array');
});

test('Get analysis summary', () => {
  const analysis = new ChangeNotifierAnalysis('CounterNotifier', { line: 20, column: 0 });
  analysis.addProperty('_count', 'number', 0);
  analysis.recordConsumer('HomePage');

  const summary = analysis.summary();
  assert(summary.name === 'CounterNotifier', 'Summary should include name');
  assert(summary.properties === 1, 'Summary should show properties');
  assert(summary.consumers === 1, 'Summary should show consumers');
});

console.log('');

// ============================================================================
// TEST SUITE 3: ProviderAnalysis
// ============================================================================

console.log('TEST SUITE 3: ProviderAnalysis\n');

test('Create ProviderAnalysis', () => {
  const analysis = new ProviderAnalysis('Provider<CounterNotifier>', { line: 40, column: 2 }, 'CounterNotifier');

  assert(analysis.providerType === 'Provider<CounterNotifier>', 'Should have correct type');
  assert(analysis.valueType === 'CounterNotifier', 'Should have value type');
});

test('Set create function', () => {
  const analysis = new ProviderAnalysis('Provider<CounterNotifier>', { line: 40, column: 2 }, 'CounterNotifier');
  analysis.setCreateFunction('(context) => CounterNotifier()');

  assert(analysis.createFunction !== null, 'Should set create function');
});

test('Add consumers', () => {
  const analysis = new ProviderAnalysis('Provider<CounterNotifier>', { line: 40, column: 2 }, 'CounterNotifier');
  analysis.addConsumer('HomePage');
  analysis.addConsumer('DetailsPage');

  assert(analysis.consumers.length === 2, 'Should track consumers');
});

test('Add access patterns', () => {
  const analysis = new ProviderAnalysis('Provider<CounterNotifier>', { line: 40, column: 2 }, 'CounterNotifier');
  analysis.addAccessPattern('watch');
  analysis.addAccessPattern('read');

  assert(analysis.accessPatterns.length === 2, 'Should track patterns');
  assert(analysis.accessPatterns.includes('watch'), 'Should include watch');
});

test('Validate Provider', () => {
  const analysis = new ProviderAnalysis('Provider<CounterNotifier>', { line: 40, column: 2 }, 'CounterNotifier');
  analysis.setCreateFunction('(context) => CounterNotifier()');
  analysis.addConsumer('HomePage');

  const issues = analysis.validate();
  assert(Array.isArray(issues), 'Should return issues');
});

test('Get provider summary', () => {
  const analysis = new ProviderAnalysis('Provider<CounterNotifier>', { line: 40, column: 2 }, 'CounterNotifier');
  analysis.addConsumer('HomePage');
  analysis.addAccessPattern('watch');

  const summary = analysis.summary();
  assert(summary.type === 'Provider<CounterNotifier>', 'Summary should include type');
  assert(summary.consumers === 1, 'Summary should show consumers');
});

console.log('');

// ============================================================================
// TEST SUITE 4: ContextUsagePattern
// ============================================================================

console.log('TEST SUITE 4: ContextUsagePattern\n');

test('Create ContextUsagePattern - SSR safe', () => {
  const pattern = new ContextUsagePattern(
    'Theme.of(context)',
    'inherited-widget-lookup',
    { line: 50, column: 4 },
    'ThemeData',
    true,
    'Pure value access, no subscription'
  );

  assert(pattern.pattern === 'Theme.of(context)', 'Should have pattern');
  assert(pattern.ssrSafe === true, 'Should mark as SSR safe');
  assert(pattern.reason !== '', 'Should have reason');
});

test('Create ContextUsagePattern - SSR unsafe', () => {
  const pattern = new ContextUsagePattern(
    'context.watch<CounterNotifier>()',
    'provider-watch',
    { line: 60, column: 4 },
    'CounterNotifier',
    false,
    'Requires reactive subscription'
  );

  assert(pattern.pattern === 'context.watch<CounterNotifier>()', 'Should have pattern');
  assert(pattern.ssrSafe === false, 'Should mark as SSR unsafe');
});

test('Explain SSR safety', () => {
  const safePattern = new ContextUsagePattern('Theme.of(context)', 'inherited-widget-lookup', {}, 'ThemeData', true, 'Safe reason');
  const unsafePattern = new ContextUsagePattern('context.watch()', 'provider-watch', {}, 'T', false, 'Unsafe reason');

  const safeExplain = safePattern.explain();
  const unsafeExplain = unsafePattern.explain();

  assert(safeExplain.includes('✓'), 'Safe should show checkmark');
  assert(unsafeExplain.includes('✗'), 'Unsafe should show X');
});

test('Get migration advice', () => {
  const watchPattern = new ContextUsagePattern('context.watch()', 'provider-watch', {}, 'T', false, 'Unsafe');
  const advice = watchPattern.getMigrationAdvice();

  assert(advice !== null, 'Should provide migration advice');
  assert(typeof advice === 'string', 'Advice should be string');
});

console.log('');

// ============================================================================
// TEST SUITE 5: HydrationRequirement
// ============================================================================

console.log('TEST SUITE 5: HydrationRequirement\n');

test('Create HydrationRequirement', () => {
  const req = new HydrationRequirement('CounterNotifier', 'State needs re-creation', 0);

  assert(req.dependency === 'CounterNotifier', 'Should have dependency');
  assert(req.reason !== '', 'Should have reason');
  assert(req.order === 0, 'Should have order');
});

test('Add required providers', () => {
  const req = new HydrationRequirement('CounterNotifier', 'State needs re-creation', 0);
  req.requiresProvider('Provider<CounterNotifier>');

  assert(req.requiredProviders.length === 1, 'Should track providers');
});

test('Add required state', () => {
  const req = new HydrationRequirement('CounterNotifier', 'State needs re-creation', 0);
  req.requiresState('_count');

  assert(req.requiredState.length === 1, 'Should track state');
});

test('Get hydration summary', () => {
  const req = new HydrationRequirement('CounterNotifier', 'State needs re-creation', 0);
  req.requiresProvider('Provider<CounterNotifier>');
  req.requiresState('_count');

  const summary = req.summary();
  assert(summary.dependency === 'CounterNotifier', 'Summary should include dependency');
  assert(summary.order === 0, 'Summary should include order');
});

console.log('');

// ============================================================================
// TEST SUITE 6: LazyLoadOpportunity
// ============================================================================

console.log('TEST SUITE 6: LazyLoadOpportunity\n');

test('Create LazyLoadOpportunity', () => {
  const opp = new LazyLoadOpportunity('HomePage', 'Not needed until navigation', '15KB', 'widget');

  assert(opp.target === 'HomePage', 'Should have target');
  assert(opp.type === 'widget', 'Should have type');
});

test('Set recommendation', () => {
  const opp = new LazyLoadOpportunity('HomePage', 'Not needed', '15KB', 'widget');
  opp.setRecommendation('Use LazyRoute or dynamic import');

  assert(opp.recommendation !== null, 'Should set recommendation');
});

test('Calculate priority from size', () => {
  const opp = new LazyLoadOpportunity('LargeWidget', 'Heavy widget', '80KB', 'widget');
  opp.calculatePriority(80);

  assert(opp.priority === 'high', 'Should set high priority for large widgets');
});

test('Get opportunity summary', () => {
  const opp = new LazyLoadOpportunity('HomePage', 'Not needed', '15KB', 'widget');
  opp.setRecommendation('Use LazyRoute');

  const summary = opp.summary();
  assert(summary.target === 'HomePage', 'Summary should include target');
  assert(summary.recommendation !== null, 'Summary should include recommendation');
});

console.log('');

// ============================================================================
// TEST SUITE 7: ContextRequirementsSummary
// ============================================================================

console.log('TEST SUITE 7: ContextRequirementsSummary\n');

test('Create ContextRequirementsSummary', () => {
  const summary = new ContextRequirementsSummary();

  assert(summary.requiresThemeProvider === false, 'Should start with false');
  assert(summary.customInheritedWidgets.length === 0, 'Should start empty');
});

test('Add custom inherited widget', () => {
  const summary = new ContextRequirementsSummary();
  summary.addCustomInheritedWidget('ThemeProvider');

  assert(summary.customInheritedWidgets.length === 1, 'Should add widget');
});

test('Add required provider', () => {
  const summary = new ContextRequirementsSummary();
  summary.addRequiredProvider('Provider<CounterNotifier>');

  assert(summary.requiredProviders.length === 1, 'Should add provider');
});

test('Add hydration dependency', () => {
  const summary = new ContextRequirementsSummary();
  const req = new HydrationRequirement('CounterNotifier', 'Needs hydration', 0);
  summary.addHydrationDependency(req);

  assert(summary.hydrationRequired === true, 'Should mark hydration required');
  assert(summary.hydrationDependencies.length === 1, 'Should add dependency');
});

test('Calculate SSR compatibility', () => {
  const summary = new ContextRequirementsSummary();
  summary.calculateSsrCompatibility();

  assert(['full', 'partial', 'limited', 'none'].includes(summary.ssrCompatibility), 'Should calculate compatibility');
});

test('Get requirements summary', () => {
  const summary = new ContextRequirementsSummary();
  summary.addCustomInheritedWidget('ThemeProvider');
  summary.requiresThemeProvider = true;

  const sum = summary.summary();
  assert(sum.customInheritedWidgets.length === 1, 'Summary should include widgets');
  assert(sum.requiresThemeProvider === true, 'Summary should show requirements');
});

console.log('');

// ============================================================================
// TEST SUITE 8: SSRAnalyzer Initialization
// ============================================================================

console.log('TEST SUITE 8: SSRAnalyzer Initialization\n');

test('Create SSRAnalyzer', () => {
  const analyzer = new SSRAnalyzer({}, {});

  assert(analyzer.ssrSafePatterns !== undefined, 'Should have safe patterns array');
  assert(analyzer.ssrUnsafePatterns !== undefined, 'Should have unsafe patterns array');
  assert(analyzer.hydrationRequirements !== undefined, 'Should have hydration array');
});

test('Create with options', () => {
  const analyzer = new SSRAnalyzer({}, {}, { strict: true, targetPlatform: 'node' });

  assert(analyzer.options.strict === true, 'Should set options');
  assert(analyzer.options.targetPlatform === 'node', 'Should set platform');
});

console.log('');

// ============================================================================
// TEST SUITE 9: SSR Pattern Detection
// ============================================================================

console.log('TEST SUITE 9: SSR Pattern Detection\n');

test('Detect SSR-safe patterns', () => {
  const analyzer = new SSRAnalyzer({}, {});
  analyzer.detectSsrSafePatterns();

  assert(analyzer.ssrSafePatterns.length > 0, 'Should detect safe patterns');
});

test('Detect SSR-unsafe patterns', () => {
  const analyzer = new SSRAnalyzer({}, {});
  analyzer.detectSsrUnsafePatterns();

  assert(analyzer.ssrUnsafePatterns.length > 0, 'Should detect unsafe patterns');
});

test('Calculate SSR compatibility score', () => {
  const analyzer = new SSRAnalyzer({}, {});
  analyzer.calculateCompatibilityScore();

  assert(analyzer.ssrCompatibilityScore >= 0, 'Score should be >= 0');
  assert(analyzer.ssrCompatibilityScore <= 100, 'Score should be <= 100');
});

test('Determine overall compatibility', () => {
  const analyzer = new SSRAnalyzer({}, {});
  analyzer.ssrCompatibilityScore = 85;

  const compat = analyzer.getOverallCompatibility();
  assert(['full', 'partial', 'limited', 'none'].includes(compat), 'Should return valid compatibility');
});

test('Estimate migration effort', () => {
  const analyzer = new SSRAnalyzer({}, {});
  
  const effort = analyzer.getEstimatedEffort();
  assert(['minimal', 'moderate', 'significant', 'major-rewrite'].includes(effort), 'Should return valid effort');
});

console.log('');

// ============================================================================
// TEST SUITE 10: Full Analysis
// ============================================================================

console.log('TEST SUITE 10: Full Analysis\n');

test('Run full SSR analysis', () => {
  const mockContext = {
    inheritedWidgets: [],
    changeNotifiers: [],
    providers: [],
    contextAccessPoints: [],
  };

  const analyzer = new SSRAnalyzer(mockContext, {});
  const results = analyzer.analyze();

  assert(results.ssrCompatibilityScore !== undefined, 'Should have score');
  assert(results.overallCompatibility !== undefined, 'Should have compatibility');
  assert(Array.isArray(results.ssrMigrationPath), 'Should have migration path');
});

test('Get analysis results', () => {
  const analyzer = new SSRAnalyzer({}, {});
  const results = analyzer.getResults();

  assert(results.overallCompatibility !== undefined, 'Should have compatibility');
  assert(results.ssrCompatibilityScore !== undefined, 'Should have score');
  assert(results.ssrSafePatterns !== undefined, 'Should have safe patterns');
  assert(results.ssrUnsafePatterns !== undefined, 'Should have unsafe patterns');
  assert(results.hydrationRequirements !== undefined, 'Should have hydration');
  assert(results.ssrMigrationPath !== undefined, 'Should have migration path');
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
