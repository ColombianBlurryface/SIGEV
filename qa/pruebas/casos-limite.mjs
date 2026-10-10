/**
 * Casos límite y de seguridad de la API de SIGEV: datos inválidos, intentos de inyección,
 * concurrencia y acceso sin sesión. Se ejecutan contra un entorno de QA, nunca contra producción.
 *
 * Variables de entorno (las mismas que regresion.mjs): QA_API_URL, QA_USUARIO, QA_PASSWORD.
 *
 * DEFECTOS_CONOCIDOS lista los casos que hoy fallan y están pendientes de corregir (ver
 * docs/proceso-de-despliegue.md). Mientras sigan en la lista no hacen fallar la corrida; cuando
 * se corrijan, sacarlos de la lista para que vuelvan a proteger.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const API = (process.env.QA_API_URL || 'http://localhost:3011/api').replace(/\/$/, '')
const USUARIO = process.env.QA_USUARIO || 'qa'
const clave = process.env.QA_PASSWORD
if (!clave) {
  console.error('Falta QA_PASSWORD (la contraseña del usuario de QA).')
  process.exit(2)
}
const host = new URL(API).hostname
const esEntornoDePruebas = /^(localhost|127\.0\.0\.1)$/.test(host) || /(^|[-.])qa([-.]|$)/.test(host)
if (!esEntornoDePruebas && process.env.QA_FORZAR !== 'si') {
  console.error(`No se ejecutan: la API (${host}) no parece un entorno de pruebas. Define QA_FORZAR=si solo si estás seguro.`)
  process.exit(2)
}

const DEFECTOS_CONOCIDOS = new Set([
  'Asistentes decimales (100.5)',
  'Fecha inválida «2026-13-45»',
  'Fecha en texto «mañana»',
  'Nombre de evento de 151 caracteres',
  'Producto del catálogo inexistente',
  'Mobiliario con cantidad negativa',
  'Mobiliario con cantidad decimal',
  'Servicio sin descripción',
  'Evento con id no numérico',
  'Porción por persona negativa en un producto',
  'Filtro de catálogo con valor inválido',
  'Cantidad inicial de inventario gigantesca (10^12)',
])

const corrida = Date.now().toString(36).slice(-5)
const n = (t) => `${t} (QA-${corrida})`
let TOKEN = null

const call = async (ruta, op = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}), ...(op.headers || {}) }
  const cuerpo = op.body === undefined ? undefined : typeof op.body === 'string' ? op.body : JSON.stringify(op.body)
  const r = await fetch(`${API}${ruta}`, { ...op, headers, body: cuerpo })
  let c = null
  try { c = await r.json() } catch { /* sin cuerpo */ }
  return { s: r.status, c }
}
const ev = (o = {}) => ({ nombre_evento: n('Explo'), fecha_evento: '2026-12-30', tipo_evento: 'Boda', duracion_horas: 4, asistentes: 100, ...o })
const m = (r) => ({ s: r.s, nota: r.c?.error || r.c?.detalle || '' })

const filas = []
const caso = async (titulo, esperado, fn) => {
  let res
  try { res = await fn() } catch (e) { res = { s: 'ERR', nota: e.message } }
  const ok = esperado.includes(res.s)
  const conocido = !ok && DEFECTOS_CONOCIDOS.has(titulo)
  filas.push({ titulo, ok, conocido, esperado, obtenido: res.s, nota: res.nota || '' })
  const marca = ok ? '✓' : conocido ? '~' : '✗'
  console.log(`${marca} ${titulo} → esperado ${esperado.join('/')}, obtuvo ${res.s}${res.nota ? ' · ' + res.nota : ''}${conocido ? '  [defecto conocido]' : ''}`)
}

// --- sesión
const login = await call('/auth/login', { method: 'POST', body: { usuario: USUARIO, password: clave } })
if (login.s !== 200) { console.error('No se pudo iniciar sesión con el usuario de QA:', login.s); process.exit(2) }
const tokenValido = login.c.token

console.log(`Casos límite contra ${API} (corrida ${corrida})\n`)
console.log('== Acceso sin sesión')
for (const r of ['/eventos', '/eventos/1', '/catalogo', '/inventario', '/inventario/movimientos', '/configuracion']) {
  await caso(`Sin token: GET ${r}`, [401], async () => ({ s: (await call(r)).s }))
}
await caso('Sin token: crear un elemento de inventario', [401], async () => ({
  s: (await call('/inventario', { method: 'POST', body: { nombre: n('SinToken'), categoria_inventario: 'Mobiliario', cantidad_propia: 1 } })).s,
}))
await caso('Token inválido', [401], async () => ({ s: (await call('/eventos', { headers: { Authorization: 'Bearer abc.def.ghi' } })).s }))
await caso('Health es público', [200], async () => ({ s: (await call('/health')).s }))

TOKEN = tokenValido

console.log('\n== Entradas de eventos')
await caso('Asistentes decimales (100.5)', [400], async () => m(await call('/eventos', { method: 'POST', body: ev({ asistentes: 100.5 }) })))
await caso('Asistentes como texto «abc»', [400], async () => m(await call('/eventos', { method: 'POST', body: ev({ asistentes: 'abc' }) })))
await caso('Duración negativa', [400], async () => m(await call('/eventos', { method: 'POST', body: ev({ duracion_horas: -2 }) })))
await caso('Fecha inválida «2026-13-45»', [400], async () => m(await call('/eventos', { method: 'POST', body: ev({ fecha_evento: '2026-13-45' }) })))
await caso('Fecha en texto «mañana»', [400], async () => m(await call('/eventos', { method: 'POST', body: ev({ fecha_evento: 'mañana' }) })))
await caso('Nombre de evento de 151 caracteres', [400], async () => m(await call('/eventos', { method: 'POST', body: ev({ nombre_evento: 'x'.repeat(151) }) })))
await caso('Producto del catálogo inexistente', [400, 404], async () => m(await call('/eventos', { method: 'POST', body: ev({ productos: [{ producto_id: 999999 }] }) })))
await caso('Mobiliario con cantidad negativa', [400], async () => m(await call('/eventos', { method: 'POST', body: ev({ servicios_adicionales: [{ tipo: 'mobiliario', descripcion: 'x', cantidad: -5 }] }) })))
await caso('Mobiliario con cantidad decimal', [400], async () => m(await call('/eventos', { method: 'POST', body: ev({ servicios_adicionales: [{ tipo: 'mobiliario', descripcion: 'x', cantidad: 2.5 }] }) })))
await caso('Servicio sin descripción', [400], async () => m(await call('/eventos', { method: 'POST', body: ev({ servicios_adicionales: [{ tipo: 'dj', descripcion: '' }] }) })))
await caso('Cuerpo que no es JSON', [400], async () => m(await call('/eventos', { method: 'POST', body: '{esto no es json' })))
await caso('Evento inexistente', [404], async () => m(await call('/eventos/999999')))
await caso('Evento con id no numérico', [400, 404], async () => m(await call('/eventos/abc')))
await caso('Porción por persona negativa en un producto', [400], async () => {
  const p = (await call('/catalogo?clasificacion=alimento')).c?.[0]
  return m(await call('/eventos', { method: 'POST', body: ev({ productos: [{ producto_id: p.id, porcion_por_persona: -50 }] }) }))
})

console.log('\n== Filtros e inyección SQL')
await caso('Inventario: categoría con inyección', [400], async () => ({ s: (await call("/inventario?categoria=%27%20OR%201%3D1%20--")).s }))
await caso('Inventario: propiedad con inyección', [400], async () => ({ s: (await call('/inventario?propiedad=1%3BDROP%20TABLE%20eventos')).s }))
await caso('Movimientos: tipo con inyección', [400], async () => ({ s: (await call("/inventario/movimientos?tipo=baja%27%20OR%201%3D1")).s }))
await caso('Filtro de catálogo con valor inválido', [400, 200], async () => {
  const r = await call("/catalogo?clasificacion=%27%20OR%20%271%27%3D%271")
  return { s: r.s, nota: r.s === 200 ? `${r.c.length} filas` : '' }
})
await caso('La tabla de eventos sigue existiendo', [200], async () => ({ s: (await call('/eventos')).s }))

console.log('\n== Inventario: límites y concurrencia')
await caso('Nombre de elemento de 151 caracteres', [400], async () => m(await call('/inventario', { method: 'POST', body: { nombre: 'y'.repeat(151), categoria_inventario: 'Mobiliario', cantidad_propia: 1 } })))
await caso('Cantidad inicial decimal', [400], async () => m(await call('/inventario', { method: 'POST', body: { nombre: n('Decimal'), categoria_inventario: 'Mobiliario', cantidad_propia: 1.5 } })))
await caso('Cantidad inicial de inventario gigantesca (10^12)', [400, 201], async () => m(await call('/inventario', { method: 'POST', body: { nombre: n('Gigante'), categoria_inventario: 'Mobiliario', cantidad_propia: 1e12 } })))
await caso('Nombre con emoji y acentos', [201], async () => m(await call('/inventario', { method: 'POST', body: { nombre: n('Copa 🍷 piña ñandú'), categoria_inventario: 'Vajilla', cantidad_propia: 3 } })))
await caso('Nombre con HTML (se guarda como texto)', [201], async () => m(await call('/inventario', { method: 'POST', body: { nombre: n('<img src=x onerror=alert(1)>'), categoria_inventario: 'Vajilla', cantidad_propia: 3 } })))
const e1 = (await call('/inventario', { method: 'POST', body: { nombre: n('Concurrencia'), categoria_inventario: 'Mobiliario', cantidad_propia: 10 } })).c
await caso('10 bajas simultáneas de 3 sobre un stock de 10: solo 3 caben', [3], async () => {
  const rs = await Promise.all(Array.from({ length: 10 }, () => call(`/inventario/${e1.id}/baja`, { method: 'POST', body: { cantidad: 3 } })))
  const fin = (await call('/inventario')).c.find((x) => x.id === e1.id)
  return { s: rs.filter((r) => r.s === 201).length, nota: `quedaron ${fin.cantidad_propia} (nunca negativo: ${fin.cantidad_propia >= 0})` }
})
const e2 = (await call('/inventario', { method: 'POST', body: { nombre: n('Concurrencia 2'), categoria_inventario: 'Mobiliario', cantidad_propia: 0 } })).c
await caso('20 adquisiciones simultáneas de 5 suman exactamente 100', [100], async () => {
  await Promise.all(Array.from({ length: 20 }, () => call(`/inventario/${e2.id}/adquisiciones`, { method: 'POST', body: { cantidad: 5 } })))
  return { s: (await call('/inventario')).c.find((x) => x.id === e2.id).cantidad_propia }
})
await caso('El mismo nombre creado 5 veces a la vez: solo uno', [1], async () => {
  const rs = await Promise.all(Array.from({ length: 5 }, () => call('/inventario', { method: 'POST', body: { nombre: n('Carrera'), categoria_inventario: 'Mobiliario', cantidad_propia: 1 } })))
  return { s: rs.filter((r) => r.s === 201).length }
})

const inesperados = filas.filter((x) => !x.ok && !x.conocido)
const conocidos = filas.filter((x) => x.conocido)
const bien = filas.filter((x) => x.ok).length
console.log(`\nCASOS LÍMITE: ${bien}/${filas.length} correctos · ${conocidos.length} defectos conocidos pendientes · ${inesperados.length} fallos nuevos`)
if (inesperados.length) inesperados.forEach((x) => console.log(' ✗ NUEVO:', x.titulo, '→', x.obtenido, x.nota))

const carpeta = join(dirname(fileURLToPath(import.meta.url)), '..', 'resultados')
mkdirSync(carpeta, { recursive: true })
writeFileSync(join(carpeta, `casos-limite-${corrida}.json`), JSON.stringify({ fecha: new Date().toISOString(), api: API, corrida, filas }, null, 2))
process.exit(inesperados.length ? 1 : 0)
