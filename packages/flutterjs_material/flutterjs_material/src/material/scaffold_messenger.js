// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State, InheritedWidget } from '../core/widget_element.js';

class _ScaffoldMessengerScope extends InheritedWidget {
    constructor({ state, child, key } = {}) {
        super({ child, key });
        this.messengerState = state;
    }

    updateShouldNotify(oldWidget) {
        return this.messengerState !== oldWidget.messengerState;
    }
}

export class ScaffoldMessenger extends StatefulWidget {
    constructor({ key, child } = {}) {
        super(key);
        this.child = child;
    }

    createState() {
        return new ScaffoldMessengerState();
    }

    /**
     * Get ScaffoldMessengerState from context
     * ✅ FIXED: Falls back to finding Scaffold state directly if no ScaffoldMessenger scope exists
     */
    static of(context) {
        // First try to find ScaffoldMessengerScope
        const scope = context.dependOnInheritedWidgetOfExactType?.(_ScaffoldMessengerScope);
        if (scope && scope.messengerState) {
            return scope.messengerState;
        }

        // ✅ FALLBACK: Find ScaffoldState directly via ancestor traversal
        // This makes ScaffoldMessenger.of() work even when not wrapped in ScaffoldMessenger
        const scaffoldState = context.findAncestorStateOfType?.('ScaffoldState');
        if (scaffoldState && scaffoldState.showSnackBar) {
            // Return a proxy that delegates to ScaffoldState
            return {
                showSnackBar: (snackBar) => scaffoldState.showSnackBar(snackBar),
                hideCurrentSnackBar: () => scaffoldState.closeSnackBar?.(),
                removeCurrentSnackBar: () => scaffoldState.closeSnackBar?.(),
                clearSnackBars: () => scaffoldState.closeSnackBar?.()
            };
        }

        // ✅ FALLBACK 2: Search for ScaffoldElement in parent chain
        let current = context.element?.parent || context.element;
        while (current) {
            if (current.showSnackBar && typeof current.showSnackBar === 'function') {
                return {
                    showSnackBar: (snackBar) => current.showSnackBar(snackBar),
                    hideCurrentSnackBar: () => current.closeSnackBar?.(),
                    removeCurrentSnackBar: () => current.closeSnackBar?.(),
                    clearSnackBars: () => current.closeSnackBar?.()
                };
            }
            // Also check if it's the ScaffoldElement by its state
            if (current.state && current.state.showSnackBar && typeof current.state.showSnackBar === 'function') {
                const state = current.state;
                return {
                    showSnackBar: (snackBar) => state.showSnackBar(snackBar),
                    hideCurrentSnackBar: () => state.closeSnackBar?.(),
                    removeCurrentSnackBar: () => state.closeSnackBar?.(),
                    clearSnackBars: () => state.closeSnackBar?.()
                };
            }
            current = current.parent || current._parent;
        }

        console.warn('ScaffoldMessenger.of() called but no Scaffold found in context');
        return null;
    }
}

export class ScaffoldMessengerState extends State {
    constructor() {
        super();
        this._snackBars = [];
    }

    showSnackBar(snackBar) {
        // Try to find Scaffold via context and delegate to it
        if (this.context) {
            let current = this.context.element?.parent || this.context.element;
            while (current) {
                if (current.showSnackBar && typeof current.showSnackBar === 'function') {
                    return current.showSnackBar(snackBar);
                }
                current = current.parent || current._parent;
            }
        }

        // Fallback: Just log for now
        console.log('ScaffoldMessenger: showSnackBar', snackBar);
        return {
            close: () => { console.log('SnackBar close'); }
        };
    }

    hideCurrentSnackBar() { }
    removeCurrentSnackBar() { }
    clearSnackBars() { }

    build(context) {
        return new _ScaffoldMessengerScope({
            state: this,
            child: this.widget.child
        });
    }
}

