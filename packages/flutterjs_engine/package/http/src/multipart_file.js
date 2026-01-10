
import { MediaType } from '@flutterjs/http_parser';
import { ByteStream } from './byte_stream.js';

export class MultipartFile {
    constructor(field, stream, length, { filename = null, contentType = null } = {}) {
        this.field = field;
        this.length = length;
        this.filename = filename;
        this.contentType = contentType ? MediaType.parse(contentType) : new MediaType('application', 'octet-stream');
        this._stream = stream;
    }

    static fromBytes(field, bytes, { filename = null, contentType = null } = {}) {
        const stream = ByteStream.fromBytes(bytes);
        return new MultipartFile(field, stream, bytes.length, { filename, contentType });
    }

    static fromString(field, string, { filename = null, contentType = null } = {}) {
        const bytes = new TextEncoder().encode(string);
        return MultipartFile.fromBytes(field, bytes, { filename, contentType });
    }

    // finalize() returns a readable ByteStream
    finalize() {
        return this._stream;
    }
}
