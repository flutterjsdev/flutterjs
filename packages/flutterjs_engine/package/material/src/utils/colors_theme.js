import { Color } from '../material/color.js';

/**
 * Material Design 3 Color Theme System
 * Defines all colors used throughout the Material Design system
 * Follows Flutter Material Design 3 specification
 * 
 * Flutter Reference: https://api.flutter.dev/flutter/material/Colors-class.html
 */
export class ColorsTheme {
  constructor() {
    // ========== PRIMARY COLOR SYSTEM ==========
    this.primary = '#6750A4';
    this.onPrimary = '#FFFFFF';
    this.primaryContainer = '#EADDFF';
    this.onPrimaryContainer = '#21005E';
    
    // ========== SECONDARY COLOR SYSTEM ==========
    this.secondary = '#625B71';
    this.onSecondary = '#FFFFFF';
    this.secondaryContainer = '#E8DEF8';
    this.onSecondaryContainer = '#1D192B';
    
    // ========== TERTIARY COLOR SYSTEM ==========
    this.tertiary = '#7D5260';
    this.onTertiary = '#FFFFFF';
    this.tertiaryContainer = '#FFD8E4';
    this.onTertiaryContainer = '#31111D';
    
    // ========== ERROR COLOR SYSTEM ==========
    this.error = '#B3261E';
    this.onError = '#FFFFFF';
    this.errorContainer = '#F9DEDC';
    this.onErrorContainer = '#410E0B';
    
    // ========== NEUTRAL COLOR SYSTEM ==========
    this.background = '#FFFBFE';
    this.onBackground = '#1C1B1F';
    this.surface = '#FFFBFE';
    this.onSurface = '#1C1B1F';
    this.surfaceVariant = '#E7E0EC';
    this.onSurfaceVariant = '#49454E';
    this.outline = '#79747E';
    this.outlineVariant = '#CAC7D0';
    this.scrim = '#000000';
    
    // ========== INVERSE COLORS ==========
    this.inverseSurface = '#313033';
    this.inverseOnSurface = '#F4EFF4';
    this.inversePrimary = '#D0BCFF';
    
    // ========== SHADOW COLOR ==========
    this.shadow = '#000000';
  }

  /**
   * Create a light theme color scheme
   * @param {Object} config - Color overrides
   * @returns {ColorsTheme} Light theme instance
   * 
   * @example
   * const lightTheme = ColorsTheme.light({
   *   primary: '#FF6B6B'
   * });
   */
  static light(config = {}) {
    const colors = new ColorsTheme();
    return Object.assign(colors, config);
  }

  /**
   * Create a dark theme color scheme
   * @param {Object} config - Color overrides
   * @returns {ColorsTheme} Dark theme instance
   * 
   * @example
   * const darkTheme = ColorsTheme.dark({
   *   primary: '#D0BCFF'
   * });
   */
  static dark(config = {}) {
    const colors = new ColorsTheme();
    const darkConfig = {
      // Primary (inverted for dark)
      primary: '#D0BCFF',
      onPrimary: '#371E55',
      primaryContainer: '#4F378B',
      onPrimaryContainer: '#EADDFF',
      
      // Secondary (inverted for dark)
      secondary: '#CCC7D8',
      onSecondary: '#332D41',
      secondaryContainer: '#4A4458',
      onSecondaryContainer: '#E8DEF8',
      
      // Tertiary (inverted for dark)
      tertiary: '#FFB8C8',
      onTertiary: '#492532',
      tertiaryContainer: '#633B48',
      onTertiaryContainer: '#FFD8E4',
      
      // Error (stays similar)
      error: '#F2B8B5',
      onError: '#601410',
      errorContainer: '#8C1D18',
      onErrorContainer: '#F9DEDC',
      
      // Neutral (inverted)
      background: '#1C1B1F',
      onBackground: '#E7E1E6',
      surface: '#1C1B1F',
      onSurface: '#E7E1E6',
      surfaceVariant: '#49454E',
      onSurfaceVariant: '#CAC7D0',
      outline: '#938F99',
      outlineVariant: '#49454E',
      
      // Inverse
      inverseSurface: '#E7E1E6',
      inverseOnSurface: '#313033',
      inversePrimary: '#6750A4',
      
      ...config
    };
    
    return Object.assign(colors, darkConfig);
  }

  /**
   * Create high contrast theme
   * @param {Object} config - Color overrides
   * @returns {ColorsTheme} High contrast theme instance
   */
  static highContrast(config = {}) {
    const colors = new ColorsTheme();
    const highContrastConfig = {
      primary: '#000000',
      onPrimary: '#FFFFFF',
      primaryContainer: '#000000',
      onPrimaryContainer: '#FFFFFF',
      
      secondary: '#000000',
      onSecondary: '#FFFFFF',
      secondaryContainer: '#000000',
      onSecondaryContainer: '#FFFFFF',
      
      tertiary: '#000000',
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#000000',
      onTertiaryContainer: '#FFFFFF',
      
      error: '#990000',
      onError: '#FFFFFF',
      errorContainer: '#990000',
      onErrorContainer: '#FFFFFF',
      
      background: '#FFFFFF',
      onBackground: '#000000',
      surface: '#FFFFFF',
      onSurface: '#000000',
      surfaceVariant: '#FFFFFF',
      onSurfaceVariant: '#000000',
      outline: '#000000',
      outlineVariant: '#000000',
      
      ...config
    };
    
    return Object.assign(colors, highContrastConfig);
  }

  /**
   * Create custom theme from primary color
   * Generates complementary colors automatically
   * @param {string} primaryColor - Primary hex color
   * @param {Object} config - Additional overrides
   * @returns {ColorsTheme} Custom theme instance
   * 
   * @example
   * const customTheme = ColorsTheme.fromPrimary('#FF6B6B');
   */
  static fromPrimary(primaryColor, config = {}) {
    const colors = new ColorsTheme();
    const color = new Color(primaryColor);
    
    return Object.assign(colors, {
      primary: primaryColor,
      onPrimary: '#FFFFFF',
      primaryContainer: `${primaryColor}20`, // 20% opacity
      onPrimaryContainer: '#1C1B1F',
      ...config
    });
  }

  /**
   * Get color by name
   * @param {string} name - Color name
   * @returns {string} Hex color value
   * 
   * @example
   * theme.getColor('primary') // '#6750A4'
   */
  getColor(name) {
    return this[name] ?? null;
  }

  /**
   * Get all colors as object
   * @returns {Object} All theme colors
   */
  getAllColors() {
    return {
      // Primary
      primary: this.primary,
      onPrimary: this.onPrimary,
      primaryContainer: this.primaryContainer,
      onPrimaryContainer: this.onPrimaryContainer,
      
      // Secondary
      secondary: this.secondary,
      onSecondary: this.onSecondary,
      secondaryContainer: this.secondaryContainer,
      onSecondaryContainer: this.onSecondaryContainer,
      
      // Tertiary
      tertiary: this.tertiary,
      onTertiary: this.onTertiary,
      tertiaryContainer: this.tertiaryContainer,
      onTertiaryContainer: this.onTertiaryContainer,
      
      // Error
      error: this.error,
      onError: this.onError,
      errorContainer: this.errorContainer,
      onErrorContainer: this.onErrorContainer,
      
      // Neutral
      background: this.background,
      onBackground: this.onBackground,
      surface: this.surface,
      onSurface: this.onSurface,
      surfaceVariant: this.surfaceVariant,
      onSurfaceVariant: this.onSurfaceVariant,
      outline: this.outline,
      outlineVariant: this.outlineVariant,
      
      // Inverse
      inverseSurface: this.inverseSurface,
      inverseOnSurface: this.inverseOnSurface,
      inversePrimary: this.inversePrimary,
      
      // Shadow
      shadow: this.shadow,
      scrim: this.scrim
    };
  }

  /**
   * Generate CSS variables for all colors
   * @returns {string} CSS variable declarations
   * 
   * @example
   * const css = theme.toCSSVariables();
   * // Output: --color-primary: #6750A4; ...
   */
  toCSSVariables() {
    const colors = this.getAllColors();
    let css = ':root {\n';
    
    for (const [name, value] of Object.entries(colors)) {
      const cssVarName = `--color-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      css += `  ${cssVarName}: ${value};\n`;
    }
    
    css += '}';
    return css;
  }

  /**
   * Get color with opacity applied
   * @param {string} colorName - Name of color
   * @param {number} opacity - Opacity value (0.0 to 1.0)
   * @returns {string} RGBA color value
   * 
   * @example
   * theme.withOpacity('primary', 0.5) // 'rgba(103, 80, 164, 0.5)'
   */
  withOpacity(colorName, opacity) {
    const hex = this.getColor(colorName);
    if (!hex) return null;
    
    const color = new Color(hex);
    const r = color.red;
    const g = color.green;
    const b = color.blue;
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  /**
   * Copy this theme with updated colors
   * @param {Object} colors - Colors to override
   * @returns {ColorsTheme} New theme instance
   */
  copyWith(colors = {}) {
    return Object.assign(new ColorsTheme(), this, colors);
  }

  /**
   * Merge with another color theme
   * @param {ColorsTheme} other - Theme to merge with
   * @returns {ColorsTheme} Merged theme
   */
  merge(other) {
    if (!other) return this;
    return this.copyWith(other.getAllColors());
  }

  toString() {
    return `ColorsTheme(primary: ${this.primary}, secondary: ${this.secondary})`;
  }
}