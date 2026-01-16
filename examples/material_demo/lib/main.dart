import 'package:flutter/material.dart';

void main() {
  runApp(const MaterialDemoApp());
}

class MaterialDemoApp extends StatelessWidget {
  const MaterialDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FlutterJS Material Demo',
      theme: ThemeData(primarySwatch: Colors.blue, useMaterial3: true),
      home: const DemoPage(),
    );
  }
}

class DemoPage extends StatefulWidget {
  const DemoPage({super.key});

  @override
  State<DemoPage> createState() => _DemoPageState();
}

class _DemoPageState extends State<DemoPage> {
  bool _isChecked = false;
  bool _isSwitched = false;
  int _radioValue = 1;
  final TextEditingController _textController = TextEditingController();
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  void _showDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Dialog Title'),
        content: const Text('This is a sample dialog content.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('CANCEL'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Material Components'),
        actions: [IconButton(icon: const Icon(Icons.info), onPressed: () {})],
      ),
      drawer: Drawer(
        child: ListView(
          children: const [
            DrawerHeader(child: Text('Drawer Header')),
            ListTile(title: Text('Item 1')),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('FAB Pressed!')));
        },
        child: const Icon(Icons.add),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Selection Controls',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              CheckboxListTile(
                title: const Text('Checkbox Option'),
                value: _isChecked,
                onChanged: (val) => setState(() => _isChecked = val == true),
              ),
              SwitchListTile(
                title: const Text('Switch Option'),
                value: _isSwitched,
                onChanged: (val) => setState(() => _isSwitched = val),
              ),
              RadioListTile<int>(
                title: const Text('Radio Option 1'),
                value: 1,
                groupValue: _radioValue,
                onChanged: (val) => setState(() => _radioValue = val!),
              ),
              RadioListTile<int>(
                title: const Text('Radio Option 2'),
                value: 2,
                groupValue: _radioValue,
                onChanged: (val) => setState(() => _radioValue = val!),
              ),

              const Divider(height: 32),

              const Text(
                'Inputs & Forms',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _textController,
                decoration: const InputDecoration(
                  labelText: 'TextField',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              Form(
                key: _formKey,
                child: TextFormField(
                  decoration: const InputDecoration(
                    labelText: 'TextFormField (Required)',
                    border: OutlineInputBorder(),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter some text';
                    }
                    return null;
                  },
                ),
              ),
              const SizedBox(height: 10),
              ElevatedButton(
                onPressed: () {
                  if (_formKey.currentState!.validate()) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Form Validated!')),
                    );
                  }
                },
                child: const Text('Validate Form'),
              ),

              const Divider(height: 32),

              const Text(
                'Progress Indicators',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              const LinearProgressIndicator(),
              const SizedBox(height: 16),
              const Center(child: CircularProgressIndicator()),

              const Divider(height: 32),

              const Text(
                'Dialogs',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              ElevatedButton(
                onPressed: () => _showDialog(context),
                child: const Text('Show Dialog'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
