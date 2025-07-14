const express = require('express');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const invoiceUtils = require('./invoice_utils');
const { validateInvoice } = require('./invoice_schema'); // <-- Importamos el middleware

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'supersecretkey';

// Middlewares
app.use(express.json()); // Para parsear JSON

// Middleware de seguridad: API Key
const apiKeyAuth = (req, res, next) => {
    const userApiKey = req.get('x-api-key');
    if (userApiKey && userApiKey === API_KEY) {
        return next();
    }
    res.status(401).json({ error: 'No autorizado', details: ['API Key inválida o ausente'] });
};

// Middleware de seguridad: Rate Limiter
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

// Helpers y funciones de generación de PDF (adaptado de generate.js)
Handlebars.registerHelper('formatCurrency', (value) => {
    if (typeof value !== 'number') return value;
    return '$ ' + new Intl.NumberFormat('es-CO').format(value);
});

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

async function generatePdfFromData(invoiceData) {
    const templateHtml = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
    const styles = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');

    const adaptedData = invoiceUtils.adaptInvoiceData(invoiceData);
    const data = invoiceUtils.calcularTotales(adaptedData);

    if (data.company && data.company.logo) {
        data.company.logo = imageToBase64(data.company.logo);
    }
    if (data.company && data.company.logo_small) {
        data.company.logo_small = imageToBase64(data.company.logo_small);
    }

    const template = Handlebars.compile(templateHtml);
    const rawHtml = template(data);

    const $ = cheerio.load(rawHtml);
    const headerTemplate = $('#header-template').html();
    const footerTemplate = $('#footer-template').html();

    const finalHtml = `<!DOCTYPE html><html><head><style>${styles}</style></head><body>${$('.content').html()}</body></html>`;
    const finalHeader = Handlebars.compile(`<style>${styles}</style>${headerTemplate}`)(data);
    const finalFooter = Handlebars.compile(`<style>${styles}</style>${footerTemplate}`)(data);

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: 'networkidle0' });

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

// Endpoint para generar la factura
app.post('/generate-invoice', limiter, apiKeyAuth, validateInvoice, async (req, res) => {
    try {
        const pdfBuffer = await generatePdfFromData(req.body);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=factura.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generando PDF:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: [error.message] });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de facturas escuchando en http://localhost:${PORT}`);
});
