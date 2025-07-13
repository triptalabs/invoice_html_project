# Sprint de Mejoras para la API de Facturación

Este documento describe un conjunto de tareas recomendadas para mejorar la robustez, seguridad y mantenibilidad de la API REST de facturación. Cada recomendación incluye una justificación técnica.

---

## 1. Validación de Datos de Entrada

**Tarea:** Implementar validación estricta del JSON recibido en `/generate-invoice` usando una librería como `Joi` o `express-validator`.

**Justificación:**
Actualmente, la API asume que el JSON recibido es correcto. Si faltan campos requeridos o hay datos malformados, puede causar errores internos o PDFs incorrectos. La validación previa evita errores, mejora la experiencia del usuario y protege el sistema.

---

## 2. Manejo de Archivos Faltantes

**Tarea:** Añadir manejo de errores específico para rutas de imágenes y fuentes inexistentes, devolviendo un mensaje claro al usuario.

**Justificación:**
Si el JSON referencia un logo o fuente que no existe, la API lanza un error genérico. Un manejo explícito permite informar al usuario exactamente qué archivo falta, facilitando la depuración y evitando respuestas 500 innecesarias.

---

## 3. Autenticación y Seguridad

**Tarea:** Implementar autenticación básica (por ejemplo, API Key o JWT) para proteger el endpoint si se expone fuera de un entorno controlado.

**Justificación:**
Actualmente, cualquier usuario puede acceder y generar facturas. Si la API se expone públicamente, esto puede ser explotado para abuso de recursos o generación masiva de PDFs. La autenticación protege el sistema y los datos.

---

## 4. Rate Limiting (Límite de Peticiones)

**Tarea:** Añadir limitación de peticiones por IP usando middleware como `express-rate-limit`.

**Justificación:**
Evita el abuso de la API, protege contra ataques de denegación de servicio (DoS) y ayuda a mantener la estabilidad del servidor.

---

## 5. Pruebas Automatizadas

**Tarea:** Crear tests automatizados para el endpoint `/generate-invoice` usando herramientas como `jest` o `supertest`.

**Justificación:**
Actualmente, la API solo se prueba manualmente. Los tests automatizados aseguran que futuras modificaciones no rompan la funcionalidad y permiten detectar errores rápidamente.

---

## 6. Documentación de Errores

**Tarea:** Documentar claramente los posibles errores y respuestas de la API en `api.md`.

**Justificación:**
Facilita la integración de terceros y mejora la experiencia de los desarrolladores que consumen la API.

---

## 7. Mejorar el Manejo de Concurrencia

**Tarea:** Analizar y optimizar el uso de Puppeteer para evitar cuellos de botella si hay muchas peticiones concurrentes (por ejemplo, usando un pool de instancias o colas).

**Justificación:**
El lanzamiento y cierre de Puppeteer por cada petición puede ser costoso en entornos de alta demanda. Optimizar este aspecto mejora el rendimiento y la escalabilidad.

---

## 8. Logging y Monitoreo

**Tarea:** Añadir logs estructurados y monitoreo básico de errores y uso de la API.

**Justificación:**
Permite detectar problemas en producción, analizar patrones de uso y mejorar la trazabilidad ante incidencias.

---

## 9. Actualización de Dependencias

**Tarea:** Revisar y actualizar las dependencias del proyecto periódicamente.

**Justificación:**
Mantener las dependencias actualizadas reduce riesgos de seguridad y aprovecha mejoras de rendimiento y nuevas funcionalidades.

---

# Fin del Sprint 