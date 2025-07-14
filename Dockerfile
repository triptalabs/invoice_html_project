# Paso 1: Usar la imagen oficial de Puppeteer que incluye Node.js y todas las dependencias del sistema.
# La versión de la imagen debe coincidir con la versión de puppeteer en tu package.json (22.15.0)
FROM ghcr.io/puppeteer/puppeteer:22.15.0

# Establecer variables de entorno para un entorno de producción
ENV NODE_ENV=production
ENV API_KEY=supersecretkey

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Cambiar a root para instalar pnpm y las dependencias de producción
USER root

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Copiar los archivos de manifiesto de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar solo las dependencias de producción
RUN pnpm install --frozen-lockfile --prod

# Copiar el resto del código de la aplicación
COPY . .

# Cambiar la propiedad de los archivos de la aplicación al usuario pptruser
# La imagen base ya crea este usuario por nosotros
RUN chown -R pptruser:pptruser /usr/src/app

# Cambiar al usuario no-root para ejecutar la aplicación
USER pptruser

# Exponer el puerto en el que la API se ejecuta
EXPOSE 3000

# El comando que se ejecutará cuando el contenedor inicie
CMD ["pnpm", "api"]
