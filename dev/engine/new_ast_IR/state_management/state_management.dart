import 'package:meta/meta.dart';
import '../class_decl.dart';
import '../diagnostics/source_location.dart';
import '../ir/expression_ir.dart';
import '../ir/ir_node.dart';
import '../ir/type_ir.dart';

// =============================================================================
// PROVIDER CLASS DECLARATION
// =============================================================================

/// Represents a state management provider class
///
/// Extends ClassDecl to add provider-specific analysis for:
/// - ChangeNotifier-based providers
/// - BLoC pattern classes
/// - Cubit pattern classes
/// - InheritedWidget subclasses
/// - Custom state management
///
/// Examples:
/// ```dart
/// class CounterProvider extends ChangeNotifier {
///   int _count = 0;
///   int get count => _count;
///
///   void increment() {
///     _count++;
///     notifyListeners();
///   }
/// }
///
/// class UserBloc extends Bloc<UserEvent, UserState> {
///   UserBloc() : super(UserInitial());
/// }
/// ```
@immutable
class ProviderClassDecl extends ClassDecl {
  /// Type of provider/state management
  final ProviderTypeIR providerType;

  /// The data type this provider manages
  ///
  /// Examples:
  /// - CounterProvider manages `int`
  /// - UserProvider manages `User`
  /// - SearchBloc manages `SearchState`
  final TypeIR? stateType;

  /// All notifyListeners() calls in this provider
  ///
  /// For ChangeNotifier: when state changes are broadcast
  /// For others: equivalent state change notifications
  final List<NotifyListenerCallIR> notifyListenerCalls;

  /// Which fields contain mutable state
  ///
  /// These fields trigger provider updates when modified
  final List<String> stateFieldNames;

  /// All mutations to state fields
  ///
  /// Tracks how state is modified (direct assignment, increment, etc.)
  final List<StateMutationIR> fieldMutations;

  /// Methods that modify state
  ///
  /// Example: increment(), decrement(), reset()
  final List<String> stateModifyingMethods;

  /// Which widgets/classes consume this provider
  final List<ProviderConsumerIR> consumedByWidgets;

  /// Which providers depend on this provider
  ///
  /// For dependency analysis
  final List<String> dependsOnProviders;

  /// Which providers depend on this one
  final List<String> dependentProviders;

  /// Analysis of consumption patterns
  final ProviderConsumptionAnalysisIR consumptionAnalysis;

  /// Whether this provider exposes reactive streams
  ///
  /// For RxDart, stream_builder patterns
  final bool exposesStreams;

  /// Stream-related operations in this provider
  final List<StreamOperationIR> streamOperations;

  /// Whether this provider has event input (BLoC pattern)
  ///
  /// BLoC/Cubit have event sinks
  final bool hasEventInput;

  /// Events this provider accepts (if using event input)
  final List<String> eventTypes;

  /// Performance characteristics
  final ProviderPerformanceIR performance;

  /// All detected issues with this provider
  final List<ProviderIssueIR> issues;

  ProviderClassDecl({
    required super.id,
    required super.sourceLocation,
    required super.name,
    super.superclass,
    super.interfaces = const [],
    super.mixins = const [],
    super.typeParameters = const [],
    super.fields = const [],
    super.methods = const [],
    super.constructors = const [],
    super.isAbstract = false,
    super.isFinal = false,
    super.isSealed = false,
    super.isMixin = false,
    super.documentation,
    super.annotations = const [],
    super.metadata = const {},
    required this.providerType,
    this.stateType,
    this.notifyListenerCalls = const [],
    this.stateFieldNames = const [],
    this.fieldMutations = const [],
    this.stateModifyingMethods = const [],
    this.consumedByWidgets = const [],
    this.dependsOnProviders = const [],
    this.dependentProviders = const [],
    required this.consumptionAnalysis,
    this.exposesStreams = false,
    this.streamOperations = const [],
    this.hasEventInput = false,
    this.eventTypes = const [],
    required this.performance,
    this.issues = const [],
  });

  /// Get the managed state type as human-readable string
  String get stateTypeString => stateType?.displayName() ?? 'dynamic';

  /// Count of widgets consuming this provider
  int get consumerCount => consumedByWidgets.length;

  /// Count of places where provider is watched (reactive reads)
  int get watchCount => consumedByWidgets
      .where((c) => c.consumptionType == ConsumptionTypeIR.watch)
      .length;

  /// Count of places where provider is read once
  int get readCount => consumedByWidgets
      .where((c) => c.consumptionType == ConsumptionTypeIR.read)
      .length;

  /// Whether this provider is actively used
  bool get isUsed => consumedByWidgets.isNotEmpty;

  /// Whether this provider is dead code (never used)
  bool get isDeadCode => consumedByWidgets.isEmpty && !isAbstract;

  /// Whether state mutations are properly notified
  bool get properlyNotifiesChanges =>
      fieldMutations.isEmpty || notifyListenerCalls.isNotEmpty;

  /// Whether this provider has circular dependencies
  bool get hasCircularDependency {
    if (dependsOnProviders.isEmpty) return false;
    // Simplified check - would need full dependency graph in real implementation
    return dependsOnProviders.contains(name);
  }

  /// Total state notification calls
  int get totalNotifications => notifyListenerCalls.length;

  /// Whether provider broadcasts changes too frequently
  bool get overNotifies => totalNotifications > fieldMutations.length * 2;

  /// Health check summary
  String get healthStatus {
    if (isDeadCode) return 'Dead code - unused';
    if (hasCircularDependency) return 'Circular dependency detected';
    if (!properlyNotifiesChanges) return 'State changes not notified';
    if (overNotifies) return 'Over-notifying (inefficient)';
    if (issues.isNotEmpty) return '${issues.length} issue(s) found';
    return 'Healthy';
  }

  /// Whether this provider should be split into smaller providers
  bool get shouldBeSplit {
    // Large providers with multiple unrelated state fields
    return stateFieldNames.length > 5 &&
        consumedByWidgets.length > 10 &&
        dependentProviders.isNotEmpty;
  }

  @override
  String toString() =>
      'Provider($name: ${providerType.name}, manages: $stateTypeString, used by: $consumerCount widgets)';
}

// =============================================================================
// PROVIDER TYPE
// =============================================================================

/// Represents different types of state management patterns
enum ProviderTypeIR {
  changeNotifier, // extends ChangeNotifier
  bloc, // extends Bloc
  cubit, // extends Cubit
  inheritedWidget, // extends InheritedWidget
  inheritedModel, // extends InheritedModel
  rxDart, // Uses RxDart streams
  riverpod, // Riverpod provider
  getMx, // GetX controller
  mobx, // MobX store
  stateNotifier, // StateNotifier from StateNotifier package
  custom, // Custom state management
}

// =============================================================================
// NOTIFY LISTENER CALLS
// =============================================================================

/// Represents a single notifyListeners() call
@immutable
class NotifyListenerCallIR extends IRNode {
  /// Which method this call is in
  final String methodName;

  /// What triggered this notification
  final String trigger;

  /// Fields that were modified before this call
  final List<String> modifiedFields;

  /// Whether this notification is conditional
  final bool isConditional;

  /// Whether this is in a loop
  final bool isInLoop;

  /// Number of times this can be called per method execution
  final int maxCallsPerExecution;

  NotifyListenerCallIR({
    required super.id,
    required super.sourceLocation,
    required this.methodName,
    required this.trigger,
    this.modifiedFields = const [],
    this.isConditional = false,
    this.isInLoop = false,
    this.maxCallsPerExecution = 1,
  });

  @override
  String toShortString() =>
      'notifyListeners() in $methodName${isConditional ? " (conditional)" : ""}${isInLoop ? " (in loop)" : ""}';
}

// =============================================================================
// STATE MUTATIONS
// =============================================================================

/// Represents a mutation to a state field
@immutable
class StateMutationIR extends IRNode {
  /// Name of the field being mutated
  final String fieldName;

  /// Type of mutation (assignment, increment, modification, etc.)
  final MutationTypeIR mutationType;

  /// The method performing the mutation
  final String methodName;

  /// The new value expression (if assignment)
  final ExpressionIR? newValue;

  /// Whether this mutation triggers a notifyListeners() call
  final bool triggersNotification;

  /// How many steps after mutation before notification
  ///
  /// 0 = immediate, >0 = delayed, -1 = no notification
  final int stepsToNotification;

  /// Whether mutation is inside a condition
  final bool isConditional;

  /// Whether mutation is inside a loop
  final bool isInLoop;

  StateMutationIR({
    required super.id,
    required super.sourceLocation,
    required this.fieldName,
    required this.mutationType,
    required this.methodName,
    this.newValue,
    this.triggersNotification = true,
    this.stepsToNotification = 0,
    this.isConditional = false,
    this.isInLoop = false,
  });

  /// Whether this mutation is properly notified
  bool get isProperlyNotified =>
      triggersNotification && stepsToNotification >= 0;

  @override
  String toShortString() =>
      '$fieldName ${mutationType.name} in $methodName${!isProperlyNotified ? " ⚠️ NOT NOTIFIED" : ""}';
}

enum MutationTypeIR {
  assignment, // x = value
  increment, // x++
  decrement, // x--
  compoundAssignment, // x += value
  fieldAssignment, // this.x = value
  listMutation, // list.add()
  mapMutation, // map.putIfAbsent()
  propertyMutation, // obj.prop = value
}

// =============================================================================
// PROVIDER CONSUMPTION
// =============================================================================

/// Represents a consumer of this provider
@immutable
class ProviderConsumerIR extends IRNode {
  /// Name of the consuming widget or class
  final String consumerName;

  /// Type of consumption
  final ConsumptionTypeIR consumptionType;

  /// How often this consumer reads the provider
  final ConsumptionFrequencyIR frequency;

  /// Which parts of state are used
  final List<String> accessedStateFields;

  /// Whether consumer is memoized/optimized
  final bool isMemoized;

  /// Whether consumer has selector function
  final bool hasSelector;

  /// Number of times this provider is accessed in build
  final int accessesPerBuild;

  ProviderConsumerIR({
    required super.id,
    required super.sourceLocation,
    required this.consumerName,
    required this.consumptionType,
    required this.frequency,
    this.accessedStateFields = const [],
    this.isMemoized = false,
    this.hasSelector = false,
    this.accessesPerBuild = 1,
  });

  @override
  String toShortString() =>
      '$consumerName: ${consumptionType.name} (${frequency.name})${isMemoized ? " [memoized]" : ""}';
}

enum ConsumptionTypeIR {
  watch, // context.watch<T>() - reactive reads
  read, // context.read<T>() - one-time reads
  select, // context.select() - partial state reads
  consumer, // Consumer widget
  listener, // Listener widget
  selector, // Selector widget
}

enum ConsumptionFrequencyIR {
  veryRare, // < 1% of builds
  rare, // 1-10% of builds
  occasional, // 10-50% of builds
  frequent, // 50-90% of builds
  veryFrequent, // 90%+ of builds
}

// =============================================================================
// STREAM OPERATIONS
// =============================================================================

/// Represents stream-based operations in provider
@immutable
class StreamOperationIR extends IRNode {
  /// Type of stream operation
  final StreamOperationType operationType;

  /// The stream being operated on
  final String streamName;

  /// Which method contains this operation
  final String methodName;

  /// Type of elements in stream
  final TypeIR? elementType;

  /// Whether subscription is properly managed
  final bool isProperlyDisposed;

  StreamOperationIR({
    required super.id,
    required super.sourceLocation,
    required this.operationType,
    required this.streamName,
    required this.methodName,
    this.elementType,
    this.isProperlyDisposed = true,
  });

  @override
  String toShortString() =>
      '${operationType.name}: $streamName in $methodName${!isProperlyDisposed ? " ⚠️ LEAKED" : ""}';
}

enum StreamOperationType {
  streamCreation,
  streamSubscription,
  streamTransformation,
  streamBroadcast,
  streamListen,
  streamSink,
}

// =============================================================================
// CONSUMPTION ANALYSIS
// =============================================================================

/// Analysis of how this provider is consumed
@immutable
class ProviderConsumptionAnalysisIR extends IRNode {
  /// Total consumers
  final int totalConsumers;

  /// Consumers using watch() (reactive)
  final int watchConsumers;

  /// Consumers using read() (one-time)
  final int readConsumers;

  /// Consumers using selectors
  final int selectorConsumers;

  /// Average accesses per build
  final double averageAccessesPerBuild;

  /// Whether consumption is balanced
  final bool isBalanced;

  /// Consumption pattern
  final ConsumptionPatternIR pattern;

  /// Whether provider is over-consumed
  final bool isOverConsumed;

  /// Optimization opportunity
  final String? optimizationOpportunity;

  ProviderConsumptionAnalysisIR({
    required super.id,
    required super.sourceLocation,
    required this.totalConsumers,
    required this.watchConsumers,
    required this.readConsumers,
    required this.selectorConsumers,
    required this.averageAccessesPerBuild,
    required this.isBalanced,
    required this.pattern,
    required this.isOverConsumed,
    this.optimizationOpportunity,
  });

  @override
  String toShortString() =>
      'Consumption [watch: $watchConsumers, read: $readConsumers, selector: $selectorConsumers, pattern: ${pattern.name}]';
}

enum ConsumptionPatternIR {
  uniformRead, // All consumers read the same way
  mixedRead, // Mix of watch and read
  heavyWrite, // Many writes, few readers
  heavyRead, // Few writes, many readers
  cascading, // Reads trigger other reads
  sporadic, // Unpredictable usage
}

// =============================================================================
// PERFORMANCE ANALYSIS
// =============================================================================

/// Performance characteristics of this provider
@immutable
class ProviderPerformanceIR extends IRNode {
  /// Estimated time to process state change in milliseconds
  final double stateChangeProcessingTimeMs;

  /// Number of widgets rebuilt per state change
  final int widgetsRebuiltPerChange;

  /// Frequency of state changes
  final String frequencyDescription;

  /// Whether this provider is efficient
  final bool isEfficient;

  /// Whether over-notification detected
  final bool hasExcessiveNotifications;

  /// Whether unnecessary subscribers
  final bool hasUnnecessarySubscribers;

  /// Suggested optimizations
  final List<String> optimizationSuggestions;

  ProviderPerformanceIR({
    required super.id,
    required super.sourceLocation,
    required this.stateChangeProcessingTimeMs,
    required this.widgetsRebuiltPerChange,
    required this.frequencyDescription,
    required this.isEfficient,
    required this.hasExcessiveNotifications,
    required this.hasUnnecessarySubscribers,
    required this.optimizationSuggestions,
  });

  @override
  String toShortString() =>
      'Performance [${stateChangeProcessingTimeMs.toStringAsFixed(2)}ms, ${widgetsRebuiltPerChange} rebuilds, efficient: $isEfficient]';
}

// =============================================================================
// PROVIDER ISSUES
// =============================================================================

/// An issue detected in provider implementation
@immutable
class ProviderIssueIR extends IRNode {
  /// Severity of issue
  final IssueSeverityIR severity;

  /// Issue type
  final ProviderIssueType issueType;

  /// Description
  final String message;

  /// How to fix it
  final String? suggestion;

  /// Location of the issue
  final SourceLocationIR? issueLocation;

  ProviderIssueIR({
    required super.id,
    required super.sourceLocation,
    required this.severity,
    required this.issueType,
    required this.message,
    this.suggestion,
    this.issueLocation,
  });

  @override
  String toShortString() => '[${severity.name}] ${issueType.name}: $message';
}

enum ProviderIssueType {
  missingNotification, // State changed but no notifyListeners
  overNotification, // Too many notifyListeners calls
  unsubscribedStream, // Stream subscription not disposed
  circularDependency, // Provider depends on itself
  deadCode, // Provider never used
  stateLeakage, // Unintended state sharing
  inefficientSelector, // Selector could be more specific
  missingDisposal, // Resource not cleaned up
}

enum IssueSeverityIR {
  error, // Critical bug
  warning, // Should fix
  info, // Code quality
  hint, // Suggestion
}
