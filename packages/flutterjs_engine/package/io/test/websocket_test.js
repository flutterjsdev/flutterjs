
import { WebSocket } from '../src/websocket.js';

function testWebSocket() {
    console.log('Testing WebSocket...');
    try {
        if (typeof globalThis.WebSocket === 'undefined') {
            globalThis.WebSocket = class MockWebSocket {
                constructor(url) { this.url = url; }
                send(data) { console.log('Mock sent:', data); }
                close() { console.log('Mock closed'); }
            }
        }

        const ws = new WebSocket('ws://echo.websocket.org');
        ws.send('Hello');
        console.log('✅ WebSocket instantiation passed');
    } catch (e) {
        console.error('❌ WebSocket failed:', e);
    }
}

testWebSocket();
