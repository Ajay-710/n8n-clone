# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/ui/package*.json ./packages/ui/

# Install dependencies for the monorepo
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN cd packages/api && npx prisma generate

# Build UI and API
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built assets and necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/api/package*.json ./packages/api/
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=builder /app/packages/ui/dist ./packages/ui/dist

# Expose port (Railway dynamic port injection)
ENV PORT=3000
EXPOSE $PORT

# Start the NestJS API server
CMD ["npm", "start"]
