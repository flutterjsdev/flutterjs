
import { Widget, } from '../../core/widget_element.js';
import { Element } from "@flutterjs/runtime"
import { VNode } from '@flutterjs/vdom/vnode';
import { Axis, TextDirection, VerticalDirection, Clip, MainAxisAlignment, CrossAxisAlignment, FlexFit, WrapAlignment, WrapCrossAlignment } from '../../utils/utils.js';

// ============================================================================
// ENUMS
// ============================================================================

const MainAxisSize = {
  min: 'min',
  max: 'max'
};

// ============================================================================
// FLEX PARENT DATA
// ============================================================================

class FlexParentData {
  constructor() {
    this.flex = null;
    this.fit = FlexFit.loose;
  }

  debugInfo() {
    return {
      flex: this.flex,
      fit: this.fit
    };
  }
}

// ============================================================================
// RENDER FLEX
// ============================================================================

class RenderFlex {
  constructor({
    direction = Axis.horizontal,
    mainAxisAlignment = MainAxisAlignment.start,
    mainAxisSize = MainAxisSize.max,
    crossAxisAlignment = CrossAxisAlignment.center,
    textDirection = TextDirection.ltr,
    verticalDirection = VerticalDirection.down,
    textBaseline = null,
    clipBehavior = Clip.none,
    spacing = 0
  } = {}) {
    this.direction = direction;
    this.mainAxisAlignment = mainAxisAlignment;
    this.mainAxisSize = mainAxisSize;
    this.crossAxisAlignment = crossAxisAlignment;
    this.textDirection = textDirection;
    this.verticalDirection = verticalDirection;
    this.textBaseline = textBaseline;
    this.clipBehavior = clipBehavior;
    this.spacing = spacing;
    this._children = [];
  }

  addChild(child) {
    this._children.push(child);
  }

  removeChild(child) {
    const index = this._children.indexOf(child);
    if (index > -1) {
      this._children.splice(index, 1);
    }
  }

  debugInfo() {
    return {
      type: 'RenderFlex',
      direction: this.direction,
      mainAxisAlignment: this.mainAxisAlignment,
      mainAxisSize: this.mainAxisSize,
      crossAxisAlignment: this.crossAxisAlignment,
      textDirection: this.textDirection,
      spacing: this.spacing,
      childCount: this._children.length
    };
  }
}

// ============================================================================
// FLEX WIDGET
// ============================================================================

class Flex extends Widget {
  constructor({
    key = null,
    direction = Axis.horizontal,
    mainAxisAlignment = MainAxisAlignment.start,
    mainAxisSize = MainAxisSize.max,
    crossAxisAlignment = CrossAxisAlignment.center,
    textDirection = null,
    verticalDirection = VerticalDirection.down,
    textBaseline = null,
    clipBehavior = Clip.none,
    spacing = 0,
    children = []
  } = {}) {
    super(key);

    // Validate baseline
    if (crossAxisAlignment === CrossAxisAlignment.baseline && !textBaseline) {
      throw new Error(
        'textBaseline is required when crossAxisAlignment is CrossAxisAlignment.baseline'
      );
    }

    this.direction = direction;
    this.mainAxisAlignment = mainAxisAlignment;
    this.mainAxisSize = mainAxisSize;
    this.crossAxisAlignment = crossAxisAlignment;
    this.textDirection = textDirection;
    this.verticalDirection = verticalDirection;
    this.textBaseline = textBaseline;
    this.clipBehavior = clipBehavior;
    this.spacing = spacing;
    this.children = children || [];
    this._renderObject = null;
  }

  /**
   * Check if text direction is needed
   * @private
   */
  _needTextDirection() {
    if (this.direction === Axis.horizontal) {
      return true;
    }
    return this.crossAxisAlignment === CrossAxisAlignment.start ||
      this.crossAxisAlignment === CrossAxisAlignment.end;
  }

  /**
   * Get effective text direction
   */
  getEffectiveTextDirection(context) {
    if (this.textDirection) {
      return this.textDirection;
    }

    if (this._needTextDirection()) {
      return context?.textDirection || TextDirection.ltr;
    }

    return null;
  }

  /**
   * Create render object
   */
  createRenderObject(context) {
    return new RenderFlex({
      direction: this.direction,
      mainAxisAlignment: this.mainAxisAlignment,
      mainAxisSize: this.mainAxisSize,
      crossAxisAlignment: this.crossAxisAlignment,
      textDirection: this.getEffectiveTextDirection(context),
      verticalDirection: this.verticalDirection,
      textBaseline: this.textBaseline,
      clipBehavior: this.clipBehavior,
      spacing: this.spacing
    });
  }

  /**
   * Update render object
   */
  updateRenderObject(context, renderObject) {
    renderObject.direction = this.direction;
    renderObject.mainAxisAlignment = this.mainAxisAlignment;
    renderObject.mainAxisSize = this.mainAxisSize;
    renderObject.crossAxisAlignment = this.crossAxisAlignment;
    renderObject.textDirection = this.getEffectiveTextDirection(context);
    renderObject.verticalDirection = this.verticalDirection;
    renderObject.textBaseline = this.textBaseline;
    renderObject.clipBehavior = this.clipBehavior;
    renderObject.spacing = this.spacing;
  }

  /**
   * Build widget tree
   */
  build(context) {
    if (!this._renderObject) {
      this._renderObject = this.createRenderObject(context);
    } else {
      this.updateRenderObject(context, this._renderObject);
    }

    const elementId = context.element.getElementId();
    const widgetPath = context.element.getWidgetPath();

    // Map alignment to CSS
    const justifyContent = this._mapMainAxisAlignment();
    const alignItems = this._mapCrossAxisAlignment();
    var flexDirection = this.direction === Axis.horizontal ? 'row' : 'column';

    // Handle reverse direction
    if (this.verticalDirection === VerticalDirection.up && this.direction === Axis.vertical) {
      flexDirection = 'column-reverse';
    }

    const overflowValue = this.clipBehavior === Clip.none ? 'visible' : 'hidden';

    const style = {
      display: 'flex',
      flexDirection,
      justifyContent,
      alignItems,
      gap: `${this.spacing}px`,
      width: this.mainAxisSize === MainAxisSize.max ? '100%' : 'auto',
      height: this.mainAxisSize === MainAxisSize.max ? '100%' : 'auto',
      direction: this.textDirection === TextDirection.rtl ? 'rtl' : 'ltr',
      overflow: overflowValue,
      flexWrap: 'nowrap'
    };

    // Build child VNodes
    const childVNodes = this.children.map((childWidget, idx) => {
      console.log(`[Flex.build] Building child ${idx}:`, childWidget?.constructor?.name, 'has createElement:', typeof childWidget?.createElement);
      const childElement = childWidget.createElement(context.element, context.element.runtime);
      console.log(`[Flex.build] Child ${idx} element:`, childElement?.constructor?.name);
      childElement.mount(context.element);
      const childVNode = childElement.performRebuild();
      console.log(`[Flex.build] Child ${idx} VNode:`, childVNode?.constructor?.name, 'tag:', childVNode?.tag);

      // Check if child is Flexible/Expanded
      let childStyle = {};

      if (childWidget instanceof Flexible) {
        if (childWidget.fit === FlexFit.tight) {
          childStyle.flex = childWidget.flex || 1;
        } else {
          childStyle.flex = 0;
          childStyle.flexShrink = 0;
        }
      }

      return new VNode({
        tag: 'div',
        props: {
          style: {
            ...childStyle,
            minWidth: 0,
            minHeight: 0
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
        'data-widget': 'Flex',
        'data-direction': this.direction,
        'data-main-axis': this.mainAxisAlignment,
        'data-cross-axis': this.crossAxisAlignment,
        'data-spacing': this.spacing
      },
      children: childVNodes,
      key: this.key
    });
  }

  /**
   * Map main axis alignment to CSS
   * @private
   */
  _mapMainAxisAlignment() {
    // Handle shorthand enum syntax (e.g. ".center")
    let value = this.mainAxisAlignment;
    if (typeof value === 'string' && value.startsWith('.')) {
      value = value.substring(1);
    }

    const map = {
      start: 'flex-start',
      end: 'flex-end',
      center: 'center',
      spaceBetween: 'space-between',
      spaceAround: 'space-around',
      spaceEvenly: 'space-evenly'
    };
    return map[value] || 'flex-start';
  }

  /**
   * Map cross axis alignment to CSS
   * @private
   */
  _mapCrossAxisAlignment() {
    // Handle shorthand enum syntax (e.g. ".center")
    let value = this.crossAxisAlignment;
    if (typeof value === 'string' && value.startsWith('.')) {
      value = value.substring(1);
    }

    const map = {
      start: 'flex-start',
      end: 'flex-end',
      center: 'center',
      stretch: 'stretch',
      baseline: 'baseline'
    };
    return map[value] || 'center';
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'direction', value: this.direction });
    properties.push({ name: 'mainAxisAlignment', value: this.mainAxisAlignment });
    properties.push({ name: 'mainAxisSize', value: this.mainAxisSize });
    properties.push({ name: 'crossAxisAlignment', value: this.crossAxisAlignment });
    properties.push({ name: 'textDirection', value: this.textDirection });
    properties.push({ name: 'spacing', value: this.spacing });
    properties.push({ name: 'childCount', value: this.children.length });
  }

  createElement(parent, runtime) {
    return new FlexElement(this, parent, runtime);
  }
}

class FlexElement extends Element {
  performRebuild() {
    return this.widget.build(this.context);
  }
}

// ============================================================================
// ROW WIDGET
// ============================================================================

class Row extends Flex {
  constructor(options = {}) {
    super({
      ...options,
      direction: Axis.horizontal
    });
  }
}

// ============================================================================
// COLUMN WIDGET
// ============================================================================

class Column extends Flex {
  constructor(options = {}) {
    super({
      ...options,
      direction: Axis.vertical
    });
  }
}

// ============================================================================
// FLEXIBLE WIDGET
// ============================================================================

class Flexible extends Widget {
  constructor({
    key = null,
    flex = 1,
    fit = FlexFit.loose,
    child = null
  } = {}) {
    super(key);

    if (flex <= 0) {
      throw new Error('flex must be > 0');
    }

    this.flex = flex;
    this.fit = fit;
    this.child = child;
  }

  /**
   * Apply flex parent data
   */
  applyParentData(renderObject) {
    if (!renderObject.parentData) {
      renderObject.parentData = new FlexParentData();
    }

    const parentData = renderObject.parentData;
    let needsLayout = false;

    if (parentData.flex !== this.flex) {
      parentData.flex = this.flex;
      needsLayout = true;
    }

    if (parentData.fit !== this.fit) {
      parentData.fit = this.fit;
      needsLayout = true;
    }

    if (needsLayout && renderObject.parent) {
      renderObject.parent.markNeedsLayout?.();
    }
  }

  build(context) {
    // ✅ Must build child to VNode, not return raw Widget
    if (!this.child) {
      return null;
    }
    const childElement = this.child.createElement(context.element, context.element.runtime);
    childElement.mount(context.element);
    return childElement.performRebuild();
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'flex', value: this.flex });
    properties.push({ name: 'fit', value: this.fit });
  }

  createElement(parent, runtime) {
    return new FlexibleElement(this, parent, runtime);
  }
}

class FlexibleElement extends Element {
  performRebuild() {
    return this.widget.build(this.context);
  }
}

// ============================================================================
// EXPANDED WIDGET
// ============================================================================

class Expanded extends Flexible {
  constructor({
    key = null,
    flex = 1,
    child = null
  } = {}) {
    super({
      key,
      flex,
      fit: FlexFit.tight,
      child
    });
  }
}

// ============================================================================
// WRAP WIDGET
// ============================================================================

class Wrap extends Widget {
  constructor({
    key = null,
    direction = Axis.horizontal,
    alignment = WrapAlignment.start,
    spacing = 0,
    runAlignment = WrapAlignment.start,
    runSpacing = 0,
    crossAxisAlignment = WrapCrossAlignment.start,
    textDirection = null,
    verticalDirection = VerticalDirection.down,
    clipBehavior = Clip.none,
    children = []
  } = {}) {
    super(key);

    this.direction = direction;
    this.alignment = alignment;
    this.spacing = spacing;
    this.runAlignment = runAlignment;
    this.runSpacing = runSpacing;
    this.crossAxisAlignment = crossAxisAlignment;
    this.textDirection = textDirection;
    this.verticalDirection = verticalDirection;
    this.clipBehavior = clipBehavior;
    this.children = children || [];
  }

  /**
   * Map wrap alignment to CSS
   * @private
   */
  _mapAlignment() {
    // Handle shorthand enum syntax (e.g. ".center")
    let value = this.alignment;
    if (typeof value === 'string' && value.startsWith('.')) {
      value = value.substring(1);
    }

    const map = {
      start: 'flex-start',
      end: 'flex-end',
      center: 'center',
      spaceBetween: 'space-between',
      spaceAround: 'space-around',
      spaceEvenly: 'space-evenly'
    };
    return map[value] || 'flex-start';
  }

  /**
   * Map run alignment to CSS
   * @private
   */
  _mapRunAlignment() {
    // Handle shorthand enum syntax (e.g. ".center")
    let value = this.runAlignment;
    if (typeof value === 'string' && value.startsWith('.')) {
      value = value.substring(1);
    }

    const map = {
      start: 'flex-start',
      end: 'flex-end',
      center: 'center',
      spaceBetween: 'space-between',
      spaceAround: 'space-around',
      spaceEvenly: 'space-evenly'
    };
    return map[value] || 'flex-start';
  }

  build(context) {
    const elementId = context.element.getElementId();
    const widgetPath = context.element.getWidgetPath();

    const flexDirection = this.direction === Axis.horizontal ? 'row' : 'column';
    const overflowValue = this.clipBehavior === Clip.none ? 'visible' : 'hidden';

    const style = {
      display: 'flex',
      flexDirection,
      flexWrap: 'wrap',
      justifyContent: this._mapAlignment(),
      alignContent: this._mapRunAlignment(),
      gap: `${this.spacing}px ${this.runSpacing}px`,
      direction: this.textDirection === TextDirection.rtl ? 'rtl' : 'ltr',
      overflow: overflowValue
    };

    const childVNodes = this.children.map((childWidget) => {
      const childElement = childWidget.createElement(context.element, context.element.runtime);
      childElement.mount(context.element);
      return childElement.performRebuild();
    });

    return new VNode({
      tag: 'div',
      props: {
        style,
        'data-element-id': elementId,
        'data-widget-path': widgetPath,
        'data-widget': 'Wrap',
        'data-direction': this.direction,
        'data-alignment': this.alignment,
        'data-spacing': this.spacing
      },
      children: childVNodes,
      key: this.key
    });
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'direction', value: this.direction });
    properties.push({ name: 'alignment', value: this.alignment });
    properties.push({ name: 'spacing', value: this.spacing });
    properties.push({ name: 'runAlignment', value: this.runAlignment });
    properties.push({ name: 'runSpacing', value: this.runSpacing });
    properties.push({ name: 'childCount', value: this.children.length });
  }

  createElement(parent, runtime) {
    return new WrapElement(this, parent, runtime);
  }
}

class WrapElement extends Element {
  performRebuild() {
    return this.widget.build(this.context);
  }
}

// ============================================================================
// FLOW DELEGATE BASE CLASS
// ============================================================================

class FlowDelegate {
  constructor() {
    if (new.target === FlowDelegate) {
      throw new Error('FlowDelegate is abstract');
    }
  }

  /**
   * Get size for the flow
   */
  getSize(constraints) {
    throw new Error('getSize() must be implemented');
  }

  /**
   * Perform layout on children
   */
  paintChildren(context, sizes) {
    throw new Error('paintChildren() must be implemented');
  }

  /**
   * Check if should repaint
   */
  shouldRepaint(oldDelegate) {
    return true;
  }

  /**
   * Check if should reflow
   */
  shouldReflow(oldDelegate) {
    return true;
  }
}

// ============================================================================
// FLOW WIDGET
// ============================================================================

class Flow extends Widget {
  constructor({
    key = null,
    delegate = null,
    clipBehavior = Clip.hardEdge,
    children = []
  } = {}) {
    super(key);

    if (!delegate) {
      throw new Error('Flow requires a delegate');
    }

    if (!(delegate instanceof FlowDelegate)) {
      throw new Error('delegate must be an instance of FlowDelegate');
    }

    this.delegate = delegate;
    this.clipBehavior = clipBehavior;
    this.children = children || [];
  }

  build(context) {
    const elementId = context.element.getElementId();
    const widgetPath = context.element.getWidgetPath();

    const overflowValue = this.clipBehavior === Clip.none ? 'visible' : 'hidden';

    const style = {
      position: 'relative',
      display: 'inline-block',
      overflow: overflowValue
    };

    // Build child VNodes with absolute positioning
    const childVNodes = this.children.map((childWidget, index) => {
      const childElement = childWidget.createElement(context.element, context.element.runtime);
      childElement.mount(context.element);
      const childVNode = childElement.performRebuild();

      return new VNode({
        tag: 'div',
        props: {
          style: {
            position: 'absolute',
            left: 0,
            top: 0
          },
          'data-flow-index': index
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
        'data-widget': 'Flow',
        'data-clip-behavior': this.clipBehavior,
        'data-child-count': this.children.length
      },
      children: childVNodes,
      key: this.key
    });
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'delegate', value: this.delegate.constructor.name });
    properties.push({ name: 'clipBehavior', value: this.clipBehavior });
    properties.push({ name: 'childCount', value: this.children.length });
  }

  createElement(parent, runtime) {
    return new FlowElement(this, parent, runtime);
  }
}

class FlowElement extends Element {
  performRebuild() {
    return this.widget.build(this.context);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  Flex,
  FlexElement,
  RenderFlex,
  Row,
  Column,
  Flexible,
  FlexibleElement,
  FlexParentData,
  Expanded,
  Wrap,
  WrapElement,
  Flow,
  FlowElement,
  FlowDelegate,
  MainAxisSize
};