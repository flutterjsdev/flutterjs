// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { TextAlign, TextOverflow, TextDirection } from '../utils/utils.js';
import { TextStyle } from '../painting/text_style.js';
import { Theme } from './theme.js';


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
    this.selectionColor = selectionColor;
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

      const theme = Theme.of(context);
      // Default browser selection is usually Blue. M3 uses primaryContainer or primary with opacity.
      // e.g. blue with 0.4 opacity
      const defaultSelectionColor = theme.colorScheme?.primary ? theme.colorScheme.primary + '66' : '#b3d9ff';
      const effectiveSelectionColor = this.selectionColor || defaultSelectionColor;

      if (effectiveSelectionColor) {
        props.style['--selection-color'] = effectiveSelectionColor;
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
      whiteSpace: this.softWrap ? 'pre-wrap' : 'pre', // Use pre-wrap to preserve newlines and wrap
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
    if (this.style && typeof this.style.toCSSString === 'function') {
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

export { Text };