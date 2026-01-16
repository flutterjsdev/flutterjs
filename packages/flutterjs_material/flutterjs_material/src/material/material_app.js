/**
 * ============================================================================
 * FIXED MaterialApp - Properly Handles StatefulWidget → State Connection
 * ============================================================================
 */

import { StatefulWidget, State } from '../core/widget_element.js';
import { Navigator } from '../widgets/navigator.js';
import { ThemeData } from './theme_data.js';
import { Theme } from './theme.js';

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
  MaterialApp
};