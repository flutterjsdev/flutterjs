// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State, StatelessWidget } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { Row, Column, SizedBox, Text, GestureDetector, Center } from '@flutterjs/material';
import { EdgeInsets, BorderRadius } from '@flutterjs/material';
import { CrossAxisAlignment, MainAxisSize } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';
import { CupertinoTheme } from './theme.js';

/**
 * An iOS-style expansion tile (disclosure group).
 *
 * A tile that expands to reveal child content when tapped,
 * with a rotating chevron indicator. Matches iOS's disclosure pattern.
 */
export class CupertinoExpansionTile extends StatefulWidget {
    constructor({
        key,
        title,
        subtitle,
        leading,
        trailing,
        children = [],
        initiallyExpanded = false,
        onExpansionChanged,
        backgroundColor,
        collapsedBackgroundColor,
    } = {}) {
        super(key);
        Object.assign(this, {
            title, subtitle, leading, trailing, children,
            initiallyExpanded, onExpansionChanged,
            backgroundColor, collapsedBackgroundColor,
        });
    }

    createState() { return new _CupertinoExpansionTileState(); }
}

class _CupertinoExpansionTileState extends State {
    initState() {
        super.initState();
        this._expanded = this.widget.initiallyExpanded;
    }

    _toggle() {
        this.setState(() => {
            this._expanded = !this._expanded;
        });
        this.widget.onExpansionChanged?.(this._expanded);
    }

    build(context) {
        const bgColor = this._expanded
            ? (this.widget.backgroundColor || CupertinoColors.white)
            : (this.widget.collapsedBackgroundColor || CupertinoColors.white);

        // Header
        const headerChildren = [];

        if (this.widget.leading) {
            headerChildren.push(this.widget.leading);
            headerChildren.push(new SizedBox({ width: 12 }));
        }

        const titleColumn = [];
        if (this.widget.title) {
            titleColumn.push(new Container({
                style: {
                    fontSize: '17px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                    color: CupertinoColors.label,
                },
                child: this.widget.title,
            }));
        }
        if (this.widget.subtitle) {
            titleColumn.push(new Container({
                style: {
                    fontSize: '14px',
                    color: CupertinoColors.secondaryLabel,
                },
                child: this.widget.subtitle,
            }));
        }

        headerChildren.push(new Container({
            style: { flex: 1 },
            child: new Column({
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: titleColumn,
            }),
        }));

        // Trailing / chevron
        if (this.widget.trailing) {
            headerChildren.push(this.widget.trailing);
        } else {
            headerChildren.push(new Container({
                style: {
                    fontSize: '15px',
                    color: CupertinoColors.systemGrey2,
                    transform: this._expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                },
                child: new Text('›'),
            }));
        }

        const header = new GestureDetector({
            onTap: () => this._toggle(),
            child: new Container({
                padding: EdgeInsets.symmetric({ horizontal: 16, vertical: 10 }),
                decoration: new BoxDecoration({ color: bgColor }),
                style: { cursor: 'pointer' },
                child: new Row({
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: headerChildren,
                }),
            }),
        });

        const tileChildren = [header];

        // Body
        if (this._expanded && this.widget.children.length > 0) {
            tileChildren.push(new Container({
                height: 0.5,
                margin: EdgeInsets.only({ left: this.widget.leading ? 56 : 16 }),
                decoration: new BoxDecoration({ color: CupertinoColors.separator }),
            }));

            this.widget.children.forEach(child => {
                tileChildren.push(new Container({
                    padding: EdgeInsets.only({ left: this.widget.leading ? 56 : 16 }),
                    child: child,
                }));
            });
        }

        return new Column({
            mainAxisSize: MainAxisSize.min,
            children: tileChildren,
        });
    }
}
