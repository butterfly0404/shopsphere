const path = require('path');
const config = require('./config');
const { createApp } = require('./app');
const { seed } = require('./seed');
const MemoryStore = require('./store/memory');
const MongoStore = require('./store/mongo');

const store = config.mongoUri ? new MongoStore() : new MemoryStore();
if (!config.mongoUri) console.warn('[db] MONGO_URI not set: using in-memory store (data is lost on restart)');

const app = createApp({
  store,
  jwtSecret: config.jwtSecret,
  version: config.version,
  publicDir: path.join(__dirname, '..', 'public'),
});

// Start listening right away; /api/health reports 503 until the database is ready,
// so Kubernetes only sends traffic to this pod once it can serve requests.
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`[app] ShopSphere ${config.version} listening on port ${config.port}`);
});

(async () => {
  if (config.mongoUri) await store.connectWithRetry(config.mongoUri);
  await seed(store, config);
})().catch((err) => {
  console.error('[app] startup failed', err);
  process.exit(1);
});

const shutdown = (signal) => {
  console.log(`[app] ${signal} received, shutting down`);
  server.close(async () => {
    if (store.disconnect) await store.disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
