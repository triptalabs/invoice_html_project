# Documentación de la API REST

## Descripción General

Este sistema expone una API REST para generar facturas en PDF a partir de datos enviados en formato JSON. El PDF se genera usando una plantilla HTML, estilos CSS personalizados y la librería Puppeteer para renderizado.

---

## Endpoint Principal

### POST `/generate-invoice`

- **Descripción:** Genera un PDF de factura a partir de los datos JSON enviados en el cuerpo de la petición.
- **Content-Type de entrada:** `application/json`
- **Content-Type de salida:** `application/pdf`
- **Respuesta:** PDF generado listo para descargar o almacenar.

#### Ejemplo de petición (curl):

```bash
curl -X POST http://localhost:3000/generate-invoice \
  -H "Content-Type: application/json" \
  --data-binary @invoice.json \
  --output factura.pdf
```

---

## Estructura esperada del JSON

El cuerpo de la petición debe ser un objeto JSON con la siguiente estructura (puede personalizarse según la plantilla):

```json
{
  "company": {
    "name": "Tripta Labs",
    "logo": "Assets/logotipo negro.png",
    "logo_small": "Assets/logo negro.png",
    "tax_id": "1057564920-5",
    "phone": "57 311 441 6322",
    "city": "Tunja, Boyacá",
    "website": "www.triptalabs.com.co"
  },
  "client": {
    "name": "Cliente en General",
    "nit": "N/A",
    "code": "N/A"
  },
  "invoice": {
    "type": "Cotización",
    "number": "436",
    "place": "Tunja, Boyacá",
    "date": "11 de Julio 2025",
    "expiry_date": "",
    "seller": "",
    "conditions": "Transferencia",
    "reference": "",
    "delivery": "Envío"
  },
  "items": [
    {
      "code": "TL-INS-E-2-C",
      "name": "Empaque Unión VITON 6\"",
      "details": [
        "Material: VITON",
        "Diámetro: 6\"",
        "Rango temperatura: -26 °C a +222 °C"
      ],
      "quantity": 2.00,
      "unit_price": 57000,
      "total": 114000
    }
    // ... más ítems
  ],
  "observations": [
    "Observación 1",
    "Observación 2"
  ],
  "totals": {
    "subtotal": "198.000",
    "total_numeric": "198.000,00",
    "total_text": "CIENTO NOVENTA Y OCHO MIL 00/100"
  }
}
```

---

## Respuestas

- **200 OK:** Devuelve el PDF generado.
- **500 Error:** Devuelve un JSON con el mensaje de error.

```json
{
  "error": "Error generando PDF",
  "details": "Mensaje de error interno"
}
```

---

## Formato de Respuestas de Error (Validación y Archivos Faltantes)

A partir de la versión que resuelve el issue #1, los errores de validación y archivos faltantes devuelven un JSON con el siguiente formato:

```json
{
  "error": "Mensaje general del error",
  "details": [
    "Detalle 1",
    "Detalle 2"
  ]
}
```

### Ejemplos

- **Error de validación de datos:**

```json
{
  "error": "Datos de factura inválidos",
  "details": [
    "\"company.name\" is required",
    "\"items\" must contain at least 1 items"
  ]
}
```

- **Archivo de logo no encontrado:**

```json
{
  "error": "Archivo de logo no encontrado",
  "details": [
    "No existe el archivo: assets/logo.png"
  ]
}
```

- **Fuente no encontrada:**

```json
{
  "error": "Fuente no encontrada",
  "details": [
    "No existe el archivo: assets/fonts/DanhDa-Bold.ttf"
  ]
}
```

---

## Reglas de validación de datos (esquema mínimo)

El endpoint `/generate-invoice` valida el JSON recibido con el siguiente esquema mínimo:

- **client** (objeto, requerido)
  - name: string, requerido
  - id: string, requerido
  - address: string, requerido
- **items** (array, requerido, mínimo 1 elemento)
  - Cada item:
    - description: string, requerido
    - quantity: number, requerido
    - price: number, requerido

> El campo company ya no es requerido ni validado. El logo se asigna automáticamente en el backend.
> El campo total no debe enviarse: el backend lo calcula automáticamente sumando los subtotales de los items.

---

## Stack Tecnológico

- **Node.js** (>=16)
- **Express**: Framework para la API REST.
- **Handlebars**: Motor de plantillas HTML.
- **Puppeteer**: Renderizado y generación de PDF.
- **Cheerio**: Manipulación de HTML.
- **Dependencias adicionales:** ver `package.json`.

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

## Notas y Personalización

- Puedes modificar la plantilla (`template.html`), los estilos (`styles.css`) y los logos en `Assets/`.
- La fuente utilizada puede cambiarse en `Assets/fonts/` y en la definición CSS.
- El endpoint está listo para integrarse con sistemas como n8n, Zapier, etc.

---

## Ejemplo de integración con n8n

- Nodo HTTP Request
- Método: POST
- URL: http://localhost:3000/generate-invoice
- Body: JSON (igual a `invoice.json`)
- Recibirás el PDF como respuesta

---

## Autor y Licencia

- Desarrollado por [Tu Nombre o Empresa]
- Licencia MIT

---

## Seguridad: Autenticación por API Key y Rate Limiting

### Autenticación por API Key

Para acceder al endpoint `/generate-invoice` es obligatorio enviar una API Key válida en la cabecera `x-api-key`.

- **Cabecera requerida:**
  - `x-api-key: TU_API_KEY`
- La API Key por defecto es `supersecretkey` (puede cambiarse en la variable de entorno `API_KEY`).

#### Ejemplo de petición autenticada:

```bash
curl -X POST http://localhost:3000/generate-invoice \
  -H "Content-Type: application/json" \
  -H "x-api-key: supersecretkey" \
  --data-binary @invoice.json \
  --output factura.pdf
```

- Si la API Key es incorrecta o falta, la respuesta será:

```json
{
  "error": "No autorizado",
  "details": ["API Key inválida o ausente"]
}
```

### Rate Limiting

Para evitar abuso, cada IP puede realizar hasta 30 peticiones cada 15 minutos.

- Si se excede el límite, la respuesta será:

```json
{
  "error": "Demasiadas peticiones",
  "details": ["Has excedido el límite de peticiones, intenta más tarde."]
}
```

---
