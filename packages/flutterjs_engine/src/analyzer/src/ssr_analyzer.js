/**
 * FlutterJS SSR Analyzer - Phase 3
 * Analyzes Server-Side Rendering (SSR) compatibility
 * Detects SSR-safe and unsafe patterns
 * Generates migration path for SSR compliance
 * 
 * Phase 3 focuses on: SSR detection, hydration requirements, migration advice
 * Does NOT implement SSR rendering (that's Phase 4+)
 */

import {
  HydrationRequirement,
  LazyLoadOpportunity,
} from './context_analyzer_data.js';

class SSRAnalyzer {
  constructor(contextAnalysisResults, stateAnalysisResults = null, options = {}) {
    // Input from Phase 2 & 3
    this.contextResults = contextAnalysisResults;      // From ContextAnalyzer
    this.stateResults = stateAnalysisResults;          // From StateAnalyzer (Phase 2)

    this.options = {
      strict: false,
      targetPlatform: 'node',  // 'node', 'deno', 'cloudflare'
      ...options,
    };

    // Results storage
    this.ssrSafePatterns = [];                   // Patterns that work in SSR
    this.ssrUnsafePatterns = [];                 // Patterns that don't work in SSR
    this.hydrationRequirements = [];             // What needs hydration
    this.lazyLoadOpportunities = [];             // Code split candidates
    this.ssrMigrationPath = [];                  // Steps to make SSR-compatible
    this.validationIssues = [];                  // SSR-specific issues

    // Metrics
    this.ssrCompatibilityScore = 0;              // 0-100, higher is better
    this.hydrationCount = 0;
    this.errors = [];
  }

  /**
   * Main entry point - analyze SSR compatibility
   */
  analyze() {
    console.log('[SSRAnalyzer] Starting SSR compatibility analysis...\n');

    try {
      // Phase 1: Detect SSR-safe patterns
      this.detectSsrSafePatterns();
      console.log(`[SSRAnalyzer] Found ${this.ssrSafePatterns.length} SSR-safe patterns\n`);

      // Phase 2: Detect SSR-unsafe patterns
      this.detectSsrUnsafePatterns();
      console.log(`[SSRAnalyzer] Found ${this.ssrUnsafePatterns.length} SSR-unsafe patterns\n`);

      // Phase 3: Identify hydration needs
      this.identifyHydrationNeeds();
      console.log(`[SSRAnalyzer] Identified ${this.hydrationRequirements.length} hydration dependencies\n`);

      // Phase 4: Detect lazy load opportunities
      this.detectLazyLoadOpportunities();
      console.log(`[SSRAnalyzer] Found ${this.lazyLoadOpportunities.length} lazy load opportunities\n`);

      // Phase 5: Generate migration path
      this.generateMigrationPath();
      console.log(`[SSRAnalyzer] Generated ${this.ssrMigrationPath.length} migration steps\n`);

      // Phase 6: Validate and score
      this.validateSsrRequirements();
      this.calculateCompatibilityScore();
      console.log(`[SSRAnalyzer] SSR Compatibility Score: ${this.ssrCompatibilityScore}/100\n`);

      return this.getResults();
    } catch (error) {
      this.errors.push(error);
      console.error('[SSRAnalyzer] Error:', error.message);
      return this.getResults();
    }
  }

  /**
   * Phase 1: Detect SSR-safe patterns
   * 
   * Safe for SSR:
   * - Reading static values
   * - InheritedWidget.of() lookups
   * - context.read() single reads
   * - Theme access
   * - One-time data fetches
   */
  detectSsrSafePatterns() {
    const patterns = [];

    // Pattern 1: InheritedWidget static accessors
    patterns.push({
      pattern: 'InheritedWidget static accessors',
      example: 'ThemeProvider.of(context)',
      safeFor: 'SSR',
      why: 'Pure value access, no subscription required',
      confidence: 1.0,
      category: 'context-access',
      frequency: 0,
    });

    // Pattern 2: context.read<T>() in build()
    patterns.push({
      pattern: 'context.read<T>() in build()',
      example: 'context.read<CounterNotifier>()',
      safeFor: 'SSR',
      why: 'Single read at render time, no re-subscription needed',
      confidence: 0.95,
      category: 'provider-access',
      frequency: 0,
    });

    // Pattern 3: Static property access
    patterns.push({
      pattern: 'Theme data access',
      example: 'theme.primaryColor',
      safeFor: 'SSR',
      why: 'Read-only during rendering',
      confidence: 1.0,
      category: 'value-access',
      frequency: 0,
    });

    // Pattern 4: MediaQuery for initial layout
    patterns.push({
      pattern: 'MediaQuery.of() for responsive layout',
      example: 'MediaQuery.of(context).size.width',
      safeFor: 'SSR',
      why: 'Server can set default viewport; client hydrates with actual size',
      confidence: 0.85,
      category: 'responsive-design',
      frequency: 0,
    });

    // Pattern 5: One-time async operations
    patterns.push({
      pattern: 'Async data in FutureBuilder (with cached data)',
      example: 'FutureBuilder with pre-fetched data',
      safeFor: 'SSR',
      why: 'Server can execute async, pass pre-rendered HTML to client',
      confidence: 0.80,
      category: 'async-operation',
      frequency: 0,
    });

    // Scan context results for actual safe patterns
    if (this.contextResults && this.contextResults.contextAccessPoints) {
      this.contextResults.contextAccessPoints.forEach((usage) => {
        if (usage.ssrSafe) {
          // Find matching pattern and increment frequency
          const pattern = patterns.find((p) => p.example.includes(usage.pattern.split('(')[0]));
          if (pattern) {
            pattern.frequency++;
          }

          // Add to safe patterns list
          this.ssrSafePatterns.push({
            pattern: usage.pattern,
            type: usage.type,
            location: usage.location,
            example: usage.pattern,
            why: usage.reason,
            confidence: 0.95,
          });
        }
      });
    }

    // Add framework patterns
    this.ssrSafePatterns.push(...patterns);
  }

  /**
   * Phase 2: Detect SSR-unsafe patterns
   * 
   * Unsafe for SSR:
   * - context.watch() subscriptions
   * - State mutations in event handlers
   * - notifyListeners() calls
   * - Browser-specific APIs (localStorage, window)
   * - Timer/interval operations
   * - User interaction handlers
   */
  detectSsrUnsafePatterns() {
    const basePatterns = [
      {
        pattern: 'context.watch<T>() subscriptions',
        example: 'context.watch<CounterNotifier>()',
        unsafeFor: 'SSR',
        why: 'Requires reactive subscription & listeners on client, not available during server render',
        confidence: 1.0,
        category: 'provider-subscription',
        severity: 'error',
        frequency: 0,
      },
      {
        pattern: 'State mutations in event handlers',
        example: 'counter.increment() in onPressed',
        unsafeFor: 'SSR',
        why: 'Event handlers don\'t exist on server, mutations have no effect',
        confidence: 1.0,
        category: 'state-mutation',
        severity: 'error',
        frequency: 0,
      },
      {
        pattern: 'ChangeNotifier.notifyListeners() calls',
        example: 'notifyListeners() in method',
        unsafeFor: 'SSR',
        why: 'Listeners don\'t exist during initial SSR render',
        confidence: 0.95,
        category: 'notification',
        severity: 'error',
        frequency: 0,
      },
      {
        pattern: 'Browser APIs',
        example: 'window.localStorage, document.getElementById()',
        unsafeFor: 'SSR',
        why: 'window and document objects don\'t exist on Node.js server',
        confidence: 1.0,
        category: 'browser-api',
        severity: 'critical',
        frequency: 0,
      },
      {
        pattern: 'Timers and intervals',
        example: 'setTimeout, setInterval, setImmediate',
        unsafeFor: 'SSR',
        why: 'Can cause unexpected behavior and performance issues during server render',
        confidence: 0.90,
        category: 'async-operation',
        severity: 'warning',
        frequency: 0,
      },
      {
        pattern: 'Random values without seeding',
        example: 'Math.random()',
        unsafeFor: 'SSR',
        why: 'Different values on server vs client cause hydration mismatch',
        confidence: 0.99,
        category: 'determinism',
        severity: 'error',
        frequency: 0,
      },
      {
        pattern: 'Navigator and route access',
        example: 'Navigator.of(context).push()',
        unsafeFor: 'SSR',
        why: 'Navigation happens on client, not on server',
        confidence: 1.0,
        category: 'navigation',
        severity: 'warning',
        frequency: 0,
      },
      {
        pattern: 'GestureDetector and event handlers',
        example: 'GestureDetector, onTap, onLongPress',
        unsafeFor: 'SSR',
        why: 'User interactions don\'t exist on server',
        confidence: 1.0,
        category: 'user-interaction',
        severity: 'warning',
        frequency: 0,
      },
      {
        pattern: 'setState in initState or build',
        example: 'this.setState(() => {...}) in build()',
        unsafeFor: 'SSR',
        why: 'Triggers re-render during render cycle, can cause infinite loops',
        confidence: 0.95,
        category: 'state-management',
        severity: 'critical',
        frequency: 0,
      },
    ];

    // Scan context results for actual unsafe patterns
    if (this.contextResults && this.contextResults.contextAccessPoints) {
      this.contextResults.contextAccessPoints.forEach((usage) => {
        if (!usage.ssrSafe) {
          const pattern = basePatterns.find((p) => p.example.includes(usage.pattern.split('(')[0]));
          if (pattern) {
            pattern.frequency++;
          }

          this.ssrUnsafePatterns.push({
            pattern: usage.pattern,
            type: usage.type,
            location: usage.location,
            example: usage.pattern,
            why: usage.reason,
            confidence: 0.95,
            severity: 'error',
            suggestion: usage.getMigrationAdvice?.() || 'Refactor to SSR-safe pattern',
          });
        }
      });
    }

    // Add base patterns with frequencies
    this.ssrUnsafePatterns.push(...basePatterns);
  }

  /**
   * Phase 3: Identify hydration needs
   * 
   * After server renders HTML, client must:
   * 1. Re-create state objects
   * 2. Re-attach event listeners
   * 3. Re-subscribe to change notifications
   * 4. Verify hydration matches server output
   */
  identifyHydrationNeeds() {
    const hydrationNeeds = [];

    // Need 1: ChangeNotifier instances need recreation and listener re-attachment
    if (this.contextResults && this.contextResults.changeNotifiers) {
      this.contextResults.changeNotifiers.forEach((notifier) => {
        if (notifier.consumers && notifier.consumers.length > 0) {
          const requirement = new HydrationRequirement(
            notifier.name,
            `State needs to be re-created and listeners re-attached post-hydration for ${notifier.consumers.length} consumer(s)`,
            0
          );

          // Add consumer info
          notifier.consumers.forEach((consumer) => {
            requirement.requiredState.push(`${consumer}.state`);
          });

          hydrationNeeds.push(requirement);
          this.hydrationCount++;
        }
      });
    }

    // Need 2: Provider subscriptions need re-attachment
    if (this.contextResults && this.contextResults.providers) {
      this.contextResults.providers.forEach((provider) => {
        if (provider.accessPatterns && provider.accessPatterns.includes('watch')) {
          const requirement = new HydrationRequirement(
            `Provider<${provider.valueType}>`,
            `context.watch() subscriptions need to be re-established on client for reactive updates`,
            1
          );

          requirement.requiresProvider(provider.providerType);
          hydrationNeeds.push(requirement);
          this.hydrationCount++;
        }
      });
    }

    // Need 3: Event handlers need attachment
    if (this.stateResults && this.stateResults.eventHandlers) {
      this.stateResults.eventHandlers.forEach((handler) => {
        // Only if not already handled above
        if (!hydrationNeeds.some((h) => h.dependency === handler.handler)) {
          const requirement = new HydrationRequirement(
            handler.handler,
            `Event handler "${handler.handler}" must be attached to DOM after hydration`,
            2
          );
          hydrationNeeds.push(requirement);
          this.hydrationCount++;
        }
      });
    }

    // Sort by order
    hydrationNeeds.sort((a, b) => a.order - b.order);
    this.hydrationRequirements = hydrationNeeds;
  }

  /**
   * Phase 4: Detect lazy load opportunities
   * 
   * Identify widgets/services that:
   * - Are not needed immediately
   * - Are used conditionally
   * - Are large
   * - Can be split into separate chunks
   */
  detectLazyLoadOpportunities() {
    const opportunities = [];

    // Opportunity 1: Pages not rendered initially
    if (this.contextResults && this.contextResults.inheritedWidgets) {
      this.contextResults.inheritedWidgets.forEach((widget) => {
        if (widget.usageCount === 0 || (widget.usageCount && widget.usageCount <= 1)) {
          const opp = new LazyLoadOpportunity(
            widget.name,
            `${widget.name} is not needed until user navigates to it`,
            '15KB',
            'widget'
          );
          opp.setRecommendation('Use LazyRoute or dynamic import: import(widgetPath)');
          opp.calculatePriority(15);
          opportunities.push(opp);
        }
      });
    }

    // Opportunity 2: Heavy ChangeNotifiers used conditionally
    if (this.contextResults && this.contextResults.changeNotifiers) {
      this.contextResults.changeNotifiers.forEach((notifier) => {
        if (notifier.methods && notifier.methods.length > 10) {
          const opp = new LazyLoadOpportunity(
            notifier.name,
            `${notifier.name} is complex and only needed if feature is used`,
            '8KB',
            'notifier'
          );
          opp.setRecommendation('Lazy create in Provider: create: (context) => Provider.lazy(() => import(...))');
          opp.calculatePriority(8);
          opportunities.push(opp);
        }
      });
    }

    // Opportunity 3: Large library imports
    const largeLibraries = ['charts', 'maps', 'firebase', 'analytics'];
    // In real implementation, scan actual imports

    this.lazyLoadOpportunities = opportunities;
  }

  /**
   * Phase 5: Generate migration path
   * 
   * Step-by-step guide to make app SSR-compatible
   */
  generateMigrationPath() {
    const steps = [];

    // Step 1: Replace context.watch() with context.read() + didChangeDependencies
    const watchUnsafe = this.ssrUnsafePatterns.filter((p) => p.pattern?.includes('watch'));
    if (watchUnsafe.length > 0) {
      steps.push({
        step: 1,
        action: 'Replace context.watch() with context.read() for SSR',
        locations: watchUnsafe.map((p) => p.location),
        description: `Found ${watchUnsafe.length} context.watch() calls that need refactoring`,
        example: `
// Before (not SSR safe):
final counter = context.watch<CounterNotifier>();

// After (SSR safe):
final counter = context.read<CounterNotifier>();
// Subscribe to changes in didChangeDependencies() instead (client-only)`,
        effort: 'medium',
        priority: 'high',
        files: watchUnsafe.length,
      });
    }

    // Step 2: Move state mutations to client-only code
    const mutationUnsafe = this.ssrUnsafePatterns.filter((p) => p.pattern?.includes('mutation'));
    if (mutationUnsafe.length > 0) {
      steps.push({
        step: 2,
        action: 'Move notifyListeners() calls to client-only code',
        locations: mutationUnsafe.map((p) => p.location),
        description: `Found ${mutationUnsafe.length} state mutations that don't work in SSR`,
        example: `
// Before (not SSR safe):
counter.increment();

// After (SSR safe):
if (kIsWeb) {  // Only on client
  counter.increment();
}`,
        effort: 'low',
        priority: 'high',
        files: mutationUnsafe.length,
      });
    }

    // Step 3: Implement hydration layer
    if (this.hydrationRequirements.length > 0) {
      steps.push({
        step: 3,
        action: 'Create hydration layer to re-subscribe listeners post-render',
        description: `App requires hydration for ${this.hydrationRequirements.length} dependencies`,
        example: `
// In main.js or app.dart after runApp():
if (kIsWeb) {
  // Re-create listeners, reattach subscriptions
  hydrate(flutterApp);
}`,
        effort: 'high',
        priority: 'critical',
        dependencies: this.hydrationRequirements.length,
      });
    }

    // Step 4: Add browser API checks
    const browserApiUnsafe = this.ssrUnsafePatterns.filter((p) => p.category === 'browser-api');
    if (browserApiUnsafe.length > 0) {
      steps.push({
        step: 4,
        action: 'Wrap browser-specific APIs in kIsWeb checks',
        description: `Found ${browserApiUnsafe.length} browser API calls`,
        example: `
// Before:
final stored = window.localStorage.getItem('key');

// After:
final stored = kIsWeb ? window.localStorage.getItem('key') : null;`,
        effort: 'low',
        priority: 'medium',
        files: browserApiUnsafe.length,
      });
    }

    // Step 5: Implement lazy loading
    if (this.lazyLoadOpportunities.length > 0) {
      steps.push({
        step: 5,
        action: 'Implement code splitting for lazy-loaded widgets',
        description: `${this.lazyLoadOpportunities.length} opportunities identified`,
        example: `
// Use dynamic routes
final route = await LazyRoute.create(
  () => import('pages/DetailPage.dart')
);`,
        effort: 'medium',
        priority: 'low',
        opportunities: this.lazyLoadOpportunities.length,
      });
    }

    // Step 6: Test SSR rendering
    steps.push({
      step: steps.length + 1,
      action: 'Set up SSR testing pipeline',
      description: 'Render app on server, verify HTML structure',
      example: `
// Test SSR output matches CSR:
const serverHtml = await renderAppOnServer();
const clientHtml = await renderAppOnClient();
assert(serverHtml === clientHtml, 'SSR/CSR mismatch');`,
      effort: 'medium',
      priority: 'critical',
    });

    this.ssrMigrationPath = steps;
  }

  /**
   * Phase 6: Validate SSR requirements
   */
  validateSsrRequirements() {
    // Check 1: Browser APIs
    this.ssrUnsafePatterns.forEach((pattern) => {
      if (pattern.category === 'browser-api') {
        this.validationIssues.push({
          type: 'browser-api-usage',
          severity: 'critical',
          pattern: pattern.pattern,
          location: pattern.location,
          message: `Browser API "${pattern.pattern}" is not available on server`,
          suggestion: 'Wrap in kIsWeb check or use platform-agnostic alternative',
        });
      }
    });

    // Check 2: Non-deterministic operations
    this.ssrUnsafePatterns.forEach((pattern) => {
      if (pattern.category === 'determinism') {
        this.validationIssues.push({
          type: 'non-deterministic',
          severity: 'error',
          pattern: pattern.pattern,
          location: pattern.location,
          message: `Non-deterministic operation "${pattern.pattern}" causes hydration mismatch`,
          suggestion: 'Use seeded random or remove randomness from render path',
        });
      }
    });

    // Check 3: Event handlers in build
    const eventHandlersInBuild = this.ssrUnsafePatterns.filter(
      (p) => p.category === 'user-interaction'
    );
    if (eventHandlersInBuild.length > 0) {
      this.validationIssues.push({
        type: 'event-handlers-in-build',
        severity: 'warning',
        count: eventHandlersInBuild.length,
        message: `${eventHandlersInBuild.length} event handlers defined in build() - they'll be recreated on every render`,
        suggestion: 'Move event handler definitions to initState or class level',
      });
    }

    // Check 4: Hydration completeness
    if (this.hydrationRequirements.length > 0 && this.ssrMigrationPath.length === 0) {
      this.validationIssues.push({
        type: 'incomplete-hydration',
        severity: 'error',
        message: `App has ${this.hydrationRequirements.length} hydration needs but no hydration layer implemented`,
        suggestion: 'Add hydration step to migration path',
      });
    }
  }

  /**
   * Calculate SSR compatibility score (0-100)
   * 
   * 100 = Full SSR support
   * 75-99 = Partial with minor fixes
   * 50-74 = Partial with major refactoring
   * 0-49 = Not suitable for SSR without major rewrite
   */
  calculateCompatibilityScore() {
    let score = 100;

    // Deduct for unsafe patterns
    const unsafeCount = this.ssrUnsafePatterns.length;
    score -= Math.min(unsafeCount * 5, 40);  // Max deduction 40 points

    // Deduct for critical issues
    const criticalIssues = this.validationIssues.filter((i) => i.severity === 'critical');
    score -= criticalIssues.length * 15;

    // Deduct for browser APIs
    const browserApiIssues = this.validationIssues.filter((i) => i.type === 'browser-api-usage');
    score -= browserApiIssues.length * 10;

    // Add bonus for SSR-safe patterns
    const safeCount = this.ssrSafePatterns.length;
    if (safeCount > 0) {
      score += Math.min(safeCount * 2, 15);  // Max bonus 15 points
    }

    // Add bonus for successful hydration setup
    if (this.ssrMigrationPath.length > 3) {
      score += 10;
    }

    // Ensure score is in valid range
    this.ssrCompatibilityScore = Math.max(0, Math.min(100, score));
  }

  /**
   * Determine overall SSR compatibility
   */
  getOverallCompatibility() {
    if (this.ssrCompatibilityScore >= 85) {
      return 'full';
    } else if (this.ssrCompatibilityScore >= 60) {
      return 'partial';
    } else if (this.ssrCompatibilityScore >= 30) {
      return 'limited';
    } else {
      return 'none';
    }
  }

  /**
   * Get estimated migration effort
   */
  getEstimatedEffort() {
    const totalEffort = this.ssrMigrationPath.reduce((sum, step) => {
      const effortMap = { low: 1, medium: 2, high: 3 };
      return sum + (effortMap[step.effort] || 0);
    }, 0);

    if (totalEffort <= 3) {
      return 'minimal';
    } else if (totalEffort <= 6) {
      return 'moderate';
    } else if (totalEffort <= 9) {
      return 'significant';
    } else {
      return 'major-rewrite';
    }
  }

  /**
   * Get results
   */
  getResults() {
    return {
      overallCompatibility: this.getOverallCompatibility(),
      ssrCompatibilityScore: this.ssrCompatibilityScore,
      ssrReadinessScore: this.ssrCompatibilityScore,  // Alias

      // Patterns
      ssrSafePatterns: this.ssrSafePatterns,
      ssrUnsafePatterns: this.ssrUnsafePatterns,

      // Hydration & Optimization
      hydrationRequirements: this.hydrationRequirements,
      hydrationCount: this.hydrationCount,
      lazyLoadOpportunities: this.lazyLoadOpportunities,

      // Migration Path
      ssrMigrationPath: this.ssrMigrationPath,
      estimatedEffort: this.getEstimatedEffort(),

      // Validation & Issues
      validationIssues: this.validationIssues,
      criticalIssues: this.validationIssues.filter((i) => i.severity === 'critical'),
      warningIssues: this.validationIssues.filter((i) => i.severity === 'warning'),

      // Summary
      summary: {
        compatibility: this.getOverallCompatibility(),
        score: this.ssrCompatibilityScore,
        safePatterns: this.ssrSafePatterns.length,
        unsafePatterns: this.ssrUnsafePatterns.length,
        hydrationNeeded: this.hydrationCount,
        migrationSteps: this.ssrMigrationPath.length,
        criticalIssues: criticalIssues.length,
        effort: this.getEstimatedEffort(),
      },

      errors: this.errors,
    };
  }
}

export { SSRAnalyzer };
