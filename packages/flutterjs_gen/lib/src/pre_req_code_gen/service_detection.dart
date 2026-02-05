// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// import 'dart:io';
// import 'package:yaml/yaml.dart';

// Future<DetectedServices> detectServices() async {
//   print('🔍 Detecting services from pubspec.yaml...\n');

//   final pubspecFile = File('pubspec.yaml');
//   final content = await pubspecFile.readAsString();
//   final pubspec = loadYaml(content);

//   final dependencies = pubspec['dependencies'] as Map?;
//   final devDependencies = pubspec['dev_dependencies'] as Map?;

//   final allDeps = {...?dependencies?.keys, ...?devDependencies?.keys};

//   final services = DetectedServices(
//     hasFirebase: checkFirebaseDeps(allDeps.cast<String>()),
//     hasAuth: allDeps.contains('firebase_auth'),
//     hasFirestore: allDeps.contains('cloud_firestore'),
//     hasStorage: allDeps.contains('firebase_storage'),
//     hasAnalytics: allDeps.contains('firebase_analytics'),
//     hasCrashlytics: allDeps.contains('firebase_crashlytics'),
//     hasFunctions: allDeps.contains('cloud_functions'),
//     hasMessaging: allDeps.contains('firebase_messaging'),
//     hasDatabase: allDeps.contains('firebase_database'),
//     hasHttp: checkHttpDeps(allDeps.cast<String>()),
//     hasDio: allDeps.contains('dio'),
//     hasGraphQL:
//         allDeps.contains('graphql_flutter') || allDeps.contains('graphql'),
//   );

//   // Print detected services
//   if (services.hasFirebase) {
//     print('   ✅ Firebase detected with services:');
//     if (services.hasAuth) print('      - Authentication');
//     if (services.hasFirestore) print('      - Firestore');
//     if (services.hasStorage) print('      - Storage');
//     if (services.hasAnalytics) print('      - Analytics');
//     if (services.hasCrashlytics) print('      - Crashlytics');
//     if (services.hasFunctions) print('      - Cloud Functions');
//     if (services.hasMessaging) print('      - Messaging');
//     if (services.hasDatabase) print('      - Realtime Database');
//   }
//   if (services.hasHttp || services.hasDio) {
//     print('   ✅ HTTP client detected (${services.hasDio ? 'Dio' : 'http'})');
//   }
//   if (services.hasGraphQL) {
//     print('   ✅ GraphQL detected');
//   }
//   if (!services.hasAnyService) {
//     print('   ℹ️  No external services detected');
//   }

//   print('');
//   return services;
// }

// // Helper to check Firebase dependencies
// bool checkFirebaseDeps(Set<String> deps) {
//   return deps.contains('firebase_core') ||
//       deps.contains('firebase_auth') ||
//       deps.contains('cloud_firestore') ||
//       deps.contains('firebase_storage') ||
//       deps.contains('firebase_analytics') ||
//       deps.contains('firebase_crashlytics') ||
//       deps.contains('cloud_functions') ||
//       deps.contains('firebase_messaging') ||
//       deps.contains('firebase_database');
// }

// bool checkHttpDeps(Set<String> deps) {
//   return deps.contains('http');
// }

// // Helper class to track detected services
// // Helper class to track detected services
// class DetectedServices {
//   final bool hasFirebase;
//   final bool hasAuth;
//   final bool hasFirestore;
//   final bool hasStorage;
//   final bool hasAnalytics;
//   final bool hasCrashlytics;
//   final bool hasFunctions;
//   final bool hasMessaging;
//   final bool hasDatabase;
//   final bool hasHttp;
//   final bool hasDio;
//   final bool hasGraphQL;

//   DetectedServices({
//     required this.hasFirebase,
//     required this.hasAuth,
//     required this.hasFirestore,
//     required this.hasStorage,
//     required this.hasAnalytics,
//     required this.hasCrashlytics,
//     required this.hasFunctions,
//     required this.hasMessaging,
//     required this.hasDatabase,
//     required this.hasHttp,
//     required this.hasDio,
//     required this.hasGraphQL,
//   });

//   bool get hasAnyService => hasFirebase || hasHttp || hasDio || hasGraphQL;
// }
