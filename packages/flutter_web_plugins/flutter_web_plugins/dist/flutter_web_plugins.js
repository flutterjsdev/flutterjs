
export class Registrar {
    constructor(messenger) {
        this.messenger = messenger;
    }

    registerMessageHandler() {
        console.debug('Registrar.registerMessageHandler called');
    }
}

export const flutter_web_plugins = {
    Registrar,
};
