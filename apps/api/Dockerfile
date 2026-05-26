# Multi-stage build for NestJS API
FROM node:20-alpine AS builder

WORKDIR /build

# Copy monorepo files
COPY package.json package-lock.json* ./
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

# Install dependencies (all workspaces)
RUN npm install --frozen-lockfile

# Copy source code
COPY packages/database ./packages/database
COPY apps/api ./apps/api

# Build database client + API
RUN npm run --workspace=@cinematch/database prisma:generate
RUN npm run --workspace=@cinematch/api build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package.json package-lock.json* ./
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN npm install --frozen-lockfile --production

# Copy built application and Prisma binaries
COPY --from=builder /build/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /build/apps/api/dist ./apps/api/dist

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "apps/api/dist/main.js"]
