import 'package:flutter/material.dart';

void main() {
  runApp(const AdvancedDemoApp());
}

class AdvancedDemoApp extends StatelessWidget {
  const AdvancedDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Advanced Demo',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.teal),
      home: const AdvancedPage(),
    );
  }
}

class AdvancedPage extends StatefulWidget {
  const AdvancedPage({super.key});

  @override
  State<AdvancedPage> createState() => _AdvancedPageState();
}

class _AdvancedPageState extends State<AdvancedPage> {
  String _dropdownValue = 'One';
  DateTime? _selectedDate;

  // Clean mock for refresh
  Future<void> _handleRefresh() async {
    await Future.delayed(const Duration(seconds: 2));
    print('Refreshed!');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Advanced Widgets'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info),
            onPressed: () {
              showAboutDialog(
                context: context,
                applicationName: 'Advanced Demo',
                applicationVersion: '1.0.0',
                applicationLegalese: '© 2026 FlutterJS',
                children: [const Text('This demo showcases complex widgets.')],
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _handleRefresh,
        child: SingleChildScrollView(
          physics:
              const AlwaysScrollableScrollPhysics(), // Ensure scroll for refresh
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Carousel',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              const SizedBox(height: 10),
              Container(
                height: 150,
                color: Colors.grey.shade200,
                alignment: Alignment.center,
                child: const Text(
                  'Carousel (Custom widget - see src/material/carousel.js)',
                ),
              ),
              const Divider(height: 30),

              const Text(
                'Dropdown',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              DropdownButton<String>(
                value: _dropdownValue,
                onChanged: (String? newValue) {
                  setState(() {
                    _dropdownValue = newValue!;
                  });
                },
                items: <String>['One', 'Two', 'Three', 'Four']
                    .map<DropdownMenuItem<String>>((String value) {
                      return DropdownMenuItem<String>(
                        value: value,
                        child: Text(value),
                      );
                    })
                    .toList(),
              ),
              const Divider(height: 30),

              const Text(
                'Pickers',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              ElevatedButton(
                onPressed: () async {
                  final DateTime? picked = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now(),
                    firstDate: DateTime(2020),
                    lastDate: DateTime(2030),
                  );
                  if (picked != null && picked != _selectedDate) {
                    setState(() {
                      _selectedDate = picked;
                    });
                  }
                },
                child: Text(
                  _selectedDate == null
                      ? 'Select Date'
                      : 'Date: ${_selectedDate!.toLocal()}'.split(' ')[0],
                ),
              ),

              const Divider(height: 30),
              const Text(
                'Ink & Interaction',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),

              Material(
                color: Colors.amberAccent,
                child: InkWell(
                  onTap: () {
                    print('InkWell tapped');
                  },
                  splashColor: Colors.blue.withOpacity(0.3),
                  child: Container(
                    width: 100,
                    height: 100,
                    alignment: Alignment.center,
                    child: Text('Tap Me (InkWell)'),
                  ),
                ),
              ),

              const Divider(height: 30),
              const Text(
                'Extras',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              const Row(
                children: [
                  FlutterLogo(size: 48),
                  SizedBox(width: 20),
                  BackButton(),
                  SizedBox(width: 10),
                  CloseButton(),
                ],
              ),

              const SizedBox(height: 50), // Pad for scrolling
              const Center(child: Text('Pull down to refresh...')),
            ],
          ),
        ),
      ),
    );
  }
}
