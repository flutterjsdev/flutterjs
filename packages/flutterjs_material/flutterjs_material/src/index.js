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

// 2. Export Material Components
export * from "./core/core.js";
export * from "./material/material.js";

export * from "./widgets/widgets.js";
export * from "./utils/utils.js";
export * from "./painting/text_style.js";
export * from "./painting/rounded_rectangle_border.js";

