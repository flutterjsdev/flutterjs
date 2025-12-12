// ============================================================================
// ROUTER - Client-Side Routing for SPA & MPA
// Supports: Hash routing, History routing, Dynamic imports, Lazy loading
// ============================================================================

import { runApp } from './flutter_app.js';
import { SEOManager } from './seo_manager.js';

/**
 * Route definition interface
 * {
 *   path: '/products/:id',
 *   name: 'productPage',
 *   component: ProductPage,
 *   meta: { title: 'Product', description: '...' },
 *   beforeEnter: (route) => true,
 *   lazy: () => import('./pages/ProductPage.js')
 * }
 */

class Route {
  constructor(config) {
    this.path = config.path;
    this.name = config.name;
    this.component = config.component;
    this.meta = config.meta || {};
    this.beforeEnter = config.beforeEnter;
    this.lazy = config.lazy;
    this.children = config.children || [];
    this.redirect = config.redirect;
  }

  /**
   * Check if path matches route pattern
   * /products/:id matches /products/123
   */
  matches(path) {
    const pattern = this.pathToRegex(this.path);
    return pattern.test(path);
  }

  /**
   * Extract params from path
   * /products/:id with /products/123 → { id: '123' }
   */
  extractParams(path) {
    const keys = [];
    const pattern = this.pathToRegex(this.path, keys);
    const match = path.match(pattern);

    if (!match) return {};

    const params = {};
    keys.forEach((key, index) => {
      params[key] = match[index + 1];
    });

    return params;
  }

  /**
   * Convert path pattern to regex
   */
  pathToRegex(path, keys = []) {
    const keyPattern = /:([^/]+)/g;
    let match;

    while ((match = keyPattern.exec(path)) !== null) {
      keys.push(match[1]);
    }

    const regexPath = path.replace(/:([^/]+)/g, '([^/]+)');
    return new RegExp(`^${regexPath}/?$`);
  }

  /**
   * Build URL with params
   * /products/:id with { id: 123 } → /products/123
   */
  buildUrl(params = {}) {
    let url = this.path;

    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });

    return url;
  }
}

/**
 * Router - Manage application routing
 */
class Router {
  constructor(config = {}) {
    this.routes = [];
    this.currentRoute = null;
    this.currentParams = {};
    this.history = [];
    this.listeners = new Set();
    this.loading = false;

    const {
      mode = 'history',
      base = '/',
      fallback = null,
      strict = false,
      debugMode = false
    } = config;

    this.mode = mode;
    this.base = base;
    this.fallback = fallback;
    this.strict = strict;
    this.debugMode = debugMode;
  }

  /**
   * Register routes
   */
  register(routes) {
    routes.forEach(route => {
      this.routes.push(new Route(route));
    });

    return this;
  }

  /**
   * Start router
   */
  start() {
    // Listen for navigation
    if (this.mode === 'history') {
      window.addEventListener('popstate', () => this.navigate(window.location.pathname));
    } else {
      window.addEventListener('hashchange', () => this.navigate(window.location.hash.slice(1)));
    }

    // Navigate to current URL
    const path = this.getCurrentPath();
    this.navigate(path);

    if (this.debugMode) {
      console.log('🛣️  Router started in', this.mode, 'mode');
    }
  }

  /**
   * Navigate to path
   */
  async navigate(path, options = {}) {
    const { replace = false, skipTransition = false } = options;

    if (this.debugMode) {
      console.log(`🔀 Navigating to: ${path}`);
    }

    this.loading = true;
    this.notifyListeners({ type: 'loading', path });

    try {
      // Find matching route
      const route = this.findRoute(path);

      if (!route) {
        if (this.fallback) {
          this.loading = false;
          return this.navigate(this.fallback);
        }
        throw new Error(`No route found for path: ${path}`);
      }

      // Check guard
      if (route.beforeEnter) {
        const canEnter = await route.beforeEnter(route);
        if (!canEnter) {
          this.loading = false;
          return;
        }
      }

      // Load component if lazy
      let component = route.component;
      if (route.lazy && !route.component) {
        const module = await route.lazy();
        component = module.default || module;
        route.component = component;
      }

      // Update current route
      const params = route.extractParams(path);
      this.currentRoute = route;
      this.currentParams = params;

      // Update browser history
      if (this.mode === 'history') {
        const url = this.base + path;
        if (replace) {
          window.history.replaceState({ path }, '', url);
        } else {
          window.history.pushState({ path }, '', url);
        }
      } else {
        window.location.hash = '#' + path;
      }

      // Update SEO
      if (route.meta) {
        SEOManager.setPageMeta(route.meta);
      }

      this.loading = false;

      // Notify listeners
      this.notifyListeners({
        type: 'navigate',
        route,
        path,
        params,
        component
      });

      return { route, component, params };
    } catch (error) {
      this.loading = false;
      this.notifyListeners({ type: 'error', path, error });
      console.error('Navigation error:', error);
      throw error;
    }
  }

  /**
   * Go back in history
   */
  back() {
    window.history.back();
  }

  /**
   * Go forward in history
   */
  forward() {
    window.history.forward();
  }

  /**
   * Go to specific position in history
   */
  go(n) {
    window.history.go(n);
  }

  /**
   * Get current path
   */
  getCurrentPath() {
    if (this.mode === 'history') {
      return window.location.pathname.replace(this.base, '') || '/';
    } else {
      return window.location.hash.slice(1) || '/';
    }
  }

  /**
   * Generate URL
   */
  createUrl(name, params = {}) {
    const route = this.routes.find(r => r.name === name);
    if (!route) {
      throw new Error(`Route named "${name}" not found`);
    }
    return route.buildUrl(params);
  }

  /**
   * Find route by path
   */
  findRoute(path) {
    for (const route of this.routes) {
      if (route.matches(path)) {
        return route;
      }

      // Check nested routes
      if (route.children) {
        for (const child of route.children) {
          const childRoute = new Route(child);
          if (childRoute.matches(path)) {
            return childRoute;
          }
        }
      }
    }

    return null;
  }

  /**
   * Listen for navigation events
   */
  onNavigate(listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Route listener error:', error);
      }
    });
  }

  /**
   * Get all routes for sitemap generation
   */
  getRoutesForSitemap() {
    return this.routes
      .filter(route => !route.redirect && !route.meta?.noindex)
      .map(route => ({
        url: route.path.replace(/:([^/]+)/g, '[param]'),
        lastModified: new Date().toISOString(),
        changeFrequency: route.meta?.changeFrequency || 'weekly',
        priority: route.meta?.priority || 0.8
      }));
  }
}

/**
 * Router Link Component - Creates navigation links
 * Usage: new RouterLink({ to: '/products', label: 'Products' })
 */
class RouterLink {
  constructor({ to, label = '', activeClass = 'active', router = null }) {
    this.to = to;
    this.label = label;
    this.activeClass = activeClass;
    this.router = router;
  }

  /**
   * Check if link is active
   */
  isActive() {
    if (!this.router) return false;
    const currentPath = this.router.getCurrentPath();
    return currentPath === this.to || currentPath.startsWith(this.to + '/');
  }

  /**
   * Create link VNode
   */
  toVNode() {
    const { VNode } = require('./vnode.js');

    return new VNode({
      tag: 'a',
      props: {
        href: this.to,
        className: this.isActive() ? this.activeClass : ''
      },
      children: [this.label],
      events: {
        click: (e) => {
          e.preventDefault();
          if (this.router) {
            this.router.navigate(this.to);
          }
        }
      }
    });
  }
}

/**
 * Route View - Component that renders current route
 */
class RouteView {
  constructor(router) {
    this.router = router;
    this.currentComponent = null;
    this.currentElement = null;

    this.router.onNavigate((event) => {
      if (event.type === 'navigate') {
        this.currentComponent = event.component;
        this.notifyUpdate();
      }
    });
  }

  /**
   * Get current route component VNode
   */
  render() {
    if (!this.currentComponent) {
      return new (require('./vnode.js').VNode)({
        tag: 'div',
        children: ['Loading...']
      });
    }

    const component = new this.currentComponent();
    const element = component.createElement();
    element.mount(null);

    return element.performRebuild();
  }

  notifyUpdate() {
    if (this.onUpdate) {
      this.onUpdate();
    }
  }
}

export { Router, Route, RouterLink, RouteView };