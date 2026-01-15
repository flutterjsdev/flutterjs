
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
        });
    }
}
