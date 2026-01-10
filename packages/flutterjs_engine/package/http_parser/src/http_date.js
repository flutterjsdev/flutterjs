
// Minimal implementation for now
export class HttpDate {
    static format(date) {
        return date.toUTCString();
    }

    static parse(dateString) {
        return new Date(dateString);
    }
}
