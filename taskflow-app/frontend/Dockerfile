# Etapa 1: compilar la interfaz React
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN node build.mjs

# Etapa 2: servir con nginx y reenviar /api al backend
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html
COPY --chown=101:101 nginx.conf /etc/nginx/conf.d/default.conf
USER 101
EXPOSE 8080
