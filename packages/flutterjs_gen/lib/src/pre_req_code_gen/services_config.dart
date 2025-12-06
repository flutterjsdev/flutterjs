// import 'dart:io';

// import 'service_detection.dart';

// Future<void> createServicesConfig(DetectedServices services) async {
//   print('🔧 Creating services configuration...');

//   // Skip file creation if no services are detected
//   if (!services.hasAnyService) {
//     print(
//       '   ℹ️  No services detected, skipping services-config.js creation\n',
//     );
//     return;
//   }

//   final servicesFile = File('web/services-config.js');

//   if (await servicesFile.exists()) {
//     print('   ⚠️  services-config.js already exists, skipping...\n');
//     return;
//   }

//   // Build the configuration object
//   final configParts = <String>[];

//   // Firebase configuration with all possible services
//   if (services.hasFirebase) {
//     configParts.add('''
//     firebase: {
//       enabled: ${services.hasFirebase},
//       config: {
//         apiKey: "YOUR_API_KEY",
//         authDomain: "YOUR_PROJECT.firebaseapp.com",
//         projectId: "YOUR_PROJECT",
//         storageBucket: "YOUR_PROJECT.appspot.com",
//         messagingSenderId: "YOUR_SENDER_ID",
//         appId: "YOUR_APP_ID",
//         measurementId: "${services.hasAnalytics ? 'YOUR_MEASUREMENT_ID' : ''}"
//       },
//       services: {
//         auth: ${services.hasAuth},
//         firestore: ${services.hasFirestore},
//         storage: ${services.hasStorage},
//         analytics: ${services.hasAnalytics},
//         crashlytics: ${services.hasCrashlytics},
//         functions: ${services.hasFunctions},
//         messaging: ${services.hasMessaging},
//         database: ${services.hasDatabase}
//       }
//     }''');
//   }

//   // API configuration
//   if (services.hasDio || services.hasHttp) {
//     configParts.add('''
//     api: {
//       enabled: ${services.hasHttp || services.hasDio},
//       baseURL: 'https://api.example.com',
//       timeout: 30000,
//       headers: {
//         'Content-Type': 'application/json'
//       }
//     }''');
//   }

//   // GraphQL configuration
//   if (services.hasGraphQL) {
//     configParts.add('''
//     graphql: {
//       enabled: ${services.hasGraphQL},
//       endpoint: 'https://api.example.com/graphql'
//     }''');
//   }

//   // Build the init method
//   final initCalls = <String>[];

//   if (services.hasFirebase) {
//     initCalls.add('''
//     // Initialize Firebase
//     if (this.config.firebase.enabled) {
//       await this.initFirebase();
//     }''');
//   }

//   if (services.hasHttp || services.hasDio) {
//     initCalls.add('''
//     // Initialize API client
//     if (this.config.api.enabled) {
//       await this.initAPI();
//     }''');
//   }

//   if (services.hasGraphQL) {
//     initCalls.add('''
//     // Initialize GraphQL
//     if (this.config.graphql.enabled) {
//       await this.initGraphQL();
//     }''');
//   }

//   // Build the service methods
//   final methods = <String>[];

//   if (services.hasFirebase) {
//     methods.add('''
//   // Firebase initialization
//   async initFirebase() {
//     try {
//       // Load Firebase core
//       await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');

//       // Load enabled Firebase services
//       ${services.hasAuth ? "await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js');" : ''}
//       ${services.hasFirestore ? "await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js');" : ''}
//       ${services.hasStorage ? "await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js');" : ''}
//       ${services.hasAnalytics ? "await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics-compat.js');" : ''}
//       ${services.hasCrashlytics ? "await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-crashlytics-compat.js');" : ''}
//       ${services.hasFunctions ? "await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions-compat.js');" : ''}
//       ${services.hasMessaging ? "await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');" : ''}
//       ${services.hasDatabase ? "await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js');" : ''}

//       // Initialize Firebase
//       firebase.initializeApp(this.config.firebase.config);

//       // Initialize enabled services
//       ${services.hasAuth ? "window.firebaseAuth = firebase.auth();" : ''}
//       ${services.hasFirestore ? "window.firebaseDb = firebase.firestore();" : ''}
//       ${services.hasStorage ? "window.firebaseStorage = firebase.storage();" : ''}
//       ${services.hasAnalytics ? "window.firebaseAnalytics = firebase.analytics();" : ''}
//       ${services.hasCrashlytics ? "window.firebaseCrashlytics = firebase.crashlytics();" : ''}
//       ${services.hasFunctions ? "window.firebaseFunctions = firebase.functions();" : ''}
//       ${services.hasMessaging ? "window.firebaseMessaging = firebase.messaging();" : ''}
//       ${services.hasDatabase ? "window.firebaseDatabase = firebase.database();" : ''}

//       console.log('[Services] Firebase initialized with enabled services');
//     } catch (error) {
//       console.error('[Services] Firebase init error:', error);
//     }
//   }''');
//   }

//   if (services.hasHttp || services.hasDio) {
//     methods.add('''
//   // API client initialization
//   async initAPI() {
//     window.apiClient = {
//       baseURL: this.config.api.baseURL,
      
//       async request(method, endpoint, data = null) {
//         const url = \`\${this.baseURL}\${endpoint}\`;
//         const options = {
//           method,
//           headers: FlutterJSServices.config.api.headers,
//         };
        
//         if (data) {
//           options.body = JSON.stringify(data);
//         }
        
//         try {
//           const response = await fetch(url, options);
//           if (!response.ok) throw new Error(\`API error: \${response.status}\`);
//           return await response.json();
//         } catch (error) {
//           console.error('[API] Request failed:', error);
//           throw error;
//         }
//       },
      
//       get(endpoint) {
//         return this.request('GET', endpoint);
//       },
      
//       post(endpoint, data) {
//         return this.request('POST', endpoint, data);
//       },
      
//       put(endpoint, data) {
//         return this.request('PUT', endpoint, data);
//       },
      
//       delete(endpoint) {
//         return this.request('DELETE', endpoint);
//       }
//     };
    
//     console.log('[Services] API client initialized');
//   }''');
//   }

//   if (services.hasGraphQL) {
//     methods.add('''
//   // GraphQL initialization
//   async initGraphQL() {
//     window.graphqlClient = {
//       endpoint: this.config.graphql.endpoint,
      
//       async query(query, variables = {}) {
//         try {
//           const response = await fetch(this.endpoint, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ query, variables })
//           });
          
//           const result = await response.json();
//           if (result.errors) throw new Error(result.errors[0].message);
//           return result.data;
//         } catch (error) {
//           console.error('[GraphQL] Query failed:', error);
//           throw error;
//         }
//       }
//     };
    
//     console.log('[Services] GraphQL client initialized');
//   }''');
//   }

//   // Always include loadScript method
//   methods.add('''
//   // Helper to load external scripts
//   loadScript(src) {
//     return new Promise((resolve, reject) => {
//       const script = document.createElement('script');
//       script.src = src;
//       script.onload = resolve;
//       script.onerror = reject;
//       document.head.appendChild(script);
//     });
//   }''');

//   // Compose the final file
//   final servicesContent =
//       '''/**
//  * FlutterJS Services Configuration
//  * Auto-generated based on detected dependencies
//  */

// window.FlutterJSServices = {
//   // Configuration
//   config: {
// ${configParts.join(',\n    \n')}
//   },
  
//   // Initialize all services
//   async init() {
//     console.log('[Services] Initializing...');
// ${initCalls.join('\n    \n')}
    
//     console.log('[Services] ✅ All services initialized');
//   },
// ${methods.join(',\n  \n')}
// };
// ''';

//   await servicesFile.writeAsString(servicesContent);
//   print('✅ Services configuration created\n');
// }
