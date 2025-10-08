
import '../Expression/expression_ir.dart';
import '../Statement/statement_ir.dart';

class WidgetIR {
  final String id;
  final String name;
  final String type; // StatefulWidget, StatelessWidget, etc.
  final WidgetClassification classification;
  final bool isStateful;
  
  // Properties and fields
  final List<PropertyIR> properties;
  final List<FieldIR> fields;
  final ConstructorIR? constructor;
  
  // Build method
  final BuildMethodIR? buildMethod;
  
  // Children and composition
  final List<WidgetIR> children;
  final WidgetTreeIR? widgetTree;
  
  // State and reactivity
  final ReactivityInfoIR? reactivityInfo;
  final StateBindingIR? stateBinding;
  
  // Lifecycle
  final List<LifecycleMethodIR> lifecycleMethods;
  
  // Event handlers
  final List<EventHandlerIR> eventHandlers;
  
  // Keys
  final KeyIR? key;
  
  // Annotations
  final List<AnnotationIR> annotations;
  
  // Source location
  final SourceLocationIR sourceLocation;

  WidgetIR({
    required this.id,
    required this.name,
    required this.type,
    required this.classification,
    required this.isStateful,
    required this.properties,
    required this.fields,
    this.constructor,
    this.buildMethod,
    required this.children,
    this.widgetTree,
    this.reactivityInfo,
    this.stateBinding,
    required this.lifecycleMethods,
    required this.eventHandlers,
    this.key,
    required this.annotations,
    required this.sourceLocation,
  });
}

enum WidgetClassification {
  stateless,
  stateful,
  inherited,
  function,
  nonUI,
  animated,
  layout,
  input,
  display,
  navigation,
}

class FieldIR {
  final String name;
  final TypeIR type;
  final ExpressionIR? initializer;
  final bool isFinal;
  final bool isConst;
  final bool isStatic;
  final bool isLate;
  final VisibilityModifier visibility;

  FieldIR({
    required this.name,
    required this.type,
    this.initializer,
    this.isFinal = false,
    this.isConst = false,
    this.isStatic = false,
    this.isLate = false,
    this.visibility = VisibilityModifier.public,
  });
}

enum VisibilityModifier {
  public,
  private,
  protected,
}

class ConstructorIR {
  final String name;
  final List<ParameterIR> parameters;
  final List<StatementIR> initializers;
  final StatementIR? body;
  final bool isConst;
  final bool isFactory;

  ConstructorIR({
    required this.name,
    required this.parameters,
    this.initializers = const [],
    this.body,
    this.isConst = false,
    this.isFactory = false,
  });
}

class ParameterIR {
  final String name;
  final TypeIR type;
  final ExpressionIR? defaultValue;
  final bool isRequired;
  final bool isNamed;
  final bool isPositional;
  final List<AnnotationIR> annotations;

  ParameterIR({
    required this.name,
    required this.type,
    this.defaultValue,
    this.isRequired = false,
    this.isNamed = false,
    this.isPositional = true,
    this.annotations = const [],
  });
}

class BuildMethodIR {
  final List<ParameterIR> parameters;
  final ExpressionIR returnExpression;
  final List<StatementIR> statements;
  final List<LocalVariableIR> localVariables;
  final List<String> capturedVariables;
  final WidgetTreeIR widgetTree;

  BuildMethodIR({
    required this.parameters,
    required this.returnExpression,
    this.statements = const [],
    required this.localVariables,
    required this.capturedVariables,
    required this.widgetTree,
  });
}

class LocalVariableIR {
  final String name;
  final TypeIR type;
  final ExpressionIR? initializer;
  final bool isFinal;
  final bool isLate;

  LocalVariableIR({
    required this.name,
    required this.type,
    this.initializer,
    this.isFinal = false,
    this.isLate = false,
  });
}

class WidgetTreeIR {
  final WidgetNodeIR root;
  final List<ConditionalBranchIR> conditionalBranches;
  final List<IterationIR> iterations;
  final int depth;
  final int nodeCount;

  WidgetTreeIR({
    required this.root,
    this.conditionalBranches = const [],
    this.iterations = const [],
    required this.depth,
    required this.nodeCount,
  });
}

class WidgetNodeIR {
  final String id;
  final String widgetType;
  final Map<String, ExpressionIR> properties;
  final List<WidgetNodeIR> children;
  final KeyIR? key;
  final bool isConst;

  WidgetNodeIR({
    required this.id,
    required this.widgetType,
    required this.properties,
    this.children = const [],
    this.key,
    this.isConst = false,
  });
}

class ConditionalBranchIR {
  final ExpressionIR condition;
  final WidgetNodeIR thenWidget;
  final WidgetNodeIR? elseWidget;
  final ConditionalType type;

  ConditionalBranchIR({
    required this.condition,
    required this.thenWidget,
    this.elseWidget,
    required this.type,
  });
}

enum ConditionalType {
  ternary,
  ifStatement,
  switchCase,
}

class IterationIR {
  final String iteratorVariable;
  final ExpressionIR iterable;
  final WidgetNodeIR itemBuilder;
  final IterationType type;
  final ExpressionIR? filter;

  IterationIR({
    required this.iteratorVariable,
    required this.iterable,
    required this.itemBuilder,
    required this.type,
    this.filter,
  });
}

enum IterationType {
  map,
  forEach,
  listGenerate,
  builder,
}

class KeyIR {
  final KeyType type;
  final ExpressionIR value;

  KeyIR({
    required this.type,
    required this.value,
  });
}

enum KeyType {
  valueKey,
  objectKey,
  uniqueKey,
  globalKey,
  pageStorageKey,
}

