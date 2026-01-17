import { StatefulWidget, InheritedWidget } from '../core/widget_element.js';

class TabController {
    constructor({ initialIndex = 0, length, vsync } = {}) {
        this.index = initialIndex;
        this.length = length;
        this._listeners = [];
        // AnimationController would be initialized here with vsync
    }

    addListener(listener) {
        this._listeners.push(listener);
    }

    removeListener(listener) {
        this._listeners = this._listeners.filter(l => l !== listener);
    }

    animateTo(index, { duration, curve } = {}) {
        this.index = index;
        this._notifyListeners();
    }

    _notifyListeners() {
        this._listeners.forEach(l => l());
    }

    dispose() {
        this._listeners = [];
    }
}

class DefaultTabController extends StatefulWidget {
    constructor({ key, length, initialIndex = 0, child } = {}) {
        super(key);
        this.length = length;
        this.initialIndex = initialIndex;
        this.child = child;
    }

    createState() {
        return new DefaultTabControllerState();
    }

    static of(context) {
        const scope = context.dependOnInheritedWidgetOfExactType(_TabControllerScope);
        return scope ? scope.controller : null;
    }
}

class DefaultTabControllerState extends StatefulWidget.State {
    initState() {
        super.initState();
        this.controller = new TabController({
            length: this.widget.length,
            initialIndex: this.widget.initialIndex
        });
    }

    dispose() {
        this.controller.dispose();
        super.dispose();
    }

    build(context) {
        return new _TabControllerScope({
            controller: this.controller,
            child: this.widget.child
        });
    }
}

class _TabControllerScope extends InheritedWidget {
    constructor({ controller, child, key } = {}) {
        super({ child, key });
        this.controller = controller;
    }

    updateShouldNotify(oldWidget) {
        return this.controller !== oldWidget.controller;
    }
}

export {
    TabController,
    DefaultTabController
};
