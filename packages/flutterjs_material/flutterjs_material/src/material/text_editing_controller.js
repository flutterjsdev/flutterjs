/**
 * TextEditingController - Controller for managing TextField value
 */
class TextEditingController {
    constructor({ text = '' } = {}) {
        this.text = text;
        this.listeners = new Set();
        this.selection = { start: 0, end: 0 };
    }

    get value() {
        return {
            text: this.text,
            selection: this.selection
        };
    }

    set value(newValue) {
        if (typeof newValue === 'string') {
            this.text = newValue;
        } else {
            this.text = newValue.text || '';
            this.selection = newValue.selection || { start: 0, end: 0 };
        }
        this.notifyListeners();
    }

    setText(text) {
        this.text = text;
        this.notifyListeners();
    }

    clear() {
        this.text = '';
        this.selection = { start: 0, end: 0 };
        this.notifyListeners();
    }

    addListener(listener) {
        this.listeners.add(listener);
    }

    removeListener(listener) {
        this.listeners.delete(listener);
    }

    notifyListeners() {
        for (const listener of this.listeners) {
            listener();
        }
    }

    dispose() {
        this.listeners.clear();
    }
}

export { TextEditingController };
