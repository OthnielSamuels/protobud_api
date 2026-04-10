# =============================================================
# NestJS Backend — Multi-stage Dockerfile
# Final image target: ≤ 800MB RAM
# =============================================================

# -----------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first — layer cache: only reinstall when deps change
COPY package.json ./

# Install ALL deps (including devDeps needed for build)
RUN npm install --frozen-lockfile

# Copy source and Prisma schema
COPY tsconfig.json nest-cli.json ./
COPY prisma/ ./prisma/
COPY src/ ./src/

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npm run build

# -----------------------------------------------------------
# Stage 2: Production image
# -----------------------------------------------------------
FROM node:20-alpine AS production

# Install wget for health check only (tiny)
RUN apk add --no-cache wget

WORKDIR /app

# Copy package manifest and install production deps only
COPY package.json ./
RUN npm install --omit=dev --frozen-lockfile && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy Prisma schema + generated client
# COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# COPY prisma/ ./prisma/

COPY --from=builder /app/generated ./generated
COPY prisma/ ./prisma/

# Run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

# Run migrations then start the app
# migrations are idempotent — safe to run on every start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
