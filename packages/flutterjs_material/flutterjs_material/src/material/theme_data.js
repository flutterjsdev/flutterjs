import { ColorScheme } from './color_scheme.js';
import { CheckboxThemeData } from '../utils/checkbox_theme.js';
import { SwitchThemeData } from '../utils/switch_theme.js';
import { RadioThemeData } from '../utils/radio_theme.js';
import { DialogTheme } from '../utils/dialog_theme.js';
import { ProgressIndicatorThemeData } from '../utils/progress_indicator_theme.js';
import { InputDecorationTheme, TextSelectionThemeData } from '../utils/text_field_theme.js';

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
        appBarTheme = null,
        // Component Themes
        checkboxTheme = null,
        switchTheme = null,
        radioTheme = null,
        dialogTheme = null,
        progressIndicatorTheme = null,
        inputDecorationTheme = null,
        textSelectionTheme = null
    } = {}) {
        this.brightness = brightness;

        // Legacy support
        this.primaryColor = primaryColor;
        this.primarySwatch = primarySwatch;

        // If primarySwatch is provided, it should override the default primaryColor
        if (primarySwatch && primaryColor === '#2196F3') {
            this.primaryColor = primarySwatch;
        }
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
        this.fontFamily = fontFamily;
        this.appBarTheme = appBarTheme;

        // Component Themes
        this.checkboxTheme = checkboxTheme || new CheckboxThemeData();
        this.switchTheme = switchTheme || new SwitchThemeData();
        this.radioTheme = radioTheme || new RadioThemeData();
        this.dialogTheme = dialogTheme || new DialogTheme();
        this.progressIndicatorTheme = progressIndicatorTheme || new ProgressIndicatorThemeData();
        this.inputDecorationTheme = inputDecorationTheme || new InputDecorationTheme();
        this.textSelectionTheme = textSelectionTheme || new TextSelectionThemeData();

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

            // Override primary if provided (including via primarySwatch)
            if (this.primaryColor && this.primaryColor !== '#2196F3') { // Check if different from default
                this.colorScheme = ColorScheme.fromSeed({
                    seedColor: this.primaryColor,
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

export { ThemeData };
