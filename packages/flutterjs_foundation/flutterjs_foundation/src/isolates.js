// Flutter foundation/isolates.dart → JS
// compute() — on web, runs inline (no worker threads in JS/web context)

export async function compute(callback, message) {
  return callback(message);
}
