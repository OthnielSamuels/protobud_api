# -----------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack (faster + recommended)
RUN corepack enable

# Copy only dependency files first (CACHE OPTIMIZATION)
COPY package.json pnpm-lock.yaml .npmrc ./

RUN pnpm install --frozen-lockfile

# Copy Prisma + source
COPY prisma ./prisma
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

# Generate Prisma client (must be inside builder)
RUN pnpm prisma generate

# Build NestJS
RUN pnpm run build


# -----------------------------------------------------------
# Stage 2: Production image
# -----------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

RUN corepack enable

# Copy dependency manifests
COPY package.json pnpm-lock.yaml .npmrc ./

# Install ONLY production deps
RUN pnpm install --prod --frozen-lockfile

# Copy build output
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# IMPORTANT: DO NOT use generated folder anymore
# Prisma client should come from node_modules (standard mode)

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["node", "dist/main"]