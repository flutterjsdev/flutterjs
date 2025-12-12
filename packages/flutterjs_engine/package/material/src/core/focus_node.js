class FocusNode {
  constructor() {
    this._hasFocus = false;
    this._listeners = new Set();
    this._parent = null;
    this._children = new Set();
  }

  get hasFocus() {
    return this._hasFocus;
  }

  requestFocus() {
    if (this._hasFocus) return;
    this._hasFocus = true;
    this._notifyListeners();
  }

  unfocus() {
    if (!this._hasFocus) return;
    this._hasFocus = false;
    this._notifyListeners();
  }

  addListener(listener) {
    this._listeners.add(listener);
  }

  removeListener(listener) {
    this._listeners.delete(listener);
  }

  _notifyListeners() {
    for (const listener of this._listeners) {
      listener(this._hasFocus);
    }
  }

  dispose() {
    this._hasFocus = false;
    this._listeners.clear();
    this._parent = null;
    this._children.clear();
  }
}

class FocusManager {
  constructor() {
    this._currentFocus = null;
    this._rootNode = new FocusNode();
    this._focusHistory = [];
  }

  get currentFocus() {
    return this._currentFocus;
  }

  setFocus(node) {
    if (this._currentFocus === node) return;

    if (this._currentFocus) {
      this._currentFocus.unfocus();
    }

    this._currentFocus = node;
    if (node) {
      node.requestFocus();
      this._focusHistory.push(node);
    }
  }

  previousFocus() {
    if (this._focusHistory.length > 1) {
      this._focusHistory.pop();
      const prev = this._focusHistory[this._focusHistory.length - 1];
      this.setFocus(prev);
    }
  }

  clearFocus() {
    this.setFocus(null);
  }

  registerGlobalHandlers() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          this.previousFocus();
        } else {
          // Next focus - implement later
        }
      }
    });
  }

  dispose() {
    this._currentFocus = null;
    this._focusHistory = [];
    this._rootNode.dispose();
  }
}
