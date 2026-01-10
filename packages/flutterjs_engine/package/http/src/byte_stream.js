
export class ByteStream {
    constructor(stream) {
        this._stream = stream; // AsyncIterable
    }

    static fromBytes(bytes) {
        return new ByteStream((async function* () {
            yield bytes;
        })());
    }

    // Mimic Dart Stream API slightly
    static fromString(s) {
        return ByteStream.fromBytes(new TextEncoder().encode(s));
    }

    async toBytes() {
        const chunks = [];
        for await (const chunk of this._stream) {
            chunks.push(chunk);
        }
        const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        return result;
    }

    async toString() {
        const bytes = await this.toBytes();
        return new TextDecoder().decode(bytes);
    }

    // Expose raw async iterator
    [Symbol.asyncIterator]() {
        return this._stream[Symbol.asyncIterator]();
    }
}
