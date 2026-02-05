// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

class TextStyle {
    constructor({
        inherit = true,
        color,
        backgroundColor,
        fontSize,
        fontWeight,
        fontStyle,
        letterSpacing,
        wordSpacing,
        textBaseline,
        height,
        leadingDistribution,
        locale,
        foreground,
        background,
        shadows,
        fontFeatures,
        decoration,
        decorationColor,
        decorationStyle,
        decorationThickness,
        debugLabel,
        fontFamily,
        fontFamilyFallback,
        fontPackage,
        overflow,
    } = {}) {
        this.inherit = inherit;
        this.color = color;
        this.backgroundColor = backgroundColor;
        this.fontSize = fontSize;
        this.fontWeight = fontWeight;
        this.fontStyle = fontStyle;
        this.letterSpacing = letterSpacing;
        this.wordSpacing = wordSpacing;
        this.textBaseline = textBaseline;
        this.height = height;
        this.leadingDistribution = leadingDistribution;
        this.locale = locale;
        this.foreground = foreground;
        this.background = background;
        this.shadows = shadows;
        this.fontFeatures = fontFeatures;
        this.decoration = decoration;
        this.decorationColor = decorationColor;
        this.decorationStyle = decorationStyle;
        this.decorationThickness = decorationThickness;
        this.debugLabel = debugLabel;
        this.fontFamily = fontFamily;
        this.fontFamilyFallback = fontFamilyFallback;
        this.fontPackage = fontPackage;
        this.overflow = overflow;
    }

    copyWith({
        inherit,
        color,
        backgroundColor,
        fontSize,
        fontWeight,
        fontStyle,
        letterSpacing,
        wordSpacing,
        textBaseline,
        height,
        leadingDistribution,
        locale,
        foreground,
        background,
        shadows,
        fontFeatures,
        decoration,
        decorationColor,
        decorationStyle,
        decorationThickness,
        debugLabel,
        fontFamily,
        fontFamilyFallback,
        fontPackage,
        overflow,
    } = {}) {
        return new TextStyle({
            inherit: inherit ?? this.inherit,
            color: color ?? this.color,
            backgroundColor: backgroundColor ?? this.backgroundColor,
            fontSize: fontSize ?? this.fontSize,
            fontWeight: fontWeight ?? this.fontWeight,
            fontStyle: fontStyle ?? this.fontStyle,
            letterSpacing: letterSpacing ?? this.letterSpacing,
            wordSpacing: wordSpacing ?? this.wordSpacing,
            textBaseline: textBaseline ?? this.textBaseline,
            height: height ?? this.height,
            leadingDistribution: leadingDistribution ?? this.leadingDistribution,
            locale: locale ?? this.locale,
            foreground: foreground ?? this.foreground,
            background: background ?? this.background,
            shadows: shadows ?? this.shadows,
            fontFeatures: fontFeatures ?? this.fontFeatures,
            decoration: decoration ?? this.decoration,
            decorationColor: decorationColor ?? this.decorationColor,
            decorationStyle: decorationStyle ?? this.decorationStyle,
            decorationThickness: decorationThickness ?? this.decorationThickness,
            debugLabel: debugLabel ?? this.debugLabel,
            fontFamily: fontFamily ?? this.fontFamily,
            fontFamilyFallback: fontFamilyFallback ?? this.fontFamilyFallback,
            fontPackage: fontPackage ?? this.fontPackage,
            overflow: overflow ?? this.overflow,
        });
    }

    toCSSString() {
        const css = {};
        if (this.color) {
            css.color = this.color.toCSSString ? this.color.toCSSString() : this.color;
        }
        if (this.fontSize) {
            css.fontSize = typeof this.fontSize === 'number' ? `${this.fontSize}px` : this.fontSize;
        }
        if (this.fontWeight) {
            css.fontWeight = this.fontWeight;
        }
        if (this.fontStyle) {
            css.fontStyle = this.fontStyle;
        }
        if (this.fontFamily) {
            css.fontFamily = this.fontFamily;
        }
        if (this.letterSpacing) {
            css.letterSpacing = typeof this.letterSpacing === 'number' ? `${this.letterSpacing}px` : this.letterSpacing;
        }
        if (this.height) {
            css.lineHeight = this.height;
        }
        if (this.decoration) {
            css.textDecoration = this.decoration;
        }
        if (this.backgroundColor) {
            css.backgroundColor = this.backgroundColor.toCSSString ? this.backgroundColor.toCSSString() : this.backgroundColor;
        }
        return css;
    }

    merge(other) {
        if (!other) return this;
        return this.copyWith({
            inherit: other.inherit,
            color: other.color,
            backgroundColor: other.backgroundColor,
            fontSize: other.fontSize,
            fontWeight: other.fontWeight,
            fontStyle: other.fontStyle,
            letterSpacing: other.letterSpacing,
            wordSpacing: other.wordSpacing,
            textBaseline: other.textBaseline,
            height: other.height,
            leadingDistribution: other.leadingDistribution,
            locale: other.locale,
            foreground: other.foreground,
            background: other.background,
            shadows: other.shadows,
            fontFeatures: other.fontFeatures,
            decoration: other.decoration,
            decorationColor: other.decorationColor,
            decorationStyle: other.decorationStyle,
            decorationThickness: other.decorationThickness,
            debugLabel: other.debugLabel,
            fontFamily: other.fontFamily,
            fontFamilyFallback: other.fontFamilyFallback,
            fontPackage: other.fontPackage,
            overflow: other.overflow,
        });
    }
}

export { TextStyle };

