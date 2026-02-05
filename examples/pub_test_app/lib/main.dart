// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'package:uuid/uuid.dart';

void main() {
  var uuid = Uuid();
  print('Generated UUID: ${uuid.v4()}');
}
