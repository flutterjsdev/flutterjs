
export class HttpStatus {
    static get continue_() { return 100; }
    static get switchingProtocols() { return 101; }
    static get ok() { return 200; }
    static get created() { return 201; }
    static get accepted() { return 202; }
    static get noContent() { return 204; }
    static get movedPermanently() { return 301; }
    static get found() { return 302; }
    static get notModified() { return 304; }
    static get badRequest() { return 400; }
    static get unauthorized() { return 401; }
    static get forbidden() { return 403; }
    static get notFound() { return 404; }
    static get methodNotAllowed() { return 405; }
    static get requestTimeout() { return 408; }
    static get conflict() { return 409; }
    static get gone() { return 410; }
    static get internalServerError() { return 500; }
    static get notImplemented() { return 501; }
    static get badGateway() { return 502; }
    static get serviceUnavailable() { return 503; }
    static get gatewayTimeout() { return 504; }
}
