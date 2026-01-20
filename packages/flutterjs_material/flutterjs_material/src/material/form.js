import { StatefulWidget, State } from '../core/widget_element.js';
import { InheritedWidget } from '@flutterjs/runtime';

/**
 * Form - A container for grouping together multiple form fields
 */
class Form extends StatefulWidget {
    constructor({
        key = null,
        child,
        autovalidateMode = 'disabled', // disabled, always, onUserInteraction
        onChanged = null,
        onWillPop = null
    } = {}) {
        super(key);
        this.child = child;
        this.autovalidateMode = autovalidateMode;
        this.onChanged = onChanged;
        this.onWillPop = onWillPop;
    }

    createState() {
        return new FormState();
    }

    static of(context) {
        const scope = context.dependOnInheritedWidgetOfExactType(FormScope);
        return scope ? scope._formState : null;
    }
}

/**
 * FormState - State for Form
 */
class FormState extends State {
    constructor() {
        super();
        this._fields = new Set();
    }

    get fields() {
        return this._fields;
    }

    /**
     * Register a FormField with this Form
     */
    _register(field) {
        console.error('[FormState] Registering field', field);
        this._fields.add(field);
    }

    /**
     * Unregister a FormField
     */
    _unregister(field) {
        console.error('[FormState] Unregistering field', field);
        this._fields.delete(field);
    }

    /**
     * Validate all fields in the form
     * @returns {boolean} true if all fields are valid
     */
    validate() {
        console.error('[FormState] validate() called');
        this._forceRebuild();
        // In Flutter, validate() triggers validation on all fields and rebuilds the form if needed.
        // Here we iterate fields.

        let hasError = false;
        for (const field of this._fields) {
            if (!field.validate()) {
                hasError = true;
            }
        }
        return !hasError;
    }

    /**
     * Save all fields
     */
    save() {
        for (const field of this._fields) {
            field.save();
        }
    }

    /**
     * Reset all fields
     */
    reset() {
        for (const field of this._fields) {
            field.reset();
        }
        if (this.widget.onChanged) {
            this.widget.onChanged();
        }
    }

    _forceRebuild() {
        this.setState(() => { });
    }

    build(context) {
        // Pass this state down
        return new FormScope({
            formState: this,
            child: this.widget.child
        });
    }
}

/**
 * FormScope - InheritedWidget to pass FormState down
 */
class FormScope extends InheritedWidget {
    constructor({ formState, child } = {}) {
        super({ child });
        this._formState = formState;
    }

    get formState() {
        return this._formState;
    }

    updateShouldNotify(oldWidget) {
        return this._formState !== oldWidget._formState;
    }
}

export { Form, FormState };
