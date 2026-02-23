// Flutter services/text_editing_delta.dart → JS

export class TextEditingDelta {
  constructor({ oldText, selection, composing }) {
    this.oldText = oldText;
    this.selection = selection;
    this.composing = composing;
  }
  apply(value) { throw new Error('apply not implemented'); }
}

export class TextEditingDeltaInsertion extends TextEditingDelta {
  constructor({ oldText, insertionOffset, textInserted, selection, composing }) {
    super({ oldText, selection, composing });
    this.insertionOffset = insertionOffset;
    this.textInserted = textInserted;
  }
  apply(value) {
    const text = value.text ?? value;
    const newText = text.slice(0, this.insertionOffset) + this.textInserted + text.slice(this.insertionOffset);
    return typeof value === 'string' ? newText : { ...value, text: newText, selection: this.selection };
  }
}

export class TextEditingDeltaDeletion extends TextEditingDelta {
  constructor({ oldText, deletedRange, selection, composing }) {
    super({ oldText, selection, composing });
    this.deletedRange = deletedRange;
  }
  apply(value) {
    const text = value.text ?? value;
    const newText = text.slice(0, this.deletedRange.start) + text.slice(this.deletedRange.end);
    return typeof value === 'string' ? newText : { ...value, text: newText, selection: this.selection };
  }
}

export class TextEditingDeltaReplacement extends TextEditingDelta {
  constructor({ oldText, replacementText, replacedRange, selection, composing }) {
    super({ oldText, selection, composing });
    this.replacementText = replacementText;
    this.replacedRange = replacedRange;
  }
  apply(value) {
    const text = value.text ?? value;
    const newText = text.slice(0, this.replacedRange.start) + this.replacementText + text.slice(this.replacedRange.end);
    return typeof value === 'string' ? newText : { ...value, text: newText, selection: this.selection };
  }
}

export class TextEditingDeltaNonTextUpdate extends TextEditingDelta {
  constructor({ oldText, selection, composing }) {
    super({ oldText, selection, composing });
  }
  apply(value) {
    return typeof value === 'string' ? value : { ...value, selection: this.selection };
  }
}

export function _toTextAffinity(value) {
  if (value === 1) return 'upstream';
  return 'downstream';
}

export function _replace(original, replacement, start, end) {
  return original.slice(0, start) + replacement + original.slice(end);
}

export function _debugTextRangeIsValid(range, text) {
  return range.start >= 0 && range.end <= text.length && range.start <= range.end;
}
