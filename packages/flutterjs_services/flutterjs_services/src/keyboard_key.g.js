// Flutter services/keyboard_key.g.dart → JS (abbreviated — key constants)

export class KeyboardKey {
  constructor({ debugName = null, keyId }) {
    this.debugName = debugName;
    this.keyId = keyId;
  }
  toString() { return this.debugName ?? `KeyboardKey(0x${this.keyId.toString(16)})`; }
}

export class PhysicalKeyboardKey extends KeyboardKey {
  constructor({ debugName, usbHidUsage }) {
    super({ debugName, keyId: usbHidUsage });
    this.usbHidUsage = usbHidUsage;
  }

  static findKeyByCode(usageCode) {
    return PhysicalKeyboardKey._codeMap.get(usageCode) ?? null;
  }

  // Common physical keys
  static get none()            { return new PhysicalKeyboardKey({ debugName: 'none', usbHidUsage: 0x000000 }); }
  static get hyper()           { return new PhysicalKeyboardKey({ debugName: 'Hyper', usbHidUsage: 0x00010082 }); }
  static get superKey()        { return new PhysicalKeyboardKey({ debugName: 'Super', usbHidUsage: 0x00010083 }); }
  static get escape()          { return new PhysicalKeyboardKey({ debugName: 'Escape', usbHidUsage: 0x00070029 }); }
  static get enter()           { return new PhysicalKeyboardKey({ debugName: 'Enter', usbHidUsage: 0x00070028 }); }
  static get space()           { return new PhysicalKeyboardKey({ debugName: 'Space', usbHidUsage: 0x0007002c }); }
  static get tab()             { return new PhysicalKeyboardKey({ debugName: 'Tab', usbHidUsage: 0x0007002b }); }
  static get backspace()       { return new PhysicalKeyboardKey({ debugName: 'Backspace', usbHidUsage: 0x0007002a }); }
  static get delete()          { return new PhysicalKeyboardKey({ debugName: 'Delete', usbHidUsage: 0x0007004c }); }
  static get arrowLeft()       { return new PhysicalKeyboardKey({ debugName: 'Arrow Left', usbHidUsage: 0x00070050 }); }
  static get arrowRight()      { return new PhysicalKeyboardKey({ debugName: 'Arrow Right', usbHidUsage: 0x0007004f }); }
  static get arrowUp()         { return new PhysicalKeyboardKey({ debugName: 'Arrow Up', usbHidUsage: 0x00070052 }); }
  static get arrowDown()       { return new PhysicalKeyboardKey({ debugName: 'Arrow Down', usbHidUsage: 0x00070051 }); }
  static get home()            { return new PhysicalKeyboardKey({ debugName: 'Home', usbHidUsage: 0x0007004a }); }
  static get end()             { return new PhysicalKeyboardKey({ debugName: 'End', usbHidUsage: 0x0007004d }); }
  static get pageUp()          { return new PhysicalKeyboardKey({ debugName: 'Page Up', usbHidUsage: 0x0007004b }); }
  static get pageDown()        { return new PhysicalKeyboardKey({ debugName: 'Page Down', usbHidUsage: 0x0007004e }); }
  static get shiftLeft()       { return new PhysicalKeyboardKey({ debugName: 'Shift Left', usbHidUsage: 0x000700e1 }); }
  static get shiftRight()      { return new PhysicalKeyboardKey({ debugName: 'Shift Right', usbHidUsage: 0x000700e5 }); }
  static get controlLeft()     { return new PhysicalKeyboardKey({ debugName: 'Control Left', usbHidUsage: 0x000700e0 }); }
  static get controlRight()    { return new PhysicalKeyboardKey({ debugName: 'Control Right', usbHidUsage: 0x000700e4 }); }
  static get altLeft()         { return new PhysicalKeyboardKey({ debugName: 'Alt Left', usbHidUsage: 0x000700e2 }); }
  static get altRight()        { return new PhysicalKeyboardKey({ debugName: 'Alt Right', usbHidUsage: 0x000700e6 }); }
  static get metaLeft()        { return new PhysicalKeyboardKey({ debugName: 'Meta Left', usbHidUsage: 0x000700e3 }); }
  static get metaRight()       { return new PhysicalKeyboardKey({ debugName: 'Meta Right', usbHidUsage: 0x000700e7 }); }
  static get capsLock()        { return new PhysicalKeyboardKey({ debugName: 'Caps Lock', usbHidUsage: 0x00070039 }); }
  static get numLock()         { return new PhysicalKeyboardKey({ debugName: 'Num Lock', usbHidUsage: 0x00070053 }); }
  static get scrollLock()      { return new PhysicalKeyboardKey({ debugName: 'Scroll Lock', usbHidUsage: 0x00070047 }); }
  static get f1()              { return new PhysicalKeyboardKey({ debugName: 'F1', usbHidUsage: 0x0007003a }); }
  static get f2()              { return new PhysicalKeyboardKey({ debugName: 'F2', usbHidUsage: 0x0007003b }); }
  static get f3()              { return new PhysicalKeyboardKey({ debugName: 'F3', usbHidUsage: 0x0007003c }); }
  static get f4()              { return new PhysicalKeyboardKey({ debugName: 'F4', usbHidUsage: 0x0007003d }); }
  static get f5()              { return new PhysicalKeyboardKey({ debugName: 'F5', usbHidUsage: 0x0007003e }); }
  static get f6()              { return new PhysicalKeyboardKey({ debugName: 'F6', usbHidUsage: 0x0007003f }); }
  static get f7()              { return new PhysicalKeyboardKey({ debugName: 'F7', usbHidUsage: 0x00070040 }); }
  static get f8()              { return new PhysicalKeyboardKey({ debugName: 'F8', usbHidUsage: 0x00070041 }); }
  static get f9()              { return new PhysicalKeyboardKey({ debugName: 'F9', usbHidUsage: 0x00070042 }); }
  static get f10()             { return new PhysicalKeyboardKey({ debugName: 'F10', usbHidUsage: 0x00070043 }); }
  static get f11()             { return new PhysicalKeyboardKey({ debugName: 'F11', usbHidUsage: 0x00070044 }); }
  static get f12()             { return new PhysicalKeyboardKey({ debugName: 'F12', usbHidUsage: 0x00070045 }); }
}
PhysicalKeyboardKey._codeMap = new Map();

export class LogicalKeyboardKey extends KeyboardKey {
  constructor({ debugName, keyId }) {
    super({ debugName, keyId });
  }

  static findKeyByKeyId(keyId) {
    return LogicalKeyboardKey._keyMap.get(keyId) ?? null;
  }

  // Common logical keys
  static get none()          { return new LogicalKeyboardKey({ debugName: 'none', keyId: 0x00000000000 }); }
  static get escape()        { return new LogicalKeyboardKey({ debugName: 'Escape', keyId: 0x10000001b }); }
  static get enter()         { return new LogicalKeyboardKey({ debugName: 'Enter', keyId: 0x10000000d }); }
  static get tab()           { return new LogicalKeyboardKey({ debugName: 'Tab', keyId: 0x100000009 }); }
  static get space()         { return new LogicalKeyboardKey({ debugName: 'Space', keyId: 0x100000020 }); }
  static get backspace()     { return new LogicalKeyboardKey({ debugName: 'Backspace', keyId: 0x100000008 }); }
  static get delete()        { return new LogicalKeyboardKey({ debugName: 'Delete', keyId: 0x10000007f }); }
  static get arrowLeft()     { return new LogicalKeyboardKey({ debugName: 'Arrow Left', keyId: 0x100000100 }); }
  static get arrowRight()    { return new LogicalKeyboardKey({ debugName: 'Arrow Right', keyId: 0x100000101 }); }
  static get arrowUp()       { return new LogicalKeyboardKey({ debugName: 'Arrow Up', keyId: 0x100000102 }); }
  static get arrowDown()     { return new LogicalKeyboardKey({ debugName: 'Arrow Down', keyId: 0x100000103 }); }
  static get home()          { return new LogicalKeyboardKey({ debugName: 'Home', keyId: 0x100000104 }); }
  static get end()           { return new LogicalKeyboardKey({ debugName: 'End', keyId: 0x100000105 }); }
  static get pageUp()        { return new LogicalKeyboardKey({ debugName: 'Page Up', keyId: 0x100000106 }); }
  static get pageDown()      { return new LogicalKeyboardKey({ debugName: 'Page Down', keyId: 0x100000107 }); }
  static get shift()         { return new LogicalKeyboardKey({ debugName: 'Shift', keyId: 0x100000201 }); }
  static get shiftLeft()     { return new LogicalKeyboardKey({ debugName: 'Shift Left', keyId: 0x100000202 }); }
  static get shiftRight()    { return new LogicalKeyboardKey({ debugName: 'Shift Right', keyId: 0x100000203 }); }
  static get control()       { return new LogicalKeyboardKey({ debugName: 'Control', keyId: 0x100000205 }); }
  static get controlLeft()   { return new LogicalKeyboardKey({ debugName: 'Control Left', keyId: 0x100000206 }); }
  static get controlRight()  { return new LogicalKeyboardKey({ debugName: 'Control Right', keyId: 0x100000207 }); }
  static get alt()           { return new LogicalKeyboardKey({ debugName: 'Alt', keyId: 0x100000209 }); }
  static get altLeft()       { return new LogicalKeyboardKey({ debugName: 'Alt Left', keyId: 0x10000020a }); }
  static get altRight()      { return new LogicalKeyboardKey({ debugName: 'Alt Right', keyId: 0x10000020b }); }
  static get meta()          { return new LogicalKeyboardKey({ debugName: 'Meta', keyId: 0x10000020d }); }
  static get metaLeft()      { return new LogicalKeyboardKey({ debugName: 'Meta Left', keyId: 0x10000020e }); }
  static get metaRight()     { return new LogicalKeyboardKey({ debugName: 'Meta Right', keyId: 0x10000020f }); }
  static get capsLock()      { return new LogicalKeyboardKey({ debugName: 'Caps Lock', keyId: 0x100000301 }); }
  static get numLock()       { return new LogicalKeyboardKey({ debugName: 'Num Lock', keyId: 0x100000302 }); }
  static get scrollLock()    { return new LogicalKeyboardKey({ debugName: 'Scroll Lock', keyId: 0x100000303 }); }
  static get f1()            { return new LogicalKeyboardKey({ debugName: 'F1', keyId: 0x100000801 }); }
  static get f2()            { return new LogicalKeyboardKey({ debugName: 'F2', keyId: 0x100000802 }); }
  static get f3()            { return new LogicalKeyboardKey({ debugName: 'F3', keyId: 0x100000803 }); }
  static get f4()            { return new LogicalKeyboardKey({ debugName: 'F4', keyId: 0x100000804 }); }
  static get f5()            { return new LogicalKeyboardKey({ debugName: 'F5', keyId: 0x100000805 }); }
  static get f6()            { return new LogicalKeyboardKey({ debugName: 'F6', keyId: 0x100000806 }); }
  static get f7()            { return new LogicalKeyboardKey({ debugName: 'F7', keyId: 0x100000807 }); }
  static get f8()            { return new LogicalKeyboardKey({ debugName: 'F8', keyId: 0x100000808 }); }
  static get f9()            { return new LogicalKeyboardKey({ debugName: 'F9', keyId: 0x100000809 }); }
  static get f10()           { return new LogicalKeyboardKey({ debugName: 'F10', keyId: 0x10000080a }); }
  static get f11()           { return new LogicalKeyboardKey({ debugName: 'F11', keyId: 0x10000080b }); }
  static get f12()           { return new LogicalKeyboardKey({ debugName: 'F12', keyId: 0x10000080c }); }

  // Letter keys (generated from keyId = Unicode codepoint | 0x100000000)
  static keyA()  { return new LogicalKeyboardKey({ debugName: 'Key A', keyId: 0x100000061 }); }
  static keyZ()  { return new LogicalKeyboardKey({ debugName: 'Key Z', keyId: 0x10000007a }); }
}
LogicalKeyboardKey._keyMap = new Map();
