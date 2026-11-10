/**
 * Pruebas unitarias de cálculo de botellas para coctelería (HU-45 · RF-53, RN-09, RN-15, RN-19).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { armarComprasCocteles } = require('../src/controllers/comprasCoctelesController');

test('HU-45: lista vacía devuelve estructura base limpia sin errores', async () => {
  const mockClient = {};
  const res = await armarComprasCocteles(mockClient, 100, []);
  assert.equal(res.asistentes, 100);
  assert.equal(res.margen_porcentaje, 10);
  assert.equal(res.total_botellas, 0);
  assert.equal(res.costo_total_licores, 0);
  assert.deepEqual(res.items, []);
  assert.deepEqual(res.cocteles_sin_receta, []);
});

test('HU-45: cálculo de botellas con margen del 10% y redondeo superior (RN-09, RN-19)', async () => {
  // Mock client que responde como si consultara Gin Tonic (50ml Ginebra 750ml)
  const mockClient = {
    async query(sql, params) {
      if (sql.includes('catalogo_productos cp')) {
        return {
          rows: [
            { producto_id: 10, producto_nombre: 'Gin Tonic', coctel_id: 1, coctel_nombre: 'Gin Tonic', coctel_activo: true }
          ]
        };
      }
      if (sql.includes('coctel_ingredientes ci')) {
        return {
          rows: [
            { coctel_id: 1, licor_id: 20, mililitros: 50, nombre_licor: 'Ginebra Tanqueray', volumen_botella_ml: 750, precio_unitario: 120000 }
          ]
        };
      }
      return { rows: [] };
    }
  };

  // 100 asistentes * 2 tragos * 50 ml = 10.000 ml netos
  // Con 10% margen = 11.000 ml
  // Botellas = 11.000 / 750 = 14.67 -> redondeo superior = 15 botellas
  const res = await armarComprasCocteles(mockClient, 100, [{ producto_id: 10, porcion_por_persona: 2 }]);
  assert.equal(res.items.length, 1);
  const lic = res.items[0];
  assert.equal(lic.nombre_licor, 'Ginebra Tanqueray');
  assert.equal(lic.ml_netos, 10000);
  assert.equal(lic.ml_con_margen, 11000);
  assert.equal(lic.botellas_requeridas, 15);
  assert.equal(lic.costo_estimado, 15 * 120000);
  assert.deepEqual(lic.cocteles, ['Gin Tonic']);
  assert.equal(res.total_botellas, 15);
  assert.equal(res.cocteles_con_receta, 1);
});

test('HU-45: consolidación de licores comunes entre cócteles diferentes', async () => {
  // Mock client donde dos cócteles usan el mismo licor:
  // Coctel 1: 50 ml de Ginebra (1 trago) -> 100 * 1 * 50 = 5.000 ml
  // Coctel 2: 30 ml de Ginebra (1 trago) -> 100 * 1 * 30 = 3.000 ml
  // Total neto = 8.000 ml -> +10% = 8.800 ml -> 8.800 / 750 = 11.73 -> 12 botellas
  const mockClient = {
    async query(sql, params) {
      if (sql.includes('catalogo_productos cp')) {
        return {
          rows: [
            { producto_id: 1, producto_nombre: 'Coctel A', coctel_id: 1, coctel_nombre: 'Coctel A', coctel_activo: true },
            { producto_id: 2, producto_nombre: 'Coctel B', coctel_id: 2, coctel_nombre: 'Coctel B', coctel_activo: true }
          ]
        };
      }
      if (sql.includes('coctel_ingredientes ci')) {
        return {
          rows: [
            { coctel_id: 1, licor_id: 20, mililitros: 50, nombre_licor: 'Ginebra Tanqueray', volumen_botella_ml: 750, precio_unitario: 100000 },
            { coctel_id: 2, licor_id: 20, mililitros: 30, nombre_licor: 'Ginebra Tanqueray', volumen_botella_ml: 750, precio_unitario: 100000 }
          ]
        };
      }
      return { rows: [] };
    }
  };

  const res = await armarComprasCocteles(mockClient, 100, [
    { producto_id: 1, porcion_por_persona: 1 },
    { producto_id: 2, porcion_por_persona: 1 }
  ]);

  assert.equal(res.items.length, 1, 'Debe consolidar la ginebra en un solo ítem');
  const lic = res.items[0];
  assert.equal(lic.ml_netos, 8000);
  assert.equal(lic.ml_con_margen, 8800);
  assert.equal(lic.botellas_requeridas, 12);
  assert.deepEqual(lic.cocteles, ['Coctel A', 'Coctel B']);
});

test('HU-45: detección de cócteles sin receta configurada', async () => {
  const mockClient = {
    async query(sql) {
      if (sql.includes('catalogo_productos cp')) {
        return {
          rows: [
            { producto_id: 99, producto_nombre: 'Cóctel Misterio', coctel_id: null, coctel_nombre: null, coctel_activo: null }
          ]
        };
      }
      return { rows: [] };
    }
  };

  const res = await armarComprasCocteles(mockClient, 100, [{ producto_id: 99, porcion_por_persona: 1 }]);
  assert.equal(res.items.length, 0);
  assert.equal(res.cocteles_con_receta, 0);
  assert.equal(res.cocteles_sin_receta.length, 1);
  assert.equal(res.cocteles_sin_receta[0].nombre, 'Cóctel Misterio');
});
