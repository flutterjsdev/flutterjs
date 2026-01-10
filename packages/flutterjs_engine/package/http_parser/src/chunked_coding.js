
export class ChunkedCoding {
    static get decoder() {
        // Return a converter/transformer for chunked encoding
        // For MVP we might not implement full decoding if axios handles it
        throw new Error('ChunkedCoding.decoder not implemented');
    }
    static get encoder() {
        throw new Error('ChunkedCoding.encoder not implemented');
    }
}
