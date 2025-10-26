
class BaseEngine {
  constructor(app) {
    this.app = app;
  }

  async initialize() {}
  async render(path, params) {}
}

export class SPAEngine extends BaseEngine {
  async initialize() {
    window.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href && !link.target) {
        e.preventDefault();
        const path = new URL(link.href).pathname;
        this.app.navigate(path);
      }
    });

    window.addEventListener('popstate', () => {
      this.app.navigate(window.location.pathname);
    });

    return this.app.navigate(this.app.initialRoute);
  }

  async render(path, params) {
    window.history.pushState({}, '', path);
    const route = this.app.router.match(path).route;
    const page = route?.page || this.app.home;
    
    if (page) {
      this.app.container.innerHTML = '';
      const element = page(params)?.render?.() || page?.render?.();
      if (element) {
        this.app.container.appendChild(element);
      }
    }
  }
}

export class CSREngine extends BaseEngine {
  async initialize() {
    return this.app.navigate(this.app.initialRoute);
  }

  async render(path, params) {
    const route = this.app.router.match(path).route;
    const page = route?.page || this.app.home;
    
    if (page) {
      this.app.container.innerHTML = '';
      const element = page(params)?.render?.() || page?.render?.();
      if (element) {
        this.app.container.appendChild(element);
      }
    }
  }
}

export class SSREngine extends BaseEngine {
  async initialize() {
    if (typeof window !== 'undefined') {
      // Client-side: hydrate
      return this.app.navigate(window.location.pathname);
    }
  }

  async render(path, params) {
    const route = this.app.router.match(path).route;
    const page = route?.page || this.app.home;
    
    if (typeof window !== 'undefined') {
      this.app.container.innerHTML = '';
      const element = page(params)?.render?.() || page?.render?.();
      if (element) {
        this.app.container.appendChild(element);
      }
    }
  }
}

export class MPAEngine extends BaseEngine {
  async initialize() {
    return this.app.navigate(window.location.pathname);
  }

  async render(path, params) {
    const route = this.app.router.match(path).route;
    const page = route?.page || this.app.home;
    
    if (page) {
      this.app.container.innerHTML = '';
      const element = page(params)?.render?.() || page?.render?.();
      if (element) {
        this.app.container.appendChild(element);
      }
    }
  }
}

export class HybridEngine extends SPAEngine {
  async initialize() {
    // SSR hydration + SPA navigation
    return super.initialize();
  }
}