// dart:convert implementation

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
export const base64 = {
    encode: (bytes) => {
        // Handle bytes -> string
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },
    decode: (source) => {
        const binary = atob(source);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
};

export function base64Encode(bytes) {
    return base64.encode(bytes);
}

export function base64Decode(source) {
    return base64.decode(source);
}
