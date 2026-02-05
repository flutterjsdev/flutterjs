// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '../core/widget_element.js';
import { IconButton } from './icon_button.js';
import { Icon, Icons } from './icon.js';
import { Theme } from './theme.js';
import { Color } from '../utils/color.js';
// import { showMenu } from './popup_menu.js'; // Cyclic dependency if in same file? 
// In FlutterJS we might put top level showMenu here.

export class PopupMenuEntry extends StatefulWidget {
    constructor({ key } = {}) {
        super(key);
    }
}

export class PopupMenuDivider extends PopupMenuEntry {
    constructor({ key, height = 16 } = {}) {
        super({ key });
        this.height = height;
    }

    createState() {
        return new PopupMenuDividerState();
    }
}

class PopupMenuDividerState extends State {
    build(context) {
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;
        const dividerColor = theme.dividerColor || colorScheme.outlineVariant || '#CAC4D0';

        // Simple divider implementation
        return {
            tag: 'div',
            style: {
                height: `${this.widget.height}px`,
                borderBottom: `1px solid ${typeof dividerColor === 'string' ? dividerColor : (dividerColor.toCSSString ? dividerColor.toCSSString() : '#ddd')}`
            }
        };
    }
}

export class PopupMenuItem extends PopupMenuEntry {
    constructor({
        key,
        value,
        onTap,
        enabled = true,
        height = 48.0,
        padding,
        textStyle,
        mouseCursor,
        child,
    } = {}) {
        super({ key });
        this.value = value;
        this.onTap = onTap;
        this.enabled = enabled;
        this.height = height;
        this.padding = padding;
        this.textStyle = textStyle;
        this.mouseCursor = mouseCursor;
        this.child = child;
    }

    createState() {
        return new PopupMenuItemState();
    }
}

class PopupMenuItemState extends State {
    build(context) {
        // Simplified item
        // Should handle tap and return value to menu opener
        return {
            tag: 'div',
            style: {
                height: `${this.widget.height}px`,
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                cursor: this.widget.enabled ? 'pointer' : 'default',
                opacity: this.widget.enabled ? 1 : 0.38
            },
            onClick: () => {
                if (this.widget.enabled) {
                    this.widget.onTap?.();
                    // Close menu logic would happen here if we had access to menu context
                }
            },
            child: this.widget.child
        };
    }
}

export class PopupMenuButton extends StatefulWidget {
    constructor({
        key,
        itemBuilder,
        initialValue,
        onSelected,
        onCanceled,
        tooltip,
        elevation,
        shadowColor,
        surfaceTintColor,
        padding,
        child,
        splashRadius,
        icon,
        iconSize,
        offset,
        enabled = true,
        shape,
        color,
        enableFeedback,
        constraints,
        position,
        clipBehavior,
    } = {}) {
        super(key);
        this.itemBuilder = itemBuilder;
        this.initialValue = initialValue;
        this.onSelected = onSelected;
        this.onCanceled = onCanceled;
        this.tooltip = tooltip;
        this.elevation = elevation;
        this.padding = padding;
        this.child = child;
        this.icon = icon;
        this.enabled = enabled;
    }

    createState() {
        return new PopupMenuButtonState();
    }
}

class PopupMenuButtonState extends State {
    showButtonMenu() {
        // Logic to show menu
        // 1. Get items from builder
        // 2. Compute position
        // 3. Show overlay/dialog
        // 4. Handle selection

        const items = this.widget.itemBuilder(this.context);
        console.warn('PopupMenuButton showMenu not fully implemented (requires Overlay). Items:', items);
    }

    build(context) {
        return this.widget.child
            ? new GestureDetector({ onTap: () => this.showButtonMenu(), child: this.widget.child })
            : new IconButton({
                icon: this.widget.icon || new Icon(Icons.moreVert),
                onPressed: this.widget.enabled ? () => this.showButtonMenu() : null,
                tooltip: this.widget.tooltip,
            });
    }
}
