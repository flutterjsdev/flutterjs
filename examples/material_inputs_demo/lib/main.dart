import 'package:flutter/material.dart';

void main() {
  runApp(const InputsDemoApp());
}

class InputsDemoApp extends StatelessWidget {
  const InputsDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Inputs Demo',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.orange),
      home: const InputsPage(),
    );
  }
}

class InputsPage extends StatefulWidget {
  const InputsPage({super.key});

  @override
  State<InputsPage> createState() => _InputsPageState();
}

class _InputsPageState extends State<InputsPage> {
  bool _isChecked = false;
  bool _isSwitchOn = true;
  double _sliderValue = 0.5;
  int _radioVal = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Inputs')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const TextField(
              decoration: InputDecoration(
                labelText: 'Standard TextField',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            const TextField(
              obscureText: true,
              decoration: InputDecoration(
                labelText: 'Password',
                border: UnderlineInputBorder(),
                icon: Icon(Icons.lock),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Checkbox(
                  value: _isChecked,
                  onChanged: (v) => setState(() => _isChecked = v!),
                ),
                const Text('Checkbox'),
              ],
            ),
            SwitchListTile(
              title: const Text('Switch Tile'),
              value: _isSwitchOn,
              onChanged: (v) => setState(() => _isSwitchOn = v),
            ),
            const Divider(),
            RadioListTile(
              title: const Text('Option A'),
              value: 0,
              groupValue: _radioVal,
              onChanged: (v) => setState(() => _radioVal = v!),
            ),
            RadioListTile(
              title: const Text('Option B'),
              value: 1,
              groupValue: _radioVal,
              onChanged: (v) => setState(() => _radioVal = v!),
            ),
            const Divider(),
            const Text('Slider'),
            Slider(
              value: _sliderValue,
              onChanged: (v) => setState(() => _sliderValue = v),
              label: '$_sliderValue',
              divisions: 10,
            ),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: () async {
                final TimeOfDay? time = await showTimePicker(
                  context: context,
                  initialTime: TimeOfDay.now(),
                );
                if (time != null) {
                  print('picked time: $time');
                }
              },
              child: const Text('Pick Time'),
            ),
          ],
        ),
      ),
    );
  }
}
