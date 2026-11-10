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
  // Cada fecha entregada se marca como usada: así dos eventos de la misma corrida no chocan con el tope de 3 por día
  const tomar = (f) => { DIAS_OCUPADOS.add(f); return f }
  for (let i = 0; i < 50; i++) {
    const f = new Date(Date.now() + (30 + Math.floor(Math.random() * 1500)) * 86400000).toISOString().slice(0, 10)
    if (!DIAS_OCUPADOS.has(f)) return tomar(f)
  }
  // Con una base de pruebas muy llena, se recorre el rango hasta encontrar el primer día sin eventos
  for (let d = 30; d < 1800; d++) {
    const f = new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)
    if (!DIAS_OCUPADOS.has(f)) return tomar(f)
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
  for (let i = 0; i < 30 && ocupadas.has(f); i++) f = fechaLibre()
  if (ocupadas.has(f)) return { s: 'SIN FECHA LIBRE', nota: 'la base de pruebas está llena de eventos: recréala (schema + seeds + catálogo + usuario local)' }
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

console.log('\n== HU-22: cocineros (2 por cada 25 asistentes, hacia arriba) · se calculan siempre en el servidor')
const cocinerosDelEvento = async (cuerpo) => {
  const r = await call('/eventos', { method: 'POST', body: ev(cuerpo) })
  if (r.s !== 201) return { s: r.s, nota: JSON.stringify(r.c).slice(0, 90) }
  return { s: (await call(`/eventos/${r.c.evento.id}`)).c.logistica.cocineros_requeridos }
}
for (const [a, esperado] of [[40, 4], [50, 4], [51, 6], [600, 48]]) {
  await caso(`${a} asistentes → ${esperado} cocineros`, [esperado], async () => cocinerosDelEvento({ asistentes: a }))
}
await caso('El cliente no puede fijar los cocineros (cocineros_requeridos: 99 se ignora → 4)', [4], async () => cocinerosDelEvento({ asistentes: 40, cocineros_requeridos: 99 }))
await caso('El cliente no puede mandar un tipo de comida que cambie el cálculo (tipo_servicio: «cena» se ignora → 4)', [4], async () => cocinerosDelEvento({ asistentes: 40, tipo_servicio: 'cena', menu: 'buffet' }))
await caso('Cocineros con 39 asistentes (bajo el mínimo del evento)', [400], async () => m(await call('/eventos', { method: 'POST', body: ev({ asistentes: 39 }) })))
await caso('Cocineros con 601 asistentes (sobre el máximo del evento)', [400], async () => m(await call('/eventos', { method: 'POST', body: ev({ asistentes: 601 }) })))
await caso('Cocineros con 40,5 asistentes (decimal)', [400], async () => m(await call('/eventos', { method: 'POST', body: ev({ asistentes: 40.5 }) })))

console.log('\n== HU-46: recetas de platos (RF-54) · entradas raras')
const platoLimite = (await call('/catalogo', { method: 'POST', body: { nombre: n('Plato límite'), clasificacion: 'alimento', tipo_calculo: 'porcion_persona', porcion_por_persona: 100 } })).c
const ingLim = (o = {}) => ({ nombre_ingrediente: n('Ing'), unidad_compra: 'kilo', cantidad_porcion: 50, unidad_porcion: 'gramo', ...o })
const recetaLim = async (lineas, cuerpo) => m(await call(`/catalogo/${platoLimite.id}/receta`, { method: 'PUT', body: cuerpo ?? { ingredientes: lineas } }))
await caso('Receta con ingrediente de nombre HTML (se guarda como texto)', [200], async () => recetaLim([ingLim({ nombre_ingrediente: n('<img src=x onerror=alert(1)>') })]))
await caso('Receta con comilla y punto y coma en el nombre (no rompe la consulta)', [200], async () => recetaLim([ingLim({ nombre_ingrediente: n("Robert'); DROP TABLE ingredientes;--") })]))
await caso('Receta con emoji y acentos en el nombre', [200], async () => recetaLim([ingLim({ nombre_ingrediente: n('Piña 🍍 ñame') })]))
await caso('Cantidad en notación científica enorme (1e21)', [400], async () => recetaLim([ingLim({ cantidad_porcion: 1e21 })]))
await caso('Cantidad diminuta (1e-7)', [400], async () => recetaLim([ingLim({ cantidad_porcion: 1e-7 })]))
await caso('Unidad de compra como objeto o lista', [400], async () => {
  const r = await Promise.all([{ k: 1 }, ['kilo']].map(async (u) => (await call(`/catalogo/${platoLimite.id}/receta`, { method: 'PUT', body: { ingredientes: [ingLim({ unidad_compra: u })] } })).s))
  return { s: r.every((x) => x === 400) ? 400 : r.join('/'), nota: r.join('/') }
})
await caso('Campos de más en un ingrediente se ignoran', [200], async () => recetaLim([ingLim({ es_dato_prueba: true, ingrediente_id: 1, extra: 'x' })]))
await caso('Un cliente no puede marcar su receta como dato de prueba', [false], async () => {
  const r = await call(`/catalogo/${platoLimite.id}/receta`)
  return { s: r.c.es_dato_prueba }
})
await caso('Cuerpo que no es un objeto (lista, texto, número)', [400], async () => {
  const r = await Promise.all([[], 'hola', 5].map(async (b) => (await call(`/catalogo/${platoLimite.id}/receta`, { method: 'PUT', body: b })).s))
  return { s: r.every((x) => x === 400) ? 400 : r.join('/'), nota: r.join('/') }
})
await caso('Receta de 30 ingredientes con nombres de 100 caracteres', [200], async () => recetaLim(Array.from({ length: 30 }, (_, i) => ingLim({ nombre_ingrediente: `${i}`.padStart(3, '0') + 'x'.repeat(90) + n('').slice(0, 7), cantidad_porcion: 1 }))))

console.log('\n== HU-47: ingredientes a comprar (RF-55, RN-20) · entradas raras del cálculo previo')
const previo = async (body) => m(await call('/eventos/calcular-compras', { method: 'POST', body }))
await caso('Compras: 40 asistentes sin platos (límite inferior)', [200], async () => previo({ asistentes: 40, productos: [] }))
await caso('Compras: 600 asistentes sin platos (límite superior)', [200], async () => previo({ asistentes: 600, productos: [] }))
await caso('Compras: 39 asistentes', [400], async () => previo({ asistentes: 39, productos: [] }))
await caso('Compras: 601 asistentes', [400], async () => previo({ asistentes: 601, productos: [] }))
await caso('Compras: asistentes en notación científica (1e3)', [400], async () => previo({ asistentes: 1e3, productos: [] }))
await caso('Compras: cuerpo que no es un objeto (lista, texto, número, null)', [400], async () => {
  const r = await Promise.all([[], 'hola', 5, null].map(async (b) => (await call('/eventos/calcular-compras', { method: 'POST', body: b })).s))
  return { s: r.every((x) => x === 400) ? 400 : r.join('/'), nota: r.join('/') }
})
await caso('Compras: id de plato gigante (2^31) y con texto', [400], async () => {
  const r = await Promise.all([2147483648, 'abc', 1e21].map(async (id) => (await call('/eventos/calcular-compras', { method: 'POST', body: { asistentes: 100, productos: [id] } })).s))
  return { s: r.every((x) => x === 400) ? 400 : r.join('/'), nota: r.join('/') }
})
await caso('Compras: el detalle de un evento sin alimentos trae la lista vacía (no un error)', [0], async () => {
  const r = await call('/eventos', { method: 'POST', body: ev({ asistentes: 100 }) })
  const d = await call(`/eventos/${r.c.evento.id}`)
  return { s: d.c.compras_ingredientes.items.length }
})
await caso('Compras: un cliente no puede mandar sus propios ingredientes al crear el evento (compras_ingredientes se ignora)', [0], async () => {
  const r = await call('/eventos', { method: 'POST', body: ev({ asistentes: 100, compras_ingredientes: { items: [{ ingrediente: 'Falso', cantidad_a_comprar: 999 }] } }) })
  const d = await call(`/eventos/${r.c.evento.id}`)
  return { s: d.c.compras_ingredientes.items.length }
})

console.log('\n== Cócteles (HU-44 / HU-45): mililitros, ids y textos estrictos · antes daban 500 o aceptaban «50abc»')
const licorBar = (await call('/catalogo?clasificacion=bar_cocteleria')).c[0]
const alimentoCat = (await call('/catalogo?clasificacion=alimento')).c[0]
const crearCoctel = (o = {}, ing = {}) => call('/cocteles', { method: 'POST', body: { nombre: n('Cóctel ' + Math.random().toString(36).slice(2, 7)), ingredientes: [{ licor_id: licorBar.id, mililitros: 50, ...ing }], ...o } })
for (const [ml, esperado] of [[15000, 400], [251, 400], [250.01, 400], ['50abc', 400], ['50', 400], [0, 400], [-5, 400], [0.001, 400], [12.345, 400], [null, 400], [NaN, 400], [0.01, 201], [45.5, 201], [250, 201]]) {
  await caso(`Cóctel con ${JSON.stringify(ml)} ml`, [esperado], async () => m(await crearCoctel({}, { mililitros: ml })))
}
await caso('Cóctel con licor_id de texto, gigante o decimal', [400], async () => {
  const r = await Promise.all(['abc', 1e21, 1.5, '1', null, 0].map(async (id) => (await crearCoctel({}, { licor_id: id })).s))
  return { s: r.every((x) => x === 400) ? 400 : r.join('/'), nota: r.join('/') }
})
await caso('Cóctel con un alimento como licor', [400], async () => m(await crearCoctel({}, { licor_id: alimentoCat.id })))
await caso('Cóctel con nombre de 151 caracteres', [400], async () => m(await crearCoctel({ nombre: 'x'.repeat(151) })))
await caso('Cóctel con descripción que no es texto', [400], async () => m(await crearCoctel({ descripcion: { a: 1 } })))
await caso('Cóctel con ingredientes null o con un null dentro', [400], async () => {
  const r = await Promise.all([null, [null], [5], 'x'].map(async (ing) => (await call('/cocteles', { method: 'POST', body: { nombre: n('N'), ingredientes: ing } })).s))
  return { s: r.every((x) => x === 400) ? 400 : r.join('/'), nota: r.join('/') }
})
await caso('Cóctel con 7 licores', [400], async () => m(await call('/cocteles', { method: 'POST', body: { nombre: n('Siete'), ingredientes: Array.from({ length: 7 }, (_, i) => ({ licor_id: licorBar.id + i, mililitros: 10 })) } })))
await caso('Cóctel con el mismo licor dos veces', [400], async () => m(await call('/cocteles', { method: 'POST', body: { nombre: n('Doble'), ingredientes: [{ licor_id: licorBar.id, mililitros: 10 }, { licor_id: licorBar.id, mililitros: 20 }] } })))
for (const id of ['abc', '1e21', '99999999999', '-1']) {
  await caso(`Cóctel: GET con id «${id}»`, [400, 404], async () => m(await call('/cocteles/' + id)))
}
await caso('Cóctel: PUT y DELETE con id de texto', [400], async () => {
  const r = await Promise.all([call('/cocteles/abc', { method: 'PUT', body: { nombre: 'x', ingredientes: [{ licor_id: licorBar.id, mililitros: 50 }] } }), call('/cocteles/abc', { method: 'DELETE' })])
  return { s: r.every((x) => x.s === 400) ? 400 : r.map((x) => x.s).join('/') }
})
await caso('Cóctel: editar con 15000 ml o con un alimento como licor no cambia nada', [400], async () => {
  const c = (await crearCoctel({}, {})).c
  const r = await Promise.all([call('/cocteles/' + c.id, { method: 'PUT', body: { nombre: n('Ed'), ingredientes: [{ licor_id: licorBar.id, mililitros: 15000 }] } }), call('/cocteles/' + c.id, { method: 'PUT', body: { nombre: n('Ed'), ingredientes: [{ licor_id: alimentoCat.id, mililitros: 50 }] } })])
  const sigue = (await call('/cocteles/' + c.id)).c
  const intacto = sigue.ingredientes.length === 1 && Number(sigue.ingredientes[0].mililitros) === 50
  return { s: r.every((x) => x.s === 400) && intacto ? 400 : r.map((x) => x.s).join('/') + (intacto ? '' : ' receta cambiada'), nota: 'receta intacta: ' + intacto }
})
await caso('Cóctel: editar con el nombre de otro cóctel da 409 (no 500)', [409], async () => {
  const a = (await crearCoctel({ nombre: n('NombreA') })).c
  const b = (await crearCoctel({ nombre: n('NombreB') })).c
  return m(await call('/cocteles/' + b.id, { method: 'PUT', body: { nombre: a.nombre, ingredientes: [{ licor_id: licorBar.id, mililitros: 50 }] } }))
})
const coctelCalc = (await crearCoctel({ nombre: n('Para calcular') })).c
const calc = async (body) => m(await call('/cocteles/calcular', { method: 'POST', body }))
for (const [as, esperado] of [[39, 400], [601, 400], [40.9, 400], ['100', 400], ['100abc', 400], [null, 400], [1e3, 400], [40, 200], [600, 200]]) {
  await caso(`Calcular licor con ${JSON.stringify(as)} asistentes`, [esperado], async () => calc({ asistentes: as, cocteles: [{ coctel_id: coctelCalc.id, cocteles_por_persona: 2 }] }))
}
for (const [pp, esperado] of [[0, 400], [11, 400], [2.7, 400], ['2', 400], ['2abc', 400], [null, 400], [1, 200], [10, 200]]) {
  await caso(`Calcular licor con ${JSON.stringify(pp)} cócteles por persona`, [esperado], async () => calc({ asistentes: 100, cocteles: [{ coctel_id: coctelCalc.id, cocteles_por_persona: pp }] }))
}
await caso('Calcular licor con coctel_id de texto, gigante, inexistente, nulo o repetido', [400], async () => {
  const lista = [[{ coctel_id: 'abc', cocteles_por_persona: 2 }], [{ coctel_id: 1e21, cocteles_por_persona: 2 }], [{ coctel_id: 99999999, cocteles_por_persona: 2 }], [null],
    [{ coctel_id: coctelCalc.id, cocteles_por_persona: 2 }, { coctel_id: coctelCalc.id, cocteles_por_persona: 3 }]]
  const r = await Promise.all(lista.map(async (cocteles) => (await call('/cocteles/calcular', { method: 'POST', body: { asistentes: 100, cocteles } })).s))
  return { s: r.every((x) => x === 400) ? 400 : r.join('/'), nota: r.join('/') }
})
await caso('Calcular licor sin cócteles da lista vacía (200)', [200], async () => calc({ asistentes: 100, cocteles: [] }))

console.log('\n== Límites de ml, gramos y precio en catálogo y eventos (15.000 ml / 15.000 g)')
async function catalogoPost(o) { return m(await call('/catalogo', { method: 'POST', body: { nombre: n('Límite ' + Math.random().toString(36).slice(2, 7)), ...o } })) }
for (const [vol, esperado] of [[15000, 400], [5001, 400], [5000, 201]]) await caso(`Catálogo: botella de ${vol} ml`, [esperado], async () => catalogoPost({ clasificacion: 'bebida_general', tipo_calculo: 'botella_compartida', volumen_botella_ml: vol, tamano_porcion_ml: 100 }))
await caso('Catálogo: porción de 15000 ml', [400], async () => catalogoPost({ clasificacion: 'bebida_general', tipo_calculo: 'botella_compartida', volumen_botella_ml: 750, tamano_porcion_ml: 15000 }))
for (const [g, esperado] of [[15000, 400], [1001, 400], [1000, 201]]) await caso(`Catálogo: alimento de ${g} g por persona`, [esperado], async () => catalogoPost({ clasificacion: 'alimento', tipo_calculo: 'porcion_persona', porcion_por_persona: g }))
await caso('Catálogo: precio de 1e15', [400], async () => catalogoPost({ clasificacion: 'alimento', tipo_calculo: 'porcion_persona', porcion_por_persona: 100, precio_unitario: 1e15 }))
const eventoConItem = async (item) => m(await call('/eventos', { method: 'POST', body: ev({ productos: [item] }) }))
for (const [g, esperado] of [[15000, 400], [1001, 400], [0, 400], [0.5, 400], [1000, 201]]) await caso(`Evento: alimento de ${g} g por persona`, [esperado], async () => eventoConItem({ producto_id: alimentoCat.id, porcion_por_persona: g }))
await caso('Evento: valor unitario de 1e15 o de 100.000.001', [400], async () => {
  const r = await Promise.all([1e15, 100000001].map(async (precio) => (await call('/eventos', { method: 'POST', body: ev({ productos: [{ producto_id: alimentoCat.id, porcion_por_persona: 100, precio_unitario: precio }] }) })).s))
  return { s: r.every((x) => x === 400) ? 400 : r.join('/'), nota: r.join('/') }
})

console.log('\n== HU-26: registrar meseros (RF-33) · entradas raras')
const LETRAS_C = corrida.replace(/[0-9]/g, (d) => 'abcdefghij'[d])
const telC = () => '3' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0')
const mesero = async (body) => m(await call('/personal', { method: 'POST', body: { nombre_completo: `Límite Mesero ${LETRAS_C}`, contacto: telC(), ...body } }))
await caso('Mesero válido', [201], async () => mesero({}))
await caso('Mesero: cuerpo que no es un objeto (lista, texto, número, null)', [400], async () => {
  const r = await Promise.all([[], 'hola', 5, null].map(async (b) => (await call('/personal', { method: 'POST', body: b })).s))
  return { s: r.every((x) => x === 400) ? 400 : r.join('/'), nota: r.join('/') }
})
await caso('Mesero: nombre de 150 caracteres (límite exacto)', [201], async () => mesero({ nombre_completo: 'a'.repeat(150) }))
await caso('Mesero: nombre de 151 caracteres', [400], async () => mesero({ nombre_completo: 'a'.repeat(151) }))
await caso('Mesero: nombre con HTML, emoji, números o solo símbolos', [400], async () => {
  const r = await Promise.all(['<img src=x onerror=alert(1)>', 'Carlos 🍕', 'Carlos 123', '!!!', '1234567', '.', '-'].map(async (nombre_completo) => (await call('/personal', { method: 'POST', body: { nombre_completo, contacto: telC() } })).s))
  return { s: r.every((x) => x === 400) ? 400 : r.join('/'), nota: r.join('/') }
})
await caso('Mesero: nombre y contacto de tipo número, lista, objeto o booleano', [400], async () => {
  const raros = [5, [], {}, true]
  const r = await Promise.all(raros.flatMap((v) => [call('/personal', { method: 'POST', body: { nombre_completo: v, contacto: telC() } }), call('/personal', { method: 'POST', body: { nombre_completo: `Raro ${LETRAS_C}`, contacto: v } })].map(async (p) => (await p).s)))
  return { s: r.every((x) => x === 400) ? 400 : r.join('/'), nota: r.join('/') }
})
await caso('Mesero: inyección SQL en el nombre o el contacto no rompe nada', [400], async () => {
  const r = await Promise.all([call('/personal', { method: 'POST', body: { nombre_completo: "Robert'); DROP TABLE personal;--", contacto: telC() } }), call('/personal', { method: 'POST', body: { nombre_completo: `Sql ${LETRAS_C}`, contacto: "3001234567'; DROP TABLE personal;--" } })])
  const sigue = (await call('/personal')).s === 200
  return { s: r.every((x) => x.s === 400) && sigue ? 400 : r.map((x) => x.s).join('/') + (sigue ? '' : ' tabla rota') }
})
await caso('Mesero: contacto con 6 dígitos (no alcanza) y con 7 (límite exacto)', [400], async () => {
  const a = await call('/personal', { method: 'POST', body: { nombre_completo: `Siete ${LETRAS_C}`, contacto: '123456' } })
  const b = await call('/personal', { method: 'POST', body: { nombre_completo: `Siete ${LETRAS_C}`, contacto: String(Math.floor(1000000 + Math.random() * 8999999)) } })
  return { s: a.s === 400 && b.s === 201 ? 400 : `${a.s}/${b.s}`, nota: `6 dígitos ${a.s}, 7 dígitos ${b.s}` }
})
await caso('Mesero: el filtro ?rol= acepta mesero y WAITER, rechaza lo demás', [200], async () => {
  const r = await Promise.all(['mesero', 'WAITER'].map(async (x) => (await call('/personal?rol=' + x)).s))
  const malos = await Promise.all(['cocinero', 'x', '1'].map(async (x) => (await call('/personal?rol=' + x)).s))
  return { s: r.every((x) => x === 200) && malos.every((x) => x === 400) ? 200 : `${r}/${malos}`, nota: `${r} / ${malos}` }
})

console.log('\n== HU-27: eliminar meseros (RF-34) · entradas raras')
const delP = (id, extra = {}) => fetch(`${API}/personal/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${TOKEN_C}` }, ...extra })
const TOKEN_C = (await call('/auth/login', { method: 'POST', body: { usuario: USUARIO, password: clave } })).c.token
const nuevoM = async () => (await call('/personal', { method: 'POST', body: { nombre_completo: `Borrar Límite ${LETRAS_C}`, contacto: telC() } })).c
await caso('Eliminar un mesero válido (204)', [204], async () => ({ s: (await delP((await nuevoM()).id)).status }))
await caso('Eliminar con id de texto, 0, negativo, decimal, notación científica o gigante', [400], async () => {
  const r = await Promise.all(['abc', '0', '-1', '1.5', '1e21', '2147483648', '99999999999999999999', 'stf-001', '%20', '1;DROP'].map(async (id) => (await delP(id)).status))
  return { s: r.every((x) => x === 400) ? 400 : r.join('/'), nota: r.join('/') }
})
await caso('Eliminar el id más grande permitido que no existe (404, no 500)', [404], async () => ({ s: (await delP(2147483647)).status }))
await caso('Eliminar dos veces el mismo mesero: 204 y luego 404', [204], async () => {
  const m = await nuevoM(); const a = (await delP(m.id)).status; const b = (await delP(m.id)).status
  return { s: a === 204 && b === 404 ? 204 : `${a}/${b}`, nota: `${a}/${b}` }
})
await caso('Modificar un mesero con PUT, PATCH, POST o GET sobre /personal/:id da 405 (nunca 200 ni 500)', [405], async () => {
  const m = await nuevoM()
  const r = await Promise.all(['PUT', 'PATCH', 'POST', 'GET'].map(async (metodo) => (await fetch(`${API}/personal/${m.id}`, { method: metodo, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN_C}` }, body: metodo === 'GET' ? undefined : JSON.stringify({ nombre_completo: 'Cambiado', contacto: '3000000000' }) })).status))
  const intacto = (await call('/personal')).c.find((x) => x.id === m.id)?.nombre_completo === m.nombre_completo
  return { s: r.every((x) => x === 405) && intacto ? 405 : r.join('/') + (intacto ? '' : ' cambió'), nota: r.join('/') }
})
await caso('Eliminar con cuerpo en la petición lo ignora (204)', [204], async () => ({ s: (await delP((await nuevoM()).id, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN_C}` }, body: JSON.stringify({ activo: true, nombre_completo: 'x' }) })).status }))
await caso('Eliminar a un mesero no toca a los demás (el listado conserva a los otros)', [true], async () => {
  const a = await nuevoM(); const b = await nuevoM(); await delP(a.id)
  const lista = (await call('/personal')).c
  return { s: lista.some((x) => x.id === b.id) && !lista.some((x) => x.id === a.id) }
})

console.log('\n== HU-28: asignar meseros a un evento (RF-35) · entradas raras')
const evAsig = async () => (await call('/eventos', { method: 'POST', body: ev({ asistentes: 100 }) })).c.evento
const meseroAsig = async () => (await call('/personal', { method: 'POST', body: { nombre_completo: `Asignable Límite ${LETRAS_C}`, contacto: telC() } })).c
const put = (id, body, metodo = 'PUT') => call(`/eventos/${id}/meseros`, { method: metodo, body })
await caso('Asignar 2 meseros válidos y consultar', [2], async () => {
  const e = await evAsig(); const a = await meseroAsig(); const b = await meseroAsig()
  const r = await put(e.id, { personal_ids: [a.id, b.id] }); return { s: r.c?.total_asignados, nota: `estado ${r.s}` }
})
await caso('Asignar con un id de texto con inyección SQL, notación científica o un objeto', [400], async () => {
  const e = await evAsig()
  const r = await Promise.all([["1; DROP TABLE evento_personal;--"], [1e21], [{ id: 1 }], [[1]], ['']].map(async (ids) => (await put(e.id, { personal_ids: ids })).s))
  const sigue = (await call(`/eventos/${e.id}/meseros`)).s === 200
  return { s: r.every((x) => x === 400) && sigue ? 400 : r.join('/') + (sigue ? '' : ' tabla rota'), nota: r.join('/') }
})
await caso('Asignar 100 ids que no existen da 400 (no 500)', [400], async () => {
  const e = await evAsig(); return m(await put(e.id, { personal_ids: Array.from({ length: 100 }, (_, i) => 900000000 + i) }))
})
await caso('Asignar 101 ids da 400', [400], async () => { const e = await evAsig(); return m(await put(e.id, { personal_ids: Array.from({ length: 101 }, (_, i) => i + 1) })) })
await caso('Id del evento: el más grande permitido que no existe (404) y uno fuera de rango (400)', [404], async () => {
  const a = (await put(2147483647, { personal_ids: [] })).s; const b = (await put(2147483648, { personal_ids: [] })).s
  return { s: a === 404 && b === 400 ? 404 : `${a}/${b}`, nota: `${a}/${b}` }
})
await caso('Campos de más en el cuerpo (evento_id, total_asignados) se ignoran', [1], async () => {
  const e = await evAsig(); const a = await meseroAsig()
  const r = await put(e.id, { personal_ids: [a.id], evento_id: 999999, total_asignados: 50, meseros_requeridos: 0 })
  return { s: r.c?.total_asignados, nota: `estado ${r.s}, evento ${r.c?.evento_id === e.id}` }
})
await caso('Cuerpo que no es un objeto o con personal_ids de otro tipo', [400], async () => {
  const e = await evAsig()
  const r = await Promise.all([[], 'hola', 5, null, { personal_ids: 'x' }, { personal_ids: {} }, { personal_ids: null }].map(async (b) => (await call(`/eventos/${e.id}/meseros`, { method: 'PUT', body: b })).s))
  return { s: r.every((x) => x === 400) ? 400 : r.join('/'), nota: r.join('/') }
})
await caso('Asignar, vaciar y volver a asignar deja la lista final correcta', [1], async () => {
  const e = await evAsig(); const a = await meseroAsig()
  await put(e.id, { personal_ids: [a.id] }); await put(e.id, { personal_ids: [] }); const r = await put(e.id, { personal_ids: [a.id] })
  return { s: r.c?.total_asignados }
})

console.log('\n== HU-28: hora de inicio, tope de meseros y cruces de horario')
const evH = async (hora, extra = {}) => (await call('/eventos', { method: 'POST', body: ev({ ...(hora !== undefined ? { hora_inicio: hora } : {}), ...extra }) }))
for (const [hora, esperado] of [['00:00', 201], ['23:59', 201], ['09:05', 201], ['24:00', 400], ['25:61', 400], ['18:60', 400], ['6:00', 400], ['18', 400], ['18:00:00', 400], ['', 400], [1800, 400], [null, 201], [true, 400], [[], 400], [{}, 400]]) {
  await caso(`Evento con hora_inicio ${JSON.stringify(hora)}`, [esperado], async () => m(await evH(hora)))
}
await caso('Tope: 6 meseros en un evento de 100 asistentes (5 requeridos) da 400; 5 sí', [400], async () => {
  const e = (await evH('10:00')).c.evento; const ms = []; for (let i = 0; i < 6; i++) ms.push((await call('/personal', { method: 'POST', body: { nombre_completo: `Tope Límite ${LETRAS_C}`, contacto: telC() } })).c)
  const seis = await put(e.id, { personal_ids: ms.map((x) => x.id) }); const cinco = await put(e.id, { personal_ids: ms.slice(0, 5).map((x) => x.id) })
  return { s: seis.s === 400 && cinco.s === 200 ? 400 : `${seis.s}/${cinco.s}`, nota: `6 → ${seis.s}, 5 → ${cinco.s}` }
})
await caso('Cruce: asignar al mismo mesero a un evento del mismo día que se cruza da 409; si termina justo cuando empieza el otro, 200', [409], async () => {
  const dia = (await evH('18:00')).c.evento.fecha_evento.slice(0, 10)
  const e1 = (await evH('18:00', { fecha_evento: dia, duracion_horas: 4 })).c, e2 = (await evH('20:00', { fecha_evento: dia, duracion_horas: 3 })).c, e3 = (await evH('22:00', { fecha_evento: dia, duracion_horas: 3 })).c
  if (!e1.evento || !e2.evento) return { s: 'SIN EVENTOS', nota: `${e1.error} / ${e2.error}` }
  const mes = (await call('/personal', { method: 'POST', body: { nombre_completo: `Cruce Límite ${LETRAS_C}`, contacto: telC() } })).c
  const a = await put(e1.evento.id, { personal_ids: [mes.id] }); const b = await put(e2.evento.id, { personal_ids: [mes.id] })
  const c = e3.evento ? await put(e3.evento.id, { personal_ids: [mes.id] }) : { s: 'sin tercer evento (tope de 3 por día)' }
  return { s: a.s === 200 && b.s === 409 && (c.s === 200 || typeof c.s === 'string') ? 409 : `${a.s}/${b.s}/${c.s}`, nota: `18–22: ${a.s}, 20–23: ${b.s}, 22–01: ${c.s}` }
})
await caso('Candidatos: GET /eventos/:id/meseros/disponibles con id inválido, inexistente y válido', [200], async () => {
  const e = (await evH('10:00')).c.evento; const a = (await call('/eventos/abc/meseros/disponibles')).s; const b = (await call('/eventos/2147483647/meseros/disponibles')).s; const c = await call(`/eventos/${e.id}/meseros/disponibles`)
  return { s: a === 400 && b === 404 && c.s === 200 && Array.isArray(c.c.meseros) ? 200 : `${a}/${b}/${c.s}`, nota: `${a}/${b}/${c.s}` }
})

console.log('\n== HU-29: estado de la asignación (RF-36)')
const estadoDe = (eId, pId, body) => call(`/eventos/${eId}/meseros/${pId}/estado`, { method: 'PATCH', body })
const mesN = async (n) => { const r = []; for (let i = 0; i < n; i++) r.push((await call('/personal', { method: 'POST', body: { nombre_completo: `Estado Límite ${LETRAS_C}`, contacto: telC() } })).c); return r }
await caso('Toda asignación nueva nace «por_confirmar»', ['por_confirmar'], async () => {
  const e = await evAsig(); const [a] = await mesN(1); const r = await put(e.id, { personal_ids: [a.id] })
  return { s: r.c?.meseros_asignados?.[0]?.estado }
})
await caso('Cambiar a cada uno de los tres estados (en español, PENDING/CONFIRMED/UNAVAILABLE y con status) da 200', [200], async () => {
  const e = await evAsig(); const [a] = await mesN(1); await put(e.id, { personal_ids: [a.id] })
  const r = []; for (const b of [{ estado: 'confirmado' }, { estado: 'no_puede' }, { estado: 'por_confirmar' }, { status: 'CONFIRMED' }, { status: 'UNAVAILABLE' }, { status: 'PENDING' }, { estado: ' No puede ' }]) r.push((await estadoDe(e.id, a.id, b)).s)
  return { s: r.every((x) => x === 200) ? 200 : r.join('/'), nota: r.join('/') }
})
await caso('Estados raros (vacío, número, lista, objeto, inyección SQL, nulos) dan 400 y no cambian nada', [400], async () => {
  const e = await evAsig(); const [a] = await mesN(1); await put(e.id, { personal_ids: [a.id] })
  const r = []; for (const b of [{}, { estado: '' }, { estado: 7 }, { estado: [] }, { estado: {} }, { estado: null }, { estado: "x'; DROP TABLE evento_personal;--" }, { estado: 'cancelado' }, [], 'hola', null]) r.push((await estadoDe(e.id, a.id, b)).s)
  const intacto = (await call(`/eventos/${e.id}/meseros`)).c?.meseros_asignados?.[0]?.estado === 'por_confirmar'
  return { s: r.every((x) => x === 400) && intacto ? 400 : r.join('/') + (intacto ? '' : ' cambió'), nota: r.join('/') }
})
await caso('Mesero no asignado a ese evento o evento inexistente da 404; ids inválidos dan 400', [404], async () => {
  const e = await evAsig(); const [a] = await mesN(1)
  const noAsig = (await estadoDe(e.id, a.id, { estado: 'confirmado' })).s; const sinEvento = (await estadoDe(2147483647, a.id, { estado: 'confirmado' })).s
  const malos = [(await call(`/eventos/abc/meseros/${a.id}/estado`, { method: 'PATCH', body: { estado: 'confirmado' } })).s, (await call(`/eventos/${e.id}/meseros/abc/estado`, { method: 'PATCH', body: { estado: 'confirmado' } })).s, (await call(`/eventos/${e.id}/meseros/0/estado`, { method: 'PATCH', body: { estado: 'confirmado' } })).s]
  return { s: noAsig === 404 && sinEvento === 404 && malos.every((x) => x === 400) ? 404 : `${noAsig}/${sinEvento}/${malos.join(',')}`, nota: `${noAsig}/${sinEvento}/${malos.join(',')}` }
})
await caso('Pasar al mismo estado dos veces es idempotente (200 y 200)', [200], async () => {
  const e = await evAsig(); const [a] = await mesN(1); await put(e.id, { personal_ids: [a.id] })
  const x = (await estadoDe(e.id, a.id, { estado: 'confirmado' })).s; const y = (await estadoDe(e.id, a.id, { estado: 'confirmado' })).s
  return { s: x === 200 && y === 200 ? 200 : `${x}/${y}` }
})
await caso('Escenario HU-29: 5 requeridos, 5 asignados y uno «no puede» → HU-25 muestra 4 asignados y diferencia -1', [-1], async () => {
  const e = await evAsig(); const ms = await mesN(5); await put(e.id, { personal_ids: ms.map((x) => x.id) })
  const r = await estadoDe(e.id, ms[0].id, { estado: 'UNAVAILABLE' })
  const d = (await call(`/eventos/${e.id}/desviaciones-personal`)).c?.roles_breakdown?.find((x) => x.rol === 'mesero')
  const ok = r.c?.assignment_status === 'UNAVAILABLE' && r.c?.event_id === e.id && r.c?.staff_id === ms[0].id && d?.assigned_count === 4
  return { s: ok ? d.difference : `resp ${JSON.stringify(r.c?.assignment_status)} / asignados ${d?.assigned_count}`, nota: `asignados HU-25: ${d?.assigned_count}` }
})
await caso('Sincronizar la lista conserva el estado de los que ya estaban, agrega los nuevos «por_confirmar» y quita solo los que salen', [true], async () => {
  const e = await evAsig(); const [a, b, c] = await mesN(3); await put(e.id, { personal_ids: [a.id, b.id] })
  await estadoDe(e.id, a.id, { estado: 'confirmado' }); await estadoDe(e.id, b.id, { estado: 'no_puede' })
  const r = (await put(e.id, { personal_ids: [a.id, b.id, c.id] })).c.meseros_asignados
  const es = (id) => r.find((x) => x.id === id)?.estado
  const r2 = (await put(e.id, { personal_ids: [a.id, c.id] })).c.meseros_asignados
  return { s: es(a.id) === 'confirmado' && es(b.id) === 'no_puede' && es(c.id) === 'por_confirmar' && r2.length === 2 && !r2.some((x) => x.id === b.id), nota: r.map((x) => x.estado).join(',') }
})
await caso('Quien «no puede» libera un lugar: con 5 requeridos y uno «no puede», se pueden sumar un sexto; volver a contar al primero con el cupo lleno da 400', [400], async () => {
  const e = await evAsig(); const ms = await mesN(6); await put(e.id, { personal_ids: ms.slice(0, 5).map((x) => x.id) })
  await estadoDe(e.id, ms[0].id, { estado: 'no_puede' })
  const seis = await put(e.id, { personal_ids: ms.map((x) => x.id) })
  const vuelve = await estadoDe(e.id, ms[0].id, { estado: 'confirmado' })
  return { s: seis.s === 200 && seis.c?.total_utiles === 5 && vuelve.s === 400 ? 400 : `${seis.s}/${vuelve.s}`, nota: `seis ${seis.s}, vuelve ${vuelve.s}` }
})
await caso('Un mesero «no puede» en un evento no bloquea ese horario en otro evento que se cruza; al volver a contar sí da 409', [409], async () => {
  const dia = (await evH('18:00')).c.evento.fecha_evento.slice(0, 10)
  const e1 = (await evH('18:00', { fecha_evento: dia, duracion_horas: 4 })).c, e2 = (await evH('19:00', { fecha_evento: dia, duracion_horas: 3 })).c
  if (!e1.evento || !e2.evento) return { s: 'SIN EVENTOS', nota: `${e1.error} / ${e2.error}` }
  const [a] = await mesN(1)
  await put(e1.evento.id, { personal_ids: [a.id] }); await estadoDe(e1.evento.id, a.id, { estado: 'no_puede' })
  const libre = await put(e2.evento.id, { personal_ids: [a.id] })
  const vuelve = await estadoDe(e1.evento.id, a.id, { estado: 'por_confirmar' })
  return { s: libre.s === 200 && vuelve.s === 409 ? 409 : `${libre.s}/${vuelve.s}`, nota: `otro evento ${libre.s}, volver a contar ${vuelve.s}` }
})
await caso('Eliminar a un mesero (HU-27) lo saca del conteo del evento, tenga el estado que tenga', [0], async () => {
  const e = await evAsig(); const [a] = await mesN(1); await put(e.id, { personal_ids: [a.id] }); await estadoDe(e.id, a.id, { estado: 'confirmado' })
  await call(`/personal/${a.id}`, { method: 'DELETE' })
  return { s: (await call(`/eventos/${e.id}/meseros`)).c?.total_utiles }
})

console.log('\n== HU-30: lista de meseros programados (RF-37 / RF-38)')
const lista30 = (eId) => call(`/eventos/${eId}/staff/waiters`)
await caso('Evento sin meseros: 200, total_assigned 0 y staff_checklist []', [0], async () => {
  const e = await evAsig(); const r = await lista30(e.id)
  return { s: r.s === 200 && Array.isArray(r.c?.staff_checklist) && r.c.staff_checklist.length === 0 ? r.c.total_assigned : `${r.s}`, nota: `estado ${r.s}` }
})
await caso('Ids del evento raros: inexistente 404; texto, 0, negativo, decimal, inyección SQL y fuera de rango 400', [404], async () => {
  const a = (await lista30(2147483647)).s; const b = await Promise.all(['abc', '0', '-1', '1.5', "1;DROP TABLE evento_personal;--", '2147483648'].map(async (x) => (await lista30(encodeURIComponent(x))).s))
  const sigue = (await call('/personal')).s === 200
  return { s: a === 404 && b.every((x) => x === 400) && sigue ? 404 : `${a}/${b.join(',')}`, nota: `${a}/${b.join(',')}` }
})
await caso('El checklist devuelve cada mesero con staff_id, full_name, contact_info y assignment_status (PENDING, CONFIRMED, UNAVAILABLE)', [true], async () => {
  const e = await evAsig(); const ms = await mesN(3); await put(e.id, { personal_ids: ms.map((x) => x.id) })
  await estadoDe(e.id, ms[0].id, { estado: 'confirmado' }); await estadoDe(e.id, ms[1].id, { estado: 'no_puede' })
  const l = (await lista30(e.id)).c?.staff_checklist ?? []
  const de = (id) => l.find((x) => x.staff_id === id)
  return { s: l.length === 3 && de(ms[0].id)?.assignment_status === 'CONFIRMED' && de(ms[1].id)?.assignment_status === 'UNAVAILABLE' && de(ms[2].id)?.assignment_status === 'PENDING' && de(ms[2].id)?.full_name === ms[2].nombre_completo && de(ms[2].id)?.contact_info === ms[2].contacto, nota: l.map((x) => x.assignment_status).join(',') }
})
await caso('Sin historial (RF-38): quitar y volver a asignar a un mesero lo deja como «por confirmar» (no recuerda el estado anterior)', ['PENDING'], async () => {
  const e = await evAsig(); const [a] = await mesN(1)
  await put(e.id, { personal_ids: [a.id] }); await estadoDe(e.id, a.id, { estado: 'confirmado' }); await put(e.id, { personal_ids: [] })
  const vacia = (await lista30(e.id)).c?.total_assigned; await put(e.id, { personal_ids: [a.id] })
  const de = (await lista30(e.id)).c?.staff_checklist?.[0]?.assignment_status
  return { s: vacia === 0 ? de : `lista tras quitar: ${vacia}` }
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
