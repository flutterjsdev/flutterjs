// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { Row, Column, SizedBox } from '../widgets/widgets.js';
import { Text } from './text.js';
import { TextButton } from './text_button.js';
import { IconButton } from './icon_button.js';
import { Icon, Icons } from './icon.js';
import { BorderRadius } from '../utils/border_radius.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { MainAxisAlignment, CrossAxisAlignment, MainAxisSize } from '../utils/utils.js';
import { Theme } from './theme.js';
import { showDialog } from './dialog.js';

/**
 * Shows a Material Design date picker dialog.
 */
export async function showDatePicker({
    context,
    initialDate,
    firstDate,
    lastDate,
    currentDate,
    initialEntryMode = 'calendar',
    selectableDayPredicate,
    helpText = 'Select date',
    cancelText = 'Cancel',
    confirmText = 'OK',
    locale,
    barrierDismissible = true,
    barrierColor,
    barrierLabel,
    useRootNavigator = true,
    routeSettings,
    textDirection,
    builder,
    initialDatePickerMode = 'day',
    errorFormatText,
    errorInvalidText,
    fieldHintText,
    fieldLabelText,
    keyboardType,
    anchorPoint,
    onDatePickerModeChange,
    switchToInputEntryModeIcon,
    switchToCalendarEntryModeIcon,
} = {}) {
    // For web, use native date picker input
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'date';
        if (initialDate) {
            input.value = _formatDate(initialDate);
        }
        if (firstDate) input.min = _formatDate(firstDate);
        if (lastDate) input.max = _formatDate(lastDate);

        input.style.position = 'fixed';
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';
        document.body.appendChild(input);

        input.addEventListener('change', () => {
            const date = input.value ? new Date(input.value) : null;
            document.body.removeChild(input);
            resolve(date);
        });

        input.addEventListener('cancel', () => {
            document.body.removeChild(input);
            resolve(null);
        });

        // Fallback: if showPicker exists (modern browsers)
        if (input.showPicker) {
            input.showPicker();
        } else {
            input.click();
        }

        // Fallback timeout
        setTimeout(() => {
            if (document.body.contains(input)) {
                document.body.removeChild(input);
                resolve(null);
            }
        }, 60000);
    });
}

function _formatDate(date) {
    if (typeof date === 'string') return date;
    if (date instanceof Date) {
        return date.toISOString().split('T')[0];
    }
    return '';
}

/**
 * DatePickerDialog widget for showing inline date picker.
 */
export class DatePickerDialog extends StatefulWidget {
    constructor({
        key,
        initialDate,
        firstDate,
        lastDate,
        currentDate,
        initialEntryMode = 'calendar',
        selectableDayPredicate,
        cancelText = 'Cancel',
        confirmText = 'OK',
        helpText = 'Select date',
        onDateChanged,
    } = {}) {
        super(key);
        Object.assign(this, {
            initialDate, firstDate, lastDate, currentDate,
            initialEntryMode, selectableDayPredicate,
            cancelText, confirmText, helpText, onDateChanged,
        });
    }

    createState() { return new DatePickerDialogState(); }
}

class DatePickerDialogState extends State {
    constructor() {
        super();
        this.selectedDate = null;
    }

    initState() {
        this.selectedDate = this.widget.initialDate || new Date();
    }

    build(context) {
        const theme = Theme.of(context);
        const cs = theme.colorScheme;
        const primary = cs.primary || '#6750A4';

        const dateStr = this.selectedDate
            ? this.selectedDate.toLocaleDateString()
            : 'No date selected';

        return new Container({
            padding: EdgeInsets.all(24),
            child: new Column({
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                    new Text(this.widget.helpText, { style: { fontSize: 12, color: primary } }),
                    new SizedBox({ height: 16 }),
                    new Text(dateStr, { style: { fontSize: 24, fontWeight: 'bold' } }),
                    new SizedBox({ height: 24 }),
                    new Row({
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                            new TextButton({ child: new Text(this.widget.cancelText), onPressed: () => {} }),
                            new SizedBox({ width: 8 }),
                            new TextButton({ child: new Text(this.widget.confirmText), onPressed: () => {
                                this.widget.onDateChanged?.(this.selectedDate);
                            }}),
                        ],
                    }),
                ],
            }),
        });
    }
}
