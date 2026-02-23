// Flutter services/text_boundary.dart → JS

export class TextBoundary {
  getLeadingTextBoundaryAt(position) { throw new Error('not implemented'); }
  getTrailingTextBoundaryAt(position) { throw new Error('not implemented'); }

  getTextBoundaryAt(position) {
    return {
      start: this.getLeadingTextBoundaryAt(position) ?? 0,
      end: this.getTrailingTextBoundaryAt(position) ?? 0,
    };
  }
}

export class CharacterBoundary extends TextBoundary {
  constructor(string) { super(); this._string = string; }

  getLeadingTextBoundaryAt(position) {
    if (position < 0 || position >= this._string.length) return null;
    return position;
  }

  getTrailingTextBoundaryAt(position) {
    if (position < 0 || position >= this._string.length) return null;
    // Handle surrogate pairs
    const code = this._string.codePointAt(position);
    return position + (code > 0xFFFF ? 2 : 1);
  }
}

export class LineBoundary extends TextBoundary {
  constructor(textLayoutMetrics) { super(); this._metrics = textLayoutMetrics; }

  getLeadingTextBoundaryAt(position) {
    if (position < 0) return null;
    return this._metrics?.getLineStartAt(position) ?? position;
  }

  getTrailingTextBoundaryAt(position) {
    if (position < 0) return null;
    return this._metrics?.getLineEndAt(position) ?? position;
  }
}

export class ParagraphBoundary extends TextBoundary {
  constructor(string) { super(); this._string = string; }

  getLeadingTextBoundaryAt(position) {
    if (position <= 0) return 0;
    let i = Math.min(position - 1, this._string.length - 1);
    while (i > 0 && this._string[i] !== '\n') i--;
    return i === 0 ? 0 : i + 1;
  }

  getTrailingTextBoundaryAt(position) {
    if (position >= this._string.length) return this._string.length;
    let i = position;
    while (i < this._string.length && this._string[i] !== '\n') i++;
    return i < this._string.length ? i + 1 : this._string.length;
  }
}

export class DocumentBoundary extends TextBoundary {
  constructor(string) { super(); this._string = string; }
  getLeadingTextBoundaryAt(position)  { return 0; }
  getTrailingTextBoundaryAt(position) { return this._string.length; }
}
