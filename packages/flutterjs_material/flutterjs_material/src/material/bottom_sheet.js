import { StatefulWidget, StatelessWidget, State } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { BottomSheetTheme } from './bottom_sheet_theme.js';
import { BorderRadius } from '../utils/border_radius.js';
import { CrossAxisAlignment, Alignment } from '../utils/utils.js';
import { Theme } from './theme.js';

class BottomSheet extends StatefulWidget {
    constructor({
        key,
        animationController,
        enableDrag = true,
        onDragStart,
        onDragEnd,
        backgroundColor,
        elevation,
        shape,
        clipBehavior,
        constraints,
        onClosing,
        builder,
    } = {}) {
        super(key);
        this.animationController = animationController;
        this.enableDrag = enableDrag;
        this.onDragStart = onDragStart;
        this.onDragEnd = onDragEnd;
        this.backgroundColor = backgroundColor;
        this.elevation = elevation;
        this.shape = shape;
        this.clipBehavior = clipBehavior;
        this.constraints = constraints;
        this.onClosing = onClosing;
        this.builder = builder;
    }

    createState() {
        return new BottomSheetState();
    }
}

class BottomSheetState extends State {
    build(context) {
        // Animation parsing omitted for simplicity in this version.
        // In real web impl, would use CSS transitions/animations for slide-up.

        const theme = BottomSheetTheme.of(context) || {};
        const appTheme = Theme.of(context);
        const colorScheme = appTheme.colorScheme;

        const bgColor = this.widget.backgroundColor || theme.backgroundColor || colorScheme.surfaceContainerLow || '#F7F2FA';
        const elevation = this.widget.elevation || theme.elevation || 0.0;
        const shape = this.widget.shape || theme.shape;

        const style = {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: bgColor,
            boxShadow: `0 -${elevation}px ${elevation * 2}px rgba(0,0,0,0.1)`,
            zIndex: 100, // High z-index
            borderTopLeftRadius: shape?.borderRadius?.topLeft || '0px', // Naive shape parsing
            borderTopRightRadius: shape?.borderRadius?.topRight || '0px',
            animation: 'slide-up 0.3s ease-out',
            maxHeight: '90vh',
            overflowY: 'auto'
        };

        if (this.widget.clipBehavior) {
            style.overflow = 'hidden';
        }

        return new VNode({
            tag: 'div',
            props: {
                className: 'fjs-bottom-sheet',
                style: style
            },
            children: [
                this.widget.builder(context)
            ]
        });
    }
}

function showModalBottomSheet({
    context,
    builder,
    backgroundColor,
    elevation,
    shape,
    clipBehavior,
    constraints,
    barrierColor,
    isScrollControlled = false,
    useRootNavigator = true,
    isDismissible = true,
    enableDrag = true,
    showDragHandle,
    useSafeArea = false,
} = {}) {
    return new Promise((resolve) => {
        // Create backdrop
        const backdropStyle = {
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: barrierColor || 'rgba(0,0,0,0.5)',
            zIndex: 99,
            animation: 'fade-in 0.2s ease'
        };

        // Create container for sheet + backdrop
        const containerId = 'bottom-sheet-' + Date.now();

        let container = document.createElement('div');
        container.id = containerId;

        // Close handler
        const close = (result) => {
            const el = document.getElementById(containerId);
            if (el) {
                // Add exit animation classes if needed, then remove
                el.remove();
            }
            resolve(result);
        };

        // Use standard FlutterJS mounting mechanism if possible (runApp logic usually).
        // Since we are inside a running app, we might need a Portal or Overlay.
        // For simple JS implementation, we can manually mount a VNode tree.

        // However, we need 'context' to work for children.
        // This is tricky without a proper Overlay entry in the main tree.
        // Quick hack: Render a separate tree rooted at document.body for the modal.

        // This won't inherit existing InheritedWidgets from 'context' easily unless we
        // wrap the new tree with them manually or link the Element tree.
        // FlutterJS's `runApp` (from runtime) creates a new Root. 
        // We probably want `Overlay` widget usage here eventually.

        console.warn("showModalBottomSheet: Context inheritance is limited in this implementation.");

        // Manual DOM creation for backdrop to keep it simple for now
        const backdrop = document.createElement('div');
        Object.assign(backdrop.style, backdropStyle);
        backdrop.onclick = () => {
            if (isDismissible) close(null);
        };
        container.appendChild(backdrop);

        // Placeholder for sheet content - in real world we need to mount the Widget 
        // properly to get lifecycle and context.
        // We will skip full implementation of `builder` rendering here as it requires `TestWidgets` or `Overlay` support.
        // We will just create a simple div with "Not Implemented Full Render" or try to render static VNode.

        // TODO: Use Overlay from Widgets layer when available.

        document.body.appendChild(container);

        // Mount the BottomSheet widget
        // Implementation detail: create a new RootElement/BuildOwner for this overlay?
        // Or just append to DOM if we assume `builder(context)` returns a VNode (it doesn't, it returns Widget).

        // Temporary: Just resolve immediately or log
        console.log("showModalBottomSheet called. Modal logic requires Overlay support.");
    });
}

export {
    BottomSheet,
    showModalBottomSheet
};
