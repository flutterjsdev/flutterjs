// ============================================================================
// CONTEXT TRACKING
// ============================================================================

class GenerationContext {
  /// Current class being generated
  dynamic currentClass;

  /// Current method being generated
  dynamic currentMethod;

  /// Current function being generated
  dynamic currentFunction;

  /// True if inside build() method
  bool inBuildMethod = false;

  /// True if inside async context
  bool inAsyncContext = false;

  /// True if inside StatefulWidget
  bool inStatefulWidget = false;

  /// Current block nesting depth
  int blockDepth = 0;

  /// Widget/element depth in build tree
  int widgetTreeDepth = 0;

  void enterClass(dynamic cls) {
    currentClass = cls;
    inStatefulWidget =
        cls.superclass?.toString().contains('StatefulWidget') ?? false;
  }

  void exitClass() {
    currentClass = null;
    inStatefulWidget = false;
  }

  void enterMethod(dynamic method) {
    currentMethod = method;
    inBuildMethod = method.name == 'build';
    inAsyncContext = method.isAsync ?? false;
  }

  void exitMethod() {
    currentMethod = null;
    inBuildMethod = false;
    inAsyncContext = false;
  }

  void enterFunction(dynamic func) {
    currentFunction = func;
    inAsyncContext = func.isAsync ?? false;
  }

  void exitFunction() {
    currentFunction = null;
    inAsyncContext = false;
  }

  void enterBlock() => blockDepth++;
  void exitBlock() => blockDepth = (blockDepth - 1).clamp(0, blockDepth);

  void enterWidgetTree() => widgetTreeDepth++;
  void exitWidgetTree() => widgetTreeDepth = (widgetTreeDepth - 1).clamp(0, widgetTreeDepth);

  bool isInStatefulWidget() => inStatefulWidget;
  bool isInBuildMethod() => inBuildMethod;
  bool canUseAwait() => inAsyncContext;
  String? getThisPrefix() => currentClass != null ? 'this.' : null;
}