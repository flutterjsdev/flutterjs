import { Widget, Element } from '../../../core/widget.js';
import { VNode } from '../core/vdom/vnode.js';

// ============================================================================
// AXIS ENUM
// ============================================================================

const Axis = {
  horizontal: 'horizontal',
  vertical: 'vertical'
};

// ============================================================================
// AXIS DIRECTION ENUM
// ============================================================================

const AxisDirection = {
  up: 'up',
  right: 'right',
  down: 'down',
  left: 'left'
};

// ============================================================================
// HELPER FUNCTION - Get axis direction from axis, reverse, and directionality
// ============================================================================

function getAxisDirectionFromAxisReverseAndDirectionality(
  context,
  axis,
  reverse
) {
  // Get text direction from context (default LTR)
  const isRTL = context?.isRTL || false;

  if (axis === Axis.horizontal) {
    if (reverse) {
      return isRTL ? AxisDirection.right : AxisDirection.left;
    } else {
      return isRTL ? AxisDirection.left : AxisDirection.right;
    }
  } else {
    // Axis.vertical
    return reverse ? AxisDirection.up : AxisDirection.down;
  }
}

// ============================================================================
// RENDER LIST BODY
// Handles the actual layout and rendering logic
// ============================================================================

class RenderListBody {
  constructor({ axisDirection = AxisDirection.down } = {}) {
    this.axisDirection = axisDirection;
    this._children = [];
    this._containerElement = null;
    this._resizeObserver = null;
  }

  /**
   * Add child render object
   */
  addChild(child) {
    this._children.push(child);
  }

  /**
   * Remove child render object
   */
  removeChild(child) {
    const index = this._children.indexOf(child);
    if (index > -1) {
      this._children.splice(index, 1);
    }
  }

  /**
   * Get main axis (horizontal or vertical)
   */
  get mainAxis() {
    return [AxisDirection.left, AxisDirection.right].includes(this.axisDirection)
      ? Axis.horizontal
      : Axis.vertical;
  }

  /**
   * Check if direction is reversed
   */
  get isReverse() {
    return [AxisDirection.up, AxisDirection.left].includes(this.axisDirection);
  }

  /**
   * Debug info
   */
  debugInfo() {
    return {
      type: 'RenderListBody',
      axisDirection: this.axisDirection,
      mainAxis: this.mainAxis,
      isReverse: this.isReverse,
      childCount: this._children.length
    };
  }
}

// ============================================================================
// LIST BODY ELEMENT
// Element for managing ListBody lifecycle
// ============================================================================

class ListBodyElement extends Element {
  constructor(widget) {
    super(widget);
    this._renderObject = null;
  }

  /**
   * Mount element
   */
  mount(parent = null) {
    super.mount(parent);

    // Create render object
    this._renderObject = this.widget.createRenderObject(this.context);
  }

  /**
   * Update render object on widget change
   */
  updateWidget(newWidget) {
    const oldWidget = this.widget;
    super.updateWidget(newWidget);

    if (oldWidget.mainAxis !== newWidget.mainAxis ||
        oldWidget.reverse !== newWidget.reverse) {
      this.widget.updateRenderObject(this.context, this._renderObject);
      this.markNeedsBuild();
    }
  }

  /**
   * Perform rebuild
   */
  performRebuild() {
    return this.widget.build(this.context);
  }

  /**
   * Visit children
   */
  visitChildren(visitor) {
    if (this._children) {
      for (const child of this._children) {
        visitor(child);
      }
    }
  }
}

// ============================================================================
// LIST BODY WIDGET
// Multi-child widget that arranges children in a list
// ============================================================================

class ListBody extends Widget {
  constructor({
    key = null,
    mainAxis = Axis.vertical,
    reverse = false,
    children = []
  } = {}) {
    super(key);

    if (!Object.values(Axis).includes(mainAxis)) {
      throw new Error(`Invalid mainAxis: ${mainAxis}`);
    }

    this.mainAxis = mainAxis;
    this.reverse = reverse;
    this.children = children || [];
    this._renderObject = null;
    this._containerElement = null;
    this._childElements = [];
    this._resizeObserver = null;
  }

  /**
   * Get axis direction based on axis, reverse, and directionality
   * @private
   */
  _getDirection(context) {
    return getAxisDirectionFromAxisReverseAndDirectionality(
      context,
      this.mainAxis,
      this.reverse
    );
  }

  /**
   * Create render object
   */
  createRenderObject(context) {
    return new RenderListBody({
      axisDirection: this._getDirection(context)
    });
  }

  /**
   * Update render object
   */
  updateRenderObject(context, renderObject) {
    renderObject.axisDirection = this._getDirection(context);
  }

  /**
   * Build the widget tree
   */
  build(context) {
    if (!this._renderObject) {
      this._renderObject = this.createRenderObject(context);
    } else {
      this.updateRenderObject(context, this._renderObject);
    }

    const elementId = context.element.getElementId();
    const widgetPath = context.element.getWidgetPath();

    // Determine layout direction
    const isHorizontal = this.mainAxis === Axis.horizontal;
    const isReverse = this.reverse;

    // Build CSS styles
    const style = {
      display: 'flex',
      flexDirection: isHorizontal
        ? isReverse ? 'row-reverse' : 'row'
        : isReverse ? 'column-reverse' : 'column',
      width: isHorizontal ? 'auto' : '100%',
      height: isHorizontal ? 'auto' : 'auto',
      alignItems: 'stretch',
      justifyContent: 'flex-start'
    };

    // Build child VNodes
    const childVNodes = this.children.map((childWidget) => {
      const childElement = childWidget.createElement();
      childElement.mount(context.element);
      const childVNode = childElement.performRebuild();

      return new VNode({
        tag: 'div',
        props: {
          style: {
            flexShrink: 0,
            width: isHorizontal ? 'auto' : '100%'
          }
        },
        children: [childVNode]
      });
    });

    return new VNode({
      tag: 'div',
      props: {
        style,
        'data-element-id': elementId,
        'data-widget-path': widgetPath,
        'data-widget': 'ListBody',
        'data-main-axis': this.mainAxis,
        'data-reverse': this.reverse,
        'data-axis-direction': this._getDirection(context),
        ref: (el) => this._onContainerMount(el, context)
      },
      children: childVNodes,
      key: this.key
    });
  }

  /**
   * Mount container element
   * @private
   */
  _onContainerMount(el, context) {
    if (!el) return;

    this._containerElement = el;

    // Set up resize observer for responsive layout
    if (window.ResizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        this._onResize();
      });
      this._resizeObserver.observe(el);
    }

    // Listen to window resize
    const resizeHandler = () => this._onResize();
    window.addEventListener('resize', resizeHandler);

    el._cleanupResize = () => {
      window.removeEventListener('resize', resizeHandler);
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
      }
    };
  }

  /**
   * Handle resize event
   * @private
   */
  _onResize() {
    if (!this._containerElement) return;

    try {
      // Perform any necessary layout adjustments
      const rect = this._containerElement.getBoundingClientRect();

      if (process.env.NODE_ENV === 'development') {
        // Debug: log resize info
      }
    } catch (error) {
      console.error('Error during ListBody resize:', error);
    }
  }

  /**
   * Debug properties
   */
  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'mainAxis', value: this.mainAxis });
    properties.push({ name: 'reverse', value: this.reverse });
    properties.push({ name: 'childCount', value: this.children.length });
  }

  /**
   * Create element
   */
  createElement() {
    return new ListBodyElement(this);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ListBody,
  RenderListBody,
  ListBodyElement,
  Axis,
  AxisDirection,
  getAxisDirectionFromAxisReverseAndDirectionality
};