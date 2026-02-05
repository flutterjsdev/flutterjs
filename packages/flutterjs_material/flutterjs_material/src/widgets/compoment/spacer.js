// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { SizedBox } from './sized_box.js';
import { Expanded } from './multi_child_view.js';

export class Spacer extends Expanded {
    constructor({ key, flex = 1 } = {}) {
        super({
            key,
            flex,
            child: SizedBox.shrink()
        });
    }
}
