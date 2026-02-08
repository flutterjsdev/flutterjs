// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class Uri {
    constructor({ scheme, userInfo, host, port, path, query, fragment }) {
        this._scheme = scheme || '';
        this._userInfo = userInfo || '';
        this._host = host || '';
        this._port = port || null;
        this._path = path || '';
        this._query = query || '';
        this._fragment = fragment || '';
    }

    get scheme() {
        return this._scheme;
    }

    get path() {
        return this._path;
    }

    static get base() {
        if (typeof window !== 'undefined' && window.location) {
            // Browser environment
            const loc = window.location;
            let scheme = loc.protocol.replace(':', '');
            return new Uri({
                scheme: scheme,
                host: loc.hostname,
                port: loc.port ? parseInt(loc.port) : null,
                path: loc.pathname,
                query: loc.search,
                fragment: loc.hash
            });
        }
        // Fallback for Node/other env
        return new Uri({ scheme: 'file', path: '/' });
    }

    toFilePath({ windows } = {}) {
        // Simple implementation for now
        return this._path;
    }

    toString() {
        // Basic reconstruction
        let str = '';
        if (this._scheme) str += this._scheme + ':';
        if (this._host) {
            str += '//';
            if (this._userInfo) str += this._userInfo + '@';
            str += this._host;
            if (this._port) str += ':' + this._port;
        }
        str += this._path;
        if (this._query) str += this._query;
        if (this._fragment) str += this._fragment;
        return str;
    }

    static parse(uri) {
        // Very basic parser for now, sufficient for tests/simple usage
        // TODO: Implement full RFC 3986 parser
        try {
            // Use browser/node URL API if available
            const u = new URL(uri);
            return new Uri({
                scheme: u.protocol.replace(':', ''),
                host: u.hostname,
                port: u.port ? parseInt(u.port) : null,
                path: u.pathname,
                query: u.search,
                fragment: u.hash
            });
        } catch (e) {
            // Fallback or error
            return new Uri({ path: uri });
        }
    }
}
