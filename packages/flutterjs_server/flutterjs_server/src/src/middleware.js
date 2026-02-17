// ============================================================================
// Generated from Dart IR - Model-to-JS Conversion
// WARNING: Do not edit manually - changes will be lost
// Generated at: 2026-02-17 17:43:31.885511
// File: C:\Jay\_Plugin\flutterjs\packages\flutterjs_server\lib\src\middleware.dart
// ============================================================================

import './request.js';
import './response.js';
import './router.js';


const cors = ({ origin = "*", methods = "GET,POST,PUT,PATCH,DELETE,OPTIONS" } = {}) => async (request, next) => next();

const logger = () => async (request, next) => next();

const bearerAuth = (verifyFn = undefined) => async (request, next) => next();


// ============================================================================
// EXPORTS
// ============================================================================

export {
  cors,
  logger,
  bearerAuth,
};

