// Flutter services/raw_keyboard_web.dart → JS

export class RawKeyEventDataWeb {
  constructor({ code, key, location = 0, metaState = 0, keyCode = 0 }) {
    this.code = code;
    this.key = key;
    this.location = location;
    this.metaState = metaState;
    this.keyCode = keyCode;
  }

  // Modifier key flags
  static get modifierAlt()      { return 0x02; }
  static get modifierShift()    { return 0x01; }
  static get modifierControl()  { return 0x04; }
  static get modifierMeta()     { return 0x08; }
  static get modifierCapsLock() { return 0x10; }
  static get modifierNumLock()  { return 0x20; }
  static get modifierScrollLock(){ return 0x40; }
}

export function _unicodeChar(key) {
  if (key.length === 1) return key.codePointAt(0);
  return 0;
}
