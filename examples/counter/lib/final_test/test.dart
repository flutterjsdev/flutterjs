// lib/main.dart
// The ultimate minimal stress-test for your FlutterJs compiler
// If this file compiles to working <80 KB JS → you have won.

import 'package:flutter/material.dart'; // ← your @flutterjs/material
import 'package:provider/provider.dart'; // ← your @flutterjs/provider
import 'package:http/http.dart' as http; // ← your @flutterjs/http
import 'dart:convert'; // ← your @flutterjs/convert
import 'dart:math' as math; // ← your @flutterjs/math
import 'dart:async';

void main() => runApp(MyApp());

class CounterModel extends ChangeNotifier {
  int _count = 0;
  String status = 'Idle';
  List<String> history = [];

  int get count => _count;

  void increment() {
    _count++;
    history.add('+$count at ${DateTime.now().toIso8601String()}');
    status = 'Last action: increment';
    notifyListeners();
  }

  Future<void> fetchQuote() async {
    status = 'Fetching...';
    notifyListeners();

    try {
      final resp = await http.get(Uri.parse('https://api.quotable.io/random'));
      if (resp.statusCode == 200) {
        final data = jsonDecode(resp.body);
        final quote = data['content'] as String;
        history.add('Quote: ${quote.substring(0, 30)}...');
        status = 'Quote loaded';
      } else {
        status = 'HTTP ${resp.statusCode}';
      }
    } catch (e) {
      status = 'Error: $e';
    }
    notifyListeners();
  }

  void reset() {
    _count = 0;
    history.clear();
    status = 'Reset';
    notifyListeners();
  }
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => CounterModel(),
      child: MaterialApp(
        title: 'FlutterJs Stress Test',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(primarySwatch: Colors.indigo),
        home: HomePage(),
      ),
    );
  }
}

class HomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final model = context.watch<CounterModel>();

    return Scaffold(
      appBar: AppBar(
        title: Text('FlutterJs Stress Test'),
        backgroundColor: Colors.indigo,
      ),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Reactive Text + Theme
            Text(
              'Count: ${model.count} ${math.min(10, 20)}',
              style: Theme.of(context).textTheme.headlineMedium!.copyWith(
                color: model.count.isEven ? Colors.indigo : Colors.purple,
              ),
            ),
            SizedBox(height: 20),

            // 2. Row of buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton(onPressed: model.increment, child: Text('+1')),
                SizedBox(width: 16),
                ElevatedButton(onPressed: model.reset, child: Text('Reset')),
                SizedBox(width: 16),
                ElevatedButton(
                  onPressed: model.fetchQuote,
                  child: Text('Fetch Quote'),
                ),
              ],
            ),
            SizedBox(height: 20),

            // 3. Async status
            Text('Status: ${model.status}'),

            SizedBox(height: 20),

            // 4. ListView with dynamic data
            Expanded(
              child: ListView.builder(
                itemCount: model.history.length,
                itemBuilder: (context, i) => Card(
                  child: ListTile(
                    leading: CircleAvatar(child: Text('${i + 1}')),
                    title: Text(model.history[i]),
                    subtitle: Text('Item $i'),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: model.increment,
        child: Icon(Icons.add),
      ),
    );
  }
}
