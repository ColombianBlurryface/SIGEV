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

const DEFECTOS_CONOCIDOS = new Set([])

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
// Cada evento de prueba va en una fecha al azar entre 1 mes y 4 años adelante (dentro del tope de 5 años), por el tope de eventos por día
// Días que ya tienen eventos de corridas anteriores (se cargan después de iniciar sesión): se evitan, porque con 3 el día se llena
let DIAS_OCUPADOS = new Set()
const fechaLibre = () => {
  for (let i = 0; i < 50; i++) {
    const f = new Date(Date.now() + (30 + Math.floor(Math.random() * 1500)) * 86400000).toISOString().slice(0, 10)
    if (!DIAS_OCUPADOS.has(f)) return f
  }
  return new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
}
const ev = (o = {}) => ({ nombre_evento: n('Explo'), fecha_evento: fechaLibre(), tipo_evento: 'Boda', duracion_horas: 4, asistentes: 100, ...o })
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
DIAS_OCUPADOS = new Set((await call('/eventos')).c.map((e) => String(e.fecha_evento).slice(0, 10)))

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

console.log('\n== Servicios adicionales (RN-18): 1 a 5 unidades y horas que no pasan la duración del evento')
const srv = (o = {}) => ({ tipo: 'dj', descripcion: 'DJ', cantidad: 1, horas: 3, ...o })
const conServicio = (o, evento = {}) => m(await_call_eventos(ev({ duracion_horas: 4, servicios_adicionales: [srv(o)], ...evento })))
function await_call_eventos(cuerpo) { return call('/eventos', { method: 'POST', body: cuerpo }) }
for (const u of [0, 6, -1, 2.5, 1000]) {
  await caso(`Servicio con ${u} unidades`, [400], async () => m(await await_call_eventos(ev({ servicios_adicionales: [srv({ cantidad: u })] }))))
}
for (const u of [1, 5]) {
  await caso(`Servicio con ${u} unidad(es) (límite exacto)`, [201], async () => m(await await_call_eventos(ev({ servicios_adicionales: [srv({ tipo: 'otro', cantidad: u })] }))))
}
await caso('DJ de 300 horas en un evento de 4', [400], async () => m(await await_call_eventos(ev({ duracion_horas: 4, servicios_adicionales: [srv({ horas: 300 })] }))))
await caso('Horas mayores a la duración (5 h en un evento de 4 h)', [400], async () => m(await await_call_eventos(ev({ duracion_horas: 4, servicios_adicionales: [srv({ horas: 5 })] }))))
await caso('Horas iguales a la duración (4 h en un evento de 4 h)', [201], async () => m(await await_call_eventos(ev({ duracion_horas: 4, servicios_adicionales: [srv({ horas: 4 })] }))))
await caso('Media hora (3,5 h) en un evento de 4 h', [201], async () => m(await await_call_eventos(ev({ duracion_horas: 4, servicios_adicionales: [srv({ horas: 3.5 })] }))))
console.log('\n== COR-06: horas de 1 a 5 y tope de unidades por tipo de servicio en todo el evento')
const largo = async (servicios) => m(await await_call_eventos(ev({ duracion_horas: 8, servicios_adicionales: servicios })))
await caso('DJ de 6 horas en un evento de 8 h (máximo 5 h)', [400], async () => largo([srv({ horas: 6 })]))
await caso('DJ de 8 horas en un evento de 8 h', [400], async () => largo([srv({ horas: 8 })]))
await caso('DJ de 5 horas en un evento de 8 h (límite exacto)', [201], async () => largo([srv({ horas: 5 })]))
await caso('DJ de media hora (mínimo 1 h)', [400], async () => largo([srv({ horas: 0.5 })]))
await caso('DJ de 1 hora (límite exacto)', [201], async () => largo([srv({ horas: 1 })]))
await caso('DJ de 1,5 horas', [201], async () => largo([srv({ horas: 1.5 })]))
await caso('4 DJs en una sola línea (máximo 3)', [400], async () => largo([srv({ cantidad: 4 })]))
await caso('3 DJs en una sola línea (límite exacto)', [201], async () => largo([srv({ cantidad: 3 })]))
await caso('DJs en dos líneas que suman 4 (2 + 2)', [400], async () => largo([srv({ cantidad: 2 }), srv({ cantidad: 2, descripcion: 'DJ 2' })]))
await caso('DJs en dos líneas que suman 3 (2 + 1)', [201], async () => largo([srv({ cantidad: 2 }), srv({ cantidad: 1, descripcion: 'DJ 2' })]))
await caso('Seis líneas de 1 DJ (como en la captura del PO)', [400], async () => largo(Array.from({ length: 6 }, (_, i) => srv({ descripcion: `DJ ${i}` }))))
await caso('3 de sonido (máximo 2)', [400], async () => largo([srv({ tipo: 'sonido', cantidad: 3 })]))
await caso('2 de sonido (límite exacto)', [201], async () => largo([srv({ tipo: 'sonido', cantidad: 2 })]))
await caso('3 de iluminación (máximo 2)', [400], async () => largo([srv({ tipo: 'iluminacion', cantidad: 3 })]))
await caso('4 de música en vivo (máximo 3)', [400], async () => largo([srv({ tipo: 'musica_en_vivo', cantidad: 4 })]))
await caso('4 de entretenimiento (máximo 3)', [400], async () => largo([srv({ tipo: 'entretenimiento', cantidad: 4 })]))
await caso('Tipo «otro» 3 + 3 (máximo 5)', [400], async () => largo([srv({ tipo: 'otro', cantidad: 3 }), srv({ tipo: 'otro', cantidad: 3, descripcion: 'Otro 2' })]))
await caso('Un servicio de cada tipo en su tope', [201], async () => largo([srv({ cantidad: 3 }), srv({ tipo: 'musica_en_vivo', cantidad: 3 }), srv({ tipo: 'sonido', cantidad: 2 }), srv({ tipo: 'iluminacion', cantidad: 2 }), srv({ tipo: 'entretenimiento', cantidad: 3 }), srv({ tipo: 'otro', cantidad: 5 })]))
await caso('Horas con cuarto de hora (3,25)', [400], async () => m(await await_call_eventos(ev({ servicios_adicionales: [srv({ horas: 3.25 })] }))))
await caso('Horas en 0, negativas o sin enviar', [400], async () => {
  const r = [0, -2, undefined].map(async (h) => (await await_call_eventos(ev({ servicios_adicionales: [srv({ horas: h })] }))).s)
  const s3 = await Promise.all(r)
  return { s: s3.every((x) => x === 400) ? 400 : s3.join('/'), nota: s3.join('/') }
})
await caso('Servicio sin unidades', [400], async () => m(await await_call_eventos(ev({ servicios_adicionales: [{ tipo: 'dj', descripcion: 'DJ', horas: 2 }] }))))
await caso('Servicio con descripción en blanco', [400], async () => m(await await_call_eventos(ev({ servicios_adicionales: [srv({ descripcion: '   ' })] }))))
await caso('Servicio de un tipo inventado', [400], async () => m(await await_call_eventos(ev({ servicios_adicionales: [srv({ tipo: 'helicoptero' })] }))))
await caso('Descripción de servicio de 10.000 caracteres', [400], async () => m(await await_call_eventos(ev({ servicios_adicionales: [srv({ descripcion: 'x'.repeat(10000) })] }))))
await caso('Mobiliario «Otro» sin descripción', [400], async () => m(await await_call_eventos(ev({ servicios_adicionales: [{ tipo: 'mobiliario', cantidad: 5 }] }))))
await caso('servicios_adicionales que no es una lista', [400], async () => m(await await_call_eventos(ev({ servicios_adicionales: 'hola' }))))

console.log('\n== Datos del evento: fecha, tipo, nombre y productos')
const ayer = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
await caso('Fecha de ayer', [400], async () => m(await await_call_eventos(ev({ fecha_evento: ayer }))))
await caso('Fecha de hoy (se acepta)', [201, 400], async () => m(await await_call_eventos(ev({ fecha_evento: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }) }))))
await caso('Fecha en el año 3000', [400], async () => m(await await_call_eventos(ev({ fecha_evento: '3000-01-01' }))))
await caso('Tipo de evento inventado', [400], async () => m(await await_call_eventos(ev({ tipo_evento: 'Fiesta ilegal' }))))
await caso('Nombre solo con espacios', [400], async () => m(await await_call_eventos(ev({ nombre_evento: '     ' }))))
await caso('Observaciones de 1 millón de caracteres', [400, 413], async () => m(await await_call_eventos(ev({ observaciones_generales: 'x'.repeat(1000000) }))))
await caso('Duración 0,5 h con 600 asistentes', [400], async () => m(await await_call_eventos(ev({ duracion_horas: 0.5, asistentes: 600 }))))
await caso('Duración «4 horas» como texto', [400], async () => m(await await_call_eventos(ev({ duracion_horas: '4 horas' }))))
await caso('El mismo alimento dos veces en un evento', [400], async () => {
  const p = (await call('/catalogo?clasificacion=alimento')).c?.[0]
  return m(await await_call_eventos(ev({ productos: [{ producto_id: p.id }, { producto_id: p.id }] })))
})
await caso('producto_id con texto', [400, 404], async () => m(await await_call_eventos(ev({ productos: [{ producto_id: 'abc' }] }))))
await caso('productos que no es una lista', [400], async () => m(await await_call_eventos(ev({ productos: 'hola' }))))
for (const [titulo, porcion] of [['negativa', -200], ['en 0', 0], ['de 50 kg por persona', 50000]]) {
  await caso(`Alimento con porción ${titulo}`, [400], async () => {
    const p = (await call('/catalogo?clasificacion=alimento')).c?.[0]
    return m(await await_call_eventos(ev({ productos: [{ producto_id: p.id, porcion_por_persona: porcion }] })))
  })
}
await caso('Evento con id texto', [400], async () => m(await call('/eventos/abc')))
await caso('Evento con id gigante', [400, 404], async () => m(await call('/eventos/99999999999999999999')))
await caso('Catálogo: grupo inválido en el filtro', [400], async () => m(await call('/catalogo?clasificacion=xyz')))
await caso('Catálogo: producto con id texto', [400, 404], async () => m(await call('/catalogo/abc')))
await caso('Catálogo: alimento de 90 kg por persona', [400], async () => m(await call('/catalogo', { method: 'POST', body: { nombre: n('Pesado'), clasificacion: 'alimento', tipo_calculo: 'porcion_persona', porcion_por_persona: 90000 } })))
await caso('Catálogo: botella de 100 litros', [400], async () => m(await call('/catalogo', { method: 'POST', body: { nombre: n('Botellón'), clasificacion: 'bebida_general', tipo_calculo: 'botella_compartida', volumen_botella_ml: 100000, tamano_porcion_ml: 125 } })))

console.log('\n== Concurrencia en el registro de eventos')
await caso('30 registros simultáneos en la misma fecha: entran 3 como máximo', [3], async () => {
  // Una fecha sin ningún evento todavía (si ya hubiera uno de otra corrida, entrarían menos de 3 y la prueba confundiría)
  const ocupadas = new Set((await call('/eventos')).c.map((e) => String(e.fecha_evento).slice(0, 10)))
  let f = fechaLibre()
  while (ocupadas.has(f)) f = fechaLibre()
  const rs = await Promise.all(Array.from({ length: 30 }, () => call('/eventos', { method: 'POST', body: ev({ fecha_evento: f }) })))
  const ok = rs.filter((r) => r.s === 201).length
  return { s: ok, nota: `entraron ${ok}` }
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
console.log('\n== COR-04: un elemento nuevo se registra con al menos 1 unidad (en las 4 categorías)')
for (const cat of ['Mobiliario', 'Vajilla', 'Bar/Bebidas', 'Bebidas de Coctelería']) {
  await caso(`${cat}: registrar con cantidad 0`, [400], async () => m(await call('/inventario', { method: 'POST', body: { nombre: n('Cero ' + cat.slice(0, 4)), categoria_inventario: cat, cantidad_propia: 0 } })))
  await caso(`${cat}: registrar con cantidad 1 (límite exacto)`, [201], async () => m(await call('/inventario', { method: 'POST', body: { nombre: n('Uno ' + cat.slice(0, 4)), categoria_inventario: cat, cantidad_propia: 1 } })))
}
await caso('Registrar sin enviar la cantidad', [400], async () => m(await call('/inventario', { method: 'POST', body: { nombre: n('SinCantidad'), categoria_inventario: 'Mobiliario' } })))
await caso('Registrar con cantidad -0 / null', [400], async () => {
  const r = await Promise.all([-0, null].map(async (c) => (await call('/inventario', { method: 'POST', body: { nombre: n('Nulo'), categoria_inventario: 'Mobiliario', cantidad_propia: c } })).s))
  return { s: r.every((x) => x === 400) ? 400 : r.join('/'), nota: r.join('/') }
})
await caso('Un elemento ya registrado sí puede quedar en 0 con «Actualizar»', [200], async () => {
  const e = (await call('/inventario', { method: 'POST', body: { nombre: n('A cero'), categoria_inventario: 'Mobiliario', cantidad_propia: 5 } })).c
  return m(await call(`/inventario/${e.id}/cantidad`, { method: 'PATCH', body: { cantidad_propia: 0 } }))
})
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
const e2 = (await call('/inventario', { method: 'POST', body: { nombre: n('Concurrencia 2'), categoria_inventario: 'Mobiliario', cantidad_propia: 1 } })).c
await caso('20 adquisiciones simultáneas de 5 suman exactamente 101 (1 inicial + 100)', [101], async () => {
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
