# ==========================================
# STAGE 1: Build Frontend Assets & Prepare Dependencies
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo package manifests
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install all dependencies (including devDependencies required for Vite build)
RUN npm ci

# Copy application source code
COPY . .

# Build the Vite React production bundle (outputs to client/dist)
RUN npm run build --workspace client

# Prune devDependencies to keep runtime node_modules lightweight
RUN npm prune --omit=dev


# ==========================================
# STAGE 2: Production Minimal Runtime Image
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set default production environment variables
ENV NODE_ENV=production \
    PORT=3001 \
    MOCK_CHATTERBOX=true \
    CLIENT_URL=http://localhost:3001

# Copy root package manifests
COPY --chown=node:node package.json package-lock.json ./

# Copy production node_modules from builder (npm workspaces hoists all workspace packages here)
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

# Copy backend server code and compiled frontend dist bundle
COPY --chown=node:node --from=builder /app/server ./server
COPY --chown=node:node --from=builder /app/client/dist ./client/dist

# Switch to unprivileged non-root node user for container security
USER node

# Expose production port
EXPOSE 3001

# Container Healthcheck probing Express API health endpoint dynamically using PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://localhost:${PORT:-3001}/api/health || exit 1

# Start production server directly with node for proper SIGTERM signal forwarding
CMD ["node", "server/index.js"]
