// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { GestureDetector } from '@flutterjs/material';
import { SizedBox } from '@flutterjs/material';
import { BorderRadius } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';
import { CupertinoTheme } from './theme.js';

/**
 * An iOS-style switch.
 *
 * Used to toggle the on/off state of a single setting.
 */
export class CupertinoSwitch extends StatefulWidget {
    constructor({
        key,
        value = false,
        onChanged,
        activeColor,
        trackColor,
        thumbColor,
        dragStartBehavior,
    } = {}) {
        super(key);
        this.value = value;
        this.onChanged = onChanged;
        this.activeColor = activeColor;
        this.trackColor = trackColor;
        this.thumbColor = thumbColor || CupertinoColors.white;
    }

    createState() { return new _CupertinoSwitchState(); }
}

class _CupertinoSwitchState extends State {
    build(context) {
        const theme = CupertinoTheme.of(context);
        const isOn = this.widget.value;
        const enabled = this.widget.onChanged != null;

        const trackColor = isOn
            ? (this.widget.activeColor || CupertinoColors.systemGreen)
            : (this.widget.trackColor || CupertinoColors.systemGrey4);

        const thumbColor = this.widget.thumbColor;
        const opacity = enabled ? 1.0 : 0.5;

        // Track
        const track = new Container({
            width: 51,
            height: 31,
            decoration: new BoxDecoration({
                color: trackColor,
                borderRadius: BorderRadius.circular(15.5),
            }),
            child: new Container({
                padding: { left: isOn ? 22 : 2, top: 2 },
                child: new Container({
                    width: 27,
                    height: 27,
                    decoration: new BoxDecoration({
                        color: thumbColor,
                        borderRadius: BorderRadius.circular(13.5),
                        boxShadow: [
                            { color: 'rgba(0,0,0,0.15)', offsetX: 0, offsetY: 3, blurRadius: 8 },
                            { color: 'rgba(0,0,0,0.06)', offsetX: 0, offsetY: 3, blurRadius: 1 },
                        ],
                    }),
                }),
            }),
        });

        if (!enabled) {
            return new Container({
                style: { opacity },
                child: track,
            });
        }

        return new GestureDetector({
            onTap: () => this.widget.onChanged?.(!this.widget.value),
            child: new Container({
                style: { opacity, cursor: 'pointer' },
                child: track,
            }),
        });
    }
}
