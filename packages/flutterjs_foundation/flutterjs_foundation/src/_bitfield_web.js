// Flutter foundation/_bitfield_web.dart → JS

export class BitField {
  constructor(length) {
    this._length = length;
    this._bits = 0;
  }

  get(index) { return (this._bits >>> index) & 1; }
  set(index, value) {
    if (value) {
      this._bits |= (1 << index);
    } else {
      this._bits &= ~(1 << index);
    }
  }

  reset(value = false) {
    this._bits = value ? ((1 << this._length) - 1) : 0;
  }
}
