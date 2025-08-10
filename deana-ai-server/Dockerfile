# syntax=docker/dockerfile:1
FROM node:18-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:18-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# App Runner expects the app to listen on $PORT
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server.js"]
