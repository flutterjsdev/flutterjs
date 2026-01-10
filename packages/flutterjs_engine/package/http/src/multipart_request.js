
import { BaseRequest } from './base_request.js';

export class MultipartRequest extends BaseRequest {
    constructor(method, url) {
        super(method, url);
        this.fields = {};
        this.files = [];
    }

    // Helper to add file
    addFile(file) {
        this.files.push(file);
    }
}
