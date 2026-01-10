
import { BaseRequest } from './base_request.js';
import { ByteStream } from './byte_stream.js';
import { MediaType } from '@flutterjs/http_parser';

export class MultipartRequest extends BaseRequest {
    constructor(method, url) {
        super(method, url);
        this.fields = {};
        this.files = [];
    }

    addFile(file) {
        this.files.push(file);
    }

    finalize() {
        super.finalize();
        // Simplistic manual multipart construction
        // In a real robust implementation, we might use a library or FormData (if browser only).
        // But we need to return a ByteStream.
        // We will perform a synchronous "build" of the Uint8Array body and stream it.

        const boundary = 'dart-http-boundary-' + Math.random().toString(36).substring(2);
        this.headers['content-type'] = `multipart/form-data; boundary=${boundary}`;
        const encoder = new TextEncoder();

        const chunks = [];
        const dashBoundary = encoder.encode(`--${boundary}\r\n`);
        const crlf = encoder.encode('\r\n');

        // Fields
        for (const [key, value] of Object.entries(this.fields)) {
            chunks.push(dashBoundary);
            chunks.push(encoder.encode(`content-disposition: form-data; name="${key}"\r\n\r\n`));
            chunks.push(encoder.encode(value));
            chunks.push(crlf);
        }

        // Files - PROBLEM: Files have async streams.
        // We cannot synchronously return a ByteStream that depends on other async streams easily 
        // without complexity if we are concatenating them.
        // But ByteStream accepts an async iterator.

        const files = this.files;
        const generator = async function* () {
            // Output fields (buffered above)
            for (const chunk of chunks) {
                yield chunk;
            }

            // Output files
            for (const file of files) {
                yield dashBoundary;
                let header = `content-disposition: form-data; name="${file.field}"`;
                if (file.filename) {
                    header += `; filename="${file.filename}"`;
                }
                header += '\r\n';
                if (file.contentType) {
                    header += `content-type: ${file.contentType}\r\n`;
                }
                header += '\r\n';

                yield encoder.encode(header);

                // Yield file stream content
                const fileStream = file.finalize();
                for await (const fileChunk of fileStream) {
                    yield fileChunk;
                }

                yield crlf;
            }

            // End
            yield encoder.encode(`--${boundary}--\r\n`);
        };

        return new ByteStream(generator());
    }
}
