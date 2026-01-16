import { StatefulWidget, StatelessWidget, Widget } from '../core/widget_element.js';
import { Element } from "@flutterjs/runtime";
import { VNode } from '@flutterjs/vdom/vnode';
import { AppBar } from './app_bar.js';
import { SnackBar, SnackBarClosedReason } from './snack_bar.js';

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
        this.backgroundColor = backgroundColor || '#ffffff'; // Should defaults to theme.scaffoldBackgroundColor
        this.resizeToAvoidBottomInset = resizeToAvoidBottomInset;
        this.extendBody = extendBody;
        this.extendBodyBehindAppBar = extendBodyBehindAppBar;
        this.primary = primary;
    }

    /**
     * Get scaffold state from context
     */
    static of(context) {
        const state = context.findAncestorStateOfType?.(ScaffoldState);
        if (!state) {
            throw new Error('Scaffold.of() called with a context that does not contain a Scaffold');
        }
        return state;
    }

    /**
     * Maybe get scaffold state
     */
    static maybeOf(context) {
        return context?.findAncestorStateOfType?.(ScaffoldState);
    }

    build(context) {
        // We are essentially recreating the layout similar to Flutter's Scaffold
        // AppBar, Body, FAB, BottomNav, Drawers

        const elementId = context.element.getElementId();

        // Layout Dimensions
        const appBarHeight = this.appBar ? (this.appBar.toolbarHeight || 56) : 0;
        const bottomNavHeight = this.bottomNavigationBar ? 56 : 0; // approximate, assumes standard

        // Build Children
        const appBarVNode = this.appBar ? this.appBar.build(context) : null;
        const bodyVNode = this.body ? this.body.build(context) : null;
        const fabVNode = this.floatingActionButton ? this.floatingActionButton.build(context) : null;
        const bottomNavVNode = this.bottomNavigationBar ? this.bottomNavigationBar.build(context) : null;
        const drawerVNode = this.drawer ? this.drawer.build(context) : null;
        const endDrawerVNode = this.endDrawer ? this.endDrawer.build(context) : null;

        // --- STYLES ---

        // Main Scaffold Container
        const scaffoldStyle = {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minHeight: '100%',
            height: '100%',
            backgroundColor: this.backgroundColor,
            position: 'relative',
            overflow: 'hidden' // Scaffold handles scrolling in body usually
        };

        // Body Container
        const bodyStyle = {
            flex: 1,
            position: 'relative',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingTop: this.extendBodyBehindAppBar ? 0 : `${appBarHeight}px`,
            paddingBottom: this.extendBody ? 0 : `${bottomNavHeight}px`
        };

        // AppBar Container (Fixed Top)
        const appBarStyle = {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: `${appBarHeight}px`,
            zIndex: 10
        };

        // BottomNav Container (Fixed Bottom)
        const bottomNavStyle = {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${bottomNavHeight}px`,
            zIndex: 10
        };

        // FAB Container
        const fabStyle = this._getFabContainerStyle();

        // Drawer Scrim
        const isDrawerOpen = context.element?.state?._drawerOpen;
        const isEndDrawerOpen = context.element?.state?._endDrawerOpen;

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
            width: '304px', // Standard drawer width
            backgroundColor: '#FFFFFF',
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
            backgroundColor: '#FFFFFF',
            zIndex: 25,
            transform: isEndDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.25s ease-in-out',
            boxShadow: '-8px 0 10px -5px rgba(0,0,0,0.2)'
        };

        // --- VDOM ASSEMBLY ---

        const children = [];

        // 1. Body (at the base)
        if (bodyVNode) {
            children.push(new VNode({
                tag: 'div',
                props: { className: 'fjs-scaffold-body', style: bodyStyle },
                children: [bodyVNode]
            }));
        }

        // 2. AppBar (if not behind, but we position absolute so order matters visually if z-index same, but we use z-index)
        if (appBarVNode) {
            children.push(new VNode({
                tag: 'div',
                props: { className: 'fjs-scaffold-appbar', style: appBarStyle },
                children: [appBarVNode]
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

        // 4. FAB
        if (fabVNode) {
            children.push(new VNode({
                tag: 'div',
                props: { className: 'fjs-scaffold-fab', style: fabStyle },
                children: [fabVNode]
            }));
        }

        // 5. Drawer Scrim
        children.push(new VNode({
            tag: 'div',
            props: {
                className: 'fjs-scaffold-scrim',
                style: scrimStyle,
                onClick: () => {
                    if (isDrawerOpen) context.element.state.closeDrawer();
                    if (isEndDrawerOpen) context.element.state.closeEndDrawer();
                }
            }
        }));

        // 6. Drawers
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
        const currentSnackBar = context.element?.state?._currentSnackBar;
        if (currentSnackBar) {
            children.push(new VNode({
                tag: 'div',
                props: {
                    className: 'fjs-scaffold-snackbar-container',
                    style: {
                        position: 'absolute',
                        bottom: this.floatingActionButtonLocation.includes('Float') ? '80px' : '48px', // Adjust based on FAB
                        left: '16px',
                        zIndex: 30, // Highest
                        animation: 'fjs-snackbar-slide-up 0.3s ease-out'
                    }
                },
                children: [currentSnackBar.widget.build(context)]
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

    mount(parent = null) {
        // Setup context first so it's available for performRebuild
        // We override context to inject findAncestorStateOfType helper
        this._context = {
            element: this,
            runtime: this.runtime,
            parent: parent || this.parent,
            findAncestorStateOfType: (stateType) => {
                let current = parent || this.parent;
                while (current) {
                    if (current instanceof stateType) {
                        return current;
                    }
                    if (current.element && current.element instanceof stateType) {
                        return current.element;
                    }
                    current = current.parent;
                }
                return null;
            },
            dependOnInheritedWidgetOfExactType: (type) => {
                // Proxy to parent context's method if available, or simple traversal
                // This is redundant if Runtime handles it, but good fallback
                if (parent && parent.context && parent.context.dependOnInheritedWidgetOfExactType) {
                    return parent.context.dependOnInheritedWidgetOfExactType(type);
                }
                return null;
            }
        };

        super.mount(parent);
    }

    getElementId() {
        return this._elementId || (this._elementId = `scaffold-${Date.now()}`);
    }

    performRebuild() {
        if (!this.mounted) {
            this.mount();
        }
        // Context is already set in mount
        return this.widget.build(this.context);
    }

    build(context) {
        return this.performRebuild();
    }
}

export { Scaffold, ScaffoldState, FloatingActionButtonLocation, ScaffoldFeatureController };
