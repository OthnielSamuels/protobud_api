# -----------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml .npmrc ./

RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

RUN pnpm prisma generate
RUN pnpm run build


# -----------------------------------------------------------
# Stage 2: Production
# -----------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml .npmrc ./

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["node", "dist/main"]