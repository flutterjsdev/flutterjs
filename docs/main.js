// ============================================================================
// FULL REFERENCE CODE – 1:1 with your Dart app
// Works perfectly in flutter-js-framework, Catnip, Dartevel, etc. (2025)
// ============================================================================

import {
  Widget,
  StatelessWidget,
  StatefulWidget,
  State,
  BuildContext,
  MaterialApp,
  Scaffold,
  AppBar,
  Text,
  Center,
  Column,
  MainAxisAlignment,
  FloatingActionButton,
  Icon,
  Icons,
  Theme,
  ThemeData,
  Colors,
  Card,
  Padding,
  EdgeInsets,
  TextStyle,
  Container,
  BoxDecoration,
  BorderRadius,
  Divider,
  FontWeight,
  CrossAxisAlignment,
  runApp,
} from 'flutter-js-framework/widgets';

// Optional: tiny helper (not required, but nice for debugging)
function assertContext(context) {
  if (!(context instanceof BuildContext)) {
    throw new Error("build() called without valid BuildContext");
  }
}

// ========== EXACT SAME HELPER FUNCTIONS FROM YOUR DART ==========
function buildUserCard(name, age) {
  return Card({
    margin: EdgeInsets.all(12),
    child: Padding({
      padding: EdgeInsets.all(16),
      child: Column({
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(`Name: ${name}`, { style: TextStyle({ fontSize: 18 }) }),
          Text(`Age: ${age}`),
        ],
      }),
    }),
  });
}

function buildPriceWidget(amount) {
  const gst = amount * 0.18;
  const total = amount + gst;

  return Container({
    padding: EdgeInsets.all(16),
    decoration: BoxDecoration({
      color: Colors.blue.shade50,
      borderRadius: BorderRadius.circular(10),
    }),
    child: Column({
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(`Amount: ₹${amount}`),
        Text(`GST (18%): ₹${gst}`),
        Text("jaypal"),
        Divider(),
        Text(`Total: ₹${total}`, {
          style: TextStyle({ fontSize: 18, fontWeight: FontWeight.bold }),
        }),
      ],
    }),
  });
}

function appTest({ value = null, value2 = null } = {}) {
  // Matches Dart: {String? value, String? value2}
}

function ex() {
  appTest({ value: "sdd", value2: "asd" });
}

// ========== WIDGET CLASSES – 1:1 with your Dart ==========
class MyApp extends StatelessWidget {
  constructor() {
    super();
  }

  build(context) {
    assertContext(context);

    return MaterialApp({
      title: 'Flutter Demo',
      theme: ThemeData({
        colorScheme: .fromSeed({ seedColor: Colors.deepPurple }),  // exact Dart syntax
        useMaterial3: true,
      }),
      home: MyHomePage({ title: 'Flutter Demo Home Page' }),
    });
  }
}

class MyHomePage extends StatefulWidget {
  title = null;

  constructor({ title } = {}) {
    super();
    this.title = title;
  }

  createState() {
    return new _MyHomePageState();
  }
}

class _MyHomePageState extends State {
  _counter = 0;

  _incrementCounter() {
    // Arrow function required in JS → preserves correct `this`
    this.setState(() => this._counter++);
  }

  build(context) {
    assertContext(context);

    return Scaffold({
      appBar: AppBar({
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(this.widget.title),
      }),
      body: Center({
        child: Column({
          mainAxisAlignment: .center,  // exact Dart shorthand
          children: [
            Text('You have pushed the button this many times:'),
            Text('${this._counter}', {
              style: Theme.of(context).textTheme.headlineMedium,
            }),
          ],
        }),
      }),
      floatingActionButton: FloatingActionButton({
        onPressed: () => this._incrementCounter(),  // arrow keeps `this` correct
        tooltip: 'Increment',
        child: Icon(Icons.add),
      }),
    });
  }
}

// ========== MAIN ENTRY POINT ==========
function main() {
  runApp(MyApp());
}

// Auto-start the app
main();

// ========== EXPORTS (for modules/hot-reload) ==========
export {
  main,
  MyApp,
  MyHomePage,
  _MyHomePageState,
  buildUserCard,
  buildPriceWidget,
  appTest,
  ex,
};