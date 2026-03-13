// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { Row, Column, SizedBox, Text, GestureDetector, Center } from '@flutterjs/material';
import { EdgeInsets, BorderRadius } from '@flutterjs/material';
import { MainAxisAlignment, CrossAxisAlignment, MainAxisSize } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';
import { CupertinoTheme } from './theme.js';

/**
 * An iOS-style context menu.
 *
 * Shows a menu attached to a child widget, triggered by long-press.
 * The child scales down and blurs the background when the menu opens.
 */
export class CupertinoContextMenu extends StatefulWidget {
    constructor({
        key,
        child,
        actions = [],
        previewBuilder,
        enableHapticFeedback = true,
    } = {}) {
        super(key);
        this.child = child;
        this.actions = actions;
        this.previewBuilder = previewBuilder;
        this.enableHapticFeedback = enableHapticFeedback;
    }

    createState() { return new _CupertinoContextMenuState(); }
}

class _CupertinoContextMenuState extends State {
    initState() {
        super.initState();
        this._isOpen = false;
    }

    build(context) {
        if (!this._isOpen) {
            return new GestureDetector({
                onLongPress: () => this.setState(() => { this._isOpen = true; }),
                child: this.widget.child,
            });
        }

        // Open state: overlay with backdrop + menu
        const menuActions = this.widget.actions.map((action, i) => {
            const items = [action];
            if (i < this.widget.actions.length - 1) {
                items.push(new Container({
                    height: 0.5,
                    decoration: new BoxDecoration({ color: CupertinoColors.separator }),
                }));
            }
            return new Column({
                mainAxisSize: MainAxisSize.min,
                children: items,
            });
        });

        return new GestureDetector({
            onTap: () => this.setState(() => { this._isOpen = false; }),
            child: new Container({
                style: {
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: '10px',
                },
                child: new Column({
                    mainAxisSize: MainAxisSize.min,
                    children: [
                        // Preview
                        new Container({
                            decoration: new BoxDecoration({
                                borderRadius: BorderRadius.circular(12),
                            }),
                            style: {
                                overflow: 'hidden',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                            },
                            child: (this.widget.previewBuilder
                                ? this.widget.previewBuilder(context, null, this.widget.child)
                                : this.widget.child),
                        }),
                        new SizedBox({ height: 8 }),
                        // Menu
                        new Container({
                            width: 250,
                            decoration: new BoxDecoration({
                                color: '#F2F2F2E6',
                                borderRadius: BorderRadius.circular(14),
                            }),
                            style: { overflow: 'hidden' },
                            child: new Column({
                                mainAxisSize: MainAxisSize.min,
                                children: menuActions,
                            }),
                        }),
                    ],
                }),
            }),
        });
    }
}

/**
 * An action item in a CupertinoContextMenu.
 */
export class CupertinoContextMenuAction extends StatelessWidget {
    constructor({
        key,
        child,
        onPressed,
        isDefaultAction = false,
        isDestructiveAction = false,
        trailingIcon,
    } = {}) {
        super(key);
        this.child = child;
        this.onPressed = onPressed;
        this.isDefaultAction = isDefaultAction;
        this.isDestructiveAction = isDestructiveAction;
        this.trailingIcon = trailingIcon;
    }

    build(context) {
        const color = this.isDestructiveAction
            ? CupertinoColors.systemRed
            : CupertinoColors.label;
        const fontWeight = this.isDefaultAction ? '600' : '400';

        const children = [
            new Container({
                style: { flex: 1 },
                child: new Container({
                    style: {
                        fontSize: '17px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                        color,
                        fontWeight,
                    },
                    child: this.child,
                }),
            }),
        ];

        if (this.trailingIcon) {
            children.push(new Container({
                style: { color },
                child: this.trailingIcon,
            }));
        }

        const action = new Container({
            padding: EdgeInsets.symmetric({ horizontal: 16, vertical: 12 }),
            child: new Row({
                crossAxisAlignment: CrossAxisAlignment.center,
                children,
            }),
        });

        if (this.onPressed) {
            return new GestureDetector({
                onTap: this.onPressed,
                child: new Container({
                    style: { cursor: 'pointer' },
                    child: action,
                }),
            });
        }

        return action;
    }
}

