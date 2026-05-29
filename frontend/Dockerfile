# ==================== ÉTAPE 1 : BUILD ====================
FROM node:20-alpine AS builder

WORKDIR /app

# Installation des outils nécessaires (incluant zlib-dev)
RUN apk add --no-cache python3 make g++ autoconf automake zlib-dev libpng-dev

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation avec ignore-scripts
RUN npm install --legacy-peer-deps --ignore-scripts

# Réinstaller les scripts essentiels
RUN npm rebuild esbuild rollup

# Installation du module Rollup
RUN npm install @rollup/rollup-linux-x64-musl --legacy-peer-deps --ignore-scripts || true

# Copie du code source
COPY . .

# Nettoyage
RUN rm -rf node_modules/@esbuild/win32-x64 2>/dev/null || true

# Build
RUN npm run build

# ==================== ÉTAPE 2 : NGINX ====================
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]