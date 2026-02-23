// Flutter services/mouse_tracking.dart → JS

export class MouseTrackerAnnotation {
  constructor({ onEnter = null, onHover = null, onExit = null, cursor = null, validForMouseTracker = true } = {}) {
    this.onEnter = onEnter;
    this.onHover = onHover;
    this.onExit = onExit;
    this.cursor = cursor;
    this.validForMouseTracker = validForMouseTracker;
  }
}
