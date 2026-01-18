// dart:typed_data implementation

export const Uint8List = Uint8Array;
export const Int8List = Int8Array;
export const Uint8ClampedList = Uint8ClampedArray;
export const Uint16List = Uint16Array;
export const Int16List = Int16Array;
export const Uint32List = Uint32Array;
export const Int32List = Int32Array;
export const Float32List = Float32Array;
export const Float64List = Float64Array;

// ByteData wrapper
export class ByteData {
    constructor(buffer, offsetInBytes = 0, lengthInBytes) {
        if (buffer instanceof ArrayBuffer) {
            this._view = new DataView(buffer, offsetInBytes, lengthInBytes);
        } else if (buffer instanceof Uint8Array || buffer instanceof Uint8List) {
            this._view = new DataView(buffer.buffer, buffer.byteOffset + offsetInBytes, lengthInBytes);
        } else {
            // Create new of size
            this._view = new DataView(new ArrayBuffer(buffer));
        }
    }

    getInt8(byteOffset) { return this._view.getInt8(byteOffset); }
    setInt8(byteOffset, value) { this._view.setInt8(byteOffset, value); }

    getUint8(byteOffset) { return this._view.getUint8(byteOffset); }
    setUint8(byteOffset, value) { this._view.setUint8(byteOffset, value); }

    getInt16(byteOffset, endian) { return this._view.getInt16(byteOffset, endian === 1); } // endian 1 = little? check consts
    setInt16(byteOffset, value, endian) { this._view.setInt16(byteOffset, value, endian === 1); }

    // ... add others as needed

    get buffer() { return this._view.buffer; }
}

export class BytesBuilder {
    constructor({ copy = true } = {}) {
        this._chunks = [];
        this._length = 0;
    }

    add(bytes) {
        this._chunks.push(bytes);
        this._length += bytes.length;
    }

    addByte(byte) {
        this._chunks.push(new Uint8Array([byte]));
        this._length++;
    }

    takeBytes() {
        const result = this.toBytes();
        this.clear();
        return result;
    }

    toBytes() {
        const result = new Uint8Array(this._length);
        let offset = 0;
        for (const chunk of this._chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        return result;
    }

    clear() {
        this._chunks = [];
        this._length = 0;
    }
}
