# Issues para el Sprint de Mejoras de la API

A continuación se describen 4 issues principales para abordar las recomendaciones del sprint. Cada issue incluye subtareas y criterios claros de comprobación de hecho (Definition of Done).

---

## Issue 1: Validación de Datos y Manejo de Archivos Faltantes

### Descripción
Implementar validación estricta del JSON recibido en `/generate-invoice` y mejorar el manejo de errores cuando falten archivos (imágenes, fuentes, etc.).

### Lista de tareas
- [ ] Integrar una librería de validación (por ejemplo, Joi o express-validator).
- [ ] Definir el esquema de datos requerido para la factura.
- [ ] Validar el JSON recibido antes de procesar la generación del PDF.
- [ ] Devolver errores claros y específicos si faltan campos requeridos.
- [ ] Comprobar la existencia de archivos referenciados (logos, fuentes) antes de intentar leerlos.
- [ ] Devolver mensajes de error claros si un archivo no existe.

### Comprobación de hecho
- La API rechaza peticiones con JSON inválido o incompleto con un mensaje claro.
- Si falta un archivo, la API responde con un error específico indicando el archivo faltante.
- Las respuestas de error tienen formato consistente y documentado.

---

## Issue 2: Seguridad y Rate Limiting

### Descripción
Proteger el endpoint de la API mediante autenticación y limitar el número de peticiones por IP para evitar abuso.

### Lista de tareas
- [ ] Implementar autenticación básica (API Key o JWT) en el endpoint `/generate-invoice`.
- [ ] Configurar y documentar cómo obtener y usar la clave/API Key.
- [ ] Integrar un middleware de rate limiting (por ejemplo, express-rate-limit).
- [ ] Definir límites razonables de peticiones por IP.
- [ ] Documentar los posibles errores de autenticación y rate limiting.

### Comprobación de hecho
- El endpoint rechaza peticiones sin autenticación o con credenciales incorrectas.
- Si se excede el límite de peticiones, la API responde con un error adecuado.
- Los mecanismos de autenticación y rate limiting están documentados en api.md.

---

## Issue 3: Pruebas Automatizadas y Documentación de Errores

### Descripción
Crear pruebas automatizadas para el endpoint y documentar claramente los posibles errores y respuestas de la API.

### Lista de tareas
- [ ] Configurar un entorno de testing (jest, supertest, etc.).
- [ ] Escribir tests para casos exitosos y de error en `/generate-invoice`.
- [ ] Incluir tests para validación de datos, autenticación y manejo de archivos faltantes.
- [ ] Documentar en api.md todos los posibles errores y sus formatos de respuesta.

### Comprobación de hecho
- Los tests cubren al menos el 80% de los casos posibles (éxito y error).
- Los errores y respuestas están claramente documentados en api.md.
- El CI (si existe) ejecuta los tests automáticamente.

---

## Issue 4: Optimización, Logging y Actualización de Dependencias

### Descripción
Optimizar el manejo de Puppeteer para concurrencia, añadir logging estructurado y actualizar dependencias del proyecto.

### Lista de tareas
- [ ] Analizar el uso de Puppeteer y considerar un pool de instancias o colas para alta concurrencia.
- [ ] Implementar logs estructurados para peticiones, errores y eventos relevantes.
- [ ] Añadir monitoreo básico (puede ser simple logging a archivo o consola).
- [ ] Revisar y actualizar las dependencias del proyecto.
- [ ] Documentar cualquier cambio relevante en el README.

### Comprobación de hecho
- El sistema maneja múltiples peticiones concurrentes sin cuellos de botella evidentes.
- Los logs permiten rastrear errores y uso de la API.
- Todas las dependencias están actualizadas y el sistema funciona correctamente tras la actualización.

--- 