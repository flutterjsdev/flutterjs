import { StatelessWidget } from '../../core/widget.js';
import { VNode } from '../../vdom/vnode.js';
import { TextAlign, TextOverflow, TextDirection } from '../utils/utils.js';
import { TextStyle } from './text.js';

/**
 * TextSpan - Represents a span of text with optional styling
 * Used within RichText for mixed formatting
 */
class TextSpan {
  constructor({
    text = '',
    style = null,
    children = null,
    recognizer = null,
    onTap = null,
    semanticsLabel = null
  } = {}) {
    this.text = text;
    this.style = style instanceof TextStyle ? style : (style ? new TextStyle(style) : null);
    this.children = Array.isArray(children) ? children : (children ? [children] : null);
    this.recognizer = recognizer;
    this.onTap = onTap;
    this.semanticsLabel = semanticsLabel;
  }

  toVNode() {
    const styles = this.style ? this.style.toCSSString() : {};
    
    const props = {
      style: styles,
      className: 'text-span'
    };

    if (this.semanticsLabel) {
      props.title = this.semanticsLabel;
    }

    const events = {};
    if (this.onTap) {
      events.onClick = this.onTap;
      props.style.cursor = 'pointer';
    }

    const children = [];
    if (this.text) {
      children.push(this.text);
    }
    
    if (this.children && Array.isArray(this.children)) {
      this.children.forEach(child => {
        if (child instanceof TextSpan) {
          children.push(child.toVNode());
        } else if (typeof child === 'string') {
          children.push(child);
        }
      });
    }

    return new VNode({
      tag: 'span',
      props,
      children,
      events
    });
  }

  toString() {
    let result = this.text;
    if (this.children && Array.isArray(this.children)) {
      result += this.children.map(c => c.toString()).join('');
    }
    return result;
  }

  getTextLength() {
    let length = this.text.length;
    if (this.children && Array.isArray(this.children)) {
      length += this.children.reduce((sum, child) => {
        return sum + (child instanceof TextSpan ? child.getTextLength() : 0);
      }, 0);
    }
    return length;
  }
}

/**
 * RichText - Widget for displaying text with multiple styles
 * Allows complex text layouts with mixed formatting
 */
class RichText extends StatelessWidget {
  constructor({
    key = null,
    text = null,
    textAlign = TextAlign.left,
    textDirection = TextDirection.ltr,
    softWrap = true,
    overflow = TextOverflow.clip,
    maxLines = null,
    textScaleFactor = 1.0,
    locale = null,
    semanticsLabel = null,
    selectable = false,
    selectionColor = null,
    onSelectionChanged = null
  } = {}) {
    super(key);
    
    if (!text || !(text instanceof TextSpan)) {
      throw new Error('RichText requires a valid TextSpan as text parameter');
    }
    
    this.text = text;
    this.textAlign = textAlign;
    this.textDirection = textDirection;
    this.softWrap = softWrap;
    this.overflow = overflow;
    this.maxLines = maxLines;
    this.textScaleFactor = textScaleFactor;
    this.locale = locale;
    this.semanticsLabel = semanticsLabel;
    this.selectable = selectable;
    this.selectionColor = selectionColor || '#b3d9ff';
    this.onSelectionChanged = onSelectionChanged;
  }

  build(context) {
    const inlineStyles = this._getInlineStyles();
    const elementId = context.element.getElementId();
    const widgetPath = context.element.getWidgetPath();

    const props = {
      className: 'rich-text',
      style: inlineStyles,
      'data-element-id': elementId,
      'data-widget-path': widgetPath,
      'data-identification': context.element.getIdentificationStrategy(),
      'data-widget': 'RichText',
      'data-text-align': this.textAlign,
      'data-overflow': this.overflow,
      'data-max-lines': this.maxLines,
      title: this.semanticsLabel || this.text.toString(),
      lang: this.locale
    };

    if (this.selectable) {
      props.className += ' rich-text-selectable';
      props.style.userSelect = 'text';
      props.style.WebkitUserSelect = 'text';
      props.style.MozUserSelect = 'text';
      if (this.selectionColor) {
        props.style['--selection-color'] = this.selectionColor;
      }
    } else {
      props.style.userSelect = 'none';
      props.style.WebkitUserSelect = 'none';
      props.style.MozUserSelect = 'none';
    }

    const events = {};
    if (this.selectable && this.onSelectionChanged) {
      events.onselectionchange = () => {
        const selected = window.getSelection ? window.getSelection().toString() : '';
        this.onSelectionChanged(selected);
      };
    }

    const children = [this.text.toVNode()];

    return new VNode({
      tag: 'div',
      props,
      children,
      key: this.key,
      events
    });
  }

  _getInlineStyles() {
    const styles = {
      textAlign: this._mapTextAlign(),
      direction: this.textDirection === TextDirection.rtl ? 'rtl' : 'ltr',
      whiteSpace: this.softWrap ? 'normal' : 'nowrap',
      overflow: this._mapOverflow(),
      textOverflow: this.overflow === TextOverflow.ellipsis ? 'ellipsis' : 'clip',
      boxSizing: 'border-box',
      wordBreak: 'break-word'
    };

    if (this.maxLines === 1) {
      styles.overflow = 'hidden';
      styles.textOverflow = 'ellipsis';
      styles.whiteSpace = 'nowrap';
    } else if (this.maxLines && this.maxLines > 1) {
      styles.display = '-webkit-box';
      styles.WebkitLineClamp = this.maxLines;
      styles.WebkitBoxOrient = 'vertical';
      styles.overflow = 'hidden';
    }

    if (this.textScaleFactor !== 1.0) {
      styles.transform = `scale(${this.textScaleFactor})`;
      styles.transformOrigin = 'top left';
    }

    return styles;
  }

  _mapTextAlign() {
    const alignMap = {
      left: 'left',
      right: 'right',
      center: 'center',
      justify: 'justify',
      start: 'start',
      end: 'end'
    };
    return alignMap[this.textAlign] ?? 'left';
  }

  _mapOverflow() {
    const overflowMap = {
      clip: 'hidden',
      fade: 'hidden',
      ellipsis: 'hidden',
      visible: 'visible'
    };
    return overflowMap[this.overflow] ?? 'hidden';
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'textAlign', value: this.textAlign });
    properties.push({ name: 'overflow', value: this.overflow });
    properties.push({ name: 'maxLines', value: this.maxLines });
    properties.push({ name: 'softWrap', value: this.softWrap });
    properties.push({ name: 'selectable', value: this.selectable });
    properties.push({ name: 'textLength', value: this.text.getTextLength() });
  }
}

export { RichText, TextSpan };