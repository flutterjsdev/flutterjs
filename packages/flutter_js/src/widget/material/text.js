import { StatelessWidget } from './widget.js';
import { VNode } from './vnode.js';
import { TextAlign, TextOverflow, TextDirection } from './properties/index.js';

class Text extends StatelessWidget {
  constructor({
    key = null,
    data = '',
    style = null,
    textAlign = TextAlign.left,
    textDirection = TextDirection.ltr,
    overflow = TextOverflow.clip,
    maxLines = null,
    softWrap = true,
    semanticsLabel = null,
    selectable = false,
    selectionColor = null,
    onSelectionChanged = null
  } = {}) {
    super(key);
    this.data = data;
    this.style = style;
    this.textAlign = textAlign;
    this.textDirection = textDirection;
    this.overflow = overflow;
    this.maxLines = maxLines;
    this.softWrap = softWrap;
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
      className: 'fjs-text',
      style: inlineStyles,
      'data-element-id': elementId,
      'data-widget-path': widgetPath,
      'data-identification': context.element.getIdentificationStrategy(),
      'data-widget': 'Text',
      'data-text-align': this.textAlign,
      'data-overflow': this.overflow,
      'data-max-lines': this.maxLines
    };

    if (this.selectable) {
      props.className += ' fjs-text-selectable';
      props.style.userSelect = 'text';
      props.style.WebkitUserSelect = 'text';
      if (this.selectionColor) {
        props.style['--selection-color'] = this.selectionColor;
      }
    } else {
      props.style.userSelect = 'none';
      props.style.WebkitUserSelect = 'none';
    }

    const events = {};
    if (this.selectable && this.onSelectionChanged) {
      events.onselectionchange = () => this.onSelectionChanged(window.getSelection().toString());
    }

    return new VNode({
      tag: 'span',
      props,
      children: [this.data],
      key: this.key,
      events
    });
  }

  _getInlineStyles() {
    const styles = {
      display: 'inline-block',
      textAlign: this._mapTextAlign(),
      direction: this.textDirection === TextDirection.rtl ? 'rtl' : 'ltr',
      whiteSpace: this.softWrap ? 'normal' : 'nowrap',
      overflow: this._mapOverflow(),
      textOverflow: this.overflow === TextOverflow.ellipsis ? 'ellipsis' : 'clip'
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

    if (this.style) {
      Object.assign(styles, this._parseTextStyle(this.style));
    }

    return styles;
  }

  _mapTextAlign() {
    const map = {
      left: 'left',
      right: 'right',
      center: 'center',
      justify: 'justify',
      start: 'start',
      end: 'end'
    };
    return map[this.textAlign] || 'left';
  }

  _mapOverflow() {
    const map = {
      clip: 'hidden',
      fade: 'hidden',
      ellipsis: 'hidden',
      visible: 'visible'
    };
    return map[this.overflow] || 'hidden';
  }

  _parseTextStyle(style) {
    const cssStyle = {};

    if (style.fontSize) {
      cssStyle.fontSize = `${style.fontSize}px`;
    }

    if (style.fontWeight) {
      cssStyle.fontWeight = style.fontWeight;
    }

    if (style.fontStyle) {
      cssStyle.fontStyle = style.fontStyle === 'italic' ? 'italic' : 'normal';
    }

    if (style.color) {
      cssStyle.color = style.color;
    }

    if (style.letterSpacing) {
      cssStyle.letterSpacing = `${style.letterSpacing}px`;
    }

    if (style.wordSpacing) {
      cssStyle.wordSpacing = `${style.wordSpacing}px`;
    }

    if (style.lineHeight) {
      cssStyle.lineHeight = style.lineHeight;
    }

    if (style.fontFamily) {
      cssStyle.fontFamily = style.fontFamily;
    }

    if (style.decoration) {
      cssStyle.textDecoration = style.decoration;
    }

    if (style.decorationColor) {
      cssStyle.textDecorationColor = style.decorationColor;
    }

    if (style.decorationStyle) {
      cssStyle.textDecorationStyle = style.decorationStyle;
    }

    if (style.decorationThickness) {
      cssStyle.textDecorationThickness = `${style.decorationThickness}px`;
    }

    if (style.shadows && Array.isArray(style.shadows)) {
      cssStyle.textShadow = style.shadows
        .map(shadow => `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blurRadius}px ${shadow.color}`)
        .join(', ');
    }

    if (style.backgroundColor) {
      cssStyle.backgroundColor = style.backgroundColor;
    }

    return cssStyle;
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'data', value: this.data });
    properties.push({ name: 'textAlign', value: this.textAlign });
    properties.push({ name: 'overflow', value: this.overflow });
    properties.push({ name: 'maxLines', value: this.maxLines });
    properties.push({ name: 'softWrap', value: this.softWrap });
    properties.push({ name: 'selectable', value: this.selectable });
    if (this.style) {
      properties.push({ name: 'style', value: this.style.constructor.name });
    }
  }
}

export { Text };