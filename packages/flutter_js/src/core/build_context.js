import { StatefulElement } from './widget.js';
import { DiagnosticsTreeStyle } from './widget.js';

/**
 * BuildContext - Access point to Element and widget tree operations
 * 
 * Every widget has an associated BuildContext. The context provides
 * access to the widget tree, ancestor widgets, and framework services.
 */
class BuildContext {
  constructor(element) {
    if (!element) {
      throw new Error('BuildContext requires an element');
    }

    this._element = element;
    this._inherited = new Map();    // Inherited widgets cache
    this._debugDoingBuild = false;  // Track if currently building
    this._mounted = true;
  }

  // =========================================================================
  // CORE PROPERTIES
  // =========================================================================

  /**
   * The Element that this context is associated with
   */
  get element() {
    return this._element;
  }

  /**
   * The Widget for this context
   */
  get widget() {
    return this._element?.widget;
  }

  /**
   * Whether this context is currently mounted in the widget tree
   */
  get mounted() {
    if (!this._mounted) {
      return false;
    }
    return this._element?._mounted ?? false;
  }

  /**
   * Whether the widget is currently building
   * Useful for detecting improper API usage (e.g., calling context methods in constructor)
   */
  get debugDoingBuild() {
    return this._debugDoingBuild;
  }

  /**
   * Mark that we're entering build phase
   * Called by Element.performRebuild()
   * @internal
   */
  _markBuildStart() {
    this._debugDoingBuild = true;
  }

  /**
   * Mark that we're exiting build phase
   * Called by Element after performRebuild()
   * @internal
   */
  _markBuildEnd() {
    this._debugDoingBuild = false;
  }

  /**
   * Mark context as unmounted
   * @internal
   */
  _markUnmounted() {
    this._mounted = false;
  }

  // =========================================================================
  // WIDGET TREE TRAVERSAL
  // =========================================================================

  /**
   * Find the nearest ancestor widget of exact type T
   * Returns null if not found
   * 
   * Usage: context.findAncestorWidgetOfExactType(MyWidget)
   */
  findAncestorWidgetOfExactType(widgetType) {
    if (!widgetType) {
      throw new Error('widgetType cannot be null');
    }

    if (process.env.NODE_ENV === 'development') {
      if (!this.mounted) {
        console.warn(
          'BuildContext.findAncestorWidgetOfExactType called on unmounted context. ' +
          'This is likely an error.'
        );
      }
    }

    let current = this._element._parent;
    while (current) {
      if (current.widget?.constructor === widgetType) {
        return current.widget;
      }
      current = current._parent;
    }
    return null;
  }

  /**
   * Find the nearest ancestor widget of type T (including subclasses)
   * Returns null if not found
   * 
   * Usage: context.findAncestorWidgetOfType(MyWidgetBase)
   */
  findAncestorWidgetOfType(widgetType) {
    if (!widgetType) {
      throw new Error('widgetType cannot be null');
    }

    if (process.env.NODE_ENV === 'development') {
      if (!this.mounted) {
        console.warn(
          'BuildContext.findAncestorWidgetOfType called on unmounted context. ' +
          'This is likely an error.'
        );
      }
    }

    let current = this._element._parent;
    while (current) {
      if (current.widget instanceof widgetType) {
        return current.widget;
      }
      current = current._parent;
    }
    return null;
  }

  /**
   * Find the State object of the nearest ancestor StatefulWidget
   * Returns null if not found
   * 
   * Usage: context.findAncestorStateOfType(MyState)
   */
  findAncestorStateOfType(stateType) {
    if (!stateType) {
      throw new Error('stateType cannot be null');
    }

    if (process.env.NODE_ENV === 'development') {
      if (!this.mounted) {
        console.warn(
          'BuildContext.findAncestorStateOfType called on unmounted context. ' +
          'This is likely an error.'
        );
      }
    }

    let current = this._element._parent;
    while (current) {
      if (current instanceof StatefulElement && current.state instanceof stateType) {
        return current.state;
      }
      current = current._parent;
    }
    return null;
  }

  /**
   * Visit all ancestor elements, calling visitor for each
   * Visitor should return true to continue, false to stop
   * 
   * Usage:
   * context.visitAncestorElements((ancestorContext) => {
   *   console.log(ancestorContext.widget);
   *   return true; // continue visiting
   * });
   */
  visitAncestorElements(visitor) {
    if (typeof visitor !== 'function') {
      throw new Error('visitor must be a function');
    }

    let current = this._element._parent;
    while (current) {
      const context = new BuildContext(current);
      if (!visitor(context)) {
        break;
      }
      current = current._parent;
    }
  }

  /**
   * Visit all child elements, calling visitor for each
   * 
   * Usage:
   * context.visitChildElements((childContext) => {
   *   console.log(childContext.widget);
   * });
   */
  visitChildElements(visitor) {
    if (typeof visitor !== 'function') {
      throw new Error('visitor must be a function');
    }

    if (this._element._children) {
      for (const child of this._element._children) {
        const context = new BuildContext(child);
        visitor(context);
      }
    }
  }

  // =========================================================================
  // BUILD & LIFECYCLE
  // =========================================================================

  /**
   * Request this widget to be rebuilt
   * Schedules a rebuild in the next frame
   */
  requestRebuild() {
    if (!this.mounted) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          'BuildContext.requestRebuild() called on unmounted context. ' +
          'The rebuild request will be ignored.'
        );
      }
      return;
    }

    this._element?.markNeedsBuild();
  }

  // =========================================================================
  // DIAGNOSTICS & DEBUGGING
  // =========================================================================

  /**
   * Get the widget tree path for debugging
   * Example: "App > MaterialApp > Scaffold > Column > MyWidget"
   */
  getWidgetPath() {
    const path = [];
    let current = this._element;
    while (current) {
      const name = current.widget?.constructor?.name ?? 'Root';
      path.unshift(name);
      current = current._parent;
    }
    return path.join(' > ');
  }

  /**
   * Get detailed diagnostic info about this context
   * Used for error reporting and debugging
   */
  describeContext() {
    return {
      widget: this.widget?.constructor?.name,
      path: this.getWidgetPath(),
      mounted: this.mounted,
      depth: this._element?._depth ?? 0,
      childCount: this._element?._children?.length ?? 0,
      debugInfo: this._element?.debugInfo?.()
    };
  }

  /**
   * Describe this element as a DiagnosticsNode
   * Used for error messages and debugging tools
   */
  describeElement(name = 'Element', style = DiagnosticsTreeStyle.errorProperty) {
    return {
      name,
      value: this._element,
      style: style,
      description: `${this._element?._debugLabel} (depth: ${this._element?._depth})`,
      type: 'DiagnosticsNode'
    };
  }

  /**
   * Describe the widget as a DiagnosticsNode
   * Used for error messages and debugging tools
   */
  describeWidget(name = 'Widget', style = DiagnosticsTreeStyle.errorProperty) {
    return {
      name,
      value: this.widget,
      style: style,
      description: this.widget?.toStringShort?.() ?? 'Unknown',
      type: 'DiagnosticsNode'
    };
  }

  /**
   * Describe missing ancestor type for error messages
   */
  describeMissingAncestor(expectedType) {
    if (!expectedType) {
      throw new Error('expectedType is required');
    }

    const path = this.getWidgetPath();
    const message = `Could not find ancestor of type ${expectedType.name}. ` +
      `Current path: ${path}`;

    return {
      name: 'MissingAncestor',
      value: null,
      description: message,
      type: 'DiagnosticsNode'
    };
  }

  /**
   * Get full diagnostics tree for this context
   * Useful for debugging complex widget trees
   */
  getDiagnosticsTree() {
    return {
      widget: this.widget?.debugInfo?.(),
      element: this._element?.debugInfo?.(),
      path: this.getWidgetPath(),
      ancestors: this._getAncestorDiagnostics(5), // Last 5 ancestors
      children: this._getChildrenDiagnostics()
    };
  }

  /**
   * Get diagnostics for ancestors
   * @private
   */
  _getAncestorDiagnostics(maxCount) {
    const ancestors = [];
    let current = this._element._parent;
    let count = 0;

    while (current && count < maxCount) {
      ancestors.push({
        name: current.widget?.constructor?.name,
        debugInfo: current.debugInfo?.()
      });
      current = current._parent;
      count++;
    }

    return ancestors;
  }

  /**
   * Get diagnostics for children
   * @private
   */
  _getChildrenDiagnostics() {
    if (!this._element._children) {
      return [];
    }

    return this._element._children.map(child => ({
      name: child.widget?.constructor?.name,
      debugInfo: child.debugInfo?.()
    }));
  }

  // =========================================================================
  // ASSERTIONS & VALIDATION (Development-only)
  // =========================================================================

  /**
   * Assert that context is mounted
   * Used in build methods to catch errors
   */
  assertMounted(apiName) {
    if (!this.mounted) {
      throw new Error(
        `${apiName} was called on a BuildContext that is no longer valid. ` +
        `This typically means the widget was removed from the tree after ` +
        `the build context was saved, but before the build method was called.`
      );
    }
  }

  /**
   * Assert that we're in a build phase
   * Prevents calling certain APIs in wrong lifecycle phases
   */
  assertBuild(apiName) {
    if (!this.debugDoingBuild) {
      console.warn(
        `${apiName} should typically only be called during build. ` +
        `This call is happening outside of a build context.`
      );
    }
  }
}

export { BuildContext };