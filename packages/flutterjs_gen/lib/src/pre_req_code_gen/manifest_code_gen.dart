// import 'dart:io';

// Future<void> createManifestTemplate() async {
//   print('📋 Creating MPA manifest template...');

//   final manifestFile = File('build/flutterjs/output/manifest.json');
//   await manifestFile.writeAsString('''{
//   "version": "1.0.0",
//   "mode": "mpa",
//   "generated": 0,
//   "files": {
//     "runtime": "runtime.js",
//     "styles": ["styles/global.css"],
//     "services": ["services/firebase.js"]
//   },
//   "routes": {
//     "/": {
//       "html": "pages/home.html",
//       "css": "pages/home.css",
//       "js": "pages/home.js",
//       "meta": {
//         "title": "Home - My App",
//         "description": "Welcome to my app",
//         "keywords": "flutter, web, home"
//       }
//     },
//     "/profile": {
//       "html": "pages/profile.html",
//       "css": "pages/profile.css",
//       "js": "pages/profile.js",
//       "meta": {
//         "title": "Profile - My App",
//         "description": "User profile page"
//       }
//     },
//     "/dashboard": {
//       "html": "pages/dashboard.html",
//       "css": "pages/dashboard.css",
//       "js": "pages/dashboard.js",
//       "meta": {
//         "title": "Dashboard - My App",
//         "description": "User dashboard"
//       }
//     }
//   }
// }
// ''');

//   print('✅ MPA manifest template created\n');
// }
