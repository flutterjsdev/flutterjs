// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { ButtonStyleButton } from './button_style_button.js';
import { Theme } from './theme.js';
import { GestureDetector } from './gesture_detector.js';
import { Container, BoxDecoration } from './container.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { BorderRadius } from '../utils/border_radius.js';
import { Center } from '../widgets/compoment/center.js';
import { TextStyle } from '../painting/text_style.js';

export class TextButton extends ButtonStyleButton {
    static styleFrom({
        foregroundColor,
        backgroundColor,
        disabledForegroundColor,
        disabledBackgroundColor,
        shadowColor,
        surfaceTintColor,
        elevation,
        textStyle,
        padding,
        minimumSize,
        fixedSize,
        maximumSize,
        side,
        shape,
        enabledMouseCursor,
        disabledMouseCursor,
        visualDensity,
        tapTargetSize,
        animationDuration,
        enableFeedback,
        alignment,
        splashFactory,
    } = {}) {
        return {
            foregroundColor,
            backgroundColor,
            disabledForegroundColor,
            disabledBackgroundColor,
            shadowColor,
            surfaceTintColor,
            elevation,
            textStyle,
            padding,
            minimumSize,
            fixedSize,
            maximumSize,
            side,
            shape,
            enabledMouseCursor,
            disabledMouseCursor,
            visualDensity,
            tapTargetSize,
            animationDuration,
            enableFeedback,
            alignment,
            splashFactory,
        };
    }

    constructor({
        key,
        onPressed,
        onLongPress,
        onHover,
        onFocusChange,
        style,
        focusNode,
        autofocus,
        clipBehavior,
        child
    } = {}) {
        super({
            key,
            onPressed,
            onLongPress,
            onHover,
            onFocusChange,
            style,
            focusNode,
            autofocus,
            clipBehavior,
            child
        });
    }

    build(context) {
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;
        const buttonTheme = theme.textButtonTheme?.style || {};

        // M3 Defaults for Text Button
        const defaultBg = 'transparent';
        const defaultFg = colorScheme.primary;

        const resolveColor = (value, defaultValue) => {
            if (value) {
                if (typeof value === 'string') return value;
                if (typeof value.toCSSString === 'function') return value.toCSSString();
                if (value.value) return '#' + value.value.toString(16).padStart(8, '0').slice(2);
            }
            return defaultValue;
        };

        const customStyle = this.style || {};

        // Merge with Theme
        const themeBg = buttonTheme.backgroundColor;
        const themeFg = buttonTheme.foregroundColor;

        const effectiveBg = resolveColor(customStyle.backgroundColor || themeBg, defaultBg);
        const effectiveFg = resolveColor(customStyle.foregroundColor || customStyle.color || themeFg, defaultFg);

        return new GestureDetector({
            onTap: this.onPressed,
            onLongPress: this.onLongPress,
            child: new Container({
                padding: customStyle.padding || EdgeInsets.symmetric({ vertical: 10, horizontal: 12 }),
                decoration: new BoxDecoration({
                    color: effectiveBg,
                    borderRadius: customStyle.shape?.borderRadius || BorderRadius.circular(20),
                }),
                child: new Center({
                    child: this.child // TODO: Apply text style if needed (usually handled by child or inherited)
                })
            })
        });
    }
}
