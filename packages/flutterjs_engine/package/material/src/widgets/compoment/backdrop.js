import { UbiquitousInheritedWidget, UbiquitousInheritedElement } from './directionality.js';

import { VNode } from '@flutterjs/vdom/vnode';




// ============================================================================
// BACKDROP KEY
// Unique identifier for backdrop group
// ============================================================================

class BackdropKey {
    constructor(debugLabel = null) {
        this.debugLabel = debugLabel;
        this._id = Math.random().toString(36).substr(2, 9);
    }

    equals(other) {
        return other instanceof BackdropKey && this._id === other._id;
    }

    toString() {
        return `BackdropKey${this.debugLabel ? `(${this.debugLabel})` : ''}`;
    }
}

// ============================================================================
// BACKDROP GROUP
// Ubiquitous inherited widget that groups backdrop-related widgets
// Provides backdrop context to all descendants
// ============================================================================

class BackdropGroup extends UbiquitousInheritedWidget {
    constructor({ key = null, child = null, backdropKey = null } = {}) {
        super({ key, child });

        // Create or use provided backdrop key
        this.backdropKey = backdropKey || new BackdropKey();

        // Validate child
        if (!child) {
            throw new Error('BackdropGroup requires a child widget');
        }
    }

    /**
     * Check if should notify dependents
     */
    updateShouldNotify(oldWidget) {
        // Notify if backdrop key changes
        return !this.backdropKey.equals(oldWidget.backdropKey);
    }

    /**
     * Get BackdropGroup from context
     * Throws if not found
     */
    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(BackdropGroup);

        if (!widget) {
            throw new Error(
                'BackdropGroup.of() called with a context that does not contain a BackdropGroup widget. ' +
                'Make sure to wrap your widget tree with a BackdropGroup widget.'
            );
        }

        return widget;
    }

    /**
     * Get BackdropGroup from context (returns null if not found)
     */
    static maybeOf(context) {
        const widget = context.getInheritedWidgetOfExactType(BackdropGroup);
        return widget || null;
    }

    /**
     * Build the widget tree
     */
    build(context) {
        let childVNode = null;
        if (this.child) {
            if (this.child.createElement) {
                const childElement = this.child.createElement();
                childElement.mount(context.element);
                childVNode = childElement.performRebuild();
            } else {
                childVNode = this.child;
            }
        }

        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

        return new VNode({
            tag: 'div',
            props: {
                style: {
                    position: 'relative'
                },
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'BackdropGroup',
                'data-backdrop-key': this.backdropKey.toString()
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({
            name: 'backdropKey',
            value: this.backdropKey.toString()
        });
    }

    /**
     * Create element
     */
    createElement() {
        return new UbiquitousInheritedElement(this);
    }
}

export { BackdropGroup, BackdropKey };