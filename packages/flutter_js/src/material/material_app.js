import { Router } from '../core/router.js';
import { ThemeManager } from '../core/theme_manager.js';
import { LocalizationManager } from '../core/localization_manager.js';
import { SPAEngine } from '../engines/spa_engine.js';
import { SSREngine } from '../engines/ssr_engine.js';
import { MPAEngine } from '../engines/mpa_engine.js';
import { CSREngine } from '../engines/csr_engine.js';
import { HybridEngine } from '../engines/hybrid_engine.js';

export class MaterialApp {
  constructor(config = {}) {
    // ===== TIER 1: Navigation =====
    this.home = config.home;
    this.routes = config.routes || [];
    this.initialRoute = config.initialRoute || '/';
    this.onGenerateRoute = config.onGenerateRoute;
    this.onUnknownRoute = config.onUnknownRoute;
    this.navigatorObservers = config.navigatorObservers || [];
    
    // ===== TIER 1: Theme =====
    this.theme = config.theme;
    this.darkTheme = config.darkTheme;
    this.themeMode = config.themeMode || 'system';
    this.color = config.color;
    
    // ===== TIER 2: Theme Advanced =====
    this.themeAnimationDuration = config.themeAnimationDuration || 200;
    this.themeAnimationCurve = config.themeAnimationCurve || 'ease-in-out';
    this.highContrastTheme = config.highContrastTheme;
    this.highContrastDarkTheme = config.highContrastDarkTheme;
    
    // ===== TIER 2: Localization =====
    this.locale = config.locale;
    this.supportedLocales = config.supportedLocales || [
      { language: 'en', country: 'US' }
    ];
    this.localizationsDelegates = config.localizationsDelegates || [];
    this.localeListResolutionCallback = config.localeListResolutionCallback;
    this.localeResolutionCallback = config.localeResolutionCallback;
    
    // ===== TIER 2: Customization =====
    this.builder = config.builder;
    this.title = config.title || '';
    this.onGenerateTitle = config.onGenerateTitle;
    this.scrollBehavior = config.scrollBehavior;
    
    // ===== TIER 2: Other =====
    this.renderMode = config.renderMode || 'spa';
    this.onNavigationNotification = config.onNavigationNotification;
    
    // Initialize core managers
    this.router = new Router(this.routes);
    this.themeManager = new ThemeManager({
      theme: this.theme,
      darkTheme: this.darkTheme,
      themeMode: this.themeMode,
      themeAnimationDuration: this.themeAnimationDuration,
      themeAnimationCurve: this.themeAnimationCurve,
      highContrastTheme: this.highContrastTheme,
      highContrastDarkTheme: this.highContrastDarkTheme,
    });
    
    this.localizationManager = new LocalizationManager({
      supportedLocales: this.supportedLocales,
      localizationsDelegates: this.localizationsDelegates,
      localeListResolutionCallback: this.localeListResolutionCallback,
      localeResolutionCallback: this.localeResolutionCallback,
    });

    this.renderEngine = this.createRenderEngine();
    this.container = null;
    this.navigationStack = [];
  }

  // Create render engine based on mode
  createRenderEngine() {
    switch(this.renderMode) {
      case 'ssr':
        return new SSREngine(this);
      case 'csr':
        return new CSREngine(this);
      case 'spa':
        return new SPAEngine(this);
      case 'mpa':
        return new MPAEngine(this);
      case 'hybrid':
        return new HybridEngine(this);
      default:
        return new SPAEngine(this);
    }
  }

  // Initialize app
  async initialize() {
    // Apply theme
    this.themeManager.applyTheme();
    
    // Set document language and direction
    document.documentElement.lang = 
      `${this.localizationManager.currentLocale.language}-${this.localizationManager.currentLocale.country}`;
    document.documentElement.dir = this.localizationManager.getDirection();

    // Update title
    this.updateTitle();

    // Subscribe to changes
    this.themeManager.subscribe(() => this.updateTitle());
    this.localizationManager.subscribe(() => {
      document.documentElement.lang = 
        `${this.localizationManager.currentLocale.language}-${this.localizationManager.currentLocale.country}`;
      document.documentElement.dir = this.localizationManager.getDirection();
    });

    // Initialize render engine
    return this.renderEngine.initialize();
  }

  // Mount app to DOM
  async mount(selector) {
    this.container = document.querySelector(selector);
    if (!this.container) {
      throw new Error(`Container not found: ${selector}`);
    }

    await this.initialize();
  }

  // Navigate to route
  async navigate(path, params = {}) {
    const matched = this.router.match(path);
    
    if (!matched.route && !this.onGenerateRoute && !this.home) {
      console.warn(`Route not found: ${path}`);
      return false;
    }

    // Notify observers
    this.navigatorObservers.forEach(observer => {
      observer.didPush?.({
        path,
        params: matched.params || params,
      });
    });

    // Notify listeners
    this.onNavigationNotification?.({ path, params });

    // Update navigation stack
    this.navigationStack.push({ path, params: matched.params || params });

    // Render page
    await this.renderEngine.render(path, matched.params || params);
    
    return true;
  }

  // Update app title
  updateTitle() {
    const title = this.onGenerateTitle?.() || this.title;
    if (title) {
      document.title = title;
    }
  }

  // Get translation
  t(key, defaultValue) {
    return this.localizationManager.translate(key, defaultValue);
  }

  // Set theme mode
  setThemeMode(mode) {
    this.themeManager.setThemeMode(mode);
  }

  // Set locale
  setLocale(locale) {
    this.localizationManager.setLocale(locale);
  }

  // Get current route
  getCurrentRoute() {
    return this.navigationStack[this.navigationStack.length - 1] || null;
  }
}
