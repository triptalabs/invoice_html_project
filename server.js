const express = require('express');
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

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

app.post('/generate-invoice', async (req, res) => {
  try {
    // Cargar plantilla y estilos
    const templateHtml = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
    const styles = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
    // Clonar el objeto para no mutar el original
    const data = JSON.parse(JSON.stringify(req.body));

    // Convertir rutas de logo a Base64 si existen
    if (data.company && data.company.logo) {
      data.company.logo = imageToBase64(path.join(__dirname, data.company.logo));
    }
    if (data.company && data.company.logo_small) {
      data.company.logo_small = imageToBase64(path.join(__dirname, data.company.logo_small));
    }
    // Fuente en Base64
    const fontPath = path.join(__dirname, 'Assets/fonts/DanhDa-Bold.ttf');
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