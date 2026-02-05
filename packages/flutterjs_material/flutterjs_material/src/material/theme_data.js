// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { ColorScheme } from './color_scheme.js';
import { CheckboxThemeData } from '../utils/checkbox_theme.js';
import { SwitchThemeData } from '../utils/switch_theme.js';
import { RadioThemeData } from '../utils/radio_theme.js';
import { DialogTheme } from '../utils/dialog_theme.js';
import { ProgressIndicatorThemeData } from '../utils/progress_indicator_theme.js';
import { InputDecorationTheme, TextSelectionThemeData } from '../utils/text_field_theme.js';

import { TextStyle } from '../painting/text_style.js';

// ... imports remain the same

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
        elevatedButtonTheme = null,
        textButtonTheme = null,
        outlinedButtonTheme = null,
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
        this.elevatedButtonTheme = elevatedButtonTheme;
        this.textButtonTheme = textButtonTheme;
        this.outlinedButtonTheme = outlinedButtonTheme;

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

        // Helper to ensure styles are TextStyle instances
        const createTextStyle = (style) => {
            if (style instanceof TextStyle) return style;
            return new TextStyle({ fontFamily, color: baseColor, ...style });
        };

        const defaultTextTheme = {
            displayLarge: { fontSize: 57, fontWeight: '400' },
            displayMedium: { fontSize: 45, fontWeight: '400' },
            displaySmall: { fontSize: 36, fontWeight: '400' },
            headlineLarge: { fontSize: 32, fontWeight: '400' },
            headlineMedium: { fontSize: 28, fontWeight: '400' },
            headlineSmall: { fontSize: 24, fontWeight: '400' },
            titleLarge: { fontSize: 22, fontWeight: '400' },
            titleMedium: { fontSize: 16, fontWeight: '500' },
            titleSmall: { fontSize: 14, fontWeight: '500' },
            bodyLarge: { fontSize: 16, fontWeight: '400' },
            bodyMedium: { fontSize: 14, fontWeight: '400' },
            bodySmall: { fontSize: 12, fontWeight: '400' },
            labelLarge: { fontSize: 14, fontWeight: '500' },
            labelMedium: { fontSize: 12, fontWeight: '500' },
            labelSmall: { fontSize: 11, fontWeight: '500' },
        };

        this.textTheme = {};

        // Merge provided textTheme with defaults and ensure all are TextStyle instances
        Object.keys(defaultTextTheme).forEach(key => {
            const provided = textTheme?.[key];
            const defaults = defaultTextTheme[key];
            this.textTheme[key] = createTextStyle(provided || defaults);
        });

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
