// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// import 'dart:io';

// Future<void> createFirebaseConfigTemplate() async {
//   print('🔥 Creating Firebase config template...');

//   final firebaseFile = File('web/firebase-config.json');

//   if (await firebaseFile.exists()) {
//     print('   ⚠️  firebase-config.json already exists, skipping...\n');
//     return;
//   }

//   final firebaseContent = '''{
//   "apiKey": "YOUR_API_KEY",
//   "authDomain": "YOUR_PROJECT.firebaseapp.com",
//   "projectId": "YOUR_PROJECT",
//   "storageBucket": "YOUR_PROJECT.appspot.com",
//   "messagingSenderId": "YOUR_SENDER_ID",
//   "appId": "YOUR_APP_ID",
//   "measurementId": "G-XXXXXXXXXX"
// }
// ''';

//   await firebaseFile.writeAsString(firebaseContent);
//   print('✅ Firebase config template created\n');
// }
