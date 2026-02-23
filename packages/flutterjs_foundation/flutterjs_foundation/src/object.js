// Flutter foundation/object.dart → JS

export function objectRuntimeType(object, optimizedValue) {
  // In release mode Flutter returns optimizedValue; in debug it uses runtimeType.
  // On web we always use the class name.
  if (object && object.constructor && object.constructor.name) {
    return object.constructor.name;
  }
  return optimizedValue ?? String(object);
}
