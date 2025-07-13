// Utilidades para cálculo de totales y conversión de número a texto

/**
 * Calcula los totales de la factura a partir de los items y los campos opcionales de IVA y descuento.
 * @param {Object} data - Objeto de datos de la factura (company, client, items, iva, descuento, etc.)
 * @returns {Object} - Objeto con los campos calculados: items (con subtotal), subtotal, iva, descuento, total_numeric, total_text
 */
function calcularTotales(data) {
  // Copia profunda para no mutar el original
  const factura = JSON.parse(JSON.stringify(data));
  // Calcular subtotal y total de cada item
  factura.items = factura.items.map(item => {
    const subtotal = Number(item.quantity) * Number(item.unit_price);
    return { ...item, subtotal };
  });
  // Subtotal general
  const subtotal = factura.items.reduce((acc, item) => acc + item.subtotal, 0);
  // IVA
  let iva = 0;
  if (factura.iva) {
    if (typeof factura.iva === 'number') {
      iva = factura.iva;
    } else if (typeof factura.iva === 'string' && factura.iva.endsWith('%')) {
      iva = subtotal * (parseFloat(factura.iva) / 100);
    } else {
      iva = Number(factura.iva) || 0;
    }
  }
  // Descuento
  let descuento = 0;
  if (factura.descuento) {
    if (typeof factura.descuento === 'number') {
      descuento = factura.descuento;
    } else if (typeof factura.descuento === 'string' && factura.descuento.endsWith('%')) {
      descuento = subtotal * (parseFloat(factura.descuento) / 100);
    } else {
      descuento = Number(factura.descuento) || 0;
    }
  }
  // Total
  const total_numeric = subtotal + iva - descuento;
  // Total en texto
  const total_text = numeroATexto(total_numeric);
  return {
    ...factura,
    items: factura.items,
    totals: {
      subtotal,
      iva,
      descuento,
      total_numeric,
      total_text
    }
  };
}

/**
 * Convierte un número a texto en español (solo enteros hasta millones).
 * @param {number} num
 * @returns {string}
 */
function numeroATexto(num) {
  // Implementación simple para números enteros hasta millones
  // Puedes reemplazar por una librería si se requiere más robustez
  const UNIDADES = ['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve'];
  const DECENAS = ['','diez','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
  const CENTENAS = ['','cien','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];
  if (typeof num !== 'number' || isNaN(num)) return '';
  const entero = Math.floor(num);
  if (entero === 0) return 'cero';
  if (entero > 999999999) return 'número demasiado grande';
  // Función recursiva
  function convertir(n) {
    if (n < 10) return UNIDADES[n];
    if (n < 100) {
      if (n % 10 === 0) return DECENAS[Math.floor(n/10)];
      return DECENAS[Math.floor(n/10)] + ' y ' + UNIDADES[n%10];
    }
    if (n < 1000) {
      if (n === 100) return 'cien';
      return CENTENAS[Math.floor(n/100)] + (n%100 > 0 ? ' ' + convertir(n%100) : '');
    }
    if (n < 1000000) {
      if (n === 1000) return 'mil';
      if (n < 2000) return 'mil ' + convertir(n%1000);
      return convertir(Math.floor(n/1000)) + ' mil' + (n%1000 > 0 ? ' ' + convertir(n%1000) : '');
    }
    if (n < 1000000000) {
      if (n === 1000000) return 'un millón';
      if (n < 2000000) return 'un millón ' + convertir(n%1000000);
      return convertir(Math.floor(n/1000000)) + ' millones' + (n%1000000 > 0 ? ' ' + convertir(n%1000000) : '');
    }
    return '';
  }
  // Agregar decimales si existen
  const decimales = Math.round((num - entero) * 100);
  let texto = convertir(entero).toUpperCase();
  if (decimales > 0) {
    texto += ' ' + decimales + '/100';
  } else {
    texto += ' 00/100';
  }
  return texto;
}

module.exports = {
  calcularTotales,
  numeroATexto
}; 