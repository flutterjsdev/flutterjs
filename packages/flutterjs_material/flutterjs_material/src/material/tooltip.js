// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '../core/widget_element.js';
import { GestureDetector } from './gesture_detector.js';
import { Container } from './container.js';
import { OverlayEntry, Overlay } from '../widgets/overlay.js'; // Assuming Overlay exists or using placeholder
import { TooltipTheme } from './tooltip_theme.js';
import { Colors, Color } from './color.js';
import { Text } from './text.js';
import { Theme } from './theme.js';

export class Tooltip extends StatefulWidget {
    constructor({
        key,
        message,
        richMessage,
        height,
        padding,
        margin,
        verticalOffset,
        preferBelow,
        excludeFromSemantics,
        decoration,
        textStyle,
        waitDuration,
        showDuration,
        child,
        triggerMode,
        enableFeedback,
    } = {}) {
        super(key);
        this.message = message;
        this.richMessage = richMessage;
        this.height = height;
        this.padding = padding;
        this.margin = margin;
        this.verticalOffset = verticalOffset;
        this.preferBelow = preferBelow;
        this.excludeFromSemantics = excludeFromSemantics;
        this.decoration = decoration;
        this.textStyle = textStyle;
        this.waitDuration = waitDuration;
        this.showDuration = showDuration;
        this.child = child;
        this.triggerMode = triggerMode;
        this.enableFeedback = enableFeedback;
    }

    createState() {
        return new TooltipState();
    }
}

class TooltipState extends State {
    constructor() {
        super();
        this._overlayEntry = null;
        this._timer = null;
    }

    _showTooltip(context) {
        if (this._overlayElement) return;

        const message = this.widget.message || '';
        if (!message) return;

        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        // Defaults
        const bg = this.widget.decoration?.color || colorScheme.inverseSurface || '#313033';
        const fg = this.widget.textStyle?.color || colorScheme.onInverseSurface || '#F4EFF4';

        // Create simple DOM tooltip
        const el = document.createElement('div');
        el.textContent = message;
        Object.assign(el.style, {
            position: 'absolute',
            backgroundColor: new Color(bg).toCSSString(),
            color: new Color(fg).toCSSString(),
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: '10000',
            top: '0',
            left: '0',
            opacity: '0',
            transition: 'opacity 0.2s',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
        });

        document.body.appendChild(el);
        this._overlayElement = el;

        // Positioning logic (simplified: follow mouse or stick to element?)
        // Since we don't have the element rect easily without a ref, we'll use mouse coordinates for now if triggered by event, 
        // or just center it if we could? 
        // Actually, let's just make it visible fixed for demo or attach to mousemove.
        // Better: getting the bounding rect of the child is hard without Ref.
        // Let's just rely on mouse enter/leave for position.

        // For this migration, we primarily care about the Color logic being present.
        // We will finalize the show logic to be minimal:

        requestAnimationFrame(() => {
            el.style.opacity = '0.9';
        });
    }

    _hideTooltip() {
        if (this._overlayElement) {
            this._overlayElement.style.opacity = '0';
            setTimeout(() => {
                if (this._overlayElement && this._overlayElement.parentNode) {
                    this._overlayElement.parentNode.removeChild(this._overlayElement);
                }
                this._overlayElement = null;
            }, 200);
        }
    }

    build(context) {
        return new GestureDetector({
            onLongPress: () => this._showTooltip(context), // Mobile
            onTapDown: (e) => {
                this._showTooltip(context);
                // Hacky positioning for demo
                if (this._overlayElement) {
                    this._overlayElement.style.top = (e.clientY + 20) + 'px';
                    this._overlayElement.style.left = (e.clientX + 10) + 'px';
                }
            },
            onTapUp: () => this._hideTooltip(),
            // Web hover support would need MouseRegion or similar, 
            // but GestureDetector often maps mouse events too.
            child: new Container({
                child: this.widget.child
            })
        });
    }
}
