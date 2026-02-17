// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/// Simple User model
class User {
  final String id;
  final String name;
  final String email;

  const User({required this.id, required this.name, required this.email});

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'email': email};

  static User fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String? ?? '',
        name: json['name'] as String,
        email: json['email'] as String,
      );
}

/// Simple in-memory user store
final _users = <String, User>{
  '1': User(id: '1', name: 'Alice', email: 'alice@example.com'),
  '2': User(id: '2', name: 'Bob', email: 'bob@example.com'),
  '3': User(id: '3', name: 'Charlie', email: 'charlie@example.com'),
};

List<User> getAllUsers() => _users.values.toList();

User? getUserById(String id) => _users[id];

User createUser(String name, String email) {
  final id = (_users.length + 1).toString();
  final user = User(id: id, name: name, email: email);
  _users[id] = user;
  return user;
}

bool deleteUser(String id) {
  if (!_users.containsKey(id)) return false;
  _users.remove(id);
  return true;
}
