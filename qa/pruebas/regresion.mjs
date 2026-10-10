/**
 * Pruebas de regresión de SIGEV: recorren los checklists de todas las historias contra la
 * interfaz (Playwright) y la API. Se ejecutan contra un entorno de QA, nunca contra producción.
 *
 * Configuración por variables de entorno (ver qa/README.md):
 *   QA_FRONT_URL  dirección del frontend       (por defecto http://localhost:5175)
 *   QA_API_URL    dirección de la API con /api (por defecto http://localhost:3011/api)
 *   QA_USUARIO    usuario de QA                (por defecto qa)
 *   QA_PASSWORD   contraseña del usuario de QA (obligatoria)
 *
 * Cada corrida usa un identificador propio en los nombres de lo que crea, así que se puede
 * repetir sin chocar con datos de corridas anteriores. Al terminar sale con código 1 si algo falla.
 */
import { chromium } from 'playwright'
import jwt from 'jsonwebtoken'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const URL = (process.env.QA_FRONT_URL || 'http://localhost:5175').replace(/\/$/, '')
const API = (process.env.QA_API_URL || 'http://localhost:3011/api').replace(/\/$/, '')
const USUARIO = process.env.QA_USUARIO || 'qa'
const clave = process.env.QA_PASSWORD
let TOKEN = null

if (!clave) {
  console.error('Falta QA_PASSWORD (la contraseña del usuario de QA).')
  process.exit(2)
}

// Seguro: estas pruebas crean y modifican datos. Solo se permiten en local o en un entorno cuyo
// nombre incluya «qa». Para forzarlo (no recomendado) hay que definir QA_FORZAR=si.
const host = new globalThis.URL(API).hostname
const esEntornoDePruebas = /^(localhost|127\.0\.0\.1)$/.test(host) || /(^|[-.])qa([-.]|$)/.test(host)
if (!esEntornoDePruebas && process.env.QA_FORZAR !== 'si') {
  console.error(`No se ejecutan: la API (${host}) no parece un entorno de pruebas. Define QA_FORZAR=si solo si estás seguro.`)
  process.exit(2)
}
console.log(`QA contra: frontend ${URL} · API ${API} · usuario ${USUARIO}`)

const R = []
const erroresConsola = []
let grupo = ''

const t = async (nombre, fn) => {
  try {
    const detalle = await fn()
    R.push({ grupo, nombre, ok: true, detalle: detalle ?? '' })
    console.log(`✓ [${grupo}] ${nombre}${detalle ? ' — ' + detalle : ''}`)
  } catch (e) {
    const msg = String(e.message || e).split('\n')[0].slice(0, 220)
    R.push({ grupo, nombre, ok: false, detalle: msg })
    console.log(`✗ [${grupo}] ${nombre} — ${msg}`)
  }
}
const igual = (a, b, m = '') => { if (a !== b) throw new Error(`${m} esperaba «${b}» y fue «${a}»`) }
const cierto = (c, m) => { if (!c) throw new Error(m) }
const api = async (ruta, op = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}), ...(op.headers || {}) }
  const r = await fetch(`${API}${ruta}`, { ...op, headers, body: op.body ? JSON.stringify(op.body) : undefined })
  let cuerpo = null
  try { cuerpo = await r.json() } catch { /* sin cuerpo */ }
  return { estado: r.status, cuerpo }
}

const navegador = await chromium.launch()
const ctx = await navegador.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
page.setDefaultTimeout(9000)
page.on('pageerror', (e) => erroresConsola.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erroresConsola.push('console: ' + m.text().slice(0, 160)) })

const entrar = async (p, usuario = USUARIO, pw = clave) => {
  await p.goto(`${URL}/login`)
  await p.fill('input[type=text]', usuario)
  await p.fill('input[type=password]', pw)
  await p.keyboard.press('Enter')
}
const optVal = async (p, sel, texto) => p.locator(`${sel} option`).filter({ hasText: new RegExp(`^${texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$|\\()`) }).first().getAttribute('value')
const nuevoEvento = async (nombre, asistentes, tipo = 'Boda') => {
  await page.goto(`${URL}/eventos/nuevo`)
  await page.fill('input[placeholder="Ej. Boda Martínez & Gómez"]', nombre)
  await page.selectOption('select', tipo)
  await page.fill('input[type=date]', '2026-12-27')
  await page.fill('input[placeholder="Ej. 6"]', '5')
  await page.getByLabel('Número de asistentes').fill(String(asistentes))
}
const aRequerimientos = async () => {
  await page.getByRole('button', { name: /Siguiente: Requerimientos/ }).click()
  await page.getByRole('tab', { name: /Alimentos/ }).waitFor()
}
const pestana = async (n) => page.getByRole('tab', { name: new RegExp(n) }).click()
const guardarEvento = async () => {
  await page.getByRole('button', { name: /Siguiente: Resumen/ }).click()
  await page.getByRole('button', { name: 'Guardar evento' }).click()
  await page.waitForURL('**/eventos?evento=*')
  return Number(new globalThis.URL(page.url()).searchParams.get('evento'))
}
const agregarBebida = async (nombre, { precio } = {}) => {
  const v = await optVal(page, '#bebida-producto', nombre)
  await page.selectOption('#bebida-producto', v)
  if (precio !== undefined) await page.fill('#bebida-precio', String(precio))
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
}
const filaTabla = (texto) => page.locator('li', { hasText: texto }).filter({ has: page.locator('button[aria-label^="Registrar adquisición de"]') })
// Identificador de esta corrida: hace únicos los nombres para poder repetir las pruebas
const corrida = Date.now().toString(36).slice(-5)
const sufijo = ` (QA-${corrida})`

// ============ A. ACCESO ============
grupo = 'Acceso'
await t('Login con contraseña incorrecta muestra error y no entra', async () => {
  await entrar(page, USUARIO, 'incorrecta-123')
  await page.waitForSelector('[role=alert]')
  cierto(page.url().includes('/login'), 'salió del login')
})
await t('Login correcto lleva a Eventos', async () => {
  await entrar(page)
  await page.waitForURL('**/eventos**')
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: USUARIO, password: clave }) })
  TOKEN = (await r.json()).token
  cierto(TOKEN, 'sin token del login')
})
await t('API protegida: sin token las rutas privadas responden 401', async () => {
  const guardado = TOKEN; TOKEN = null
  for (const r of ['/eventos', '/eventos/1', '/catalogo', '/inventario', '/inventario/movimientos', '/configuracion']) {
    igual((await api(r)).estado, 401, r + ':')
  }
  igual((await api('/inventario', { method: 'POST', body: { nombre: 'x', categoria_inventario: 'Mobiliario', cantidad_propia: 1 } })).estado, 401, 'POST:')
  igual((await api('/health')).estado, 200, '/health público:')
  TOKEN = guardado
})
await t('API protegida: token inválido, vencido o de otra clave responden 401', async () => {
  const otra = jwt.sign({ id: 1, usuario: 'x', rol: 'admin' }, 'otra-clave', { expiresIn: '8h' })
  const vencido = jwt.sign({ id: 1 }, process.env.JWT_SECRET_QA || 'x', { expiresIn: -10 })
  for (const tk of ['abc.def.ghi', otra, vencido]) {
    igual((await api('/eventos', { headers: { Authorization: `Bearer ${tk}` } })).estado, 401, 'token:')
  }
})
await t('Una sesión que el servidor rechaza cierra la sesión y lleva al login', async () => {
  const c2 = await navegador.newContext(); const p2 = await c2.newPage()
  p2.setDefaultTimeout(9000)
  const falso = jwt.sign({ id: 1, usuario: 'qa', rol: 'admin' }, 'otra-clave', { expiresIn: '8h' })
  await p2.goto(`${URL}/login`)
  await p2.evaluate(([t, u]) => localStorage.setItem('sigev-sesion', JSON.stringify({ token: t, usuario: { id: 1, usuario: u, nombre_completo: 'QA', rol: 'admin' } })), [falso, USUARIO])
  await p2.goto(`${URL}/inventario`)
  await p2.waitForURL('**/login**')
  const guardada = await p2.evaluate(() => localStorage.getItem('sigev-sesion'))
  cierto(guardada === null, 'la sesión rechazada no se borró')
  await c2.close()
})
await t('Sin sesión, una página privada redirige al login', async () => {
  const c2 = await navegador.newContext(); const p2 = await c2.newPage()
  await p2.goto(`${URL}/inventario`); await p2.waitForURL('**/login**'); await c2.close()
})
await t('No existe registro público de usuarios', async () => {
  const c2 = await navegador.newContext(); const p2 = await c2.newPage()
  await p2.goto(`${URL}/login`)
  const txt = (await p2.locator('body').innerText()).toLowerCase()
  cierto(!/regístrate|registrarse|crear cuenta|crea tu cuenta/.test(txt), 'hay opción de registro')
  await c2.close()
})

// ============ B. HU-01 / HU-07 datos y asistentes ============
grupo = 'HU-01/07 Datos y asistentes'
await t('Campos vacíos: no deja avanzar y muestra errores', async () => {
  await page.goto(`${URL}/eventos/nuevo`)
  await page.getByRole('button', { name: /Siguiente: Requerimientos/ }).click()
  await page.waitForSelector('text=Escribe el nombre del evento')
  cierto(await page.getByText('Datos del evento').first().isVisible(), 'avanzó')
})
for (const [n, texto] of [[39, 'El mínimo es 40'], [601, 'El máximo es 600']]) {
  await t(`${n} asistentes se rechaza («${texto}»)`, async () => {
    await nuevoEvento('Rango' + sufijo, n)
    await page.waitForSelector(`text=${texto}`)
    igual(await page.getByRole('button', { name: /Siguiente: Requerimientos/ }).isDisabled(), true, 'botón deshabilitado:')
    cierto(!(await page.getByRole('tab', { name: /Alimentos/ }).count()), 'avanzó con asistentes fuera de rango')
  })
}
for (const n of [40, 600]) {
  await t(`${n} asistentes es válido y avanza`, async () => {
    await nuevoEvento('Rango' + sufijo, n)
    await aRequerimientos()
  })
}
await t('Modalidad buffet: 300 no es buffet y 301 sí', async () => {
  const ids = {}
  for (const n of [300, 301]) {
    await nuevoEvento(`Buffet ${n}` + sufijo, n); await aRequerimientos(); ids[n] = await guardarEvento()
  }
  const lista = (await api('/eventos')).cuerpo
  igual(lista.find((e) => e.id === ids[300]).es_modalidad_buffet, false, '300:')
  igual(lista.find((e) => e.id === ids[301]).es_modalidad_buffet, true, '301:')
})

// ============ C. HU-02 alimentos ============
grupo = 'HU-02 Alimentos'
let idAlimentos
await t('Alimento del catálogo con porción editable, componentes y cálculo con 10 %', async () => {
  await nuevoEvento('Alimentos' + sufijo, 100); await aRequerimientos()
  await page.waitForSelector('#alimento-producto option[value]', { state: 'attached' })
  const v = await optVal(page, '#alimento-producto', 'Medallones de Lomo de Res')
  await page.selectOption('#alimento-producto', v)
  igual(await page.locator('#alimento-porcion').inputValue(), '200', 'porción:')
  await page.fill('#alimento-componentes', 'Salsa de vino tinto, puré rústico')
  await page.waitForSelector('text=/22 kg/')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.waitForSelector('text=Medallones de Lomo de Res')
  idAlimentos = await guardarEvento()
  const d = (await api(`/eventos/${idAlimentos}`)).cuerpo
  const p = d.productos_calculados[0]
  igual(Number(p.cantidad_con_margen), 22, 'con margen:')
  igual(Number(p.costo_estimado), 990000, 'costo:')
  igual(p.componentes_menu, 'Salsa de vino tinto, puré rústico', 'componentes:')
  return '100 asist × 200 g = 20 kg → 22 kg · $990.000'
})
await t('Un alimento no se puede agregar dos veces', async () => {
  await nuevoEvento('Alimentos2' + sufijo, 100); await aRequerimientos()
  await page.waitForSelector('#alimento-producto option[value]', { state: 'attached' })
  const v = await optVal(page, '#alimento-producto', 'Ensalada César')
  await page.selectOption('#alimento-producto', v)
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  const quedan = await page.locator('#alimento-producto option').allInnerTexts()
  cierto(!quedan.some((x) => x.startsWith('Ensalada César')), 'sigue ofreciéndose')
})

// ============ D. HU-03 / QA-04 / HU-13 bebidas ============
grupo = 'HU-03 / QA-04 / HU-13 Bebidas'
const SEIS = ['Poker', 'Club Colombia', 'Águila', 'Águila Light', 'Costeña', 'Sol']
await nuevoEvento('Bebidas' + sufijo, 200); await aRequerimientos(); await pestana('Bebidas')
await page.waitForSelector('#bebida-producto option[value]', { state: 'attached' })
await t('QA-04: las seis individuales aparecen', async () => {
  const ops = await page.locator('#bebida-producto option').allInnerTexts()
  for (const n of SEIS) cierto(ops.includes(n), `falta ${n}`)
})
await t('QA-04: cada una viene con 2 unidades por persona y es editable', async () => {
  for (const n of SEIS) {
    await page.selectOption('#bebida-producto', await optVal(page, '#bebida-producto', n))
    igual(await page.locator('#bebida-unidades').inputValue(), '2', n + ':')
  }
  await page.fill('#bebida-unidades', '3'); igual(await page.locator('#bebida-unidades').inputValue(), '3')
  await page.fill('#bebida-unidades', '2')
})
await t('QA-04: el valor unitario llega vacío en las seis', async () => {
  for (const n of SEIS) {
    await page.selectOption('#bebida-producto', await optVal(page, '#bebida-producto', n))
    igual(await page.locator('#bebida-precio').inputValue(), '', n + ':')
  }
})
await t('QA-04: 200 asistentes → 440 unidades de una individual', async () => {
  await page.selectOption('#bebida-producto', await optVal(page, '#bebida-producto', 'Poker'))
  await page.waitForSelector('text=440 unidades con margen')
})
await t('HU-13: el grupo «Bebidas generales» no mezcla licores de coctelería', async () => {
  const ind = await page.locator('#bebida-producto option').allInnerTexts()
  cierto(!ind.some((x) => /Aguardiente|^Ron |Whisky|Vodka|Ginebra|Tequila/.test(x)), 'hay licores en generales')
  await page.getByRole('button', { name: 'Compartida por botella' }).click()
  const comp = await page.locator('#bebida-producto option').allInnerTexts()
  cierto(!comp.some((x) => /Aguardiente|^Ron |Whisky|Vodka|Ginebra|Tequila/.test(x)), 'hay licores en generales (botella)')
})
await t('QA-04: vinos y champaña como compartidas 750 ml / 125 ml', async () => {
  const comp = await page.locator('#bebida-producto option').allInnerTexts()
  for (const n of ['Vino tinto', 'Vino blanco', 'Vino rosado', 'Champaña']) {
    cierto(comp.includes(n), `falta ${n}`)
    await page.selectOption('#bebida-producto', await optVal(page, '#bebida-producto', n))
    cierto((await page.getByText('750 ml / 125 ml').count()) > 0, `${n} no es 750/125`)
    igual(await page.locator('#bebida-precio').inputValue(), '', n + ' precio:')
  }
})
await t('QA-04: 200 asistentes → 37 botellas de vino', async () => {
  await page.selectOption('#bebida-producto', await optVal(page, '#bebida-producto', 'Vino tinto'))
  await page.waitForSelector('text=37 botellas con margen')
})
await t('QA-04: valor escrito en el evento calcula el costo y se guarda', async () => {
  await page.fill('#bebida-precio', '40000')
  await page.waitForSelector('text=37 botellas con margen · $1.480.000')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: 'Compartida por botella' }).waitFor()
  await page.getByRole('button', { name: 'Individual por persona' }).click()
  await agregarBebida('Poker')                      // sin valor
  await agregarBebida('Águila', { precio: 3500 })   // con valor
  cierto(await page.getByText('Sin valor').first().isVisible(), 'no muestra «Sin valor»')
  const id = await guardarEvento()
  const d = (await api(`/eventos/${id}`)).cuerpo
  const porNombre = Object.fromEntries(d.productos_calculados.map((p) => [p.nombre, p]))
  igual(Number(porNombre['Vino tinto'].cantidad_con_margen), 37, 'vino:')
  igual(Number(porNombre['Vino tinto'].costo_estimado), 1480000, 'costo vino:')
  igual(Number(porNombre['Poker'].cantidad_con_margen), 440, 'poker:')
  igual(Number(porNombre['Poker'].costo_estimado), 0, 'poker costo:')
  igual(Number(porNombre['Águila'].costo_estimado), 1540000, 'águila:')
})
await t('HU-13: bar de coctelería lista solo licores y acompañantes (sin cervezas)', async () => {
  await nuevoEvento('Bar' + sufijo, 200); await aRequerimientos(); await pestana('Bebidas')
  await page.getByRole('button', { name: /^Bar de coctelería/ }).click()
  await page.getByRole('button', { name: 'Compartida por botella' }).click()
  const ops = await page.locator('#bebida-producto option').allInnerTexts()
  cierto(ops.includes('Aguardiente Blanco del Valle'), 'falta Blanco del Valle')
  cierto(!ops.some((x) => /^(Poker|Águila|Club Colombia|Vino |Champaña)/.test(x)), 'hay bebidas generales en el bar')
})
await t('HU-13: Aguardiente Blanco del Valle con 200 asistentes → 15 botellas (15 porciones de 50 ml)', async () => {
  await page.selectOption('#bebida-producto', await optVal(page, '#bebida-producto', 'Aguardiente Blanco del Valle'))
  await page.waitForSelector('text=15 botellas con margen')
})
await t('HU-13: subtotales y resumen separan generales de coctelería', async () => {
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: /^Bebidas generales/ }).click()
  await page.getByRole('button', { name: 'Compartida por botella' }).click()
  await agregarBebida('Vino tinto', { precio: 40000 })
  const resumen = await page.locator('main').innerText()
  cierto(/Bebidas generales\s*\n?\s*1 producto/.test(resumen) && /Bar de coctelería\s*\n?\s*1 producto/.test(resumen), 'no separa los conteos')
  const id = await guardarEvento()
  const sec = await page.locator('section[aria-label="Bar de coctelería"]').innerText()
  cierto(sec.includes('Aguardiente Blanco del Valle'), 'el detalle no muestra el bar')
  return `evento ${id}`
})

// ============ E. HU-04 / HU-12 mobiliario y alquiler ============
grupo = 'HU-04 / HU-12 Mobiliario y alquiler'
const sillaP = (await api('/inventario', { method: 'POST', body: { nombre: 'Silla propia' + sufijo, categoria_inventario: 'Mobiliario', cantidad_propia: 100 } })).cuerpo
const sillaA = (await api('/inventario', { method: 'POST', body: { nombre: 'Silla alquilada' + sufijo, categoria_inventario: 'Mobiliario', cantidad_propia: 50, es_propio: false } })).cuerpo
let idMob
await t('El selector ofrece el inventario de mobiliario y marca el alquilado', async () => {
  await nuevoEvento('Mobiliario' + sufijo, 250); await aRequerimientos(); await pestana('Mobiliario')
  await page.waitForFunction(() => {
    const sel = document.querySelector('#mobiliario-elemento')
    return sel && !sel.textContent.includes('Cargando inventario') && sel.options.length > 2
  })
  const ops = await page.locator('#mobiliario-elemento option').allInnerTexts()
  cierto(ops.some((x) => x.startsWith('Silla propia') && x.includes('100 disp.')), 'no muestra la propia con stock')
  cierto(ops.some((x) => x.startsWith('Silla alquilada') && x.includes('alquilado')), 'no marca la alquilada')
})
await t('Aviso de más de 200 asistentes en el registro (RN-03)', async () => {
  cierto(await page.getByText('Evento de más de 200 asistentes').isVisible(), 'sin aviso con 250')
})
await t('Propio + alquiler: 120 sillas con 100 de stock → 100 propias y 20 a alquilar', async () => {
  await page.selectOption('#mobiliario-elemento', String(sillaP.id)); await page.fill('#mobiliario-cantidad', '120')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  const fila = page.locator('li', { hasText: 'Silla propia' + sufijo })
  const txt = await fila.innerText()
  cierto(txt.includes('Propio + alquiler'), 'sin etiqueta mixta'); cierto(/100/.test(txt) && /20/.test(txt), 'cifras')
})
await t('Elemento alquilado: todo cuenta como «a alquilar»', async () => {
  await page.selectOption('#mobiliario-elemento', String(sillaA.id)); await page.fill('#mobiliario-cantidad', '10')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  const txt = await page.locator('li', { hasText: 'Silla alquilada' + sufijo }).innerText()
  cierto(txt.includes('Alquiler') && txt.includes('Elemento alquilado a un proveedor'), txt)
})
await t('Elemento que no está en el inventario («Otro») va a alquiler', async () => {
  await page.selectOption('#mobiliario-elemento', 'otro'); await page.fill('#mobiliario-referencia', 'Carpa 10x20')
  await page.fill('#mobiliario-cantidad', '1'); await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  const txt = await page.locator('li', { hasText: 'Carpa 10x20' }).innerText()
  cierto(txt.includes('Alquiler') && txt.includes('No está en el inventario'), txt)
})
await t('Mismo elemento dos veces se suma en una sola línea', async () => {
  await page.selectOption('#mobiliario-elemento', String(sillaP.id)); await page.fill('#mobiliario-cantidad', '5')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  igual(await page.locator('li', { hasText: 'Silla propia' + sufijo }).count(), 1, 'líneas:')
})
await t('El detalle guardado muestra propias, a alquilar y «Elemento alquilado»', async () => {
  idMob = await guardarEvento()
  await page.waitForSelector('text=Elemento alquilado')
  const d = (await api(`/eventos/${idMob}`)).cuerpo
  const p = d.servicios_adicionales.find((s) => s.descripcion.startsWith('Silla propia'))
  igual(p.unidades_propias, 100, 'propias:'); igual(p.unidades_alquilar, 25, 'alquilar:')
  const a = d.servicios_adicionales.find((s) => s.descripcion.startsWith('Silla alquilada'))
  igual(a.unidades_propias, 0, 'alquilada propias:'); igual(a.unidades_alquilar, 10, 'alquilada alquilar:')
})
await t('RN-03: 150 sin aviso; 200 sin aviso; 201 con aviso (estado_alquiler)', async () => {
  const res = {}
  for (const n of [150, 200, 201]) {
    const e = await api('/eventos', { method: 'POST', body: { nombre_evento: `Umbral ${n}` + sufijo, fecha_evento: '2026-12-28', tipo_evento: 'Boda', duracion_horas: 4, asistentes: n } })
    res[n] = (await api(`/eventos/${e.cuerpo.evento.id}`)).cuerpo.estado_alquiler
  }
  igual(res[150].requiere_alquiler, false, '150:'); igual(res[200].requiere_alquiler, false, '200:'); igual(res[201].requiere_alquiler, true, '201:')
  cierto(/supera la capacidad propia/.test(res[201].motivo), 'motivo')
})
await t('P-05: el umbral viene de la configuración (no está fijo)', async () => {
  const c = await api('/configuracion'); igual(c.cuerpo.umbral_alquiler, 200, 'umbral:')
})
await t('Con 180 asistentes y stock insuficiente avisa «el inventario no alcanza»', async () => {
  await nuevoEvento('Faltante' + sufijo, 180); await aRequerimientos(); await pestana('Mobiliario')
  await page.waitForSelector('#mobiliario-elemento option[value]', { state: 'attached' })
  await page.selectOption('#mobiliario-elemento', String(sillaP.id)); await page.fill('#mobiliario-cantidad', '150')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.waitForSelector('text=El inventario no alcanza')
})

// ============ F. HU-05 servicios ============
grupo = 'HU-05 Servicios adicionales'
await t('Agregar DJ con descripción, cantidad y notas; queda en el resumen y en el detalle', async () => {
  await nuevoEvento('Servicios' + sufijo, 120); await aRequerimientos(); await pestana('Servicios')
  await page.selectOption('#servicio-tipo', 'dj'); await page.fill('#servicio-descripcion', 'DJ para recepción')
  await page.fill('#servicio-cantidad', '6'); await page.fill('#servicio-notas', 'Música crossover')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.waitForSelector('text=DJ para recepción')
  const id = await guardarEvento()
  const d = (await api(`/eventos/${id}`)).cuerpo
  const s = d.servicios_adicionales.find((x) => x.tipo === 'dj')
  igual(s.cantidad, 6, 'cantidad:'); igual(s.notas, 'Música crossover', 'notas:')
})

// ============ G. HU-06 consulta ============
grupo = 'HU-06 Consulta de eventos'
await t('Buscar por nombre encuentra el evento', async () => {
  await page.goto(`${URL}/eventos`); await page.fill('#buscar-evento', 'Servicios' + sufijo)
  await page.waitForSelector('text=Servicios' + sufijo)
  const n = await page.locator('button[aria-pressed][aria-label*="asistentes"]').count()
  igual(n, 1, 'resultados:')
})
await t('Filtrar por estado muestra solo ese estado', async () => {
  await page.fill('#buscar-evento', '')
  await page.getByRole('group', { name: 'Filtrar por estado' }).getByRole('button', { name: /^Cancelado/ }).click()
  await page.waitForSelector('text=/Ningún evento|No hay eventos|sin eventos/i')
})
await t('Seleccionar un evento abre su detalle con requerimientos y costo', async () => {
  await page.goto(`${URL}/eventos?evento=${idAlimentos}`)
  await page.waitForSelector('section[aria-label="Alimentos"]')
  const txt = await page.locator('[aria-label="Detalle del evento"]').innerText()
  cierto(txt.includes('Medallones de Lomo de Res') && txt.includes('$990.000'), 'detalle incompleto')
})

// ============ H. HU-08 inventario ============
grupo = 'HU-08 Inventario'
const NOMBRE_INV = 'Mesa QA' + sufijo
await t('Registrar un elemento nuevo y verlo en la tabla', async () => {
  await page.goto(`${URL}/inventario`)
  await page.getByLabel('Nombre del elemento').fill(NOMBRE_INV)
  await page.selectOption('#inventario-categoria', 'Mobiliario')
  await page.getByLabel('Cantidad disponible').fill('30')
  await page.getByRole('button', { name: 'Registrar elemento' }).click()
  await page.waitForSelector('text=registrado como propio')
  cierto((await filaTabla(NOMBRE_INV).first().innerText()).includes('30'), 'no aparece con 30')
})
await t('Cantidad negativa o nombre vacío: validación', async () => {
  await page.getByLabel('Cantidad disponible').fill('-3')
  await page.getByRole('button', { name: 'Registrar elemento' }).click()
  await page.waitForSelector('text=Escribe el nombre del elemento')
  await page.waitForSelector('text=/entero mayor o igual a 0/')
})
await t('Nombre repetido dentro del inventario: «Ya existe un elemento»', async () => {
  await page.getByLabel('Nombre del elemento').fill(NOMBRE_INV)
  await page.selectOption('#inventario-categoria', 'Mobiliario')
  await page.getByLabel('Cantidad disponible').fill('1')
  await page.getByRole('button', { name: 'Registrar elemento' }).click()
  await page.waitForSelector('text=/Ya existe un elemento/')
})
await t('Actualizar la cantidad con motivo deja un ajuste en el historial', async () => {
  await page.reload()
  await page.getByRole('button', { name: `Actualizar cantidad de ${NOMBRE_INV}` }).click()
  const id = (await api('/inventario')).cuerpo.find((e) => e.nombre === NOMBRE_INV).id
  await page.fill(`#cantidad-${id}`, '25'); await page.fill(`#motivo-${id}`, 'Rotura de prueba')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await page.waitForTimeout(700)
  const m = (await api(`/inventario/movimientos?elemento_id=${id}&tipo=ajuste`)).cuerpo
  igual(m[0].cantidad, -5, 'ajuste:'); igual(m[0].notas, 'Rotura de prueba', 'motivo:')
})
await t('El buscador del inventario filtra por nombre', async () => {
  await page.fill('#buscar-inventario', NOMBRE_INV)
  await page.waitForTimeout(300)
  igual(await filaTabla(NOMBRE_INV).count(), 1, 'filas:')
  await page.fill('#buscar-inventario', '')
})

// ============ I. HU-09 adquisiciones ============
grupo = 'HU-09 Adquisiciones'
await t('Adquisición suma al total y queda en el historial', async () => {
  await page.getByRole('button', { name: 'Adquisición', exact: true }).click()
  const id = (await api('/inventario')).cuerpo.find((e) => e.nombre === NOMBRE_INV).id
  await page.selectOption('#adquisicion-elemento', String(id)); await page.fill('#adquisicion-cantidad', '10'); await page.fill('#adquisicion-notas', 'Compra de prueba')
  await page.getByRole('button', { name: 'Registrar adquisición', exact: true }).click()
  await page.waitForSelector('text=Ahora hay 35 disponibles')
  const m = (await api(`/inventario/movimientos?elemento_id=${id}&tipo=adquisicion`)).cuerpo
  igual(m[0].cantidad, 10, 'cantidad:'); igual(m[0].cantidad_resultante, 35, 'resultante:')
})
await t('Solo se adquiere sobre elementos existentes (no hay campo libre)', async () => {
  igual(await page.locator('#adquisicion-elemento').evaluate((e) => e.tagName), 'SELECT')
})
await t('Cantidad 0 y cantidad excesiva se rechazan', async () => {
  const id = (await api('/inventario')).cuerpo.find((e) => e.nombre === NOMBRE_INV).id
  igual((await api(`/inventario/${id}/adquisiciones`, { method: 'POST', body: { cantidad: 0 } })).estado, 400, '0:')
  igual((await api(`/inventario/${id}/adquisiciones`, { method: 'POST', body: { cantidad: 100001 } })).estado, 400, '100001:')
})

// ============ J. HU-09 clasificación + QA-03 ============
grupo = 'HU-09 Clasificación / QA-03 Nombres'
await t('QA-03: el selector de categoría usa Mobiliario, Bebidas Generales, Licores para Cócteles y Vajilla', async () => {
  await page.getByRole('button', { name: 'Nuevo elemento', exact: true }).click()
  const ops = (await page.locator('#inventario-categoria option').allInnerTexts()).filter((x) => !x.startsWith('Selecciona'))
  igual(JSON.stringify(ops), JSON.stringify(['Mobiliario', 'Bebidas Generales', 'Licores para Cócteles', 'Vajilla']))
})
await t('QA-03: el filtro usa los mismos nombres', async () => {
  const chips = (await page.getByRole('group', { name: 'Filtrar por categoría' }).getByRole('button').allInnerTexts()).map((x) => x.split(' · ')[0])
  igual(JSON.stringify(chips), JSON.stringify(['Todas', 'Mobiliario', 'Bebidas Generales', 'Licores para Cócteles', 'Vajilla']))
})
await t('QA-03: ningún nombre viejo se ve en la pantalla de inventario', async () => {
  const txt = await page.locator('body').innerText()
  cierto(!txt.includes('Bar/Bebidas') && !txt.includes('Bebidas de Coctelería'), 'aparece un nombre viejo')
})
await t('Filtrar por una categoría muestra solo elementos de esa categoría', async () => {
  await page.getByRole('button', { name: /^Vajilla · / }).click()
  const filasTabla = page.locator('li').filter({ has: page.locator('button[aria-label^="Registrar adquisición de"]') })
  await page.waitForFunction(() => {
    const filas = [...document.querySelectorAll('li')].filter((li) => li.querySelector('button[aria-label^="Registrar adquisición de"]'))
    return filas.length > 0 && filas.every((li) => li.textContent.includes('Vajilla'))
  })
  const filas = await filasTabla.allInnerTexts()
  cierto(filas.length > 0 && filas.every((x) => x.includes('Vajilla')), 'mezcla categorías')
  await page.getByRole('button', { name: /^Todas · / }).click()
})
await t('«Decoración» no es una categoría válida (crear y modificar → 400)', async () => {
  igual((await api('/inventario', { method: 'POST', body: { nombre: 'Flores' + sufijo, categoria_inventario: 'Decoración', cantidad_propia: 1 } })).estado, 400, 'crear:')
  igual((await api(`/inventario/${sillaP.id}/categoria`, { method: 'PATCH', body: { categoria_inventario: 'Decoración' } })).estado, 400, 'modificar:')
  igual((await api('/inventario?categoria=Decoración')).estado, 400, 'filtrar:')
})
await t('Cambiar la categoría con un valor válido funciona y se revierte', async () => {
  const a = await api(`/inventario/${sillaP.id}/categoria`, { method: 'PATCH', body: { categoria_inventario: 'Vajilla' } })
  igual(a.estado, 200); igual(a.cuerpo.categoria_inventario, 'Vajilla')
  await api(`/inventario/${sillaP.id}/categoria`, { method: 'PATCH', body: { categoria_inventario: 'Mobiliario' } })
})
await t('HU-13 (escenario 1-3): licor no aparece en generales y los filtros no se cruzan', async () => {
  const mk = (n, c) => api('/inventario', { method: 'POST', body: { nombre: n + sufijo, categoria_inventario: c, cantidad_propia: 12 } })
  igual((await mk('Ginebra inv', 'Bebidas de Coctelería')).estado, 201, 'licor:')
  igual((await mk('Champaña inv', 'Bar/Bebidas')).estado, 201, 'general:')
  for (let i = 1; i <= 4; i++) await mk('Licor extra ' + i, 'Bebidas de Coctelería')
  for (let i = 1; i <= 9; i++) await mk('General extra ' + i, 'Bar/Bebidas')
  const lic = (await api('/inventario?categoria=Bebidas de Coctelería')).cuerpo
  const gen = (await api('/inventario?categoria=Bar/Bebidas')).cuerpo
  cierto(lic.every((e) => e.categoria_inventario === 'Bebidas de Coctelería'), 'cruce en licores')
  cierto(gen.every((e) => e.categoria_inventario === 'Bar/Bebidas'), 'cruce en generales')
  cierto(!gen.some((e) => e.nombre.startsWith('Ginebra inv')), 'la ginebra aparece en generales')
  cierto(!lic.some((e) => e.nombre.startsWith('Champaña inv')), 'la champaña aparece en licores')
})
await t('Vajilla existe como categoría y el catálogo de eventos no se contamina con inventario', async () => {
  const c = (await api('/catalogo')).cuerpo
  cierto(!c.some((p) => p.nombre.endsWith(sufijo)), 'inventario en el catálogo')
})

// ============ K. HU-10 baja (QA-02) ============
grupo = 'HU-10 Baja de dañados (QA-02)'
const baja = (await api('/inventario', { method: 'POST', body: { nombre: 'Silla baja' + sufijo, categoria_inventario: 'Mobiliario', cantidad_propia: 40 } })).cuerpo
await t('Existe una sección de baja separada de la edición', async () => {
  await page.goto(`${URL}/inventario`)
  await page.getByRole('button', { name: 'Baja', exact: true }).first().click()
  await page.waitForSelector('text=Dar de baja elementos dañados')
})
await t('Elegir elemento y escribir solo la cantidad (sin motivo obligatorio)', async () => {
  await page.selectOption('#baja-elemento', String(baja.id)); await page.fill('#baja-cantidad', '6')
  cierto((await page.locator('[aria-live=polite]').filter({ hasText: 'Disponible' }).innerText()).includes('34'), 'sin vista previa 40 → 34')
})
await t('No permite dar de baja más de lo disponible (aviso y botón deshabilitado)', async () => {
  await page.fill('#baja-cantidad', '41')
  await page.waitForSelector('text=No puedes dar de baja más de las')
  igual(await page.getByRole('button', { name: 'Dar de baja', exact: true }).isDisabled(), true)
  await page.fill('#baja-cantidad', '6')
})
await t('El sistema resta y muestra el nuevo total', async () => {
  await page.getByRole('button', { name: 'Dar de baja', exact: true }).click()
  await page.waitForSelector('text=Quedan 34 disponibles')
  const e = (await api('/inventario')).cuerpo.find((x) => x.id === baja.id)
  igual(e.cantidad_propia, 34, 'propia:'); igual(e.cantidad_danada, 6, 'dañada:')
})
await t('Lo dado de baja deja de contarse como disponible para los eventos', async () => {
  const e = await api('/eventos', { method: 'POST', body: { nombre_evento: 'Baja efecto' + sufijo, fecha_evento: '2026-12-29', tipo_evento: 'Boda', duracion_horas: 3, asistentes: 100,
    servicios_adicionales: [{ tipo: 'mobiliario', descripcion: 'x', cantidad: 36, producto_id: baja.id }] } })
  const antes = (await api(`/eventos/${e.cuerpo.evento.id}`)).cuerpo.servicios_adicionales[0]
  igual(antes.unidades_alquilar, 2, 'antes: faltan 2 de 36 con 34 disponibles')
  await api(`/inventario/${baja.id}/baja`, { method: 'POST', body: { cantidad: 4, motivo: 'otra rotura' } })
  const despues = (await api(`/eventos/${e.cuerpo.evento.id}`)).cuerpo.servicios_adicionales[0]
  igual(despues.unidades_propias, 30, 'propias:'); igual(despues.unidades_alquilar, 6, 'alquilar:')
})
await t('El historial muestra «Baja por daño» con la nota por defecto', async () => {
  const m = (await api(`/inventario/movimientos?elemento_id=${baja.id}&tipo=baja`)).cuerpo
  cierto(m.some((x) => x.notas === 'Baja por daño' && x.cantidad === -6), 'sin nota por defecto')
})

// ============ L. Catálogo ============
grupo = 'Catálogo'
await t('«Catálogo» es una opción del menú y abre su pantalla', async () => {
  await page.getByRole('link', { name: 'Catálogo' }).click(); await page.waitForURL('**/catalogo')
})
await t('Crear producto sin precio: vista previa y queda «Sin precio»', async () => {
  await page.getByLabel('Nombre del producto').fill('Cerveza prueba' + sufijo)
  await page.selectOption('#catalogo-grupo', 'bebida_general'); await page.fill('#catalogo-porcion', '2')
  await page.waitForSelector('text=Con 100 asistentes: 220 unidades')
  await page.getByRole('button', { name: 'Crear producto' }).click()
  await page.waitForSelector('text=quedó en el catálogo')
  cierto((await page.locator('li', { hasText: 'Cerveza prueba' + sufijo }).innerText()).includes('Sin precio'), 'sin «Sin precio»')
})
await t('Porción mayor que la botella se rechaza; nombre repetido da 409', async () => {
  await page.getByLabel('Nombre del producto').fill('Licor prueba' + sufijo)
  await page.selectOption('#catalogo-grupo', 'bar_cocteleria'); await page.selectOption('#catalogo-tipo', 'botella_compartida')
  await page.fill('#catalogo-volumen', '750'); await page.fill('#catalogo-tamano', '900')
  await page.getByRole('button', { name: 'Crear producto' }).click()
  await page.waitForSelector('text=La porción no puede ser mayor que la botella')
  await page.getByLabel('Nombre del producto').fill('Poker'); await page.fill('#catalogo-tamano', '50')
  await page.getByRole('button', { name: 'Crear producto' }).click()
  await page.waitForSelector('text=Ya existe un producto del catálogo llamado')
})
await t('Editar el precio y verlo en la lista', async () => {
  await page.getByRole('button', { name: 'Editar Cerveza prueba' + sufijo }).click()
  await page.fill('#catalogo-precio', '3800'); await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await page.waitForSelector('text=actualizado')
  cierto((await page.locator('li', { hasText: 'Cerveza prueba' + sufijo }).innerText()).includes('3.800'), 'precio')
})
await t('Desactivar: sale del registro de eventos; Activar: vuelve', async () => {
  await page.getByRole('button', { name: 'Desactivar Cerveza prueba' + sufijo }).click()
  await page.waitForSelector('text=desactivado')
  cierto(!(await api('/catalogo')).cuerpo.some((p) => p.nombre === 'Cerveza prueba' + sufijo), 'sigue activo')
  await page.getByRole('button', { name: 'Activar Cerveza prueba' + sufijo }).click()
  await page.waitForSelector('text=activado')
  cierto((await api('/catalogo')).cuerpo.some((p) => p.nombre === 'Cerveza prueba' + sufijo), 'no volvió')
})
await t('Un producto ya usado en un evento no cambia de grupo/tipo (409)', async () => {
  const poker = (await api('/catalogo')).cuerpo.find((p) => p.nombre === 'Poker')
  const r = await api(`/catalogo/${poker.id}`, { method: 'PUT', body: { nombre: 'Poker', clasificacion: 'bar_cocteleria', tipo_calculo: 'unidad_persona', porcion_por_persona: 2, precio_unitario: 0 } })
  igual(r.estado, 409)
})

// ============ M. Transversales ============
grupo = 'Transversales'
await t('Modo oscuro se activa y se recuerda al recargar', async () => {
  await page.goto(`${URL}/eventos`)
  await page.getByRole('switch', { name: /Modo oscuro/ }).click()
  cierto(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'no activó')
  await page.reload(); await page.waitForSelector('nav')
  cierto(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'no se recordó')
  await page.getByRole('switch', { name: /Modo oscuro/ }).click()
})
await t('Sin errores de JavaScript en consola durante todo el recorrido', async () => {
  cierto(erroresConsola.length === 0, erroresConsola.slice(0, 3).join(' | '))
})
await t('Cerrar sesión vuelve al login', async () => {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click(); await page.waitForURL('**/login**')
})
await t('Navegación a una ruta inexistente muestra la página 404', async () => {
  await entrar(page); await page.waitForURL('**/eventos**')
  await page.goto(`${URL}/no-existe-esta-ruta`)
  const txt = await page.locator('body').innerText()
  cierto(/404|no encontr/i.test(txt), 'sin 404')
})
await navegador.close()

const ok = R.filter((x) => x.ok).length
console.log(`\nRESULTADO: ${ok}/${R.length} pruebas pasan, ${R.length - ok} fallan`)
const carpeta = join(dirname(fileURLToPath(import.meta.url)), '..', 'resultados')
mkdirSync(carpeta, { recursive: true })
writeFileSync(
  join(carpeta, `regresion-${corrida}.json`),
  JSON.stringify({ fecha: new Date().toISOString(), api: API, front: URL, corrida, resultados: R }, null, 2),
)
process.exit(ok === R.length ? 0 : 1)
