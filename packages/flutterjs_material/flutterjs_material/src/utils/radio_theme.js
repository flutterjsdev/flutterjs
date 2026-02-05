// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Material Design 3 Radio Theme
 * Defines the visual properties of Radio widgets
 * Follows Flutter Material Design 3 specification
 * 
 * Flutter Reference: https://api.flutter.dev/flutter/material/RadioThemeData-class.html
 */
export class RadioThemeData {
    constructor({
        // Colors
        fillColor,
        overlayColor,
        focusColor,
        hoverColor,

        // Size & Padding
        materialTapTargetSize = 'padded',
        visualDensity,
        mouseCursor,

        // States
        splashRadius,

        // Interaction
        enableFeedback = true,
        animationDuration = 200
    } = {}) {
        this.fillColor = fillColor;
        this.overlayColor = overlayColor;
        this.focusColor = focusColor;
        this.hoverColor = hoverColor;
        this.materialTapTargetSize = materialTapTargetSize;
        this.visualDensity = visualDensity;
        this.mouseCursor = mouseCursor;
        this.splashRadius = splashRadius ?? 20;
        this.enableFeedback = enableFeedback;
        this.animationDuration = animationDuration;
    }

    /**
     * Get radio size based on tap target
     * @returns {number} Size in pixels
     */
    getRadioSize() {
        return this.materialTapTargetSize === 'padded' ? 48 : 40;
    }

    /**
     * Convert to CSS object for DOM rendering
     * @returns {Object} CSS style object
     */
    toCSSObject() {
        return {
            width: '20px',
            height: '20px',
            cursor: this.mouseCursor || 'pointer',
            borderRadius: '50%',
            transition: `all ${this.animationDuration}ms ease`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
        };
    }

    /**
     * Get fill color for selected state
     * @param {Object} themeColors - Theme colors object
     * @returns {string} Hex color value
     */
    getFillColor(themeColors = {}) {
        return this.fillColor || themeColors.primary || '#6750A4';
    }

    /**
     * Get hover color
     * @param {Object} themeColors - Theme colors object
     * @returns {string} Hex color value
     */
    getHoverColor(themeColors = {}) {
        return this.hoverColor || themeColors.primary + '14' || '#6750A414';
    }

    /**
     * Get focus color
     * @param {Object} themeColors - Theme colors object
     * @returns {string} Hex color value
     */
    getFocusColor(themeColors = {}) {
        return this.focusColor || themeColors.primary + '24' || '#6750A424';
    }

    /**
     * Get unselected state CSS object
     * @param {Object} themeColors - Theme colors object
     * @returns {Object} CSS properties
     */
    getUnselectedStyle(themeColors = {}) {
        return {
            ...this.toCSSObject(),
            border: `2px solid ${themeColors.onSurfaceVariant || '#79747E'}`,
            backgroundColor: 'transparent'
        };
    }

    /**
     * Get selected state CSS object
     * @param {Object} themeColors - Theme colors object
     * @returns {Object} CSS properties
     */
    getSelectedStyle(themeColors = {}) {
        return {
            ...this.toCSSObject(),
            border: `2px solid ${this.getFillColor(themeColors)}`,
            backgroundColor: 'transparent'
        };
    }

    /**
     * Get disabled state CSS object
     * @param {Object} themeColors - Theme colors object
     * @returns {Object} CSS properties
     */
    getDisabledStyle(themeColors = {}) {
        return {
            ...this.toCSSObject(),
            opacity: 0.38,
            cursor: 'not-allowed',
            pointerEvents: 'none'
        };
    }

    /**
     * Get hover state CSS object
     * @param {Object} themeColors - Theme colors object
     * @returns {Object} CSS properties
     */
    getHoverStyle(themeColors = {}) {
        return {
            backgroundColor: this.getHoverColor(themeColors)
        };
    }

    /**
     * Get focus state CSS object
     * @param {Object} themeColors - Theme colors object
     * @returns {Object} CSS properties
     */
    getFocusStyle(themeColors = {}) {
        return {
            outline: 'none',
            boxShadow: `0 0 0 ${this.splashRadius}px ${this.getFocusColor(themeColors)}`
        };
    }

    /**
     * Copy this theme with updated properties
     * @param {Object} properties - Properties to override
     * @returns {RadioThemeData} New theme instance
     */
    copyWith({
        fillColor,
        overlayColor,
        focusColor,
        hoverColor,
        materialTapTargetSize,
        visualDensity,
        mouseCursor,
        splashRadius,
        enableFeedback,
        animationDuration
    } = {}) {
        return new RadioThemeData({
            fillColor: fillColor ?? this.fillColor,
            overlayColor: overlayColor ?? this.overlayColor,
            focusColor: focusColor ?? this.focusColor,
            hoverColor: hoverColor ?? this.hoverColor,
            materialTapTargetSize: materialTapTargetSize ?? this.materialTapTargetSize,
            visualDensity: visualDensity ?? this.visualDensity,
            mouseCursor: mouseCursor ?? this.mouseCursor,
            splashRadius: splashRadius ?? this.splashRadius,
            enableFeedback: enableFeedback ?? this.enableFeedback,
            animationDuration: animationDuration ?? this.animationDuration
        });
    }

    /**
     * Merge with another RadioThemeData
     * @param {RadioThemeData} other - Theme to merge with
     * @returns {RadioThemeData} Merged theme
     */
    merge(other) {
        if (!other) return this;
        return this.copyWith({
            fillColor: other.fillColor,
            overlayColor: other.overlayColor,
            focusColor: other.focusColor,
            hoverColor: other.hoverColor,
            materialTapTargetSize: other.materialTapTargetSize,
            visualDensity: other.visualDensity,
            mouseCursor: other.mouseCursor,
            splashRadius: other.splashRadius,
            enableFeedback: other.enableFeedback,
            animationDuration: other.animationDuration
        });
    }

    toString() {
        return `RadioThemeData(fillColor: ${this.fillColor})`;
    }
}
