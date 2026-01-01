/**
 * VNodeBuilder - WITH COMPREHENSIVE ERROR HANDLING
 * Properly converts Widget → Element → VNode
 * 
 * Features:
 * - Detailed error messages with context
 * - Stack trace preservation
 * - Helpful suggestions
 * - Error recovery attempts
 * - Debug logging
 */
import { VNode } from './vnode.js';
import { StyleConverter } from './style_converter.js';
import { StatelessElement, StatefulElement } from '@flutterjs/runtime/element';
import { InheritedElement } from '@flutterjs/runtime/inherited_element';

class VNodeBuilder {
  constructor(options = {}) {
    this.debugMode = options.debugMode || false;
    this.runtime = options.runtime;
    this.buildStack = [];  // Track build hierarchy for error messages

    if (this.debugMode && !this.runtime) {
      console.warn('[VNodeBuilder] ⚠️ No runtime provided - Element creation will fail');
    }
  }

  /**
   * Build VNode tree from widget
   * @param {Widget} widget - Flutter widget instance
   * @param {BuildContext} context - Build context with runtime
   * @returns {VNode|string|null} VNode tree or text content
   */
  /**
 * VNodeBuilder - FIXED build() method
 * Key fix: Check StatefulWidget BEFORE StatelessWidget
 */

  build(widget, context = {}) {
    const buildPath = this.buildStack.join(' → ');
    const indent = '  '.repeat(this.buildStack.length);

    try {
      if (this.debugMode) {
        console.log('='.repeat(80));
        console.log(`${indent}🔧 VNodeBuilder.build() START`);
        console.log(`${indent}  Build Path: ${buildPath || 'ROOT'}`);
        console.log(`${indent}  Input Type: ${typeof widget}`);
        console.log(`${indent}  Constructor: ${widget?.constructor?.name || 'N/A'}`);
        console.log(`${indent}  Has build: ${typeof widget?.build === 'function'}`);
        console.log(`${indent}  Has createState: ${typeof widget?.createState === 'function'}`);
        console.log(`${indent}  Has tag: ${widget?.tag !== undefined}`);
        console.log(`${indent}  Runtime: ${!!this.runtime ? '✔' : '✗'}`);
        console.log('='.repeat(80));
      }

      // Handle null/undefined
      if (!widget) {
        if (this.debugMode) {
          console.warn(`${indent}⚠️ Widget is null/undefined`);
        }
        return null;
      }

      // If already a VNode, return as-is
      if (widget && typeof widget === 'object' && widget.tag) {
        if (this.debugMode) {
          console.log(`${indent}✔ Already a VNode (tag: ${widget.tag}), returning`);
        }
        return widget;
      }

      // Handle text strings directly
      if (typeof widget === 'string') {
        if (this.debugMode) {
          console.log(`${indent}✔ Text node: "${widget.substring(0, 50)}${widget.length > 50 ? '...' : ''}"`);
        }
        return widget;
      }

      // Handle numbers
      if (typeof widget === 'number') {
        if (this.debugMode) {
          console.log(`${indent}✔ Number node: ${widget}`);
        }
        return String(widget);
      }

      // Handle booleans (render nothing)
      if (typeof widget === 'boolean') {
        if (this.debugMode) {
          console.log(`${indent}✔ Boolean node (renders nothing)`);
        }
        return null;
      }

      // ✅ Ensure runtime is in context
      if (!context.runtime && this.runtime) {
        context.runtime = this.runtime;
        if (this.debugMode) {
          console.log(`${indent}✔ Injected runtime into context`);
        }
      }

      // Validate runtime before proceeding
      if (!this.runtime) {
        throw this.createError(
          'MISSING_RUNTIME',
          'VNodeBuilder requires a runtime instance',
          {
            suggestion: 'Pass runtime to VNodeBuilder constructor: new VNodeBuilder({ runtime: this })',
            context: { widgetType: widget?.constructor?.name }
          }
        );
      }

      // ✅ FIX: CHECK STATEFUL WIDGET FIRST (before StatelessWidget)
      // This is critical because StatefulWidget may also have a build() method
      if (typeof widget.createState === 'function') {
        if (this.debugMode) {
          console.log(`${indent}✅ DETECTED STATEFUL WIDGET: ${widget.constructor.name}`);
        }
        return this.buildStatefulWidget(widget, context, indent);
      }

      // ✅ THEN check for StatelessWidget
      if (typeof widget.build === 'function' && !widget.createState) {
        if (this.debugMode) {
          console.log(`${indent}✅ DETECTED STATELESS WIDGET: ${widget.constructor.name}`);
        }
        return this.buildStatelessWidget(widget, context, indent);
      }

      // ✅ INHERITED WIDGET
      if (widget.updateShouldNotify && typeof widget.updateShouldNotify === 'function') {
        if (this.debugMode) {
          console.log(`${indent}✅ DETECTED INHERITED WIDGET: ${widget.constructor.name}`);
        }
        return this.buildInheritedWidget(widget, context, indent);
      }

      // ✅ FALLBACK: Unknown widget type
      if (this.debugMode) {
        console.warn(`${indent}⚠️ Unknown widget type: ${widget.constructor?.name || typeof widget}`);
      }

      // Try to build as generic widget
      if (widget && typeof widget === 'object' && typeof widget.build === 'function') {
        if (this.debugMode) {
          console.warn(`${indent}⚠️ Widget escaped type checks, attempting recovery...`);
        }

        try {
          const element = new StatelessElement(widget, null, this.runtime);
          const builtResult = element.build();

          // Recursively build if result is still a widget
          if (builtResult && typeof builtResult === 'object' && typeof builtResult.build === 'function') {
            if (this.debugMode) {
              console.log(`${indent}✔ Recovery successful, recursively building...`);
            }
            return this.build(builtResult, context);
          }

          return builtResult;
        } catch (error) {
          throw this.createError(
            'RECOVERY_FAILED',
            'Failed to recover widget during generic build',
            {
              originalError: error.message,
              widgetType: widget.constructor.name,
              suggestion: 'Ensure widget implements build() or createState() correctly'
            }
          );
        }
      }

      // DEFAULT: Use generic builder
      if (this.debugMode) {
        console.log(`${indent}📦 Using generic widget builder`);
      }
      return this.buildGeneric(widget, context, indent);

    } catch (error) {
      // Enhanced error handling
      return this.handleBuildError(error, widget, context, indent);
    }
  }

  /**
   * Build a stateless widget
   * @private
   */
  buildStatelessWidget(widget, context, indent) {
    try {
      if (this.debugMode) {
        console.log(`${indent}📦 Building StatelessWidget: ${widget.constructor.name}`);
      }

      // Push to build stack
      this.buildStack.push(widget.constructor.name);

      try {
        // Create element
        const element = new StatelessElement(widget, context.parentElement || null, this.runtime);

        // Call widget.build()
        const builtWidget = element.build();

        if (!builtWidget) {
          throw this.createError(
            'BUILD_RETURNED_NULL',
            `${widget.constructor.name}.build() returned null`,
            {
              suggestion: 'build() must return a Widget or VNode, not null/undefined',
              widgetType: widget.constructor.name
            }
          );
        }

        if (this.debugMode) {
          console.log(`${indent}  Result Type: ${typeof builtWidget}`);
          console.log(`${indent}  Constructor: ${builtWidget?.constructor?.name}`);
          console.log(`${indent}  Has tag: ${builtWidget?.tag !== undefined}`);
        }

        // Check if it's a VNode
        if (builtWidget && typeof builtWidget === 'object' && builtWidget.tag) {
          if (this.debugMode) {
            console.log(`${indent}✔ Got VNode (tag: ${builtWidget.tag}), returning`);
          }
          return builtWidget;
        }

        // Check if it's a string/number
        if (typeof builtWidget === 'string' || typeof builtWidget === 'number') {
          if (this.debugMode) {
            console.log(`${indent}✔ Got primitive value, returning`);
          }
          return builtWidget;
        }

        // Check if it's another widget (recursively build)
        if (builtWidget && typeof builtWidget === 'object' && typeof builtWidget.build === 'function') {
          if (this.debugMode) {
            console.log(`${indent}🔄 Got nested Widget: ${builtWidget.constructor.name}, recursively building...`);
          }

          return this.build(builtWidget, {
            ...context,
            parentElement: element,
            runtime: this.runtime
          });
        }

        // Unknown return type
        throw this.createError(
          'UNKNOWN_BUILD_RESULT',
          `${widget.constructor.name}.build() returned unexpected type`,
          {
            receivedType: typeof builtWidget,
            receivedConstructor: builtWidget?.constructor?.name,
            suggestion: 'build() must return: Widget, VNode, string, number, or null',
            received: builtWidget
          }
        );

      } finally {
        // Pop from build stack
        this.buildStack.pop();
      }

    } catch (error) {
      throw this.wrapError(error, `StatelessWidget: ${widget.constructor.name}`);
    }
  }

  /**
   * Build a stateful widget
   * @private
   */
  buildStatefulWidget(widget, context, indent) {
    try {
      if (this.debugMode) {
        console.log(`${indent}📦 Building StatefulWidget: ${widget.constructor.name}`);
      }

      this.buildStack.push(widget.constructor.name);

      try {
        // Validate createState
        if (typeof widget.createState !== 'function') {
          throw this.createError(
            'NO_CREATE_STATE',
            `${widget.constructor.name} has createState but it's not a function`,
            {
              createStateType: typeof widget.createState,
              suggestion: 'Implement createState() method in your StatefulWidget'
            }
          );
        }

        // Create element
        const element = new StatefulElement(widget, context.parentElement || null, this.runtime);

        if (!element) {
          throw this.createError(
            'ELEMENT_CREATION_FAILED',
            `Failed to create StatefulElement for ${widget.constructor.name}`,
            {
              suggestion: 'Check that StatefulElement constructor accepts (widget, parent, runtime)'
            }
          );
        }

        // Mount to initialize state
        try {
          if (!element.mounted) {
            element.mount();
          }
        } catch (mountError) {
          throw this.createError(
            'ELEMENT_MOUNT_FAILED',
            `Failed to mount StatefulElement: ${mountError.message}`,
            {
              originalError: mountError,
              suggestion: 'Check element.mount() implementation'
            }
          );
        }

        // Build element
        const builtWidget = element.build();

        if (!builtWidget) {
          throw this.createError(
            'BUILD_RETURNED_NULL',
            `State.build() for ${widget.constructor.name} returned null`,
            {
              suggestion: 'State.build() must return a Widget or VNode'
            }
          );
        }

        // Check if it's a VNode
        if (builtWidget && typeof builtWidget === 'object' && builtWidget.tag) {
          if (this.debugMode) {
            console.log(`${indent}✔ Got VNode (tag: ${builtWidget.tag})`);
          }
          return builtWidget;
        }

        // Check if it's a string/number
        if (typeof builtWidget === 'string' || typeof builtWidget === 'number') {
          if (this.debugMode) {
            console.log(`${indent}✔ Got primitive value`);
          }
          return builtWidget;
        }

        // Check if it's another widget
        if (builtWidget && typeof builtWidget === 'object' && typeof builtWidget.build === 'function') {
          if (this.debugMode) {
            console.log(`${indent}🔄 Got nested Widget: ${builtWidget.constructor.name}`);
          }
          return this.build(builtWidget, {
            ...context,
            parentElement: element,
            runtime: this.runtime
          });
        }

        throw this.createError(
          'UNKNOWN_BUILD_RESULT',
          `State.build() for ${widget.constructor.name} returned unexpected type`,
          {
            receivedType: typeof builtWidget,
            receivedConstructor: builtWidget?.constructor?.name,
            suggestion: 'State.build() must return: Widget, VNode, string, number, or null'
          }
        );

      } finally {
        this.buildStack.pop();
      }

    } catch (error) {
      throw this.wrapError(error, `StatefulWidget: ${widget.constructor.name}`);
    }
  }

  /**
   * Build an inherited widget
   * @private
   */
  buildInheritedWidget(widget, context, indent) {
    try {
      if (this.debugMode) {
        console.log(`${indent}📦 Building InheritedWidget: ${widget.constructor.name}`);
      }

      this.buildStack.push(widget.constructor.name);

      try {
        // Validate updateShouldNotify
        if (typeof widget.updateShouldNotify !== 'function') {
          throw this.createError(
            'INVALID_UPDATE_SHOULD_NOTIFY',
            `${widget.constructor.name} must implement updateShouldNotify()`,
            {
              suggestion: 'InheritedWidget requires updateShouldNotify(oldWidget) method'
            }
          );
        }

        const element = new InheritedElement(widget, context.parentElement || null, this.runtime);

        if (!element.mounted) {
          element.mount();
        }

        const builtWidget = element.build();

        if (widget.child) {
          const childVNode = this.build(widget.child, {
            ...context,
            parentElement: element,
            runtime: this.runtime
          });

          if (builtWidget && childVNode) {
            if (!builtWidget.children) {
              builtWidget.children = [];
            }
            builtWidget.children.push(childVNode);
          }

          return builtWidget || childVNode;
        }

        return builtWidget ? this.build(builtWidget, context) : null;

      } finally {
        this.buildStack.pop();
      }

    } catch (error) {
      throw this.wrapError(error, `InheritedWidget: ${widget.constructor.name}`);
    }
  }

  /**
   * Build generic widget (fallback)
   * @private
   */
  buildGeneric(widget, context, indent) {
    try {
      if (this.debugMode) {
        console.log(`${indent}📦 Generic widget builder for: ${widget.constructor.name}`);
      }

      let children = [];

      try {
        if (widget.child) {
          const child = this.build(widget.child, context);
          if (child) children = [child];
        } else if (widget.children) {
          children = this.buildChildren(widget.children, context);
        }
      } catch (childError) {
        throw this.createError(
          'CHILD_BUILD_FAILED',
          `Failed to build children of ${widget.constructor.name}`,
          {
            originalError: childError.message,
            suggestion: 'Check that child widgets are valid'
          }
        );
      }

      const widgetType = this.getWidgetType(widget);

      return new VNode({
        tag: 'div',
        props: {
          className: `fjs-${widgetType.toLowerCase()}`,
          'data-widget-type': widgetType,
          ...this.extractCommonProps(widget)
        },
        children,
        metadata: {
          widgetType,
          note: 'Generic widget - no specific builder implemented'
        }
      });

    } catch (error) {
      throw this.wrapError(error, `Generic builder for ${widget?.constructor?.name || 'unknown'}`);
    }
  }

  /**
   * Build children array
   * @private
   */
  buildChildren(children, context) {
    if (!children) return [];
    if (!Array.isArray(children)) children = [children];

    return children
      .map((child, index) => {
        try {
          return this.build(child, {
            ...context,
            childIndex: index,
            runtime: this.runtime
          });
        } catch (error) {
          throw this.createError(
            'CHILD_INDEX_FAILED',
            `Failed to build child at index ${index}`,
            {
              originalError: error.message,
              childIndex: index,
              childType: typeof child,
              childConstructor: child?.constructor?.name
            }
          );
        }
      })
      .filter(vnode => vnode !== null && vnode !== undefined);
  }

  /**
   * Get widget type name
   * @private
   */
  getWidgetType(widget) {
    if (!widget) return 'Unknown';
    if (widget.constructor && widget.constructor.name) return widget.constructor.name;
    if (widget.runtimeType) return widget.runtimeType;
    if (widget.widget && widget.widget.constructor) return widget.widget.constructor.name;
    return 'Unknown';
  }

  /**
   * Extract common props from widget
   * @private
   */
  extractCommonProps(widget) {
    const props = {};
    if (widget.key) props.key = widget.key;
    if (widget._debugLabel) props['data-debug-label'] = widget._debugLabel;
    return props;
  }

  /**
   * Create a detailed error object
   * @private
   */
  createError(code, message, details = {}) {
    const error = new Error(message);
    error.code = code;
    error.details = details;
    error.buildPath = this.buildStack.join(' → ') || 'ROOT';
    error.timestamp = new Date().toISOString();
    return error;
  }

  /**
   * Wrap and enhance an existing error
   * @private
   */
  wrapError(error, context) {
    if (!error.buildPath) {
      error.buildPath = this.buildStack.join(' → ') || 'ROOT';
    }
    if (!error.context) {
      error.context = context;
    }
    return error;
  }

  /**
   * Handle build errors with detailed reporting
   * @private
   */
  handleBuildError(error, widget, context, indent) {
    const errorReport = this.createErrorReport(error, widget);

    // Log detailed error
    console.error('');
    console.error('❌ '.repeat(40));
    console.error('VNODE BUILD ERROR');
    console.error('❌ '.repeat(40));
    console.error('');
    console.error('📋 ERROR CODE:', error.code || 'UNKNOWN');
    console.error('📝 MESSAGE:', error.message);
    console.error('');
    console.error('🔗 BUILD PATH:', errorReport.buildPath);
    console.error('');

    if (errorReport.widgetInfo) {
      console.error('🔍 WIDGET INFO:');
      console.error('   Constructor:', errorReport.widgetInfo.constructor);
      console.error('   Type:', errorReport.widgetInfo.type);
      console.error('');
    }

    if (error.details) {
      console.error('📌 DETAILS:');
      Object.entries(error.details).forEach(([key, value]) => {
        if (key === 'suggestion') {
          console.error(`   💡 ${key}: ${value}`);
        } else if (key === 'originalError') {
          console.error(`   ⚠️  ${key}: ${value}`);
        } else {
          console.error(`   ${key}: ${JSON.stringify(value, null, 2)}`);
        }
      });
      console.error('');
    }

    if (error.stack) {
      console.error('📚 STACK TRACE:');
      console.error(error.stack);
      console.error('');
    }

    console.error('❌ '.repeat(40));
    console.error('');

    // Re-throw for upstream handling
    throw error;
  }

  /**
   * Create a structured error report
   * @private
   */
  createErrorReport(error, widget) {
    return {
      code: error.code || 'UNKNOWN',
      message: error.message,
      buildPath: error.buildPath || this.buildStack.join(' → ') || 'ROOT',
      timestamp: error.timestamp || new Date().toISOString(),
      widgetInfo: widget ? {
        constructor: widget.constructor?.name || 'unknown',
        type: typeof widget,
        hasBuild: typeof widget.build === 'function',
        hasCreateState: typeof widget.createState === 'function',
        hasTag: widget.tag !== undefined
      } : null,
      details: error.details || {}
    };
  }
}

export { VNodeBuilder };