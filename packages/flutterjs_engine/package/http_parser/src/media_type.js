
export class MediaType {
    constructor(type, subtype, parameters = {}) {
        this.type = type;
        this.subtype = subtype;
        this.parameters = parameters;
    }

    static parse(mediaType) {
        // Simple parser for MVP
        if (!mediaType) {
            throw new Error('Invalid media type: null/empty');
        }

        // Split type and parameters
        const parts = mediaType.split(';');
        const typeParts = parts[0].trim().split('/');

        if (typeParts.length !== 2) {
            throw new Error(`Invalid media type: ${mediaType}`);
        }

        const type = typeParts[0].toLowerCase();
        const subtype = typeParts[1].toLowerCase();
        const parameters = {};

        for (let i = 1; i < parts.length; i++) {
            const param = parts[i].trim();
            const equalIndex = param.indexOf('=');
            if (equalIndex !== -1) {
                const key = param.substring(0, equalIndex).trim();
                let value = param.substring(equalIndex + 1).trim();
                // Remove quotes if present
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1);
                }
                parameters[key] = value;
            }
        }

        return new MediaType(type, subtype, parameters);
    }

    get mimeType() {
        return `${this.type}/${this.subtype}`;
    }

    toString() {
        let params = '';
        for (const [key, value] of Object.entries(this.parameters)) {
            params += `; ${key}=${value}`;
        }
        return `${this.mimeType}${params}`;
    }

    change(changes = {}) {
        return new MediaType(
            changes.type || this.type,
            changes.subtype || this.subtype,
            changes.parameters || this.parameters
        );
    }
}
