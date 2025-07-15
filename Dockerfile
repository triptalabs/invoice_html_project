# Usar una imagen base ligera de Node.js
FROM node:20-alpine

# Establecer variables de entorno para producción
ENV NODE_ENV=production
ENV API_KEY=supersecretkey

# Crear directorio de trabajo
WORKDIR /usr/src/app

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Copiar solo los archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar solo dependencias de producción
RUN pnpm install --frozen-lockfile --prod

# Copiar el resto del código necesario
COPY src ./src
COPY generate.js ./
COPY README.md ./
COPY docs ./docs

# Exponer el puerto de la API
EXPOSE 3000

# Comando por defecto
CMD ["pnpm", "api"]
