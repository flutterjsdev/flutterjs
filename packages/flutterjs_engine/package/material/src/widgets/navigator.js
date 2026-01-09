/**
 * ============================================================================
 * Navigator Widget
 * ============================================================================
 * 
 * A widget that manages a set of child widgets with a stack discipline.
 */

import { StatefulWidget, State } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';

class Route {
    constructor({ settings = {}, builder = null } = {}) {
        this.settings = settings;
        this.builder = builder;
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
        // Find the nearest NavigatorState ancestor
        // This requires context.findAncestorStateOfType
        // For now, we assume context.findAncestorStateOfType is available or implemented in BuildContext
        // If not, we might need a workaround or implement it.

        // Check if context has findAncestorStateOfType
        if (context && typeof context.findAncestorStateOfType === 'function') {
            const state = context.findAncestorStateOfType(NavigatorState);
            if (state) return state;
        }

        // Fallback: simple traversal if available (depends on context implementation)
        let ancestor = context;
        while (ancestor) {
            if (ancestor instanceof NavigatorState) return ancestor;
            if (ancestor.state instanceof NavigatorState) return ancestor.state;
            ancestor = ancestor.parent;
        }

        return null;
    }
}

class NavigatorState extends State {
    constructor() {
        super();
        this._history = [];
    }

    initState() {
        super.initState();
        // Initialize with initial route
        this.pushNamed(this.widget.initialRoute);
    }

    push(route) {
        this._history.push(route);
        this.setState(() => { });
        return Promise.resolve(); // Future<T>
    }

    pushNamed(routeName, { arguments: args = null } = {}) {
        const route = this._routeNamed(routeName, args);
        if (route) {
            this.push(route);
        } else {
            console.warn(`Navigator: No route defined for "${routeName}"`);
        }
    }

    pop(result) {
        if (this.canPop()) {
            this._history.pop();
            this.setState(() => { });
            return true;
        }
        return false;
    }

    canPop() {
        return this._history.length > 1;
    }

    _routeNamed(name, args) {
        const settings = { name, arguments: args };

        // 1. Check routes map
        if (this.widget.routes && this.widget.routes[name]) {
            return new Route({
                settings,
                builder: this.widget.routes[name]
            });
        }

        // 2. onGenerateRoute
        if (this.widget.onGenerateRoute) {
            return this.widget.onGenerateRoute(settings);
        }

        // 3. onUnknownRoute
        if (this.widget.onUnknownRoute) {
            return this.widget.onUnknownRoute(settings);
        }

        return null;
    }

    build(context) {
        if (this._history.length === 0) {
            return null; // Or empty container
        }

        // Get top route
        const route = this._history[this._history.length - 1];

        // Build the page
        if (route.builder) {
            const page = route.builder(context);

            // CRITICAL FIX: Add a key based on route name to force rebuild when route changes
            // This prevents "Widget unchanged, reusing existing vnode" issue
            if (page && route.settings && route.settings.name) {
                // If the page widget doesn't have a key, add one based on the route name
                if (!page.key) {
                    page.key = `route_${route.settings.name}_${this._history.length}_${Date.now()}`;
                }
            }

            return page;
        }

        return null;
    }
}

export { Navigator, NavigatorState, Route };
