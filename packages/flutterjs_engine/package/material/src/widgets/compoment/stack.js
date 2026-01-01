import { Widget } from '../../core/widget_element.js';
import {Element} from "@flutterjs/runtime"
import { VNode } from '@flutterjs/vdom/vnode';
import { Clip, TextDirection, VerticalDirection } from '../../utils/utils.js';

// ============================================================================
// ALIGNMENT ENUMS
// ============================================================================

const Alignment = {
  topLeft: 'topLeft',
  topCenter: 'topCenter',
  topRight: 'topRight',
  centerLeft: 'centerLeft',
  center: 'center',
  centerRight: 'centerRight',
  bottomLeft: 'bottomLeft',
  bottomCenter: 'bottomCenter',
  bottomRight: 'bottomRight'
};

const AlignmentDirectional = {
  topStart: 'topStart',
  topCenter: 'topCenter',
  topEnd: 'topEnd',
  centerStart: 'centerStart',
  center: 'center',
  centerEnd: 'centerEnd',
  bottomStart: 'bottomStart',
  bottomCenter: 'bottomCenter',
  bottomEnd: 'bottomEnd'
};

const StackFit = {
  loose: 'loose',
  expand: 'expand',
  passthrough: 'passthrough'
};

// ============================================================================
// STACK PARENT DATA
// Stores positioning data for children in Stack
// ============================================================================

class StackParentData {
  constructor() {
    this.left = null;
    this.top = null;
    this.right = null;
    this.bottom = null;
    this.width = null;
    this.height = null;
  }

  /**
   * Check if child is positioned
   */
  isPositioned() {
    return this.left !== null || this.top !== null || 
           this.right !== null || this.bottom !== null ||
           this.width !== null || this.height !== null;
  }

  debugInfo() {
    return {
      left: this.left,
      top: this.top,
      right: this.right,
      bottom: this.bottom,
      width: this.width,
      height: this.height,
      isPositioned: this.isPositioned()
    };
  }
}

// ============================================================================
// RENDER STACK
// Handles stack layout logic
// ============================================================================

class RenderStack {
  constructor({
    alignment = AlignmentDirectional.topStart,
    textDirection = TextDirection.ltr,
    fit = StackFit.loose,
    clipBehavior = Clip.hardEdge
  } = {}) {
    this.alignment = alignment;
    this.textDirection = textDirection;
    this.fit = fit;
    this.clipBehavior = clipBehavior;
    this._children = [];
  }

  /**
   * Add child
   */
  addChild(child) {
    this._children.push(child);
  }

  /**
   * Remove child
   */
  removeChild(child) {
    const index = this._children.indexOf(child);
    if (index > -1) {
      this._children.splice(index, 1);
    }
  }

  /**
   * Resolve alignment based on text direction
   */
  _resolveAlignment() {
    if (this.alignment.includes && this.alignment.includes('Directional')) {
      const isRTL = this.textDirection === TextDirection.rtl;

      const rtlMap = {
        'topStart': isRTL ? Alignment.topRight : Alignment.topLeft,
        'topEnd': isRTL ? Alignment.topLeft : Alignment.topRight,
        'centerStart': isRTL ? Alignment.centerRight : Alignment.centerLeft,
        'centerEnd': isRTL ? Alignment.centerLeft : Alignment.centerRight,
        'bottomStart': isRTL ? Alignment.bottomRight : Alignment.bottomLeft,
        'bottomEnd': isRTL ? Alignment.bottomLeft : Alignment.bottomRight,
        'topCenter': Alignment.topCenter,
        'center': Alignment.center,
        'bottomCenter': Alignment.bottomCenter
      };

      return rtlMap[this.alignment] || Alignment.topLeft;
    }

    return this.alignment;
  }

  /**
   * Get alignment offset values
   */
  _getAlignmentOffset(alignment) {
    const map = {
      topLeft: { x: 'flex-start', y: 'flex-start' },
      topCenter: { x: 'center', y: 'flex-start' },
      topRight: { x: 'flex-end', y: 'flex-start' },
      centerLeft: { x: 'flex-start', y: 'center' },
      center: { x: 'center', y: 'center' },
      centerRight: { x: 'flex-end', y: 'center' },
      bottomLeft: { x: 'flex-start', y: 'flex-end' },
      bottomCenter: { x: 'center', y: 'flex-end' },
      bottomRight: { x: 'flex-end', y: 'flex-end' }
    };

    return map[alignment] || map.topLeft;
  }

  debugInfo() {
    return {
      type: 'RenderStack',
      alignment: this.alignment,
      textDirection: this.textDirection,
      fit: this.fit,
      clipBehavior: this.clipBehavior,
      childCount: this._children.length,
      resolvedAlignment: this._resolveAlignment()
    };
  }
}

// ============================================================================
// POSITIONED WIDGET
// Positions a child absolutely within Stack
// ============================================================================

class Positioned extends Widget {
  constructor({
    key = null,
    left = null,
    top = null,
    right = null,
    bottom = null,
    width = null,
    height = null,
    child = null
  } = {}) {
    super(key);

    // Validate constraints
    if (left !== null && right !== null && width !== null) {
      throw new Error('Cannot specify both left, right, and width');
    }
    if (top !== null && bottom !== null && height !== null) {
      throw new Error('Cannot specify both top, bottom, and height');
    }

    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.width = width;
    this.height = height;
    this.child = child;
  }

  /**
   * Create fill positioned (stretch to parent)
   */
  static fill({
    key = null,
    left = 0,
    top = 0,
    right = 0,
    bottom = 0,
    child = null
  } = {}) {
    return new Positioned({
      key,
      left,
      top,
      right,
      bottom,
      child
    });
  }

  /**
   * Create from rect
   */
  static fromRect({
    key = null,
    rect = null,
    child = null
  } = {}) {
    if (!rect) throw new Error('rect is required');
    return new Positioned({
      key,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      child
    });
  }

  /**
   * Create directional positioned
   */
  static directional({
    key = null,
    textDirection = TextDirection.ltr,
    start = null,
    top = null,
    end = null,
    bottom = null,
    width = null,
    height = null,
    child = null
  } = {}) {
    const isRTL = textDirection === TextDirection.rtl;
    const left = isRTL ? end : start;
    const right = isRTL ? start : end;

    return new Positioned({
      key,
      left,
      top,
      right,
      bottom,
      width,
      height,
      child
    });
  }

  /**
   * Apply positioning to render object
   */
  applyParentData(renderObject) {
    if (!renderObject.parentData) {
      renderObject.parentData = new StackParentData();
    }

    const parentData = renderObject.parentData;
    let needsLayout = false;

    if (parentData.left !== this.left) {
      parentData.left = this.left;
      needsLayout = true;
    }
    if (parentData.top !== this.top) {
      parentData.top = this.top;
      needsLayout = true;
    }
    if (parentData.right !== this.right) {
      parentData.right = this.right;
      needsLayout = true;
    }
    if (parentData.bottom !== this.bottom) {
      parentData.bottom = this.bottom;
      needsLayout = true;
    }
    if (parentData.width !== this.width) {
      parentData.width = this.width;
      needsLayout = true;
    }
    if (parentData.height !== this.height) {
      parentData.height = this.height;
      needsLayout = true;
    }

    if (needsLayout && renderObject.parent) {
      renderObject.parent.markNeedsLayout?.();
    }
  }

  build(context) {
    return this.child;
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    if (this.left !== null) properties.push({ name: 'left', value: this.left });
    if (this.top !== null) properties.push({ name: 'top', value: this.top });
    if (this.right !== null) properties.push({ name: 'right', value: this.right });
    if (this.bottom !== null) properties.push({ name: 'bottom', value: this.bottom });
    if (this.width !== null) properties.push({ name: 'width', value: this.width });
    if (this.height !== null) properties.push({ name: 'height', value: this.height });
  }

  createElement(parent, runtime) {
    return new PositionedElement(this,parent, runtime);
  }
}

class PositionedElement extends Element {
  performRebuild() {
    return this.widget.build(this.context);
  }
}

// ============================================================================
// STACK WIDGET
// Multi-child widget with absolute positioning
// ============================================================================

class Stack extends Widget {
  constructor({
    key = null,
    alignment = AlignmentDirectional.topStart,
    textDirection = null,
    fit = StackFit.loose,
    clipBehavior = Clip.hardEdge,
    children = []
  } = {}) {
    super(key);

    this.alignment = alignment;
    this.textDirection = textDirection;
    this.fit = fit;
    this.clipBehavior = clipBehavior;
    this.children = children || [];
    this._renderObject = null;
    this._containerElement = null;
    this._childElements = [];
  }

  /**
   * Debug check for directionality
   */
  _debugCheckHasDirectionality(context) {
    if (process.env.NODE_ENV !== 'development') return true;

    const isDirectional = this.alignment.includes && 
                         this.alignment.includes('Directional');

    if (isDirectional && this.textDirection === null) {
      console.warn(
        `Stack: alignment '${this.alignment}' is directional and requires textDirection. ` +
        `Either provide explicit textDirection or use non-directional alignment like 'center'.`
      );
    }

    return true;
  }

  /**
   * Get effective text direction
   */
  _getEffectiveTextDirection(context) {
    return this.textDirection || context?.textDirection || TextDirection.ltr;
  }

  /**
   * Create render object
   */
  createRenderObject(context) {
    return new RenderStack({
      alignment: this.alignment,
      textDirection: this._getEffectiveTextDirection(context),
      fit: this.fit,
      clipBehavior: this.clipBehavior
    });
  }

  /**
   * Update render object
   */
  updateRenderObject(context, renderObject) {
    renderObject.alignment = this.alignment;
    renderObject.textDirection = this._getEffectiveTextDirection(context);
    renderObject.fit = this.fit;
    renderObject.clipBehavior = this.clipBehavior;
  }

  /**
   * Build widget tree
   */
  build(context) {
    this._debugCheckHasDirectionality(context);

    if (!this._renderObject) {
      this._renderObject = this.createRenderObject(context);
    } else {
      this.updateRenderObject(context, this._renderObject);
    }

    const elementId = context.element.getElementId();
    const widgetPath = context.element.getWidgetPath();
    const resolvedAlignment = this._renderObject._resolveAlignment();
    const alignOffset = this._renderObject._getAlignmentOffset(resolvedAlignment);

    // Determine overflow behavior
    const overflowValue = this.clipBehavior === Clip.none ? 'visible' : 'hidden';

    const style = {
      position: 'relative',
      display: 'inline-flex',
      width: this.fit === StackFit.expand ? '100%' : 'auto',
      height: this.fit === StackFit.expand ? '100%' : 'auto',
      overflow: overflowValue,
      alignItems: alignOffset.y,
      justifyContent: alignOffset.x
    };

    // Build child VNodes with positioning
    const childVNodes = this.children.map((childWidget, index) => {
      const childElement = childWidget.createElement(context.element, context.element.runtime);
      childElement.mount(context.element);
      const childVNode = childElement.performRebuild();

      let childStyle = {
        position: 'absolute'
      };

      // Apply Positioned constraints if available
      if (childWidget instanceof Positioned) {
        if (childWidget.left !== null) childStyle.left = `${childWidget.left}px`;
        if (childWidget.top !== null) childStyle.top = `${childWidget.top}px`;
        if (childWidget.right !== null) childStyle.right = `${childWidget.right}px`;
        if (childWidget.bottom !== null) childStyle.bottom = `${childWidget.bottom}px`;
        if (childWidget.width !== null) childStyle.width = `${childWidget.width}px`;
        if (childWidget.height !== null) childStyle.height = `${childWidget.height}px`;
      }

      return new VNode({
        tag: 'div',
        props: {
          style: childStyle,
          'data-stack-index': index,
          'data-positioned': childWidget instanceof Positioned
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
        'data-widget': 'Stack',
        'data-alignment': this.alignment,
        'data-fit': this.fit,
        'data-clip-behavior': this.clipBehavior,
        'data-text-direction': this._getEffectiveTextDirection(context),
        ref: (el) => this._onContainerMount(el)
      },
      children: childVNodes,
      key: this.key
    });
  }

  /**
   * Mount container
   */
  _onContainerMount(el) {
    if (!el) return;
    this._containerElement = el;
  }

  /**
   * Debug properties
   */
  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'alignment', value: this.alignment });
    properties.push({ name: 'textDirection', value: this.textDirection });
    properties.push({ name: 'fit', value: this.fit });
    properties.push({ name: 'clipBehavior', value: this.clipBehavior });
    properties.push({ name: 'childCount', value: this.children.length });
  }

  /**
   * Create element
   */
  createElement(parent, runtime) {
    return new StackElement(this,parent, runtime);
  }
}

class StackElement extends Element {
  performRebuild() {
    return this.widget.build(this.context);
  }
}

export {
  Stack,
  StackElement,
  RenderStack,
  Positioned,
  PositionedElement,
  StackParentData,
  Alignment,
  AlignmentDirectional,
  StackFit
};