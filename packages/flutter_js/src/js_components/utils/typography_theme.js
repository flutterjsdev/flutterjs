import { TextStyle } from './text_style.js';

/**
 * Material Design 3 Typography System
 * Defines 13 text styles following Material Design 3 scale
 * Follows Flutter Material Design 3 specification
 * 
 * Flutter Reference: https://api.flutter.dev/flutter/material/TextTheme-class.html
 */
export class TypographyTheme {
  constructor({
    fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    displayLarge,
    displayMedium,
    displaySmall,
    headlineLarge,
    headlineMedium,
    headlineSmall,
    titleLarge,
    titleMedium,
    titleSmall,
    bodyLarge,
    bodyMedium,
    bodySmall,
    labelLarge,
    labelMedium,
    labelSmall
  } = {}) {
    this.fontFamily = fontFamily;

    // ========== DISPLAY STYLES (Large headlines) ==========
    // Used for: Large prominent text
    this.displayLarge = displayLarge || new TextStyle({
      fontSize: 57,
      fontWeight: 400,
      lineHeight: 64,
      letterSpacing: 0,
      fontFamily: this.fontFamily
    });

    this.displayMedium = displayMedium || new TextStyle({
      fontSize: 45,
      fontWeight: 400,
      lineHeight: 52,
      letterSpacing: 0,
      fontFamily: this.fontFamily
    });

    this.displaySmall = displaySmall || new TextStyle({
      fontSize: 36,
      fontWeight: 400,
      lineHeight: 44,
      letterSpacing: 0,
      fontFamily: this.fontFamily
    });

    // ========== HEADLINE STYLES (Section headlines) ==========
    // Used for: Page titles, section headers
    this.headlineLarge = headlineLarge || new TextStyle({
      fontSize: 32,
      fontWeight: 700,
      lineHeight: 40,
      letterSpacing: 0,
      fontFamily: this.fontFamily
    });

    this.headlineMedium = headlineMedium || new TextStyle({
      fontSize: 28,
      fontWeight: 700,
      lineHeight: 36,
      letterSpacing: 0,
      fontFamily: this.fontFamily
    });

    this.headlineSmall = headlineSmall || new TextStyle({
      fontSize: 24,
      fontWeight: 700,
      lineHeight: 32,
      letterSpacing: 0,
      fontFamily: this.fontFamily
    });

    // ========== TITLE STYLES (Emphasis text) ==========
    // Used for: Card titles, dialog titles
    this.titleLarge = titleLarge || new TextStyle({
      fontSize: 22,
      fontWeight: 700,
      lineHeight: 28,
      letterSpacing: 0,
      fontFamily: this.fontFamily
    });

    this.titleMedium = titleMedium || new TextStyle({
      fontSize: 16,
      fontWeight: 700,
      lineHeight: 24,
      letterSpacing: 0.15,
      fontFamily: this.fontFamily
    });

    this.titleSmall = titleSmall || new TextStyle({
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 20,
      letterSpacing: 0.1,
      fontFamily: this.fontFamily
    });

    // ========== BODY STYLES (Main text) ==========
    // Used for: Body text, descriptions
    this.bodyLarge = bodyLarge || new TextStyle({
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 24,
      letterSpacing: 0.15,
      fontFamily: this.fontFamily
    });

    this.bodyMedium = bodyMedium || new TextStyle({
      fontSize: 14,
      fontWeight: 400,
      lineHeight: 20,
      letterSpacing: 0.25,
      fontFamily: this.fontFamily
    });

    this.bodySmall = bodySmall || new TextStyle({
      fontSize: 12,
      fontWeight: 400,
      lineHeight: 16,
      letterSpacing: 0.4,
      fontFamily: this.fontFamily
    });

    // ========== LABEL STYLES (Small emphasis) ==========
    // Used for: Buttons, chips, tags
    this.labelLarge = labelLarge || new TextStyle({
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 20,
      letterSpacing: 0.1,
      fontFamily: this.fontFamily
    });

    this.labelMedium = labelMedium || new TextStyle({
      fontSize: 12,
      fontWeight: 700,
      lineHeight: 16,
      letterSpacing: 0.5,
      fontFamily: this.fontFamily
    });

    this.labelSmall = labelSmall || new TextStyle({
      fontSize: 11,
      fontWeight: 700,
      lineHeight: 16,
      letterSpacing: 0.5,
      fontFamily: this.fontFamily
    });
  }

  /**
   * Get text style by name
   * @param {string} styleName - Name of the style
   * @returns {TextStyle} Text style instance
   * 
   * @example
   * const style = theme.getStyle('bodyLarge');
   */
  getStyle(styleName) {
    return this[styleName] ?? null;
  }

  /**
   * Get all text styles as object
   * @returns {Object} All text styles
   */
  getAllStyles() {
    return {
      displayLarge: this.displayLarge,
      displayMedium: this.displayMedium,
      displaySmall: this.displaySmall,
      headlineLarge: this.headlineLarge,
      headlineMedium: this.headlineMedium,
      headlineSmall: this.headlineSmall,
      titleLarge: this.titleLarge,
      titleMedium: this.titleMedium,
      titleSmall: this.titleSmall,
      bodyLarge: this.bodyLarge,
      bodyMedium: this.bodyMedium,
      bodySmall: this.bodySmall,
      labelLarge: this.labelLarge,
      labelMedium: this.labelMedium,
      labelSmall: this.labelSmall
    };
  }

  /**
   * Create a compact typography scale (smaller sizes)
   * @param {Object} config - Overrides
   * @returns {TypographyTheme} Compact theme
   * 
   * @example
   * const compact = TypographyTheme.compact();
   */
  static compact(config = {}) {
    return new TypographyTheme({
      displayLarge: new TextStyle({
        fontSize: 45,
        fontWeight: 400,
        lineHeight: 52,
        letterSpacing: 0
      }),
      displayMedium: new TextStyle({
        fontSize: 36,
        fontWeight: 400,
        lineHeight: 44,
        letterSpacing: 0
      }),
      displaySmall: new TextStyle({
        fontSize: 28,
        fontWeight: 400,
        lineHeight: 36,
        letterSpacing: 0
      }),
      headlineLarge: new TextStyle({
        fontSize: 24,
        fontWeight: 700,
        lineHeight: 32,
        letterSpacing: 0
      }),
      headlineMedium: new TextStyle({
        fontSize: 20,
        fontWeight: 700,
        lineHeight: 28,
        letterSpacing: 0
      }),
      headlineSmall: new TextStyle({
        fontSize: 18,
        fontWeight: 700,
        lineHeight: 26,
        letterSpacing: 0
      }),
      ...config
    });
  }

  /**
   * Create an expanded typography scale (larger sizes)
   * @param {Object} config - Overrides
   * @returns {TypographyTheme} Expanded theme
   * 
   * @example
   * const expanded = TypographyTheme.expanded();
   */
  static expanded(config = {}) {
    return new TypographyTheme({
      displayLarge: new TextStyle({
        fontSize: 72,
        fontWeight: 400,
        lineHeight: 80,
        letterSpacing: 0
      }),
      displayMedium: new TextStyle({
        fontSize: 56,
        fontWeight: 400,
        lineHeight: 64,
        letterSpacing: 0
      }),
      displaySmall: new TextStyle({
        fontSize: 44,
        fontWeight: 400,
        lineHeight: 52,
        letterSpacing: 0
      }),
      headlineLarge: new TextStyle({
        fontSize: 40,
        fontWeight: 700,
        lineHeight: 48,
        letterSpacing: 0
      }),
      headlineMedium: new TextStyle({
        fontSize: 36,
        fontWeight: 700,
        lineHeight: 44,
        letterSpacing: 0
      }),
      headlineSmall: new TextStyle({
        fontSize: 32,
        fontWeight: 700,
        lineHeight: 40,
        letterSpacing: 0
      }),
      ...config
    });
  }

  /**
   * Generate CSS variables for all text styles
   * @returns {string} CSS variable declarations
   * 
   * @example
   * const css = theme.toCSSVariables();
   * // Output: --text-display-large: 57px ... ;
   */
  toCSSVariables() {
    let css = ':root {\n';
    const styles = this.getAllStyles();
    
    for (const [name, style] of Object.entries(styles)) {
      const cssVarName = `--text-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      css += `  ${cssVarName}: ${style.fontSize}px/${style.lineHeight}px ${style.fontWeight} ${this.fontFamily};\n`;
      css += `  ${cssVarName}-letter-spacing: ${style.letterSpacing}px;\n`;
    }
    
    css += '}';
    return css;
  }

  /**
   * Generate CSS classes for all text styles
   * @returns {string} CSS class definitions
   * 
   * @example
   * const css = theme.toCSSClasses();
   * // Output: .text-display-large { font-size: 57px; ... }
   */
  toCSSClasses() {
    let css = '';
    const styles = this.getAllStyles();
    
    for (const [name, style] of Object.entries(styles)) {
      const className = `.text-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      const styleObj = style.toCSSObject();
      css += `${className} {\n`;
      for (const [prop, value] of Object.entries(styleObj)) {
        css += `  ${prop}: ${value};\n`;
      }
      css += '}\n\n';
    }
    
    return css;
  }

  /**
   * Apply font family to all styles
   * @param {string} fontFamily - Font family name
   * @returns {TypographyTheme} Updated theme
   */
  withFontFamily(fontFamily) {
    const styles = this.getAllStyles();
    const updatedStyles = {};
    
    for (const [name, style] of Object.entries(styles)) {
      updatedStyles[name] = style.copyWith({ fontFamily });
    }
    
    return new TypographyTheme({
      fontFamily,
      ...updatedStyles
    });
  }

  /**
   * Scale all font sizes by a factor
   * @param {number} factor - Scale factor (1.0 = no change)
   * @returns {TypographyTheme} Scaled theme
   * 
   * @example
   * const scaledTheme = theme.scale(1.2); // 20% larger
   */
  scale(factor) {
    const styles = this.getAllStyles();
    const scaledStyles = {};
    
    for (const [name, style] of Object.entries(styles)) {
      scaledStyles[name] = style.copyWith({
        fontSize: Math.round(style.fontSize * factor),
        lineHeight: Math.round(style.lineHeight * factor)
      });
    }
    
    return new TypographyTheme({
      fontFamily: this.fontFamily,
      ...scaledStyles
    });
  }

  /**
   * Copy theme with updated text styles
   * @param {Object} styles - Styles to override
   * @returns {TypographyTheme} New theme instance
   */
  copyWith(styles = {}) {
    return new TypographyTheme({
      fontFamily: this.fontFamily,
      ...this.getAllStyles(),
      ...styles
    });
  }

  /**
   * Merge with another typography theme
   * @param {TypographyTheme} other - Theme to merge with
   * @returns {TypographyTheme} Merged theme
   */
  merge(other) {
    if (!other) return this;
    return this.copyWith(other.getAllStyles());
  }

  /**
   * Get typography scale information
   * @returns {Object} Scale details
   */
  getScaleInfo() {
    const styles = this.getAllStyles();
    const sizes = {};
    
    for (const [name, style] of Object.entries(styles)) {
      sizes[name] = {
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing
      };
    }
    
    return {
      fontFamily: this.fontFamily,
      scales: sizes,
      totalStyles: Object.keys(sizes).length
    };
  }

  toString() {
    return `TypographyTheme(fontFamily: ${this.fontFamily}, scales: 13)`;
  }
}