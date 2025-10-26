// Core exports
export { Widget, } from './core/widget.js';
export { StatelessWidget } from './core/stateless-widget.js';
export { StatefulWidget } from './core/stateful-widget.js';

// Runtime
export { runApp } from './runtime/run-app.js';

// Material widgets (placeholders for now)
export { MaterialApp } from './material/material-app.js';
export { Scaffold } from './widgets/material/scaffold.js';
export { Text } from './widgets/material/text.js';
export { Container } from './widgets/layout/container.js';

// Re-export everything as default FlutterJS object
export default {
  Widget,
  StatelessWidget,
  StatefulWidget,
  runApp,
  MaterialApp,
  Scaffold,
  Text,
  Container,
};