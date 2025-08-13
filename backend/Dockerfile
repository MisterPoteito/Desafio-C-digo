# ---- backend/Dockerfile ----

FROM node:18-alpine AS dependencies
WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

FROM node:18-alpine

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules

COPY server.js ./

EXPOSE 8080

CMD [ "node", "server.js" ]