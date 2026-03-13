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
 * A Material Design search anchor.
 *
 * SearchAnchor is the M3 search component that shows a search bar
 * which opens into a full search view with suggestions.
 */
export class SearchAnchor extends StatefulWidget {
    constructor({
        key,
        isFullScreen,
        searchController,
        viewBuilder,
        viewLeading,
        viewTrailing,
        viewHintText,
        viewBackgroundColor,
        viewElevation,
        viewSurfaceTintColor,
        viewSide,
        viewShape,
        headerTextStyle,
        headerHintStyle,
        dividerColor,
        viewConstraints,
        builder,
        suggestionsBuilder,
    } = {}) {
        super(key);
        this.isFullScreen = isFullScreen;
        this.searchController = searchController;
        this.viewBuilder = viewBuilder;
        this.viewLeading = viewLeading;
        this.viewTrailing = viewTrailing;
        this.viewHintText = viewHintText;
        this.viewBackgroundColor = viewBackgroundColor;
        this.viewElevation = viewElevation;
        this.builder = builder;
        this.suggestionsBuilder = suggestionsBuilder;
    }

    createState() {
        return new SearchAnchorState();
    }
}

class SearchAnchorState extends State {
    constructor() {
        super();
        this.isOpen = false;
        this.searchText = '';
    }

    openView() {
        this.setState(() => {
            this.isOpen = true;
        });
    }

    closeView(selectedText) {
        this.setState(() => {
            this.isOpen = false;
            if (selectedText != null) {
                this.searchText = selectedText;
            }
        });
    }

    build(context) {
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        if (this.isOpen) {
            // Open view with suggestions
            const suggestions = this.widget.suggestionsBuilder
                ? this.widget.suggestionsBuilder(context, { text: this.searchText })
                : [];

            return new Container({
                decoration: new BoxDecoration({
                    color: this.widget.viewBackgroundColor || colorScheme.surfaceContainerHigh || '#ECE6F0',
                    borderRadius: BorderRadius.circular(28),
                }),
                child: new Column({
                    mainAxisSize: MainAxisSize.min,
                    children: [
                        // Search bar header
                        new Container({
                            padding: EdgeInsets.symmetric({ horizontal: 8, vertical: 4 }),
                            child: new Row({
                                children: [
                                    this.widget.viewLeading || new GestureDetector({
                                        onTap: () => this.closeView(null),
                                        child: new Icon(Icons.arrowBack),
                                    }),
                                    new SizedBox({ width: 8 }),
                                    new Container({
                                        child: new TextField({
                                            value: this.searchText,
                                            decoration: new InputDecoration({
                                                hintText: this.widget.viewHintText || 'Search...',
                                                border: 'none',
                                            }),
                                            onChanged: (value) => {
                                                this.setState(() => {
                                                    this.searchText = value;
                                                });
                                            },
                                        }),
                                    }),
                                ],
                            }),
                        }),
                        // Suggestions
                        ...suggestions,
                    ],
                }),
            });
        }

        // Closed state: render the builder (typically a SearchBar)
        if (this.widget.builder) {
            return this.widget.builder(context, {
                openView: () => this.openView(),
                closeView: (text) => this.closeView(text),
                text: this.searchText,
            });
        }

        // Default: simple search bar
        return new SearchBar({
            onTap: () => this.openView(),
            hintText: 'Search...',
        });
    }
}

/**
 * A Material Design search bar.
 *
 * Typically used as the anchor for SearchAnchor.
 */
export class SearchBar extends StatelessWidget {
    constructor({
        key,
        controller,
        onTap,
        onChanged,
        onSubmitted,
        leading,
        trailing,
        hintText,
        constraints,
        elevation,
        backgroundColor,
        shadowColor,
        surfaceTintColor,
        side,
        shape,
        padding,
        textStyle,
        hintStyle,
    } = {}) {
        super(key);
        this.controller = controller;
        this.onTap = onTap;
        this.onChanged = onChanged;
        this.onSubmitted = onSubmitted;
        this.leading = leading;
        this.trailing = trailing;
        this.hintText = hintText;
        this.constraints = constraints;
        this.elevation = elevation;
        this.backgroundColor = backgroundColor;
        this.padding = padding;
    }

    build(context) {
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        const bgColor = this.backgroundColor || colorScheme.surfaceContainerHigh || '#ECE6F0';
        const onSurfaceColor = colorScheme.onSurface || '#1C1B1F';
        const onSurfaceVariantColor = colorScheme.onSurfaceVariant || '#49454F';

        const children = [];

        // Leading icon
        children.push(this.leading || new Icon(Icons.search, { color: onSurfaceColor }));
        children.push(new SizedBox({ width: 12 }));

        // Hint text / input
        if (this.onChanged) {
            children.push(new TextField({
                controller: this.controller,
                decoration: new InputDecoration({
                    hintText: this.hintText || 'Search',
                    border: 'none',
                }),
                onChanged: this.onChanged,
                onSubmitted: this.onSubmitted,
            }));
        } else {
            children.push(new Text(this.hintText || 'Search', {
                style: { color: onSurfaceVariantColor },
            }));
        }

        // Trailing icons
        if (this.trailing) {
            children.push(new SizedBox({ width: 12 }));
            if (Array.isArray(this.trailing)) {
                children.push(...this.trailing);
            } else {
                children.push(this.trailing);
            }
        }

        const searchBar = new Container({
            padding: this.padding || EdgeInsets.symmetric({ horizontal: 16, vertical: 12 }),
            decoration: new BoxDecoration({
                color: bgColor,
                borderRadius: BorderRadius.circular(28),
                boxShadow: [{ color: 'rgba(0,0,0,0.08)', offsetX: 0, offsetY: 1, blurRadius: 3 }],
            }),
            child: new Row({
                children: children,
            }),
        });

        if (this.onTap) {
            return new GestureDetector({
                onTap: this.onTap,
                child: searchBar,
            });
        }

        return searchBar;
    }
}
