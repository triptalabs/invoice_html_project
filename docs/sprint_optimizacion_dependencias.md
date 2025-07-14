# Sprint: Optimización y Limpieza de Dependencias

## Objetivo
Reducir el tamaño de la imagen Docker y simplificar el mantenimiento del proyecto eliminando, reemplazando o manteniendo solo las dependencias esenciales.

---

## Tareas del Sprint

### 1. Eliminar dependencias innecesarias
- **Acción:** Quitar `cheerio`, `generic-pool`, `puppeteer`, `pino-pretty`, `yargs` (si no se usa), y `undici` (si no se usa en tests) de `package.json` y del código.
- **Responsable:** dev
- **Prioridad:** Alta
- **Criterio de aceptación:** Las dependencias ya no aparecen en `package.json` ni en el lockfile, y el código no las requiere.

### 2. Reemplazar Puppeteer por html-pdf
- **Acción:** Instalar `html-pdf` y modificar el código para generar PDFs usando esta librería en vez de Puppeteer.
- **Responsable:** dev
- **Prioridad:** Alta
- **Criterio de aceptación:** El sistema genera PDFs correctamente usando `html-pdf` y Puppeteer ha sido eliminado.

### 3. Mantener dependencias esenciales
- **Acción:** Verificar que se mantienen solo las dependencias necesarias: `express`, `handlebars`, `joi`, `pino`, `uvu`, `express-rate-limit` (si la API es pública).
- **Responsable:** dev
- **Prioridad:** Media
- **Criterio de aceptación:** Solo las dependencias esenciales están presentes en `package.json`.

### 4. Actualizar y limpiar el entorno
- **Acción:** Ejecutar `pnpm install` y `pnpm prune` para limpiar dependencias no usadas. Probar que la app y los tests funcionan.
- **Responsable:** dev
- **Prioridad:** Alta
- **Criterio de aceptación:** El proyecto instala solo las dependencias necesarias y pasa los tests.

### 5. Documentar los cambios
- **Acción:** Actualizar la documentación técnica para reflejar las nuevas dependencias y el método de generación de PDFs.
- **Responsable:** dev
- **Prioridad:** Media
- **Criterio de aceptación:** La documentación está actualizada y clara para futuros desarrolladores.

### 6. Modificar y optimizar el Dockerfile
- **Acción:** Actualizar el Dockerfile para:
  - Usar una imagen base más ligera (por ejemplo, `node:20-alpine` si html-pdf funciona correctamente en Alpine, o una imagen oficial de Node.js lo más pequeña posible compatible con PhantomJS).
  - Instalar solo dependencias de producción (`pnpm install --prod`).
  - Copiar solo los archivos necesarios (apoyarse en `.dockerignore`).
  - Excluir herramientas y archivos de desarrollo.
  - Probar que la generación de PDF funciona correctamente en el contenedor.
- **Responsable:** dev
- **Prioridad:** Alta
- **Criterio de aceptación:** La imagen Docker resultante es significativamente más ligera, la app funciona correctamente y solo incluye lo necesario para producción.

---

## Notas
- El mayor impacto en el tamaño de la imagen Docker lo tiene la eliminación de Puppeteer y Chromium.
- html-pdf es mucho más ligero y suficiente para documentos simples.
- Mantener solo lo esencial mejora la seguridad y el mantenimiento.

---

**Sprint creado:** Junio 2024 