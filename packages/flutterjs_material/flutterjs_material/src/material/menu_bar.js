// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget,State } from '../core/widget_element.js';
import { Row } from '../widgets/widgets.js';

export class MenuBar extends StatefulWidget {
    constructor({
        key,
        style,
        children = [],
        clipBehavior,
    } = {}) {
        super(key);
        this.style = style;
        this.children = children;
        this.clipBehavior = clipBehavior;
    }

    createState() {
        return new MenuBarState();
    }
}

class MenuBarState extends State {
    build(context) {
        // MenuBar applies MenuTheme and renders children in a Row
        return new Row({
            children: this.widget.children
        });
    }
}
