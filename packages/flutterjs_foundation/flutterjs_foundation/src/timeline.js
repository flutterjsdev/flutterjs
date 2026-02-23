// Flutter foundation/timeline.dart → JS (stubs — profiling not needed on web)

export class TimedBlock {
  constructor({ name, start, end }) {
    this.name = name;
    this.start = start;
    this.end = end;
  }
  get duration() { return this.end - this.start; }
}

export class AggregatedTimedBlock {
  constructor({ name, duration, count }) {
    this.name = name;
    this.duration = duration;
    this.count = count;
  }
  get averageDuration() { return this.count > 0 ? this.duration / this.count : 0; }
}

export class AggregatedTimings {
  constructor(blocks) { this.blocks = blocks; }
  operator(name) { return this.blocks.find(b => b.name === name) ?? null; }
}

export class FlutterTimeline {
  static get now() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  static startSync(name, { arguments: args, flow } = {}) {
    // No-op on web
  }

  static finishSync() {
    // No-op on web
  }

  static instant(name, { arguments: args } = {}) {
    // No-op on web
  }

  static get debugCollectionEnabled() { return false; }
  static set debugCollectionEnabled(v) {}

  static get debugReset() { FlutterTimeline._blocks = []; }

  static get debugFormatted() {
    return new AggregatedTimings([]);
  }

  static timeSync(name, function_, { arguments: args, flow } = {}) {
    return function_();
  }

  static async time(name, function_, { arguments: args, flow } = {}) {
    return function_();
  }
}
FlutterTimeline._blocks = [];

export class _Float64ListChain {}
export class _StringListChain {}
export class _BlockBuffer {}
