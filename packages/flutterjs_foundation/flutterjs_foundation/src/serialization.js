// Flutter foundation/serialization.dart → JS
// WriteBuffer, ReadBuffer — used by StandardMessageCodec

export class WriteBuffer {
  constructor({ startCapacity = 64 } = {}) {
    this._chunks = [];
    this._byteLength = 0;
    this._littleEndian = true;
  }

  putUint8(value) {
    const b = new Uint8Array(1);
    b[0] = value & 0xff;
    this._push(b);
  }

  putUint16(value) {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, value, this._littleEndian);
    this._push(b);
  }

  putUint32(value) {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, value >>> 0, this._littleEndian);
    this._push(b);
  }

  putInt32(value) {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setInt32(0, value, this._littleEndian);
    this._push(b);
  }

  putInt64(value) {
    const b = new Uint8Array(8);
    new DataView(b.buffer).setBigInt64(0, BigInt(value), this._littleEndian);
    this._push(b);
  }

  putFloat32(value) {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setFloat32(0, value, this._littleEndian);
    this._push(b);
  }

  putFloat64(value) {
    const b = new Uint8Array(8);
    new DataView(b.buffer).setFloat64(0, value, this._littleEndian);
    this._push(b);
  }

  putUint8List(list) { this._push(list instanceof Uint8Array ? list : new Uint8Array(list)); }
  putInt32List(list) { this._push(new Uint8Array(new Int32Array(list).buffer)); }
  putFloat32List(list) { this._push(new Uint8Array(new Float32Array(list).buffer)); }
  putFloat64List(list) { this._push(new Uint8Array(new Float64Array(list).buffer)); }

  _push(bytes) {
    this._chunks.push(bytes);
    this._byteLength += bytes.byteLength;
  }

  // Align to boundary (add zero padding)
  _alignTo(alignment) {
    const offset = this._byteLength % alignment;
    if (offset !== 0) {
      const pad = alignment - offset;
      this._push(new Uint8Array(pad));
    }
  }

  done() {
    const result = new Uint8Array(this._byteLength);
    let pos = 0;
    for (const chunk of this._chunks) {
      result.set(chunk, pos);
      pos += chunk.byteLength;
    }
    this._chunks = [];
    this._byteLength = 0;
    // Return as ByteData-compatible object
    return { buffer: result.buffer, lengthInBytes: result.byteLength, _u8: result };
  }
}

export class ReadBuffer {
  constructor(data) {
    // Accept ByteData-like objects, ArrayBuffer, Uint8Array
    if (data && data._u8) {
      this._buf = data.buffer;
      this._u8  = data._u8;
    } else if (data instanceof ArrayBuffer) {
      this._buf = data;
      this._u8  = new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
      this._buf = data.buffer;
      this._u8  = data;
    } else if (data && data.buffer) {
      this._buf = data.buffer;
      this._u8  = new Uint8Array(data.buffer);
    } else {
      this._buf = new ArrayBuffer(0);
      this._u8  = new Uint8Array(0);
    }
    this._view = new DataView(this._buf);
    this._pos = 0;
    this._littleEndian = true;
  }

  get hasRemaining() { return this._pos < this._u8.length; }

  getUint8() { return this._u8[this._pos++]; }

  getUint16() {
    const v = this._view.getUint16(this._pos, this._littleEndian);
    this._pos += 2; return v;
  }

  getUint32() {
    const v = this._view.getUint32(this._pos, this._littleEndian);
    this._pos += 4; return v;
  }

  getInt32() {
    const v = this._view.getInt32(this._pos, this._littleEndian);
    this._pos += 4; return v;
  }

  getInt64() {
    const v = this._view.getBigInt64(this._pos, this._littleEndian);
    this._pos += 8; return Number(v);
  }

  getFloat32() {
    const v = this._view.getFloat32(this._pos, this._littleEndian);
    this._pos += 4; return v;
  }

  getFloat64() {
    const v = this._view.getFloat64(this._pos, this._littleEndian);
    this._pos += 8; return v;
  }

  getUint8List(length) {
    const slice = this._u8.slice(this._pos, this._pos + length);
    this._pos += length; return slice;
  }

  getInt32List(length) {
    const bytes = this._u8.slice(this._pos, this._pos + length * 4);
    this._pos += length * 4;
    return new Int32Array(bytes.buffer.slice(0));
  }

  getInt64List(length) {
    const view = new DataView(this._buf, this._pos, length * 8);
    this._pos += length * 8;
    return Array.from({ length }, (_, i) => Number(view.getBigInt64(i * 8, this._littleEndian)));
  }

  getFloat32List(length) {
    const bytes = this._u8.slice(this._pos, this._pos + length * 4);
    this._pos += length * 4;
    return new Float32Array(bytes.buffer.slice(0));
  }

  getFloat64List(length) {
    const bytes = this._u8.slice(this._pos, this._pos + length * 8);
    this._pos += length * 8;
    return new Float64Array(bytes.buffer.slice(0));
  }
}
