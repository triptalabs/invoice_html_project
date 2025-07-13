const express = require('express');
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const Joi = require('joi');

const app = express();
app.use(express.json({ limit: '2mb' }));

// Helpers reutilizados del generate.js
const formatNumberWithDots = (number) => {
  return new Intl.NumberFormat('es-CO').format(number);
};
Handlebars.registerHelper('formatCurrency', function (value) {
  if (typeof value === 'number') {
    return '$ ' + formatNumberWithDots(value);
  }
  if (typeof value === 'string') {
    const number = parseInt(value.replace(/\./g, ''), 10);
    if (!isNaN(number)) {
      return '$ ' + formatNumberWithDots(number);
    }
  }
  return value;
});

const imageToBase64 = (filePath) => {
  const file = fs.readFileSync(filePath);
  return `data:image/png;base64,${Buffer.from(file).toString('base64')}`;
};
const fontToBase64 = (filePath) => {
  const file = fs.readFileSync(filePath);
  return `data:font/truetype;base64,${Buffer.from(file).toString('base64')}`;
};

// Esquema de validación para la factura (solo client e items, sin total)
const invoiceSchema = Joi.object({
  client: Joi.object({
    name: Joi.string().required(),
    id: Joi.string().required(),
    address: Joi.string().required(),
  }).required(),
  items: Joi.array().items(
    Joi.object({
      description: Joi.string().required(),
      quantity: Joi.number().required(),
      price: Joi.number().required(),
    })
  ).min(1).required(),
  // Otros campos opcionales pueden ir aquí
});

app.post('/generate-invoice', async (req, res) => {
  try {
    // Validar el JSON recibido
    const { error, value } = invoiceSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Datos de factura inválidos',
        details: error.details.map(d => d.message)
      });
    }
    // Cargar plantilla y estilos
    const templateHtml = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
    const styles = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
    // Clonar el objeto para no mutar el original
    const data = JSON.parse(JSON.stringify(value));

    // Calcular el total sumando los subtotales de los items
    data.total = data.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);

    // Asignar logo fijo si es necesario
    data.company = data.company || {};
    data.company.logo = 'assets/logotipo negro.png'; // Ruta fija

    // Convertir rutas de logo a Base64 si existen y verificar existencia
    if (data.company && data.company.logo) {
      const logoPath = path.join(__dirname, data.company.logo);
      if (!fs.existsSync(logoPath)) {
        return res.status(400).json({
          error: 'Archivo de logo no encontrado',
          details: [`No existe el archivo: ${data.company.logo}`]
        });
      }
      data.company.logo = imageToBase64(logoPath);
    }
    if (data.company && data.company.logo_small) {
      const logoSmallPath = path.join(__dirname, data.company.logo_small);
      if (!fs.existsSync(logoSmallPath)) {
        return res.status(400).json({
          error: 'Archivo de logo pequeño no encontrado',
          details: [`No existe el archivo: ${data.company.logo_small}`]
        });
      }
      data.company.logo_small = imageToBase64(logoSmallPath);
    }
    // Fuente en Base64 y verificación
    const fontPath = path.join(__dirname, 'assets/fonts/DanhDa-Bold.ttf');
    if (!fs.existsSync(fontPath)) {
      return res.status(400).json({
        error: 'Fuente no encontrada',
        details: ['No existe el archivo: assets/fonts/DanhDa-Bold.ttf']
      });
    }
    const fontBase64 = fontToBase64(fontPath);
    const fontFaceDefinition = `\n@font-face {\n  font-family: 'DanhDa-Bold';\n  src: url(${fontBase64}) format('truetype');\n}`;
    const finalCssForPdf = `${fontFaceDefinition}\n${styles}`;

    // Renderizar plantilla
    const template = Handlebars.compile(templateHtml);
    const rawHtml = template(data);
    const $ = cheerio.load(rawHtml);
    const headerTemplate = $('#header-template').html();
    const footerTemplate = $('#footer-template').html();
    const finalHeader = Handlebars.compile(`<style>${finalCssForPdf}</style>${headerTemplate}`)(data);
    const finalFooter = Handlebars.compile(`<style>${finalCssForPdf}</style>${footerTemplate}`)(data);
    const finalHtml = `\n      <!DOCTYPE html>\n      <html lang=\"es\">\n      <head>\n        <meta charset=\"UTF-8\">\n        <style>${finalCssForPdf}</style>\n      </head>\n      <body>\n        ${$('.content').html()}\n      </body>\n      </html>`;

    // Generar PDF
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: finalHeader,
      footerTemplate: finalFooter,
      margin: {
        top: '75mm',
        bottom: '45mm',
        right: '10mm',
        left: '10mm'
      }
    });
    await browser.close();
    res.set('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Error generando PDF', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API de facturación escuchando en puerto ${PORT}`);
}); 