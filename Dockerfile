# =============================================================
# NestJS Backend — Multi-stage Dockerfile
# =============================================================

# -----------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml prisma.config.ts ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma/ ./prisma/
COPY src/ ./src/

RUN pnpm prisma generate
RUN pnpm run build

# -----------------------------------------------------------
# Stage 2: Production image
# -----------------------------------------------------------
FROM node:20-alpine AS production

RUN apk add --no-cache wget

WORKDIR /app

COPY package.json ./

# Copy everything needed from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["node", "dist/main"]