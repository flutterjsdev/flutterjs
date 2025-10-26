/**
 * FlutterJS Framework - Complete Index
 * Main export file with all modules
 * Works in Browser & Deno (no Node.js required)
 */

// ============================================
// CORE EXPORTS
// ============================================

export { Widget } from './core/widget.js';
export { StatelessWidget } from './core/stateless-widget.js';
export { StatefulWidget } from './core/stateful-widget.js';
export { State } from './core/state.js';
export { BuildContext } from './core/build-context.js';

// ============================================
// VIRTUAL DOM
// ============================================

export { VNode } from './vdom/vnode.js';
export { VNodeBuilder } from './vdom/vnode-builder.js';

// ============================================
// RUNTIME
// ============================================

export { runApp } from './runtime/run-app.js';
export { FlutterJS } from './runtime/flutter-js.js';

// ============================================
// MATERIAL DESIGN WIDGETS
// ============================================

// App-level
export { MaterialApp } from './widgets/material/material-app.js';
export { CupertinoApp } from './widgets/material/cupertino-app.js';

// Structure
export { Scaffold } from './widgets/material/scaffold.js';
export { AppBar } from './widgets/material/app-bar.js';
export { BottomNavigationBar } from './widgets/material/bottom-navigation-bar.js';
export { Drawer } from './widgets/material/drawer.js';

// Layout
export { Container } from './widgets/layout/container.js';
export { Column } from './widgets/layout/column.js';
export { Row } from './widgets/layout/row.js';
export { Stack } from './widgets/layout/stack.js';
export { Positioned } from './widgets/layout/positioned.js';
export { Center } from './widgets/layout/center.js';
export { Padding } from './widgets/layout/padding.js';
export { SizedBox } from './widgets/layout/sized-box.js';
export { Flexible } from './widgets/layout/flexible.js';
export { Expanded } from './widgets/layout/expanded.js';

// Text & Typography
export { Text } from './widgets/text/text.js';
export { RichText } from './widgets/text/rich-text.js';
export { TextSpan } from './widgets/text/text-span.js';

// Input
export { TextField } from './widgets/input/text-field.js';
export { Form } from './widgets/input/form.js';
export { FormField } from './widgets/input/form-field.js';

// Buttons
export { ElevatedButton } from './widgets/button/elevated-button.js';
export { TextButton } from './widgets/button/text-button.js';
export { OutlinedButton } from './widgets/button/outlined-button.js';
export { IconButton } from './widgets/button/icon-button.js';
export { FloatingActionButton } from './widgets/button/floating-action-button.js';

// Selection
export { Checkbox } from './widgets/selection/checkbox.js';
export { Radio } from './widgets/selection/radio.js';
export { Switch } from './widgets/selection/switch.js';

// Media
export { Icon } from './widgets/media/icon.js';
export { Image } from './widgets/media/image.js';

// Cards & Lists
export { Card } from './widgets/cards/card.js';
export { ListTile } from './widgets/cards/list-tile.js';
export { ListView } from './widgets/cards/list-view.js';

// Dialogs
export { AlertDialog } from './widgets/dialog/alert-dialog.js';
export { Dialog } from './widgets/dialog/dialog.js';
export { SimpleDialog } from './widgets/dialog/simple-dialog.js';

// Progress & Activity
export { CircularProgressIndicator } from './widgets/progress/circular-progress-indicator.js';
export { LinearProgressIndicator } from './widgets/progress/linear-progress-indicator.js';
export { RefreshIndicator } from './widgets/progress/refresh-indicator.js';

// Dividers & Separators
export { Divider } from './widgets/dividers/divider.js';
export { VerticalDivider } from './widgets/dividers/vertical-divider.js';

// Decorations
export { BoxDecoration } from './widgets/decoration/box-decoration.js';
export { BorderRadius } from './widgets/decoration/border-radius.js';
export { Border } from './widgets/decoration/border.js';
export { BoxShadow } from './widgets/decoration/box-shadow.js';
export { Gradient } from './widgets/decoration/gradient.js';

// ============================================
// STATE MANAGEMENT
// ============================================

export { StateProvider } from './state/state-provider.js';
export { ChangeNotifier } from './state/change-notifier.js';
export { ValueNotifier } from './state/value-notifier.js';
export { InheritedWidget } from './state/inherited-widget.js';

// ============================================
// THEMING
// ============================================

export { ThemeData } from './theme/theme-data.js';
export { TextTheme } from './theme/text-theme.js';
export { ColorScheme } from './theme/color-scheme.js';
export { Colors } from './theme/colors.js';

// ============================================
// NAVIGATION
// ============================================

export { Navigator } from './navigation/navigator.js';
export { MaterialPageRoute } from './navigation/material-page-route.js';
export { CupertinoPageRoute } from './navigation/cupertino-page-route.js';

// ============================================
// UTILITIES
// ============================================

export { EdgeInsets } from './utils/edge-insets.js';
export { Size } from './utils/size.js';
export { Offset } from './utils/offset.js';
export { TextStyle } from './utils/text-style.js';
export { Duration } from './utils/duration.js';
export { Alignment } from './utils/alignment.js';
export { Clip } from './utils/clip.js';
export { TextAlign } from './utils/text-align.js';

// ============================================
// ANIMATIONS
// ============================================

export { AnimationController } from './animation/animation-controller.js';
export { Tween } from './animation/tween.js';
export { CurvedAnimation } from './animation/curved-animation.js';
export { Curves } from './animation/curves.js';

// ============================================
// FORMS & VALIDATION
// ============================================

export { FormValidator } from './forms/form-validator.js';
export { TextEditingController } from './forms/text-editing-controller.js';
export { FocusNode } from './forms/focus-node.js';

// ============================================
// GESTURES
// ============================================

export { GestureDetector } from './gestures/gesture-detector.js';
export { Dismissible } from './gestures/dismissible.js';
export { Draggable } from './gestures/draggable.js';

// ============================================
// CONTEXT & MEDIA QUERY
// ============================================

export { MediaQuery } from './context/media-query.js';
export { Theme } from './context/theme.js';
export { ScaffoldState } from './context/scaffold-state.js';

// ============================================
// ARCHITECTURE PATTERNS
// ============================================

export { ArchitectureHelper } from './architecture/architecture-helper.js';
export { StatelessComponentPattern } from './architecture/stateless-component.js';
export { StatefulComponentPattern } from './architecture/stateful-component.js';

// ============================================
// ROUTING HELPERS
// ============================================

export { RouteGenerator } from './routing/route-generator.js';
export { DeepLinkHandler } from './routing/deep-link-handler.js';
export { RouteTransition } from './routing/route-transition.js';

// ============================================
// CLI TOOLS
// ============================================

export { CLI } from './cli/cli.js';
export { DevServer } from './cli/dev-server.js';
export { BuildSystem } from './cli/build-system.js';
export { ProjectGenerator } from './cli/project-generator.js';

// ============================================
// DEBUGGING & DEVTOOLS
// ============================================

export { DevTools } from './debug/devtools.js';
export { WidgetInspector } from './debug/widget-inspector.js';
export { PerformanceProfiler } from './debug/performance-profiler.js';

// ============================================
// PLATFORM INTEGRATION
// ============================================

export { Platform } from './platform/platform.js';
export { WebPlatform } from './platform/web-platform.js';
export { NativeBridge } from './platform/native-bridge.js';

// ============================================
// MAIN FLUTTERJS OBJECT
// ============================================

import { Widget } from './core/widget.js';
import { StatelessWidget } from './core/stateless-widget.js';
import { StatefulWidget } from './core/stateful-widget.js';
import { State } from './core/state.js';
import { runApp } from './runtime/run-app.js';
import { MaterialApp } from './widgets/material/material-app.js';
import { Scaffold } from './widgets/material/scaffold.js';
import { Text } from './widgets/text/text.js';
import { Container } from './widgets/layout/container.js';
import { ElevatedButton } from './widgets/button/elevated-button.js';
import { Column } from './widgets/layout/column.js';
import { Row } from './widgets/layout/row.js';
import { AppBar } from './widgets/material/app-bar.js';
import { Center } from './widgets/layout/center.js';
import { CLI } from './cli/cli.js';

/**
 * Main FlutterJS export object
 * Usage: import FlutterJS from './flutter.js'
 *        FlutterJS.Text, FlutterJS.Container, etc.
 */
export default {
  // Core
  Widget,
  StatelessWidget,
  StatefulWidget,
  State,

  // Runtime
  runApp,

  // Material Widgets
  MaterialApp,
  Scaffold,
  AppBar,
  Container,
  Center,
  Column,
  Row,
  Text,
  ElevatedButton,

  // CLI
  CLI,

  // Version
  version: '1.0.0',
  framework: 'FlutterJS',
  description: 'Flutter Design System for Web',

  // Utility
  log: (msg) => console.log(`[FlutterJS] ${msg}`),
  warn: (msg) => console.warn(`[FlutterJS] ${msg}`),
  error: (msg) => console.error(`[FlutterJS] ${msg}`),
};