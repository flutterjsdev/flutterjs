import { StatefulWidget, State } from '../core/widget_element.js';
import { Container } from './container.js';
import { ButtonStyleButton } from './button_style_button.js';
import { GestureDetector } from './gesture_detector.js';

export class MenuController {
    constructor() {
        this._anchor = null;
    }

    _attach(anchor) {
        this._anchor = anchor;
    }

    _detach() {
        this._anchor = null;
    }

    open() {
        this._anchor?.open();
    }

    close() {
        this._anchor?.close();
    }

    get isOpen() {
        return this._anchor?.isOpen ?? false;
    }
}

export class MenuAnchor extends StatefulWidget {
    constructor({
        key,
        controller,
        childFocusNode,
        style,
        alignmentOffset,
        clipBehavior,
        menuChildren = [],
        builder,
        child,
    } = {}) {
        super(key);
        this.controller = controller;
        this.childFocusNode = childFocusNode;
        this.style = style;
        this.alignmentOffset = alignmentOffset;
        this.clipBehavior = clipBehavior;
        this.menuChildren = menuChildren;
        this.builder = builder; // (context, controller, child)
        this.child = child;
    }

    createState() {
        return new MenuAnchorState();
    }
}

class MenuAnchorState extends State {
    constructor() {
        super();
        this.isOpen = false;
        this._internalController = new MenuController();
    }

    get controller() {
        return this.widget.controller || this._internalController;
    }

    initState() {
        this.controller._attach(this);
    }

    dispose() {
        this.controller._detach();
        super.dispose();
    }

    open() {
        if (!this.isOpen) {
            this.setState(() => {
                this.isOpen = true;
            });
        }
    }

    close() {
        if (this.isOpen) {
            this.setState(() => {
                this.isOpen = false;
            });
        }
    }

    build(context) {
        let child = this.widget.child;
        if (this.widget.builder) {
            child = this.widget.builder(context, this.controller, this.widget.child);
        }

        // This is where the Overlay logic would live.
        // For now, we render the child.
        // If open, we render the menu.
        // Ideally the menu is in an Overlay. 
        // We will return a wrapper.

        return new Container({
            child: child // Simply returning child for now as Overlay isn't ready.
        });
    }
}

export class MenuItemButton extends ButtonStyleButton {
    constructor({
        key,
        onPressed,
        onHover,
        onFocusChange,
        focusNode,
        autofocus,
        style,
        shortcut,
        child,
        leadingIcon,
        trailingIcon,
        closeOnActivate = true,
    } = {}) {
        super({
            key,
            onPressed,
            onHover,
            onFocusChange,
            focusNode,
            autofocus,
            style,
            child // Should compose leading/child/trailing
        });
        this.leadingIcon = leadingIcon;
        this.trailingIcon = trailingIcon;
        this.closeOnActivate = closeOnActivate;
    }

    // Override build or rely on ButtonStyleButton structure
}

export class SubmenuButton extends StatefulWidget {
    constructor({
        key, // ...
        menuChildren = [],
        child
    } = {}) {
        super(key);
        this.menuChildren = menuChildren;
        this.child = child;
    }

    createState() {
        return new SubmenuButtonState();
    }
}

class SubmenuButtonState extends State {
    build(context) {
        return new MenuAnchor({
            menuChildren: this.widget.menuChildren,
            child: this.widget.child // Wrapped in visual button
        });
    }
}
