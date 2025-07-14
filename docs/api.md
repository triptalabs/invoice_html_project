# Documentación de la API REST para Generación de Facturas

## Descripción General

Este sistema expone una API REST para generar facturas en PDF a partir de datos enviados en formato JSON. El PDF se genera usando una plantilla HTML, estilos CSS personalizados y la librería Puppeteer para renderizado.

---

## Ejecución

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Inicia la API:
   ```bash
   npm run api
   ```
   Por defecto escucha en el puerto 3000 (`http://localhost:3000`).

---

## 3. Autenticación y Seguridad

El acceso a la API está protegido para prevenir el abuso y garantizar que solo clientes autorizados puedan utilizarla.

### Autenticación por API Key

Toda petición al endpoint `/generate-invoice` debe incluir una API Key válida en la cabecera `x-api-key`.

-   **Cabecera requerida:** `x-api-key: TU_API_KEY`
-   La API Key por defecto es `supersecretkey`. Puedes cambiarla configurando la variable de entorno `API_KEY`.

Si la API Key es incorrecta o no se proporciona, la API responderá con un error `401 No autorizado`.

### Rate Limiting

Para evitar sobrecargas, se ha implementado un límite de peticiones. Cada dirección IP puede realizar un máximo de **30 peticiones cada 15 minutos**.

Si se excede este límite, la API responderá con un error `429 Demasiadas peticiones`.

---

## 4. Diagrama de Flujo de la Petición

El siguiente diagrama ilustra el flujo de una petición desde el cliente hasta la generación del PDF.

```mermaid
sequenceDiagram
    participant Cliente
    participant API Gateway
    participant Servidor Express
    participant Puppeteer

    Cliente->>+API Gateway: POST /generate-invoice (JSON, x-api-key)
    API Gateway->>API Gateway: Validar Rate Limit y API Key
    alt Petición Válida
        API Gateway->>+Servidor Express: Reenvía la petición
        Servidor Express->>Servidor Express: 1. Valida el JSON (Joi)
        Servidor Express->>Servidor Express: 2. Procesa datos (cálculos, base64)
        Servidor Express->>+Puppeteer: 3. Generar PDF con HTML y CSS
        Puppeteer-->>-Servidor Express: PDF generado
        Servidor Express-->>-Cliente: 200 OK (application/pdf)
    else Petición Inválida en Gateway
        API Gateway-->>-Cliente: 401 No Autorizado / 429 Demasiadas Peticiones
    end
    alt Error en Servidor
        Servidor Express-->>-Cliente: 400 Bad Request / 500 Internal Server Error
    end
```

---

## 5. Endpoint: Generar Factura

### `POST /generate-invoice`

-   **Descripción:** Genera un PDF de una factura o cotización a partir de los datos JSON enviados en el cuerpo de la petición.
-   **Cabeceras:**
    -   `Content-Type: application/json`
    -   `x-api-key: TU_API_KEY` (requerida, ver sección de Autenticación)
-   **Cuerpo (Body):** Un objeto JSON con los datos de la factura. Ver la sección "Estructura de Datos".
-   **Respuesta Exitosa:**
    -   **Código:** `200 OK`
    -   **Content-Type:** `application/pdf`
    -   **Cuerpo:** El archivo PDF generado.

#### Ejemplo de Petición (cURL)

```bash
curl -X POST http://localhost:3000/generate-invoice \
  -H "Content-Type: application/json" \
  -H "x-api-key: supersecretkey" \
  --data-binary
