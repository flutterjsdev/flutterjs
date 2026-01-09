import { Widget, StatelessWidget, ProxyElement } from '../../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';

import { Alignment } from '../../utils/utils.js';

class Align extends StatelessWidget {
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

  build(context) {
    const inlineStyles = this._getInlineStyles();
    const elementId = context.element.getElementId();
    const widgetPath = context.element.getWidgetPath();

    const childWidget = this.child instanceof Widget
      ? this._buildChild(this.child, context)
      : this.child;

    return new VNode({
      tag: 'div',
      props: {
        // className: 'fjs-align', // Removed to test VDOM style bug
        style: inlineStyles,
        'data-element-id': elementId,
        'data-widget-path': widgetPath,
        'data-identification': context.element.getIdentificationStrategy(),
        'data-widget': 'Align',
        'data-alignment': this.alignment
      },
      children: childWidget ? [childWidget] : [],
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

    return alignmentMap[this.alignment] || alignmentMap['center'];
  }

  _buildChild(child, context) {
    if (!child) return null;

    if (child instanceof Widget) {
      const childElement = child.createElement(context.element, context.element.runtime);
      childElement.mount(context.element);
      return childElement.performRebuild();
    }

    return child;
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