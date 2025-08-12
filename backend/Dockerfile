# Etapa de construcción
FROM node:18-alpine AS build
WORKDIR /app
COPY src/package*.json ./
RUN npm install
COPY src/ .
# RUN npm run build # Si tu backend necesita un paso de compilación (e.g., TypeScript)

# Etapa final
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app .
# La app debe leer la config (DB_HOST, etc.) desde variables de entorno
CMD ["node", "index.js"]