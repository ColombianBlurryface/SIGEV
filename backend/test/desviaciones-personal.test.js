/**
 * Pruebas unitarias de las desviaciones de personal (HU-25 · RF-32).
 * Se ejecutan con: node --test test/*.test.js (desde backend/)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calcularDesviacionRol,
  calcularDesviacionesPersonal
} = require('../src/config/reglasDesviacionesPersonal');

test('HU-25 / RF-32 · Escenario 1: detección de déficit en meseros y cocineros conformes', () => {
  // 100 asistentes: meseros = Math.ceil(100/20) = 5; cocineros = Math.ceil(100/25)*2 = 8
  // Asignados: 3 meseros y 8 cocineros
  const res = calcularDesviacionesPersonal('evt-201', 100, { meseros: 3, cocineros: 8 });

  assert.equal(res.has_deviations, true);
  assert.equal(res.overall_status, 'DEFICIT');

  const meseros = res.roles_breakdown.find((r) => r.role === 'WAITERS');
  assert.ok(meseros);
  assert.equal(meseros.required_count, 5);
  assert.equal(meseros.assigned_count, 3);
  assert.equal(meseros.difference, -2);
  assert.equal(meseros.status, 'DEFICIT');
  assert.match(meseros.message, /2 meseros adicionales/);

  const cocineros = res.roles_breakdown.find((r) => r.role === 'COOKS');
  assert.ok(cocineros);
  assert.equal(cocineros.required_count, 8);
  assert.equal(cocineros.assigned_count, 8);
  assert.equal(cocineros.difference, 0);
  assert.equal(cocineros.status, 'OK');
  assert.match(cocineros.message, /cumple exactamente/);

  assert.equal(res.summary.total_required, 13);
  assert.equal(res.summary.total_assigned, 11);
  assert.equal(res.summary.total_missing, 2);
});

test('HU-25 / RF-32 · Escenario 2: asignación conforme al estándar requerido', () => {
  // 60 asistentes: meseros = Math.ceil(60/20) = 3; cocineros = Math.ceil(60/25)*2 = 6
  // Asignados: 3 meseros y 6 cocineros
  const res = calcularDesviacionesPersonal('evt-100', 60, { meseros: 3, cocineros: 6 });

  assert.equal(res.has_deviations, false);
  assert.equal(res.overall_status, 'COMPLIANT');

  const meseros = res.roles_breakdown.find((r) => r.role === 'WAITERS');
  assert.equal(meseros.status, 'OK');
  assert.equal(meseros.difference, 0);

  const cocineros = res.roles_breakdown.find((r) => r.role === 'COOKS');
  assert.equal(cocineros.status, 'OK');
  assert.equal(cocineros.difference, 0);

  assert.equal(res.summary.total_missing, 0);
});

test('HU-25 / RF-32 · Escenario 3: evento sin personal asignado (déficit total inicial)', () => {
  // 80 asistentes: meseros = 4; cocineros = 8
  // Asignados: 0
  const res = calcularDesviacionesPersonal('evt-300', 80, { meseros: 0, cocineros: 0 });

  assert.equal(res.has_deviations, true);
  assert.equal(res.overall_status, 'DEFICIT');

  const meseros = res.roles_breakdown.find((r) => r.role === 'WAITERS');
  assert.equal(meseros.status, 'DEFICIT');
  assert.equal(meseros.difference, -4);
  assert.equal(meseros.deficit, 4);

  const cocineros = res.roles_breakdown.find((r) => r.role === 'COOKS');
  assert.equal(cocineros.status, 'DEFICIT');
  assert.equal(cocineros.difference, -8);
  assert.equal(cocineros.deficit, 8);

  assert.equal(res.summary.total_missing, 12);
  assert.equal(res.alerta_meseros.activa, true);
  assert.equal(res.alerta_meseros.faltantes, 4);
});

test('HU-25 / RF-32 · Escenario 4: superávit de personal sin déficit', () => {
  // 40 asistentes: meseros = 2; cocineros = 4
  // Asignados: 3 meseros y 5 cocineros
  const res = calcularDesviacionesPersonal('evt-400', 40, { meseros: 3, cocineros: 5 });

  assert.equal(res.has_deviations, false);
  assert.equal(res.overall_status, 'SURPLUS');

  const meseros = res.roles_breakdown.find((r) => r.role === 'WAITERS');
  assert.equal(meseros.status, 'SURPLUS');
  assert.equal(meseros.difference, 1);
  assert.match(meseros.message, /por encima del estándar/);

  const cocineros = res.roles_breakdown.find((r) => r.role === 'COOKS');
  assert.equal(cocineros.status, 'SURPLUS');
  assert.equal(cocineros.difference, 1);
});

test('HU-25 / RF-32 · Mensajes en singular y plural para diferencias', () => {
  const d1 = calcularDesviacionRol('WAITERS', 5, 4);
  assert.match(d1.message, /Se requiere 1 mesero adicional/);

  const d2 = calcularDesviacionRol('WAITERS', 5, 2);
  assert.match(d2.message, /Se requieren 3 meseros adicionales/);

  const d3 = calcularDesviacionRol('COOKS', 4, 3);
  assert.match(d3.message, /Se requiere 1 cocinero adicional/);

  const d4 = calcularDesviacionRol('COOKS', 6, 2);
  assert.match(d4.message, /Se requieren 4 cocineros adicionales/);
});
