// Flutter foundation/print.dart → JS

let _debugPrintQueue = [];
let _debugPrintScheduled = false;

export function debugPrintSynchronously(message, { wrapWidth = null } = {}) {
  console.log(message);
}

export function debugPrintThrottled(message, { wrapWidth = null } = {}) {
  _debugPrintQueue.push(message);
  if (!_debugPrintScheduled) {
    _debugPrintScheduled = true;
    setTimeout(() => {
      for (const m of _debugPrintQueue) console.log(m);
      _debugPrintQueue = [];
      _debugPrintScheduled = false;
    }, 0);
  }
}

// debugPrint is a reassignable function variable in Flutter (defaults to throttled)
export const debugPrint = debugPrintThrottled;

export const debugPrintDone = Promise.resolve();

export function debugWordWrap(message, { width = 80, wrapIndent = '' } = {}) {
  const words = message.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line.length + word.length + 1 > width && line.length > 0) {
      lines.push(line);
      line = wrapIndent + word;
    } else {
      line = line.length > 0 ? `${line} ${word}` : word;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines;
}
