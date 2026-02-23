// Flutter services/hardware_keyboard.dart → JS

export const KeyboardLockMode = Object.freeze({
  numLock:    'numLock',
  scrollLock: 'scrollLock',
  capsLock:   'capsLock',
});

export const KeyDataTransitMode = Object.freeze({
  rawKeyData:             'rawKeyData',
  keyDataThenRawKeyData:  'keyDataThenRawKeyData',
});

export class KeyEvent {
  constructor({ physicalKey, logicalKey, character = null, timeStamp = null, synthesized = false, deviceType = null }) {
    this.physicalKey = physicalKey;
    this.logicalKey = logicalKey;
    this.character = character;
    this.timeStamp = timeStamp ?? Date.now();
    this.synthesized = synthesized;
    this.deviceType = deviceType;
  }
}

export class KeyDownEvent extends KeyEvent {
  constructor(args) { super(args); }
}

export class KeyUpEvent extends KeyEvent {
  constructor(args) { super(args); }
}

export class KeyRepeatEvent extends KeyEvent {
  constructor(args) { super(args); }
}

export class HardwareKeyboard {
  constructor() {
    this._pressedKeys = new Set();
    this._handlers = [];
    this._lockModes = new Set();
  }

  static get instance() {
    if (!HardwareKeyboard._instance) {
      HardwareKeyboard._instance = new HardwareKeyboard();
    }
    return HardwareKeyboard._instance;
  }

  get physicalKeysPressed() { return new Set(this._pressedKeys); }
  get logicalKeysPressed() { return new Set(this._pressedKeys); }
  get lockModesEnabled() { return new Set(this._lockModes); }

  isPhysicalKeyPressed(key) { return this._pressedKeys.has(key); }
  isLogicalKeyPressed(key) { return this._pressedKeys.has(key); }
  isModifierPressed(key) { return this._pressedKeys.has(key); }

  addHandler(handler) { this._handlers.push(handler); }
  removeHandler(handler) {
    const i = this._handlers.indexOf(handler);
    if (i !== -1) this._handlers.splice(i, 1);
  }

  handleKeyData(data) {
    return this._handlers.some(h => h(data));
  }
}

export class KeyMessage {
  constructor({ events, rawEvent = null }) {
    this.events = events;
    this.rawEvent = rawEvent;
  }
}

export class KeyEventManager {
  constructor({ hardwareKeyboard, rawKeyboard = null }) {
    this.hardwareKeyboard = hardwareKeyboard;
    this.rawKeyboard = rawKeyboard;
  }

  handleKeyData(data) {
    return this.hardwareKeyboard.handleKeyData(data);
  }

  handleRawKeyMessage(message) {
    return Promise.resolve({ handled: false });
  }
}

export function _keyboardDebug(messageFunc, detailsFunc = null) {
  // No-op — debug logging only in debug builds
}
