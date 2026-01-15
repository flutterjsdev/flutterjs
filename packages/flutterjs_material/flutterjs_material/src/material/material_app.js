/**
 * ============================================================================
 * FIXED MaterialApp - Properly Handles StatefulWidget → State Connection
 * ============================================================================
 */

import { StatelessWidget, ErrorWidget, StatefulWidget, State } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { StatefulElement, StatelessElement, InheritedWidget } from '@flutterjs/runtime';
import { Navigator, Route } from '../widgets/navigator.js';

// ============================================================================
// THEME DATA
// ============================================================================

import { ColorScheme } from './color_scheme.js';

class ThemeData {
  constructor({
    brightness = 'light',
    primaryColor = '#2196F3',
    primarySwatch = null,
    colorScheme = null,
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
    // console.log('🎨 ThemeData constructor called', { primaryColor, primarySwatch });
    this.brightness = brightness;

    // Legacy support
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

    // ColorScheme support
    if (colorScheme) {
      this.colorScheme = colorScheme;
      // Sync legacy properties if not explicitly provided
      if (!primaryColor) this.primaryColor = colorScheme.primary;
      if (!scaffoldBackgroundColor) this.scaffoldBackgroundColor = colorScheme.background;
      if (!cardColor) this.cardColor = colorScheme.surface;
    } else {
      // Create default color scheme based on brightness and primary color
      this.colorScheme = brightness === 'dark'
        ? ColorScheme.dark()
        : ColorScheme.light();

      // Override primary if provided
      if (primaryColor && primaryColor !== '#2196F3') { // Check if different from default
        this.colorScheme = ColorScheme.fromSeed({
          seedColor: primaryColor,
          brightness: brightness
        });
      }
    }

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
      colorScheme: ColorScheme.dark(),
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
      colorScheme: ColorScheme.light(),
      primaryColor: '#2196F3',
      scaffoldBackgroundColor: '#FAFAFA',
      canvasColor: '#FFF',
      cardColor: '#FFF'
    });
  }
}

// ============================================================================
// THEME INHERITED WIDGET
// ============================================================================

class Theme extends InheritedWidget {
  constructor({ data, child, key } = {}) {
    super({ child, key });
    this.data = data;
  }

  updateShouldNotify(oldWidget) {
    return this.data !== oldWidget.data;
  }

  static of(context) {
    if (!context || !context.dependOnInheritedWidgetOfExactType) {
      console.warn('Theme.of() called with invalid context');
      return new ThemeData();
    }
    const widget = context.dependOnInheritedWidgetOfExactType(Theme);
    return widget ? widget.data : new ThemeData();
  }
}

// ============================================================================
// MATERIAL APP - FIXED VERSION
// ============================================================================

class MaterialApp extends StatefulWidget {
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

    // Deep linking support: If in browser, use current URL as initial route
    if (typeof window !== 'undefined' && window.location && window.location.pathname) {
      if (initialRoute === '/' && window.location.pathname !== '/') {
        this.initialRoute = window.location.pathname;
      }
    }

    // Normalize routes
    if (this.home && !this.routes['/']) {
      this.routes['/'] = (context) => this.home;
    }

    if (typeof document !== 'undefined') {
      document.title = this.title;
    }
  }

  createState() {
    return new MaterialAppState();
  }
}

class MaterialAppState extends State {
  _getTheme() {
    const wm = this.widget;
    if (wm.themeMode === 'dark') {
      return wm.darkTheme;
    }
    if (wm.themeMode === 'light') {
      return wm.theme;
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDark ? wm.darkTheme : wm.theme;
    }
    return wm.theme;
  }

  _applyTheme(theme) {
    if (typeof document === 'undefined') return;

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

    // ✅ Ensure full screen layout
    root.style.height = '100%';
    root.style.width = '100%';
    root.style.margin = '0';
    root.style.padding = '0';

    document.body.style.height = '100%';
    document.body.style.width = '100%';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden'; // Prevent body scroll, Scaffold handles it
  }

  build(context) {
    const currentTheme = this._getTheme();
    this._applyTheme(currentTheme);

    return new Theme({
      data: currentTheme,
      child: new Navigator({
        initialRoute: this.widget.initialRoute,
        routes: this.widget.routes,
        onGenerateRoute: this.widget.onGenerateRoute,
        onUnknownRoute: this.widget.onUnknownRoute
      })
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
  Route,
  Theme
};