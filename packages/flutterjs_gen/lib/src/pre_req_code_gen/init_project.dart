// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// import 'dart:io';
// import 'package:args/command_runner.dart';
// import 'package:yaml/yaml.dart';
// import 'build_code_gen.dart';
// import 'config_code_gen.dart';
// import 'firebase_code_gen.dart';
// import 'gitignore_code_gen.dart';
// import 'index_code_gen.dart';
// import 'manifest_code_gen.dart';
// import 'services_config.dart';
// import 'service_detection.dart';

// class InitProject extends Command<void> {
//   final bool verbose;
//   final bool verboseHelp;
//   InitProject({required this.verbose, required this.verboseHelp}) {
//     argParser.addFlag(
//       'verbose',
//       abbr: 'v',
//       negatable: false,
//       help: 'Show detailed output',
//     );
//   }

//   @override
//   String get description =>
//       'Initialize FlutterJS converter. Sets up MPA structure with service integration support';

//   @override
//   String get name => "init";

//   @override
//   String get invocation => 'flutterjs init [options]';

//   @override
//   Future<void> run() async {
//     print('🚀 Initializing FlutterJS MPA project...\n');

//     // 1. Verify Flutter project
//     if (!await _isFlutterProject()) {
//       print('❌ Error: Not a Flutter project.');
//       print(
//         '   Ensure you are in a Flutter project directory with a valid pubspec.yaml.',
//       );
//       exit(1);
//     }

//     // 2. Verify web folder exists
//     if (!await _hasWebSupport()) {
//       print('❌ Error: Web support not enabled.');
//       print('   Run: flutter create --platforms=web .');
//       exit(1);
//     }

//     print('✅ Flutter project with web support detected\n');

//     // 3. Detect services from pubspec.yaml
//     final services = await detectServices();

//     // 4. Create build output structure
//     // await createBuildStructure(verbose);

//     // 5. Create FlutterJS configuration
//     // await createConfigFile(services);

//     // 6. Create MPA index.html
//     // await createMPAIndexHtml(verbose);

//     // 7. Create services configuration
//     // await createServicesConfig(services);

//     // 8. Create Firebase config template (if Firebase detected)
//     if (services.hasFirebase) {
//       await createFirebaseConfigTemplate();
//     }

//     // 9. Update .gitignore
//     // await updateGitignore(verbose);

//     // 10. Create manifest template
//     // await createManifestTemplate();

//     // // 11. Update web/manifest.json for PWA (if Firebase detected)
//     // if (services.hasFirebase) {
//     //   await _updateWebManifest();
//     // }

//     print('\n✨ FlutterJS MPA initialization complete!\n');
//     _printProjectStructure(services);
//     _printUsageInstructions(services);
//   }

//   Future<bool> _isFlutterProject() async {
//     final pubspecFile = File('pubspec.yaml');
//     if (!await pubspecFile.exists()) return false;

//     try {
//       final content = await pubspecFile.readAsString();
//       final pubspec = loadYaml(content);
//       return pubspec['dependencies']?.containsKey('flutter') ?? false;
//     } catch (e) {
//       if (verbose) print('Error reading pubspec.yaml: $e');
//       return false;
//     }
//   }

//   Future<bool> _hasWebSupport() async {
//     final webDir = Directory('web');
//     final indexFile = File('web/index.html');
//     return await webDir.exists() && await indexFile.exists();
//   }

//   // Future<void> _updateWebManifest() async {
//   //   print('📱 Updating web/manifest.json for Firebase FCM...');

//   //   final manifestFile = File('web/manifest.json');
//   //   if (!await manifestFile.exists()) {
//   //     print('   ⚠️  web/manifest.json not found, skipping...\n');
//   //     return;
//   //   }

//   //   try {
//   //     final content = await manifestFile.readAsString();
//   //     final manifest = json.decode(content) as Map<String, dynamic>;

//   //     // Add gcm_sender_id if not present
//   //     if (!manifest.containsKey('gcm_sender_id')) {
//   //       manifest['gcm_sender_id'] = '103953800507';

//   //       await manifestFile.writeAsString(
//   //         JsonEncoder.withIndent('    ').convert(manifest),
//   //       );
//   //       print('   ✅ Added gcm_sender_id for Firebase FCM\n');
//   //     } else {
//   //       print('   ℹ️  gcm_sender_id already present\n');
//   //     }
//   //   } catch (e) {
//   //     print('   ⚠️  Could not update manifest.json: $e\n');
//   //   }
//   // }

//   void _printProjectStructure(DetectedServices services) {
//     print('📁 Project Structure:');
//     print('   ├── lib/                           (Your Flutter/Dart code)');
//     print('   │   ├── pages/');
//     print('   │   │   ├── home.dart');
//     print('   │   │   ├── profile.dart');
//     print('   │   │   └── dashboard.dart');
//     if (services.hasAnyService) {
//       print('   │   └── services/');
//       if (services.hasFirebase) {
//         print('   │       └── firebase_service.dart');
//       }
//     }
//     print('   │');
//     print('   ├── web/');
//     print('   │   ├── index.html                (MPA loader)');
//     print('   │   ├── index.html.flutter        (Original Flutter backup)');
//     print('   │   ├── services-config.js        (Firebase/API config)');
//     if (services.hasFirebase) {
//       print('   │   ├── firebase-config.json      (Firebase credentials)');
//     }
//     print('   │   └── manifest.json');
//     print('   │');
//     print('   ├── build/flutterjs/output/       (Transpiled pages)');
//     print('   │   ├── manifest.json');
//     print('   │   ├── runtime.js');
//     if (services.hasAnyService) {
//       print('   │   ├── services/                 (Firebase, APIs)');
//       if (services.hasFirebase) {
//         print('   │   │   └── firebase.js');
//       }
//     }
//     print('   │   └── pages/                    (Each page = separate HTML)');
//     print('   │       ├── home.html');
//     print('   │       ├── home.css');
//     print('   │       ├── home.js');
//     print('   │       ├── profile.html');
//     print('   │       └── dashboard.html\n');
//   }

//   void _printUsageInstructions(DetectedServices services) {
//     print('🔄 How MPA works:');
//     print('   ROUTING:');
//     print('   → /                  → pages/home.html');
//     print('   → /profile           → pages/profile.html');
//     print('   → /dashboard         → pages/dashboard.html');
//     print('   → Each route = Separate HTML page (true MPA)');
//     print('   → Browser native back/forward works automatically');

//     if (services.hasAnyService) {
//       print('   ');
//       print('   SERVICES:');
//       if (services.hasFirebase) {
//         print('   → Firebase: Configure in web/firebase-config.json');
//       }
//       if (services.hasHttp || services.hasDio) {
//         print('   → REST API: Configure in web/services-config.js');
//       }
//       if (services.hasGraphQL) {
//         print('   → GraphQL: Configure in web/services-config.js');
//       }
//       print('   → Auto-loaded before page content');
//       print('   → Shared across all pages');
//     }

//     print('');
//     print('✅ MPA mode enabled - Each route is a separate page');
//     if (services.hasFirebase) {
//       print('✅ Firebase support enabled');
//     }
//     if (services.hasHttp || services.hasDio) {
//       print('✅ HTTP/REST API support enabled');
//     }
//     if (services.hasGraphQL) {
//       print('✅ GraphQL support enabled');
//     }
//     print('✅ SEO-friendly with proper meta tags per page');
//     print('✅ Run "flutterjs run" and open web/index.html\n');
//   }
// }
