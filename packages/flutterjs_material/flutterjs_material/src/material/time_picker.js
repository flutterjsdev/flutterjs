// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { Row, Column, SizedBox } from '../widgets/widgets.js';
import { Text } from './text.js';
import { TextButton } from './text_button.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { MainAxisAlignment, CrossAxisAlignment, MainAxisSize } from '../utils/utils.js';
import { Theme } from './theme.js';

/**
 * Shows a Material Design time picker dialog.
 * Uses native browser time input for web.
 */
export async function showTimePicker({
    context,
    initialTime,
    initialEntryMode = 'dial',
    helpText = 'Select time',
    cancelText = 'Cancel',
    confirmText = 'OK',
    hourLabelText,
    minuteLabelText,
    errorInvalidText,
    builder,
    useRootNavigator = true,
    routeSettings,
    anchorPoint,
    orientation,
    barrierDismissible = true,
    barrierColor,
    barrierLabel,
    onEntryModeChanged,
} = {}) {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'time';
        if (initialTime) {
            const h = String(initialTime.hour || 0).padStart(2, '0');
            const m = String(initialTime.minute || 0).padStart(2, '0');
            input.value = `${h}:${m}`;
        }

        input.style.position = 'fixed';
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';
        document.body.appendChild(input);

        input.addEventListener('change', () => {
            const parts = input.value.split(':');
            const time = parts.length >= 2
                ? new TimeOfDay({ hour: parseInt(parts[0]), minute: parseInt(parts[1]) })
                : null;
            document.body.removeChild(input);
            resolve(time);
        });

        input.addEventListener('cancel', () => {
            document.body.removeChild(input);
            resolve(null);
        });

        if (input.showPicker) {
            input.showPicker();
        } else {
            input.click();
        }

        setTimeout(() => {
            if (document.body.contains(input)) {
                document.body.removeChild(input);
                resolve(null);
            }
        }, 60000);
    });
}

/**
 * Represents a time of day (hour and minute).
 */
export class TimeOfDay {
    constructor({ hour = 0, minute = 0 } = {}) {
        this.hour = hour;
        this.minute = minute;
    }

    static now() {
        const now = new Date();
        return new TimeOfDay({ hour: now.getHours(), minute: now.getMinutes() });
    }

    format(context) {
        const h = this.hour > 12 ? this.hour - 12 : this.hour || 12;
        const m = String(this.minute).padStart(2, '0');
        const period = this.hour >= 12 ? 'PM' : 'AM';
        return `${h}:${m} ${period}`;
    }

    replacing({ hour, minute } = {}) {
        return new TimeOfDay({
            hour: hour ?? this.hour,
            minute: minute ?? this.minute,
        });
    }

    get periodOffset() {
        return this.hour >= 12 ? 12 : 0;
    }

    get hourOfPeriod() {
        const h = this.hour % 12;
        return h === 0 ? 12 : h;
    }

    get period() {
        return this.hour >= 12 ? 'pm' : 'am';
    }

    toString() {
        return `TimeOfDay(${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')})`;
    }
}

/**
 * TimePickerDialog widget for inline time picking.
 */
export class TimePickerDialog extends StatefulWidget {
    constructor({
        key,
        initialTime,
        cancelText = 'Cancel',
        confirmText = 'OK',
        helpText = 'Select time',
        onTimeChanged,
    } = {}) {
        super(key);
        this.initialTime = initialTime;
        this.cancelText = cancelText;
        this.confirmText = confirmText;
        this.helpText = helpText;
        this.onTimeChanged = onTimeChanged;
    }

    createState() { return new TimePickerDialogState(); }
}

class TimePickerDialogState extends State {
    constructor() { super(); this.selectedTime = null; }

    initState() {
        this.selectedTime = this.widget.initialTime || TimeOfDay.now();
    }

    build(context) {
        const theme = Theme.of(context);
        const cs = theme.colorScheme;
        const primary = cs.primary || '#6750A4';

        const timeStr = this.selectedTime ? this.selectedTime.format(context) : '--:--';

        return new Container({
            padding: EdgeInsets.all(24),
            child: new Column({
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                    new Text(this.widget.helpText, { style: { fontSize: 12, color: primary } }),
                    new SizedBox({ height: 16 }),
                    new Text(timeStr, { style: { fontSize: 32, fontWeight: 'bold' } }),
                    new SizedBox({ height: 24 }),
                    new Row({
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                            new TextButton({ child: new Text(this.widget.cancelText), onPressed: () => {} }),
                            new SizedBox({ width: 8 }),
                            new TextButton({ child: new Text(this.widget.confirmText), onPressed: () => {
                                this.widget.onTimeChanged?.(this.selectedTime);
                            }}),
                        ],
                    }),
                ],
            }),
        });
    }
}
