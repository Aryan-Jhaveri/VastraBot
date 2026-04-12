# Stage 1: Build React SPA
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY src/transport/web/app/package*.json ./
RUN npm install
COPY src/transport/web/app/ .
RUN npm run build

# Stage 2: Production runtime
# better-sqlite3 native bindings are compiled here for the runtime platform
FROM node:22-alpine AS runner
WORKDIR /app

# Install build tools needed for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

COPY src/ src/

# Copy built SPA from Stage 1
COPY --from=frontend-builder /app/frontend/dist src/transport/web/app/dist

ENV NODE_ENV=production
ENV CLOSET_DATA_DIR=/data
EXPOSE 3000

# combined.ts starts Express + Telegram bot in a single process.
# Web-only mode (no TELEGRAM_BOT_TOKEN): just the Express server.
CMD ["npx", "tsx", "src/combined.ts"]
