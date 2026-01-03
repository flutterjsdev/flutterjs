/**
 * ============================================================================
 * FIXED MaterialApp - Properly Handles StatefulWidget → State Connection
 * ============================================================================
 * 
 * The issue was MaterialApp was calling createState() directly without
 * going through an Element, so state._mount() never got called.
 * 
 * Solution: Use runtime's VNodeBuilder to properly create Elements
 */

import { StatelessWidget, ErrorWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { StatefulElement, StatelessElement } from '@flutterjs/runtime';

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
    console.log('🎨 ThemeData constructor called', { primaryColor, primarySwatch });
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

    // Initialize default TextTheme if not provided
    const isDark = brightness === 'dark';
    const baseColor = isDark ? '#FFFFFF' : '#000000';

    this.textTheme = textTheme || {
      displayLarge: { fontFamily: fontFamily, fontSize: 57, fontWeight: '400', color: baseColor },
      displayMedium: { fontFamily: fontFamily, fontSize: 45, fontWeight: '400', color: baseColor },
      displaySmall: { fontFamily: fontFamily, fontSize: 36, fontWeight: '400', color: baseColor },
      headlineLarge: { fontFamily: fontFamily, fontSize: 32, fontWeight: '400', color: baseColor },
      headlineMedium: { fontFamily: fontFamily, fontSize: 28, fontWeight: '400', color: baseColor },
      headlineSmall: { fontFamily: fontFamily, fontSize: 24, fontWeight: '400', color: baseColor },
      titleLarge: { fontFamily: fontFamily, fontSize: 22, fontWeight: '400', color: baseColor },
      titleMedium: { fontFamily: fontFamily, fontSize: 16, fontWeight: '500', color: baseColor },
      titleSmall: { fontFamily: fontFamily, fontSize: 14, fontWeight: '500', color: baseColor },
      bodyLarge: { fontFamily: fontFamily, fontSize: 16, fontWeight: '400', color: baseColor },
      bodyMedium: { fontFamily: fontFamily, fontSize: 14, fontWeight: '400', color: baseColor },
      bodySmall: { fontFamily: fontFamily, fontSize: 12, fontWeight: '400', color: baseColor },
      labelLarge: { fontFamily: fontFamily, fontSize: 14, fontWeight: '500', color: baseColor },
      labelMedium: { fontFamily: fontFamily, fontSize: 12, fontWeight: '500', color: baseColor },
      labelSmall: { fontFamily: fontFamily, fontSize: 11, fontWeight: '500', color: baseColor },
    };
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
// MATERIAL APP - FIXED VERSION
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
    console.log('🏗️ MaterialApp constructor - theme passed:', theme);
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

    // ✅ ELEMENT CACHE: Store page element to prevent remounting
    this._pageElement = null;
    this._cachedPageWidget = null;

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

  _applyTheme(theme) {
    if (typeof document === 'undefined') return;

    console.log('🖌️ _applyTheme called. Primary:', theme.primaryColor, 'Card:', theme.cardColor);

    // Safeguards for undefined theme properties
    const primary = theme.primaryColor || '#2196F3'; // Default blue
    const surface = theme.cardColor || '#FFFFFF';
    const background = theme.scaffoldBackgroundColor || '#FAFAFA';
    const onPrimary = '#FFFFFF';
    const onSurface = (theme.brightness === 'dark') ? '#FFFFFF' : '#000000';
    const onBackground = (theme.brightness === 'dark') ? '#FFFFFF' : '#000000';

    const root = document.documentElement;
    root.style.setProperty('--primary-color', primary);
    root.style.setProperty('--accent-color', theme.accentColor || '#FF4081');
    root.style.setProperty('--scaffold-bg', background);
    root.style.setProperty('--card-color', surface);
    root.style.setProperty('--divider-color', theme.dividerColor);
    root.style.setProperty('--font-family', theme.fontFamily);
    root.style.setProperty('--text-color', onSurface);

    // MD3 System Colors (Mapped from Legacy Theme with Fallbacks)
    root.style.setProperty('--md-sys-color-primary', primary);
    root.style.setProperty('--md-sys-color-on-primary', onPrimary);
    root.style.setProperty('--md-sys-color-surface', surface);
    root.style.setProperty('--md-sys-color-on-surface', onSurface);
    root.style.setProperty('--md-sys-color-background', background);
    root.style.setProperty('--md-sys-color-on-background', onBackground);

    document.body.style.backgroundColor = background;
    document.body.style.fontFamily = theme.fontFamily;
    document.body.style.color = onSurface;
  }

  /**
   * Check if object is a Widget
   */
  _isWidget(obj) {
    if (!obj || typeof obj !== 'object') return false;
    return (
      typeof obj.build === 'function' ||
      typeof obj.createState === 'function'
    );
  }

  /**
   * ✅ FIXED: Build widget to VNode by REUSING Elements
   * This prevents remounting and preserves state
   */
  _buildWidgetToVNode(widget, context) {
    console.log('🔨 _buildWidgetToVNode called for:', widget?.constructor?.name);

    if (!widget) {
      console.log('  → widget is null, returning null');
      return null;
    }

    // Already a VNode
    if (widget && widget.tag !== undefined) {
      console.log('  → Already a VNode');
      return widget;
    }

    // String or number
    if (typeof widget === 'string' || typeof widget === 'number') {
      console.log('  → String/number, converting');
      return String(widget);
    }

    // Is a Widget - need to build it THROUGH AN ELEMENT
    if (this._isWidget(widget)) {
      console.log('  → Is a Widget, checking if can reuse element...');

      try {
        let element;
        const runtime = context.runtime || context.element?.runtime;
        if (!runtime) {
          throw new Error('Runtime not available in context');
        }

        // ✅ CHECK IF WE CAN REUSE EXISTING ELEMENT
        if (this._pageElement &&
          this._cachedPageWidget &&
          widget.constructor === this._cachedPageWidget.constructor) {
          console.log('♻️ REUSING existing element, calling rebuild()');

          // Update the widget reference (important for props changes)
          this._pageElement.updateWidget(widget);
          this._cachedPageWidget = widget;

          // Rebuild (this calls state.build() on EXISTING state)
          const result = this._pageElement.build();
          console.log('    → Rebuild returned:', result?.tag || typeof result);

          // Recursively build if still a widget
          if (this._isWidget(result)) {
            console.log('    → Result is still a widget, recursing...');
            return this._buildWidgetToVNode(result, { ...context, runtime });
          }

          return result;
        }

        // ✅ StatefulWidget: Create NEW StatefulElement (first time only)
        if (typeof widget.createState === 'function') {
          console.log('🆕 Creating NEW StatefulElement (first mount)');

          // Create StatefulElement
          element = new StatefulElement(widget, null, runtime);
          console.log('    → StatefulElement created');

          // ✅ CRITICAL: Mount the element (this calls state._mount())
          if (!element.mounted) {
            console.log('    → Mounting element...');
            element.mount();
            console.log('    → Element mounted');
            console.log('    → State._widget:', element.state?._widget?.constructor?.name);
            console.log('    → State.widget.title:', element.state?.widget?.title);
          }

          // ✅ CACHE THE ELEMENT
          this._pageElement = element;
          this._cachedPageWidget = widget;

          // Build the element to get VNode
          const result = element.build();
          console.log('    → StatefulElement.build() returned:', result?.tag || typeof result);

          // Recursively build if still a widget
          if (this._isWidget(result)) {
            console.log('    → Result is still a widget, recursing...');
            return this._buildWidgetToVNode(result, { ...context, runtime });
          }

          return result;
        }
        // ✅ StatelessWidget: Create StatelessElement
        else if (typeof widget.build === 'function') {
          console.log('    → StatelessWidget detected, creating StatelessElement');

          element = new StatelessElement(widget, null, runtime);

          if (!element.mounted) {
            element.mount();
          }

          const result = element.build();
          console.log('    → StatelessElement.build() returned:', result?.tag || typeof result);

          // Recursively build if still a widget
          if (this._isWidget(result)) {
            console.log('    → Result is still a widget, recursing...');
            return this._buildWidgetToVNode(result, { ...context, runtime });
          }

          return result;
        }
      } catch (error) {
        console.error('  ❌ Error building widget:', error);
        throw error;
      }
    }

    console.log('  → Unknown type, returning null');
    return null;
  }

  /**
   * ✅ BUILD METHOD
   */
  build(context) {
    console.log('📖 MaterialApp.build() START');

    const currentTheme = this._getTheme();
    this._applyTheme(currentTheme);

    // Get the home widget (e.g., MyHomePage - StatefulWidget)
    let pageWidget = this.navigator.getCurrentPage(context);
    console.log('📄 Current page widget:', pageWidget?.constructor?.name);

    if (!pageWidget) {
      console.warn('⚠️ No page widget found');
      pageWidget = this._buildEmptyPage();
    }

    // ✅ BUILD the page widget to a VNode (properly through Element)
    let pageVNode;
    try {
      pageVNode = this._buildWidgetToVNode(pageWidget, context);
      console.log('✅ pageVNode after building:', pageVNode?.tag || typeof pageVNode);
    } catch (error) {
      console.error('❌ Failed to build page widget:', error);
      pageVNode = this._buildErrorPageVNode(error, context);
    }

    if (!pageVNode) {
      console.error('❌ pageVNode is null');
      pageVNode = this._buildEmptyPageVNode();
    }

    // Wrap with theme container and return VNode
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
      children: [pageVNode]
    });

    console.log('✅ MaterialApp.build() returning VNode');
    return result;
  }

  /**
   * Empty widget
   */
  _buildEmptyPage() {
    return new StatelessWidget({
      build: () => this._buildEmptyPageVNode()
    });
  }

  /*
   * Error page VNode
   */
  _buildErrorPageVNode(error, context) {
    const errorWidget = new ErrorWidget({
      message: `Application Error:\n${error?.message || error?.toString() || 'Unknown error'}`,
      error: error
    });

    // Create element and build
    const runtime = context?.runtime || context?.element?.runtime;
    const element = new StatelessElement(errorWidget, null, runtime);
    if (!element.mounted) element.mount();
    return element.build();
  }

  /**
   * Empty page VNode
   */
  _buildEmptyPageVNode() {
    return new VNode({
      tag: 'div',
      props: { style: { padding: '20px', textAlign: 'center' } },
      children: ['No page configured']
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