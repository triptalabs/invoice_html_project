
# Invoice HTML Project

Generador profesional de facturas en PDF a partir de datos JSON, usando Node.js, Handlebars, CSS y Puppeteer. Incluye una API REST lista para integrarse con n8n, Zapier u otros sistemas.

---

## Tabla de Contenidos
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Uso por Línea de Comandos (CLI)](#uso-por-línea-de-comandos-cli)
- [Uso como API REST](#uso-como-api-rest)
- [Personalización](#personalización)
- [Archivos y Carpetas](#archivos-y-carpetas)
- [Ejemplo de JSON de Factura](#ejemplo-de-json-de-factura)
- [Solución de Problemas](#solución-de-problemas)
- [Créditos y Licencia](#créditos-y-licencia)

---

## Estructura del Proyecto

```
invoice_html_project/
├── Assets/
│   ├── fonts/
│   │   └── DanhDa-Bold.ttf
│   ├── logo blanco png.png
│   ├── logo negro.png
│   ├── logotipo negro.png
│   └── styles.css
├── debug.html
├── font_test.pdf
├── generate.js
├── invoice.json
├── invoice.pdf
├── package.json
├── package-lock.json
├── README.md
├── styles.css
├── template.html
└── server.js
```

- **generate.js**: Script principal para generar el PDF desde CLI.
- **server.js**: Servidor Express para exponer la API REST.
- **template.html**: Plantilla Handlebars para la factura.
- **styles.css**: Estilos principales de la factura.
- **Assets/**: Logos, fuentes y estilos adicionales.
- **invoice.json**: Ejemplo de datos de factura.

---

## Requisitos
- Node.js >= 16
- npm >= 8
- (Opcional) n8n, Zapier u otro orquestador para consumir la API

---

## Instalación

1. Clona el repositorio o descarga el código.
2. Instala las dependencias:
   ```bash
   npm install
   ```

---

## Uso por Línea de Comandos (CLI)

Genera un PDF a partir de `invoice.json`:

```bash
npm run generate
```

El archivo `invoice.pdf` se generará en la raíz del proyecto.

---

## Uso como API REST

Inicia el servidor:

```bash
npm run api
```

### Endpoint
- **POST** `/generate-invoice`
- **Body:** JSON de la factura (igual a `invoice.json`)
- **Respuesta:** PDF (content-type: application/pdf)

#### Ejemplo de petición (curl):
```bash
curl -X POST http://localhost:3000/generate-invoice \
  -H "Content-Type: application/json" \
  --data-binary @invoice.json \
  --output factura.pdf
```

#### Uso desde n8n
- Nodo HTTP Request
- Método: POST
- URL: http://localhost:3000/generate-invoice
- Body: JSON (igual a `invoice.json`)
- Recibirás el PDF como respuesta

---

## Personalización
- **Plantilla:** Modifica `template.html` para cambiar la estructura visual.
- **Estilos:** Edita `styles.css` o `Assets/styles.css` para personalizar colores, fuentes y tamaños.
- **Logos:** Cambia los archivos en `Assets/`.
- **Fuente:** Usa cualquier fuente TTF en `Assets/fonts/` y actualiza la regla `@font-face` en CSS.

---

## Archivos y Carpetas
- **Assets/fonts/**: Fuentes personalizadas (ejemplo: DanhDa-Bold.ttf)
- **Assets/**: Imágenes y CSS adicionales
- **styles.css**: Estilos principales
- **template.html**: Plantilla Handlebars
- **generate.js**: Script CLI
- **server.js**: API REST
- **invoice.json**: Ejemplo de datos

---

## Ejemplo de JSON de Factura
```json
{
  "company": {
    "name": "Mi Empresa S.A.S.",
    "address": "Calle 123 #45-67",
    "phone": "(1) 234 5678",
    "email": "info@miempresa.com"
  },
  "client": {
    "name": "Cliente Ejemplo",
    "id": "123456789",
    "address": "Carrera 89 #12-34"
  },
  "items": [
    { "description": "Producto 1", "quantity": 2, "price": 50000 },
    { "description": "Producto 2", "quantity": 1, "price": 198000 }
  ],
  "iva": "19%", // También puedes usar 19 (porcentaje) o 50000 (valor absoluto)
  "descuento": 10000, // También puedes usar "10%" (porcentaje)
  "observations": ["Gracias por su compra."]
}
```

---

### Notas sobre IVA y Descuento
- **Opcionales:** Puedes omitirlos si no aplican.
- **Formato permitido:**
  - Porcentaje: "19%" o 19 (ambos equivalen a 19% del subtotal)
  - Valor absoluto: 50000 (aplica 50,000 exactos)
- **Validación:**
  - Solo se aceptan números positivos o strings que terminen en '%'.
  - Si el formato es incorrecto, la API devuelve un error de validación.

---

### Cálculo de Totales
- Todos los totales (subtotal, iva, descuento, total, total_text) se calculan automáticamente en backend.
- No envíes campos de totales en el JSON de entrada.
- El campo 'total_text' siempre se genera en español.
- Tanto el CLI como la API usan la misma lógica de cálculo y validación.

---

## Solución de Problemas
- **Puppeteer no instala Chromium:**
  - Ejecuta `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 npm install puppeteer` y asegúrate de tener Chrome instalado.
- **El PDF no muestra imágenes o fuentes:**
  - Verifica rutas relativas en CSS y HTML.
  - Usa rutas absolutas si consumes la API desde otro directorio.
- **Error de permisos en puertos:**
  - Cambia el puerto en `server.js` si el 3000 está ocupado.

---

## Optimización de concurrencia y logging estructurado

### Pool de Puppeteer

El servidor utiliza un pool de instancias de Puppeteer (mediante `generic-pool`) para manejar múltiples peticiones concurrentes de generación de PDF de forma eficiente. Esto evita cuellos de botella y mejora el rendimiento bajo alta demanda.

- El pool es configurable (por defecto, hasta 4 instancias concurrentes).
- Cada petición adquiere una instancia del pool y la libera al finalizar.

### Logging estructurado y monitoreo

Se utiliza `pino` para registrar logs estructurados de todas las peticiones, errores y eventos relevantes:

- Los logs se muestran en consola en formato legible y se guardan en `logs/api.log`.
- Permite rastrear errores, uso de la API y monitorear el sistema fácilmente.

---

## Créditos y Licencia
- Proyecto desarrollado por [Tu Nombre o Empresa].
- Basado en Node.js, Handlebars, Puppeteer y Express.
- Licencia MIT.
