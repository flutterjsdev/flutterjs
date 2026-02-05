// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * FlutterJS Context Analyzer - Data Classes
 * Phase 3 Implementation
 * 
 * Represents context-related concepts:
 * - InheritedWidget classes and their properties
 * - ChangeNotifier implementations
 * - Provider patterns
 * - Context usage and dependencies
 * - SSR compatibility information
 */

// ============================================================================
// INHERITED WIDGET METADATA
// ============================================================================

/**
 * Metadata about an InheritedWidget class
 * 
 * Represents:
 * class ThemeProvider extends InheritedWidget {
 *   final ThemeData theme;
 *   final Widget child;
 *   
 *   static ThemeData of(BuildContext context) {
 *     return context.dependOnInheritedWidgetOfExactType<ThemeProvider>()?.theme;
 *   }
 *   
 *   @override
 *   bool updateShouldNotify(ThemeProvider oldWidget) {
 *     return theme != oldWidget.theme;
 *   }
 * }
 */
class InheritedWidgetMetadata {
  constructor(name, location, superClass = 'InheritedWidget') {
    // Identity
    this.name = name;
    this.location = location;
    this.superClass = superClass;

    // Structure
    this.properties = [];            // Required/provided properties
    this.staticAccessors = [];       // of() methods, from() factory methods
    this.methods = [];               // Other methods

    // Implementation details
    this.updateShouldNotifyImplemented = false;
    this.hasChildProperty = false;

    // Usage tracking
    this.usageCount = 0;
    this.usedIn = [];               // Widget names that use this provider
    this.providedByWidgets = [];    // Widget names that instantiate this
  }

  /**
   * Add a property to this inherited widget
   * Example: theme (ThemeData), child (Widget)
   */
  addProperty(name, type, required = false) {
    this.properties.push({
      name,
      type,
      required,
      description: null,
    });

    if (name === 'child') {
      this.hasChildProperty = true;
    }
  }

  /**
   * Add a static accessor method
   * Example: static ThemeData of(BuildContext context)
   */
  addStaticAccessor(name, signature, location, usesInheritedWidgetLookup = true) {
    this.staticAccessors.push({
      name,
      signature,
      usesInheritedWidgetLookup,
      location,
    });
  }

  /**
   * Record that a widget uses this provider
   */
  recordUsage(widgetName) {
    if (!this.usedIn.includes(widgetName)) {
      this.usedIn.push(widgetName);
      this.usageCount++;
    }
  }

  /**
   * Record that a widget provides (instantiates) this provider
   */
  recordProvider(widgetName) {
    if (!this.providedByWidgets.includes(widgetName)) {
      this.providedByWidgets.push(widgetName);
    }
  }

  /**
   * Validate the InheritedWidget pattern
   */
  validate() {
    const issues = [];

    // Should have child property
    if (!this.hasChildProperty) {
      issues.push({
        type: 'missing-child-property',
        severity: 'warning',
        message: `InheritedWidget "${this.name}" should have a 'child' property`,
      });
    }

    // Should have static of() accessor
    if (this.staticAccessors.length === 0) {
      issues.push({
        type: 'missing-static-accessor',
        severity: 'warning',
        message: `InheritedWidget "${this.name}" should have a static of() method`,
      });
    }

    // Should implement updateShouldNotify
    if (!this.updateShouldNotifyImplemented) {
      issues.push({
        type: 'missing-update-notification',
        severity: 'error',
        message: `InheritedWidget "${this.name}" must implement updateShouldNotify()`,
      });
    }

    return issues;
  }

  /**
   * Get summary of this InheritedWidget
   */
  summary() {
    return {
      name: this.name,
      superClass: this.superClass,
      properties: this.properties.length,
      staticAccessors: this.staticAccessors.length,
      usageCount: this.usageCount,
      usedIn: this.usedIn,
      providedBy: this.providedByWidgets,
      isValid: this.updateShouldNotifyImplemented,
    };
  }
}

// ============================================================================
// CHANGE NOTIFIER ANALYSIS
// ============================================================================

/**
 * Analysis of a ChangeNotifier class
 * 
 * Represents:
 * class CounterNotifier extends ChangeNotifier {
 *   int _count = 0;
 *   
 *   int get count => _count;
 *   
 *   void increment() {
 *     _count++;
 *     notifyListeners();
 *   }
 * }
 */
class ChangeNotifierAnalysis {
  constructor(name, location) {
    // Identity
    this.name = name;
    this.location = location;
    this.type = 'ChangeNotifier';

    // Structure
    this.properties = [];            // _count, _isLoading, etc.
    this.getters = [];               // get count => _count
    this.methods = [];               // increment(), decrement(), etc.
    this.setters = [];               // set property(value) => ...

    // Usage tracking
    this.isUsedWithProvider = false; // Is this used with Provider<T>?
    this.providedType = null;        // The Provider<CounterNotifier> type
    this.consumers = [];             // Widgets that consume this notifier
    this.subscriptions = [];         // Where it's subscribed to
  }

  /**
   * Add a property to this notifier
   */
  addProperty(name, type, initialValue = null) {
    this.properties.push({
      name,
      type,
      initialValue,
      mutable: true,
    });
  }

  /**
   * Add a getter method
   * Example: get count => _count
   */
  addGetter(name, returnType, location) {
    this.getters.push({
      name,
      returnType,
      location,
      isComputed: false,
    });
  }

  /**
   * Add a method that mutates state
   */
  addMethod(name, location, callsNotify = false, mutations = []) {
    this.methods.push({
      name,
      location,
      callsNotifyListeners: callsNotify,
      mutatesFields: mutations,
      isAsync: false,
      parameters: [],
    });
  }

  /**
   * Record that a widget consumes this notifier
   */
  recordConsumer(widgetName, accessPattern = 'watch') {
    if (!this.consumers.includes(widgetName)) {
      this.consumers.push(widgetName);
    }

    this.subscriptions.push({
      consumer: widgetName,
      accessPattern,  // 'watch', 'read', 'select'
      timestamp: new Date(),
    });
  }

  /**
   * Check if this notifier is properly implemented
   */
  validate() {
    const issues = [];

    // Should have at least one method that calls notifyListeners
    const hasNotifyCall = this.methods.some((m) => m.callsNotifyListeners);
    if (!hasNotifyCall && this.methods.length > 0) {
      issues.push({
        type: 'missing-notify-listeners',
        severity: 'warning',
        message: `ChangeNotifier "${this.name}" has methods but none call notifyListeners()`,
      });
    }

    // Methods that mutate should call notifyListeners
    this.methods.forEach((method) => {
      if (method.mutatesFields.length > 0 && !method.callsNotifyListeners) {
        issues.push({
          type: 'mutation-without-notification',
          severity: 'warning',
          message: `Method "${method.name}" mutates state but doesn't call notifyListeners()`,
        });
      }
    });

    // Should have getters for public access
    if (this.properties.length > 0 && this.getters.length === 0) {
      issues.push({
        type: 'missing-getters',
        severity: 'info',
        message: `ChangeNotifier "${this.name}" has properties but no getters. Consider adding getters for encapsulation.`,
      });
    }

    return issues;
  }

  /**
   * Get summary
   */
  summary() {
    return {
      name: this.name,
      properties: this.properties.length,
      getters: this.getters.length,
      methods: this.methods.length,
      consumers: this.consumers.length,
      consumedBy: this.consumers,
      isValid: this.methods.some((m) => m.callsNotifyListeners),
    };
  }
}

// ============================================================================
// PROVIDER ANALYSIS
// ============================================================================

/**
 * Analysis of a Provider<T> pattern
 * 
 * Represents:
 * Provider<CounterNotifier>(
 *   create: (context) => CounterNotifier(),
 *   child: MaterialApp(...)
 * )
 */
class ProviderAnalysis {
  constructor(providerType, location, valueType) {
    // Identity
    this.providerType = providerType;           // 'Provider<CounterNotifier>'
    this.location = location;
    this.valueType = valueType;                 // 'CounterNotifier'

    // Configuration
    this.createFunction = null;                 // (context) => CounterNotifier()
    this.lazy = true;                           // Is it lazy-initialized?
    this.dispose = null;                        // Cleanup function
    this.child = null;                          // Child widget

    // Usage tracking
    this.consumers = [];                        // Widgets that consume
    this.accessPatterns = [];                   // 'watch', 'read', 'select'
    this.flowPath = null;                       // Provider → ... → Consumer
  }

  /**
   * Set the create function
   */
  setCreateFunction(func) {
    this.createFunction = func;
  }

  /**
   * Set the dispose function
   */
  setDispose(func) {
    this.dispose = func;
  }

  /**
   * Record a consumer widget
   */
  addConsumer(widgetName) {
    if (!this.consumers.includes(widgetName)) {
      this.consumers.push(widgetName);
    }
  }

  /**
   * Record an access pattern
   */
  addAccessPattern(pattern) {
    // pattern: 'watch', 'read', 'select'
    if (!this.accessPatterns.includes(pattern)) {
      this.accessPatterns.push(pattern);
    }
  }

  /**
   * Validate the provider configuration
   */
  validate() {
    const issues = [];

    // Should have a create function
    if (!this.createFunction) {
      issues.push({
        type: 'missing-create',
        severity: 'error',
        message: `Provider<${this.valueType}> must have a create function`,
      });
    }

    // Should have at least one consumer
    if (this.consumers.length === 0) {
      issues.push({
        type: 'unused-provider',
        severity: 'info',
        message: `Provider<${this.valueType}> is defined but not consumed by any widget`,
      });
    }

    // Check for access pattern consistency
    if (this.accessPatterns.includes('watch') && !this.accessPatterns.includes('read')) {
      // watch should probably have read as fallback
      issues.push({
        type: 'watch-without-read',
        severity: 'info',
        message: `Provider uses context.watch() but not context.read(). Consider both patterns.`,
      });
    }

    return issues;
  }

  /**
   * Get summary
   */
  summary() {
    return {
      type: this.providerType,
      valueType: this.valueType,
      consumers: this.consumers.length,
      consumedBy: this.consumers,
      accessPatterns: this.accessPatterns,
      hasCreateFunction: !!this.createFunction,
      hasDisposeFunction: !!this.dispose,
    };
  }
}

// ============================================================================
// CONTEXT DEPENDENCY
// ============================================================================

/**
 * Represents a widget and its context dependencies
 */
class ContextDependency {
  constructor(dependent, method = 'build') {
    this.dependent = dependent;                 // Widget name
    this.method = method;                       // 'build', 'initState', etc.
    this.contextUsage = [];                     // Array of ContextUsagePattern
    this.location = null;
  }

  /**
   * Add a context usage pattern
   */
  addUsage(pattern) {
    if (pattern instanceof ContextUsagePattern) {
      this.contextUsage.push(pattern);
    }
  }

  /**
   * Get all SSR-safe usages
   */
  getSsrSafeUsages() {
    return this.contextUsage.filter((u) => u.ssrSafe);
  }

  /**
   * Get all SSR-unsafe usages
   */
  getSsrUnsafeUsages() {
    return this.contextUsage.filter((u) => !u.ssrSafe);
  }

  /**
   * Check if widget can be rendered on server
   */
  isSsrCompatible() {
    return this.getSsrUnsafeUsages().length === 0;
  }

  /**
   * Get summary
   */
  summary() {
    return {
      dependent: this.dependent,
      method: this.method,
      totalUsages: this.contextUsage.length,
      ssrSafeUsages: this.getSsrSafeUsages().length,
      ssrUnsafeUsages: this.getSsrUnsafeUsages().length,
      isSsrCompatible: this.isSsrCompatible(),
      usagePatterns: this.contextUsage.map((u) => u.pattern),
    };
  }
}

// ============================================================================
// CONTEXT USAGE PATTERN
// ============================================================================

/**
 * Represents a single context usage pattern in code
 * 
 * Examples:
 * - Theme.of(context)
 * - context.watch<CounterNotifier>()
 * - context.read<CounterNotifier>()
 * - context.mediaQuery()
 */
class ContextUsagePattern {
  constructor(pattern, type, location, returns = 'T', ssrSafe = true, reason = '') {
    // Pattern identification
    this.pattern = pattern;                     // 'Theme.of(context)', 'context.watch<T>()'
    this.type = type;                           // 'inherited-widget-lookup', 'provider-watch', etc.
    this.location = location;                   // { line, column }

    // What it returns
    this.returns = returns;                     // Return type

    // SSR compatibility
    this.ssrSafe = ssrSafe;
    this.reason = reason;                       // Why safe/unsafe for SSR

    // Metadata
    this.depth = 0;                             // Nesting depth in widget tree
    this.frequency = 1;                         // How often called
  }

  /**
   * Explain why this pattern is or isn't SSR safe
   */
  explain() {
    if (this.ssrSafe) {
      return `✓ SSR Safe: ${this.reason}`;
    } else {
      return `✗ SSR Unsafe: ${this.reason}`;
    }
  }

  /**
   * Get migration advice for SSR
   */
  getMigrationAdvice() {
    if (this.ssrSafe) return null;

    const advice = {
      'provider-watch': 'Replace with context.read() for initial SSR render, use watch() in didChangeDependencies() on client',
      'global-state-mutation': 'Move mutations to client-only code, wrap in if (!kIsWeb) or similar server check',
      'event-handler': 'Event handlers don\'t exist during SSR, only attach after hydration on client',
    };

    return advice[this.type] || null;
  }

  /**
   * Get summary
   */
  summary() {
    return {
      pattern: this.pattern,
      type: this.type,
      returns: this.returns,
      ssrSafe: this.ssrSafe,
      reason: this.reason,
      advice: this.getMigrationAdvice(),
    };
  }
}

// ============================================================================
// HYDRATION REQUIREMENT
// ============================================================================

/**
 * Represents something that needs to be re-initialized on the client
 * after server-side rendering
 */
class HydrationRequirement {
  constructor(dependency, reason, order = 0) {
    this.dependency = dependency;               // What needs hydration (e.g., 'CounterNotifier')
    this.reason = reason;                       // Why it needs hydration
    this.order = order;                         // Execution order (lower = earlier)
    this.requiredProviders = [];                // Providers needed before this hydrates
    this.requiredState = [];                    // State needed for this to work
  }

  /**
   * Add a required provider
   */
  requiresProvider(providerType) {
    if (!this.requiredProviders.includes(providerType)) {
      this.requiredProviders.push(providerType);
    }
  }

  /**
   * Add required state
   */
  requiresState(stateProperty) {
    if (!this.requiredState.includes(stateProperty)) {
      this.requiredState.push(stateProperty);
    }
  }

  /**
   * Get summary
   */
  summary() {
    return {
      dependency: this.dependency,
      reason: this.reason,
      order: this.order,
      requiredProviders: this.requiredProviders,
      requiredState: this.requiredState,
    };
  }
}

// ============================================================================
// LAZY LOADING OPPORTUNITY
// ============================================================================

/**
 * Represents a widget or notifier that could be lazy-loaded
 */
class LazyLoadOpportunity {
  constructor(target, reason, estimatedSize = 'unknown', type = 'widget') {
    this.target = target;                       // Widget or ChangeNotifier name
    this.reason = reason;                       // Why lazy load it
    this.estimatedSize = estimatedSize;         // Bundle size if lazy loaded
    this.type = type;                           // 'widget' or 'notifier'
    this.recommendation = null;                 // How to lazy load
    this.priority = 'medium';                   // 'high', 'medium', 'low'
  }

  /**
   * Set the recommendation
   */
  setRecommendation(recommendation) {
    this.recommendation = recommendation;
  }

  /**
   * Set priority based on size
   */
  calculatePriority(sizeKb) {
    if (sizeKb > 50) {
      this.priority = 'high';
    } else if (sizeKb > 20) {
      this.priority = 'medium';
    } else {
      this.priority = 'low';
    }
  }

  /**
   * Get summary
   */
  summary() {
    return {
      target: this.target,
      type: this.type,
      reason: this.reason,
      estimatedSize: this.estimatedSize,
      priority: this.priority,
      recommendation: this.recommendation,
    };
  }
}

// ============================================================================
// CONTEXT REQUIREMENTS SUMMARY
// ============================================================================

/**
 * Summary of all context requirements for the app
 */
class ContextRequirementsSummary {
  constructor() {
    this.requiresThemeProvider = false;
    this.requiresMediaQuery = false;
    this.requiresNavigator = false;
    this.requiresChangeNotifierProvider = false;
    this.customInheritedWidgets = [];           // Custom providers defined
    this.requiredProviders = [];                // Provider<T> patterns used
    this.hydrationRequired = false;
    this.hydrationDependencies = [];            // What needs hydration

    this.ssrCompatibility = 'unknown';          // 'full', 'partial', 'none'
    this.ssrIssues = [];                        // What breaks SSR
    this.ssrMigrationPath = [];                 // Steps to fix SSR
  }

  /**
   * Add a custom inherited widget
   */
  addCustomInheritedWidget(name) {
    if (!this.customInheritedWidgets.includes(name)) {
      this.customInheritedWidgets.push(name);
    }
  }

  /**
   * Add a required provider
   */
  addRequiredProvider(type) {
    if (!this.requiredProviders.includes(type)) {
      this.requiredProviders.push(type);
    }
  }

  /**
   * Add a hydration dependency
   */
  addHydrationDependency(dep) {
    if (dep instanceof HydrationRequirement) {
      this.hydrationDependencies.push(dep);
      this.hydrationRequired = true;
    }
  }

  /**
   * Calculate SSR compatibility
   */
  calculateSsrCompatibility() {
    if (this.ssrIssues.length === 0) {
      this.ssrCompatibility = 'full';
    } else if (this.ssrIssues.length <= 3) {
      this.ssrCompatibility = 'partial';
    } else {
      this.ssrCompatibility = 'none';
    }
  }

  /**
   * Get summary
   */
  summary() {
    return {
      requiresThemeProvider: this.requiresThemeProvider,
      requiresMediaQuery: this.requiresMediaQuery,
      requiresNavigator: this.requiresNavigator,
      requiresChangeNotifierProvider: this.requiresChangeNotifierProvider,
      customInheritedWidgets: this.customInheritedWidgets,
      requiredProviders: this.requiredProviders,
      hydrationRequired: this.hydrationRequired,
      hydrationCount: this.hydrationDependencies.length,
      ssrCompatibility: this.ssrCompatibility,
      ssrIssueCount: this.ssrIssues.length,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  InheritedWidgetMetadata,
  ChangeNotifierAnalysis,
  ProviderAnalysis,
  ContextDependency,
  ContextUsagePattern,
  HydrationRequirement,
  LazyLoadOpportunity,
  ContextRequirementsSummary,
};
