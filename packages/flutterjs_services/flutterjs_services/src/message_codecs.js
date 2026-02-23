// Flutter services/message_codecs.dart → JS
// BinaryCodec, StringCodec, JSONMessageCodec, JSONMethodCodec,
// StandardMessageCodec, StandardMethodCodec

import { MessageCodec, MethodCall, MethodCodec, PlatformException } from './message_codec.js';

const _enc = new TextEncoder();
const _dec = new TextDecoder();

// ── BinaryCodec ──────────────────────────────────────────────────────────────

export class BinaryCodec extends MessageCodec {
  encodeMessage(message) { return message ?? null; }
  decodeMessage(message) { return message ?? null; }
}

// ── StringCodec ──────────────────────────────────────────────────────────────

export class StringCodec extends MessageCodec {
  encodeMessage(message) {
    if (message == null) return null;
    return _enc.encode(message).buffer;
  }
  decodeMessage(message) {
    if (message == null) return null;
    return _dec.decode(message instanceof ArrayBuffer ? message : message.buffer ?? message);
  }
}

// ── JSONMessageCodec ─────────────────────────────────────────────────────────

export class JSONMessageCodec extends MessageCodec {
  encodeMessage(message) {
    if (message == null) return null;
    return new StringCodec().encodeMessage(JSON.stringify(message));
  }
  decodeMessage(message) {
    if (message == null) return null;
    return JSON.parse(new StringCodec().decodeMessage(message));
  }
}

// ── JSONMethodCodec ──────────────────────────────────────────────────────────

export class JSONMethodCodec extends MethodCodec {
  encodeMethodCall(call) {
    return new JSONMessageCodec().encodeMessage({ method: call.method, args: call.arguments });
  }
  decodeMethodCall(data) {
    const decoded = new JSONMessageCodec().decodeMessage(data);
    if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
      throw new Error(`Expected method call Map, got ${decoded}`);
    }
    if (typeof decoded.method === 'string') {
      return new MethodCall(decoded.method, decoded.args ?? null);
    }
    throw new Error(`Invalid method call: ${JSON.stringify(decoded)}`);
  }
  decodeEnvelope(data) {
    const decoded = new JSONMessageCodec().decodeMessage(data);
    if (!Array.isArray(decoded)) throw new Error(`Expected envelope List, got ${decoded}`);
    if (decoded.length === 1) return decoded[0];
    if (decoded.length === 3 && typeof decoded[0] === 'string' &&
        (decoded[1] == null || typeof decoded[1] === 'string')) {
      throw new PlatformException({ code: decoded[0], message: decoded[1] ?? null, details: decoded[2] });
    }
    if (decoded.length === 4 && typeof decoded[0] === 'string' &&
        (decoded[1] == null || typeof decoded[1] === 'string') &&
        (decoded[3] == null || typeof decoded[3] === 'string')) {
      throw new PlatformException({ code: decoded[0], message: decoded[1] ?? null, details: decoded[2], stacktrace: decoded[3] });
    }
    throw new Error(`Invalid envelope: ${JSON.stringify(decoded)}`);
  }
  encodeSuccessEnvelope(result) {
    return new JSONMessageCodec().encodeMessage([result]);
  }
  encodeErrorEnvelope({ code, message = null, details = null }) {
    return new JSONMessageCodec().encodeMessage([code, message, details]);
  }
}

// ── StandardMessageCodec ─────────────────────────────────────────────────────
// Implements Flutter's standard binary encoding protocol

const _TYPE_NULL        = 0;
const _TYPE_TRUE        = 1;
const _TYPE_FALSE       = 2;
const _TYPE_INT32       = 3;
const _TYPE_INT64       = 4;
const _TYPE_LARGE_INT   = 5;
const _TYPE_FLOAT64     = 6;
const _TYPE_STRING      = 7;
const _TYPE_UINT8LIST   = 8;
const _TYPE_INT32LIST   = 9;
const _TYPE_INT64LIST   = 10;
const _TYPE_FLOAT64LIST = 11;
const _TYPE_LIST        = 12;
const _TYPE_MAP         = 13;
const _TYPE_FLOAT32LIST = 14;

class _WriteBuffer {
  constructor() {
    this._chunks = [];
    this._byteLength = 0;
  }
  putUint8(v) { this._chunks.push(new Uint8Array([v])); this._byteLength += 1; }
  putUint16(v) {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, v, true);
    this._chunks.push(b); this._byteLength += 2;
  }
  putUint32(v) {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, v, true);
    this._chunks.push(b); this._byteLength += 4;
  }
  putInt32(v) {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setInt32(0, v, true);
    this._chunks.push(b); this._byteLength += 4;
  }
  putInt64(v) {
    // JS BigInt for int64
    const b = new Uint8Array(8);
    new DataView(b.buffer).setBigInt64(0, BigInt(v), true);
    this._chunks.push(b); this._byteLength += 8;
  }
  putFloat64(v) {
    const b = new Uint8Array(8);
    new DataView(b.buffer).setFloat64(0, v, true);
    this._chunks.push(b); this._byteLength += 8;
  }
  putBytes(bytes) { this._chunks.push(bytes); this._byteLength += bytes.byteLength; }
  align(alignment) {
    const offset = this._byteLength % alignment;
    if (offset !== 0) {
      const pad = alignment - offset;
      this._chunks.push(new Uint8Array(pad));
      this._byteLength += pad;
    }
  }
  done() {
    const result = new Uint8Array(this._byteLength);
    let pos = 0;
    for (const chunk of this._chunks) {
      result.set(chunk, pos);
      pos += chunk.byteLength;
    }
    return result.buffer;
  }
}

class _ReadBuffer {
  constructor(buffer) {
    this._buf = buffer instanceof ArrayBuffer ? buffer : buffer.buffer ?? buffer;
    this._view = new DataView(this._buf);
    this._pos = 0;
  }
  get hasRemaining() { return this._pos < this._buf.byteLength; }
  getUint8()   { return this._view.getUint8(this._pos++); }
  getUint16()  { const v = this._view.getUint16(this._pos, true); this._pos += 2; return v; }
  getUint32()  { const v = this._view.getUint32(this._pos, true); this._pos += 4; return v; }
  getInt32()   { const v = this._view.getInt32(this._pos, true);  this._pos += 4; return v; }
  getInt64()   {
    const v = this._view.getBigInt64(this._pos, true); this._pos += 8;
    return Number(v); // lossy for large values, but sufficient for most use
  }
  getFloat64() { const v = this._view.getFloat64(this._pos, true); this._pos += 8; return v; }
  getBytes(n)  { const v = new Uint8Array(this._buf, this._pos, n); this._pos += n; return v; }
  align(alignment) {
    const offset = this._pos % alignment;
    if (offset !== 0) this._pos += alignment - offset;
  }
}

export class StandardMessageCodec extends MessageCodec {
  encodeMessage(message) {
    if (message == null) return null;
    const buf = new _WriteBuffer();
    this.writeValue(buf, message);
    return buf.done();
  }

  decodeMessage(message) {
    if (message == null) return null;
    const buf = new _ReadBuffer(message);
    const result = this.readValue(buf);
    if (buf.hasRemaining) throw new Error('Message corrupted');
    return result;
  }

  writeValue(buf, value) {
    if (value == null) {
      buf.putUint8(_TYPE_NULL);
    } else if (typeof value === 'boolean') {
      buf.putUint8(value ? _TYPE_TRUE : _TYPE_FALSE);
    } else if (typeof value === 'number') {
      if (Number.isInteger(value) && value >= -0x80000000 && value <= 0x7fffffff) {
        buf.putUint8(_TYPE_INT32);
        buf.putInt32(value);
      } else if (Number.isInteger(value)) {
        buf.putUint8(_TYPE_INT64);
        buf.putInt64(value);
      } else {
        buf.putUint8(_TYPE_FLOAT64);
        buf.putFloat64(value);
      }
    } else if (typeof value === 'string') {
      buf.putUint8(_TYPE_STRING);
      const bytes = _enc.encode(value);
      this._writeSize(buf, bytes.byteLength);
      buf.putBytes(bytes);
    } else if (value instanceof Uint8Array) {
      buf.putUint8(_TYPE_UINT8LIST);
      this._writeSize(buf, value.length);
      buf.putBytes(value);
    } else if (value instanceof Int32Array) {
      buf.putUint8(_TYPE_INT32LIST);
      this._writeSize(buf, value.length);
      buf.putBytes(new Uint8Array(value.buffer));
    } else if (value instanceof Float64Array) {
      buf.putUint8(_TYPE_FLOAT64LIST);
      this._writeSize(buf, value.length);
      buf.putBytes(new Uint8Array(value.buffer));
    } else if (value instanceof Float32Array) {
      buf.putUint8(_TYPE_FLOAT32LIST);
      this._writeSize(buf, value.length);
      buf.putBytes(new Uint8Array(value.buffer));
    } else if (Array.isArray(value)) {
      buf.putUint8(_TYPE_LIST);
      this._writeSize(buf, value.length);
      for (const item of value) this.writeValue(buf, item);
    } else if (value instanceof Map) {
      buf.putUint8(_TYPE_MAP);
      this._writeSize(buf, value.size);
      for (const [k, v] of value) { this.writeValue(buf, k); this.writeValue(buf, v); }
    } else if (typeof value === 'object') {
      // Plain object → treat as map
      const entries = Object.entries(value);
      buf.putUint8(_TYPE_MAP);
      this._writeSize(buf, entries.length);
      for (const [k, v] of entries) { this.writeValue(buf, k); this.writeValue(buf, v); }
    } else {
      throw new Error(`Unsupported value type: ${typeof value}`);
    }
  }

  readValue(buf) {
    if (!buf.hasRemaining) throw new Error('Message corrupted');
    return this.readValueOfType(buf.getUint8(), buf);
  }

  readValueOfType(type, buf) {
    switch (type) {
      case _TYPE_NULL:        return null;
      case _TYPE_TRUE:        return true;
      case _TYPE_FALSE:       return false;
      case _TYPE_INT32:       return buf.getInt32();
      case _TYPE_INT64:       return buf.getInt64();
      case _TYPE_FLOAT64:     return buf.getFloat64();
      case _TYPE_LARGE_INT:
      case _TYPE_STRING: {
        const len = this._readSize(buf);
        return _dec.decode(buf.getBytes(len));
      }
      case _TYPE_UINT8LIST: {
        const len = this._readSize(buf);
        return buf.getBytes(len).slice();
      }
      case _TYPE_INT32LIST: {
        const len = this._readSize(buf);
        return new Int32Array(buf.getBytes(len * 4).buffer.slice(0));
      }
      case _TYPE_INT64LIST: {
        const len = this._readSize(buf);
        // Return as regular array of numbers (BigInt64Array not universally available)
        const bytes = buf.getBytes(len * 8);
        const view = new DataView(bytes.buffer);
        return Array.from({ length: len }, (_, i) => Number(view.getBigInt64(i * 8, true)));
      }
      case _TYPE_FLOAT32LIST: {
        const len = this._readSize(buf);
        return new Float32Array(buf.getBytes(len * 4).buffer.slice(0));
      }
      case _TYPE_FLOAT64LIST: {
        const len = this._readSize(buf);
        return new Float64Array(buf.getBytes(len * 8).buffer.slice(0));
      }
      case _TYPE_LIST: {
        const len = this._readSize(buf);
        const result = new Array(len);
        for (let i = 0; i < len; i++) result[i] = this.readValue(buf);
        return result;
      }
      case _TYPE_MAP: {
        const len = this._readSize(buf);
        const result = new Map();
        for (let i = 0; i < len; i++) {
          result.set(this.readValue(buf), this.readValue(buf));
        }
        return result;
      }
      default: throw new Error(`Message corrupted (unknown type ${type})`);
    }
  }

  _writeSize(buf, value) {
    if (value < 254) {
      buf.putUint8(value);
    } else if (value <= 0xffff) {
      buf.putUint8(254);
      buf.putUint16(value);
    } else {
      buf.putUint8(255);
      buf.putUint32(value);
    }
  }

  _readSize(buf) {
    const v = buf.getUint8();
    if (v === 254) return buf.getUint16();
    if (v === 255) return buf.getUint32();
    return v;
  }
}

// ── StandardMethodCodec ──────────────────────────────────────────────────────

export class StandardMethodCodec extends MethodCodec {
  constructor(messageCodec = new StandardMessageCodec()) {
    super();
    this.messageCodec = messageCodec;
  }

  encodeMethodCall(call) {
    const buf = new _WriteBuffer();
    this.messageCodec.writeValue(buf, call.method);
    this.messageCodec.writeValue(buf, call.arguments);
    return buf.done();
  }

  decodeMethodCall(data) {
    const buf = new _ReadBuffer(data);
    const method = this.messageCodec.readValue(buf);
    const args = this.messageCodec.readValue(buf);
    if (typeof method === 'string' && !buf.hasRemaining) {
      return new MethodCall(method, args);
    }
    throw new Error('Invalid method call');
  }

  encodeSuccessEnvelope(result) {
    const buf = new _WriteBuffer();
    buf.putUint8(0);
    this.messageCodec.writeValue(buf, result);
    return buf.done();
  }

  encodeErrorEnvelope({ code, message = null, details = null }) {
    const buf = new _WriteBuffer();
    buf.putUint8(1);
    this.messageCodec.writeValue(buf, code);
    this.messageCodec.writeValue(buf, message);
    this.messageCodec.writeValue(buf, details);
    return buf.done();
  }

  decodeEnvelope(data) {
    if (!data || (data.byteLength ?? data.length) === 0) {
      throw new Error('Expected envelope, got nothing');
    }
    const buf = new _ReadBuffer(data);
    const flag = buf.getUint8();
    if (flag === 0) return this.messageCodec.readValue(buf);
    const code    = this.messageCodec.readValue(buf);
    const message = this.messageCodec.readValue(buf);
    const details = this.messageCodec.readValue(buf);
    const stacktrace = buf.hasRemaining ? this.messageCodec.readValue(buf) : null;
    if (typeof code === 'string') {
      throw new PlatformException({ code, message: message ?? null, details, stacktrace });
    }
    throw new Error('Invalid envelope');
  }
}
