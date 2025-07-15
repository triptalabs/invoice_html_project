import { test } from 'uvu';
import * as assert from 'uvu/assert';

const API_URL = 'http://localhost:3000/generate-invoice';
const API_KEY = 'supersecretkey';

// Test: rechaza sin API Key

test('rechaza sin API Key', async () => {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client: { name: 'Test', id: '1', address: 'Calle' }, items: [{ description: 'x', quantity: 1, price: 1 }] })
  });
  assert.is(res.status, 401);
  const json = await res.json();
  assert.equal(json.error, 'No autorizado');
});

// Test: acepta con API Key y datos mínimos válidos

test('acepta con API Key y datos válidos', async () => {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({ client: { name: 'Test', id: '1', address: 'Calle' }, items: [{ description: 'x', quantity: 1, price: 1 }] })
  });
  assert.is(res.status, 200);
  assert.is(res.headers.get('content-type'), 'application/pdf');
});

// Test: error de validación (falta campo requerido)
test('error de validación: falta campo requerido', async () => {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({ client: { name: 'Test', id: '1' }, items: [{ description: 'x', quantity: 1, price: 1 }] }) // falta address
  });
  assert.is(res.status, 400);
  const json = await res.json();
  assert.equal(json.error, 'Datos de factura inválidos');
  assert.ok(Array.isArray(json.details));
});

// Test: error por archivo de logo faltante
test('error por archivo de logo faltante', async () => {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({ client: { name: 'Test', id: '1', address: 'Calle' }, items: [{ description: 'x', quantity: 1, price: 1 }], company: { logo: 'no-existe.png' } })
  });
  // Puede ser 400 o 500 según la lógica, pero debe ser error
  assert.ok(res.status === 400 || res.status === 500);
  const json = await res.json();
  assert.ok(json.error.includes('logo') || json.error.includes('Logo'));
});

// Test: error por rate limiting (simulación rápida)
test('error por rate limiting', async () => {
  let lastStatus = 200;
  for (let i = 0; i < 35; i++) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ client: { name: 'Test', id: '1', address: 'Calle' }, items: [{ description: 'x', quantity: 1, price: 1 }] })
    });
    lastStatus = res.status;
    if (lastStatus === 429) {
      const json = await res.json();
      assert.equal(json.error, 'Demasiadas peticiones');
      return;
    }
  }
  assert.is(lastStatus, 429, 'Debería llegar a rate limit');
});

test.run(); 