// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class SeoManager {
    static _instance;

    static get instance() {
        if (!SeoManager._instance) {
            SeoManager._instance = new SeoManager();
        }
        return SeoManager._instance;
    }

    constructor() {
        this._title = null;
        this._meta = {};
    }

    update({ title, meta } = {}) {
        if (title) {
            this._title = title;
            document.title = title;
        }

        if (meta) {
            Object.assign(this._meta, meta);
            this._applyMeta();
        }
    }

    _applyMeta() {
        Object.entries(this._meta).forEach(([key, content]) => {
            // Determine if we should use 'name' or 'property'
            // OpenGraph (og:) and Twitter (twitter:) tags usually use 'property' or 'name' depending on spec,
            // but standard is: og:* uses property, others use name.
            // However, simplicity: if it starts with 'og:', use property.
            const useProperty = key.startsWith('og:');
            const attrName = useProperty ? 'property' : 'name';

            let metaTag = document.querySelector(`meta[${attrName}="${key}"]`);

            if (!metaTag) {
                metaTag = document.createElement('meta');
                metaTag.setAttribute(attrName, key);
                document.head.appendChild(metaTag);
            }
            metaTag.setAttribute('content', content);
        });
    }

    verify({ title, meta }) {
        console.group('🔍 SEO Verification Checklist');
        let pass = true;

        if (title) {
            const currentTitle = document.title;
            const match = currentTitle === title;
            pass = pass && match;
            console.log(match ? '✅ Title Match' : '❌ Title Mismatch', `| Expected: "${title}" | Actual: "${currentTitle}"`);
        }

        if (meta) {
            Object.entries(meta).forEach(([key, content]) => {
                const useProperty = key.startsWith('og:');
                const attrName = useProperty ? 'property' : 'name';
                const tag = document.querySelector(`meta[${attrName}="${key}"]`);
                const actual = tag ? tag.getAttribute('content') : null;
                const match = actual === content;
                pass = pass && match;

                console.log(match ? `✅ Meta[${key}] Match` : `❌ Meta[${key}] Mismatch`, `| Expected: "${content}" | Actual: "${actual}"`);
            });
        }
        console.groupEnd();

        if (pass) {
            console.log('%c SEO VERIFICATION PASSED ', 'background: #22c55e; color: #ffffff; padding: 4px; border-radius: 4px; font-weight: bold;');
        } else {
            console.log('%c SEO VERIFICATION FAILED ', 'background: #ef4444; color: #ffffff; padding: 4px; border-radius: 4px; font-weight: bold;');
        }
    }
}
