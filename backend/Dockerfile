# Multi-stage Dockerfile for Fundit Express API
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install curl for docker healthcheck
RUN apk add --no-cache curl

# Run as non-root user for container security
USER node

COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node . .

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/config || exit 1

CMD ["node", "index.js"]
