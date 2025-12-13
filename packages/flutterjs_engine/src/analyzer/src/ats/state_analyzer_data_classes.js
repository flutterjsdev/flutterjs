/**
 * FlutterJS State Analyzer - Data Classes
 * Phase 2 Implementation
 * 
 * Represents all state-related concepts in structured classes
 */

// ============================================================================
// STATE CLASS METADATA
// ============================================================================

/**
 * Metadata about a State class
 * Represents: class _MyCounterState extends State<MyCounter> { ... }
 */
class StateClassMetadata {
  constructor(name, location, linkedStatefulWidget = null) {
    // Identity
    this.name = name;
    this.location = location;
    this.linkedStatefulWidget = linkedStatefulWidget;

    // Contents
    this.stateFields = [];          // _count, _isLoading, etc.
    this.lifecycleMethods = [];     // initState, dispose, build, etc.
    this.eventHandlers = [];        // Handlers for events
    this.otherMethods = [];         // Helper methods like _increment

    // Metadata
    this.extends = 'State';         // Usually State or State<Widget>
    this.constructor = null;        // Constructor info
  }

  /**
   * Add a state field to this class
   */
  addStateField(field) {
    if (field instanceof StateField) {
      this.stateFields.push(field);
    }
  }

  /**
   * Add a lifecycle method
   */
  addLifecycleMethod(method) {
    if (method instanceof LifecycleMethod) {
      this.lifecycleMethods.push(method);
    }
  }

  /**
   * Get summary
   */
  summary() {
    return {
      name: this.name,
      statefulWidget: this.linkedStatefulWidget,
      fieldCount: this.stateFields.length,
      lifecycleMethodCount: this.lifecycleMethods.length,
      totalMethods: this.otherMethods.length,
    };
  }
}

// ============================================================================
// STATE FIELD
// ============================================================================

/**
 * Represents a single state variable
 * Example: _count = 0
 */
class StateField {
  constructor(name, type, initialValue, location) {
    // Identity
    this.name = name;
    this.type = type;              // 'number', 'string', 'boolean', 'any', etc.
    this.location = location;

    // Initial value
    this.initialValue = initialValue;
    this.initialValueString = this.valueToString(initialValue);

    // Mutability
    this.isMutable = true;
    this.mutations = [];             // Record of where field is mutated

    // Usage tracking
    this.usedInMethods = [];         // Which methods read this field
    this.mutatedInMethods = [];      // Which methods mutate this field
    this.usedInBuild = false;        // Is it used in build() method?
  }

  /**
   * Record that this field is used in a method
   */
  recordUsage(methodName) {
    if (!this.usedInMethods.includes(methodName)) {
      this.usedInMethods.push(methodName);
    }
  }

  /**
   * Record that this field is mutated in a method
   */
  recordMutation(methodName, operation = '=', location = null) {
    this.mutations.push({
      method: methodName,
      operation,    // '++', '--', '=', '+=', '-=', etc.
      location,
      wrappedInSetState: false,  // Will be updated during validation
    });

    if (!this.mutatedInMethods.includes(methodName)) {
      this.mutatedInMethods.push(methodName);
    }
  }

  /**
   * Check if field is used anywhere
   */
  isUsed() {
    return this.usedInMethods.length > 0 || this.usedInBuild;
  }

  /**
   * Convert value to string representation
   */
  valueToString(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    return String(value);
  }

  /**
   * Get summary
   */
  summary() {
    return {
      name: this.name,
      type: this.type,
      initialValue: this.initialValueString,
      isUsed: this.isUsed(),
      usedInMethods: this.usedInMethods,
      mutatedInMethods: this.mutatedInMethods,
      mutationCount: this.mutations.length,
    };
  }
}

// ============================================================================
// LIFECYCLE METHOD
// ============================================================================

/**
 * Represents a lifecycle hook method
 * Examples: initState(), dispose(), didUpdateWidget(), build()
 */
class LifecycleMethod {
  constructor(name, location, params = [], callsSuper = false, hasSideEffects = false) {
    // Identity
    this.name = name;
    this.location = location;
    this.params = params;

    // Behavior
    this.callsSuper = callsSuper;
    this.hasSideEffects = hasSideEffects;

    // Validation
    this.shouldCallSuper = false;   // True if this method should call super
    this.validationIssues = [];
  }

  /**
   * Check if this method type should call super
   */
  setMustCallSuper(mustCall) {
    this.shouldCallSuper = mustCall;
  }

  /**
   * Add a validation issue
   */
  addIssue(type, message, severity = 'warning') {
    this.validationIssues.push({
      type,
      message,
      severity,
    });
  }

  /**
   * Check if method is valid
   */
  isValid() {
    // dispose() MUST call super
    if (this.name === 'dispose' && !this.callsSuper) {
      return false;
    }

    // initState should call super
    if (this.name === 'initState' && !this.callsSuper) {
      return false;
    }

    return this.validationIssues.filter(v => v.severity === 'error').length === 0;
  }

  /**
   * Get summary
   */
  summary() {
    return {
      name: this.name,
      callsSuper: this.callsSuper,
      shouldCallSuper: this.shouldCallSuper,
      hasSideEffects: this.hasSideEffects,
      isValid: this.isValid(),
      issues: this.validationIssues,
    };
  }
}

// ============================================================================
// STATE UPDATE CALL
// ============================================================================

/**
 * Represents a single setState() call
 * Example: this.setState(() => { this._count++; })
 */
class StateUpdateCall {
  constructor(location, method, updates = [], stateClassName) {
    // Location
    this.location = location;
    this.method = method;           // Which method contains this call
    this.stateClassName = stateClassName;

    // What's being updated
    this.updates = updates || [];   // Field names being updated

    // Validation
    this.isValid = true;
    this.issues = [];
  }

  /**
   * Add a validation issue
   */
  addIssue(type, message, severity = 'error') {
    this.issues.push({
      type,
      message,
      severity,
    });
    if (severity === 'error') {
      this.isValid = false;
    }
  }

  /**
   * Check if this call updates a specific field
   */
  updatesField(fieldName) {
    return this.updates.includes(fieldName);
  }

  /**
   * Get summary
   */
  summary() {
    return {
      method: this.method,
      updates: this.updates,
      isValid: this.isValid,
      issueCount: this.issues.length,
      issues: this.issues,
    };
  }
}

// ============================================================================
// EVENT HANDLER
// ============================================================================

/**
 * Represents an event handler attached to a widget
 * Example: onPressed: () => this._increment()
 */
class EventHandler {
  constructor(event, handler, location, component = 'Unknown') {
    // Identification
    this.event = event;             // 'onPressed', 'onChange', etc.
    this.handler = handler;         // Method name: '_increment'
    this.location = location;
    this.component = component;     // 'Button', 'TextField', etc.

    // Validation
    this.isValid = true;
    this.issues = [];
    this.triggersSetState = false;  // Does handler call setState?
  }

  /**
   * Add validation issue
   */
  addIssue(type, message, severity = 'error') {
    this.issues.push({
      type,
      message,
      severity,
    });
    if (severity === 'error') {
      this.isValid = false;
    }
  }

  /**
   * Mark that this handler triggers setState
   */
  marksSetState(trigger = true) {
    this.triggersSetState = trigger;
  }

  /**
   * Get summary
   */
  summary() {
    return {
      event: this.event,
      handler: this.handler,
      component: this.component,
      triggersSetState: this.triggersSetState,
      isValid: this.isValid,
      issues: this.issues,
    };
  }
}

// ============================================================================
// DEPENDENCY GRAPH
// ============================================================================

/**
 * Maps relationships between state, methods, and events
 */
class DependencyGraph {
  constructor() {
    // State → Methods: which methods use which state
    this.stateToMethods = new Map();

    // Method → State: which state each method uses
    this.methodToState = new Map();

    // Event → State: which state each event updates
    this.eventToState = new Map();

    // Method → Methods: which methods call which methods
    this.methodToMethods = new Map();
  }

  /**
   * Add state → method mapping
   */
  addStateUse(stateName, methodName) {
    if (!this.stateToMethods.has(stateName)) {
      this.stateToMethods.set(stateName, []);
    }
    const methods = this.stateToMethods.get(stateName);
    if (!methods.includes(methodName)) {
      methods.push(methodName);
    }
  }

  /**
   * Add method → state mapping
   */
  addMethodStateUse(methodName, stateName) {
    if (!this.methodToState.has(methodName)) {
      this.methodToState.set(methodName, []);
    }
    const states = this.methodToState.get(methodName);
    if (!states.includes(stateName)) {
      states.push(stateName);
    }
  }

  /**
   * Add event → state mapping
   */
  addEventStateUse(eventName, stateName) {
    if (!this.eventToState.has(eventName)) {
      this.eventToState.set(eventName, []);
    }
    const states = this.eventToState.get(eventName);
    if (!states.includes(stateName)) {
      states.push(stateName);
    }
  }

  /**
   * Get all state that a method depends on
   */
  getStateForMethod(methodName) {
    return this.methodToState.get(methodName) || [];
  }

  /**
   * Get all methods that use a state
   */
  getMethodsForState(stateName) {
    return this.stateToMethods.get(stateName) || [];
  }

  /**
   * Get state that an event triggers
   */
  getStateForEvent(eventName) {
    return this.eventToState.get(eventName) || [];
  }

  /**
   * Get summary
   */
  summary() {
    return {
      stateToMethods: Object.fromEntries(this.stateToMethods),
      methodToState: Object.fromEntries(this.methodToState),
      eventToState: Object.fromEntries(this.eventToState),
    };
  }
}

// ============================================================================
// VALIDATION RESULT
// ============================================================================

/**
 * Represents a single validation issue found during analysis
 */
class ValidationResult {
  constructor(type, message, severity = 'warning', location = null) {
    this.type = type;               // 'unused-state', 'missing-super', etc.
    this.message = message;
    this.severity = severity;       // 'error', 'warning', 'info'
    this.location = location;

    this.suggestion = null;         // How to fix it
    this.affectedItem = null;       // Field, method, etc. that has the issue
  }

  /**
   * Add a suggestion for fixing the issue
   */
  withSuggestion(suggestion) {
    this.suggestion = suggestion;
    return this;
  }

  /**
   * Set what item is affected
   */
  affecting(item) {
    this.affectedItem = item;
    return this;
  }

  /**
   * Convert to output format
   */
  toObject() {
    return {
      type: this.type,
      message: this.message,
      severity: this.severity,
      location: this.location,
      suggestion: this.suggestion,
      affectedItem: this.affectedItem,
    };
  }
}

// ============================================================================
// ANALYSIS SUMMARY
// ============================================================================

/**
 * Summary statistics of the entire state analysis
 */
class AnalysisSummary {
  constructor() {
    this.stateClassCount = 0;
    this.stateFieldCount = 0;
    this.setStateCallCount = 0;
    this.lifecycleMethodCount = 0;
    this.eventHandlerCount = 0;

    this.errorCount = 0;
    this.warningCount = 0;

    this.complexityScore = 0;      // 0-100
    this.healthScore = 0;          // 0-100
  }

  /**
   * Calculate complexity score based on state complexity
   */
  calculateComplexity() {
    let score = 0;

    // More state fields = more complex
    score += Math.min(this.stateFieldCount * 10, 40);

    // More setState calls = more complex
    score += Math.min(this.setStateCallCount * 5, 30);

    // More event handlers = more complex
    score += Math.min(this.eventHandlerCount * 2, 20);

    this.complexityScore = Math.min(100, score);
    return this.complexityScore;
  }

  /**
   * Calculate health score
   */
  calculateHealth() {
    let score = 100;

    // Deduct for errors
    score -= this.errorCount * 10;

    // Deduct for warnings
    score -= this.warningCount * 2;

    // Deduct for high complexity
    if (this.complexityScore > 70) {
      score -= 10;
    }

    this.healthScore = Math.max(0, score);
    return this.healthScore;
  }

  /**
   * Get summary object
   */
  toObject() {
    return {
      stateClasses: this.stateClassCount,
      stateFields: this.stateFieldCount,
      setStateCalls: this.setStateCallCount,
      lifecycleMethods: this.lifecycleMethodCount,
      eventHandlers: this.eventHandlerCount,
      errors: this.errorCount,
      warnings: this.warningCount,
      complexityScore: this.complexityScore,
      healthScore: this.healthScore,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  StateClassMetadata,
  StateField,
  LifecycleMethod,
  StateUpdateCall,
  EventHandler,
  DependencyGraph,
  ValidationResult,
  AnalysisSummary,
};