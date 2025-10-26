export class LocalizationManager {
  constructor(config = {}) {
    this.supportedLocales = config.supportedLocales || [
      { language: 'en', country: 'US' }
    ];
    this.localizationsDelegates = config.localizationsDelegates || [];
    this.localeListResolutionCallback = config.localeListResolutionCallback;
    this.localeResolutionCallback = config.localeResolutionCallback;
    
    this.currentLocale = this.resolveLocale();
    this.listeners = [];
    this.translations = new Map();
    
    this.loadTranslations();
  }

  // Get system locale
  getSystemLocale() {
    if (typeof navigator === 'undefined') {
      return { language: 'en', country: 'US' };
    }

    const lang = navigator.language || 'en-US';
    const [language, country] = lang.split('-');
    return { language, country };
  }

  // Resolve best matching locale
  resolveLocale() {
    const systemLocale = this.getSystemLocale();

    // Try exact match
    const exact = this.supportedLocales.find(
      l => l.language === systemLocale.language && l.country === systemLocale.country
    );
    if (exact) return exact;

    // Try language-only match
    const langMatch = this.supportedLocales.find(
      l => l.language === systemLocale.language
    );
    if (langMatch) return langMatch;

    // Use custom callback if provided
    if (this.localeResolutionCallback) {
      const resolved = this.localeResolutionCallback(
        [systemLocale],
        this.supportedLocales
      );
      if (resolved) return resolved;
    }

    // Fallback to first supported locale
    return this.supportedLocales[0];
  }

  // Subscribe to locale changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify listeners
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentLocale));
  }

  // Load translations from delegates
  loadTranslations() {
    this.localizationsDelegates.forEach(delegate => {
      const localeKey = `${this.currentLocale.language}-${this.currentLocale.country}`;
      const translations = delegate.getTranslations?.(this.currentLocale);
      
      if (translations) {
        this.translations.set(localeKey, translations);
      }
    });
  }

  // Get translated string
  translate(key, defaultValue = key) {
    const localeKey = `${this.currentLocale.language}-${this.currentLocale.country}`;
    const translations = this.translations.get(localeKey) || {};
    
    return this.getNestedValue(translations, key) || defaultValue;
  }

  // Get nested value from object by dot notation
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Change locale
  setLocale(locale) {
    const found = this.supportedLocales.find(
      l => l.language === locale.language && l.country === locale.country
    );

    if (!found) {
      console.warn(`Locale not supported: ${locale.language}-${locale.country}`);
      return;
    }

    this.currentLocale = locale;
    this.loadTranslations();
    this.notifyListeners();
  }

  // Get current locale
  getLocale() {
    return this.currentLocale;
  }

  // Check if RTL
  isRTL() {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.includes(this.currentLocale.language);
  }

  // Get direction
  getDirection() {
    return this.isRTL() ? 'rtl' : 'ltr';
  }
}
