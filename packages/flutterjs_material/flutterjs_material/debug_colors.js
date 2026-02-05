// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


import { Colors, Color } from './src/material/color.js';

console.log('--- Debugging Colors ---');
console.log('Colors.indigo:', Colors.indigo);
console.log('Is Colors.indigo instance of Color?', Colors.indigo instanceof Color);
console.log('Does Colors.indigo receive toCSSString?', typeof Colors.indigo.toCSSString);

if (Colors.indigo && typeof Colors.indigo.toCSSString === 'function') {
    console.log('Colors.indigo.toCSSString():', Colors.indigo.toCSSString());
} else {
    console.log('FAIL: Colors.indigo.toCSSString missing');
}

console.log('Colors.blue:', Colors.blue);
if (Colors.blue && typeof Colors.blue.toCSSString === 'function') {
    console.log('Colors.blue.toCSSString():', Colors.blue.toCSSString());
}
