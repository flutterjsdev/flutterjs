// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { Row, Column, SizedBox, Text, GestureDetector, Center } from '@flutterjs/material';
import { EdgeInsets, BorderRadius } from '@flutterjs/material';
import { MainAxisAlignment, CrossAxisAlignment, MainAxisSize } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';
import { CupertinoTheme } from './theme.js';
import { CupertinoButton } from './button.js';

/**
 * An iOS-style alert dialog.
 *
 * Displays a dialog with a title, content, and a row/column of actions.
 * Matches UIAlertController style from iOS HIG.
 */
export class CupertinoAlertDialog extends StatelessWidget {
    constructor({
        key,
        title,
        content,
        actions = [],
        scrollController,
        actionScrollController,
        insetAnimationDuration,
        insetAnimationCurve,
    } = {}) {
        super(key);
        this.title = title;
        this.content = content;
        this.actions = actions;
    }

    build(context) {
        const children = [];

        // Title
        if (this.title) {
            children.push(new Container({
                padding: EdgeInsets.only({ top: 20, left: 16, right: 16, bottom: 2 }),
                child: new Container({
                    style: {
                        fontSize: '17px',
                        fontWeight: '600',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                        textAlign: 'center',
                        color: CupertinoColors.label,
                    },
                    child: this.title,
                }),
            }));
        }

        // Content
        if (this.content) {
            children.push(new Container({
                padding: EdgeInsets.symmetric({ horizontal: 16, vertical: 2 }),
                style: { maxHeight: '200px', overflow: 'auto' },
                child: new Container({
                    style: {
                        fontSize: '13px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                        textAlign: 'center',
                        color: CupertinoColors.label,
                    },
                    child: this.content,
                }),
            }));
        }

        children.push(new SizedBox({ height: 16 }));

        // Actions divider
        children.push(new Container({
            height: 0.5,
            decoration: new BoxDecoration({ color: CupertinoColors.separator }),
        }));

        // Actions — side by side if 2, stacked if more
        if (this.actions.length <= 2) {
            const actionWidgets = this.actions.map((action, i) => {
                const items = [];
                if (i > 0) {
                    items.push(new Container({
                        width: 0.5,
                        style: { alignSelf: 'stretch' },
                        decoration: new BoxDecoration({ color: CupertinoColors.separator }),
                    }));
                }
                items.push(new Container({
                    style: { flex: 1 },
                    child: action,
                }));
                return items;
            }).flat();

            children.push(new Row({
                children: actionWidgets,
            }));
        } else {
            this.actions.forEach((action, i) => {
                if (i > 0) {
                    children.push(new Container({
                        height: 0.5,
                        decoration: new BoxDecoration({ color: CupertinoColors.separator }),
                    }));
                }
                children.push(action);
            });
        }

        return new Center({
            child: new Container({
                width: 270,
                decoration: new BoxDecoration({
                    color: '#F2F2F2E6',
                    borderRadius: BorderRadius.circular(14),
                }),
                style: {
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    overflow: 'hidden',
                },
                child: new Column({
                    mainAxisSize: MainAxisSize.min,
                    children,
                }),
            }),
        });
    }
}

/**
 * A button used in a CupertinoAlertDialog.
 */
export class CupertinoDialogAction extends StatelessWidget {
    constructor({
        key,
        child,
        onPressed,
        isDefaultAction = false,
        isDestructiveAction = false,
        textStyle,
    } = {}) {
        super(key);
        this.child = child;
        this.onPressed = onPressed;
        this.isDefaultAction = isDefaultAction;
        this.isDestructiveAction = isDestructiveAction;
        this.textStyle = textStyle;
    }

    build(context) {
        const theme = CupertinoTheme.of(context);
        const color = this.isDestructiveAction
            ? CupertinoColors.systemRed
            : theme.primaryColor;
        const fontWeight = this.isDefaultAction ? '600' : '400';

        const content = new Container({
            padding: EdgeInsets.symmetric({ vertical: 11 }),
            child: new Center({
                child: new Container({
                    style: {
                        fontSize: '17px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                        color,
                        fontWeight,
                        ...(this.textStyle || {}),
                    },
                    child: this.child,
                }),
            }),
        });

        if (this.onPressed) {
            return new GestureDetector({
                onTap: this.onPressed,
                child: new Container({
                    style: { cursor: 'pointer' },
                    child: content,
                }),
            });
        }

        return new Container({
            style: { opacity: 0.4 },
            child: content,
        });
    }
}
