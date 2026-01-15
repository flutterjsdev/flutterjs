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

    let childVNode = null;
    if (this.child) {
      const childElement = this.child.createElement(context.element, context.element.runtime);
      childElement.mount(context.element);
      childVNode = childElement.performRebuild();
    }

    return new VNode({
      tag: 'div',
      props: {
        style: inlineStyles,
        'data-element-id': elementId,
        'data-widget-path': widgetPath,
        'data-widget': 'Align',
        'data-alignment': this.alignment?.toString()
      },
      children: childVNode ? [childVNode] : [],
      key: this.key
    });
  }

  _getInlineStyles() {
    const styles = {
      display: 'flex',
      ...this._getAlignmentStyles()
    };

    if (this.widthFactor !== null) {
      styles.width = `${this.widthFactor * 100}%`;
    } else {
      styles.width = '100%';
    }

    if (this.heightFactor !== null) {
      styles.height = `${this.heightFactor * 100}%`;
    } else {
      styles.height = '100%';
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
