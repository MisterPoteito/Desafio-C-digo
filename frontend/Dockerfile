# Etapa de construcción
FROM node:18-alpine AS build
WORKDIR /app
COPY src/package*.json ./
RUN npm install
COPY src/ .
RUN npm run build

# Etapa de servicio
FROM nginx:stable-alpine
# La variable de entorno VITE_API_URL debe ser seteada en el despliegue de Cloud Run
COPY --from=build /app/dist /usr/share/nginx/html
# Opcional: Copia una configuración de NGINX si necesitas reescribir URLs
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]