// ============================================
// COMPLETE THEME SYSTEM FOR FLUTTERJS
// ============================================

// ============================================
// 1. THEME CONTEXT (Global Theme Access)
// ============================================

export class ThemeContext {
  static instance = null;
  static listeners = [];

  constructor(themeData) {
    this.theme = themeData;
    ThemeContext.instance = this;
  }

  static getInstance() {
    if (!ThemeContext.instance) {
      ThemeContext.instance = new ThemeContext(new ThemeData());
    }
    return ThemeContext.instance;
  }

  static setTheme(themeData) {
    ThemeContext.instance = new ThemeContext(themeData);
    this.notifyListeners();
  }

  static getTheme() {
    return this.getInstance().theme;
  }

  static subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  static notifyListeners() {
    this.listeners.forEach(listener => listener(this.getTheme()));
  }
}

// ============================================
// 2. THEME DATA (Material Design 3 System)
// ============================================

export class ThemeData {
  constructor(config = {}) {
    // ===== COLORS =====
    this.primary = config.primary || '#6750A4';
    this.onPrimary = config.onPrimary || '#FFFFFF';
    this.primaryContainer = config.primaryContainer || '#EADDFF';
    this.onPrimaryContainer = config.onPrimaryContainer || '#21005E';

    this.secondary = config.secondary || '#625B71';
    this.onSecondary = config.onSecondary || '#FFFFFF';
    this.secondaryContainer = config.secondaryContainer || '#E8DEF8';
    this.onSecondaryContainer = config.onSecondaryContainer || '#1D192B';

    this.tertiary = config.tertiary || '#7D5260';
    this.onTertiary = config.onTertiary || '#FFFFFF';
    this.tertiaryContainer = config.tertiaryContainer || '#FFD8E4';
    this.onTertiaryContainer = config.onTertiaryContainer || '#31111D';

    this.error = config.error || '#B3261E';
    this.onError = config.onError || '#FFFFFF';
    this.errorContainer = config.errorContainer || '#F9DEDC';
    this.onErrorContainer = config.onErrorContainer || '#410E0B';

    this.background = config.background || '#FFFBFE';
    this.onBackground = config.onBackground || '#1C1B1F';
    this.surface = config.surface || '#FFFBFE';
    this.onSurface = config.onSurface || '#1C1B1F';
    this.surfaceVariant = config.surfaceVariant || '#E7E0EC';
    this.onSurfaceVariant = config.onSurfaceVariant || '#49454E';

    this.outline = config.outline || '#79747E';
    this.outlineVariant = config.outlineVariant || '#CAC7D0';
    this.scrim = config.scrim || '#000000';

    // ===== TYPOGRAPHY =====
    this.textTheme = new TextTheme(config.textTheme || {});

    // ===== COMPONENT THEMES =====
    this.buttonTheme = new ButtonThemeData(this, config.buttonTheme || {});
    this.textFieldTheme = new TextFieldThemeData(this, config.textFieldTheme || {});
    this.cardTheme = new CardThemeData(this, config.cardTheme || {});
    this.appBarTheme = new AppBarThemeData(this, config.appBarTheme || {});
    this.chipTheme = new ChipThemeData(this, config.chipTheme || {});
    this.dialogTheme = new DialogThemeData(this, config.dialogTheme || {});

    // ===== SIZING =====
    this.borderRadius = config.borderRadius || 4;
    this.elevation = config.elevation || 0;

    // ===== SPACING =====
    this.spacing = {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48
    };

    // ===== BRIGHTNESS =====
    this.brightness = config.brightness || 'light';
    this.isDark = config.brightness === 'dark';
  }

  /**
   * Create a dark theme variant
   */
  static dark(config = {}) {
    return new ThemeData({
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
      background: '#1C1B1F',
      onBackground: '#E7E1E6',
      surface: '#1C1B1F',
      onSurface: '#E7E1E6',
      surfaceVariant: '#49454E',
      onSurfaceVariant: '#CAC7D0',
      outline: '#938F99',
      ...config
    });
  }

  /**
   * Create a high contrast theme
   */
  static highContrast(config = {}) {
    return new ThemeData({
      primary: '#000000',
      onPrimary: '#FFFFFF',
      secondary: '#000000',
      onSecondary: '#FFFFFF',
      background: '#FFFFFF',
      onBackground: '#000000',
      surface: '#FFFFFF',
      onSurface: '#000000',
      outline: '#000000',
      ...config
    });
  }

  /**
   * Generate CSS variables from theme
   */
  generateCSSVariables() {
    return `
      :root {
        /* Primary Colors */
        --color-primary: ${this.primary};
        --color-on-primary: ${this.onPrimary};
        --color-primary-container: ${this.primaryContainer};
        --color-on-primary-container: ${this.onPrimaryContainer};
        
        /* Secondary Colors */
        --color-secondary: ${this.secondary};
        --color-on-secondary: ${this.onSecondary};
        --color-secondary-container: ${this.secondaryContainer};
        --color-on-secondary-container: ${this.onSecondaryContainer};
        
        /* Tertiary Colors */
        --color-tertiary: ${this.tertiary};
        --color-on-tertiary: ${this.onTertiary};
        --color-tertiary-container: ${this.tertiaryContainer};
        --color-on-tertiary-container: ${this.onTertiaryContainer};
        
        /* Error Colors */
        --color-error: ${this.error};
        --color-on-error: ${this.onError};
        --color-error-container: ${this.errorContainer};
        --color-on-error-container: ${this.onErrorContainer};
        
        /* Background & Surface */
        --color-background: ${this.background};
        --color-on-background: ${this.onBackground};
        --color-surface: ${this.surface};
        --color-on-surface: ${this.onSurface};
        --color-surface-variant: ${this.surfaceVariant};
        --color-on-surface-variant: ${this.onSurfaceVariant};
        
        /* Outline */
        --color-outline: ${this.outline};
        --color-outline-variant: ${this.outlineVariant};
        
        /* Spacing */
        --space-xs: 4px;
        --space-sm: 8px;
        --space-md: 16px;
        --space-lg: 24px;
        --space-xl: 32px;
        --space-xxl: 48px;
        
        /* Border Radius */
        --border-radius: ${this.borderRadius}px;
        
        /* Typography */
        --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
    `;
  }
}

// ============================================
// 3. TEXT THEME (Typography System)
// ============================================

export class TextTheme {
  constructor(config = {}) {
    // Material Design 3 Text Scale
    this.displayLarge = new TextStyle(config.displayLarge || {
      fontSize: 57,
      fontWeight: 400,
      lineHeight: 64,
      letterSpacing: 0
    });

    this.displayMedium = new TextStyle(config.displayMedium || {
      fontSize: 45,
      fontWeight: 400,
      lineHeight: 52,
      letterSpacing: 0
    });

    this.displaySmall = new TextStyle(config.displaySmall || {
      fontSize: 36,
      fontWeight: 400,
      lineHeight: 44,
      letterSpacing: 0
    });

    this.headlineLarge = new TextStyle(config.headlineLarge || {
      fontSize: 32,
      fontWeight: 700,
      lineHeight: 40,
      letterSpacing: 0
    });

    this.headlineMedium = new TextStyle(config.headlineMedium || {
      fontSize: 28,
      fontWeight: 700,
      lineHeight: 36,
      letterSpacing: 0
    });

    this.headlineSmall = new TextStyle(config.headlineSmall || {
      fontSize: 24,
      fontWeight: 700,
      lineHeight: 32,
      letterSpacing: 0
    });

    this.titleLarge = new TextStyle(config.titleLarge || {
      fontSize: 22,
      fontWeight: 700,
      lineHeight: 28,
      letterSpacing: 0
    });

    this.titleMedium = new TextStyle(config.titleMedium || {
      fontSize: 16,
      fontWeight: 700,
      lineHeight: 24,
      letterSpacing: 0.15
    });

    this.titleSmall = new TextStyle(config.titleSmall || {
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 20,
      letterSpacing: 0.1
    });

    this.bodyLarge = new TextStyle(config.bodyLarge || {
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 24,
      letterSpacing: 0.15
    });

    this.bodyMedium = new TextStyle(config.bodyMedium || {
      fontSize: 14,
      fontWeight: 400,
      lineHeight: 20,
      letterSpacing: 0.25
    });

    this.bodySmall = new TextStyle(config.bodySmall || {
      fontSize: 12,
      fontWeight: 400,
      lineHeight: 16,
      letterSpacing: 0.4
    });

    this.labelLarge = new TextStyle(config.labelLarge || {
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 20,
      letterSpacing: 0.1
    });

    this.labelMedium = new TextStyle(config.labelMedium || {
      fontSize: 12,
      fontWeight: 700,
      lineHeight: 16,
      letterSpacing: 0.5
    });

    this.labelSmall = new TextStyle(config.labelSmall || {
      fontSize: 11,
      fontWeight: 700,
      lineHeight: 16,
      letterSpacing: 0.5
    });
  }
}

// ============================================
// 4. TEXT STYLE (Individual Text Styling)
// ============================================

export class TextStyle {
  constructor(config = {}) {
    this.fontSize = config.fontSize || 14;
    this.fontWeight = config.fontWeight || 400;
    this.lineHeight = config.lineHeight || this.fontSize * 1.4;
    this.letterSpacing = config.letterSpacing || 0;
    this.color = config.color || 'inherit';
    this.fontFamily = config.fontFamily || 'inherit';
    this.textDecoration = config.textDecoration || 'none';
    this.fontStyle = config.fontStyle || 'normal';
  }

  toCSSObject() {
    return {
      fontSize: `${this.fontSize}px`,
      fontWeight: this.fontWeight,
      lineHeight: `${this.lineHeight}px`,
      letterSpacing: `${this.letterSpacing}px`,
      color: this.color,
      fontFamily: this.fontFamily,
      textDecoration: this.textDecoration,
      fontStyle: this.fontStyle
    };
  }

  merge(other) {
    return new TextStyle({
      fontSize: other.fontSize ?? this.fontSize,
      fontWeight: other.fontWeight ?? this.fontWeight,
      lineHeight: other.lineHeight ?? this.lineHeight,
      letterSpacing: other.letterSpacing ?? this.letterSpacing,
      color: other.color ?? this.color,
      fontFamily: other.fontFamily ?? this.fontFamily,
      textDecoration: other.textDecoration ?? this.textDecoration,
      fontStyle: other.fontStyle ?? this.fontStyle
    });
  }

  copyWith(config) {
    return this.merge(config);
  }
}

// ============================================
// 5. BUTTON THEME
// ============================================

export class ButtonThemeData {
  constructor(themeData, config = {}) {
    // ELEVATED BUTTON
    this.elevatedButtonStyle = {
      backgroundColor: config.elevatedButtonBackground || themeData.primary,
      foregroundColor: config.elevatedButtonForeground || themeData.onPrimary,
      padding: config.elevatedButtonPadding || '10px 24px',
      borderRadius: config.elevatedButtonRadius || `${themeData.borderRadius}px`,
      fontSize: '14px',
      fontWeight: '500',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      transition: 'all 0.2s ease'
    };

    // TEXT BUTTON
    this.textButtonStyle = {
      backgroundColor: 'transparent',
      foregroundColor: config.textButtonForeground || themeData.primary,
      padding: config.textButtonPadding || '10px 12px',
      borderRadius: config.textButtonRadius || `${themeData.borderRadius}px`,
      fontSize: '14px',
      fontWeight: '500',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    };

    // OUTLINED BUTTON
    this.outlinedButtonStyle = {
      backgroundColor: 'transparent',
      foregroundColor: config.outlinedButtonForeground || themeData.primary,
      padding: config.outlinedButtonPadding || '9px 23px',
      borderRadius: config.outlinedButtonRadius || `${themeData.borderRadius}px`,
      fontSize: '14px',
      fontWeight: '500',
      border: `1px solid ${config.outlinedButtonBorder || themeData.outline}`,
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    };

    // HOVER STATES
    this.elevatedHover = {
      boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
      transform: 'translateY(-2px)'
    };

    this.textHover = {
      backgroundColor: `rgba(103, 80, 164, 0.08)`
    };

    this.outlinedHover = {
      backgroundColor: `rgba(103, 80, 164, 0.08)`
    };

    // DISABLED STATES
    this.disabledStyle = {
      opacity: 0.38,
      cursor: 'not-allowed',
      pointerEvents: 'none'
    };
  }
}

// ============================================
// 6. TEXT FIELD THEME
// ============================================

export class TextFieldThemeData {
  constructor(themeData, config = {}) {
    this.inputStyle = {
      padding: config.padding || '12px 16px',
      fontSize: '14px',
      fontFamily: 'inherit',
      border: `1px solid ${config.borderColor || themeData.outline}`,
      borderRadius: config.borderRadius || `${themeData.borderRadius}px`,
      backgroundColor: config.backgroundColor || themeData.surfaceVariant,
      color: config.textColor || themeData.onSurface,
      transition: 'all 0.2s ease',
      width: '100%',
      boxSizing: 'border-box'
    };

    this.focusStyle = {
      outline: 'none',
      borderColor: config.focusBorderColor || themeData.primary,
      backgroundColor: config.focusBackgroundColor || themeData.surface,
      boxShadow: `0 0 0 3px ${themeData.primary}20`
    };

    this.hoverStyle = {
      borderColor: config.hoverBorderColor || themeData.onSurfaceVariant
    };

    this.errorStyle = {
      borderColor: config.errorBorderColor || themeData.error,
      backgroundColor: config.errorBackgroundColor || themeData.errorContainer
    };

    this.disabledStyle = {
      backgroundColor: config.disabledBackground || themeData.surfaceVariant,
      color: config.disabledColor || themeData.onSurfaceVariant,
      cursor: 'not-allowed',
      opacity: 0.5
    };

    this.labelStyle = {
      fontSize: '12px',
      fontWeight: '500',
      color: config.labelColor || themeData.onSurfaceVariant,
      marginBottom: '4px',
      display: 'block'
    };

    this.helperTextStyle = {
      fontSize: '12px',
      color: config.helperColor || themeData.onSurfaceVariant,
      marginTop: '4px'
    };

    this.errorTextStyle = {
      fontSize: '12px',
      color: config.errorColor || themeData.error,
      marginTop: '4px'
    };
  }
}

// ============================================
// 7. CARD THEME
// ============================================

export class CardThemeData {
  constructor(themeData, config = {}) {
    this.backgroundColor = config.backgroundColor || themeData.surface;
    this.borderRadius = config.borderRadius || `${themeData.borderRadius + 8}px`;
    this.padding = config.padding || '16px';
    this.boxShadow = config.boxShadow || '0 2px 4px rgba(0,0,0,0.1)';
    this.elevation = config.elevation || 1;
    this.hoverShadow = config.hoverShadow || '0 4px 8px rgba(0,0,0,0.15)';
    this.borderColor = config.borderColor || 'transparent';
    this.borderWidth = config.borderWidth || '0px';
  }
}

// ============================================
// 8. APP BAR THEME
// ============================================

export class AppBarThemeData {
  constructor(themeData, config = {}) {
    this.backgroundColor = config.backgroundColor || themeData.primary;
    this.foregroundColor = config.foregroundColor || themeData.onPrimary;
    this.elevation = config.elevation || 4;
    this.height = config.height || 64;
    this.padding = config.padding || '0 16px';
    this.titleStyle = new TextStyle({
      fontSize: 20,
      fontWeight: 700,
      color: config.foregroundColor || themeData.onPrimary
    });
    this.iconColor = config.iconColor || themeData.onPrimary;
  }
}

// ============================================
// 9. CHIP THEME
// ============================================

export class ChipThemeData {
  constructor(themeData, config = {}) {
    this.backgroundColor = config.backgroundColor || themeData.secondaryContainer;
    this.foregroundColor = config.foregroundColor || themeData.onSecondaryContainer;
    this.padding = config.padding || '8px 16px';
    this.borderRadius = config.borderRadius || '16px';
    this.fontSize = '12px';
    this.fontWeight = '500';
    this.border = `1px solid ${config.borderColor || themeData.outline}`;
  }
}

// ============================================
// 10. DIALOG THEME
// ============================================

export class DialogThemeData {
  constructor(themeData, config = {}) {
    this.backgroundColor = config.backgroundColor || themeData.surface;
    this.scrimColor = config.scrimColor || 'rgba(0,0,0,0.32)';
    this.borderRadius = config.borderRadius || `${themeData.borderRadius + 8}px`;
    this.elevation = config.elevation || 24;
    this.titleStyle = new TextStyle({
      fontSize: 24,
      fontWeight: 700,
      color: config.titleColor || themeData.onSurface
    });
    this.bodyStyle = new TextStyle({
      fontSize: 14,
      fontWeight: 400,
      color: config.bodyColor || themeData.onSurface
    });
  }
}

// ============================================
// 11. THEME PROVIDER
// ============================================

export class ThemeProvider extends StatefulWidget {
  constructor({ theme, child } = {}) {
    super({ theme, child });
    this.theme = theme || new ThemeData();
    this.child = child;
  }

  createState() {
    return new _ThemeProviderState(this.theme);
  }
}

class _ThemeProviderState extends State {
  constructor(theme) {
    super();
    this.theme = theme;
  }

  initState() {
    ThemeContext.setTheme(this.theme);
  }

  build(context) {
    return this.props.child;
  }
}

// ============================================
// 12. HOOKS FOR THEME ACCESS
// ============================================

export function useTheme() {
  return ThemeContext.getTheme();
}

export function useTextTheme() {
  return ThemeContext.getTheme().textTheme;
}

export function useButtonTheme() {
  return ThemeContext.getTheme().buttonTheme;
}

// ============================================
// 13. UPDATED WIDGETS WITH THEMING
// ============================================

export class ElevatedButton extends StatelessWidget {
  constructor({ child, onPressed, style } = {}) {
    super({ child, onPressed, style });
    this.child = child;
    this.onPressed = onPressed;
    this.style = style;
  }

  build(context) {
    const theme = useTheme();
    const buttonTheme = theme.buttonTheme;

    const baseStyle = { ...buttonTheme.elevatedButtonStyle };
    if (this.style) Object.assign(baseStyle, this.style);

    return new VNode('button', {
      style: baseStyle,
      onClick: this.onPressed,
      onMouseEnter: (e) => {
        Object.assign(e.target.style, buttonTheme.elevatedHover);
      },
      onMouseLeave: (e) => {
        Object.assign(e.target.style, {
          boxShadow: baseStyle.boxShadow,
          transform: 'translateY(0)'
        });
      }
    }, [this.child]);
  }
}

export class TextButton extends StatelessWidget {
  constructor({ child, onPressed, style } = {}) {
    super({ child, onPressed, style });
    this.child = child;
    this.onPressed = onPressed;
    this.style = style;
  }

  build(context) {
    const theme = useTheme();
    const buttonTheme = theme.buttonTheme;

    const baseStyle = { ...buttonTheme.textButtonStyle };
    if (this.style) Object.assign(baseStyle, this.style);

    return new VNode('button', {
      style: baseStyle,
      onClick: this.onPressed,
      onMouseEnter: (e) => {
        Object.assign(e.target.style, buttonTheme.textHover);
      },
      onMouseLeave: (e) => {
        Object.assign(e.target.style, { backgroundColor: 'transparent' });
      }
    }, [this.child]);
  }
}

export class OutlinedButton extends StatelessWidget {
  constructor({ child, onPressed, style } = {}) {
    super({ child, onPressed, style });
    this.child = child;
    this.onPressed = onPressed;
    this.style = style;
  }

  build(context) {
    const theme = useTheme();
    const buttonTheme = theme.buttonTheme;

    const baseStyle = { ...buttonTheme.outlinedButtonStyle };
    if (this.style) Object.assign(baseStyle, this.style);

    return new VNode('button', {
      style: baseStyle,
      onClick: this.onPressed,
      onMouseEnter: (e) => {
        Object.assign(e.target.style, buttonTheme.outlinedHover);
      },
      onMouseLeave: (e) => {
        Object.assign(e.target.style, { backgroundColor: 'transparent' });
      }
    }, [this.child]);
  }
}

export class TextField extends StatefulWidget {
  constructor({ label, onChanged, error, disabled, value } = {}) {
    super({ label, onChanged, error, disabled, value });
    this.label = label;
    this.onChanged = onChanged;
    this.error = error;
    this.disabled = disabled;
    this.value = value;
  }

  createState() {
    return new _TextFieldState();
  }
}

class _TextFieldState extends State {
  constructor() {
    super();
    this.value = '';
    this.isFocused = false;
  }

  build(context) {
    const theme = useTheme();
    const fieldTheme = theme.textFieldTheme;

    const inputStyle = { ...fieldTheme.inputStyle };
    if (this.isFocused) Object.assign(inputStyle, fieldTheme.focusStyle);
    if (this.props.error) Object.assign(inputStyle, fieldTheme.errorStyle);
    if (this.props.disabled) Object.assign(inputStyle, fieldTheme.disabledStyle);

    return new VNode('div', {}, [
      new VNode('label', {
        style: fieldTheme.labelStyle
      }, [this.props.label]),

      new VNode('input', {
        style: inputStyle,
        type: 'text',
        value: this.value,
        disabled: this.props.disabled,
        onFocus: () => this.setState({ isFocused: true }),
        onBlur: () => this.setState({ isFocused: false }),
        onChange: (e) => {
          this.setState({ value: e.target.value });
          this.props.onChanged?.(e.target.value);
        }
      }),

      this.props.error 
        ? new VNode('span', { style: fieldTheme.errorTextStyle }, [this.props.error])
        : null
    ]);
  }
}

export class Card extends StatelessWidget {
  constructor({ child, style } = {}) {
    super({ child, style });
    this.child = child;
    this.style = style;
  }

  build(context) {
    const theme = useTheme();
    const cardTheme = theme.cardTheme;

    const cardStyle = {
      backgroundColor: cardTheme.backgroundColor,
      borderRadius: cardTheme.borderRadius,
      padding: cardTheme.padding,
      boxShadow: cardTheme.boxShadow,
      border: `${cardTheme.borderWidth} solid ${cardTheme.borderColor}`,
      transition: 'box-shadow 0.2s ease',
      ...this.style
    };

    return new VNode('div', {
      style: cardStyle,
      onMouseEnter: (e) => {
        e.currentTarget.style.boxShadow = cardTheme.hoverShadow;
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.boxShadow = cardTheme.boxShadow;
      }
    }, [this.child]);
  }
}

export class AppBar extends StatelessWidget {
  constructor({ title, backgroundColor } = {}) {
    super({ title, backgroundColor });
    this.title = title;
    this.backgroundColor = backgroundColor;
  }

  build(context) {
    const theme = useTheme();
    const appBarTheme = theme.appBarTheme;

    const style = {
      backgroundColor: this.backgroundColor || appBarTheme.backgroundColor,
      color: appBarTheme.foregroundColor,
      padding: appBarTheme.padding,
      height: `${appBarTheme.height}px`,
      display: 'flex',
      alignItems: 'center',
      boxShadow: `0 ${appBarTheme.elevation}px ${appBarTheme.elevation * 2}px rgba(0,0,0,0.1)`,
      ...appBarTheme.titleStyle.toCSSObject()
    };

    return new VNode('div', { style }, [this.title]);
  }
}

export class Chip extends StatelessWidget {
  constructor({ label, onPressed } = {}) {
    super({ label, onPressed });
    this.label = label;
    this.onPressed = onPressed;
  }

  build(context) {
    const theme = useTheme();
    const chipTheme = theme.chipTheme;

    const style = {
      backgroundColor: chipTheme.backgroundColor,
      color: chipTheme.foregroundColor,
      padding: chipTheme.padding,
      borderRadius: chipTheme.borderRadius,
      fontSize: chipTheme.fontSize,
      fontWeight: chipTheme.fontWeight,
      border: chipTheme.border,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'inline-block'
    };

    return new VNode('button', {
      style,
      onClick: this.onPressed,
      onMouseEnter: (e) => {
        e.target.style.backgroundColor = theme.primary;
        e.target.style.color = theme.onPrimary;
      },
      onMouseLeave: (e) => {
        e.target.style.backgroundColor = chipTheme.backgroundColor;
        e.target.style.color = chipTheme.foregroundColor;
      }
    }, [this.label]);
  }
}

// ============================================
// 14. COMPLETE EXAMPLE
// ============================================

export class ThemedApp extends StatelessWidget {
  build(context) {
    const customTheme = new ThemeData({
      primary: '#FF6B6B',
      secondary: '#4ECDC4',
      error: '#FF6B6B',
      background: '#F7F7F7'
    });

    return new ThemeProvider({
      theme: customTheme,
      child: new Column({
        children: [
          new AppBar({ title: 'Themed App' }),

          new Container({
            padding: 16,
            child: new Column({
              children: [
                new Text('Themed Buttons:', {
                  style: { fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }
                }),

                new Row({
                  children: [
                    new ElevatedButton({
                      child: new Text('Elevated'),
                      onPressed: () => alert('Elevated clicked!')
                    }),

                    new TextButton({
                      child: new Text('Text'),
                      onPressed: () => alert('Text clicked!')
                    }),

                    new OutlinedButton({
                      child: new Text('Outlined'),
                      onPressed: () => alert('Outlined clicked!')
                    })
                  ]
                }),

                new Container({ height: 16 }),

                new Text('Input Fields:', {
                  style: { fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }
                }),

                new TextField({
                  label: 'Enter name',
                  onChanged: (value) => console.log('Name:', value)
                }),

                new TextField({
                  label: 'Password',
                  error: 'Password too short',
                  onChanged: (value) => console.log('Password:', value)
                }),

                new Container({ height: 16 }),

                new Text('Cards:', {
                  style: { fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }
                }),

                new Card({
                  child: new Column({
                    children: [
                      new Text('Card Title', {
                        style: { fontSize: '16px', fontWeight: 'bold' }
                      }),
                      new Container({ height: 8 }),
                      new Text('This is a themed card with consistent styling.')
                    ]
                  })
                }),

                new Container({ height: 16 }),

                new Text('Chips:', {
                  style: { fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }
                }),

                new Row({
                  children: [
                    new Chip({
                      label: 'Flutter',
                      onPressed: () => console.log('Flutter chip')
                    }),
                    new Chip({
                      label: 'JavaScript',
                      onPressed: () => console.log('JS chip')
                    }),
                    new Chip({
                      label: 'Theming',
                      onPressed: () => console.log('Theme chip')
                    })
                  ]
                })
              ]
            })
          })
        ]
      })
    });
  }
}

// ============================================
// 15. USAGE IN YOUR APP
// ============================================

/*
// Step 1: Create your theme
const appTheme = new ThemeData({
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  tertiary: '#95E1D3',
  error: '#FF6B6B',
  background: '#F7F7F7'
});

// Step 2: Wrap your app with ThemeProvider
export class MyApp extends StatelessWidget {
  build(context) {
    return new ThemeProvider({
      theme: appTheme,
      child: new Column({
        children: [
          new AppBar({ title: 'My App' }),
          new HomePage()
        ]
      })
    });
  }
}

// Step 3: Use themed widgets
export class HomePage extends StatelessWidget {
  build(context) {
    return new Container({
      padding: 16,
      child: new Column({
        children: [
          new Card({
            child: new Column({
              children: [
                new Text('Welcome!'),
                new ElevatedButton({
                  child: new Text('Get Started'),
                  onPressed: () => alert('Started!')
                })
              ]
            })
          })
        ]
      })
    });
  }
}

// Step 4: Access theme anywhere
export class CustomWidget extends StatelessWidget {
  build(context) {
    const theme = useTheme();
    const textTheme = useTextTheme();

    return new Text('Themed text', {
      style: {
        color: theme.primary,
        fontSize: textTheme.bodyLarge.fontSize
      }
    });
  }
}
*/

// ============================================
// 16. GLOBAL CSS GENERATION
// ============================================

export function generateGlobalCSS(theme) {
  return `
    ${theme.generateCSSVariables()}

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      background-color: var(--color-background);
      color: var(--color-on-background);
      font-family: var(--font-family);
    }

    /* Buttons */
    .flutter-elevated-button {
      background-color: var(--color-primary);
      color: var(--color-on-primary);
      padding: 10px 24px;
      border: none;
      border-radius: var(--border-radius);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .flutter-elevated-button:hover {
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
      transform: translateY(-2px);
    }

    .flutter-elevated-button:active {
      transform: translateY(0);
    }

    .flutter-text-button {
      background-color: transparent;
      color: var(--color-primary);
      border: none;
      padding: 10px 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .flutter-text-button:hover {
      background-color: rgba(103, 80, 164, 0.08);
    }

    .flutter-outlined-button {
      background-color: transparent;
      color: var(--color-primary);
      border: 1px solid var(--color-outline);
      padding: 9px 23px;
      border-radius: var(--border-radius);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .flutter-outlined-button:hover {
      background-color: rgba(103, 80, 164, 0.08);
    }

    /* Text Fields */
    .flutter-text-field {
      padding: 12px 16px;
      border: 1px solid var(--color-outline);
      border-radius: var(--border-radius);
      background-color: var(--color-surface-variant);
      color: var(--color-on-surface);
      font-family: var(--font-family);
      width: 100%;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .flutter-text-field:focus {
      outline: none;
      border-color: var(--color-primary);
      background-color: var(--color-surface);
      box-shadow: 0 0 0 3px rgba(103, 80, 164, 0.1);
    }

    .flutter-text-field:disabled {
      background-color: var(--color-surface-variant);
      color: var(--color-on-surface-variant);
      cursor: not-allowed;
      opacity: 0.5;
    }

    /* Cards */
    .flutter-card {
      background-color: var(--color-surface);
      border-radius: 12px;
      padding: var(--space-md);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: box-shadow 0.2s ease;
    }

    .flutter-card:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    /* App Bar */
    .flutter-appbar {
      background-color: var(--color-primary);
      color: var(--color-on-primary);
      padding: 0 var(--space-md);
      height: 64px;
      display: flex;
      align-items: center;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    /* Text Styles */
    .display-large {
      font-size: 57px;
      font-weight: 400;
      line-height: 64px;
    }

    .headline-large {
      font-size: 32px;
      font-weight: 700;
      line-height: 40px;
    }

    .headline-medium {
      font-size: 28px;
      font-weight: 700;
      line-height: 36px;
    }

    .title-large {
      font-size: 22px;
      font-weight: 700;
      line-height: 28px;
    }

    .body-large {
      font-size: 16px;
      font-weight: 400;
      line-height: 24px;
    }

    .body-medium {
      font-size: 14px;
      font-weight: 400;
      line-height: 20px;
    }

    .label-large {
      font-size: 14px;
      font-weight: 700;
      line-height: 20px;
    }

    /* Chips */
    .flutter-chip {
      background-color: var(--color-secondary-container);
      color: var(--color-on-secondary-container);
      padding: 8px 16px;
      border: 1px solid var(--color-outline);
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-block;
    }

    .flutter-chip:hover {
      background-color: var(--color-primary);
      color: var(--color-on-primary);
    }

    /* Containers */
    .flutter-container {
      display: flex;
      flex-direction: column;
    }

    .flutter-column {
      display: flex;
      flex-direction: column;
    }

    .flutter-row {
      display: flex;
      flex-direction: row;
      gap: 8px;
    }

    .flutter-center {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    /* Dividers */
    .flutter-divider {
      border: none;
      border-top: 1px solid var(--color-outline-variant);
      margin: var(--space-md) 0;
    }

    /* Responsive */
    @media (max-width: 600px) {
      .flutter-appbar {
        height: 56px;
        padding: 0 var(--space-sm);
      }

      .flutter-card {
        border-radius: 8px;
      }
    }
  `;
}

// ============================================
// 17. THEME FACTORY (Predefined Themes)
// ============================================

export class ThemeFactory {
  static material3Light() {
    return new ThemeData({
      brightness: 'light',
      primary: '#6750A4',
      secondary: '#625B71',
      tertiary: '#7D5260'
    });
  }

  static material3Dark() {
    return ThemeData.dark();
  }

  static material3HighContrast() {
    return ThemeData.highContrast();
  }

  static custom(primaryColor, secondaryColor) {
    return new ThemeData({
      primary: primaryColor,
      secondary: secondaryColor,
      primaryContainer: primaryColor + '20',
      onPrimaryContainer: primaryColor
    });
  }

  static ocean() {
    return new ThemeData({
      primary: '#006994',
      secondary: '#0086C9',
      tertiary: '#0099D8',
      background: '#F0F7FF'
    });
  }

  static forest() {
    return new ThemeData({
      primary: '#1B5E20',
      secondary: '#2E7D32',
      tertiary: '#388E3C',
      background: '#F1F8E9'
    });
  }

  static sunset() {
    return new ThemeData({
      primary: '#E85D04',
      secondary: '#FB8500',
      tertiary: '#FFB703',
      background: '#FFF8E1'
    });
  }

  static lavender() {
    return new ThemeData({
      primary: '#9C27B0',
      secondary: '#BA68C8',
      tertiary: '#E1BEE7',
      background: '#F3E5F5'
    });
  }
}

// ============================================
// 18. THEME SWITCHER WIDGET
// ============================================

export class ThemeSwitcher extends StatefulWidget {
  constructor({ onThemeChanged } = {}) {
    super({ onThemeChanged });
    this.onThemeChanged = onThemeChanged;
  }

  createState() {
    return new _ThemeSwitcherState();
  }
}

class _ThemeSwitcherState extends State {
  constructor() {
    super();
    this.currentTheme = 'material3Light';
  }

  getTheme(name) {
    const themes = {
      'material3Light': ThemeFactory.material3Light(),
      'material3Dark': ThemeFactory.material3Dark(),
      'ocean': ThemeFactory.ocean(),
      'forest': ThemeFactory.forest(),
      'sunset': ThemeFactory.sunset(),
      'lavender': ThemeFactory.lavender()
    };
    return themes[name];
  }

  build(context) {
    return new Row({
      children: [
        new Chip({
          label: 'Light',
          onPressed: () => {
            this.setState({ currentTheme: 'material3Light' });
            ThemeContext.setTheme(this.getTheme('material3Light'));
            this.props.onThemeChanged?.(this.getTheme('material3Light'));
          }
        }),
        new Chip({
          label: 'Dark',
          onPressed: () => {
            this.setState({ currentTheme: 'material3Dark' });
            ThemeContext.setTheme(this.getTheme('material3Dark'));
            this.props.onThemeChanged?.(this.getTheme('material3Dark'));
          }
        }),
        new Chip({
          label: 'Ocean',
          onPressed: () => {
            this.setState({ currentTheme: 'ocean' });
            ThemeContext.setTheme(this.getTheme('ocean'));
            this.props.onThemeChanged?.(this.getTheme('ocean'));
          }
        })
      ]
    });
  }
}

// ============================================
// EXPORT ALL
// ============================================

export default {
  ThemeContext,
  ThemeData,
  TextTheme,
  TextStyle,
  ButtonThemeData,
  TextFieldThemeData,
  CardThemeData,
  AppBarThemeData,
  ChipThemeData,
  DialogThemeData,
  ThemeProvider,
  useTheme,
  useTextTheme,
  useButtonTheme,
  ElevatedButton,
  TextButton,
  OutlinedButton,
  TextField,
  Card,
  AppBar,
  Chip,
  ThemedApp,
  generateGlobalCSS,
  ThemeFactory,
  ThemeSwitcher
};