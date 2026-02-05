// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// export class InputDecoration {
//   constructor({
//     hintText = '',
//     labelText = '',
//     helperText = '',
//     errorText = '',
//     prefixIcon = null,
//     suffixIcon = null,
//     filled = false,
//     fillColor = '#f5f5f5',
//     border = null,
//     enabledBorder = null,
//     focusedBorder = null,
//     errorBorder = null,
//     contentPadding = null,
//     isDense = false,
//     isCollapsed = false,
//     counterText = '',
//     maxLength = null
//   } = {}) {
//     this.hintText = hintText;
//     this.labelText = labelText;
//     this.helperText = helperText;
//     this.errorText = errorText;
//     this.prefixIcon = prefixIcon;
//     this.suffixIcon = suffixIcon;
//     this.filled = filled;
//     this.fillColor = fillColor;
//     this.border = border;
//     this.enabledBorder = enabledBorder;
//     this.focusedBorder = focusedBorder;
//     this.errorBorder = errorBorder;
//     this.contentPadding = contentPadding || EdgeInsets.symmetric({ horizontal: 12, vertical: 8 });
//     this.isDense = isDense;
//     this.isCollapsed = isCollapsed;
//     this.counterText = counterText;
//     this.maxLength = maxLength;
//   }

//   getContentPadding() {
//     if (this.isCollapsed) return EdgeInsets.zero();
//     if (this.isDense) return EdgeInsets.all(8);
//     return this.contentPadding;
//   }

//   toString() {
//     return `InputDecoration(label: ${this.labelText}, hint: ${this.hintText})`;
//   }
// }