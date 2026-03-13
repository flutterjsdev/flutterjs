// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { Row, Column, SizedBox } from '@flutterjs/material';
import { Text, GestureDetector } from '@flutterjs/material';
import { EdgeInsets, BorderRadius } from '@flutterjs/material';
import { MainAxisAlignment, CrossAxisAlignment, MainAxisSize } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';
import { CupertinoTheme } from './theme.js';

/**
 * An iOS-style list tile.
 *
 * Follows the iOS List design pattern with leading widget,
 * title, subtitle, trailing widget, and separator.
 */
export class CupertinoListTile extends StatelessWidget {
    constructor({
        key,
        title,
        subtitle,
        leading,
        trailing,
        additionalInfo,
        leadingSize = 28.0,
        leadingToTitle = 12.0,
        onTap,
        backgroundColor,
        backgroundColorActivated,
        padding,
    } = {}) {
        super(key);
        Object.assign(this, {
            title, subtitle, leading, trailing, additionalInfo,
            leadingSize, leadingToTitle, onTap, backgroundColor,
            backgroundColorActivated, padding,
        });
    }

    build(context) {
        const theme = CupertinoTheme.of(context);
        const bgColor = this.backgroundColor || CupertinoColors.white;

        const children = [];

        // Leading
        if (this.leading) {
            children.push(new Container({
                width: this.leadingSize,
                height: this.leadingSize,
                child: this.leading,
            }));
            children.push(new SizedBox({ width: this.leadingToTitle }));
        }

        // Title + Subtitle
        const textColumn = [];
        if (this.title) {
            textColumn.push(new Container({
                style: { fontSize: '17px', color: CupertinoColors.label },
                child: this.title,
            }));
        }
        if (this.subtitle) {
            textColumn.push(new Container({
                style: { fontSize: '14px', color: CupertinoColors.secondaryLabel },
                child: this.subtitle,
            }));
        }

        children.push(new Container({
            style: { flex: 1 },
            child: new Column({
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: textColumn,
            }),
        }));

        // Additional info
        if (this.additionalInfo) {
            children.push(new Container({
                style: { color: CupertinoColors.secondaryLabel },
                child: this.additionalInfo,
            }));
        }

        // Trailing (chevron by default if onTap)
        if (this.trailing) {
            children.push(new SizedBox({ width: 8 }));
            children.push(this.trailing);
        } else if (this.onTap) {
            children.push(new SizedBox({ width: 8 }));
            children.push(new Text('›', {
                style: { fontSize: 20, color: CupertinoColors.systemGrey3 },
            }));
        }

        const tile = new Container({
            padding: this.padding || EdgeInsets.symmetric({ horizontal: 16, vertical: 10 }),
            decoration: new BoxDecoration({ color: bgColor }),
            child: new Row({
                crossAxisAlignment: CrossAxisAlignment.center,
                children: children,
            }),
        });

        if (this.onTap) {
            return new GestureDetector({
                onTap: this.onTap,
                child: tile,
            });
        }

        return tile;
    }
}

/**
 * An iOS-style list section (grouped list header).
 */
export class CupertinoListSection extends StatelessWidget {
    constructor({
        key,
        header,
        footer,
        children = [],
        margin,
        backgroundColor,
        dividerMargin = 60.0,
        additionalDividerMargin,
        topMargin = 22.0,
        hasLeading = true,
        decoration,
    } = {}) {
        super(key);
        Object.assign(this, {
            header, footer, children, margin, backgroundColor,
            dividerMargin, additionalDividerMargin, topMargin, hasLeading, decoration,
        });
    }

    /** Inset grouped list (iOS 14+ default style) */
    static insetGrouped({
        key, header, footer, children = [], margin, backgroundColor,
        dividerMargin, hasLeading = true, decoration,
    } = {}) {
        return new CupertinoListSection({
            key, header, footer, children, margin: margin || EdgeInsets.symmetric({ horizontal: 16 }),
            backgroundColor: backgroundColor || CupertinoColors.secondarySystemGroupedBackground,
            dividerMargin, hasLeading, decoration: decoration || new BoxDecoration({
                borderRadius: BorderRadius.circular(10),
            }),
        });
    }

    build(context) {
        const sectionChildren = [];

        // Header
        if (this.header) {
            sectionChildren.push(new Container({
                padding: EdgeInsets.only({ left: 16, bottom: 6, top: this.topMargin }),
                child: new Container({
                    style: { fontSize: '13px', color: CupertinoColors.secondaryLabel, textTransform: 'uppercase' },
                    child: this.header,
                }),
            }));
        }

        // Items with dividers
        const tiles = this.children.map((child, i) => {
            const items = [child];
            if (i < this.children.length - 1) {
                items.push(new Container({
                    height: 0.5,
                    margin: EdgeInsets.only({ left: this.dividerMargin }),
                    decoration: new BoxDecoration({ color: CupertinoColors.separator }),
                }));
            }
            return new Column({ children: items });
        });

        sectionChildren.push(new Container({
            margin: this.margin,
            decoration: this.decoration || new BoxDecoration({
                color: this.backgroundColor || CupertinoColors.secondarySystemGroupedBackground,
            }),
            child: new Column({ children: tiles }),
        }));

        // Footer
        if (this.footer) {
            sectionChildren.push(new Container({
                padding: EdgeInsets.only({ left: 16, top: 6 }),
                child: new Container({
                    style: { fontSize: '13px', color: CupertinoColors.secondaryLabel },
                    child: this.footer,
                }),
            }));
        }

        return new Column({
            crossAxisAlignment: CrossAxisAlignment.start,
            children: sectionChildren,
        });
    }
}
