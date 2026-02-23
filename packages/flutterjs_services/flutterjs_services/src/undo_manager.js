// Flutter services/undo_manager.dart → JS

export const UndoDirection = Object.freeze({
  undo: 'undo',
  redo: 'redo',
});

export class UndoManagerClient {
  handlePlatformUndo(direction) { throw new Error('handlePlatformUndo not implemented'); }
  updateEditingValueWithDeltas(textEditingDeltas) { throw new Error('not implemented'); }
}

export class UndoManager {
  static get client() { return UndoManager._client ?? null; }
  static setClient(client) { UndoManager._client = client; }
  static clearClient() { UndoManager._client = null; }
  static setUndoState({ canUndo, canRedo }) { /* no-op on web */ }
}
