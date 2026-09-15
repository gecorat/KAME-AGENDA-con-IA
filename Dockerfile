# Imagen para Cloud Run. Construye el front con Vite y el servidor con esbuild.
FROM node:20-slim

WORKDIR /app

# Dependencias primero: si no cambian, Docker reutiliza esta capa.
COPY package.json ./
RUN npm install --no-audit --no-fund

# Codigo y build
COPY . .
RUN npm run build

ENV NODE_ENV=production

# Cloud Run inyecta PORT; el servidor ya lo respeta.
CMD ["npm", "start"]
