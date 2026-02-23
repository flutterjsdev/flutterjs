// Flutter foundation/assertions.dart → JS
// FlutterError, ErrorDescription, ErrorSummary, ErrorHint, FlutterErrorDetails,
// StackFilter, RepetitiveStackFrameFilter, PartialStackFrame, DiagnosticsStackTrace

export class PartialStackFrame {
  constructor({ package: pkg, className, method }) {
    this.package = pkg;
    this.className = className;
    this.method = method;
  }

  matches(stackFrame) {
    if (!stackFrame) return false;
    const str = String(stackFrame);
    if (this.className && !str.includes(this.className)) return false;
    if (this.method && !str.includes(this.method)) return false;
    return true;
  }
}

export class StackFilter {
  filter(stackFrames, reasons) { throw new Error('filter not implemented'); }
}

export class RepetitiveStackFrameFilter extends StackFilter {
  constructor({ frames, replacement }) {
    super();
    this.frames = frames;
    this.replacement = replacement;
  }

  filter(stackFrames, reasons) {
    // Simplified: mark consecutive matching frames
    for (let i = 0; i < stackFrames.length - this.frames.length + 1; i++) {
      let matches = true;
      for (let j = 0; j < this.frames.length; j++) {
        if (!this.frames[j].matches(stackFrames[i + j])) { matches = false; break; }
      }
      if (matches) {
        for (let j = 0; j < this.frames.length; j++) {
          reasons[i + j] = this.replacement;
        }
      }
    }
  }
}

export class _ErrorDiagnostic {
  constructor(message) { this.message = message; }
  toString() { return this.message; }
}

export class ErrorDescription extends _ErrorDiagnostic {
  constructor(message) { super(message); }
}

export class ErrorSummary extends _ErrorDiagnostic {
  constructor(message) { super(message); }
}

export class ErrorHint extends _ErrorDiagnostic {
  constructor(message) { super(message); }
}

export class ErrorSpacer extends _ErrorDiagnostic {
  constructor() { super(''); }
}

export class FlutterErrorDetails {
  constructor({ exception, stack = null, library = 'Flutter framework', context = null,
                informationCollector = null, silent = false }) {
    this.exception = exception;
    this.stack = stack;
    this.library = library;
    this.context = context;
    this.informationCollector = informationCollector;
    this.silent = silent;
  }

  toString() {
    return `${this.library}: ${this.exception}${this.context ? '\n' + this.context : ''}`;
  }
}

export class FlutterError extends Error {
  constructor(message) {
    super(typeof message === 'string' ? message : message.toString());
    this.name = 'FlutterError';
    this._diagnostics = typeof message === 'string'
      ? [new ErrorSummary(message)]
      : Array.isArray(message) ? message : [message];
  }

  get message() { return this._diagnostics.map(d => d.toString()).join('\n'); }

  static reportError(details) {
    if (FlutterError.onError) {
      FlutterError.onError(details);
    } else {
      if (!details.silent) {
        console.error(`[${details.library}]`, details.exception, details.stack ?? '');
      }
    }
  }

  static dumpErrorToConsole(details, { forceReport = false } = {}) {
    if (!details.silent || forceReport) {
      console.error(details.toString());
    }
  }

  static resetErrorCount() { FlutterError._errorCount = 0; }
  static get presentError() { return FlutterError._presentError ?? FlutterError.dumpErrorToConsole; }
}
FlutterError.onError = null;
FlutterError._errorCount = 0;

export class DiagnosticsStackTrace {
  constructor(name, stack = null) {
    this.name = name;
    this.stack = stack;
  }
  toString() { return `${this.name}\n${this.stack ?? ''}`; }
}

export function debugPrintStack({ label = null, maxFrames = null } = {}) {
  const err = new Error(label ?? 'Stack trace');
  console.trace(err);
}
