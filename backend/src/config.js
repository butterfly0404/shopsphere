// All settings come from environment variables (set by Kubernetes in production).
module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  mongoUri: process.env.MONGO_URI || '', // empty = in-memory store (local dev only)
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  version: process.env.APP_VERSION || 'dev',
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@shopsphere.com').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
};
