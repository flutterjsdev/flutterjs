import { Widget, StatelessWidget } from '../../core/widget.js';
import { VNode } from '../../core/vdom/vnode.js';

/**
 * SizedBox - A widget that imposes size constraints on its child
 * Used to create empty space or constrain child widget dimensions
 */
class SizedBox extends StatelessWidget {
  constructor({
    key = null,
    width = null,
    height = null,
    child = null
  } = {}) {
    super(key);

    this.width = width;
    this.height = height;
    this.child = child;
  }

  /**
   * SizedBox.expand - Creates a box that expands to fill available space
   */
  static expand({ key = null, child = null } = {}) {
    return new SizedBox({
      key,
      width: double.infinity,
      height: double.infinity,
      child
    });
  }

  /**
   * SizedBox.shrink - Creates a box with zero width and height
   */
  static shrink({ key = null } = {}) {
    return new SizedBox({
      key,
      width: 0,
      height: 0
    });
  }

  /**
   * SizedBox.square - Creates a square box with equal width and height
   */
  static square({ key = null, dimension = 0, child = null } = {}) {
    return new SizedBox({
      key,
      width: dimension,
      height: dimension,
      child
    });
  }

  /**
   * SizedBox.fromSize - Creates a box from a Size object
   */
  static fromSize({ key = null, size = null, child = null } = {}) {
    if (!size) {
      return new SizedBox({
        key,
        child
      });
    }

    return new SizedBox({
      key,
      width: size.width,
      height: size.height,
      child
    });
  }

  build(context) {
    const inlineStyles = this._getInlineStyles();
    const elementId = context?.element?.getElementId?.() || 'sizedbox-' + Math.random().toString(36).substr(2, 9);
    const widgetPath = context?.element?.getWidgetPath?.() || 'SizedBox';

    const props = {
      className: 'fjs-sizedbox',
      style: inlineStyles,
      'data-element-id': elementId,
      'data-widget-path': widgetPath,
      'data-identification': context?.element?.getIdentificationStrategy?.() || 'sizedbox-widget',
      'data-widget': 'SizedBox',
      'data-width': this.width,
      'data-height': this.height
    };

    // Build children
    const children = [];
    if (this.child) {
      if (this.child instanceof Widget) {
        const childElement = this.child.createElement?.();
        if (childElement) {
          childElement.mount?.(context?.element);
          const renderedChild = childElement.performRebuild?.();
          if (renderedChild) {
            children.push(renderedChild);
          }
        }
      } else if (this.child instanceof VNode) {
        children.push(this.child);
      } else if (typeof this.child === 'string' || typeof this.child === 'number') {
        children.push(this.child);
      } else if (Array.isArray(this.child)) {
        this.child.forEach(c => {
          if (c instanceof Widget) {
            const childElement = c.createElement?.();
            if (childElement) {
              childElement.mount?.(context?.element);
              const renderedChild = childElement.performRebuild?.();
              if (renderedChild) {
                children.push(renderedChild);
              }
            }
          } else if (c instanceof VNode) {
            children.push(c);
          } else if (typeof c === 'string' || typeof c === 'number') {
            children.push(c);
          }
        });
      }
    }

    return new VNode({
      tag: 'div',
      props,
      children: children.length > 0 ? children : undefined,
      key: this.key
    });
  }

  _getInlineStyles() {
    const styles = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      flexShrink: 0
    };

    // Apply width
    if (this.width !== null && this.width !== undefined) {
      if (this.width === 'infinity' || this.width === Infinity) {
        styles.width = '100%';
        styles.flexGrow = 1;
      } else if (typeof this.width === 'number') {
        styles.width = `${this.width}px`;
      } else {
        styles.width = this.width;
      }
    }

    // Apply height
    if (this.height !== null && this.height !== undefined) {
      if (this.height === 'infinity' || this.height === Infinity) {
        styles.height = '100%';
        styles.flexGrow = 1;
      } else if (typeof this.height === 'number') {
        styles.height = `${this.height}px`;
      } else {
        styles.height = this.height;
      }
    }

    // If no child and dimensions are set, it acts as spacer
    if (!this.child && this.width === null && this.height === null) {
      styles.display = 'block';
    }

    // Handle the case where only width or height is specified
    if (this.width !== null && this.height === null) {
      styles.height = 'auto';
    }

    if (this.height !== null && this.width === null) {
      styles.width = 'auto';
    }

    return styles;
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'width', value: this.width });
    properties.push({ name: 'height', value: this.height });
    if (this.child) {
      properties.push({ name: 'child', value: this.child });
    }
  }
}

/**
 * Size - Represents dimensions with width and height
 */
class Size {
  constructor(width = 0, height = 0) {
    this.width = width;
    this.height = height;
  }

  static zero() {
    return new Size(0, 0);
  }

  static infinite() {
    return new Size(Infinity, Infinity);
  }

  static square(dimension) {
    return new Size(dimension, dimension);
  }

  get isEmpty() {
    return this.width === 0 && this.height === 0;
  }

  get isInfinite() {
    return this.width === Infinity && this.height === Infinity;
  }

  toString() {
    return `Size(${this.width}, ${this.height})`;
  }

  equals(other) {
    if (!other || !(other instanceof Size)) {
      return false;
    }
    return this.width === other.width && this.height === other.height;
  }
}

/**
 * Dimension - Represents a single dimension (width or height)
 * Can be a fixed pixel value, percentage, or special values
 */
class Dimension {
  constructor(value) {
    if (typeof value === 'string') {
      this.value = value;
      this.isPercentage = value.endsWith('%');
      this.isAuto = value === 'auto';
      this.isInfinity = value === 'infinity';
    } else if (typeof value === 'number') {
      this.value = value;
      this.isPercentage = false;
      this.isAuto = false;
      this.isInfinity = value === Infinity;
    } else {
      this.value = null;
      this.isPercentage = false;
      this.isAuto = true;
      this.isInfinity = false;
    }
  }

  static infinity() {
    return new Dimension('infinity');
  }

  static auto() {
    return new Dimension('auto');
  }

  static percent(percentage) {
    return new Dimension(`${percentage}%`);
  }

  toCSSValue() {
    if (this.isAuto) return 'auto';
    if (this.isInfinity) return '100%';
    if (typeof this.value === 'number') return `${this.value}px`;
    return this.value;
  }

  toString() {
    return `Dimension(${this.value})`;
  }
}

export { SizedBox, Size, Dimension };