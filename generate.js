// -----------------------------------------------------------------------------
// GENERADOR DE FACTURAS EN PDF A PARTIR DE PLANTILLA HTML, DATOS Y ESTILOS
// -----------------------------------------------------------------------------
// Este script toma una plantilla HTML, un archivo de datos JSON y un archivo CSS,
// los combina usando Handlebars, y genera un PDF profesional usando Puppeteer.
// Además, incrusta imágenes y fuentes en Base64 para portabilidad.
// Permite personalización de rutas de archivos mediante argumentos de línea de comandos.
// -----------------------------------------------------------------------------

// -----------------------------
// IMPORTACIÓN DE DEPENDENCIAS
// -----------------------------
const fs = require('fs'); // Para manejo de archivos
const path = require('path'); // Para manejo de rutas
const Handlebars = require('handlebars'); // Motor de plantillas
const pdf = require('html-pdf'); // Generación de PDF con html-pdf
const invoiceUtils = require('./src/utils/invoice_utils'); // Utilidades de facturación

// -----------------------------
// HELPERS Y REGISTRO DE HANDLEBARS
// -----------------------------

/**
 * Formatea un número con separadores de miles (puntos) para Colombia.
 * @param {number} number - Número a formatear
 * @returns {string} - Número formateado
 */
const formatNumberWithDots = (number) => {
  return new Intl.NumberFormat('es-CO').format(number);
};

/**
 * Helper de Handlebars para formatear valores como moneda colombiana.
 * Si el valor es numérico, lo formatea con puntos y antepone '$'.
 * Si es string, intenta parsear y formatear igual.
 */
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

// -----------------------------
// UTILIDADES DE CONVERSIÓN BASE64
// -----------------------------

/**
 * Convierte una imagen PNG a Base64 para incrustar en HTML/CSS.
 * Si el archivo no existe, retorna string vacío y muestra advertencia.
 * @param {string} filePath - Ruta absoluta de la imagen
 * @returns {string} - Data URI en Base64 o ''
 */
function imageToBase64(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Advertencia: Imagen no encontrada en ${filePath}`);
    return '';
  }
  const file = fs.readFileSync(filePath);
  return `data:image/png;base64,${Buffer.from(file).toString('base64')}`;
}

/**
 * Convierte una fuente TTF a Base64 para incrustar en CSS.
 * Si el archivo no existe, retorna string vacío y muestra advertencia.
 * @param {string} filePath - Ruta absoluta de la fuente
 * @returns {string} - Data URI en Base64 o ''
 */
function fontToBase64(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Advertencia: Fuente no encontrada en ${filePath}`);
    return '';
  }
  const file = fs.readFileSync(filePath);
  return `data:font/truetype;base64,${Buffer.from(file).toString('base64')}`;
}

// -----------------------------
// PARÁMETROS DE LÍNEA DE COMANDOS (CLI)
// -----------------------------
// Permite personalizar rutas de archivos y nombres de salida.
const baseDir = __dirname;
const templatePath = path.join(baseDir, 'src/templates/template.html');
const dataPath = path.join(baseDir, 'src/data/invoice.json');
const stylesPath = path.join(baseDir, 'src/templates/styles.css');
const fontPath = path.join(baseDir, 'src/assets/fonts/DanhDa-Bold.ttf');
const outputPdf = path.join(baseDir, 'src/output/invoice.pdf');
const debugHtmlPath = path.join(baseDir, 'src/output/debug.html');

// -----------------------------
// FLUJO PRINCIPAL ASÍNCRONO
// -----------------------------
// Todo el proceso está protegido con manejo de errores y cierre seguro de recursos.
(async () => {
  try {
    // -----------------------------
    // VALIDACIÓN DE ARCHIVOS REQUERIDOS
    // -----------------------------
    if (!fs.existsSync(templatePath)) throw new Error(`No se encontró la plantilla HTML: ${templatePath}`);
    if (!fs.existsSync(dataPath)) throw new Error(`No se encontró el archivo de datos: ${dataPath}`);
    if (!fs.existsSync(stylesPath)) throw new Error(`No se encontró el archivo de estilos: ${stylesPath}`);
    if (!fs.existsSync(fontPath)) throw new Error(`No se encontró la fuente: ${fontPath}`);

    // -----------------------------
    // CARGA DE ARCHIVOS Y DATOS
    // -----------------------------
    const templateHtml = fs.readFileSync(templatePath, 'utf8'); // Plantilla principal
    // Cambiar la carga de datos para unir company.json (global) con invoice.json (específico)
    const invoiceRaw = JSON.parse(fs.readFileSync(path.join(baseDir, 'src/data/invoice.json'), 'utf8'));
    const companyData = JSON.parse(fs.readFileSync(path.join(baseDir, 'src/data/company.json'), 'utf8'));
    // Unir los datos: company global + invoice específico
    const dataRaw = { ...invoiceRaw, company: companyData };
    const styles = fs.readFileSync(stylesPath, 'utf8'); // Estilos CSS

    // -----------------------------
    // ADAPTACIÓN Y CÁLCULO DE DATOS
    // -----------------------------
    // Se adapta el JSON a la estructura estándar y se calculan totales.
    const adaptedData = invoiceUtils.adaptInvoiceData(dataRaw);
    const data = invoiceUtils.calcularTotales(adaptedData);

    // -----------------------------
    // CONVERSIÓN DE LOGOS A BASE64
    // -----------------------------
    // Si hay logos definidos, se convierten a Base64 para incrustar en el PDF.
    if (data.company && data.company.logo) {
      // Si la ruta no es absoluta, anteponer la ruta de logos
      const logoPath = path.isAbsolute(data.company.logo)
        ? data.company.logo
        : path.join(baseDir, 'src/assets', data.company.logo);
      data.company.logo = imageToBase64(logoPath);
    }
    if (data.company && data.company.logo_small) {
      const logoSmallPath = path.isAbsolute(data.company.logo_small)
        ? data.company.logo_small
        : path.join(baseDir, 'src/assets', data.company.logo_small);
      data.company.logo_small = imageToBase64(logoSmallPath);
    }

    // -----------------------------
    // CONVERSIÓN DE FUENTE A BASE64
    // -----------------------------
    // Se incrusta la fuente personalizada en el CSS para el PDF.
    const fontBase64 = fontToBase64(fontPath);
    const fontFaceDefinition = fontBase64 ? `\n@font-face {\n  font-family: 'DanhDa-Bold';\n  src: url(${fontBase64}) format('truetype');\n}` : '';

    // -----------------------------
    // COMPILACIÓN DE PLANTILLAS HANDLEBARS
    // -----------------------------
    // Se compila la plantilla principal y se obtiene el HTML resultante.
    const template = Handlebars.compile(templateHtml);
    const rawHtml = template(data);

    // -----------------------------
    // EXTRACCIÓN DE HEADER Y FOOTER DESDE <template>
    // -----------------------------
    // Extracción robusta del bloque <div class="content">...</div> permitiendo anidamiento y espacios
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
    const headerTemplateMatch = rawHtml.match(/<template id="header-template">([\s\S]*?)<\/template>/);
    const footerTemplateMatch = rawHtml.match(/<template id="footer-template">([\s\S]*?)<\/template>/);
    const contentBlock = extractContentBlock(rawHtml);
    if (!headerTemplateMatch || !footerTemplateMatch || !contentBlock) {
      throw new Error('No se encontraron los bloques de header, footer o content en la plantilla HTML.');
    }
    const headerTemplate = headerTemplateMatch[1];
    const footerTemplate = footerTemplateMatch[1];

    // -----------------------------
    // GENERACIÓN DE CSS FINAL
    // -----------------------------
    // Para el PDF, se incrusta la fuente en Base64. Para debug, se referencia el CSS externo.
    const finalCssForPdf = `${fontFaceDefinition}\n${styles}`;
    const finalCssForDebug = `<link rel=\"stylesheet\" href=\"styles.css\">`;

    // -----------------------------
    // COMPILACIÓN DE HEADER Y FOOTER FINALES
    // -----------------------------
    // Se compilan con los datos y el CSS incrustado.
    const finalHeader = Handlebars.compile(`<style>${finalCssForPdf}</style>${headerTemplate}`)(data);
    const finalFooter = Handlebars.compile(`<style>${finalCssForPdf}</style>${footerTemplate}`)(data);

    // -----------------------------
    // GENERACIÓN DE HTML FINAL PARA PDF
    // -----------------------------
    // Solo se incluye el contenido principal, sin los bloques de header/footer.
    const finalHtml = `\n      <!DOCTYPE html>\n      <html lang=\"es\">\n      <head>\n        <meta charset=\"UTF-8\">\n        <style>${finalCssForPdf}</style>\n      </head>\n      <body>\n        <div class=\"content\">${contentBlock}</div>\n      </body>\n      </html>`;

    // -----------------------------
    // GENERACIÓN DE HTML DE DEPURACIÓN
    // -----------------------------
    // Incluye el CSS externo y muestra los bloques de header/footer para referencia visual.
    const debugHtml = `\n      <!DOCTYPE html>\n      <html lang=\"es\">\n      <head>\n        <meta charset=\"UTF-8\">\n        <title>Debug - Vista previa de factura</title>\n        ${finalCssForDebug}\n      </head>\n      <body>\n        <div class=\"content\">\n          ${contentBlock}\n        </div>\n        <div style=\"margin-top: 50px; border-top: 1px dashed #ccc; padding-top: 20px;\">\n          <h3>Plantilla de Encabezado:</h3>\n          <div id=\"header-template\">\n            ${headerTemplate}\n          </div>\n          <h3>Plantilla de Pie de Página:</h3>\n          <div id=\"footer-template\">\n            ${footerTemplate}\n          </div>\n        </div>\n      </body>\n      </html>`;

    // -----------------------------
    // GUARDADO DE HTML DE DEPURACIÓN
    // -----------------------------
    fs.writeFileSync(debugHtmlPath, debugHtml);
    console.log(`Archivo de depuración generado: ${debugHtmlPath}`);

    // -----------------------------
    // GENERACIÓN DE PDF CON HTML-PDF
    // -----------------------------
    console.log('Generando PDF...');
    const options = {
      format: 'A4',
      border: {
        top: '20mm',
        right: '10mm',
        bottom: '20mm',
        left: '10mm'
      }
    };
    await new Promise((resolve, reject) => {
      pdf.create(finalHtml, options).toFile(outputPdf, (err, res) => {
        if (err) {
          console.error('Error generando PDF:', err);
          reject(err);
        } else {
          console.log(`PDF generado con éxito: ${outputPdf}`);
          resolve(res);
        }
      });
    });
  } catch (error) {
    // -----------------------------
    // MANEJO DE ERRORES
    // -----------------------------
    // Cualquier error en el proceso se muestra aquí.
    console.error('Error en el proceso de generación:', error);
  } finally {
    // -----------------------------
    // CIERRE SEGURO DE RECURSOS
    // -----------------------------
    // Asegura que el navegador se cierre aunque ocurra un error.
    console.log('Proceso de generación de PDF finalizado.');
  }
})();
