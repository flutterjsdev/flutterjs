// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { Row, Column } from '../widgets/widgets.js';
import { MainAxisAlignment, MainAxisSize, CrossAxisAlignment } from '../utils/utils.js';
import { ButtonBarTheme } from './button_bar_theme.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { Container } from './container.js';

export class ButtonBar extends StatelessWidget {
    constructor({
        key,
        alignment,
        mainAxisSize,
        buttonTextTheme,
        buttonMinWidth,
        buttonHeight,
        buttonPadding,
        buttonAlignedDropdown,
        layoutBehavior,
        overflowDirection,
        overflowButtonSpacing,
        children = [],
    } = {}) {
        super(key);
        this.alignment = alignment;
        this.mainAxisSize = mainAxisSize;
        this.buttonTextTheme = buttonTextTheme;
        this.buttonMinWidth = buttonMinWidth;
        this.buttonHeight = buttonHeight;
        this.buttonPadding = buttonPadding;
        this.buttonAlignedDropdown = buttonAlignedDropdown;
        this.layoutBehavior = layoutBehavior;
        this.overflowDirection = overflowDirection;
        this.overflowButtonSpacing = overflowButtonSpacing;
        this.children = children;
    }

    build(context) {
        const theme = ButtonBarTheme.of(context) || {};

        const effectiveAlignment = this.alignment || theme.alignment || MainAxisAlignment.end;
        const effectiveMainAxisSize = this.mainAxisSize || theme.mainAxisSize || MainAxisSize.max;
        const effectiveButtonPadding = this.buttonPadding || theme.buttonPadding || EdgeInsets.all(8.0);
        // overflow customization requires Wrap or custom layout, utilizing Row for simpler cases

        const stylizedChildren = this.children.map(child => {
            // In full flutter, child buttons pick up the Bar's configuration via ButtonTheme
            // Here we might handle padding if we wrap them.
            return new Container({
                padding: { right: this.overflowButtonSpacing || 0 }, // simple spacing
                child: child
            });
        });

        return new Container({
            padding: effectiveButtonPadding,
            child: new Row({
                mainAxisAlignment: effectiveAlignment,
                mainAxisSize: effectiveMainAxisSize,
                children: stylizedChildren
            })
        });
    }
}
