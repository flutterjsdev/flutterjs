// Flutter services/predictive_back_event.dart → JS

export const SwipeEdge = Object.freeze({
  left:  'left',
  right: 'right',
});

export class PredictiveBackEvent {
  constructor({ touchOffset = null, progress, swipeEdge, isButtonEvent = false }) {
    this.touchOffset = touchOffset;
    this.progress = progress;
    this.swipeEdge = swipeEdge;
    this.isButtonEvent = isButtonEvent;
  }
}
