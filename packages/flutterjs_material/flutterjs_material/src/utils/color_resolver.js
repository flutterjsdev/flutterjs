// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Color } from './color.js';
import { Theme } from '../material/theme.js';

/**
 * Color Resolver Utility
 * 
 * Centralized logic for resolving widget colors.
 * Handles the priority:
 * 1. Widget-specific override (passed in constructor/props)
 * 2. Component-specific theme override (ThemeData.componentTheme)
 * 3. General Theme default (ThemeData.colorScheme.*)
 * 4. Hard fallback (if everything else fails)
 */

/**
 * Resolve a color value to a CSS string or hex string
 * @param {string|Color|Object} color - The color value to resolve
 * @returns {string|null} The resolved CSS color string or null
 */
export function resolveColorValue(color) {
    if (!color) return null;

    if (typeof color === 'string') {
        return color;
    }

    if (color instanceof Color) {
        return color.toCSSString();
    }

    if (typeof color === 'object') {
        if (typeof color.toCSSString === 'function') {
            return color.toCSSString();
        }
        if (color.value !== undefined) {
            return new Color(color.value).toCSSString();
        }
    }

    return null; // Unknown type
}

/**
 * Resolves a specific color property for a widget
 * @param {Object} params
 * @param {any} params.value - The widget's instance property value
 * @param {any} params.themeValue - The component theme's property value
 * @param {any} params.defaultValue - The fallback system theme value (e.g. theme.colorScheme.primary)
 * @returns {string} The final resolved CSS color string
 */
export function resolveColor(value, themeValue, defaultValue) {
    const resolvedValue = resolveColorValue(value);
    if (resolvedValue) return resolvedValue;

    const resolvedThemeValue = resolveColorValue(themeValue);
    if (resolvedThemeValue) return resolvedThemeValue;

    return resolveColorValue(defaultValue);
}

/**
 * Helper to get the correct content color (OnColor) based on a background color
 * This is a simplified version of standard material elevation/contrast checking.
 * 
 * @param {string} backgroundColor - The background color
 * @param {ThemeData} theme - The current theme data
 * @returns {string} The suggested content color (e.g. valid CSS color)
 */
export function resolveOnColor(backgroundColor, theme) {
    // If not provided, assume surface
    const bg = resolveColorValue(backgroundColor) || theme.colorScheme.surface;

    // Check if background matches standard theme colors to return their paired 'on' color
    // This is a heuristic; robust implementation would calculate luminance.

    const scheme = theme.colorScheme;

    // Normalize for comparison (basic check, not case sensitive)
    const bgLower = bg.toLowerCase();

    // Helper to compare
    const matches = (themeColor) => resolveColorValue(themeColor)?.toLowerCase() === bgLower;

    if (matches(scheme.primary)) return resolveColorValue(scheme.onPrimary);
    if (matches(scheme.secondary)) return resolveColorValue(scheme.onSecondary);
    if (matches(scheme.tertiary)) return resolveColorValue(scheme.onTertiary);
    if (matches(scheme.error)) return resolveColorValue(scheme.onError);
    if (matches(scheme.surface)) return resolveColorValue(scheme.onSurface);
    if (matches(scheme.background)) return resolveColorValue(scheme.onBackground);
    if (matches(scheme.surfaceVariant)) return resolveColorValue(scheme.onSurfaceVariant);
    if (matches(scheme.inverseSurface)) return resolveColorValue(scheme.onInverseSurface);

    // Fallback: simple light/dark check could go here, but for now default to onSurface
    return resolveColorValue(scheme.onSurface);
}
