import '../Expression/expression_ir.dart';
import '../widget/widget_ir.dart';

abstract class StatementIR {
  final String id;
  final SourceLocationIR sourceLocation;

  StatementIR({
    required this.id,
    required this.sourceLocation,
  });
}

class BlockStatementIR extends StatementIR {
  final List<StatementIR> statements;

  BlockStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.statements,
  });
}

class ExpressionStatementIR extends StatementIR {
  final ExpressionIR expression;

  ExpressionStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.expression,
  });
}

class VariableDeclarationStatementIR extends StatementIR {
  final List<LocalVariableIR> variables;

  VariableDeclarationStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.variables,
  });
}

class IfStatementIR extends StatementIR {
  final ExpressionIR condition;
  final StatementIR thenStatement;
  final StatementIR? elseStatement;

  IfStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.condition,
    required this.thenStatement,
    this.elseStatement,
  });
}

class ForStatementIR extends StatementIR {
  final List<LocalVariableIR>? variables;
  final ExpressionIR? initialization;
  final ExpressionIR? condition;
  final List<ExpressionIR> updaters;
  final StatementIR body;

  ForStatementIR({
    required super.id,
    required super.sourceLocation,
    this.variables,
    this.initialization,
    this.condition,
    this.updaters = const [],
    required this.body,
  });
}

class ForEachStatementIR extends StatementIR {
  final String loopVariable;
  final TypeIR variableType;
  final ExpressionIR iterable;
  final StatementIR body;
  final bool isAsync;

  ForEachStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.loopVariable,
    required this.variableType,
    required this.iterable,
    required this.body,
    this.isAsync = false,
  });
}

class WhileStatementIR extends StatementIR {
  final ExpressionIR condition;
  final StatementIR body;

  WhileStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.condition,
    required this.body,
  });
}

// ============================================================================
// CONTINUATION FROM FIRST DOCUMENT - COMPLETING THE IR SCHEMA
// ============================================================================

// -----------------------------------------------------------------------------
// Statement IR (Continued from DoWhileStatementIR)
// -----------------------------------------------------------------------------

class DoWhileStatementIR extends StatementIR {
  final StatementIR body;
  final ExpressionIR condition;

  DoWhileStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.body,
    required this.condition,
  });
}

class SwitchStatementIR extends StatementIR {
  final ExpressionIR expression;
  final List<SwitchCaseIR> cases;
  final List<StatementIR>? defaultStatements;

  SwitchStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.expression,
    required this.cases,
    this.defaultStatements,
  });
}

class SwitchCaseIR {
  final List<ExpressionIR> expressions;
  final List<StatementIR> statements;
  final SourceLocationIR sourceLocation;

  SwitchCaseIR({
    required this.expressions,
    required this.statements,
    required this.sourceLocation,
  });
}

class TryStatementIR extends StatementIR {
  final StatementIR body;
  final List<CatchClauseIR> catchClauses;
  final StatementIR? finallyBlock;

  TryStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.body,
    required this.catchClauses,
    this.finallyBlock,
  });
}

class CatchClauseIR {
  final TypeIR? exceptionType;
  final String? exceptionParameter;
  final String? stackTraceParameter;
  final StatementIR body;
  final SourceLocationIR sourceLocation;

  CatchClauseIR({
    this.exceptionType,
    this.exceptionParameter,
    this.stackTraceParameter,
    required this.body,
    required this.sourceLocation,
  });
}

class ReturnStatementIR extends StatementIR {
  final ExpressionIR? expression;

  ReturnStatementIR({
    required super.id,
    required super.sourceLocation,
    this.expression,
  });
}

class BreakStatementIR extends StatementIR {
  final String? label;

  BreakStatementIR({
    required super.id,
    required super.sourceLocation,
    this.label,
  });
}

class ContinueStatementIR extends StatementIR {
  final String? label;

  ContinueStatementIR({
    required super.id,
    required super.sourceLocation,
    this.label,
  });
}

class ThrowStatementIR extends StatementIR {
  final ExpressionIR expression;

  ThrowStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.expression,
  });
}

class AssertStatementIR extends StatementIR {
  final ExpressionIR condition;
  final ExpressionIR? message;

  AssertStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.condition,
    this.message,
  });
}

class YieldStatementIR extends StatementIR {
  final ExpressionIR expression;
  final bool isStar;

  YieldStatementIR({
    required super.id,
    required super.sourceLocation,
    required this.expression,
    this.isStar = false,
  });
}

// -----------------------------------------------------------------------------
// Type System IR
// -----------------------------------------------------------------------------

abstract class TypeIR {
  final String id;
  final String name;
  final bool isNullable;

  TypeIR({
    required this.id,
    required this.name,
    this.isNullable = false,
  });
}

class SimpleTypeIR extends TypeIR {
  final List<TypeIR> typeArguments;

  SimpleTypeIR({
    required super.id,
    required super.name,
    super.isNullable,
    this.typeArguments = const [],
  });
}

class FunctionTypeIR extends TypeIR {
  final TypeIR returnType;
  final List<ParameterIR> parameters;
  final List<TypeParameterIR> typeParameters;

  FunctionTypeIR({
    required super.id,
    required super.name,
    super.isNullable,
    required this.returnType,
    required this.parameters,
    this.typeParameters = const [],
  });
}

class GenericTypeIR extends TypeIR {
  final List<TypeIR> typeArguments;
  final List<TypeParameterIR> typeParameters;

  GenericTypeIR({
    required super.id,
    required super.name,
    super.isNullable,
    required this.typeArguments,
    this.typeParameters = const [],
  });
}

class TypeParameterIR {
  final String name;
  final TypeIR? bound;

  TypeParameterIR({
    required this.name,
    this.bound,
  });
}

class DynamicTypeIR extends TypeIR {
  DynamicTypeIR({required super.id})
      : super(name: 'dynamic', isNullable: true);
}

class VoidTypeIR extends TypeIR {
  VoidTypeIR({required super.id})
      : super(name: 'void', isNullable: false);
}

class NeverTypeIR extends TypeIR {
  NeverTypeIR({required super.id})
      : super(name: 'Never', isNullable: false);
}

// -----------------------------------------------------------------------------
// State Management IR
// -----------------------------------------------------------------------------

class StateClassIR {
  final String id;
  final String name;
  final String widgetType;
  
  // State fields
  final List<StateFieldIR> stateFields;
  final List<FieldIR> regularFields;
  
  // Lifecycle methods
  final LifecycleMethodIR? initState;
  final LifecycleMethodIR? dispose;
  final LifecycleMethodIR? didUpdateWidget;
  final LifecycleMethodIR? didChangeDependencies;
  final LifecycleMethodIR? reassemble;
  
  // Build method
  final BuildMethodIR buildMethod;
  
  // setState tracking
  final List<SetStateCallIR> setStateCalls;
  
  // Controller management
  final List<ControllerIR> controllers;
  
  // Context dependencies
  final List<ContextDependencyIR> contextDependencies;
  
  // Mixins
  final List<MixinIR> mixins;
  
  // Source location
  final SourceLocationIR sourceLocation;

  StateClassIR({
    required this.id,
    required this.name,
    required this.widgetType,
    required this.stateFields,
    required this.regularFields,
    this.initState,
    this.dispose,
    this.didUpdateWidget,
    this.didChangeDependencies,
    this.reassemble,
    required this.buildMethod,
    required this.setStateCalls,
    required this.controllers,
    required this.contextDependencies,
    required this.mixins,
    required this.sourceLocation,
  });
}

class StateFieldIR {
  final String name;
  final TypeIR type;
  final ExpressionIR? initializer;
  final bool isMutable;
  final bool isLate;
  final List<String> affectedBy; // What setState calls modify this
  final List<String> affects; // What UI elements this impacts

  StateFieldIR({
    required this.name,
    required this.type,
    this.initializer,
    required this.isMutable,
    this.isLate = false,
    this.affectedBy = const [],
    this.affects = const [],
  });
}

class LifecycleMethodIR {
  final LifecycleType type;
  final List<StatementIR> statements;
  final List<String> capturedVariables;
  final List<MethodCallExpressionIR> superCalls;
  final SourceLocationIR sourceLocation;

  LifecycleMethodIR({
    required this.type,
    required this.statements,
    required this.capturedVariables,
    required this.superCalls,
    required this.sourceLocation,
  });
}

enum LifecycleType {
  initState,
  dispose,
  didUpdateWidget,
  didChangeDependencies,
  reassemble,
  deactivate,
  activate,
}

class SetStateCallIR {
  final String id;
  final ExpressionIR callback;
  final List<String> modifiedVariables;
  final List<String> affectedProperties;
  final bool isAsync;
  final SourceLocationIR sourceLocation;

  SetStateCallIR({
    required this.id,
    required this.callback,
    required this.modifiedVariables,
    required this.affectedProperties,
    this.isAsync = false,
    required this.sourceLocation,
  });
}

class ControllerIR {
  final String name;
  final ControllerType type;
  final ExpressionIR initialization;
  final bool isDisposedInDispose;
  final List<String> usedIn; // Method names where it's used

  ControllerIR({
    required this.name,
    required this.type,
    required this.initialization,
    required this.isDisposedInDispose,
    required this.usedIn,
  });
}

enum ControllerType {
  animation,
  text,
  scroll,
  page,
  tab,
  video,
  custom,
}

class ContextDependencyIR {
  final ContextDependencyType type;
  final String accessPattern; // e.g., "Theme.of(context).primaryColor"
  final List<String> accessedProperties;
  final SourceLocationIR sourceLocation;

  ContextDependencyIR({
    required this.type,
    required this.accessPattern,
    required this.accessedProperties,
    required this.sourceLocation,
  });
}

enum ContextDependencyType {
  theme,
  mediaQuery,
  navigator,
  scaffold,
  focusScope,
  inheritedWidget,
  provider,
}

class MixinIR {
  final String name;
  final MixinType type;
  final List<String> providedMembers;

  MixinIR({
    required this.name,
    required this.type,
    required this.providedMembers,
  });
}

enum MixinType {
  tickerProvider,
  singleTickerProvider,
  widgetsBinding,
  automaticKeepAlive,
  custom,
}

// -----------------------------------------------------------------------------
// Reactivity and State Flow IR
// -----------------------------------------------------------------------------

class ReactivityInfoIR {
  final List<ReactivityTrigger> triggers;
  final List<String> affectedProperties;
  final bool propagatesToChildren;
  final ReactivityGraphIR? reactivityGraph;

  ReactivityInfoIR({
    required this.triggers,
    required this.affectedProperties,
    required this.propagatesToChildren,
    this.reactivityGraph,
  });
}

class ReactivityTrigger {
  final String source;
  final List<String> variables;
  final TriggerType type;

  ReactivityTrigger({
    required this.source,
    required this.variables,
    required this.type,
  });
}

enum TriggerType {
  setState,
  providerUpdate,
  inheritedWidgetChange,
  streamUpdate,
  futureCompletion,
  animationTick,
  userInput,
}

class ReactivityGraphIR {
  final List<ReactivityNodeIR> nodes;
  final List<ReactivityEdgeIR> edges;

  ReactivityGraphIR({
    required this.nodes,
    required this.edges,
  });
}

class ReactivityNodeIR {
  final String id;
  final String name;
  final ReactivityNodeType type;

  ReactivityNodeIR({
    required this.id,
    required this.name,
    required this.type,
  });
}

enum ReactivityNodeType {
  stateVariable,
  property,
  widgetInstance,
  controller,
  stream,
  future,
}

class ReactivityEdgeIR {
  final String fromId;
  final String toId;
  final ReactivityRelation relation;

  ReactivityEdgeIR({
    required this.fromId,
    required this.toId,
    required this.relation,
  });
}

enum ReactivityRelation {
  modifies,
  dependsOn,
  triggers,
  subscribes,
}

class StateBindingIR {
  final String stateClassName;
  final List<PropertyBindingIR> propertyBindings;
  final List<CallbackBindingIR> callbackBindings;

  StateBindingIR({
    required this.stateClassName,
    required this.propertyBindings,
    required this.callbackBindings,
  });
}

class PropertyBindingIR {
  final String propertyName;
  final String stateField;
  final bool isTwoWay;

  PropertyBindingIR({
    required this.propertyName,
    required this.stateField,
    this.isTwoWay = false,
  });
}

class CallbackBindingIR {
  final String callbackName;
  final String methodName;
  final bool triggersSetState;

  CallbackBindingIR({
    required this.callbackName,
    required this.methodName,
    this.triggersSetState = false,
  });
}

// -----------------------------------------------------------------------------
// Navigation IR
// -----------------------------------------------------------------------------

class NavigationIR {
  final List<RouteIR> routes;
  final List<NavigationCallIR> navigationCalls;
  final RouteGeneratorIR? routeGenerator;
  final String? initialRoute;

  NavigationIR({
    required this.routes,
    required this.navigationCalls,
    this.routeGenerator,
    this.initialRoute,
  });
}

class RouteIR {
  final String id;
  final String name;
  final String? path;
  final WidgetIR widgetBuilder;
  final List<RouteParameterIR> parameters;
  final bool fullscreenDialog;
  final bool maintainState;
  final TransitionIR? transition;

  RouteIR({
    required this.id,
    required this.name,
    this.path,
    required this.widgetBuilder,
    this.parameters = const [],
    this.fullscreenDialog = false,
    this.maintainState = true,
    this.transition,
  });
}

class RouteParameterIR {
  final String name;
  final TypeIR type;
  final bool isRequired;
  final ExpressionIR? defaultValue;

  RouteParameterIR({
    required this.name,
    required this.type,
    this.isRequired = false,
    this.defaultValue,
  });
}

class NavigationCallIR {
  final String id;
  final NavigationType type;
  final String? routeName;
  final Map<String, ExpressionIR> arguments;
  final ExpressionIR? routeBuilder;
  final SourceLocationIR sourceLocation;

  NavigationCallIR({
    required this.id,
    required this.type,
    this.routeName,
    this.arguments = const {},
    this.routeBuilder,
    required this.sourceLocation,
  });
}

enum NavigationType {
  push,
  pop,
  pushNamed,
  pushReplacement,
  pushReplacementNamed,
  pushAndRemoveUntil,
  popUntil,
  canPop,
  maybePop,
}

class TransitionIR {
  final TransitionType type;
  final Duration duration;
  final CurveIR curve;

  TransitionIR({
    required this.type,
    required this.duration,
    required this.curve,
  });
}

enum TransitionType {
  fade,
  slide,
  scale,
  rotation,
  size,
  custom,
}

class RouteGeneratorIR {
  final FunctionIR generator;
  final List<RouteIR> generatedRoutes;

  RouteGeneratorIR({
    required this.generator,
    required this.generatedRoutes,
  });
}

// -----------------------------------------------------------------------------
// Animation IR
// -----------------------------------------------------------------------------

class AnimationIR {
  final String id;
  final String name;
  final AnimationType type;
  final AnimationControllerIR? controller;
  final TweenIR? tween;
  final CurveIR? curve;
  final Duration? duration;
  final List<AnimationListenerIR> listeners;
  final List<AnimationStatusListenerIR> statusListeners;

  AnimationIR({
    required this.id,
    required this.name,
    required this.type,
    this.controller,
    this.tween,
    this.curve,
    this.duration,
    this.listeners = const [],
    this.statusListeners = const [],
  });
}

enum AnimationType {
  explicit,
  implicit,
  hero,
  pageRoute,
  custom,
}

class AnimationControllerIR {
  final String name;
  final Duration duration;
  final Duration? reverseDuration;
  final double? lowerBound;
  final double? upperBound;
  final double? initialValue;
  final String? vsyncProvider;
  final bool isDisposed;

  AnimationControllerIR({
    required this.name,
    required this.duration,
    this.reverseDuration,
    this.lowerBound,
    this.upperBound,
    this.initialValue,
    this.vsyncProvider,
    this.isDisposed = false,
  });
}

class TweenIR {
  final TypeIR valueType;
  final ExpressionIR begin;
  final ExpressionIR end;
  final TweenType type;

  TweenIR({
    required this.valueType,
    required this.begin,
    required this.end,
    required this.type,
  });
}

enum TweenType {
  basic,
  colorTween,
  sizeTween,
  rectTween,
  decorationTween,
  textStyleTween,
  custom,
}

class CurveIR {
  final CurveType type;
  final List<double>? customValues;

  CurveIR({
    required this.type,
    this.customValues,
  });
}

enum CurveType {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  fastOutSlowIn,
  bounceIn,
  bounceOut,
  elasticIn,
  elasticOut,
  custom,
}

class AnimationListenerIR {
  final FunctionExpressionIR callback;
  final SourceLocationIR sourceLocation;

  AnimationListenerIR({
    required this.callback,
    required this.sourceLocation,
  });
}

class AnimationStatusListenerIR {
  final FunctionExpressionIR callback;
  final SourceLocationIR sourceLocation;

  AnimationStatusListenerIR({
    required this.callback,
    required this.sourceLocation,
  });
}

// -----------------------------------------------------------------------------
// Async IR
// -----------------------------------------------------------------------------

class AsyncOperationIR {
  final String id;
  final AsyncType type;
  final ExpressionIR expression;
  final bool isInAsyncFunction;
  final List<String> capturedVariables;
  final SourceLocationIR sourceLocation;

  AsyncOperationIR({
    required this.id,
    required this.type,
    required this.expression,
    required this.isInAsyncFunction,
    required this.capturedVariables,
    required this.sourceLocation,
  });
}

enum AsyncType {
  future,
  stream,
  futureBuilder,
  streamBuilder,
  awaitExpression,
  asyncFunction,
}

class FutureBuilderIR {
  final ExpressionIR future;
  final FunctionExpressionIR builder;
  final ExpressionIR? initialData;
  final List<String> capturedVariables;

  FutureBuilderIR({
    required this.future,
    required this.builder,
    this.initialData,
    required this.capturedVariables,
  });
}

class StreamBuilderIR {
  final ExpressionIR stream;
  final FunctionExpressionIR builder;
  final ExpressionIR? initialData;
  final List<String> capturedVariables;

  StreamBuilderIR({
    required this.stream,
    required this.builder,
    this.initialData,
    required this.capturedVariables,
  });
}

class StreamSubscriptionIR {
  final String name;
  final ExpressionIR stream;
  final FunctionExpressionIR onData;
  final FunctionExpressionIR? onError;
  final FunctionExpressionIR? onDone;
  final bool cancelOnError;
  final bool isDisposed;

  StreamSubscriptionIR({
    required this.name,
    required this.stream,
    required this.onData,
    this.onError,
    this.onDone,
    this.cancelOnError = false,
    this.isDisposed = false,
  });
}

// -----------------------------------------------------------------------------
// Event Handling IR
// -----------------------------------------------------------------------------

class EventHandlerIR {
  final String id;
  final String name;
  final EventType type;
  final FunctionExpressionIR handler;
  final List<String> capturedVariables;
  final bool triggersSetState;
  final List<String> modifiedStateVariables;
  final SourceLocationIR sourceLocation;

  EventHandlerIR({
    required this.id,
    required this.name,
    required this.type,
    required this.handler,
    required this.capturedVariables,
    this.triggersSetState = false,
    this.modifiedStateVariables = const [],
    required this.sourceLocation,
  });
}

enum EventType {
  tap,
  longPress,
  doubleTap,
  pan,
  scale,
  drag,
  hover,
  focus,
  textChange,
  formSubmit,
  custom,
}

class GestureDetectorIR {
  final Map<GestureType, EventHandlerIR> gestures;
  final HitTestBehavior? behavior;
  final bool excludeFromSemantics;

  GestureDetectorIR({
    required this.gestures,
    this.behavior,
    this.excludeFromSemantics = false,
  });
}

enum GestureType {
  onTap,
  onTapDown,
  onTapUp,
  onTapCancel,
  onDoubleTap,
  onLongPress,
  onLongPressStart,
  onLongPressEnd,
  onPanStart,
  onPanUpdate,
  onPanEnd,
  onScaleStart,
  onScaleUpdate,
  onScaleEnd,
}

enum HitTestBehavior {
  deferToChild,
  opaque,
  translucent,
}

// -----------------------------------------------------------------------------
// Layout IR
// -----------------------------------------------------------------------------

class LayoutIR {
  final LayoutType type;
  final Map<String, ExpressionIR> constraints;
  final AlignmentIR? alignment;
  final List<FlexChildIR>? flexChildren;
  final StackLayoutIR? stackLayout;

  LayoutIR({
    required this.type,
    this.constraints = const {},
    this.alignment,
    this.flexChildren,
    this.stackLayout,
  });
}

enum LayoutType {
  container,
  row,
  column,
  stack,
  positioned,
  flex,
  wrap,
  grid,
  sliverList,
  sliverGrid,
  custom,
}

class AlignmentIR {
  final double x;
  final double y;
  final AlignmentType type;

  AlignmentIR({
    required this.x,
    required this.y,
    required this.type,
  });
}

enum AlignmentType {
  topLeft,
  topCenter,
  topRight,
  centerLeft,
  center,
  centerRight,
  bottomLeft,
  bottomCenter,
  bottomRight,
  custom,
}

class FlexChildIR {
  final WidgetNodeIR child;
  final int? flex;
  final FlexFit? fit;

  FlexChildIR({
    required this.child,
    this.flex,
    this.fit,
  });
}

enum FlexFit {
  tight,
  loose,
}

class StackLayoutIR {
  final List<PositionedChildIR> children;
  final AlignmentIR alignment;
  final StackFit fit;

  StackLayoutIR({
    required this.children,
    required this.alignment,
    required this.fit,
  });
}

enum StackFit {
  loose,
  expand,
  passthrough,
}

class PositionedChildIR {
  final WidgetNodeIR child;
  final ExpressionIR? left;
  final ExpressionIR? top;
  final ExpressionIR? right;
  final ExpressionIR? bottom;
  final ExpressionIR? width;
  final ExpressionIR? height;

  PositionedChildIR({
    required this.child,
    this.left,
    this.top,
    this.right,
    this.bottom,
    this.width,
    this.height,
  });
}

// -----------------------------------------------------------------------------
// Theme IR
// -----------------------------------------------------------------------------

class ThemeIR {
  final String id;
  final ColorSchemeIR colorScheme;
  final TextThemeIR textTheme;
  final Map<String, dynamic> customProperties;
  final ThemeModeIR mode;

  ThemeIR({
    required this.id,
    required this.colorScheme,
    required this.textTheme,
    this.customProperties = const {},
    required this.mode,
  });
}

enum ThemeModeIR {
  light,
  dark,
  system,
}

class ColorSchemeIR {
  final String primary;
  final String secondary;
  final String background;
  final String surface;
  final String error;
  final String onPrimary;
  final String onSecondary;
  final String onBackground;
  final String onSurface;
  final String onError;

  ColorSchemeIR({
    required this.primary,
    required this.secondary,
    required this.background,
    required this.surface,
    required this.error,
    required this.onPrimary,
    required this.onSecondary,
    required this.onBackground,
    required this.onSurface,
    required this.onError,
  });
}

class TextThemeIR {
  final Map<TextStyleType, TextStyleIR> styles;

  TextThemeIR({required this.styles});
}

enum TextStyleType {
  displayLarge,
  displayMedium,
  displaySmall,
  headlineLarge,
  headlineMedium,
  headlineSmall,
  titleLarge,
  titleMedium,
  titleSmall,
  bodyLarge,
  bodyMedium,
  bodySmall,
  labelLarge,
  labelMedium,
  labelSmall,
}

class TextStyleIR {
  final String? fontFamily;
  final double? fontSize;
  final FontWeight? fontWeight;
  final FontStyle? fontStyle;
  final String? color;
  final double? letterSpacing;
  final double? wordSpacing;
  final double? height;

  TextStyleIR({
    this.fontFamily,
    this.fontSize,
    this.fontWeight,
    this.fontStyle,
    this.color,
    this.letterSpacing,
    this.wordSpacing,
    this.height,
  });
}

enum FontWeight {
  w100,
  w200,
  w300,
  w400,
  w500,
  w600,
  w700,
  w800,
  w900,
}

enum FontStyle {
  normal,
  italic,
}

// -----------------------------------------------------------------------------
// Provider/State Management IR
// -----------------------------------------------------------------------------

class ProviderIR {
  final String id;
  final String name;
  final ProviderType type;
  final TypeIR valueType;
  final List<FieldIR> fields;
  final List<MethodIR> methods;
  final List<NotifyListenerCallIR> notifyListenerCalls;
  final bool extendsChangeNotifier;

  ProviderIR({
    required this.id,
    required this.name,
    required this.type,
    required this.valueType,
    required this.fields,
    required this.methods,
    required this.notifyListenerCalls,
    this.extendsChangeNotifier = false,
  });
}

enum ProviderType {
  changeNotifier,
  valueNotifier,
  stateNotifier,
  inheritedWidget,
  bloc,
  cubit,
  value,
  stream,
  future,
  proxy,
  custom,
}

class NotifyListenerCallIR {
  final String methodName;
  final List<String> modifiedFields;
  final SourceLocationIR sourceLocation;

  NotifyListenerCallIR({
    required this.methodName,
    required this.modifiedFields,
    required this.sourceLocation,
  });
}

class ProviderUsageIR {
  final ProviderAccessType accessType;
  final String providerName;
  final TypeIR providerType;
  final List<String> accessedProperties;
  final bool triggersRebuild;
  final SourceLocationIR sourceLocation;

  ProviderUsageIR({
    required this.accessType,
    required this.providerName,
    required this.providerType,
    required this.accessedProperties,
    this.triggersRebuild = true,
    required this.sourceLocation,
  });
}

enum ProviderAccessType {
  watch,
  read,
  select,
  consumer,
}

// -----------------------------------------------------------------------------
// Function IR
// -----------------------------------------------------------------------------

class FunctionIR {
  final String id;
  final String name;
  final List<ParameterIR> parameters;
  final TypeIR returnType;
  final StatementIR? body;
  final ExpressionIR? expressionBody;
  final bool isAsync;
  final bool isGenerator;
  final bool isStatic;
  final List<TypeParameterIR> typeParameters;
  final List<String> capturedVariables;
  final SourceLocationIR sourceLocation;

  FunctionIR({
    required this.id,
    required this.name,
    required this.parameters,
    required this.returnType,
    this.body,
    this.expressionBody,
    this.isAsync = false,
    this.isGenerator = false,
    this.isStatic = false,
    this.typeParameters = const [],
    this.capturedVariables = const [],
    required this.sourceLocation,
  });
}
