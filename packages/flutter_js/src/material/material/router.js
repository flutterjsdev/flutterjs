export class Router {
  constructor(routes) {
    this.routes = routes || [];
    this.currentPath = '/';
    this.listeners = [];
  }

  // Add route listener
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify listeners of route change
  notify(path, params) {
    this.listeners.forEach(listener => listener({ path, params }));
  }

  // Match route by path
  match(path) {
    // First try exact match
    const exactRoute = this.routes.find(r => r.path === path);
    if (exactRoute) {
      return { route: exactRoute, params: {} };
    }

    // Try pattern matching for dynamic routes /user/:id
    for (const route of this.routes) {
      const pattern = this.pathToRegex(route.path);
      const match = path.match(pattern.regex);
      
      if (match) {
        const params = {};
        pattern.keys.forEach((key, index) => {
          params[key] = match[index + 1];
        });
        return { route, params };
      }
    }

    // No match found
    return { route: null, params: null };
  }

  // Convert path pattern to regex
  pathToRegex(path) {
    const keys = [];
    const pattern = path
      .replace(/\//g, '\\/')
      .replace(/:(\w+)/g, (_, key) => {
        keys.push(key);
        return '([^/]+)';
      });
    
    return {
      regex: new RegExp(`^${pattern}$`),
      keys,
    };
  }

  // Navigate to path
  async navigate(path, params = {}) {
    const matched = this.match(path);
    
    if (!matched.route) {
      console.warn(`Route not found: ${path}`);
      return false;
    }

    this.currentPath = path;
    this.notify(path, matched.params);
    return true;
  }

  // Get all routes
  getRoutes() {
    return this.routes;
  }

  // Get current path
  getCurrentPath() {
    return this.currentPath;
  }
}