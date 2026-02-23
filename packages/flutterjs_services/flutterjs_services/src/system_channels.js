// Flutter services/system_channels.dart → JS
import { MethodChannel } from './platform_channel.js';
import { JSONMethodCodec } from './message_codecs.js';
import { StandardMessageCodec } from './message_codecs.js';

export class SystemChannels {
  static get navigation() {
    return new MethodChannel('flutter/navigation', new JSONMethodCodec());
  }
  static get platform() {
    return new MethodChannel('flutter/platform', new JSONMethodCodec());
  }
  static get textInput() {
    return new MethodChannel('flutter/textinput', new JSONMethodCodec());
  }
  static get keyEvent() {
    return new MethodChannel('flutter/keyevent', new JSONMethodCodec());
  }
  static get lifecycle() {
    return new MethodChannel('flutter/lifecycle', new JSONMethodCodec());
  }
  static get system() {
    return new MethodChannel('flutter/system', new JSONMethodCodec());
  }
  static get accessibility() {
    return new MethodChannel('flutter/accessibility', new JSONMethodCodec());
  }
  static get platform_views() {
    return new MethodChannel('flutter/platform_views', new JSONMethodCodec());
  }
  static get skia() {
    return new MethodChannel('flutter/skia', new JSONMethodCodec());
  }
  static get mouse_cursor() {
    return new MethodChannel('flutter/mousecursor', new JSONMethodCodec());
  }
  static get restoration() {
    return new MethodChannel('flutter/restoration', new JSONMethodCodec());
  }
  static get spellCheck() {
    return new MethodChannel('flutter/spellcheck', new JSONMethodCodec());
  }
  static get scribe() {
    return new MethodChannel('flutter/scribe', new JSONMethodCodec());
  }
}
