// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, StatelessWidget } from '../core/widget_element.js';
import { Container } from './container.js';
import { GestureDetector } from './gesture_detector.js';
import { Center } from '../widgets/compoment/center.js';

export class ButtonStyleButton extends StatelessWidget {
    constructor({
        key,
        onPressed,
        onLongPress,
        onHover,
        onFocusChange,
        style,
        focusNode,
        autofocus = false,
        clipBehavior = 'none',
        child
    } = {}) {
        super(key);
        this.onPressed = onPressed;
        this.onLongPress = onLongPress;
        this.onHover = onHover;
        this.onFocusChange = onFocusChange;
        this.style = style;
        this.focusNode = focusNode;
        this.autofocus = autofocus;
        this.clipBehavior = clipBehavior;
        this.child = child;
    }

    build(context) {
        // Base implementation for buttons.
        // Subclasses (ElevatedButton, etc.) should generally override or this provides a generic button.

        // This is a minimal implementation to support the structure.
        // Needs proper visual rendering based on `style`.

        return new GestureDetector({
            onTap: this.onPressed,
            onLongPress: this.onLongPress,
            child: new Container({
                // Apply style properties here...
                // e.g. padding, color, shape from this.style
                // For now, minimal.
                child: new Center({ child: this.child })
            })
        });
    }

    static allOrNull(value) {
        return value; // Should return MaterialStateProperty.all(value) logic
    }
}
