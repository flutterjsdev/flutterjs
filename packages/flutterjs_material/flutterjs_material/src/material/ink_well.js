// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, StatelessWidget } from '../core/widget_element.js';
import { Container } from './container.js';
import { GestureDetector } from './gesture_detector.js';
import { Theme } from './theme.js';

export class InkResponse extends StatelessWidget {
    constructor({
        key,
        child,
        onTap,
        onTapDown,
        onTapUp,
        onTapCancel,
        onDoubleTap,
        onLongPress,
        onHighlightChanged,
        onHover,
        mouseCursor,
        containedInkWell = false,
        highlightShape,
        radius,
        borderRadius,
        customBorder,
        focusColor,
        hoverColor,
        highlightColor,
        overlayColor,
        splashColor,
        splashFactory,
        enableFeedback = true,
        excludeFromSemantics = false,
        focusNode,
        canRequestFocus = true,
        onFocusChange,
        autofocus = false,
    } = {}) {
        super(key);
        this.child = child;
        this.onTap = onTap;
        // ... other props
        this.borderRadius = borderRadius;
        // Theme defaults resolve lazily or here? 
        // In simple widget, we can't context here easily unless built. 
        // But InkResponse IS a StatelessWidget (in this impl).
        // Wait, InkResponse usually is a widget.

        this._highlightColor = highlightColor;
        this._splashColor = splashColor;
    }

    build(context) {
        const theme = Theme.of(context);
        const effectiveHighlightColor = this._highlightColor || theme.highlightColor || 'rgba(0,0,0,0.1)';
        const effectiveSplashColor = this._splashColor || theme.splashColor || 'rgba(0,0,0,0.1)';

        // Simplified Web Implementation:
        // Use GestureDetector for events.
        // Use CSS 'active' state or simple ripple simulation if possible via CSS active/focus.
        // For real ripple effect, we'd need a RenderObject or complex DOM manipulation.

        return new GestureDetector({
            onTap: this.onTap,
            child: new Container({
                child: this.child,
                decoration: {
                    borderRadius: this.borderRadius
                },
                style: {
                    cursor: 'pointer',
                    // Basic CSS ripple visual
                    position: 'relative',
                    overflow: 'hidden'
                },
                // We'd add event listeners for ripple effect here in a real DOM Element wrapper
            })
        });
    }
}

export class InkWell extends InkResponse {
    constructor({
        key,
        child,
        onTap,
        onDoubleTap,
        onLongPress,
        onTapDown,
        onTapUp,
        onTapCancel,
        onHighlightChanged,
        onHover,
        mouseCursor,
        focusColor,
        hoverColor,
        highlightColor,
        overlayColor,
        splashColor,
        splashFactory,
        radius,
        borderRadius,
        customBorder,
        enableFeedback = true,
        excludeFromSemantics = false,
        focusNode,
        canRequestFocus = true,
        onFocusChange,
        autofocus = false,
    } = {}) {
        super({
            key,
            child,
            onTap,
            onDoubleTap,
            onLongPress,
            onTapDown,
            onTapUp,
            onTapCancel,
            onHighlightChanged,
            onHover,
            mouseCursor,
            containedInkWell: true,
            highlightShape: 'rectangle', // BoxShape.rectangle
            radius,
            borderRadius,
            customBorder,
            focusColor,
            hoverColor,
            highlightColor,
            overlayColor,
            splashColor,
            splashFactory,
            enableFeedback,
            excludeFromSemantics,
            focusNode,
            canRequestFocus,
            onFocusChange,
            autofocus,
        });
    }
}
