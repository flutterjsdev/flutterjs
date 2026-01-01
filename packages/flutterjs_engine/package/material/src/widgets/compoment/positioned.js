import { Widget, StatelessWidget,  } from '../../core/widget_element.js';
import {Element} from "@flutterjs/runtime"
import { VNode } from '@flutterjs/vdom/vnode';
import { TextDirection } from '../../utils/utils.js';

// ============================================================================
// RECT CLASS
// Represents a rectangular region with position and size
// ============================================================================

class Rect {
  constructor(left = 0, top = 0, width = 0, height = 0) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
    this.right = left + width;
    this.bottom = top + height;
  }

  /**
   * Create from LTRB (left, top, right, bottom)
   */
  static fromLTRB(left, top, right, bottom) {
    return new Rect(left, top, right - left, bottom - top);
  }

  /**
   * Create with size
   */
  static fromSize(position, size) {
    return new Rect(position.x, position.y, size.width, size.height);
  }

  toString() {
    return `Rect(${this.left}, ${this.top}, ${this.right}, ${this.bottom})`;
  }
}

// ============================================================================
// RELATIVE RECT CLASS
// Represents relative positioning (start, top, end, bottom)
// ============================================================================

class RelativeRect {
  constructor(left = 0, top = 0, right = 0, bottom = 0) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
  }

  /**
   * Create fill (stretch to parent)
   */
  static fill() {
    return new RelativeRect(0, 0, 0, 0);
  }

  /**
   * Create from rect relative to container
   */
  static fromRect(rect, container) {
    return new RelativeRect(
      rect.left,
      rect.top,
      container.width - rect.right,
      container.height - rect.bottom
    );
  }

  toString() {
    return `RelativeRect(${this.left}, ${this.top}, ${this.right}, ${this.bottom})`;
  }
}

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

  /**
   * Reset positioning data
   */
  reset() {
    this.left = null;
    this.top = null;
    this.right = null;
    this.bottom = null;
    this.width = null;
    this.height = null;
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
      throw new Error(
        'Cannot specify left, right, and width simultaneously. ' +
        'Either (left, right, width) or (left, right) or (left, width) is valid.'
      );
    }

    if (top !== null && bottom !== null && height !== null) {
      throw new Error(
        'Cannot specify top, bottom, and height simultaneously. ' +
        'Either (top, bottom, height) or (top, bottom) or (top, height) is valid.'
      );
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
   * Create fill positioned (stretch to parent edges)
   * All edges default to 0.0
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
   * Create from Rect
   * Uses rect dimensions as left, top, width, height
   */
  static fromRect({
    key = null,
    rect = null,
    child = null
  } = {}) {
    if (!rect) {
      throw new Error('rect parameter is required');
    }

    return new Positioned({
      key,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      right: null,
      bottom: null,
      child
    });
  }

  /**
   * Create from RelativeRect
   * Uses relative positioning (left, top, right, bottom)
   */
  static fromRelativeRect({
    key = null,
    rect = null,
    child = null
  } = {}) {
    if (!rect) {
      throw new Error('rect parameter is required');
    }

    return new Positioned({
      key,
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: null,
      height: null,
      child
    });
  }

  /**
   * Create directional positioned
   * Converts start/end to left/right based on text direction
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
    if (!child) {
      throw new Error('child parameter is required');
    }

    // Convert directional to absolute based on text direction
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
   * Apply positioning to parent data
   */
  applyParentData(renderObject) {
    if (!renderObject.parentData) {
      renderObject.parentData = new StackParentData();
    }

    const parentData = renderObject.parentData;
    let needsLayout = false;

    // Check and apply left
    if (parentData.left !== this.left) {
      parentData.left = this.left;
      needsLayout = true;
    }

    // Check and apply top
    if (parentData.top !== this.top) {
      parentData.top = this.top;
      needsLayout = true;
    }

    // Check and apply right
    if (parentData.right !== this.right) {
      parentData.right = this.right;
      needsLayout = true;
    }

    // Check and apply bottom
    if (parentData.bottom !== this.bottom) {
      parentData.bottom = this.bottom;
      needsLayout = true;
    }

    // Check and apply width
    if (parentData.width !== this.width) {
      parentData.width = this.width;
      needsLayout = true;
    }

    // Check and apply height
    if (parentData.height !== this.height) {
      parentData.height = this.height;
      needsLayout = true;
    }

    // Request layout update if parent data changed
    if (needsLayout && renderObject.parent) {
      renderObject.parent.markNeedsLayout?.();
    }
  }

  /**
   * Build returns the child widget
   */
  build(context) {
    return this.child;
  }

  /**
   * Check if this is purely positioned (no size constraints)
   */
  get isPurelyPositioned() {
    return this.width === null && this.height === null;
  }

  /**
   * Get CSS style object for positioning
   */
  getPositioningStyle() {
    const style = {
      position: 'absolute'
    };

    if (this.left !== null) style.left = `${this.left}px`;
    if (this.top !== null) style.top = `${this.top}px`;
    if (this.right !== null) style.right = `${this.right}px`;
    if (this.bottom !== null) style.bottom = `${this.bottom}px`;
    if (this.width !== null) style.width = `${this.width}px`;
    if (this.height !== null) style.height = `${this.height}px`;

    return style;
  }

  /**
   * Debug properties
   */
  debugFillProperties(properties) {
    super.debugFillProperties(properties);

    if (this.left !== null) {
      properties.push({ name: 'left', value: this.left });
    }
    if (this.top !== null) {
      properties.push({ name: 'top', value: this.top });
    }
    if (this.right !== null) {
      properties.push({ name: 'right', value: this.right });
    }
    if (this.bottom !== null) {
      properties.push({ name: 'bottom', value: this.bottom });
    }
    if (this.width !== null) {
      properties.push({ name: 'width', value: this.width });
    }
    if (this.height !== null) {
      properties.push({ name: 'height', value: this.height });
    }
  }

  /**
   * Create element
   */
  createElement(parent, runtime) {
    return new PositionedElement(this,parent, runtime);
  }
}

// ============================================================================
// POSITIONED ELEMENT
// Element for managing Positioned widget lifecycle
// ============================================================================

class PositionedElement extends Element {
  performRebuild() {
    return this.widget.build(this.context);
  }

  /**
   * Update parent render object with positioning data
   */
  updateRenderObject(renderObject) {
    if (this.widget.applyParentData) {
      this.widget.applyParentData(renderObject);
    }
  }
}

// ============================================================================
// POSITIONED DIRECTIONAL WIDGET
// Directional wrapper around Positioned that resolves text direction
// ============================================================================

class PositionedDirectional extends StatelessWidget {
  constructor({
    key = null,
    start = null,
    top = null,
    end = null,
    bottom = null,
    width = null,
    height = null,
    child = null
  } = {}) {
    super(key);

    this.start = start;
    this.top = top;
    this.end = end;
    this.bottom = bottom;
    this.width = width;
    this.height = height;
    this.child = child;
  }

  /**
   * Build widget tree
   * Resolves text direction and creates Positioned widget
   */
  build(context) {
    if (!this.child) {
      throw new Error('PositionedDirectional requires a child widget');
    }

    // Get text direction from context (default LTR)
    const textDirection = context?.textDirection || TextDirection.ltr;

    // Create Positioned using directional factory
    return Positioned.directional({
      textDirection,
      start: this.start,
      top: this.top,
      end: this.end,
      bottom: this.bottom,
      width: this.width,
      height: this.height,
      child: this.child,
      key: this.key
    });
  }

  /**
   * Debug properties
   */
  debugFillProperties(properties) {
    super.debugFillProperties(properties);

    if (this.start !== null) {
      properties.push({ name: 'start', value: this.start });
    }
    if (this.top !== null) {
      properties.push({ name: 'top', value: this.top });
    }
    if (this.end !== null) {
      properties.push({ name: 'end', value: this.end });
    }
    if (this.bottom !== null) {
      properties.push({ name: 'bottom', value: this.bottom });
    }
    if (this.width !== null) {
      properties.push({ name: 'width', value: this.width });
    }
    if (this.height !== null) {
      properties.push({ name: 'height', value: this.height });
    }
  }
}

// ============================================================================
// POSITIONING HELPER CLASS
// Utility for working with positioned children in Stack
// ============================================================================

class PositioningHelper {
  /**
   * Resolve absolute positioning constraints
   * Calculates final position and size given container dimensions
   */
  static resolveConstraints({
    left = null,
    top = null,
    right = null,
    bottom = null,
    width = null,
    height = null,
    containerWidth = 0,
    containerHeight = 0
  } = {}) {
    let finalLeft = left ?? 0;
    let finalTop = top ?? 0;
    let finalWidth = width;
    let finalHeight = height;

    // Resolve horizontal positioning
    if (left !== null && right !== null && width === null) {
      finalWidth = containerWidth - left - right;
    } else if (left !== null && width !== null) {
      finalWidth = width;
    } else if (right !== null && width !== null) {
      finalLeft = containerWidth - right - width;
    } else if (right !== null && left === null) {
      finalLeft = containerWidth - (width || 0) - right;
    }

    // Resolve vertical positioning
    if (top !== null && bottom !== null && height === null) {
      finalHeight = containerHeight - top - bottom;
    } else if (top !== null && height !== null) {
      finalHeight = height;
    } else if (bottom !== null && height !== null) {
      finalTop = containerHeight - bottom - height;
    } else if (bottom !== null && top === null) {
      finalTop = containerHeight - (height || 0) - bottom;
    }

    return {
      left: finalLeft,
      top: finalTop,
      width: finalWidth || 'auto',
      height: finalHeight || 'auto'
    };
  }

  /**
   * Check if positioned widget is fully constrained
   */
  static isFullyConstrained({
    left = null,
    right = null,
    width = null,
    top = null,
    bottom = null,
    height = null
  } = {}) {
    const horizontalConstrained = 
      (left !== null && right !== null) ||
      (left !== null && width !== null) ||
      (right !== null && width !== null);

    const verticalConstrained = 
      (top !== null && bottom !== null) ||
      (top !== null && height !== null) ||
      (bottom !== null && height !== null);

    return horizontalConstrained && verticalConstrained;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  Positioned,
  PositionedElement,
  PositionedDirectional,
  StackParentData,
  Rect,
  RelativeRect,
  PositioningHelper
};