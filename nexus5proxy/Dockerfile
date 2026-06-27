# =============================================================================
# Stage 1: Build Stage
# =============================================================================
FROM node:24-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@10

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./

# Copy workspace packages
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server
COPY scripts ./scripts

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the project
RUN pnpm run build

# =============================================================================
# Stage 2: Runtime Stage
# =============================================================================
FROM node:24-alpine

# Install pnpm in runtime image
RUN npm install -g pnpm@9

# Set working directory
WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/artifacts/api-server/dist ./dist
COPY --from=builder /app/artifacts/api-server/package.json ./package.json
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --no-frozen-lockfile

# Expose the port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
