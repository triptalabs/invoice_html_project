// -----------------------------------------------------------------------------
// SERVIDOR EXPRESS PARA GENERACIÓN DE FACTURAS EN PDF
// -----------------------------------------------------------------------------
// Este archivo implementa una API REST que recibe datos de factura en formato JSON,
// los valida, y genera un PDF profesional usando Handlebars y Puppeteer.
// Incluye seguridad por API Key, limitación de peticiones y validación de datos.
// -----------------------------------------------------------------------------

// -----------------------------
// IMPORTACIÓN DE DEPENDENCIAS
// -----------------------------
const express = require('express'); // Framework web
const rateLimit = require('express-rate-limit'); // Limitador de peticiones
const fs = require('fs'); // Manejo de archivos
const path = require('path'); // Manejo de rutas
const Handlebars = require('handlebars'); // Motor de plantillas
const invoiceUtils = require('../utils/invoice_utils'); // Utilidades de facturación
const { validateInvoice } = require('../utils/invoice_schema'); // Middleware de validación
const pdf = require('html-pdf'); // Generación de PDF con html-pdf

// -----------------------------
// CONFIGURACIÓN DE SERVIDOR Y SEGURIDAD
// -----------------------------
const app = express();
const PORT = process.env.PORT || 3000; // Puerto configurable por variable de entorno
const API_KEY = process.env.API_KEY || 'supersecretkey'; // API Key para autenticación

// -----------------------------
// MIDDLEWARES GLOBALES
// -----------------------------
app.use(express.json()); // Para parsear JSON en las peticiones

// -----------------------------
// MIDDLEWARE DE AUTENTICACIÓN POR API KEY
// -----------------------------
/**
 * Verifica que la petición incluya una API Key válida en el header 'x-api-key'.
 * Si es válida, permite el acceso; si no, responde con 401.
 */
const apiKeyAuth = (req, res, next) => {
    const userApiKey = req.get('x-api-key');
    if (userApiKey && userApiKey === API_KEY) {
        return next();
    }
    res.status(401).json({ error: 'No autorizado', details: ['API Key inválida o ausente'] });
};

// -----------------------------
// MIDDLEWARE DE RATE LIMITING
// -----------------------------
/**
 * Limita la cantidad de peticiones por IP para evitar abuso.
 * 30 peticiones cada 15 minutos por IP.
 */
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 30, // Límite de 30 peticiones por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Demasiadas peticiones',
        details: ['Has excedido el límite de peticiones, intenta más tarde.']
    }
});

// -----------------------------
// HELPERS Y UTILIDADES DE PLANTILLA
// -----------------------------
/**
 * Helper de Handlebars para formatear valores como moneda colombiana.
 */
Handlebars.registerHelper('formatCurrency', (value) => {
    if (typeof value !== 'number') return value;
    return '$ ' + new Intl.NumberFormat('es-CO').format(value);
});

/**
 * Convierte una imagen PNG a Base64 para incrustar en HTML/CSS.
 * Lanza error si el archivo no existe.
 * @param {string} filePath - Ruta relativa o absoluta de la imagen
 * @returns {string} - Data URI en Base64
 */
const imageToBase64 = (filePath) => {
    try {
        const absolutePath = path.resolve(__dirname, filePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`El archivo de logo no existe: ${filePath}`);
        }
        const file = fs.readFileSync(absolutePath);
        return `data:image/png;base64,${Buffer.from(file).toString('base64')}`;
    } catch (error) {
        throw new Error(error.message);
    }
};

function extractContentBlock(html) {
  // Buscar el primer <div class="content"> ignorando espacios/indentación
  const divRegex = /<div\s+class=["']content["'][^>]*>/i;
  const openMatch = divRegex.exec(html);
  if (!openMatch) return null;
  let start = openMatch.index;
  let idx = start + openMatch[0].length;
  let depth = 1;
  while (idx < html.length) {
    const nextOpen = html.indexOf('<div', idx);
    const nextClose = html.indexOf('</div>', idx);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      idx = nextOpen + 4;
      depth++;
    } else {
      idx = nextClose + 6;
      depth--;
      if (depth === 0) {
        return html.slice(start, idx);
      }
    }
  }
  return null;
}

// -----------------------------
// FUNCIÓN PRINCIPAL DE GENERACIÓN DE PDF
// -----------------------------
/**
 * Genera un PDF de factura a partir de los datos recibidos.
 * - Adapta los datos, calcula totales, convierte logos a Base64.
 * - Compila la plantilla y usa Puppeteer para exportar el PDF.
 * @param {Object} invoiceData - Datos de la factura (JSON)
 * @returns {Buffer} - PDF en formato buffer
 */
async function generatePdfFromData(invoiceData) {
    // Cargar plantilla y estilos
    const templateHtml = fs.readFileSync(path.join(__dirname, '../templates/template.html'), 'utf8');
    const styles = fs.readFileSync(path.join(__dirname, '../templates/styles.css'), 'utf8');
    const fontPath = path.join(__dirname, '../assets/fonts/DanhDa-Bold.ttf');

    // Adaptar datos y calcular totales
    const adaptedData = invoiceUtils.adaptInvoiceData(invoiceData);
    const data = invoiceUtils.calcularTotales(adaptedData);

    // Convertir logos a Base64 si existen
    if (data.company && data.company.logo) {
        const logoPath = path.isAbsolute(data.company.logo)
            ? data.company.logo
            : path.join(__dirname, '../assets', data.company.logo);
        data.company.logo = imageToBase64(logoPath);
    }
    if (data.company && data.company.logo_small) {
        const logoSmallPath = path.isAbsolute(data.company.logo_small)
            ? data.company.logo_small
            : path.join(__dirname, '../assets', data.company.logo_small);
        data.company.logo_small = imageToBase64(logoSmallPath);
    }

    // Incrustar fuente en Base64
    let fontBase64 = '';
    if (fs.existsSync(fontPath)) {
        const file = fs.readFileSync(fontPath);
        fontBase64 = `data:font/truetype;base64,${Buffer.from(file).toString('base64')}`;
    }
    const fontFaceDefinition = fontBase64 ? `\n@font-face {\n  font-family: 'DanhDa-Bold';\n  src: url(${fontBase64}) format('truetype');\n}` : '';

    // Compilar plantilla principal
    const template = Handlebars.compile(templateHtml);
    const rawHtml = template(data);

    // Extraer bloques de header, footer y content
    const headerTemplateMatch = templateHtml.match(/<template id="header-template">([\s\S]*?)<\/template>/);
    const footerTemplateMatch = templateHtml.match(/<template id="footer-template">([\s\S]*?)<\/template>/);
    const contentBlock = extractContentBlock(templateHtml);
    if (!headerTemplateMatch || !footerTemplateMatch || !contentBlock) {
      throw new Error('No se encontraron los bloques de header, footer o content en la plantilla HTML.');
    }
    const headerTemplate = headerTemplateMatch[1];
    const footerTemplate = footerTemplateMatch[1];
    const mainContent = contentBlock;

    // Generar CSS final
    const finalCssForPdf = `${fontFaceDefinition}\n${styles}`;

    // Compilar header y footer finales
    const finalHeader = Handlebars.compile(`<style>${finalCssForPdf}</style>${headerTemplate}`)(data);
    const finalFooter = Handlebars.compile(`<style>${finalCssForPdf}</style>${footerTemplate}`)(data);

    // Generar HTML final para PDF
    const finalHtml = `\n      <!DOCTYPE html>\n      <html lang=\"es\">\n      <head>\n        <meta charset=\"UTF-8\">\n        <style>${finalCssForPdf}</style>\n      </head>\n      <body>\n        <div class=\"content\">${mainContent}</div>\n      </body>\n      </html>`;

    // Opciones para html-pdf
    const options = {
        format: 'A4',
        border: {
            top: '20mm',
            right: '10mm',
            bottom: '20mm',
            left: '10mm'
        },
        header: {
            height: '60mm',
            contents: finalHeader
        },
        footer: {
            height: '40mm',
            contents: finalFooter
        }
    };

    // html-pdf solo soporta callbacks, así que lo envolvemos en una promesa
    return new Promise((resolve, reject) => {
        pdf.create(finalHtml, options).toBuffer((err, buffer) => {
            if (err) return reject(err);
            resolve(buffer);
        });
    });
}

// -----------------------------
// ENDPOINT PRINCIPAL: GENERAR FACTURA
// -----------------------------
/**
 * POST /generate-invoice
 * Ahora la API une automáticamente los datos de la empresa global con los datos recibidos.
 */
app.post('/generate-invoice', limiter, apiKeyAuth, validateInvoice, async (req, res) => {
    try {
        // Cargar datos globales de la empresa
        const companyData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/company.json'), 'utf8'));
        // Unir los datos recibidos con los datos de la empresa
        const dataRaw = { ...req.body, company: companyData };
        // Generar el PDF usando los datos combinados
        const pdfBuffer = await generatePdfFromData(dataRaw);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=factura.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generando PDF:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: [error.message] });
    }
});

// -----------------------------
// INICIO DEL SERVIDOR
// -----------------------------
app.listen(PORT, () => {
    console.log(`Servidor de facturas escuchando en http://localhost:${PORT}`);
});
