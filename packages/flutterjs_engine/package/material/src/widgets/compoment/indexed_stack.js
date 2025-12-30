import { Widget, StatelessWidget, Element } from '../../core/widget_element.js';
import { Stack, StackElement, RenderStack, AlignmentDirectional, StackFit } from './stack.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Clip, TextDirection } from '../../utils/utils.js';

// ============================================================================
// VISIBILITY WIDGET
// Controls visibility and interactivity of child widget
// ============================================================================

class Visibility extends Widget {
  constructor({
    key = null,
    visible = true,
    maintainState = false,
    maintainAnimation = false,
    maintainSize = false,
    maintainInteractivity = false,
    replacement = null,
    child = null
  } = {}) {
    super(key);

    this.visible = visible;
    this.maintainState = maintainState;
    this.maintainAnimation = maintainAnimation;
    this.maintainSize = maintainSize;
    this.maintainInteractivity = maintainInteractivity;
    this.replacement = replacement;
    this.child = child;
  }

  build(context) {
    if (!this.visible) {
      if (this.replacement) {
        return this.replacement;
      }

      // Return invisible widget based on maintain flags
      if (this.maintainSize) {
        return new VNode({
          tag: 'div',
          props: {
            style: {
              visibility: 'hidden',
              pointerEvents: this.maintainInteractivity ? 'auto' : 'none'
            }
          },
          children: [this.child]
        });
      }

      if (this.maintainState || this.maintainAnimation) {
        return new VNode({
          tag: 'div',
          props: {
            style: {
              display: 'none',
              pointerEvents: this.maintainInteractivity ? 'auto' : 'none'
            }
          },
          children: [this.child]
        });
      }

      return new VNode({ tag: 'div', children: [] });
    }

    // Visible - return child directly
    return this.child;
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'visible', value: this.visible });
    properties.push({ name: 'maintainState', value: this.maintainState });
    properties.push({ name: 'maintainAnimation', value: this.maintainAnimation });
    properties.push({ name: 'maintainSize', value: this.maintainSize });
    properties.push({ name: 'maintainInteractivity', value: this.maintainInteractivity });
  }

  createElement(parent, runtime) {
    return new VisibilityElement(this,parent, runtime);
  }
}

class VisibilityElement extends Element {
  performRebuild() {
    return this.widget.build(this.context);
  }
}

// ============================================================================
// RENDER INDEXED STACK
// Render object for IndexedStack - only lays out indexed child
// ============================================================================

class RenderIndexedStack extends RenderStack {
  constructor({
    index = 0,
    alignment = AlignmentDirectional.topStart,
    textDirection = TextDirection.ltr,
    fit = StackFit.loose,
    clipBehavior = Clip.hardEdge
  } = {}) {
    super({
      alignment,
      textDirection,
      fit,
      clipBehavior
    });

    this.index = index;
  }

  /**
   * Get the indexed child element
   */
  getIndexedChild() {
    if (this.index === null || this.index === undefined) {
      return null;
    }

    if (this.index < 0 || this.index >= this._children.length) {
      return null;
    }

    return this._children[this.index];
  }

  /**
   * Check if child at index is visible
   */
  isChildVisible(index) {
    return index === this.index;
  }

  debugInfo() {
    const baseInfo = super.debugInfo();
    return {
      ...baseInfo,
      type: 'RenderIndexedStack',
      index: this.index,
      childCount: this._children.length,
      visibleChildIndex: this.getIndexedChild() ? this.index : null
    };
  }
}

// ============================================================================
// RAW INDEXED STACK ELEMENT
// Element for managing _RawIndexedStack lifecycle
// ============================================================================

class RawIndexedStackElement extends StackElement {
  constructor(widget) {
    super(widget);
    this._onstageChild = null;
  }

  /**
   * Get the widget
   */
  get widget() {
    return super.widget;
  }

  /**
   * Mount element
   */
  mount(parent = null) {
    super.mount(parent);
    this._updateOnstageChild();
  }

  /**
   * Update widget
   */
  updateWidget(newWidget) {
    const oldIndex = this.widget.index;
    super.updateWidget(newWidget);

    if (oldIndex !== newWidget.index) {
      this._updateOnstageChild();
      this.markNeedsBuild();
    }
  }

  /**
   * Update onstage child reference
   * @private
   */
  _updateOnstageChild() {
    const index = this.widget.index;

    if (index === null || index === undefined) {
      this._onstageChild = null;
      return;
    }

    if (this._children && index >= 0 && index < this._children.length) {
      this._onstageChild = this._children[index];
    } else {
      this._onstageChild = null;
    }
  }

  /**
   * Debug visit onstage children
   * Only visits the visible child at the index
   */
  debugVisitOnstageChildren(visitor) {
    if (this._onstageChild) {
      visitor(this._onstageChild);
    }
  }

  /**
   * Visit children - for IndexedStack, still visit all for state maintenance
   */
  visitChildren(visitor) {
    if (this._children) {
      for (const child of this._children) {
        visitor(child);
      }
    }
  }

  performRebuild() {
    return this.widget.build(this.context);
  }
}

// ============================================================================
// RAW INDEXED STACK WIDGET
// Internal Stack subclass for IndexedStack implementation
// ============================================================================

class RawIndexedStack extends Stack {
  constructor({
    key = null,
    alignment = AlignmentDirectional.topStart,
    textDirection = null,
    clipBehavior = Clip.hardEdge,
    sizing = StackFit.loose,
    index = 0,
    children = []
  } = {}) {
    super({
      key,
      alignment,
      textDirection,
      clipBehavior,
      fit: sizing,
      children
    });

    this._validateIndex(index, children.length);
    this.index = index;
  }

  /**
   * Validate index bounds
   * @private
   */
  _validateIndex(index, childCount) {
    if (index === null || index === undefined) {
      return;
    }

    if (index < 0 || index >= childCount) {
      console.warn(
        `IndexedStack: index ${index} is out of bounds. ` +
        `Valid range is 0 to ${childCount - 1}.`
      );
    }

    if (!(Number.isInteger(index))) {
      throw new Error(`IndexedStack: index must be an integer, got ${typeof index}`);
    }
  }

  /**
   * Debug check for directionality
   */
  _debugCheckHasDirectionality(context) {
    return super._debugCheckHasDirectionality(context);
  }

  /**
   * Create render object
   */
  createRenderObject(context) {
    return new RenderIndexedStack({
      index: this.index,
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
    super.updateRenderObject(context, renderObject);
    renderObject.index = this.index;
  }

  /**
   * Build widget tree - only visible child is rendered
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

    // Build child VNodes - only render indexed child
    const childVNodes = this.children.map((childWidget, index) => {
      const isVisible = index === this.index;

      const childElement = childWidget.createElement(context.element, context.element.runtime);
      childElement.mount(context.element);
      const childVNode = childElement.performRebuild();

      const childStyle = {
        position: 'absolute',
        display: isVisible ? 'block' : 'none',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none'
      };

      return new VNode({
        tag: 'div',
        props: {
          style: childStyle,
          'data-indexed-stack-index': index,
          'data-visible': isVisible,
          'data-role': 'indexed-child'
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
        'data-widget': 'RawIndexedStack',
        'data-alignment': this.alignment,
        'data-fit': this.fit,
        'data-clip-behavior': this.clipBehavior,
        'data-text-direction': this._getEffectiveTextDirection(context),
        'data-current-index': this.index,
        'data-child-count': this.children.length,
        ref: (el) => this._onContainerMount(el)
      },
      children: childVNodes,
      key: this.key
    });
  }

  /**
   * Debug properties
   */
  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'index', value: this.index });
  }

  /**
   * Create element
   */
  createElement(parent, runtime) {
    return new RawIndexedStackElement(this,parent, runtime);
  }
}

// ============================================================================
// INDEXED STACK WIDGET
// Public API - wraps children in Visibility widgets
// ============================================================================

class IndexedStack extends StatelessWidget {
  constructor({
    key = null,
    alignment = AlignmentDirectional.topStart,
    textDirection = null,
    clipBehavior = Clip.hardEdge,
    sizing = StackFit.loose,
    index = 0,
    children = []
  } = {}) {
    super(key);

    this.alignment = alignment;
    this.textDirection = textDirection;
    this.clipBehavior = clipBehavior;
    this.sizing = sizing;
    this.index = index;
    this.children = children || [];
  }

  /**
   * Build the widget tree
   * Wraps all children in Visibility widgets with only indexed child visible
   */
  build(context) {
    // Wrap children in Visibility to maintain state/animation
    const wrappedChildren = this.children.map((child, i) => {
      return new Visibility({
        visible: i === this.index,
        maintainState: true,
        maintainAnimation: true,
        maintainSize: true,
        maintainInteractivity: true,
        child
      });
    });

    // Return _RawIndexedStack with wrapped children
    return new RawIndexedStack({
      alignment: this.alignment,
      textDirection: this.textDirection,
      clipBehavior: this.clipBehavior,
      sizing: this.sizing,
      index: this.index,
      children: wrappedChildren,
      key: this.key
    });
  }

  /**
   * Debug properties
   */
  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'alignment', value: this.alignment });
    properties.push({ name: 'clipBehavior', value: this.clipBehavior });
    properties.push({ name: 'sizing', value: this.sizing });
    properties.push({ name: 'index', value: this.index });
    properties.push({ name: 'childCount', value: this.children.length });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  IndexedStack,
  RawIndexedStack,
  RawIndexedStackElement,
  RenderIndexedStack,
  Visibility,
  VisibilityElement
};