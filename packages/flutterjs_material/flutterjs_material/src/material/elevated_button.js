import { ProxyWidget, ProxyElement, StatelessWidget } from '../core/widget_element.js';
import { Element } from "@flutterjs/runtime"
import { VNode } from '@flutterjs/vdom/vnode';
import { GestureDetector } from './gesture_detector.js';

// ============================================================================
// ELEVATED BUTTON
// ============================================================================

class ElevatedButton extends ProxyWidget {
    constructor({
        key = null,
        onPressed = null,
        child = null,
        // TODO: support full ButtonStyle, for now simple overrides
        style = null
    } = {}) {
        super({ key, child });
        this.onPressed = onPressed;
        this.style = style;
    }

    createElement(parent, runtime) {
        return new ElevatedButtonElement(this, parent, runtime);
    }
}

class ElevatedButtonElement extends ProxyElement {
    performRebuild() {
        const elementId = this.getElementId();
        const widgetPath = this.getWidgetPath();

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
            cursor: this.widget.onPressed ? 'pointer' : 'default',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease',
            fontSize: '14px',
            fontWeight: '500',
            fontFamily: 'inherit',
            textTransform: 'uppercase',
            outline: 'none',
            userSelect: 'none',
            opacity: this.widget.onPressed ? 1 : 0.6,
            ...this.widget.style
        };

        // Get child VNode from parent class (this handles the widget lifecycle)
        const childVNode = super.performRebuild();

        // Wrap child VNode in button element
        const buttonVNode = new VNode({
            tag: 'button',
            props: {
                style: baseStyle,
                type: 'button',
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'ElevatedButton',
            },
            children: childVNode ? [childVNode] : [],
            key: this.widget.key
        });

        // If there's an onPressed handler, wrap in GestureDetector
        if (this.widget.onPressed) {
            // We need to attach the event handler to the button VNode
            if (!buttonVNode.events) {
                buttonVNode.events = {};
            }
            buttonVNode.events.onClick = this.widget.onPressed;
        }

        return buttonVNode;
    }
}

export {
    ElevatedButton
};
