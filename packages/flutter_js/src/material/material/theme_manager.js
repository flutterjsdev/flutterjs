export class ThemeManager {
  constructor(config = {}) {
    this.lightTheme = config.theme || this.defaultTheme();
    this.darkTheme = config.darkTheme || this.defaultDarkTheme();
    this.highContrastTheme = config.highContrastTheme || this.defaultHighContrastTheme();
    this.highContrastDarkTheme = config.highContrastDarkTheme || this.defaultHighContrastDarkTheme();
    
    this.themeMode = config.themeMode || 'system'; // 'light' | 'dark' | 'system'
    this.themeAnimationDuration = config.themeAnimationDuration || 200;
    this.themeAnimationCurve = config.themeAnimationCurve || 'ease-in-out';
    
    this.listeners = [];
    this.currentTheme = this.resolveTheme();
    this.isHighContrast = this.detectHighContrast();
    
    this.setupSystemObserver();
  }

  // Default Material 3 light theme
  defaultTheme() {
    return {
      brightness: 'light',
      primary: '#6750A4',
      onPrimary: '#FFFFFF',
      primaryContainer: '#EADDFF',
      onPrimaryContainer: '#21005E',
      secondary: '#625B71',
      onSecondary: '#FFFFFF',
      secondaryContainer: '#E8DEF8',
      onSecondaryContainer: '#1D192B',
      tertiary: '#7D5260',
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#FFD8E4',
      onTertiaryContainer: '#31111D',
      error: '#B3261E',
      onError: '#FFFFFF',
      errorContainer: '#F9DEDC',
      onErrorContainer: '#410E0B',
      background: '#FFFBFE',
      onBackground: '#1C1B1F',
      surface: '#FFFBFE',
      onSurface: '#1C1B1F',
      outline: '#79747E',
      outlineVariant: '#CAC7D0',
      scrim: '#000000',
    };
  }

  // Default Material 3 dark theme
  defaultDarkTheme() {
    return {
      brightness: 'dark',
      primary: '#D0BCFF',
      onPrimary: '#371E55',
      primaryContainer: '#4F378B',
      onPrimaryContainer: '#EADDFF',
      secondary: '#CCC7D8',
      onSecondary: '#332D41',
      secondaryContainer: '#4A4458',
      onSecondaryContainer: '#E8DEF8',
      tertiary: '#FFB8C8',
      onTertiary: '#492532',
      tertiaryContainer: '#633B48',
      onTertiaryContainer: '#FFD8E4',
      error: '#F2B8B5',
      onError: '#601410',
      errorContainer: '#8C1D18',
      onErrorContainer: '#F9DEDC',
      background: '#1C1B1F',
      onBackground: '#E7E1E6',
      surface: '#1C1B1F',
      onSurface: '#E7E1E6',
      outline: '#938F99',
      outlineVariant: '#49454E',
      scrim: '#000000',
    };
  }

  // High contrast light theme
  defaultHighContrastTheme() {
    const theme = this.defaultTheme();
    return {
      ...theme,
      primary: '#21005E',
      onPrimary: '#FFFFFF',
      secondary: '#1D192B',
      onSecondary: '#FFFFFF',
      outline: '#1C1B1F',
    };
  }

  // High contrast dark theme
  defaultHighContrastDarkTheme() {
    const theme = this.defaultDarkTheme();
    return {
      ...theme,
      primary: '#F6EDFF',
      onPrimary: '#000000',
      secondary: '#F6EDFF',
      onSecondary: '#000000',
      outline: '#F4EFF4',
    };
  }

  // Subscribe to theme changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify listeners
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentTheme));
  }

  // Detect system dark mode preference
  detectSystemBrightness() {
    if (typeof window === 'undefined') return 'light';
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    return prefersDark.matches ? 'dark' : 'light';
  }

  // Detect high contrast preference
  detectHighContrast() {
    if (typeof window === 'undefined') return false;
    
    return window.matchMedia('(prefers-contrast: more)').matches;
  }

  // Setup system theme observer
  setupSystemObserver() {
    if (typeof window === 'undefined') return;

    // Listen for dark mode changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.themeMode === 'system') {
        this.currentTheme = this.resolveTheme();
        this.applyTheme();
        this.notifyListeners();
      }
    });

    // Listen for high contrast changes
    window.matchMedia('(prefers-contrast: more)').addEventListener('change', (e) => {
      this.isHighContrast = e.matches;
      this.currentTheme = this.resolveTheme();
      this.applyTheme();
      this.notifyListeners();
    });
  }

  // Resolve which theme to use
  resolveTheme() {
    let brightness = this.themeMode;
    
    if (this.themeMode === 'system') {
      brightness = this.detectSystemBrightness();
    }

    // Select theme based on brightness and high contrast
    if (this.isHighContrast) {
      return brightness === 'dark' 
        ? this.highContrastDarkTheme 
        : this.highContrastTheme;
    }

    return brightness === 'dark' 
      ? this.darkTheme 
      : this.lightTheme;
  }

  // Apply theme to DOM
  applyTheme() {
    const theme = this.currentTheme;
    const root = document.documentElement;

    // Set CSS variables
    Object.entries(theme).forEach(([key, value]) => {
      if (typeof value === 'string' && value.startsWith('#')) {
        root.style.setProperty(`--md-sys-color-${this.camelToKebab(key)}`, value);
      }
    });
  }

  // Convert camelCase to kebab-case
  camelToKebab(str) {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  }

  // Change theme mode
  setThemeMode(mode) {
    if (!['light', 'dark', 'system'].includes(mode)) {
      console.warn(`Invalid theme mode: ${mode}`);
      return;
    }

    this.themeMode = mode;
    this.currentTheme = this.resolveTheme();
    this.applyTheme();
    this.notifyListeners();
  }

  // Get current theme
  getTheme() {
    return this.currentTheme;
  }

  // Get current brightness
  getBrightness() {
    return this.currentTheme.brightness;
  }

  // Generate theme CSS
  generateThemeCSS() {
    const theme = this.currentTheme;
    const cssVars = Object.entries(theme)
      .filter(([_, value]) => typeof value === 'string' && value.startsWith('#'))
      .map(([key, value]) => `--md-sys-color-${this.camelToKebab(key)}: ${value};`)
      .join('\n  ');

    return `
      :root {
        ${cssVars}
        --theme-animation-duration: ${this.themeAnimationDuration}ms;
        --theme-animation-curve: ${this.themeAnimationCurve};
      }
      
      * {
        transition: background-color var(--theme-animation-duration) var(--theme-animation-curve),
                    color var(--theme-animation-duration) var(--theme-animation-curve),
                    border-color var(--theme-animation-duration) var(--theme-animation-curve);
      }
    `;
  }
}