/**
 * FlutterJS Quick Start Example
 * 
 * This shows a complete Flutter-style app running pure JavaScript
 * No dependencies, no npm, no build tools required
 * 
 * To run:
 * 1. Save this file as app.js
 * 2. Create index.html (see below)
 * 3. Open index.html in browser
 */

// ============================================
// IMPORTS (Pure JavaScript modules)
// ============================================

import {
  StatefulWidget,
  State,
  StatelessWidget,
  Text,
  Container,
  Column,
  Row,
  ElevatedButton,
  MaterialApp,
  Scaffold,
  AppBar,
  Center,
  FloatingActionButton,
  runApp,
} from './dist/flutter.js';

// ============================================
// APP STATE WIDGET
// ============================================

/**
 * HomePage with counter state
 * Uses StatefulWidget + State pattern (like Flutter)
 */
class HomePage extends StatefulWidget {
  createState() {
    return new _HomePageState();
  }
}

class _HomePageState extends State {
  constructor() {
    super();
    this.count = 0;
    this.items = [];
  }

  // Flutter lifecycle hook
  initState() {
    console.log('[FlutterJS] Home page mounted');
  }

  // Increment counter (like Flutter)
  _increment() {
    this.setState({ count: this.count + 1 });
  }

  // Decrement counter
  _decrement() {
    this.setState({ count: Math.max(0, this.count - 1) });
  }

  // Add item to list
  _addItem() {
    this.setState({
      items: [...this.items, `Item ${this.items.length + 1}`],
    });
  }

  // Remove last item
  _removeItem() {
    if (this.items.length > 0) {
      const newItems = this.items.slice(0, -1);
      this.setState({ items: newItems });
    }
  }

  // Flutter build method
  build(context) {
    return new Scaffold({
      appBar: new AppBar({
        title: new Text('FlutterJS Counter App'),
        backgroundColor: '#6750A4', // Material Purple
      }),

      body: new Center({
        child: new Column({
          mainAxisAlignment: 'center',
          children: [
            // Title
            new Text('Button Taps:', {
              style: { fontSize: '24px', fontWeight: 'bold' },
            }),

            // Counter display
            new Container({
              padding: 24,
              child: new Text(`${this.count}`, {
                style: {
                  fontSize: '64px',
                  fontWeight: 'bold',
                  color: '#6750A4',
                },
              }),
            }),

            // Buttons row
            new Row({
              mainAxisAlignment: 'center',
              children: [
                new ElevatedButton({
                  child: new Text('−', {
                    style: { fontSize: '24px', fontWeight: 'bold' },
                  }),
                  onPressed: () => this._decrement(),
                  backgroundColor: '#FF6B6B', // Red
                  textColor: '#FFFFFF',
                }),

                new Container({ width: 24 }), // Spacer

                new ElevatedButton({
                  child: new Text('+', {
                    style: { fontSize: '24px', fontWeight: 'bold' },
                  }),
                  onPressed: () => this._increment(),
                  backgroundColor: '#51CF66', // Green
                  textColor: '#FFFFFF',
                }),
              ],
            }),

            // Divider
            new Container({
              height: 1,
              margin: 32,
              color: '#E0E0E0',
            }),

            // Items list header
            new Text('Items List:', {
              style: { fontSize: '18px', fontWeight: 'bold', marginTop: '24px' },
            }),

            // Items display
            new Container({
              padding: 16,
              child: new Column({
                children: this.items.length > 0
                  ? this.items.map(
                      (item) =>
                        new Container({
                          child: new Text(`• ${item}`, {
                            style: { fontSize: '16px', padding: '8px' },
                          }),
                        })
                    )
                  : [
                      new Text('No items yet. Add one below!', {
                        style: {
                          fontSize: '14px',
                          color: '#999999',
                          fontStyle: 'italic',
                        },
                      }),
                    ],
              }),
            }),

            // Item buttons
            new Row({
              mainAxisAlignment: 'center',
              children: [
                new ElevatedButton({
                  child: new Text('Add Item'),
                  onPressed: () => this._addItem(),
                  backgroundColor: '#4C6EF5', // Blue
                  textColor: '#FFFFFF',
                }),

                new Container({ width: 16 }), // Spacer

                new ElevatedButton({
                  child: new Text('Remove Item'),
                  onPressed: () => this._removeItem(),
                  backgroundColor: '#FF922B', // Orange
                  textColor: '#FFFFFF',
                }),
              ],
            }),

            new Container({ height: 32 }), // Bottom spacer
          ],
        }),
      }),

      floatingActionButton: new FloatingActionButton({
        child: new Text('↻'),
        onPressed: () => this.setState({ count: 0, items: [] }),
        backgroundColor: '#FA5252', // Pink
      }),
    });
  }

  // Flutter lifecycle hook
  dispose() {
    console.log('[FlutterJS] Home page disposed');
  }
}

// ============================================
// MAIN APP
// ============================================

/**
 * Root MaterialApp
 * Stateless because it just holds the theme
 */
class MyApp extends StatelessWidget {
  build(context) {
    return new MaterialApp({
      title: 'FlutterJS Demo',
      home: new HomePage(),
    });
  }
}

// ============================================
// BOOTSTRAP
// ============================================

// Run the app when DOM is ready
runApp(MyApp);

/**
 * ============================================
 * HTML FILE (save as index.html)
 * ============================================
 * 
 * <!DOCTYPE html>
 * <html lang="en">
 * <head>
 *   <meta charset="UTF-8">
 *   <meta name="viewport" content="width=device-width, initial-scale=1.0">
 *   <title>FlutterJS Demo</title>
 *   <style>
 *     * {
 *       margin: 0;
 *       padding: 0;
 *       box-sizing: border-box;
 *     }
 * 
 *     body {
 *       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
 *       background-color: #FAFAFA;
 *       line-height: 1.5;
 *     }
 * 
 *     #root {
 *       width: 100%;
 *       min-height: 100vh;
 *     }
 * 
 *     .flutter-app {
 *       width: 100%;
 *       height: 100%;
 *     }
 * 
 *     .flutter-appbar {
 *       background-color: #6750A4;
 *       color: white;
 *       padding: 16px 24px;
 *       box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
 *       font-size: 20px;
 *       font-weight: bold;
 *     }
 * 
 *     .flutter-scaffold {
 *       display: flex;
 *       flex-direction: column;
 *       width: 100%;
 *       height: 100vh;
 *     }
 * 
 *     .flutter-elevated-button {
 *       padding: 10px 20px;
 *       border: none;
 *       border-radius: 4px;
 *       font-size: 16px;
 *       font-weight: bold;
 *       cursor: pointer;
 *       transition: all 0.2s ease;
 *     }
 * 
 *     .flutter-elevated-button:hover {
 *       transform: translateY(-2px);
 *       box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
 *     }
 * 
 *     .flutter-elevated-button:active {
 *       transform: translateY(0);
 *     }
 * 
 *     .flutter-column {
 *       display: flex;
 *       flex-direction: column;
 *     }
 * 
 *     .flutter-row {
 *       display: flex;
 *       flex-direction: row;
 *       gap: 8px;
 *     }
 * 
 *     .flutter-container {
 *       display: flex;
 *       align-items: center;
 *       justify-content: center;
 *     }
 *   </style>
 * </head>
 * <body>
 *   <div id="root"></div>
 *   <script type="module" src="./app.js"></script>
 * </body>
 * </html>
 */

// ============================================
// FEATURES DEMONSTRATED
// ============================================

/**
 * ✅ StatefulWidget - Counter with state management
 * ✅ State lifecycle - initState, dispose hooks
 * ✅ setState - Reactive updates
 * ✅ Material Design - AppBar, Scaffold, FloatingActionButton
 * ✅ Layout widgets - Column, Row, Center, Container
 * ✅ Buttons - ElevatedButton with callbacks
 * ✅ Text rendering - With custom styling
 * ✅ List management - Add/remove items reactively
 * ✅ Pure JavaScript - No build tools, no dependencies
 * ✅ ES6 modules - Import/export system
 */

// ============================================
// TO RUN THIS EXAMPLE:
// ============================================

/**
 * Option 1: Simple Web Server
 * $ python -m http.server 8000
 * Open: http://localhost:8000
 * 
 * Option 2: Using flutter-js CLI
 * $ flutter-js dev
 * Opens: http://localhost:5000
 * 
 * Option 3: Direct file (some browsers)
 * Open index.html directly in browser
 */

// ============================================
// API SUMMARY
// ============================================

/**
 * Core Classes:
 * - StatelessWidget          (Pure render)
 * - StatefulWidget           (With state)
 * - State                    (State holder)
 * - BuildContext             (Context object)
 * - VNode                    (Virtual node)
 * 
 * Material Widgets (30+):
 * - MaterialApp              (Root widget)
 * - Scaffold                 (Page structure)
 * - AppBar                   (Top bar)
 * - FloatingActionButton     (Action button)
 * - ElevatedButton           (Material button)
 * - Text                     (Text display)
 * - Container                (Layout box)
 * - Column                   (Vertical layout)
 * - Row                      (Horizontal layout)
 * - Center                   (Center child)
 * - Padding                  (Add padding)
 * 
 * State Management:
 * - setState()               (Update state)
 * - initState()              (On mount)
 * - dispose()                (On unmount)
 * - didUpdateWidget()        (On prop change)
 * 
 * Utilities:
 * - runApp()                 (Bootstrap app)
 * - EdgeInsets               (Padding/margin)
 * - TextStyle                (Text styling)
 * - Colors                   (Material colors)
 */

export { MyApp };