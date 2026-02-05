// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { IconButton } from './icon_button.js';
import { Icon, Icons } from './icon.js';
import { Navigator } from '../widgets/navigator.js';
import { Scaffold } from './scaffold.js';

class BackButtonIcon extends StatelessWidget {
    constructor({ key } = {}) {
        super(key);
    }
    build(context) {
        return new Icon(Icons.arrowBack);
    }
}

class BackButton extends StatelessWidget {
    constructor({ key, color, onPressed } = {}) {
        super(key);
        this.color = color;
        this.onPressed = onPressed;
    }
    build(context) {
        return new IconButton({
            icon: new BackButtonIcon(),
            color: this.color,
            tooltip: 'Back',
            onPressed: () => {
                if (this.onPressed) {
                    this.onPressed();
                } else {
                    Navigator.maybePop(context);
                }
            }
        });
    }
}

class CloseButton extends StatelessWidget {
    constructor({ key, color, onPressed } = {}) {
        super(key);
        this.color = color;
        this.onPressed = onPressed;
    }
    build(context) {
        return new IconButton({
            icon: new Icon(Icons.close),
            color: this.color,
            tooltip: 'Close',
            onPressed: () => {
                if (this.onPressed) {
                    this.onPressed();
                } else {
                    Navigator.maybePop(context);
                }
            }
        });
    }
}

class DrawerButton extends StatelessWidget {
    constructor({ key, color, onPressed } = {}) {
        super(key);
        this.color = color;
        this.onPressed = onPressed;
    }
    build(context) {
        return new IconButton({
            icon: new Icon(Icons.menu),
            color: this.color,
            tooltip: 'Open navigation menu',
            onPressed: () => {
                if (this.onPressed) {
                    this.onPressed();
                } else {
                    Scaffold.of(context).openDrawer();
                }
            }
        });
    }
}

class EndDrawerButton extends StatelessWidget {
    constructor({ key, color, onPressed } = {}) {
        super(key);
        this.color = color;
        this.onPressed = onPressed;
    }
    build(context) {
        return new IconButton({
            icon: new Icon(Icons.menu),
            color: this.color,
            tooltip: 'Open menu',
            onPressed: () => {
                if (this.onPressed) {
                    this.onPressed();
                } else {
                    Scaffold.of(context).openEndDrawer();
                }
            }
        });
    }
}

export {
    BackButton,
    BackButtonIcon,
    CloseButton,
    DrawerButton,
    EndDrawerButton
};
