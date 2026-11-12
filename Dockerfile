# ShopSphere: one image that serves the React frontend and the Express API.
#
#   docker build --target test .                          -> runs the API tests (Jenkins "Test" stage)
#   docker build --build-arg APP_VERSION=v12 -t img:v12 .  -> production image

# ---- 1. Build the React frontend ----
FROM node:22-alpine AS frontend
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---- 2. Backend production dependencies only ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---- 3. Test stage: all dependencies + run the test suite ----
FROM node:22-alpine AS test
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY backend/ ./
ENV CI=true
RUN npm test

# ---- 4. Final runtime image ----
FROM node:22-alpine AS runtime
ARG APP_VERSION=dev
ENV NODE_ENV=production \
    PORT=3000 \
    APP_VERSION=${APP_VERSION}
LABEL org.opencontainers.image.title="shopsphere" \
      org.opencontainers.image.version="${APP_VERSION}"
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY backend/package.json ./
COPY backend/src ./src
COPY --from=frontend /fe/dist ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD wget -qO- http://localhost:3000/api/live || exit 1
CMD ["node", "src/server.js"]
