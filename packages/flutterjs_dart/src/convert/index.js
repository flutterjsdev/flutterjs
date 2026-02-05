// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// dart:convert implementation

// --- Encoding Base Class ---
export class Encoding {
    name = "unknown";

    decode(bytes) {
        throw new Error("Unimplemented: Encoding.decode");
    }

    encode(string) {
        throw new Error("Unimplemented: Encoding.encode");
    }

    static getByName(name) {
        if (name === 'utf-8' || name === 'utf8') return utf8;
        if (name === 'json') return json;
        // fallback
        return null;
    }
}

// --- JSON ---
export const json = {
    decode: (source) => JSON.parse(source),
    encode: (object) => JSON.stringify(object),
};

export function jsonDecode(source) {
    return JSON.parse(source);
}

export function jsonEncode(object) {
    return JSON.stringify(object);
}

// --- UTF8 ---
// Can likely assume Timer/Browser env has TextEncoder/TextDecoder
const _encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const _decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

export const utf8 = {
    name: 'utf-8',
    encode: (string) => {
        if (_encoder) return _encoder.encode(string);
        // Fallback or error if not in browser/node
        return new Uint8Array(Buffer.from(string, 'utf-8'));
    },
    decode: (bytes) => {
        if (_decoder) return _decoder.decode(bytes);
        return Buffer.from(bytes).toString('utf-8');
    }
};

// --- Base64 ---
export class base64 {
    static encode(bytes) {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    static decode(source) {
        const binary = atob(source);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
}

export class Converter {
    convert(input) { return input; }
}

export class Codec {
    get encoder() { return new Converter(); }
    get decoder() { return new Converter(); }
    encode(input) { return this.encoder.convert(input); }
    decode(input) { return this.decoder.convert(input); }
}

export class Utf8Encoder extends Converter {}
export class Utf8Decoder extends Converter {}

export function base64Encode(bytes) {
    return base64.encode(bytes);
}

export function base64Decode(source) {
    return base64.decode(source);
}
