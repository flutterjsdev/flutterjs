import { StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { DialogTheme } from '../utils/dialog_theme.js';
import { Color } from '../utils/color.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { buildChildWidget } from '../utils/build_helper.js';

/**
 * Dialog - A material design dialog
 */
class Dialog extends StatelessWidget {
    constructor({
        key = null,
        backgroundColor,
        elevation,
        insetAnimationDuration = 100,
        insetAnimationCurve = 'decelerate',
        insetPadding,
        clipBehavior = 'none',
        shape,
        alignment,
        child
    } = {}) {
        super(key);
        this.backgroundColor = backgroundColor;
        this.elevation = elevation;
        this.insetAnimationDuration = insetAnimationDuration;
        this.insetAnimationCurve = insetAnimationCurve;
        this.insetPadding = insetPadding;
        this.clipBehavior = clipBehavior;
        this.shape = shape;
        this.alignment = alignment;
        this.child = child;
    }

    build(context) {
        // In a full implementation, this would query Theme.of(context).dialogTheme
        // For now, we use defaults or provided values

        // Default inset padding
        const effectiveInsetPadding = this.insetPadding || { top: 40, bottom: 40, left: 40, right: 40 };

        const dialogStyle = {
            backgroundColor: this.backgroundColor || '#ffffff',
            borderRadius: this.shape?.borderRadius || '4px',
            boxShadow: this.elevation ? `0 ${this.elevation}px ${this.elevation * 2}px rgba(0,0,0,0.2)` : '0 24px 48px rgba(0,0,0,0.2)',
            margin: `${effectiveInsetPadding.top}px ${effectiveInsetPadding.right}px ${effectiveInsetPadding.bottom}px ${effectiveInsetPadding.left}px`,
            overflow: this.clipBehavior === 'none' ? 'visible' : 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: `calc(100vh - ${effectiveInsetPadding.top + effectiveInsetPadding.bottom}px)`,
            maxWidth: 'calc(100vw - 80px)', // Simplified constraint
            position: 'relative'
        };

        // Apply alignment (simulated via flex container in showDialog usually, but here on the dialog itself if needed)

        return new VNode({
            tag: 'div',
            props: {
                className: 'fjs-dialog',
                style: dialogStyle,
                role: 'dialog',
                'aria-modal': 'true'
            },
            children: this.child ? [buildChildWidget(this.child, context)] : []
        });
    }
}

/**
 * DialogBackdrop - Backdrop overlay for dialogs
 */
class DialogBackdrop extends StatelessWidget {
    constructor({
        key = null,
        onTap = null,
        barrierColor = 'rgba(0, 0, 0, 0.54)',
        barrierDismissible = true
    } = {}) {
        super(key);
        this.onTap = onTap;
        this.barrierColor = barrierColor;
        this.barrierDismissible = barrierDismissible;
    }

    build(context) {
        const backdropStyle = {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: this.barrierColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center', // Center content by default
            zIndex: 1000,
            animation: 'fjs-fade-in 0.15s ease'
        };

        const events = this.barrierDismissible && this.onTap ? {
            click: (e) => {
                // Only close if clicking the backdrop itself, not its children
                if (e.target === e.currentTarget) {
                    this.onTap();
                }
            }
        } : {};

        return new VNode({
            tag: 'div',
            props: {
                className: 'fjs-dialog-backdrop',
                style: backdropStyle,
                'data-widget': 'DialogBackdrop'
            },
            events,
            key: this.key
        });
    }
}

/**
 * showDialog - Helper function to display a dialog
 */
function showDialog({
    context,
    builder,
    barrierDismissible = true,
    barrierColor = 'rgba(0, 0, 0, 0.54)',
    barrierLabel = null,
    useSafeArea = true, // Not implemented yet
    useRootNavigator = true // Not implemented yet
} = {}) {
    return new Promise((resolve) => {
        // Create dialog content
        const dialog = builder(context);

        // Create backdrop with dialog
        const closeDialog = (result) => {
            // Remove dialog from DOM
            const backdrop = document.querySelector('.fjs-dialog-backdrop');
            if (backdrop) {
                backdrop.style.animation = 'fjs-fade-out 0.15s ease';
                setTimeout(() => {
                    backdrop.remove();
                    resolve(result);
                }, 150);
            } else {
                resolve(result);
            }
        };

        const backdrop = new DialogBackdrop({
            onTap: barrierDismissible ? () => closeDialog(null) : null,
            barrierColor,
            barrierDismissible
        });

        // Build the backdrop VNode properly
        const backdropVNode = buildChildWidget(backdrop, context);

        // Build the dialog VNode properly
        const dialogVNode = buildChildWidget(dialog, context);

        // Combine backdrop and dialog
        const combinedVNode = new VNode({
            tag: 'div',
            props: backdropVNode.props,
            children: [dialogVNode],
            events: backdropVNode.events
        });

        // Convert VNode to DOM and append
        const domElement = vNodeToDOM(combinedVNode);
        document.body.appendChild(domElement);

        // Store closeDialog function on window for dialog buttons to use
        window.__closeCurrentDialog = closeDialog;
    });
}

function vNodeToDOM(vnode) {
    if (typeof vnode === 'string' || typeof vnode === 'number') {
        return document.createTextNode(String(vnode));
    }

    const element = document.createElement(vnode.tag);

    // Apply props
    if (vnode.props) {
        Object.entries(vnode.props).forEach(([key, value]) => {
            if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key === 'className') {
                element.className = value;
            } else if (key.startsWith('data-') || key.startsWith('aria-')) {
                element.setAttribute(key, value);
            } else if (key !== 'children') {
                element[key] = value;
            }
        });
    }

    // Apply events
    if (vnode.events) {
        Object.entries(vnode.events).forEach(([event, handler]) => {
            element.addEventListener(event, handler);
        });
    }

    // Append children
    if (vnode.children) {
        vnode.children.forEach(child => {
            element.appendChild(vNodeToDOM(child));
        });
    }

    return element;
}

// Add CSS animations (idempotent check ideally, or just add)
if (typeof document !== 'undefined') {
    // Check if style already exists? Simplified for now.
    const styleId = 'fjs-dialog-animations';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
        @keyframes fjs-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fjs-fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        `;
        document.head.appendChild(style);
    }
}

export { Dialog, showDialog };
