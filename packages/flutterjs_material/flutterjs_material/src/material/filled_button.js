// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { ButtonStyleButton } from './button_style_button.js';
import { FilledButtonTheme } from './filled_button_theme.js';
import { Theme } from './theme.js';
import { GestureDetector } from './gesture_detector.js';
import { Container, BoxDecoration } from './container.js';
import { BoxShadow } from '../utils/box_shadow.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { BorderRadius } from '../utils/border_radius.js';
import { Center } from '../widgets/compoment/center.js';
import { TextStyle } from '../painting/text_style.js';

export class FilledButton extends ButtonStyleButton {
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

    // Default style handling would be more complex here in a full framework,
    // merging Theme.of(context).filledButtonTheme, and default colors.
    // Since ButtonStyleButton is a base, we rely on it or the user providing style for now.
    // In future: implement `defaultStyleOf(context)` logic.

    static tonal({
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
        const button = new FilledButton({
            key, onPressed, onLongPress, onHover, onFocusChange,
            style,
            focusNode, autofocus, clipBehavior, child
        });
        button._variant = 'tonal';
        return button;
    }

    build(context) {
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        // Resolve Colors based on variant
        let defaultBg = colorScheme.primary;
        let defaultFg = colorScheme.onPrimary;

        if (this._variant === 'tonal') {
            defaultBg = colorScheme.secondaryContainer;
            defaultFg = colorScheme.onSecondaryContainer;
        }

        const resolveColor = (value, defaultValue) => {
            if (value) {
                if (typeof value === 'string') return value;
                if (typeof value.toCSSString === 'function') return value.toCSSString();
                if (value.value) return '#' + value.value.toString(16).padStart(8, '0').slice(2);
            }
            return defaultValue;
        };

        const customStyle = this.style || {};
        // If it's a ButtonStyle object, we should extract values.
        // For simplicity, we assume simple object overrides or ButtonStyle-like structure as seen in ElevatedButton

        const effectiveBg = resolveColor(customStyle.backgroundColor, defaultBg);
        const effectiveFg = resolveColor(customStyle.foregroundColor || customStyle.color, defaultFg);

        return new GestureDetector({
            onTap: this.onPressed,
            onLongPress: this.onLongPress,
            child: new Container({
                padding: customStyle.padding || EdgeInsets.symmetric({ vertical: 10, horizontal: 24 }),
                decoration: new BoxDecoration({
                    color: effectiveBg,
                    borderRadius: customStyle.shape?.borderRadius || BorderRadius.circular(20),
                    boxShadow: customStyle.elevation ? [
                        // Simple shadow approximation
                        new BoxShadow({ color: 'rgba(0,0,0,0.2)', blurRadius: 3, offset: { dx: 0, dy: 1 } })
                    ] : [],
                }),
                child: new Center({
                    child: this.child
                })
            })
        });
    }
}
