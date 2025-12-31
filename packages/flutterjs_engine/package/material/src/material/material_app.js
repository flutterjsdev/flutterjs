import { Widget, StatelessWidget, Element } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';

// ============================================================================
// THEME DATA
// ============================================================================

class ThemeData {
  constructor({
    brightness = 'light',
    primaryColor = '#2196F3',
    primarySwatch = null,
    accentColor = '#FF4081',
    scaffoldBackgroundColor = '#FAFAFA',
    canvasColor = '#FFF',
    cardColor = '#FFF',
    dividerColor = 'rgba(0, 0, 0, 0.12)',
    highlightColor = 'rgba(0, 0, 0, 0.05)',
    splashColor = 'rgba(0, 0, 0, 0.2)',
    selectedRowColor = '#F5F5F5',
    unselectedWidgetColor = 'rgba(0, 0, 0, 0.54)',
    disabledColor = 'rgba(0, 0, 0, 0.38)',
    textTheme = null,
    fontFamily = 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI"',
    appBarTheme = null
  } = {}) {
    this.brightness = brightness;
    this.primaryColor = primaryColor;
    this.primarySwatch = primarySwatch;
    this.accentColor = accentColor;
    this.scaffoldBackgroundColor = scaffoldBackgroundColor;
    this.canvasColor = canvasColor;
    this.cardColor = cardColor;
    this.dividerColor = dividerColor;
    this.highlightColor = highlightColor;
    this.splashColor = splashColor;
    this.selectedRowColor = selectedRowColor;
    this.unselectedWidgetColor = unselectedWidgetColor;
    this.disabledColor = disabledColor;
    this.textTheme = textTheme;
    this.fontFamily = fontFamily;
    this.appBarTheme = appBarTheme;
  }

  /**
   * Create a dark theme
   */
  static dark() {
    return new ThemeData({
      brightness: 'dark',
      primaryColor: '#1F1F1F',
      scaffoldBackgroundColor: '#121212',
      canvasColor: '#1E1E1E',
      cardColor: '#2C2C2C',
      dividerColor: 'rgba(255, 255, 255, 0.12)',
      unselectedWidgetColor: 'rgba(255, 255, 255, 0.70)'
    });
  }

  /**
   * Create a light theme
   */
  static light() {
    return new ThemeData({
      brightness: 'light',
      primaryColor: '#2196F3',
      scaffoldBackgroundColor: '#FAFAFA',
      canvasColor: '#FFF',
      cardColor: '#FFF'
    });
  }
}

// ============================================================================
// ROUTE & NAVIGATION
// ============================================================================

class Route {
  constructor({ name = '/', builder = null, settings = {} } = {}) {
    this.name = name;
    this.builder = builder;
    this.settings = settings;
  }
}

class Navigator {
  constructor({ routes = {}, initialRoute = '/', onGenerateRoute = null, onUnknownRoute = null } = {}) {
    this.routes = routes;
    this.initialRoute = initialRoute;
    this.onGenerateRoute = onGenerateRoute;
    this.onUnknownRoute = onUnknownRoute;
    this.routeStack = [];
    this.currentRoute = initialRoute;
  }

  /**
   * Navigate to a named route
   */
  pushNamed(routeName, { arguments: args = null } = {}) {
    this.currentRoute = routeName;
    this.routeStack.push(routeName);
  }

  /**
   * Go back
   */
  pop() {
    if (this.routeStack.length > 1) {
      this.routeStack.pop();
      this.currentRoute = this.routeStack[this.routeStack.length - 1];
      return true;
    }
    return false;
  }

  /**
   * Get current page widget
   */
  getCurrentPage(context) {
    const routeName = this.currentRoute;

    if (this.routes[routeName]) {
      return this.routes[routeName](context);
    }

    if (this.onGenerateRoute) {
      const routeSettings = { name: routeName };
      const route = this.onGenerateRoute(routeSettings);
      if (route) return route.builder(context);
    }

    if (this.onUnknownRoute) {
      const routeSettings = { name: routeName };
      const route = this.onUnknownRoute(routeSettings);
      return route.builder(context);
    }

    return null;
  }
}

// ============================================================================
// MATERIAL APP
// ============================================================================

class MaterialApp extends StatelessWidget {
  constructor({
    key = null,
    title = '',
    theme = null,
    darkTheme = null,
    themeMode = 'system',
    home = null,
    routes = {},
    initialRoute = '/',
    onGenerateRoute = null,
    onUnknownRoute = null,
    navigatorObservers = [],
    localizationsDelegates = [],
    supportedLocales = [{ language: 'en' }],
    locale = null,
    builder = null,
    color = null
  } = {}) {
    super(key);

    this.title = title;
    this.theme = theme || ThemeData.light();
    this.darkTheme = darkTheme || ThemeData.dark();
    this.themeMode = themeMode;
    this.color = color;
    this.home = home;
    this.routes = routes;
    this.initialRoute = initialRoute;
    this.onGenerateRoute = onGenerateRoute;
    this.onUnknownRoute = onUnknownRoute;
    this.navigatorObservers = navigatorObservers;
    this.localizationsDelegates = localizationsDelegates;
    this.supportedLocales = supportedLocales;
    this.locale = locale;
    this.builder = builder;

    // Initialize navigator
    this.navigator = new Navigator({
      routes: this.routes,
      initialRoute: this.initialRoute,
      onGenerateRoute: this.onGenerateRoute,
      onUnknownRoute: this.onUnknownRoute
    });

    // Add home to routes if provided
    if (this.home) {
      this.navigator.routes['/'] = (context) => this.home;
    }

    // Set page title
    if (typeof document !== 'undefined') {
      document.title = this.title;
    }
  }

  /**
   * Get current theme based on themeMode
   */
  _getTheme() {
    if (this.themeMode === 'dark') {
      return this.darkTheme;
    }
    if (this.themeMode === 'light') {
      return this.theme;
    }
    // system mode - detect from OS
    if (typeof window !== 'undefined' && window.matchMedia) {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDark ? this.darkTheme : this.theme;
    }
    return this.theme;
  }

  /**
   * Apply theme to document
   */
  _applyTheme(theme) {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--accent-color', theme.accentColor);
    root.style.setProperty('--scaffold-bg', theme.scaffoldBackgroundColor);
    root.style.setProperty('--card-color', theme.cardColor);
    root.style.setProperty('--divider-color', theme.dividerColor);
    root.style.setProperty('--font-family', theme.fontFamily);
    root.style.setProperty('--text-color', 
      theme.brightness === 'dark' ? '#FFF' : '#000');

    // Apply body background
    document.body.style.backgroundColor = theme.scaffoldBackgroundColor;
    document.body.style.fontFamily = theme.fontFamily;
    document.body.style.color = theme.brightness === 'dark' ? '#FFF' : '#000';
  }

  build(context) {
    const currentTheme = this._getTheme();
    this._applyTheme(currentTheme);

    // Get current page
    let pageWidget = this.navigator.getCurrentPage(context);

    if (!pageWidget) {
      pageWidget = this._buildErrorPage();
    }

    // Build page element
    const pageElement = pageWidget.createElement?.(context.element, context.element.runtime) || pageWidget;
    if (pageElement.mount) {
      pageElement.mount(context.element);
    }

    let pageVNode = pageElement.performRebuild?.() || null;

    // Wrap with builder if provided
    if (this.builder) {
      const wrappedWidget = this.builder(context, pageWidget);
      if (wrappedWidget) {
        pageVNode = wrappedWidget;
      }
    }

    // Root container with theme
    return new VNode({
      tag: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          backgroundColor: currentTheme.scaffoldBackgroundColor,
          color: currentTheme.brightness === 'dark' ? '#FFF' : '#000',
          fontFamily: currentTheme.fontFamily,
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
          minHeight: '100vh'
        },
        'data-app': 'MaterialApp',
        'data-theme': currentTheme.brightness
      },
      children: pageVNode ? [pageVNode] : []
    });
  }

  /**
   * Build error page when no route found
   */
  _buildErrorPage() {
    return new StatelessWidget({
      build: (context) => {
        return new VNode({
          tag: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100vh',
              flexDirection: 'column'
            }
          },
          children: [
            new VNode({
              tag: 'h1',
              props: { style: { color: '#d32f2f' } },
              children: ['404: Page Not Found']
            }),
            new VNode({
              tag: 'p',
              props: { style: { color: '#666' } },
              children: [`Route: ${this.navigator.currentRoute}`]
            })
          ]
        });
      }
    });
  }

  createElement(parent, runtime) {
    return new MaterialAppElement(this,parent, runtime);
  }
}

class MaterialAppElement extends Element {
  performRebuild() {
    return this.widget.build(this.context);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  MaterialApp,
  MaterialAppElement,
  ThemeData,
  Navigator,
  Route
};