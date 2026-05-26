# Multi-stage build for NestJS Worker
FROM node:20-alpine AS builder

WORKDIR /build

# Copy monorepo files
COPY package.json package-lock.json* ./
COPY packages/database/package.json ./packages/database/
COPY apps/worker/package.json ./apps/worker/

# Install dependencies
RUN npm install --frozen-lockfile

# Copy source code
COPY packages/database ./packages/database
COPY apps/worker ./apps/worker

# Build database client + worker
RUN npm run --workspace=@cinematch/database prisma:generate
RUN npm run --workspace=@cinematch/worker build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package.json package-lock.json* ./
COPY packages/database/package.json ./packages/database/
COPY apps/worker/package.json ./apps/worker/

# Install production dependencies only
RUN npm install --frozen-lockfile --production

# Copy built application and Prisma binaries
COPY --from=builder /build/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /build/apps/worker/dist ./apps/worker/dist

# No EXPOSE or HEALTHCHECK for background worker

CMD ["node", "apps/worker/dist/main.js"]
