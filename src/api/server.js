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
const puppeteer = require('puppeteer'); // Generación de PDF
const cheerio = require('cheerio'); // Manipulación de HTML
const invoiceUtils = require('../utils/invoice_utils'); // Utilidades de facturación
const { validateInvoice } = require('../utils/invoice_schema'); // Middleware de validación

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

    // Compilar plantilla principal
    const template = Handlebars.compile(templateHtml);
    const rawHtml = template(data);

    // Extraer header y footer de la plantilla
    const $ = cheerio.load(rawHtml);
    const headerTemplate = $('#header-template').html();
    const footerTemplate = $('#footer-template').html();

    // Generar HTML final para el PDF
    const finalHtml = `<!DOCTYPE html><html><head><style>${styles}</style></head><body>${$('.content').html()}</body></html>`;
    // Compilar header y footer con los datos y estilos
    const finalHeader = Handlebars.compile(`<style>${styles}</style>${headerTemplate}`)(data);
    const finalFooter = Handlebars.compile(`<style>${styles}</style>${footerTemplate}`)(data);

    // Inicializar Puppeteer y generar el PDF
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: 'networkidle0' });

    // Exportar el PDF con márgenes y header/footer
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: finalHeader,
        footerTemplate: finalFooter,
        margin: { top: '75mm', bottom: '45mm', right: '10mm', left: '10mm' }
    });

    await browser.close();
    return pdfBuffer;
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
