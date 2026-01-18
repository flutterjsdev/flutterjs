import { StatefulWidget,State, InheritedWidget } from '../core/widget_element.js';

class _ScaffoldMessengerScope extends InheritedWidget {
    constructor({ state, child, key } = {}) {
        super({ child, key });
        this.messengerState = state;
    }

    updateShouldNotify(oldWidget) {
        return this.messengerState !== oldWidget.messengerState;
    }
}

export class ScaffoldMessenger extends StatefulWidget {
    constructor({ key, child } = {}) {
        super(key);
        this.child = child;
    }

    createState() {
        return new ScaffoldMessengerState();
    }

    static of(context) {
        const scope = context.dependOnInheritedWidgetOfExactType(_ScaffoldMessengerScope);
        if (!scope) {
            // In Flutter this might throw or return generic root
            // For now return null or mock
            return null;
        }
        return scope.messengerState;
    }
}

export class ScaffoldMessengerState extends State {
    constructor() {
        super();
        this._snackBars = [];
    }

    showSnackBar(snackBar) {
        // Logic to show snackbar
        // In this architecture, we need a way to overlay it on the screen.
        // Similar to Overlay logic.
        // For now, assume console or simple append if we had DOM access via context?
        // Wait, Scaffold uses ScaffoldMessenger to show SnackBars.
        // We will just store it for now.

        console.log('ScaffoldMessenger: showSnackBar', snackBar);
        // this.setState(() => this._snackBars.push(snackBar));
        // And then render them in build... relative to child (Stack)?

        return {
            close: () => { console.log('SnackBar close'); } // Mock controller
        };
    }

    hideCurrentSnackBar() { }
    removeCurrentSnackBar() { }
    clearSnackBars() { }

    build(context) {
        return new _ScaffoldMessengerScope({
            state: this,
            child: this.widget.child
        });
    }
}
