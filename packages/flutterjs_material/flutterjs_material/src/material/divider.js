// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { SizedBox } from '../widgets/compoment/sized_box.js';
import { Center } from '../widgets/compoment/center.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { Theme } from './theme.js';

/**
 * A thin horizontal line, with padding on either side.
 *
 * In the Material Design language, this represents a divider.
 * Dividers can be used in lists, Drawers, and elsewhere to separate content.
 */
export class Divider extends StatelessWidget {
    constructor({
        key,
        height,
        thickness,
        indent,
        endIndent,
        color,
    } = {}) {
        super(key);
        this.height = height;
        this.thickness = thickness;
        this.indent = indent;
        this.endIndent = endIndent;
        this.color = color;
    }

    build(context) {
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        const effectiveHeight = this.height ?? 16.0;
        const effectiveThickness = this.thickness ?? 1.0;
        const effectiveIndent = this.indent ?? 0.0;
        const effectiveEndIndent = this.endIndent ?? 0.0;
        const effectiveColor = this.color || colorScheme.outlineVariant || '#CAC4D0';

        return new SizedBox({
            height: effectiveHeight,
            child: new Center({
                child: new Container({
                    height: effectiveThickness,
                    margin: EdgeInsets.only({
                        left: effectiveIndent,
                        right: effectiveEndIndent,
                    }),
                    decoration: new BoxDecoration({
                        color: effectiveColor,
                    }),
                })
            })
        });
    }
}

/**
 * A thin vertical line, with padding on either side.
 *
 * Vertical dividers can be used in horizontally scrolling lists.
 */
export class VerticalDivider extends StatelessWidget {
    constructor({
        key,
        width,
        thickness,
        indent,
        endIndent,
        color,
    } = {}) {
        super(key);
        this.width = width;
        this.thickness = thickness;
        this.indent = indent;
        this.endIndent = endIndent;
        this.color = color;
    }

    build(context) {
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        const effectiveWidth = this.width ?? 16.0;
        const effectiveThickness = this.thickness ?? 1.0;
        const effectiveIndent = this.indent ?? 0.0;
        const effectiveEndIndent = this.endIndent ?? 0.0;
        const effectiveColor = this.color || colorScheme.outlineVariant || '#CAC4D0';

        return new SizedBox({
            width: effectiveWidth,
            child: new Center({
                child: new Container({
                    width: effectiveThickness,
                    margin: EdgeInsets.only({
                        top: effectiveIndent,
                        bottom: effectiveEndIndent,
                    }),
                    decoration: new BoxDecoration({
                        color: effectiveColor,
                    }),
                })
            })
        });
    }
}
