// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { Row, Column, SizedBox } from '../widgets/widgets.js';
import { Icon, Icons } from './icon.js';
import { GestureDetector } from './gesture_detector.js';
import { TextField } from './text_field.js';
import { Text } from './text.js';
import { InputDecoration } from './input_decorator.js';
import { BorderRadius } from '../utils/border_radius.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { MainAxisSize, CrossAxisAlignment } from '../utils/utils.js';
import { Theme } from './theme.js';

/**
 * A Material Design dropdown menu.
 *
 * DropdownMenu is the M3 replacement for DropdownButton.
 * It shows a text field that opens a menu of options when tapped.
 */
export class DropdownMenu extends StatefulWidget {
    constructor({
        key,
        enabled = true,
        width,
        menuHeight,
        leadingIcon,
        trailingIcon,
        label,
        hintText,
        helperText,
        errorText,
        selectedTrailingIcon,
        enableFilter = false,
        enableSearch = true,
        textStyle,
        inputDecorationTheme,
        menuStyle,
        controller,
        initialSelection,
        onSelected,
        dropdownMenuEntries = [],
        requestFocusOnTap,
    } = {}) {
        super(key);
        this.enabled = enabled;
        this.width = width;
        this.menuHeight = menuHeight;
        this.leadingIcon = leadingIcon;
        this.trailingIcon = trailingIcon;
        this.label = label;
        this.hintText = hintText;
        this.helperText = helperText;
        this.errorText = errorText;
        this.selectedTrailingIcon = selectedTrailingIcon;
        this.enableFilter = enableFilter;
        this.enableSearch = enableSearch;
        this.textStyle = textStyle;
        this.controller = controller;
        this.initialSelection = initialSelection;
        this.onSelected = onSelected;
        this.dropdownMenuEntries = dropdownMenuEntries;
    }

    createState() {
        return new DropdownMenuState();
    }
}

/**
 * An option in a DropdownMenu.
 */
export class DropdownMenuEntry {
    constructor({
        value,
        label,
        leadingIcon,
        trailingIcon,
        enabled = true,
        style,
    } = {}) {
        this.value = value;
        this.label = label;
        this.leadingIcon = leadingIcon;
        this.trailingIcon = trailingIcon;
        this.enabled = enabled;
        this.style = style;
    }
}

class DropdownMenuState extends State {
    constructor() {
        super();
        this.isOpen = false;
        this.selectedValue = null;
        this.filterText = '';
    }

    initState() {
        this.selectedValue = this.widget.initialSelection;
        // Set initial text from the selected entry
        if (this.selectedValue != null) {
            const entry = this.widget.dropdownMenuEntries.find(e => e.value === this.selectedValue);
            if (entry) {
                this.filterText = entry.label || '';
            }
        }
    }

    _toggleMenu() {
        if (!this.widget.enabled) return;
        this.setState(() => {
            this.isOpen = !this.isOpen;
        });
    }

    _selectEntry(entry) {
        this.setState(() => {
            this.selectedValue = entry.value;
            this.filterText = entry.label || '';
            this.isOpen = false;
        });
        this.widget.onSelected?.(entry.value);
    }

    build(context) {
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        const surfaceColor = colorScheme.surfaceContainerHighest || '#E6E0E9';
        const onSurfaceColor = colorScheme.onSurface || '#1C1B1F';
        const primaryColor = colorScheme.primary || '#6750A4';

        // Filtered entries
        let entries = this.widget.dropdownMenuEntries;
        if (this.widget.enableFilter && this.filterText) {
            entries = entries.filter(e =>
                (e.label || '').toLowerCase().includes(this.filterText.toLowerCase())
            );
        }

        // Trailing icon
        const trailingIcon = this.isOpen
            ? (this.widget.selectedTrailingIcon || new Icon(Icons.arrowDropUp, { color: onSurfaceColor }))
            : (this.widget.trailingIcon || new Icon(Icons.arrowDropDown, { color: onSurfaceColor }));

        // Text field
        const textField = new GestureDetector({
            onTap: () => this._toggleMenu(),
            child: new Container({
                width: this.widget.width,
                child: new TextField({
                    controller: this.widget.controller,
                    value: this.filterText,
                    readOnly: !this.widget.enableFilter,
                    decoration: new InputDecoration({
                        labelText: this.widget.label ? (typeof this.widget.label === 'string' ? this.widget.label : undefined) : undefined,
                        hintText: this.widget.hintText,
                        helperText: this.widget.helperText,
                        errorText: this.widget.errorText,
                        prefixIcon: this.widget.leadingIcon,
                        suffixIcon: trailingIcon,
                    }),
                    onChanged: this.widget.enableFilter
                        ? (value) => {
                            this.setState(() => {
                                this.filterText = value;
                                this.isOpen = true;
                            });
                        }
                        : undefined,
                }),
            }),
        });

        // Menu
        const menuChildren = [];
        if (this.isOpen) {
            const menuEntries = entries.map(entry => {
                const isSelected = this.selectedValue === entry.value;
                const entryChildren = [];

                if (entry.leadingIcon) {
                    entryChildren.push(entry.leadingIcon);
                    entryChildren.push(new SizedBox({ width: 12 }));
                }

                entryChildren.push(new Text(entry.label || '', {
                    style: {
                        color: isSelected ? primaryColor : onSurfaceColor,
                        fontWeight: isSelected ? '500' : '400',
                    }
                }));

                if (entry.trailingIcon) {
                    entryChildren.push(new SizedBox({ width: 12 }));
                    entryChildren.push(entry.trailingIcon);
                }

                return new GestureDetector({
                    onTap: entry.enabled ? () => this._selectEntry(entry) : null,
                    child: new Container({
                        width: this.widget.width,
                        padding: EdgeInsets.symmetric({ horizontal: 16, vertical: 12 }),
                        decoration: new BoxDecoration({
                            color: isSelected ? (colorScheme.secondaryContainer || '#E8DEF8') : 'transparent',
                        }),
                        child: new Row({
                            children: entryChildren,
                        }),
                    }),
                });
            });

            menuChildren.push(new Container({
                constraints: this.widget.menuHeight ? { maxHeight: this.widget.menuHeight } : undefined,
                decoration: new BoxDecoration({
                    color: surfaceColor,
                    borderRadius: BorderRadius.circular(4),
                    boxShadow: [{ color: 'rgba(0,0,0,0.12)', offsetX: 0, offsetY: 2, blurRadius: 6 }],
                }),
                child: new Column({
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: menuEntries,
                }),
            }));
        }

        return new Column({
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
                textField,
                ...menuChildren,
            ],
        });
    }
}
