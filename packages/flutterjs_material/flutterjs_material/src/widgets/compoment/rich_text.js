// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Widget, } from '../../core/widget_element.js';
import { Element } from "@flutterjs/runtime"
import { VNode } from '@flutterjs/vdom/vnode';
import { TextDirection, TextAlign, TextOverflow, TextBaseline } from '../../utils/utils.js';
// ============================================================================
// ENUMS
// ============================================================================


const TextWidthBasis = {
  parent: 'parent',
  longestLine: 'longestLine'
};


// ============================================================================
// TEXT SCALER
// ============================================================================

class TextScaler {
  constructor(scale = 1.0) {
    this.textScaleFactor = scale;
  }

  static get noScaling() {
    return new TextScaler(1.0);
  }

  static linear(factor = 1.0) {
    return new TextScaler(factor);
  }

  scale(textSize) {
    return textSize * this.textScaleFactor;
  }

  toString() {
    return `TextScaler(${this.textScaleFactor})`;
  }
}

// ============================================================================
// INLINE SPAN
// ============================================================================

class InlineSpan {
  constructor() {
    if (new.target === InlineSpan) {
      throw new Error('InlineSpan is abstract');
    }
  }

  toPlainText() {
    throw new Error('toPlainText() must be implemented');
  }

  buildVNode() {
    throw new Error('buildVNode() must be implemented');
  }
}

// ============================================================================
// TEXT SPAN
// ============================================================================

class TextSpan extends InlineSpan {
  constructor({
    text = '',
    style = null,
    children = [],
    recognizer = null
  } = {}) {
    super();

    this.text = text;
    this.style = style || {};
    this.children = children || [];
    this.recognizer = recognizer;
  }

  toPlainText() {
    let result = this.text || '';

    if (this.children && this.children.length > 0) {
      for (const child of this.children) {
        result += child.toPlainText?.() || '';
      }
    }

    return result;
  }

  buildVNode(textAlign = TextAlign.start, textDirection = TextDirection.ltr) {
    const style = this._getTextStyle(textAlign, textDirection);

    const childVNodes = this.children.map(child => {
      if (child instanceof TextSpan) {
        return child.buildVNode(textAlign, textDirection);
      }
      if (child instanceof WidgetSpan) {
        return child.buildVNode();
      }
      return new VNode({
        tag: 'span',
        children: [String(child)]
      });
    });

    if (this.text) {
      childVNodes.unshift(new VNode({
        tag: 'span',
        children: [this.text]
      }));
    }

    return new VNode({
      tag: 'span',
      props: {
        style,
        onClick: this.recognizer?.onTap,
        onMouseDown: this.recognizer?.onLongPress
      },
      children: childVNodes.length > 0 ? childVNodes : [this.text || '']
    });
  }

  _getTextStyle(textAlign, textDirection) {
    const style = { ...this.style };

    // Ensure style is object
    if (typeof this.style === 'string') {
      return {};
    }

    return style;
  }
}

// ============================================================================
// WIDGET SPAN
// ============================================================================

class WidgetSpan extends InlineSpan {
  constructor({
    child = null,
    alignment = 'baseline',
    baseline = TextBaseline.alphabetic,
    style = null
  } = {}) {
    super();

    this.child = child;
    this.alignment = alignment;
    this.baseline = baseline;
    this.style = style;
  }

  toPlainText() {
    return '\uFFFD'; // Replacement character
  }

  buildVNode() {
    if (!this.child) {
      return new VNode({ tag: 'span', children: ['\uFFFD'] });
    }

    const childElement = this.child.createElement?.();
    if (childElement) {
      return childElement.performRebuild?.();
    }

    return new VNode({
      tag: 'span',
      props: {
        style: {
          display: 'inline-flex',
          alignItems: this.alignment,
          verticalAlign: this.baseline
        }
      },
      children: [this.child]
    });
  }

  /**
   * Extract widgets from inline span tree
   * @static
   */
  static extractFromInlineSpan(span, textScaler) {
    const widgets = [];

    function traverse(inlineSpan) {
      if (inlineSpan instanceof WidgetSpan) {
        widgets.push(inlineSpan.child);
      }

      if (inlineSpan.children) {
        for (const child of inlineSpan.children) {
          traverse(child);
        }
      }
    }

    traverse(span);
    return widgets;
  }
}

// ============================================================================
// TEXT STYLE
// ============================================================================

// ============================================================================
// STRUT STYLE
// ============================================================================

class StrutStyle {
  constructor({
    fontFamily = null,
    fontFamilyFallback = [],
    fontSize = null,
    height = null,
    leading = null,
    fontWeight = null,
    fontStyle = null,
    forceStrutHeight = false
  } = {}) {
    this.fontFamily = fontFamily;
    this.fontFamilyFallback = fontFamilyFallback;
    this.fontSize = fontSize;
    this.height = height;
    this.leading = leading;
    this.fontWeight = fontWeight;
    this.fontStyle = fontStyle;
    this.forceStrutHeight = forceStrutHeight;
  }

  toCSSStyle() {
    const style = {};

    if (this.fontFamily) style.fontFamily = this.fontFamily;
    if (this.fontSize) style.fontSize = `${this.fontSize}px`;
    if (this.height) style.lineHeight = this.height;
    if (this.fontWeight) style.fontWeight = this.fontWeight;
    if (this.fontStyle) style.fontStyle = this.fontStyle;

    return style;
  }
}

// ============================================================================
// RENDER PARAGRAPH
// ============================================================================

class RenderParagraph {
  constructor({
    text = null,
    textAlign = TextAlign.start,
    textDirection = TextDirection.ltr,
    softWrap = true,
    overflow = TextOverflow.clip,
    textScaler = null,
    maxLines = null,
    locale = null,
    strutStyle = null,
    textWidthBasis = TextWidthBasis.parent,
    textHeightBehavior = null,
    selectionColor = null,
    registrar = null
  } = {}) {
    this.text = text;
    this.textAlign = textAlign;
    this.textDirection = textDirection;
    this.softWrap = softWrap;
    this.overflow = overflow;
    this.textScaler = textScaler || TextScaler.noScaling;
    this.maxLines = maxLines;
    this.locale = locale;
    this.strutStyle = strutStyle;
    this.textWidthBasis = textWidthBasis;
    this.textHeightBehavior = textHeightBehavior;
    this.selectionColor = selectionColor;
    this.registrar = registrar;
  }

  debugInfo() {
    return {
      type: 'RenderParagraph',
      textAlign: this.textAlign,
      textDirection: this.textDirection,
      softWrap: this.softWrap,
      overflow: this.overflow,
      maxLines: this.maxLines,
      textScaleFactor: this.textScaler.textScaleFactor
    };
  }
}

// ============================================================================
// RICH TEXT WIDGET
// ============================================================================

class RichText extends Widget {
  constructor({
    key = null,
    text = null,
    textAlign = TextAlign.start,
    textDirection = null,
    softWrap = true,
    overflow = TextOverflow.clip,
    textScaleFactor = 1.0,
    textScaler = null,
    maxLines = null,
    locale = null,
    strutStyle = null,
    textWidthBasis = TextWidthBasis.parent,
    textHeightBehavior = null,
    selectionRegistrar = null,
    selectionColor = null
  } = {}) {
    super(key);

    if (!text) {
      throw new Error('RichText requires a text (InlineSpan)');
    }

    if (maxLines !== null && maxLines <= 0) {
      throw new Error('maxLines must be null or > 0');
    }

    if (selectionRegistrar && !selectionColor) {
      throw new Error('selectionColor is required when selectionRegistrar is provided');
    }

    // Resolve text scaler
    let effectiveTextScaler = textScaler || TextScaler.noScaling;
    if (textScaleFactor !== 1.0 && textScaler === null) {
      effectiveTextScaler = TextScaler.linear(textScaleFactor);
    }

    this.text = text;
    this.textAlign = textAlign;
    this.textDirection = textDirection;
    this.softWrap = softWrap;
    this.overflow = overflow;
    this.textScaler = effectiveTextScaler;
    this.maxLines = maxLines;
    this.locale = locale;
    this.strutStyle = strutStyle;
    this.textWidthBasis = textWidthBasis;
    this.textHeightBehavior = textHeightBehavior;
    this.selectionRegistrar = selectionRegistrar;
    this.selectionColor = selectionColor;
    this._renderObject = null;
  }

  /**
   * Create render object
   */
  createRenderObject(context) {
    return new RenderParagraph({
      text: this.text,
      textAlign: this.textAlign,
      textDirection: this.textDirection || context?.textDirection || TextDirection.ltr,
      softWrap: this.softWrap,
      overflow: this.overflow,
      textScaler: this.textScaler,
      maxLines: this.maxLines,
      locale: this.locale,
      strutStyle: this.strutStyle,
      textWidthBasis: this.textWidthBasis,
      textHeightBehavior: this.textHeightBehavior,
      selectionColor: this.selectionColor,
      registrar: this.selectionRegistrar
    });
  }

  /**
   * Update render object
   */
  updateRenderObject(context, renderObject) {
    renderObject.text = this.text;
    renderObject.textAlign = this.textAlign;
    renderObject.textDirection = this.textDirection || context?.textDirection || TextDirection.ltr;
    renderObject.softWrap = this.softWrap;
    renderObject.overflow = this.overflow;
    renderObject.textScaler = this.textScaler;
    renderObject.maxLines = this.maxLines;
    renderObject.locale = this.locale;
    renderObject.strutStyle = this.strutStyle;
    renderObject.textWidthBasis = this.textWidthBasis;
    renderObject.textHeightBehavior = this.textHeightBehavior;
    renderObject.selectionColor = this.selectionColor;
    renderObject.registrar = this.selectionRegistrar;
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
    const effectiveTextDirection = this.textDirection || context?.textDirection || TextDirection.ltr;

    // Build text VNode
    const textVNode = this.text.buildVNode(this.textAlign, effectiveTextDirection);

    // Map text align to CSS
    const textAlignValue = this._mapTextAlign(this.textAlign, effectiveTextDirection);

    // Determine overflow behavior
    let overflowStyle = {};
    switch (this.overflow) {
      case TextOverflow.ellipsis:
        overflowStyle = {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        };
        break;
      case TextOverflow.fade:
        overflowStyle = {
          overflow: 'hidden',
          mask: 'linear-gradient(to right, black 95%, transparent)'
        };
        break;
      case TextOverflow.clip:
        overflowStyle = {
          overflow: 'hidden'
        };
        break;
      case TextOverflow.visible:
        overflowStyle = {
          overflow: 'visible'
        };
        break;
    }

    const style = {
      textAlign: textAlignValue,
      direction: effectiveTextDirection === TextDirection.rtl ? 'rtl' : 'ltr',
      whiteSpace: this.softWrap ? 'pre-wrap' : 'pre', // Use pre-wrap to preserve newlines AND wrap text
      wordWrap: this.softWrap ? 'break-word' : 'normal',
      display: 'block',
      ...overflowStyle
    };

    // Apply max lines
    if (this.maxLines !== null) {
      style.display = '-webkit-box';
      style.WebkitLineClamp = this.maxLines;
      style.WebkitBoxOrient = 'vertical';
      style.overflow = 'hidden';
    }

    // Apply strut style
    if (this.strutStyle) {
      Object.assign(style, this.strutStyle.toCSSStyle());
    }

    // Apply selection color
    if (this.selectionColor) {
      style.userSelect = 'text';
    }

    return new VNode({
      tag: 'div',
      props: {
        style,
        'data-element-id': elementId,
        'data-widget-path': widgetPath,
        'data-widget': 'RichText',
        'data-text-align': this.textAlign,
        'data-text-direction': effectiveTextDirection,
        'data-overflow': this.overflow,
        'data-max-lines': this.maxLines,
        'data-soft-wrap': this.softWrap
      },
      children: [textVNode],
      key: this.key
    });
  }

  /**
   * Map text align to CSS
   * @private
   */
  _mapTextAlign(textAlign, textDirection) {
    const isRTL = textDirection === TextDirection.rtl;

    // Handle shorthand string: ".center" -> "center"
    if (typeof textAlign === 'string' && textAlign.startsWith('.')) {
      textAlign = textAlign.substring(1);
    }

    switch (textAlign) {
      case TextAlign.start:
        return isRTL ? 'right' : 'left';
      case TextAlign.end:
        return isRTL ? 'left' : 'right';
      case TextAlign.left:
        return 'left';
      case TextAlign.right:
        return 'right';
      case TextAlign.center:
        return 'center';
      case TextAlign.justify:
        return 'justify';
      default:
        return 'start';
    }
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'textAlign', value: this.textAlign });
    properties.push({ name: 'textDirection', value: this.textDirection });
    properties.push({ name: 'softWrap', value: this.softWrap });
    properties.push({ name: 'overflow', value: this.overflow });
    properties.push({ name: 'textScaleFactor', value: this.textScaler.textScaleFactor });
    properties.push({ name: 'maxLines', value: this.maxLines });
    properties.push({ name: 'text', value: this.text.toPlainText?.() || 'N/A' });
  }

  createElement(parent, runtime) {
    return new RichTextElement(this, parent, runtime);
  }
}

class RichTextElement extends Element {
  performRebuild() {
    return this.widget.build(this.context);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  RichText,
  RichTextElement,
  RenderParagraph,
  TextSpan,
  WidgetSpan,
  InlineSpan,
  StrutStyle,
  TextScaler,
  TextAlign,
  TextOverflow,
  TextWidthBasis,
  TextBaseline
};