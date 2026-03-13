// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { Row, Column, SizedBox, Text, Center, GestureDetector } from '@flutterjs/material';
import { EdgeInsets, BorderRadius } from '@flutterjs/material';
import { MainAxisAlignment, CrossAxisAlignment, MainAxisSize } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';
import { CupertinoTheme } from './theme.js';

/**
 * An iOS-style date/time picker.
 *
 * Uses the spinning drum-style interface familiar on iOS.
 * On web, falls back to a styled native date/time input.
 */

/** DatePicker modes */
export const CupertinoDatePickerMode = {
    time: 'time',
    date: 'date',
    dateAndTime: 'dateAndTime',
    monthYear: 'monthYear',
};

export class CupertinoDatePicker extends StatefulWidget {
    constructor({
        key,
        mode = CupertinoDatePickerMode.dateAndTime,
        onDateTimeChanged,
        initialDateTime,
        minimumDate,
        maximumDate,
        minimumYear = 1,
        maximumYear,
        minuteInterval = 1,
        use24hFormat = false,
        backgroundColor,
        showDayOfWeek = false,
        itemExtent = 32.0,
    } = {}) {
        super(key);
        Object.assign(this, {
            mode, onDateTimeChanged, initialDateTime: initialDateTime || new Date(),
            minimumDate, maximumDate, minimumYear, maximumYear,
            minuteInterval, use24hFormat, backgroundColor, showDayOfWeek, itemExtent,
        });
    }

    createState() { return new _CupertinoDatePickerState(); }
}

class _CupertinoDatePickerState extends State {
    initState() {
        super.initState();
        this._currentDate = this.widget.initialDateTime || new Date();
    }

    build(context) {
        const mode = this.widget.mode;
        const bgColor = this.widget.backgroundColor || CupertinoColors.systemBackground;

        let inputType;
        switch (mode) {
            case CupertinoDatePickerMode.time: inputType = 'time'; break;
            case CupertinoDatePickerMode.date: inputType = 'date'; break;
            case CupertinoDatePickerMode.monthYear: inputType = 'month'; break;
            default: inputType = 'datetime-local';
        }

        const formatValue = () => {
            const d = this._currentDate;
            const pad = (n) => String(n).padStart(2, '0');
            if (inputType === 'time') {
                return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
            } else if (inputType === 'date') {
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
            } else if (inputType === 'month') {
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
            }
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        return new Container({
            height: 216,
            decoration: new BoxDecoration({ color: bgColor }),
            child: new Center({
                child: new Container({
                    tag: 'input',
                    attrs: {
                        type: inputType,
                        value: formatValue(),
                        ...(this.widget.minimumDate ? { min: this.widget.minimumDate.toISOString().split('T')[0] } : {}),
                        ...(this.widget.maximumDate ? { max: this.widget.maximumDate.toISOString().split('T')[0] } : {}),
                    },
                    style: {
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                        fontSize: '21px',
                        color: CupertinoColors.label,
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'center',
                        cursor: 'pointer',
                    },
                    events: {
                        change: (e) => {
                            const newDate = new Date(e.target.value);
                            if (!isNaN(newDate.getTime())) {
                                this._currentDate = newDate;
                                this.widget.onDateTimeChanged?.(newDate);
                            }
                        },
                    },
                }),
            }),
        });
    }
}

/**
 * An iOS-style timer picker.
 *
 * Picks a duration (hours, minutes, seconds).
 */
export const CupertinoTimerPickerMode = {
    hm: 'hm',
    ms: 'ms',
    hms: 'hms',
};

export class CupertinoTimerPicker extends StatefulWidget {
    constructor({
        key,
        mode = CupertinoTimerPickerMode.hms,
        initialTimerDuration = 0,
        minuteInterval = 1,
        secondInterval = 1,
        alignment = 'center',
        backgroundColor,
        onTimerDurationChanged,
        itemExtent = 32.0,
    } = {}) {
        super(key);
        Object.assign(this, {
            mode, initialTimerDuration, minuteInterval, secondInterval,
            alignment, backgroundColor, onTimerDurationChanged, itemExtent,
        });
    }

    createState() { return new _CupertinoTimerPickerState(); }
}

class _CupertinoTimerPickerState extends State {
    initState() {
        super.initState();
        const dur = this.widget.initialTimerDuration;
        this._hours = Math.floor(dur / 3600);
        this._minutes = Math.floor((dur % 3600) / 60);
        this._seconds = dur % 60;
    }

    _emitDuration() {
        const total = (this._hours * 3600) + (this._minutes * 60) + this._seconds;
        this.widget.onTimerDurationChanged?.(total);
    }

    build(context) {
        const bgColor = this.widget.backgroundColor || CupertinoColors.systemBackground;
        const mode = this.widget.mode;
        const showHours = mode === 'hm' || mode === 'hms';
        const showMinutes = true;
        const showSeconds = mode === 'ms' || mode === 'hms';

        const makeSelect = (value, max, label, onChange) => {
            const options = [];
            for (let i = 0; i <= max; i++) {
                options.push({ value: i, label: `${i}` });
            }
            return new Row({
                mainAxisSize: MainAxisSize.min,
                children: [
                    new Container({
                        tag: 'select',
                        attrs: { value },
                        style: {
                            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                            fontSize: '21px',
                            border: 'none',
                            background: 'transparent',
                            textAlign: 'center',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                        },
                        events: { change: (e) => onChange(parseInt(e.target.value)) },
                        children: options.map(o => new Container({
                            tag: 'option',
                            attrs: { value: o.value, selected: o.value === value },
                            children: [o.label],
                        })),
                    }),
                    new Text(` ${label} `, { style: { fontSize: 17, color: CupertinoColors.label } }),
                ],
            });
        };

        const parts = [];
        if (showHours) {
            parts.push(makeSelect(this._hours, 23, 'hours', (v) => {
                this.setState(() => { this._hours = v; });
                this._emitDuration();
            }));
        }
        if (showMinutes) {
            parts.push(makeSelect(this._minutes, 59, 'min', (v) => {
                this.setState(() => { this._minutes = v; });
                this._emitDuration();
            }));
        }
        if (showSeconds) {
            parts.push(makeSelect(this._seconds, 59, 'sec', (v) => {
                this.setState(() => { this._seconds = v; });
                this._emitDuration();
            }));
        }

        return new Container({
            height: 216,
            decoration: new BoxDecoration({ color: bgColor }),
            child: new Center({
                child: new Row({
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: parts,
                }),
            }),
        });
    }
}
