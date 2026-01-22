import { ProxyWidget, ProxyElement, StatelessWidget } from '../core/widget_element.js';
import { Element } from "@flutterjs/runtime"
import { VNode } from '@flutterjs/vdom/vnode';
import { GestureDetector } from './gesture_detector.js';
import { Theme } from './theme.js';

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
            foregroundColor,

            shape
        };
    }
}

class ElevatedButtonElement extends ProxyElement {
    performRebuild() {
        const elementId = this.getElementId();
        const widgetPath = this.getWidgetPath();

        const theme = Theme.of(this);
        const colorScheme = theme.colorScheme;

        // Resolve Style from ButtonStyle or simple overrides
        let customStyle = this.widget.style || {};

        // Helper to resolve colors consistently
        const resolveColor = (value, defaultValue) => {
            if (value) {
                if (typeof value === 'string') return value;
                if (typeof value.toCSSString === 'function') return value.toCSSString();
                // Handle Color objects that might be passed as raw objects
                if (value.value) return '#' + value.value.toString(16).padStart(8, '0').slice(2);
            }
            return defaultValue;
        };

        // Handle ButtonStyle-like object from styleFrom
        // This logic mimics MaterialStateProperty resolution for simple cases
        if (customStyle._isButtonStyle) {
            const btnStyle = {};

            // Background Color
            // Default: Surface Container Low + Primary Tint (Elevated) or Primary (Filled)
            // For ElevatedButton specifically in M3:
            // Background: Surface Container Low (or similar surface)
            // Text: Primary
            // But Flutter JS implementation seems to have mixed filled/elevated generic.
            // Let's stick to standard M3 Elevated Button:
            // Background: Surface Container Low
            // Text: Primary
            // Shadow: Yes

            // However, previous default was Purple (#6750A4) which suggests FilledButton behavior.
            // If we want to match Flutter's "ElevatedButton" strictly, it's actually off-white background with shadow.
            // If we want to match the *existing* look (Filled), we should use Primary.
            // Given the user wants "Flutter color structure", strictly ElevatedButton is separate from FilledButton.
            // But often people use ElevatedButton as the main primary button. 
            // Let's check if FilledButton exists. Yes it does.
            // So ElevatedButton should be the surface-colored one? 
            // Actually in M3, ElevatedButton is surface-colored with shadow. FilledButton is primary-colored.
            // EXISTING CODE used #6750A4 (Primary).
            // To avoid drastic visual breakdown, we'll map it to Primary for now, OR valid M3 Elevated.
            // Let's use M3 defaults:
            // ElevatedButton: background=surfaceContainerLow, text=primary
            // FilledButton: background=primary, text=onPrimary

            // Wait, standard Flutter ElevatedButton is often what users think of as "the button".
            // If I change it to white/surface, users might be confused if they expected the "purple button".
            // BUT the user explicitly asked to "follow flutter color structure".
            // So I will implement proper M3 Elevated Button defaults.

            const defaultBg = colorScheme.surfaceContainerLow || '#F7F2FA';
            const defaultFg = colorScheme.primary;

            btnStyle.backgroundColor = resolveColor(customStyle.backgroundColor, defaultBg);
            btnStyle.color = resolveColor(customStyle.foregroundColor, defaultFg);

            if (customStyle.padding) btnStyle.padding = typeof customStyle.padding === 'string' ? customStyle.padding : undefined;

            if (customStyle.shape && customStyle.shape.borderRadius) {
                const r = customStyle.shape.borderRadius;
                if (r.topLeft !== undefined) {
                    btnStyle.borderRadius = `${r.topLeft}px ${r.topRight}px ${r.bottomRight}px ${r.bottomLeft}px`;
                }
            }

            customStyle = btnStyle;
        }

        // Defaults if not fully resolved above
        // We use the same defaults as M3 spec
        const defaultBg = colorScheme.surfaceContainerLow || '#F7F2FA';
        const defaultFg = colorScheme.primary;

        const baseStyle = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 24px',
            borderRadius: '20px',
            backgroundColor: customStyle.backgroundColor || defaultBg,
            color: customStyle.color || defaultFg,
            border: 'none',
            cursor: this.widget.onPressed ? 'pointer' : 'default',
            boxShadow: customStyle.elevation === 0 ? 'none' : '0 1px 3px rgba(0,0,0,0.3)',
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
