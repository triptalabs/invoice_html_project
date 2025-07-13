
/**
 * Genera invoice.pdf a partir de:
 *  - template.html
 *  - invoice.json
 *  - styles.css
 *
 * Uso:
 *   node generate.js
 */
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const invoiceUtils = require('./invoice_utils');

// Helper para formatear números con separadores de miles (puntos)
const formatNumberWithDots = (number) => {
  return new Intl.NumberFormat('es-CO').format(number);
};

// Registrar el helper de Handlebars
Handlebars.registerHelper('formatCurrency', function (value) {
  if (typeof value === 'number') {
    return '$ ' + formatNumberWithDots(value);
  }
  // For string values like "198.000", just add the prefix.
  if (typeof value === 'string') {
      // remove existing dots, parse as int, and reformat.
      const number = parseInt(value.replace(/\./g, ''), 10);
      if(!isNaN(number)) {
          return '$ ' + formatNumberWithDots(number);
      }
  }
  return value;
});


// Función para codificar imágenes a Base64
const imageToBase64 = (filePath) => {
  const file = fs.readFileSync(filePath);
  return `data:image/png;base64,${Buffer.from(file).toString('base64')}`;
};

// Función para codificar fuentes a Base64
const fontToBase64 = (filePath) => {
  const file = fs.readFileSync(filePath);
  return `data:font/truetype;base64,${Buffer.from(file).toString('base64')}`;
};

(async () => {
  // Cargar plantilla HTML, datos JSON y estilos CSS
  const templateHtml = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
  const dataRaw = JSON.parse(fs.readFileSync(path.join(__dirname, 'invoice.json'), 'utf8'));
  const styles = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');

  // Calcular totales y total_text usando la utilidad
  const data = invoiceUtils.calcularTotales(dataRaw);

  // Convertir rutas de logo a Base64 y actualizar el objeto de datos
  if (data.company && data.company.logo) {
    data.company.logo = imageToBase64(path.join(__dirname, data.company.logo));
  }
  if (data.company && data.company.logo_small) {
    data.company.logo_small = imageToBase64(path.join(__dirname, data.company.logo_small));
  }
  
  // Convertir la fuente a Base64
  const fontPath = path.join(__dirname, 'Assets/fonts/DanhDa-Bold.ttf');
  const fontBase64 = fontToBase64(fontPath);

  // Compilar la plantilla principal de Handlebars
  const template = Handlebars.compile(templateHtml);
  const rawHtml = template(data);

  // Extraer las plantillas de header/footer
  const $ = cheerio.load(rawHtml);
  const headerTemplate = $('#header-template').html();
  const footerTemplate = $('#footer-template').html();
  
  // Añadir la definición de la fuente al CSS
  const fontFaceDefinition = `
@font-face {
  font-family: 'DanhDa-Bold';
  src: url(${fontBase64}) format('truetype');
}`;

  // Generar CSS final para PDF y debug
  const finalCssForPdf = `${fontFaceDefinition}\n${styles}`;
  
  // Para el archivo de depuración, usar una referencia a la fuente local en lugar de Base64
  // Esto reduce significativamente el tamaño del archivo HTML de depuración
  const finalCssForDebug = `<link rel="stylesheet" href="styles.css">`;

  // Compilar las plantillas de header y footer con los datos y estilos para PDF
  const finalHeader = Handlebars.compile(`<style>${finalCssForPdf}</style>${headerTemplate}`)(data);
  const finalFooter = Handlebars.compile(`<style>${finalCssForPdf}</style>${footerTemplate}`)(data);

  // HTML para PDF
  const finalHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>${finalCssForPdf}</style>
    </head>
    <body>
      ${$('.content').html()}
    </body>
    </html>`;
    
  // HTML para depuración (usar referencia a archivo CSS externo)
  const debugHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Debug - Vista previa de factura</title>
      ${finalCssForDebug}
    </head>
    <body>
      <div class="content">
        ${$('.content').html()}
      </div>
      
      <!-- Plantillas para referencia -->
      <div style="margin-top: 50px; border-top: 1px dashed #ccc; padding-top: 20px;">
        <h3>Plantilla de Encabezado:</h3>
        <div id="header-template">
          ${headerTemplate}
        </div>
        
        <h3>Plantilla de Pie de Página:</h3>
        <div id="footer-template">
          ${footerTemplate}
        </div>
      </div>
    </body>
    </html>`;
    
  // Guardar HTML de depuración
  fs.writeFileSync(path.join(__dirname, 'debug.html'), debugHtml);
  
  console.log('Generating PDF...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  await page.setContent(finalHtml, { waitUntil: 'networkidle0' });

  // Generar PDF con header y footer inyectados y márgenes ajustados
  console.log('Generating PDF file...');
  try {
    await page.pdf({
      path: 'invoice.pdf',
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: finalHeader,
      footerTemplate: finalFooter,
      margin: {
        top: '75mm',    // Reducido para disminuir el espacio sobre la tabla
        bottom: '45mm',   // Margen inferior ajustado
        right: '10mm',
        left: '10mm'
      }
    });
    console.log('PDF generado con éxito (con imágenes en Base64): invoice.pdf');
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
  
  await browser.close();
  
  console.log('Proceso de generación de PDF finalizado.');
})();
