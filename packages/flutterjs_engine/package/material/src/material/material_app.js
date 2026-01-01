import { StatelessWidget } from '../core/widget_element.js';
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

  pushNamed(routeName, { arguments: args = null } = {}) {
    this.currentRoute = routeName;
    this.routeStack.push(routeName);
  }

  pop() {
    if (this.routeStack.length > 1) {
      this.routeStack.pop();
      this.currentRoute = this.routeStack[this.routeStack.length - 1];
      return true;
    }
    return false;
  }

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
// MATERIAL APP - FIXED
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

    this.navigator = new Navigator({
      routes: this.routes,
      initialRoute: this.initialRoute,
      onGenerateRoute: this.onGenerateRoute,
      onUnknownRoute: this.onUnknownRoute
    });

    if (this.home) {
      this.navigator.routes['/'] = (context) => this.home;
    }

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

    document.body.style.backgroundColor = theme.scaffoldBackgroundColor;
    document.body.style.fontFamily = theme.fontFamily;
    document.body.style.color = theme.brightness === 'dark' ? '#FFF' : '#000';
  }

  build(context) {
    console.log('🔍 MaterialApp.build() START');
    
    const currentTheme = this._getTheme();
    this._applyTheme(currentTheme);

    // ✅ Get current page widget
    let pageWidget = this.navigator.getCurrentPage(context);
    console.log('📄 Current page widget:', pageWidget?.constructor?.name);

    if (!pageWidget) {
      console.warn('⚠️ No page widget found, using error page');
      pageWidget = this._buildErrorPage();
    }

    // ✅ FIX: Build the page widget RECURSIVELY
    // Don't manually create elements - let the build system handle it
    let pageVNode = null;

    if (pageWidget) {
      // Check if pageWidget is already a VNode
      if (pageWidget.tag !== undefined) {
        console.log('✅ pageWidget is already a VNode');
        pageVNode = pageWidget;
      }
      // Check if pageWidget is a Widget
      else if (typeof pageWidget.build === 'function') {
        console.log('🔄 pageWidget is a Widget, building recursively:', pageWidget.constructor.name);
        try {
          pageVNode = pageWidget.build(context);
          console.log('✅ pageWidget.build() returned:', {
            type: typeof pageVNode,
            hasTag: pageVNode?.tag !== undefined,
            constructor: pageVNode?.constructor?.name
          });
        } catch (error) {
          console.error('❌ Error building pageWidget:', error);
          pageVNode = this._buildErrorVNode(`Error: ${error.message}`);
        }
      }
      // If it's a string or number, convert to VNode
      else if (typeof pageWidget === 'string' || typeof pageWidget === 'number') {
        console.log('📝 pageWidget is text:', pageWidget);
        pageVNode = new VNode({
          tag: 'p',
          props: {},
          children: [String(pageWidget)]
        });
      }
      else {
        console.error('❌ Unknown pageWidget type:', pageWidget?.constructor?.name);
        pageVNode = this._buildErrorVNode('Unknown page widget type');
      }
    }

    // ✅ Wrap with builder if provided
    if (this.builder && pageVNode) {
      console.log('🎁 Applying builder wrapper');
      const wrappedWidget = this.builder(context, pageWidget);
      if (wrappedWidget) {
        pageVNode = wrappedWidget;
      }
    }

    // ✅ Return root container with theme - MUST be a VNode
    const result = new VNode({
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

    console.log('✅ MaterialApp.build() returning VNode with tag:', result.tag);
    return result;
  }

  /**
   * Build error page when no route found
   */
  _buildErrorPage() {
    return new StatelessWidget({
      build: (context) => {
        return this._buildErrorVNode(`Route not found: ${this.navigator.currentRoute}`);
      }
    });
  }

  /**
   * Build error VNode
   */
  _buildErrorVNode(message) {
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
          children: ['Error']
        }),
        new VNode({
          tag: 'p',
          props: { style: { color: '#666' } },
          children: [message]
        })
      ]
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  MaterialApp,
  ThemeData,
  Navigator,
  Route
};