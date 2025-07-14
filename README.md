# Generador de Facturas en PDF con Node.js

Este proyecto ofrece una solución robusta y profesional para generar documentos PDF (facturas, cotizaciones, etc.) a partir de datos en formato JSON. Utiliza Node.js, Handlebars para plantillas HTML, CSS para un diseño personalizable y Puppeteer para la conversión a PDF.

Incluye un script para uso por línea de comandos (CLI) y un servidor con una API REST lista para integrarse con sistemas externos como n8n, Zapier, o cualquier aplicación backend.

---

## Tabla de Contenidos
- [Características Principales](#características-principales)
- [Requisitos](#requisitos)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Instalación](#instalación)
- [Uso por Línea de Comandos (CLI)](#uso-por-línea-de-comandos-cli)
- [Uso como API REST](#uso-como-api-rest)
- [Personalización](#personalización)
- [Desarrollo y Depuración](#desarrollo-y-depuración)
- [Rendimiento y Logging (API)](#rendimiento-y-logging-api)
- [Solución de Problemas](#solución-de-problemas)
- [Créditos y Licencia](#créditos-y-licencia)

---

## Características Principales

- **Generación Dual**: Funciona tanto por CLI como a través de una API REST.
- **Plantillas Dinámicas**: Usa Handlebars para inyectar datos en una plantilla HTML.
- **Diseño Personalizable**: Los estilos se controlan con un archivo CSS externo, facilitando la adaptación a cualquier identidad de marca.
- **Cálculos Automáticos**: Calcula subtotales, impuestos (IVA) y descuentos en el backend.
- **Incrustación de Recursos**: Las imágenes (logos) y fuentes personalizadas se incrustan en el PDF en formato Base64, garantizando portabilidad y eliminando dependencias externas.
- **Encabezado y Pie de Página**: Soporte para encabezados y pies de página que se repiten en cada hoja del PDF.
- **Modo de Depuración**: Genera un archivo `debug.html` para previsualizar y ajustar el diseño fácilmente en un navegador antes de generar el PDF.
- **API de Alto Rendimiento**: El servidor utiliza un pool de instancias de Puppeteer para manejar peticiones concurrentes de forma eficiente.
- **Logging Estructurado**: La API registra logs detallados con `pino` para un monitoreo y depuración sencillos.

## Requisitos
- **Node.js**: `v18.0` o superior (requerido por Puppeteer).
- **Gestor de Paquetes**: `npm` o `pnpm`.

---

## Estructura del Proyecto

La estructura está organizada para separar la lógica, las plantillas, los datos y los archivos de salida.

```
invoice_html_project/
├── src/
│   ├── assets/
│   │   ├── fonts/
│   │   │   └── DanhDa-Bold.ttf   # Fuentes personalizadas
│   │   ├── logo.png              # Logo principal
│   │   └── logo_small.png        # Logo para el pie de página
│   ├── data/
│   │   ├── company.json          # Datos globales de la empresa
│   │   └── invoice.json          # Ejemplo de datos de una factura
│   ├── templates/
│   │   ├── template.html         # Plantilla principal de la factura
│   │   └── styles.css            # Hoja de estilos principal
│   ├── utils/
│   │   └── invoice_utils.js      # Lógica de negocio y cálculos
│   └── output/
│       ├── invoice.pdf           # PDF generado por defecto
│       └── debug.html            # Archivo HTML para depuración
├── generate.js                   # Script principal para la generación CLI
├── server.js                     # Servidor Express para la API REST
├── package.json
└── README.md
```

---

## Instalación

1. Clona el repositorio o descarga el código.
2. Instala las dependencias:

   Con `npm`:
   ```bash
   npm install
   ```
   O con `pnpm`:
   ```bash
   pnpm install
   ```

---

## Uso por Línea de Comandos (CLI)

El script `generate.js` permite crear un PDF directamente desde la terminal.

### Comando Básico

Para generar un PDF usando los archivos de configuración por defecto (`src/data/invoice.json`, `src/templates/template.html`, etc.):

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
