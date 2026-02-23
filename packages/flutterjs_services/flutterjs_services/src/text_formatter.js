// Flutter services/text_formatter.dart → JS

export const MaxLengthEnforcement = Object.freeze({
  none:                          'none',
  enforced:                      'enforced',
  truncateAfterCompositionEnds:  'truncateAfterCompositionEnds',
});

export class TextInputFormatter {
  formatEditUpdate(oldValue, newValue) { throw new Error('formatEditUpdate not implemented'); }

  static withFunction(formatFunction) {
    return new _SimpleTextInputFormatter(formatFunction);
  }
}

class _SimpleTextInputFormatter extends TextInputFormatter {
  constructor(fn) { super(); this._fn = fn; }
  formatEditUpdate(oldValue, newValue) { return this._fn(oldValue, newValue); }
}

export class FilteringTextInputFormatter extends TextInputFormatter {
  constructor(filterPattern, { allow, replacementString = '' }) {
    super();
    this.filterPattern = filterPattern;
    this.allow = allow;
    this.replacementString = replacementString;
  }

  formatEditUpdate(oldValue, newValue) {
    const text = newValue.text ?? newValue;
    let result;
    if (this.allow) {
      // Keep only matching characters
      result = text.replace(
        new RegExp(`[^${this.filterPattern.source ?? this.filterPattern}]`, 'g'),
        this.replacementString
      );
    } else {
      // Remove matching characters
      result = text.replace(this.filterPattern, this.replacementString);
    }
    return typeof newValue === 'string' ? result : { ...newValue, text: result };
  }

  static get digitsOnly() {
    return new FilteringTextInputFormatter(/[^\d]/g, { allow: false });
  }
  static get singleLineFormatter() {
    return new FilteringTextInputFormatter(/\n/g, { allow: false });
  }
  static allow(pattern, { replacementString = '' } = {}) {
    return new FilteringTextInputFormatter(pattern, { allow: true, replacementString });
  }
  static deny(pattern, { replacementString = '' } = {}) {
    return new FilteringTextInputFormatter(pattern, { allow: false, replacementString });
  }
}

export class LengthLimitingTextInputFormatter extends TextInputFormatter {
  constructor(maxLength, { maxLengthEnforcement = null } = {}) {
    super();
    this.maxLength = maxLength;
    this.maxLengthEnforcement = maxLengthEnforcement;
  }

  formatEditUpdate(oldValue, newValue) {
    if (this.maxLength == null || this.maxLength < 0) return newValue;
    const text = newValue.text ?? newValue;
    if (text.length <= this.maxLength) return newValue;
    const truncated = text.substring(0, this.maxLength);
    return typeof newValue === 'string' ? truncated : { ...newValue, text: truncated };
  }
}
