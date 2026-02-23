// Flutter foundation/bitfield.dart → JS (delegates to web impl)

export class BitField {
  constructor(length) {
    this._length = length;
    this._bits = 0;
  }

  get(index) { return !!((this._bits >>> index) & 1); }

  set(index, value) {
    if (value) {
      this._bits |= (1 << index);
    } else {
      this._bits &= ~(1 << index);
    }
  }

  reset(value = false) {
    this._bits = value ? (1 << this._length) - 1 : 0;
  }

  static get maxSmiBits() { return 30; } // JS safe integer approximation
}
