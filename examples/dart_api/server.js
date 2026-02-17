// Copyright 2025 The FlutterJS Authors. All rights reserved.
//
// dart_api demo — compiled output of examples/dart_api/lib/api.dart
//
// This is what the FlutterJS compiler will eventually auto-generate
// from the Dart source. Written by hand to prove the runtime works today.
//
// Run: node examples/dart_api/server.js

import {
  FlutterjsServer,
  Response,
  cors,
  logger,
} from '../../packages/flutterjs_server/flutterjs_server/dist/index.js';

// ─── In-memory user store (compiled from models.dart) ─────────────────────────

const _users = new Map([
  ['1', { id: '1', name: 'Alice',   email: 'alice@example.com' }],
  ['2', { id: '2', name: 'Bob',     email: 'bob@example.com'   }],
  ['3', { id: '3', name: 'Charlie', email: 'charlie@example.com' }],
]);

function getAllUsers()         { return [..._users.values()]; }
function getUserById(id)       { return _users.get(id) ?? null; }
function createUser(name, email) {
  const id = String(_users.size + 1);
  const user = { id, name, email };
  _users.set(id, user);
  return user;
}
function deleteUser(id) {
  if (!_users.has(id)) return false;
  _users.delete(id);
  return true;
}

// ─── Compiled output of UserApi class ─────────────────────────────────────────
//
// Each @Get/@Post/@Delete annotation compiles to a router.add() call.
// This is what flutterjs_server's compiler target will emit.

function mountUserApi(router, prefix = '') {
  const p = prefix;

  // @Get('/')
  router.add('GET', `${p}/`, async (_req) =>
    Response.ok({
      message: 'Welcome to the FlutterJS Server demo API!',
      endpoints: [
        'GET  /health',
        'GET  /users',
        'GET  /users/:id',
        'POST /users  { name, email }',
        'DELETE /users/:id',
      ],
    })
  );

  // @Get('/health')
  router.add('GET', `${p}/health`, async (_req) =>
    Response.ok({ status: 'ok', server: '@flutterjs/server', version: '1.0.0' })
  );

  // @Get('/users')
  router.add('GET', `${p}/users`, async (_req) => {
    const users = getAllUsers();
    return Response.ok({ data: users, count: users.length });
  });

  // @Get('/users/:id')
  router.add('GET', `${p}/users/:id`, async (req) => {
    const user = getUserById(req.params.id);
    if (!user) return Response.notFound({ error: `User ${req.params.id} not found` });
    return Response.ok(user);
  });

  // @Post('/users')  @Body() body
  router.add('POST', `${p}/users`, async (req) => {
    const { name, email } = req.body ?? {};
    if (!name)  return Response.badRequest({ error: 'name is required' });
    if (!email) return Response.badRequest({ error: 'email is required' });
    const user = createUser(name, email);
    return Response.created(user);
  });

  // @Delete('/users/:id')
  router.add('DELETE', `${p}/users/:id`, async (req) => {
    const deleted = deleteUser(req.params.id);
    if (!deleted) return Response.notFound({ error: `User ${req.params.id} not found` });
    return Response.noContent();
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
// Compiled from: @Server(port: 3000) class UserApi { ... }

const server = new FlutterjsServer({ port: 3000 });

server.use(cors());
server.use(logger());
server.mount(mountUserApi);

server.listen(() => {
  console.log('🚀 FlutterJS Server (Dart-compiled Node.js API)');
  console.log('   http://localhost:3000\n');
  console.log('   Try:');
  console.log('   curl http://localhost:3000/users');
  console.log('   curl http://localhost:3000/users/1');
  console.log('   curl -X POST http://localhost:3000/users -H "content-type: application/json" -d \'{"name":"Dave","email":"dave@example.com"}\'');
  console.log('   curl -X DELETE http://localhost:3000/users/1\n');
});
