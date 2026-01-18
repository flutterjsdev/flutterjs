import { StatefulWidget } from '../core/widget_element.js';
import { Container } from '../material/container.js';

export class OverlayEntry {
    constructor({
        builder,
        opaque = false,
        maintainState = false,
    } = {}) {
        this.builder = builder;
        this.opaque = opaque;
        this.maintainState = maintainState;
        this._overlayState = null;
        this._id = Math.random().toString(36).substr(2, 9);
    }

    remove() {
        this._overlayState?.remove(this);
    }

    markNeedsBuild() {
        this._overlayState?.setState(() => { });
    }
}

export class Overlay extends StatefulWidget {
    constructor({
        key,
        initialEntries = [],
        clipBehavior,
    } = {}) {
        super(key);
        this.initialEntries = initialEntries;
    }

    static of(context) {
        // Simplified search
        return context.findAncestorStateOfType(OverlayState);
    }

    createState() {
        return new OverlayState();
    }
}

export class OverlayState extends StatefulWidget.State {
    constructor() {
        super();
        this._entries = [];
    }

    initState() {
        this._entries.push(...this.widget.initialEntries);
        this._entries.forEach(e => e._overlayState = this);
    }

    insert(entry, { below, above } = {}) {
        entry._overlayState = this;
        this.setState(() => {
            this._entries.push(entry);
        });
    }

    remove(entry) {
        this.setState(() => {
            const index = this._entries.indexOf(entry);
            if (index >= 0) {
                this._entries.splice(index, 1);
                entry._overlayState = null;
            }
        });
    }

    build(context) {
        // Just stack them. In Flutter there's Onstage/Offstage. 
        // We'll wrap in a Stack-like container if we had a Stack widget available here.
        // For now, absolute positioning via CSS might be needed in the render layer.
        // Returning Container with children.

        // This won't work perfectly without Stack, but prevents crash.
        // Since we don't have Stack in 'widgets' layer easily, we return a Container.
        // The render object for Overlay is complex.

        // Mock implementation:
        return new Container({
            child: null // Cannot really render entries without MultiChildRenderObjectWidget
        });
    }
}
