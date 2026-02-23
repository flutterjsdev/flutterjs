// Flutter services/text_editing.dart → JS
// TextSelection (extends TextRange from dart:ui)

export const TextAffinity = Object.freeze({
  upstream: 'upstream',
  downstream: 'downstream',
});

// Minimal TextRange base (mirrors dart:ui TextRange)
export class TextRange {
  constructor({ start, end }) {
    this.start = start;
    this.end = end;
  }

  get isValid() { return this.start >= 0 && this.end >= 0; }
  get isCollapsed() { return this.start === this.end; }
  get isNormalized() { return this.end >= this.start; }

  textBefore(text) { return text.substring(0, this.start); }
  textAfter(text) { return text.substring(this.end); }
  textInside(text) { return text.substring(this.start, this.end); }

  static collapsed(offset) { return new TextRange({ start: offset, end: offset }); }
  static get empty() { return new TextRange({ start: -1, end: -1 }); }
}

// Minimal TextPosition (mirrors dart:ui TextPosition)
export class TextPosition {
  constructor({ offset, affinity = TextAffinity.downstream }) {
    this.offset = offset;
    this.affinity = affinity;
  }
  equals(other) {
    if (!(other instanceof TextPosition)) return false;
    return other.offset === this.offset && other.affinity === this.affinity;
  }
  toString() {
    return `TextPosition(offset: ${this.offset}, affinity: ${this.affinity})`;
  }
}

export class TextSelection extends TextRange {
  constructor({ baseOffset, extentOffset, affinity = TextAffinity.downstream, isDirectional = false }) {
    super({
      start: baseOffset < extentOffset ? baseOffset : extentOffset,
      end: baseOffset < extentOffset ? extentOffset : baseOffset,
    });
    this.baseOffset = baseOffset;
    this.extentOffset = extentOffset;
    this.affinity = affinity;
    this.isDirectional = isDirectional;
  }

  static collapsed({ offset, affinity = TextAffinity.downstream }) {
    return new TextSelection({ baseOffset: offset, extentOffset: offset, affinity, isDirectional: false });
  }

  static fromPosition(position) {
    return new TextSelection({
      baseOffset: position.offset,
      extentOffset: position.offset,
      affinity: position.affinity,
      isDirectional: false,
    });
  }

  get base() {
    let affinity;
    if (!this.isValid || this.baseOffset === this.extentOffset) {
      affinity = this.affinity;
    } else if (this.baseOffset < this.extentOffset) {
      affinity = TextAffinity.downstream;
    } else {
      affinity = TextAffinity.upstream;
    }
    return new TextPosition({ offset: this.baseOffset, affinity });
  }

  get extent() {
    let affinity;
    if (!this.isValid || this.baseOffset === this.extentOffset) {
      affinity = this.affinity;
    } else if (this.baseOffset < this.extentOffset) {
      affinity = TextAffinity.upstream;
    } else {
      affinity = TextAffinity.downstream;
    }
    return new TextPosition({ offset: this.extentOffset, affinity });
  }

  copyWith({ baseOffset, extentOffset, affinity, isDirectional } = {}) {
    return new TextSelection({
      baseOffset:    baseOffset    ?? this.baseOffset,
      extentOffset:  extentOffset  ?? this.extentOffset,
      affinity:      affinity      ?? this.affinity,
      isDirectional: isDirectional ?? this.isDirectional,
    });
  }

  expandTo(position, extentAtIndex = false) {
    if (position.offset >= this.start && position.offset <= this.end) return this;
    const normalized = this.baseOffset <= this.extentOffset;
    if (position.offset <= this.start) {
      if (extentAtIndex) {
        return this.copyWith({ baseOffset: this.end, extentOffset: position.offset, affinity: position.affinity });
      }
      return this.copyWith({
        baseOffset:   normalized ? position.offset : this.baseOffset,
        extentOffset: normalized ? this.extentOffset : position.offset,
      });
    }
    if (extentAtIndex) {
      return this.copyWith({ baseOffset: this.start, extentOffset: position.offset, affinity: position.affinity });
    }
    return this.copyWith({
      baseOffset:   normalized ? this.baseOffset : position.offset,
      extentOffset: normalized ? position.offset : this.extentOffset,
    });
  }

  extendTo(position) {
    if (this.extent.equals(position)) return this;
    return this.copyWith({ extentOffset: position.offset, affinity: position.affinity });
  }

  equals(other) {
    if (this === other) return true;
    if (!(other instanceof TextSelection)) return false;
    if (!this.isValid) return !other.isValid;
    return other.baseOffset === this.baseOffset &&
      other.extentOffset === this.extentOffset &&
      (!this.isCollapsed || other.affinity === this.affinity) &&
      other.isDirectional === this.isDirectional;
  }

  toString() {
    if (!this.isValid) return 'TextSelection.invalid';
    return this.isCollapsed
      ? `TextSelection.collapsed(offset: ${this.baseOffset}, affinity: ${this.affinity}, isDirectional: ${this.isDirectional})`
      : `TextSelection(baseOffset: ${this.baseOffset}, extentOffset: ${this.extentOffset}, isDirectional: ${this.isDirectional})`;
  }
}
