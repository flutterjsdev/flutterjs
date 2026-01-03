import { StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { TextAlign, TextOverflow, TextDirection } from '../utils/utils.js';

/**
 * TextStyle - Comprehensive text styling class with Flutter-like API
 * Supports Google Fonts, text decorations, shadows, and advanced typography
 */
class TextStyle {
  constructor({
    color = '#000000',
    fontSize = 14,
    fontWeight = '400',
    fontStyle = 'normal',
    fontFamily = 'Roboto',
    height = 1.5,
    letterSpacing = 0,
    wordSpacing = 0,
    decoration = 'none',
    decorationColor = null,
    decorationStyle = 'solid',
    decorationThickness = 1,
    shadows = null,
    backgroundColor = null,
    backgroundOpacity = 1,
    googleFont = null,
    fontVariant = 'normal',
    textTransform = 'none',
    opacity = 1,
    strikethrough = false,
    underline = false,
    overline = false,
    gradient = null
  } = {}) {
    this.color = color;
    this.fontSize = fontSize;
    this.fontWeight = fontWeight;
    this.fontStyle = fontStyle;
    this.fontFamily = fontFamily;
    this.height = height;
    this.letterSpacing = letterSpacing;
    this.wordSpacing = wordSpacing;
    this.decoration = decoration;
    this.decorationColor = decorationColor;
    this.decorationStyle = decorationStyle;
    this.decorationThickness = decorationThickness;
    this.shadows = shadows;
    this.backgroundColor = backgroundColor;
    this.backgroundOpacity = backgroundOpacity;
    this.googleFont = googleFont;
    this.fontVariant = fontVariant;
    this.textTransform = textTransform;
    this.opacity = opacity;
    this.strikethrough = strikethrough;
    this.underline = underline;
    this.overline = overline;
    this.gradient = gradient;

    if (this.googleFont) {
      this._loadGoogleFont(this.googleFont);
    }
  }

  // Static presets for common text styles
  static preset = {
    h1: new TextStyle({ fontSize: 32, fontWeight: '700', height: 1.2 }),
    h2: new TextStyle({ fontSize: 28, fontWeight: '700', height: 1.3 }),
    h3: new TextStyle({ fontSize: 24, fontWeight: '600', height: 1.4 }),
    h4: new TextStyle({ fontSize: 20, fontWeight: '600', height: 1.4 }),
    h5: new TextStyle({ fontSize: 16, fontWeight: '600', height: 1.5 }),
    h6: new TextStyle({ fontSize: 14, fontWeight: '600', height: 1.5 }),
    body1: new TextStyle({ fontSize: 16, fontWeight: '400', height: 1.5 }),
    body2: new TextStyle({ fontSize: 14, fontWeight: '400', height: 1.5 }),
    caption: new TextStyle({ fontSize: 12, fontWeight: '400', height: 1.4, opacity: 0.7 }),
    button: new TextStyle({ fontSize: 14, fontWeight: '600', textTransform: 'uppercase' }),
    code: new TextStyle({ fontSize: 13, fontFamily: 'monospace', fontWeight: '400' })
  };

  static availableGoogleFonts = [
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Raleway', 'Poppins',
    'Inter', 'Playfair Display', 'Bebas Neue', 'Pacifico', 'Merriweather',
    'Ubuntu', 'Quicksand', 'Source Code Pro', 'IBM Plex Mono', 'Fira Sans',
    'Oswald', 'Crimson Text', 'Nunito', 'Chakra Petch', 'JetBrains Mono',
    'Space Mono', 'Inconsolata', 'Roboto Mono', 'Cabin', 'Work Sans'
  ];

  static fontWeights = {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900'
  };

  static textDecorations = {
    none: 'none',
    underline: 'underline',
    overline: 'overline',
    lineThrough: 'line-through',
    underlineOverline: 'underline overline'
  };

  _loadGoogleFont(fontName) {
    if (typeof document === 'undefined') return;

    const formattedName = fontName.replace(/\s+/g, '+');
    const linkId = `google-font-${fontName.replace(/\s+/g, '-')}`;

    if (document.getElementById(linkId)) return;

    const link = document.createElement('link');
    link.id = linkId;
    link.href = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
    link.rel = 'stylesheet';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }

  copyWith({
    color,
    fontSize,
    fontWeight,
    fontStyle,
    fontFamily,
    height,
    letterSpacing,
    wordSpacing,
    decoration,
    decorationColor,
    decorationStyle,
    decorationThickness,
    shadows,
    backgroundColor,
    backgroundOpacity,
    googleFont,
    fontVariant,
    textTransform,
    opacity,
    strikethrough,
    underline,
    overline,
    gradient
  } = {}) {
    return new TextStyle({
      color: color ?? this.color,
      fontSize: fontSize ?? this.fontSize,
      fontWeight: fontWeight ?? this.fontWeight,
      fontStyle: fontStyle ?? this.fontStyle,
      fontFamily: fontFamily ?? this.fontFamily,
      height: height ?? this.height,
      letterSpacing: letterSpacing ?? this.letterSpacing,
      wordSpacing: wordSpacing ?? this.wordSpacing,
      decoration: decoration ?? this.decoration,
      decorationColor: decorationColor ?? this.decorationColor,
      decorationStyle: decorationStyle ?? this.decorationStyle,
      decorationThickness: decorationThickness ?? this.decorationThickness,
      shadows: shadows ?? this.shadows,
      backgroundColor: backgroundColor ?? this.backgroundColor,
      backgroundOpacity: backgroundOpacity ?? this.backgroundOpacity,
      googleFont: googleFont ?? this.googleFont,
      fontVariant: fontVariant ?? this.fontVariant,
      textTransform: textTransform ?? this.textTransform,
      opacity: opacity ?? this.opacity,
      strikethrough: strikethrough ?? this.strikethrough,
      underline: underline ?? this.underline,
      overline: overline ?? this.overline,
      gradient: gradient ?? this.gradient
    });
  }

  merge(other) {
    if (!other) return this;
    return this.copyWith(other);
  }

  _buildTextDecoration() {
    const decorations = [];
    if (this.underline) decorations.push('underline');
    if (this.overline) decorations.push('overline');
    if (this.strikethrough) decorations.push('line-through');
    return decorations.length > 0 ? decorations.join(' ') : this.decoration;
  }

  _buildTextShadow() {
    if (!this.shadows || !Array.isArray(this.shadows)) return 'none';
    return this.shadows
      .map(s => {
        const offsetX = s.offsetX ?? 0;
        const offsetY = s.offsetY ?? 0;
        const blurRadius = s.blurRadius ?? 0;
        const color = s.color ?? 'rgba(0,0,0,0.3)';
        return `${offsetX}px ${offsetY}px ${blurRadius}px ${color}`;
      })
      .join(', ');
  }

  _buildBackground() {
    if (this.gradient) {
      return this.gradient;
    }

    if (!this.backgroundColor) return 'transparent';

    if (this.backgroundOpacity < 1) {
      const rgb = this._hexToRgb(this.backgroundColor);
      return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.backgroundOpacity})` : this.backgroundColor;
    }

    return this.backgroundColor;
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  toCSSString() {
    const decorationStyle = this._buildTextDecoration();

    return {
      color: this.color,
      fontSize: `${this.fontSize}px`,
      fontWeight: this.fontWeight,
      fontStyle: this.fontStyle,
      fontFamily: this.fontFamily,
      lineHeight: this.height,
      letterSpacing: `${this.letterSpacing}px`,
      wordSpacing: `${this.wordSpacing}px`,
      textDecoration: decorationStyle,
      textDecorationColor: this.decorationColor || 'currentColor',
      textDecorationStyle: this.decorationStyle,
      textDecorationThickness: `${this.decorationThickness}px`,
      backgroundColor: this._buildBackground(),
      fontVariant: this.fontVariant,
      textTransform: this.textTransform,
      opacity: this.opacity,
      textShadow: this._buildTextShadow()
    };
  }

  toCSSObject() {
    return this.toCSSString();
  }

  toFlutterString() {
    return `TextStyle(color: ${this.color}, size: ${this.fontSize}, family: ${this.fontFamily}, weight: ${this.fontWeight})`;
  }

  toString() {
    return `TextStyle(color: ${this.color}, size: ${this.fontSize}px, family: ${this.fontFamily}, weight: ${this.fontWeight})`;
  }
}

/**
 * Text - StatelessWidget for rendering text with comprehensive styling
 * Supports selection, overflow handling, max lines, and text alignment
 */
class Text extends StatelessWidget {
  constructor(dataOrOptions, options = {}) {
    let _data = '';
    let _opts = {};

    if (typeof dataOrOptions === 'string') {
      _data = dataOrOptions;
      _opts = options;
    } else {
      _opts = dataOrOptions || {};
      _data = _opts.data || '';
    }

    const {
      key = null,
      style = new TextStyle(),
      textAlign = TextAlign.left,
      textDirection = TextDirection.ltr,
      overflow = TextOverflow.clip,
      maxLines = null,
      softWrap = true,
      semanticsLabel = null,
      selectable = true,
      selectionColor = null,
      onSelectionChanged = null
    } = _opts;

    super(key);
    this.data = _data;
    this.style = style instanceof TextStyle ? style : new TextStyle(style);
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
      // className: 'fjs-text',
      style: inlineStyles,
      'data-element-id': elementId,
      'data-widget-path': widgetPath,
      'data-identification': context.element.getIdentificationStrategy(),
      'data-widget': 'Text',
      'data-text-align': this.textAlign,
      'data-overflow': this.overflow,
      'data-max-lines': this.maxLines,
      title: this.semanticsLabel || this.data
    };

    if (this.selectable) {
      props.className += ' fjs-text-selectable';
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
      textOverflow: this.overflow === TextOverflow.ellipsis ? 'ellipsis' : 'clip',
      boxSizing: 'border-box'
    };

    // Handle max lines
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

    // Merge text style
    if (this.style && this.style instanceof TextStyle) {
      Object.assign(styles, this.style.toCSSString());
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
    properties.push({ name: 'data', value: this.data });
    properties.push({ name: 'textAlign', value: this.textAlign });
    properties.push({ name: 'overflow', value: this.overflow });
    properties.push({ name: 'maxLines', value: this.maxLines });
    properties.push({ name: 'softWrap', value: this.softWrap });
    properties.push({ name: 'selectable', value: this.selectable });
    if (this.style && this.style instanceof TextStyle) {
      properties.push({ name: 'style', value: this.style.toString() });
    }
  }
}

export { Text, TextStyle };