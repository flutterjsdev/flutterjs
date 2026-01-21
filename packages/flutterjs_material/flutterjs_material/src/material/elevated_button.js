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

    static styleFrom({
        backgroundColor = null,
        foregroundColor = null,
        disabledBackgroundColor = null,
        disabledForegroundColor = null,
        shadowColor = null,
        surfaceTintColor = null,
        elevation = null,
        textStyle = null,
        padding = null,
        minimumSize = null,
        fixedSize = null,
        maximumSize = null,
        side = null,
        shape = null,
        enabledMouseCursor = null,
        disabledMouseCursor = null,
        visualDensity = null,
        tapTargetSize = null,
        animationDuration = null,
        enableFeedback = null,
        alignment = null,
        splashFactory = null,
    } = {}) {
        // Map to simple style object for now, or true ButtonStyle
        return {
            backgroundColor: backgroundColor,
            color: foregroundColor,
            elevation: elevation,
            padding: padding ? `${padding.vertical / 2}px ${padding.horizontal / 2}px` : undefined,
            // borderRadius: shape?.borderRadius // TODO: Extract from shape
            // For now, return a plain object that our Element understands or a ButtonStyle
            // The current Element expects `style` to be a plain object of CSS overrides
            // But idiomatic Flutter expects a ButtonStyle.
            // Let's bridge it:
            _isButtonStyle: true,
            backgroundColor,
            foregroundColor,
            elevation,
            padding,
            shape
        };
    }
}

class ElevatedButtonElement extends ProxyElement {
    performRebuild() {
        const elementId = this.getElementId();
        const widgetPath = this.getWidgetPath();

        // Resolve Style
        let customStyle = this.widget.style || {};

        // Handle ButtonStyle-like object from styleFrom
        if (customStyle._isButtonStyle) {
            const btnStyle = {};
            if (customStyle.backgroundColor) {
                if (customStyle.backgroundColor.toCSSString) btnStyle.backgroundColor = customStyle.backgroundColor.toCSSString();
                else if (typeof customStyle.backgroundColor === 'string') btnStyle.backgroundColor = customStyle.backgroundColor;
                else if (customStyle.backgroundColor.value) btnStyle.backgroundColor = `#${customStyle.backgroundColor.value.toString(16).padStart(8, '0').slice(2)}`;
            }
            if (customStyle.foregroundColor) {
                if (customStyle.foregroundColor.toCSSString) btnStyle.color = customStyle.foregroundColor.toCSSString();
                else if (typeof customStyle.foregroundColor === 'string') btnStyle.color = customStyle.foregroundColor;
                else if (customStyle.foregroundColor.value) btnStyle.color = `#${customStyle.foregroundColor.value.toString(16).padStart(8, '0').slice(2)}`;
            }
            if (customStyle.padding && typeof customStyle.padding === 'string') {
                btnStyle.padding = customStyle.padding;
            } else if (customStyle.padding && customStyle.padding.toCSSString) {
                // Handle EdgeInsets
                // This is tricky without fully resolving EdgeInsets. Let's assume EdgeInsets has toCSSString or similar
                // For now, we manually constructed string in styleFrom if needed, or rely on Element logic
            }

            if (customStyle.shape && customStyle.shape.borderRadius) {
                // Try to apply borderRadius from RoundedRectangleBorder
                // simplified:
                if (customStyle.shape.borderRadius.topLeft) {
                    // It's a BorderRadius object
                    const r = customStyle.shape.borderRadius;
                    btnStyle.borderRadius = `${r.topLeft}px ${r.topRight}px ${r.bottomRight}px ${r.bottomLeft}px`;
                }
            }

            customStyle = btnStyle;
        }

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
            ...customStyle
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
