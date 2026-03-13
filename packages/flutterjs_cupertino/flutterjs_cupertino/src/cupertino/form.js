// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { Row, Column, SizedBox, Text } from '@flutterjs/material';
import { EdgeInsets, BorderRadius } from '@flutterjs/material';
import { CrossAxisAlignment, MainAxisSize } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';

/**
 * An iOS-style form row — a labeled form input within a CupertinoFormSection.
 *
 * Used to display a label-value pair, similar to UIKit's form rows.
 */
export class CupertinoFormRow extends StatelessWidget {
    constructor({
        key,
        child,
        prefix,
        helper,
        error,
        padding,
    } = {}) {
        super(key);
        this.child = child;
        this.prefix = prefix;
        this.helper = helper;
        this.error = error;
        this.padding = padding;
    }

    build(context) {
        const children = [];

        // Prefix (label)
        if (this.prefix) {
            children.push(new Container({
                style: {
                    fontSize: '17px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                    color: CupertinoColors.label,
                },
                child: this.prefix,
            }));
            children.push(new SizedBox({ width: 8 }));
        }

        // Input / child
        children.push(new Container({
            style: { flex: 1 },
            child: this.child,
        }));

        const rows = [
            new Container({
                padding: this.padding || EdgeInsets.symmetric({ horizontal: 16, vertical: 10 }),
                child: new Row({
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children,
                }),
            }),
        ];

        // Helper text
        if (this.helper) {
            rows.push(new Container({
                padding: EdgeInsets.only({ left: 16, right: 16, bottom: 6 }),
                child: new Container({
                    style: { fontSize: '13px', color: CupertinoColors.secondaryLabel },
                    child: this.helper,
                }),
            }));
        }

        // Error text
        if (this.error) {
            rows.push(new Container({
                padding: EdgeInsets.only({ left: 16, right: 16, bottom: 6 }),
                child: new Container({
                    style: { fontSize: '13px', color: CupertinoColors.systemRed },
                    child: this.error,
                }),
            }));
        }

        return new Column({
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: rows,
        });
    }
}

/**
 * An iOS-style form section — groups form rows together.
 *
 * Provides an optional header, footer, and inset grouped styling.
 */
export class CupertinoFormSection extends StatelessWidget {
    constructor({
        key,
        children = [],
        header,
        footer,
        margin,
        backgroundColor,
        decoration,
        clipBehavior = 'antiAlias',
    } = {}) {
        super(key);
        Object.assign(this, {
            children, header, footer, margin, backgroundColor, decoration, clipBehavior,
        });
    }

    /** Creates an inset grouped form section (iOS 14+ style) */
    static insetGrouped({
        key, children = [], header, footer, margin, backgroundColor, decoration, clipBehavior,
    } = {}) {
        return new CupertinoFormSection({
            key, children, header, footer, clipBehavior,
            margin: margin || EdgeInsets.symmetric({ horizontal: 16 }),
            backgroundColor: backgroundColor || CupertinoColors.secondarySystemGroupedBackground,
            decoration: decoration || new BoxDecoration({
                borderRadius: BorderRadius.circular(10),
            }),
        });
    }

    build(context) {
        const sectionChildren = [];

        // Header
        if (this.header) {
            sectionChildren.push(new Container({
                padding: EdgeInsets.only({ left: 16, bottom: 6, top: 22 }),
                child: new Container({
                    style: {
                        fontSize: '13px',
                        color: CupertinoColors.secondaryLabel,
                        textTransform: 'uppercase',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                    },
                    child: this.header,
                }),
            }));
        }

        // Form rows with dividers
        const rows = this.children.map((child, i) => {
            const items = [child];
            if (i < this.children.length - 1) {
                items.push(new Container({
                    height: 0.5,
                    margin: EdgeInsets.only({ left: 16 }),
                    decoration: new BoxDecoration({ color: CupertinoColors.separator }),
                }));
            }
            return new Column({
                mainAxisSize: MainAxisSize.min,
                children: items,
            });
        });

        sectionChildren.push(new Container({
            margin: this.margin,
            decoration: this.decoration || new BoxDecoration({
                color: this.backgroundColor || CupertinoColors.secondarySystemGroupedBackground,
            }),
            style: { overflow: 'hidden' },
            child: new Column({
                mainAxisSize: MainAxisSize.min,
                children: rows,
            }),
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
            mainAxisSize: MainAxisSize.min,
            children: sectionChildren,
        });
    }
}
