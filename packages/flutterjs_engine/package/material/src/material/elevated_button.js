import { Widget, StatelessWidget } from '../core/widget_element.js';
import { Element } from "@flutterjs/runtime"
import { VNode } from '@flutterjs/vdom/vnode';
import { GestureDetector } from './gesture_detector.js';

// ============================================================================
// ELEVATED BUTTON
// ============================================================================

class ElevatedButton extends StatelessWidget {
    constructor({
        key = null,
        onPressed = null,
        child = null,
        // TODO: support full ButtonStyle, for now simple overrides
        style = null
    } = {}) {
        super(key);
        this.onPressed = onPressed;
        this.child = child;
        this.style = style;
        this._isPressed = false;
    }

    build(context) {
        // Basic Material 3 Elevation/Color styles (approximate)
        const baseStyle = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 24px',
            borderRadius: '20px',
            backgroundColor: '#6750A4', // Primary default
            color: '#FFFFFF',
            border: 'none',
            cursor: this.onPressed ? 'pointer' : 'default',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease',
            fontSize: '14px',
            fontWeight: '500',
            fontFamily: 'inherit',
            textTransform: 'uppercase',
            outline: 'none',
            userSelect: 'none',
            opacity: this.onPressed ? 1 : 0.6,
            ...this.style
        };

        let childVNode = null;
        if (this.child) {
            const childElement = this.child.createElement?.(context.element, context.element.runtime) || this.child;
            if (childElement.mount) childElement.mount(context.element);
            childVNode = childElement.performRebuild?.(context.element, context.element.runtime) || null;
        }

        const buttonContent = new VNode({
            tag: 'button',
            props: {
                style: baseStyle,
                type: 'button',
            },
            children: childVNode ? [childVNode] : []
        });

        return new GestureDetector({
            onTap: this.onPressed,
            child: new _ButtonContentWrapper(buttonContent)
        });
    }

    createElement(parent, runtime) {
        return new ElevatedButtonElement(this, parent, runtime);
    }
}

class _ButtonContentWrapper extends StatelessWidget {
    constructor(content) {
        super();
        this.content = content;
    }
    build(context) {
        return this.content;
    }
}

class ElevatedButtonElement extends Element {
    performRebuild(parent, runtime) {
        return this.widget.build(this.context);
    }
}

export {
    ElevatedButton,
    ElevatedButtonElement
};
