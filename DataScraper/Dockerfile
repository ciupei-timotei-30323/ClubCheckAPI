# Stage 1: Builder
FROM node:lts-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Clean install of all dependencies (including dev)
RUN npm ci
COPY . .

# Stage 2: Production Runtime
FROM node:lts-alpine
# Install dumb-init for proper OS signal handling
RUN apk add --no-cache dumb-init

# Optimize Node.js frameworks for production
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
# Clean install ONLY production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy application files (or /dist folder if compiled) from builder
COPY --from=builder /app/src ./src

# Restrict file ownership to the built-in non-root user
RUN chown -R node:node /app

# Drop root privileges immediately
USER node

EXPOSE 3000

# Run the app wrapped in dumb-init to prevent zombie processes
CMD ["dumb-init", "node", "src/index.js"]