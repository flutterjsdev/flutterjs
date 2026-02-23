// Flutter foundation/debug.dart → JS

export function debugAssertAllFoundationVarsUnset(reason) {
  // No-op in JS — debug var checking only relevant in Dart VM
  return true;
}

export async function debugInstrumentAction(description, action) {
  return action();
}

export function debugFormatDouble(value) {
  if (value == null) return 'null';
  return value.toStringAsFixed ? value.toStringAsFixed(1) : value.toFixed(1);
}

export function debugMaybeDispatchCreated(library, className, object) {
  // No-op — memory allocation tracking not needed on web
}

export function debugMaybeDispatchDisposed(object) {
  // No-op
  return true;
}
