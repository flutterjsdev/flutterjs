// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export { BorderRadius } from "./utils/geometry.js";

// ============================================================================
// FLUTTERJS UNIFIED EXPORT (Material Layer)
// 
// This package acts as the main entry point for FlutterJS apps using Material Design.
// It re-exports the core runtime (@flutterjs/runtime) so developers (and generators)
// only need to import from this single package.
// ============================================================================

// 1. Re-Export Core Runtime Primitives
export { BuildContext, runApp } from '@flutterjs/runtime';
export {
  debugPrint,
} from '@flutterjs/foundation';

// 2. Export Material Components
export * from "./core/core.js";
export * from "./material/material.js";

export * from "./widgets/widgets.js";
export * from "./utils/utils.js";
export * from "./painting/text_style.js";
export * from "./painting/rounded_rectangle_border.js";

