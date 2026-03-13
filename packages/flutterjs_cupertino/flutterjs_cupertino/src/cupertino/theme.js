// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { CupertinoColors } from './colors.js';

/**
 * CupertinoThemeData — iOS-style theme configuration.
 */
export class CupertinoThemeData {
    constructor({
        brightness = 'light',
        primaryColor,
        primaryContrastingColor,
        scaffoldBackgroundColor,
        barBackgroundColor,
        textTheme,
    } = {}) {
        this.brightness = brightness;
        this.primaryColor = primaryColor || CupertinoColors.activeBlue;
        this.primaryContrastingColor = primaryContrastingColor || CupertinoColors.white;
        this.scaffoldBackgroundColor = scaffoldBackgroundColor ||
            (brightness === 'dark' ? CupertinoColors.dark.systemBackground : CupertinoColors.systemBackground);
        this.barBackgroundColor = barBackgroundColor ||
            (brightness === 'dark' ? '#1C1C1EE6' : '#F9F9F9E6'); // with 90% opacity
        this.textTheme = textTheme || new CupertinoTextThemeData();
    }
}

/**
 * CupertinoTextThemeData — iOS text styles.
 */
export class CupertinoTextThemeData {
    constructor({
        primaryColor,
        textStyle,
        actionTextStyle,
        tabLabelTextStyle,
        navTitleTextStyle,
        navLargeTitleTextStyle,
        navActionTextStyle,
        pickerTextStyle,
        dateTimePickerTextStyle,
    } = {}) {
        this.primaryColor = primaryColor || CupertinoColors.activeBlue;
        this.textStyle = textStyle || { fontSize: 17, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', color: CupertinoColors.label };
        this.actionTextStyle = actionTextStyle || { fontSize: 17, color: CupertinoColors.activeBlue, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' };
        this.tabLabelTextStyle = tabLabelTextStyle || { fontSize: 10, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' };
        this.navTitleTextStyle = navTitleTextStyle || { fontSize: 17, fontWeight: '600', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' };
        this.navLargeTitleTextStyle = navLargeTitleTextStyle || { fontSize: 34, fontWeight: '700', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' };
        this.navActionTextStyle = navActionTextStyle || { fontSize: 17, color: CupertinoColors.activeBlue, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' };
        this.pickerTextStyle = pickerTextStyle || { fontSize: 21, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' };
        this.dateTimePickerTextStyle = dateTimePickerTextStyle || { fontSize: 21, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' };
    }
}

/**
 * CupertinoTheme — provides iOS theme to descendant widgets.
 */
export class CupertinoTheme {
    static _defaultTheme = new CupertinoThemeData();

    static of(context) {
        // Simplified: return default theme
        return CupertinoTheme._defaultTheme;
    }
}
