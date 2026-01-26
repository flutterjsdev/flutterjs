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

    // Inject global styles to ensure full screen layout and Flutter-like Reset
    if (!document.getElementById('fjs-global-style')) {

      // 1. Inject Roboto Font
      const fontLink = document.createElement('link');
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap';
      fontLink.rel = 'stylesheet';
      document.head.appendChild(fontLink);

      // 2. Global CSS Reset & Layout
      const style = document.createElement('style');
      style.id = 'fjs-global-style';
      style.innerHTML = `
            html, body {
                height: 100%;
                width: 100%;
                margin: 0;
                padding: 0;
                overflow: hidden; /* App handles scrolling */
                font-family: Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
                -webkit-tap-highlight-color: transparent; /* Remove mobile tap highlight */
            }
            *, *::before, *::after {
                box-sizing: border-box; /* Flutter uses border-box logic mostly */
            }
            p, h1, h2, h3, h4, h5, h6 {
                margin: 0; /* Flutter text has no default margins */
                padding: 0;
            }
            /* Root App Container (MaterialApp Wrapper) */
            #app, [id^="app-"], body > div:not([id]) {
                height: 100vh;              /* Force exact viewport height */
                width: 100%;
                display: flex;
                flex-direction: column;
                position: relative;     /* Establish positioning context */
                overflow: hidden;       /* Prevent scroll on body/wrapper */
            }

            /* Navigator Stage & Overlay */
            [data-widget="NavigationContainer"] {
                 position: absolute !important;
                 top: 0;
                 left: 0;
                 width: 100%;
                 height: 100%;
                 background-color: #FFFFFF; /* Opaque background hides layers below */
                 overflow-y: auto;          /* Allow scrolling within the page */
                 -webkit-overflow-scrolling: touch;
                 display: block;
                 z-index: 1;
            }
            
            [data-widget="NavigationContainer"][data-active="true"] {
                z-index: 100 !important; /* Force active page on top */
            }
        `;
      document.head.appendChild(style);
    }

    // Set variables
    const root = document.documentElement;
    root.style.setProperty('--primary-color', primary);
    root.style.setProperty('--accent-color', theme.accentColor || '#FF4081');
    root.style.setProperty('--scaffold-bg', background);
    root.style.setProperty('--card-color', surface);
    root.style.setProperty('--divider-color', theme.dividerColor);
    root.style.setProperty('--font-family', theme.fontFamily);
    root.style.setProperty('--text-color', onSurface);

    // MD3 System Colors
    root.style.setProperty('--md-sys-color-primary', primary);
    root.style.setProperty('--md-sys-color-on-primary', onPrimary);
    root.style.setProperty('--md-sys-color-surface', surface);
    root.style.setProperty('--md-sys-color-on-surface', onSurface);
    root.style.setProperty('--md-sys-color-background', background);
    root.style.setProperty('--md-sys-color-on-background', onBackground);
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