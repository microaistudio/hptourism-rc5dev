# Multi-stage build for HP Tourism Digital Ecosystem
# Optimized for Google Cloud Run deployment

# Stage 1: Build application (frontend + backend)
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy source code
COPY client ./client
COPY server ./server
COPY shared ./shared
COPY drizzle.config.ts ./
COPY tsconfig.json ./
COPY vite.config.ts ./

# Build application
# This runs: vite build (frontend) && esbuild (backend bundling)
RUN npm run build

# Stage 2: Production runtime
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production runtime dependencies
RUN npm ci --only=production

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/shared ./shared

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose port (GCP Cloud Run uses PORT env variable)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/auth/me', (r) => { process.exit(r.statusCode === 401 ? 0 : 1) })"

# Set production environment
ENV NODE_ENV=production

# Start the server (runs bundled dist/index.js)
CMD ["node", "dist/index.js"]
