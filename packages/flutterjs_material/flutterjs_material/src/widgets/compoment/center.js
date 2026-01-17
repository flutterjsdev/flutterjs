import { Widget, StatelessWidget } from '../../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Element } from '@flutterjs/runtime';
import { Alignment } from '../../utils/utils.js';

class Align extends Widget {
  constructor({
    key = null,
    alignment = Alignment.center,
    widthFactor = null,
    heightFactor = null,
    child = null
  } = {}) {
    super(key);
    this.alignment = alignment;
    this.widthFactor = widthFactor;
    this.heightFactor = heightFactor;
    this.child = child;
  }

  /**
   * Build widget tree - called by AlignElement
   */
  build(context) {
    const inlineStyles = this._getInlineStyles();
    const elementId = context.element.getElementId();
    const widgetPath = context.element.getWidgetPath();

    // Build child with element caching
    let childVNode = null;
    if (this.child) {
      if (!context._childElement) {
        context._childElement = this.child.createElement(context, context.element.runtime);
        context._childElement.mount(context);
      } else {
        if (context._childElement.update) {
          context._childElement.update(this.child);
        } else {
          context._childElement = this.child.createElement(context, context.element.runtime);
          context._childElement.mount(context);
        }
      }
      childVNode = context._childElement.performRebuild();
    }

    return new VNode({
      tag: 'div',
      props: {
        style: inlineStyles,
        'data-element-id': elementId,
        'data-widget-path': widgetPath,
        'data-widget': 'Align',
        'data-alignment': this.alignment
      },
      children: childVNode ? [childVNode] : [],
      key: this.key
    });
  }

  _getInlineStyles() {
    const styles = {
      display: 'flex',
      boxSizing: 'border-box', // Ensure padding doesn't overflow
      ...this._getAlignmentStyles()
    };

    if (this.widthFactor !== null) {
      styles.width = `${this.widthFactor * 100}%`;
      styles.flexGrow = 0; // Don't grow if fixed size
    } else {
      styles.width = '100%';
      styles.flexGrow = 1; // Grow to fill
    }

    if (this.heightFactor !== null) {
      styles.height = `${this.heightFactor * 100}%`;
      styles.flexGrow = 0;
    } else {
      styles.height = '100%';
      styles.flexGrow = 1; // Grow to fill
    }

    // Simplification: if both match, just flex: 1
    if (this.widthFactor === null && this.heightFactor === null) {
      styles.flex = '1 1 auto';
    }

    return styles;
  }

  _getAlignmentStyles() {
    const alignmentStr = this.alignment?.toString() || 'center';
    const alignmentMap = {
      'top-left': { justifyContent: 'flex-start', alignItems: 'flex-start' },
      'top-center': { justifyContent: 'center', alignItems: 'flex-start' },
      'top-right': { justifyContent: 'flex-end', alignItems: 'flex-start' },
      'center-left': { justifyContent: 'flex-start', alignItems: 'center' },
      'center': { justifyContent: 'center', alignItems: 'center' },
      'center-right': { justifyContent: 'flex-end', alignItems: 'center' },
      'bottom-left': { justifyContent: 'flex-start', alignItems: 'flex-end' },
      'bottom-center': { justifyContent: 'center', alignItems: 'flex-end' },
      'bottom-right': { justifyContent: 'flex-end', alignItems: 'flex-end' }
    };

    return alignmentMap[alignmentStr] || alignmentMap['center'];
  }

  createElement(parent, runtime) {
    return new AlignElement(this, parent, runtime);
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'alignment', value: this.alignment });
    properties.push({ name: 'widthFactor', value: this.widthFactor });
    properties.push({ name: 'heightFactor', value: this.heightFactor });
    if (this.child) {
      properties.push({ name: 'child', value: this.child.constructor.name });
    }
  }
}

class AlignElement extends Element {
  performRebuild() {
    return this.widget.build(this.context);
  }
}

class Center extends Align {
  constructor({
    key = null,
    widthFactor = null,
    heightFactor = null,
    child = null
  } = {}) {
    super({
      key,
      alignment: Alignment.center,
      widthFactor,
      heightFactor,
      child
    });
  }
}

export { Align, Center };
