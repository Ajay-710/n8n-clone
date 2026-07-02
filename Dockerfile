FROM node:20-alpine

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

# Expose port (Railway dynamic port injection)
ENV PORT=3000
EXPOSE $PORT

# Start the NestJS API server
CMD ["npm", "start"]
