// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


import { Colors } from './color.js';

// ============================================================================
// COLOR SCHEME
// ============================================================================

export class ColorScheme {
    constructor({
        brightness,
        primary,
        onPrimary,
        primaryContainer,
        onPrimaryContainer,
        secondary,
        onSecondary,
        secondaryContainer,
        onSecondaryContainer,
        tertiary,
        onTertiary,
        tertiaryContainer,
        onTertiaryContainer,
        error,
        onError,
        errorContainer,
        onErrorContainer,
        background,
        onBackground,
        surface,
        onSurface,
        surfaceVariant,
        onSurfaceVariant,
        outline,
        outlineVariant,
        shadow,
        scrim,
        inverseSurface,
        onInverseSurface,
        inversePrimary,
        surfaceTint,
        // Material 3 Surface Tones
        surfaceContainerLowest,
        surfaceContainerLow,
        surfaceContainer,
        surfaceContainerHigh,
        surfaceContainerHighest,
    }) {
        this.brightness = brightness;
        this.primary = primary;
        this.onPrimary = onPrimary;
        this.primaryContainer = primaryContainer;
        this.onPrimaryContainer = onPrimaryContainer;
        this.secondary = secondary;
        this.onSecondary = onSecondary;
        this.secondaryContainer = secondaryContainer;
        this.onSecondaryContainer = onSecondaryContainer;
        this.tertiary = tertiary;
        this.onTertiary = onTertiary;
        this.tertiaryContainer = tertiaryContainer;
        this.onTertiaryContainer = onTertiaryContainer;
        this.error = error;
        this.onError = onError;
        this.errorContainer = errorContainer;
        this.onErrorContainer = onErrorContainer;
        this.background = background;
        this.onBackground = onBackground;
        this.surface = surface;
        this.onSurface = onSurface;
        this.surfaceVariant = surfaceVariant;
        this.onSurfaceVariant = onSurfaceVariant;
        this.outline = outline;
        this.outlineVariant = outlineVariant;
        this.shadow = shadow;
        this.scrim = scrim;
        this.inverseSurface = inverseSurface;
        this.onInverseSurface = onInverseSurface;
        this.inversePrimary = inversePrimary;
        this.surfaceTint = surfaceTint;

        // Material 3 Surface Tones
        this.surfaceContainerLowest = surfaceContainerLowest;
        this.surfaceContainerLow = surfaceContainerLow;
        this.surfaceContainer = surfaceContainer;
        this.surfaceContainerHigh = surfaceContainerHigh;
        this.surfaceContainerHighest = surfaceContainerHighest;
    }

    static fromSeed({
        seedColor,
        brightness = 'light',
        primary = null,
        onPrimary = null,
        primaryContainer = null,
        onPrimaryContainer = null,
        secondary = null,
        onSecondary = null,
        secondaryContainer = null,
        onSecondaryContainer = null,
        tertiary = null,
        onTertiary = null,
        tertiaryContainer = null,
        onTertiaryContainer = null,
        error = null,
        onError = null,
        errorContainer = null,
        onErrorContainer = null,
        background = null,
        onBackground = null,
        surface = null,
        onSurface = null,
        surfaceVariant = null,
        onSurfaceVariant = null,
        outline = null,
        outlineVariant = null,
        shadow = null,
        scrim = null,
        inverseSurface = null,
        onInverseSurface = null,
        inversePrimary = null,
        surfaceTint = null,
        // Surface Tones Override
        surfaceContainerLowest = null,
        surfaceContainerLow = null,
        surfaceContainer = null,
        surfaceContainerHigh = null,
        surfaceContainerHighest = null,
    }) {
        // simplified implementation of material 3 color generation
        const isDark = brightness === 'dark';

        // Core palette generation (mocked for now)
        const defaults = isDark ? this.dark() : this.light();

        // If seed color is provided, we should ideally generate palette
        // For now we'll just use the seed as primary and derive rough variants

        const derivedPrimary = seedColor || defaults.primary;

        return new ColorScheme({
            brightness,
            primary: primary || derivedPrimary,
            onPrimary: onPrimary || (isDark ? '#000000' : '#FFFFFF'),
            primaryContainer: primaryContainer || derivedPrimary.withOpacity(0.2),
            onPrimaryContainer: onPrimaryContainer || derivedPrimary,

            secondary: secondary || defaults.secondary,
            onSecondary: onSecondary || defaults.onSecondary,
            secondaryContainer: secondaryContainer || defaults.secondaryContainer,
            onSecondaryContainer: onSecondaryContainer || defaults.onSecondaryContainer,

            tertiary: tertiary || defaults.tertiary,
            onTertiary: onTertiary || defaults.onTertiary,
            tertiaryContainer: tertiaryContainer || defaults.tertiaryContainer,
            onTertiaryContainer: onTertiaryContainer || defaults.onTertiaryContainer,

            error: error || defaults.error,
            onError: onError || defaults.onError,
            errorContainer: errorContainer || defaults.errorContainer,
            onErrorContainer: onErrorContainer || defaults.onErrorContainer,

            background: background || defaults.background,
            onBackground: onBackground || defaults.onBackground,

            surface: surface || defaults.surface,
            onSurface: onSurface || defaults.onSurface,
            surfaceVariant: surfaceVariant || defaults.surfaceVariant,
            onSurfaceVariant: onSurfaceVariant || defaults.onSurfaceVariant,

            outline: outline || defaults.outline,
            outlineVariant: outlineVariant || defaults.outlineVariant,

            shadow: shadow || defaults.shadow,
            scrim: scrim || defaults.scrim,

            inverseSurface: inverseSurface || defaults.inverseSurface,
            onInverseSurface: onInverseSurface || defaults.onInverseSurface,
            inversePrimary: inversePrimary || (isDark ? derivedPrimary : '#D0BCFF'), // Mock inverse
            surfaceTint: surfaceTint || derivedPrimary,

            // Surface Tones
            surfaceContainerLowest: surfaceContainerLowest || defaults.surfaceContainerLowest,
            surfaceContainerLow: surfaceContainerLow || defaults.surfaceContainerLow,
            surfaceContainer: surfaceContainer || defaults.surfaceContainer,
            surfaceContainerHigh: surfaceContainerHigh || defaults.surfaceContainerHigh,
            surfaceContainerHighest: surfaceContainerHighest || defaults.surfaceContainerHighest,
        });
    }

    static light() {
        return new ColorScheme({
            brightness: 'light',
            primary: '#6750A4',
            onPrimary: '#FFFFFF',
            primaryContainer: '#EADDFF',
            onPrimaryContainer: '#21005D',
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
            surfaceVariant: '#E7E0EC',
            onSurfaceVariant: '#49454F',
            outline: '#79747E',
            outlineVariant: '#CAC4D0',
            shadow: '#000000',
            scrim: '#000000',
            inverseSurface: '#313033',
            onInverseSurface: '#F4EFF4',
            inversePrimary: '#D0BCFF',
            surfaceTint: '#6750A4',

            // M3 Surface Tones (Light)
            surfaceContainerLowest: '#FFFFFF',
            surfaceContainerLow: '#F7F2FA',
            surfaceContainer: '#F3EDF7',
            surfaceContainerHigh: '#ECE6F0',
            surfaceContainerHighest: '#E6E0E9',
        });
    }

    static dark() {
        return new ColorScheme({
            brightness: 'dark',
            primary: '#D0BCFF',
            onPrimary: '#381E72',
            primaryContainer: '#4F378B',
            onPrimaryContainer: '#EADDFF',
            secondary: '#CCC2DC',
            onSecondary: '#332D41',
            secondaryContainer: '#4A4458',
            onSecondaryContainer: '#E8DEF8',
            tertiary: '#EFB8C8',
            onTertiary: '#492532',
            tertiaryContainer: '#633B48',
            onTertiaryContainer: '#FFD8E4',
            error: '#F2B8B5',
            onError: '#601410',
            errorContainer: '#8C1D18',
            onErrorContainer: '#F9DEDC',
            background: '#1C1B1F',
            onBackground: '#E6E1E5',
            surface: '#1C1B1F',
            onSurface: '#E6E1E5',
            surfaceVariant: '#49454F',
            onSurfaceVariant: '#CAC4D0',
            outline: '#938F99',
            outlineVariant: '#49454F',
            shadow: '#000000',
            scrim: '#000000',
            inverseSurface: '#E6E1E5',
            onInverseSurface: '#313033',
            inversePrimary: '#6750A4',
            surfaceTint: '#D0BCFF',

            // M3 Surface Tones (Dark)
            surfaceContainerLowest: '#0F0D13',
            surfaceContainerLow: '#1D1B20',
            surfaceContainer: '#211F26',
            surfaceContainerHigh: '#2B2930',
            surfaceContainerHighest: '#36343B',
        });
    }
}
