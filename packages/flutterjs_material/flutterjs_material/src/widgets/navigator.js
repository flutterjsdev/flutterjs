/**
 * ============================================================================
 * Navigator Widget - FIXED VERSION
 * ============================================================================
 * 
 * A widget that manages a set of child widgets with a stack discipline.
 * Fixes:
 * - Proper unmounting/remounting on navigation
 * - No widget sticking between pages
 * - Correct content for each route
 * - Full viewport coverage
 * - Clean state management
 */

import { StatefulWidget, State, Widget } from '../core/widget_element.js';
import { Element } from "@flutterjs/runtime";
import { VNode } from '@flutterjs/vdom/vnode';

class Route {
    constructor({ settings = {}, builder = null } = {}) {
        this.settings = settings;
        this.builder = builder;
        this._uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this._createdAt = Date.now();
    }
}

/**
 * NavigationContainer - Isolated container for each page
 * Ensures complete isolation between route transitions
 */
class NavigationContainer extends Widget {
    constructor({ key, routeId, child }) {
        super(key);
        this.routeId = routeId;
        this.child = child;
    }

    build(context) {
        return null;
    }

    createElement(parent, runtime) {
        return new NavigationContainerElement(this, parent, runtime);
    }
}

class NavigationContainerElement extends Element {
    constructor(widget, parent, runtime) {
        super(widget, parent, runtime);
        this._childElement = null;
        this._mountedRouteId = null;
    }

    performRebuild() {
        const childWidget = this.widget.child;
        const currentRouteId = this.widget.routeId;

        // Force complete remount if route changed
        if (this._mountedRouteId !== currentRouteId) {
            if (this._childElement) {
                this._childElement.unmount();
                this._childElement = null;
            }
            this._mountedRouteId = currentRouteId;
        }

        let childVNode = null;

        if (childWidget) {
            if (this._childElement) {
                // Check if widget type/key changed
                const widgetChanged =
                    this._childElement.widget.constructor !== childWidget.constructor ||
                    this._childElement.widget.key !== childWidget.key;

                if (widgetChanged) {
                    this._childElement.unmount();
                    this._childElement = childWidget.createElement(this, this.runtime);
                    this._childElement.mount(this);
                } else {
                    this._childElement.updateWidget(childWidget);
                    if (this._childElement.dirty) {
                        this._childElement.rebuild();
                    }
                }
            } else {
                this._childElement = childWidget.createElement(this, this.runtime);
                this._childElement.mount(this);
            }
            childVNode = this._childElement.performRebuild();
        } else {
            if (this._childElement) {
                this._childElement.unmount();
                this._childElement = null;
            }
        }

        return new VNode({
            tag: 'div',
            props: {
                // Styles are now handled by Global CSS in MaterialApp for robustness
                // We keep minimal inline styles for critical layout
                style: {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box'
                },
                'data-widget': 'NavigationContainer',
                'data-route-id': this.widget.routeId,
                'data-key': this.widget.key,
                'data-active': 'true' // Always render as active, CSS handles stacking order
            },
            children: childVNode ? [childVNode] : [],
            key: this.widget.key
        });
    }

    unmount() {
        if (this._childElement) {
            this._childElement.unmount();
            this._childElement = null;
        }
        this._mountedRouteId = null;
        super.unmount();
    }
}

class Navigator extends StatefulWidget {
    constructor({
        key = null,
        initialRoute = '/',
        onGenerateRoute = null,
        onUnknownRoute = null,
        routes = {}
    } = {}) {
        super(key);
        this.initialRoute = initialRoute;
        this.onGenerateRoute = onGenerateRoute;
        this.onUnknownRoute = onUnknownRoute;
        this.routes = routes;
    }

    createState() {
        return new NavigatorState();
    }

    static of(context) {
        if (context && typeof context.findAncestorStateOfType === 'function') {
            const state = context.findAncestorStateOfType(NavigatorState);
            if (state) return state;
        }
        let ancestor = context;
        while (ancestor) {
            if (ancestor instanceof NavigatorState) return ancestor;
            if (ancestor.state instanceof NavigatorState) return ancestor.state;
            ancestor = ancestor.parent;
        }
        return null;
    }

    static pushNamed(context, routeName, { arguments: args = null } = {}) {
        const navigator = Navigator.of(context);
        if (navigator) {
            return navigator.pushNamed(routeName, { arguments: args });
        }
        console.warn('Navigator operation requested with a context that does not include a Navigator.');
        return Promise.resolve();
    }

    static push(context, route) {
        const navigator = Navigator.of(context);
        if (navigator) {
            return navigator.push(route);
        }
        return Promise.resolve();
    }

    static pop(context, result) {
        const navigator = Navigator.of(context);
        if (navigator) {
            return navigator.pop(result);
        }
        return false;
    }
}

class NavigatorState extends State {
    constructor() {
        super();
        this._history = [];
        this._navigationId = 0;
        this._popstateHandler = null;
    }

    initState() {
        super.initState();

        // Bind and store the handler reference for proper cleanup
        this._popstateHandler = this._handlePopState.bind(this);

        if (typeof window !== 'undefined') {
            window.addEventListener('popstate', this._popstateHandler);
        }

        // Get the initial route name
        const initialRouteName = (typeof window !== 'undefined' && window.location.pathname !== '/')
            ? window.location.pathname
            : this.widget.initialRoute;

        console.log('[Navigator] Initializing with route:', initialRouteName);

        // Create and push initial route
        const route = this._createRoute(initialRouteName, null);

        if (route) {
            this._history.push(route);
            console.log('[Navigator] Initial route added:', route.settings.name, 'ID:', route._uniqueId);
        } else {
            console.error('[Navigator] Failed to create initial route:', initialRouteName);
        }
    }

    dispose() {
        if (typeof window !== 'undefined' && this._popstateHandler) {
            window.removeEventListener('popstate', this._popstateHandler);
        }
        this._popstateHandler = null;
        this._history = [];
        super.dispose();
    }

    _handlePopState(event) {
        console.log('[Navigator] Browser back button pressed');

        if (this._history.length > 1) {
            // CSS Strategy: No manual cleanup needed
            const popped = this._history.pop();
            console.log('[Navigator] Popped route:', popped?.settings?.name);

            this._navigationId++;
            this.setState(() => { });

            if (typeof window !== 'undefined') {
                window.scrollTo(0, 0);
            }
        }
    }

    push(route) {
        if (!route || !route.settings) {
            console.error('[Navigator] Invalid route provided to push');
            return Promise.resolve();
        }

        const routeName = route.settings.name;
        console.log('[Navigator] Pushing route:', routeName);

        // CSS Strategy: No manual cleanup needed

        // Add to history
        this._history.push(route);
        this._navigationId++;

        // Update browser URL
        if (typeof window !== 'undefined' && routeName) {
            if (window.location.pathname !== routeName) {
                window.history.pushState(
                    {
                        name: routeName,
                        uniqueId: route._uniqueId,
                        timestamp: route._createdAt
                    },
                    '',
                    routeName
                );
            }
        }

        // Trigger rebuild
        this.setState(() => { });

        // Scroll to top
        if (typeof window !== 'undefined') {
            requestAnimationFrame(() => {
                window.scrollTo(0, 0);
            });
        }

        console.log('[Navigator] Route pushed. History length:', this._history.length);
        return Promise.resolve();
    }

    pushNamed(routeName, { arguments: args = null } = {}) {
        console.log('[Navigator] pushNamed called:', routeName);

        const route = this._createRoute(routeName, args);

        if (route) {
            return this.push(route);
        } else {
            console.error('[Navigator] No route defined for:', routeName);
            return Promise.resolve();
        }
    }

    pop(result) {
        if (!this.canPop()) {
            console.log('[Navigator] Cannot pop - only one route in history');
            return false;
        }

        console.log('[Navigator] Popping route');
        this._navigationId++;

        if (typeof window !== 'undefined') {
            // Let browser back handle it, which will trigger popstate handler
            window.history.back();
            return true;
        }

        // Fallback for non-browser
        const popped = this._history.pop();
        console.log('[Navigator] Popped route:', popped?.settings?.name);
        this.setState(() => { });
        return true;
    }

    canPop() {
        return this._history.length > 1;
    }

    _createRoute(name, args) {
        console.log('[Navigator] Creating route for:', name);

        const settings = {
            name,
            arguments: args,
            timestamp: Date.now()
        };

        let builder = null;

        // 1. Check routes map
        if (this.widget.routes && this.widget.routes[name]) {
            console.log('[Navigator] Found route in routes map:', name);
            builder = this.widget.routes[name];
        }
        // 2. onGenerateRoute
        else if (this.widget.onGenerateRoute) {
            console.log('[Navigator] Using onGenerateRoute for:', name);
            const generatedRoute = this.widget.onGenerateRoute(settings);
            if (generatedRoute) {
                return generatedRoute;
            }
        }
        // 3. onUnknownRoute
        else if (this.widget.onUnknownRoute) {
            console.log('[Navigator] Using onUnknownRoute for:', name);
            const unknownRoute = this.widget.onUnknownRoute(settings);
            if (unknownRoute) {
                return unknownRoute;
            }
        }

        if (!builder) {
            console.warn('[Navigator] No route found for:', name);
            return null;
        }

        return new Route({
            settings,
            builder
        });
    }

    build(context) {
        if (this._history.length === 0) {
            console.warn('[Navigator] No routes in history');
            return null;
        }

        const route = this._history[this._history.length - 1];
        const routeName = route.settings?.name || 'unknown';

        console.log('[Navigator] Building:', routeName, '| History:', this._history.length, '| NavID:', this._navigationId);

        if (!route.builder) {
            console.error('[Navigator] No builder for route:', routeName);
            return null;
        }

        // CSS OVERLAY STRATEGY:
        // We no longer manually manipulate DOM visibility.
        // Instead, we rely on:
        // 1. MaterialApp Global CSS forcing all NavigationContainers to stack absolute.
        // 2. The active container (this one) getting a higher Z-Index via CSS (if possible) or just natural DOM order.
        // 
        // Since VDOM appends new elements, the latest one should naturally be on top.
        // Use 'isolation: isolate' in CSS to prevent bleed-through.
        // Background color is handled in CSS.

        // Build the page widget
        const page = route.builder(context);

        if (!page) {
            console.error('[Navigator] Builder returned null for route:', routeName);
            return null;
        }

        // Generate completely unique key for this navigation instance
        const containerKey = `nav_${routeName}_${route._uniqueId}_${this._navigationId}`;
        const pageKey = `page_${routeName}_${route._uniqueId}_${this._navigationId}`;

        console.log('[Navigator] Rendering with container key:', containerKey);

        // Assign key to page if it doesn't have one
        if (!page.key) {
            page.key = pageKey;
        }

        // Wrap in NavigationContainer for proper isolation
        return new NavigationContainer({
            key: containerKey,
            routeId: route._uniqueId,
            child: page
        });
    }
}

export { Navigator, NavigatorState, Route };