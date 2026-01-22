import { StatefulWidget, StatelessWidget, Widget } from '../core/widget_element.js';
import { Element } from "@flutterjs/runtime";
import { VNode } from '@flutterjs/vdom/vnode';
import { AppBar } from './app_bar.js';
import { SnackBar, SnackBarClosedReason } from './snack_bar.js';
import { Theme } from './theme.js';

// ============================================================================
// ENUMS
// ============================================================================

const FloatingActionButtonLocation = {
    endFloat: 'endFloat',
    endDocked: 'endDocked',
    endTop: 'endTop',
    startFloat: 'startFloat',
    startDocked: 'startDocked',
    startTop: 'startTop',
    centerFloat: 'centerFloat',
    centerDocked: 'centerDocked',
    centerTop: 'centerTop'
};

// ============================================================================
// SCAFFOLD FEATURE CONTROLLER (For SnackBars, BottomSheets)
// ============================================================================

class ScaffoldFeatureController {
    constructor(widget, completer, closeCallback) {
        this._widget = widget;
        this._completer = completer;
        this._close = closeCallback;
    }

    get widget() {
        return this._widget;
    }

    get closed() {
        return this._completer.promise;
    }

    close() {
        if (!this._completer.completed) {
            this._completer.resolve(SnackBarClosedReason.dismiss);
        }
        this._close?.();
    }
}

// ============================================================================
// SCAFFOLD STATE
// ============================================================================

class ScaffoldState extends Element {
    constructor(widget, parent = null, runtime = null) {
        super(widget, parent, runtime);
        this._snackBars = [];
        this._currentSnackBar = null;
        this._snackBarTimer = null;
        this._drawerOpen = false;
        this._endDrawerOpen = false;
        this._fabVisible = true;
    }

    /**
     * Show snack bar
     */
    showSnackBar(snackBar) {
        // Clear previous snack bar timer
        if (this._snackBarTimer) {
            clearTimeout(this._snackBarTimer);
            this._snackBarTimer = null;
        }

        const completer = {
            resolve: null,
            reject: null,
            completed: false,
            promise: new Promise((resolve, reject) => {
                completer.resolve = (value) => {
                    completer.completed = true;
                    resolve(value);
                };
                completer.reject = reject;
            })
        };

        const controller = new ScaffoldFeatureController(
            snackBar,
            completer,
            () => this._hideSnackBar()
        );

        this._currentSnackBar = controller;
        this._snackBars.push(controller);

        // Auto-hide after duration
        this._snackBarTimer = setTimeout(() => {
            if (!completer.completed) {
                completer.resolve(SnackBarClosedReason.timeout);
            }
            this._hideSnackBar();
        }, snackBar.duration);

        this.markNeedsBuild();

        return controller;
    }

    /**
     * Hide current snack bar
     */
    _hideSnackBar() {
        if (this._snackBarTimer) {
            clearTimeout(this._snackBarTimer);
            this._snackBarTimer = null;
        }

        this._snackBars.shift();
        this._currentSnackBar = this._snackBars.length > 0 ? this._snackBars[0] : null;

        this.markNeedsBuild();
    }

    /**
     * Close snack bar
     */
    closeSnackBar() {
        if (this._currentSnackBar) {
            this._currentSnackBar.close();
        }
    }

    /**
     * Open drawer
     */
    openDrawer() {
        this._drawerOpen = true;
        this.markNeedsBuild();
    }

    /**
     * Close drawer
     */
    closeDrawer() {
        this._drawerOpen = false;
        this.markNeedsBuild();
    }

    /**
     * Toggle drawer
     */
    toggleDrawer() {
        this._drawerOpen = !this._drawerOpen;
        this.markNeedsBuild();
    }

    /**
     * Open end drawer
     */
    openEndDrawer() {
        this._endDrawerOpen = true;
        this.markNeedsBuild();
    }

    /**
     * Close end drawer
     */
    closeEndDrawer() {
        this._endDrawerOpen = false;
        this.markNeedsBuild();
    }

    /**
     * Check if drawer is open
     */
    get isDrawerOpen() {
        return this._drawerOpen;
    }

    /**
     * Check if end drawer is open
     */
    get isEndDrawerOpen() {
        return this._endDrawerOpen;
    }

    /**
     * Show FAB
     */
    showFloatingActionButton() {
        this._fabVisible = true;
        this.markNeedsBuild();
    }

    /**
     * Hide FAB
     */
    hideFloatingActionButton() {
        this._fabVisible = false;
        this.markNeedsBuild();
    }

    performRebuild() {
        return this.widget.build(this.context);
    }
}

// ============================================================================
// SCAFFOLD WIDGET
// ============================================================================

class Scaffold extends Widget {
    constructor({
        key = null,
        appBar = null,
        body = null,
        floatingActionButton = null,
        floatingActionButtonLocation = FloatingActionButtonLocation.endFloat,
        drawer = null,
        endDrawer = null,
        bottomNavigationBar = null,
        backgroundColor = null,
        resizeToAvoidBottomInset = true,
        extendBody = false,
        extendBodyBehindAppBar = false,
        primary = true
    } = {}) {
        super(key);

        this.appBar = appBar;
        this.body = body;
        this.floatingActionButton = floatingActionButton;
        this.floatingActionButtonLocation = floatingActionButtonLocation;
        this.drawer = drawer;
        this.endDrawer = endDrawer;
        this.bottomNavigationBar = bottomNavigationBar;
        if (backgroundColor) {
            this.backgroundColor = backgroundColor;
        } else {
            // Will be resolved in build/element, but strictly it's passed as null usually
            // If we need a default here for some reason:
            this.backgroundColor = null;
        }
        this.resizeToAvoidBottomInset = resizeToAvoidBottomInset;
        this.extendBody = extendBody;
        this.extendBodyBehindAppBar = extendBodyBehindAppBar;
        this.primary = primary;
    }

    /**
     * Get scaffold state from context
     */
    static of(context) {
        // Unwrap BuildContext if needed
        let current = context.element || context;

        while (current) {
            if (current instanceof ScaffoldState) {
                return current;
            }
            // Check if element is the state (redundant if context is element, but safe)
            if (current.element instanceof ScaffoldState) {
                return current.element;
            }
            current = current.parent;
        }

        throw new Error('Scaffold.of() called with a context that does not contain a Scaffold');
    }

    /**
     * Maybe get scaffold state
     */
    static maybeOf(context) {
        let current = context?.element || context;
        while (current) {
            if (current instanceof ScaffoldState) {
                return current;
            }
            if (current.element instanceof ScaffoldState) {
                return current.element;
            }
            current = current.parent;
        }
        return null;
    }

    build(context) {
        const theme = Theme.of(context);
        // Initialize child elements cache if not exists
        if (!context._childElements) {
            context._childElements = {};
        }

        const buildChild = (widget, slot) => {
            if (!widget) {
                if (context._childElements[slot]) {
                    // Cleanup removed child if needed (unmount?)
                    // context._childElements[slot].unmount(); // If unmount exists
                    delete context._childElements[slot];
                }
                return null;
            }

            let childElement = context._childElements[slot];

            if (!childElement) {
                // New child
                childElement = widget.createElement(context, context.runtime);
                childElement.mount(context);
                context._childElements[slot] = childElement;
            } else {
                // Update existing
                if (childElement.update) {
                    childElement.update(widget);
                } else {
                    // Fallback replace
                    childElement = widget.createElement(context, context.runtime);
                    childElement.mount(context);
                    context._childElements[slot] = childElement;
                }
            }

            return childElement.performRebuild();
        };

        const elementId = context.getElementId();

        // Layout Dimensions
        const appBarHeight = this.appBar ? (this.appBar.toolbarHeight || 56) : 0;
        const bottomNavHeight = this.bottomNavigationBar ? 56 : 0; // approximate

        // Build Children VNodes (caching elements)
        const appBarVNode = buildChild(this.appBar, 'appBar');
        const bodyVNode = buildChild(this.body, 'body');
        const fabVNode = buildChild(this.floatingActionButton, 'fab');
        const bottomNavVNode = buildChild(this.bottomNavigationBar, 'bottomNav');
        const drawerVNode = buildChild(this.drawer, 'drawer');
        const endDrawerVNode = buildChild(this.endDrawer, 'endDrawer');

        // SnackBar is special, handled by state
        const currentSnackBar = context._currentSnackBar;
        const snackBarVNode = currentSnackBar ? buildChild(currentSnackBar.widget, 'snackBar') : null;
        if (!currentSnackBar && context._childElements['snackBar']) {
            delete context._childElements['snackBar'];
        }


        // --- STYLES ---

        // Main Scaffold Container
        const scaffoldStyle = {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            minHeight: '100vh', // Force full viewport height
            backgroundColor: this.backgroundColor,
            position: 'relative',
            overflow: 'hidden'
        };

        const isExtendedBody = this.extendBody;
        const isExtendedAppBar = this.extendBodyBehindAppBar;

        // AppBar Container
        const appBarStyle = {
            position: isExtendedAppBar ? 'absolute' : 'relative',
            top: 0,
            left: 0,
            right: 0,
            height: `${appBarHeight}px`,
            zIndex: 10,
            flex: '0 0 auto' // Don't shrink/grow
        };

        // BottomNav Container
        const bottomNavStyle = {
            position: isExtendedBody ? 'absolute' : 'relative',
            bottom: isExtendedBody ? 0 : 'auto',
            left: 0,
            right: 0,
            height: `${bottomNavHeight}px`,
            zIndex: 10,
            flex: '0 0 auto'
        };

        // Body Container - ✅ Use flex with constraints for proper layout
        const bodyStyle = {
            flex: '1 1 0', // Take remaining space, but can shrink to 0
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minHeight: 0, // Critical: allows flex child to shrink and enable scrolling
            maxHeight: '100%', // Don't exceed available space
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden', // Let child (SingleChildScrollView) handle scrolling
            // Only add padding if extended (since they are absolute in that case)
            paddingTop: isExtendedAppBar ? `${appBarHeight}px` : 0,
            paddingBottom: isExtendedBody ? `${bottomNavHeight}px` : 0
        };

        // FAB Container
        const fabStyle = this._getFabContainerStyle();

        // Drawer Scrim
        const isDrawerOpen = context.isDrawerOpen;
        const isEndDrawerOpen = context.isEndDrawerOpen;

        const scrimStyle = {
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 20,
            display: (isDrawerOpen || isEndDrawerOpen) ? 'block' : 'none',
            opacity: (isDrawerOpen || isEndDrawerOpen) ? 1 : 0,
            transition: 'opacity 0.2s',
        };

        // Drawer Container
        const drawerStyle = {
            position: 'absolute',
            top: 0, bottom: 0, left: 0,
            width: '304px',
            backgroundColor: this.backgroundColor || theme.scaffoldBackgroundColor || theme.colorScheme.background,
            zIndex: 25,
            transform: isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s ease-in-out',
            boxShadow: '0 8px 10px -5px rgba(0,0,0,0.2), 0 16px 24px 2px rgba(0,0,0,0.14), 0 6px 30px 5px rgba(0,0,0,0.12)'
        };

        // End Drawer Container
        const endDrawerStyle = {
            position: 'absolute',
            top: 0, bottom: 0, right: 0,
            width: '304px',
            backgroundColor: theme.colorScheme.surface,
            zIndex: 25,
            transform: isEndDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.25s ease-in-out',
            boxShadow: '-8px 0 10px -5px rgba(0,0,0,0.2)'
        };

        // --- VDOM ASSEMBLY ---

        // We need to order them correctly for Flex column:
        // [AppBar, Body, BottomNav]
        // But if they are absolute, order doesn't impact flow, just Z-index (which is handled by style zIndex)
        // However, standard flow is best.

        const children = [];

        // 1. App Bar (if not bottom or if extended behind)
        // Actually for Flex Column Layout: AppBar -> Body -> BottomNav
        // If absolute, it ignores flow.

        if (appBarVNode) {
            children.push(new VNode({
                tag: 'div',
                props: { className: 'fjs-scaffold-appbar', style: appBarStyle },
                children: [appBarVNode]
            }));
        }

        // 2. Body
        if (bodyVNode) {
            children.push(new VNode({
                tag: 'div',
                props: { className: 'fjs-scaffold-body', style: bodyStyle },
                children: [bodyVNode]
            }));
        }

        // 3. BottomNavBar
        if (bottomNavVNode) {
            children.push(new VNode({
                tag: 'div',
                props: { className: 'fjs-scaffold-bottom-nav', style: bottomNavStyle },
                children: [bottomNavVNode]
            }));
        }

        // 4. FAB (Overlay)
        if (fabVNode) {
            children.push(new VNode({
                tag: 'div',
                props: { className: 'fjs-scaffold-fab', style: fabStyle },
                children: [fabVNode]
            }));
        }

        // 5. Drawer Scrim (Overlay)
        children.push(new VNode({
            tag: 'div',
            props: {
                className: 'fjs-scaffold-scrim',
                style: scrimStyle,
                onClick: () => {
                    if (isDrawerOpen) context.closeDrawer();
                    if (isEndDrawerOpen) context.closeEndDrawer();
                }
            }
        }));

        // 6. Drawers (Overlay)
        if (drawerVNode) {
            children.push(new VNode({
                tag: 'div',
                props: { className: 'fjs-scaffold-drawer', style: drawerStyle },
                children: [drawerVNode]
            }));
        }

        if (endDrawerVNode) {
            children.push(new VNode({
                tag: 'div',
                props: { className: 'fjs-scaffold-end-drawer', style: endDrawerStyle },
                children: [endDrawerVNode]
            }));
        }

        // 7. Snacks
        if (snackBarVNode) {
            children.push(new VNode({
                tag: 'div',
                props: {
                    className: 'fjs-scaffold-snackbar-container',
                    style: {
                        position: 'absolute',
                        bottom: this.floatingActionButtonLocation.includes('Float') ? '80px' : '48px',
                        left: '16px',
                        zIndex: 30,
                        animation: 'fjs-snackbar-slide-up 0.3s ease-out'
                    }
                },
                children: [snackBarVNode]
            }));
        }

        return new VNode({
            tag: 'div',
            props: {
                style: scaffoldStyle,
                'data-element-id': elementId,
                'data-widget': 'Scaffold'
            },
            children: children,
            key: this.key
        });
    }

    /**
     * Get FAB container style based on location
     * @private
     */
    _getFabContainerStyle() {
        const baseStyle = {
            position: 'absolute',
            zIndex: 15, // Above Body/AppBar but below Drawer/Scrim
            pointerEvents: 'none' // Allow clicks to pass through empty space
        };

        const spacing = 16;
        const fabSize = 56; // Standard FAB size

        // Helper to center FAB wrapper
        const fabWrapperStyle = {
            pointerEvents: 'auto', // Re-enable clicks
            display: 'inline-block'
        };

        // We will just return the position for the container, assuming the child is the FAB itself.
        // In actual implementation we might wrap the FAB VNode to ensure pointer events etc.

        let pos = {};

        switch (this.floatingActionButtonLocation) {
            case FloatingActionButtonLocation.endFloat:
                pos = { bottom: `${spacing}px`, right: `${spacing}px` };
                break;
            case FloatingActionButtonLocation.endDocked:
                // Overlapping bottom bar
                pos = { bottom: `${28}px`, right: `${spacing}px` }; // 56/2 = 28
                break;
            case FloatingActionButtonLocation.startFloat:
                pos = { bottom: `${spacing}px`, left: `${spacing}px` };
                break;
            // ... other cases
            default:
                pos = { bottom: `${spacing}px`, right: `${spacing}px` };
        }

        return { ...baseStyle, ...pos, pointerEvents: 'auto' };
    }

    createElement(parent, runtime) {
        return new ScaffoldElement(this, parent, runtime);
    }
}

class ScaffoldElement extends ScaffoldState {
    constructor(widget, parent, runtime) {
        super(widget, parent, runtime);
    }

    getElementId() {
        return this._elementId || (this._elementId = `scaffold-${Date.now()}`);
    }

    performRebuild() {
        // Just call widget.build passing THIS (the element) as context
        return this.widget.build(this);
    }
}

export { Scaffold, ScaffoldState, FloatingActionButtonLocation, ScaffoldFeatureController };
