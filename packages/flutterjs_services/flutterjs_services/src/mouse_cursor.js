// Flutter services/mouse_cursor.dart → JS

export class MouseCursorSession {
  constructor(cursor, device) {
    this.cursor = cursor;
    this.device = device;
  }
  activate() { throw new Error('activate not implemented'); }
  dispose() {}
}

export class MouseCursor {
  createSession(device) { throw new Error('createSession not implemented'); }
  get debugDescription() { return this.constructor.name; }
}

export class _NoopMouseCursorSession extends MouseCursorSession {
  activate() {}
}

export class _NoopMouseCursor extends MouseCursor {
  createSession(device) { return new _NoopMouseCursorSession(this, device); }
}

export class _SystemMouseCursorSession extends MouseCursorSession {
  activate() {
    if (typeof document !== 'undefined') {
      document.body.style.cursor = this.cursor.kind;
    }
  }
  dispose() {
    if (typeof document !== 'undefined') {
      document.body.style.cursor = '';
    }
  }
}

export class SystemMouseCursor extends MouseCursor {
  constructor(kind) {
    super();
    this.kind = kind;
  }
  createSession(device) { return new _SystemMouseCursorSession(this, device); }
  get debugDescription() { return `SystemMouseCursor(${this.kind})`; }
}

export class SystemMouseCursors {
  static get none()               { return new SystemMouseCursor('none'); }
  static get basic()              { return new SystemMouseCursor('default'); }
  static get click()              { return new SystemMouseCursor('pointer'); }
  static get forbidden()          { return new SystemMouseCursor('not-allowed'); }
  static get wait()               { return new SystemMouseCursor('wait'); }
  static get progress()           { return new SystemMouseCursor('progress'); }
  static get contextMenu()        { return new SystemMouseCursor('context-menu'); }
  static get help()               { return new SystemMouseCursor('help'); }
  static get text()               { return new SystemMouseCursor('text'); }
  static get verticalText()       { return new SystemMouseCursor('vertical-text'); }
  static get cell()               { return new SystemMouseCursor('cell'); }
  static get precise()            { return new SystemMouseCursor('crosshair'); }
  static get move()               { return new SystemMouseCursor('move'); }
  static get grab()               { return new SystemMouseCursor('grab'); }
  static get grabbing()           { return new SystemMouseCursor('grabbing'); }
  static get noDrop()             { return new SystemMouseCursor('no-drop'); }
  static get alias()              { return new SystemMouseCursor('alias'); }
  static get copy()               { return new SystemMouseCursor('copy'); }
  static get disappearing()       { return new SystemMouseCursor('none'); }
  static get allScroll()          { return new SystemMouseCursor('all-scroll'); }
  static get resizeLeftRight()    { return new SystemMouseCursor('ew-resize'); }
  static get resizeUpDown()       { return new SystemMouseCursor('ns-resize'); }
  static get resizeUpLeftDownRight(){ return new SystemMouseCursor('nwse-resize'); }
  static get resizeUpRightDownLeft(){ return new SystemMouseCursor('nesw-resize'); }
  static get resizeUp()           { return new SystemMouseCursor('n-resize'); }
  static get resizeDown()         { return new SystemMouseCursor('s-resize'); }
  static get resizeLeft()         { return new SystemMouseCursor('w-resize'); }
  static get resizeRight()        { return new SystemMouseCursor('e-resize'); }
  static get resizeUpLeft()       { return new SystemMouseCursor('nw-resize'); }
  static get resizeUpRight()      { return new SystemMouseCursor('ne-resize'); }
  static get resizeDownLeft()     { return new SystemMouseCursor('sw-resize'); }
  static get resizeDownRight()    { return new SystemMouseCursor('se-resize'); }
  static get resizeColumn()       { return new SystemMouseCursor('col-resize'); }
  static get resizeRow()          { return new SystemMouseCursor('row-resize'); }
  static get zoomIn()             { return new SystemMouseCursor('zoom-in'); }
  static get zoomOut()            { return new SystemMouseCursor('zoom-out'); }
}

export class MouseCursorSession2 extends MouseCursorSession {}
export class _DeferringMouseCursor extends MouseCursor {
  constructor(cursors) {
    super();
    this._cursors = cursors;
  }
  createSession(device) {
    for (const cursor of this._cursors) {
      if (cursor != null) return cursor.createSession(device);
    }
    return new _NoopMouseCursorSession(this, device);
  }
}

export class MouseCursorManager {
  constructor({ fallbackMouseCursor }) {
    this.fallbackMouseCursor = fallbackMouseCursor;
    this._currentSessions = new Map();
  }

  handleDeviceCursorUpdate(device, cursor) {
    const effectiveCursor = cursor ?? this.fallbackMouseCursor;
    const existing = this._currentSessions.get(device);
    if (existing) existing.dispose();
    const session = effectiveCursor.createSession(device);
    this._currentSessions.set(device, session);
    session.activate();
  }
}
