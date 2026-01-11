import 'package:flutter/material.dart';
import 'models/data_model.dart';
import 'widgets/user_profile_card.dart';
// Import utils but hide a specific widget to test "hide" logic
import 'utils_widget.dart' hide UnusedWidget;

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  final List<User> users = const [
    User(name: 'Jay', role: 'Developer', avatarUrl: ''),
    User(name: 'Alice', role: 'Designer', avatarUrl: ''),
    User(name: 'Bob', role: 'Manager', avatarUrl: ''),
  ];

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Advanced Multi-File Test',
      home: Scaffold(
        appBar: AppBar(
          title: const Text('Team Members'),
          backgroundColor: Colors.indigo,
        ),
        body: Container(
          color: Colors.grey.shade100,
          child: Column(
            children: [
               UtilsWidget(), // Usage ensures import is kept
              Expanded(
                child: ListView.builder(
                  itemCount: users.length,
                  itemBuilder: (context, index) {
                    return UserProfileCard(user: users[index]);
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
