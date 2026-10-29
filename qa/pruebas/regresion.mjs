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
console.log(`QA contra: frontend ${URL} · API ${API} · usuario ${USUARIO} · pantalla ${process.env.QA_VIEWPORT || '1440x1000'}`)

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
// Tamaño de pantalla: por defecto escritorio. En celular: QA_VIEWPORT=390x844 (el menú pasa a ser un cajón).
const [ANCHO, ALTO] = (process.env.QA_VIEWPORT || '1440x1000').split('x').map(Number)
const ctx = await navegador.newContext({ viewport: { width: ANCHO, height: ALTO }, hasTouch: ANCHO < 800, isMobile: ANCHO < 800 })
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
// En pantallas pequeñas el menú lateral es un cajón: hay que abrirlo antes de usar sus opciones
const abrirMenu = async () => {
  if (ANCHO >= 1024) return
  if (!(await page.getByRole('navigation', { name: 'Navegación principal' }).isVisible())) {
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor()
  }
}
const optVal = async (p, sel, texto) => p.locator(`${sel} option`).filter({ hasText: new RegExp(`^${texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$|\\()`) }).first().getAttribute('value')
// Cada evento de prueba va en una fecha al azar entre 1 mes y 4 años adelante (dentro del tope de 5 años): así las pruebas no chocan con el tope de
// eventos por día ni con lo que dejaron corridas anteriores.
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
const nuevoEvento = async (nombre, asistentes, tipo = 'Boda') => {
  await page.goto(`${URL}/eventos/nuevo`)
  await page.fill('input[placeholder="Ej. Boda Martínez & Gómez"]', nombre)
  await page.selectOption('select', tipo)
  await page.fill('input[type=date]', fechaLibre())
  await page.fill('input[placeholder="Ej. 6"]', '5')
  await page.getByLabel('Número de asistentes').fill(String(asistentes))
}
const aRequerimientos = async () => {
  await page.getByRole('button', { name: /^Siguiente/ }).click()
  await page.getByRole('tab', { name: /Alimentos/ }).waitFor()
}
const pestana = async (n) => page.getByRole('tab', { name: new RegExp(n) }).click()
const guardarEvento = async () => {
  await page.getByRole('button', { name: /^Siguiente/ }).click()
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
  DIAS_OCUPADOS = new Set((await api('/eventos')).cuerpo.map((e) => String(e.fecha_evento).slice(0, 10)))
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
  await page.getByRole('button', { name: /^Siguiente/ }).click()
  await page.waitForSelector('text=Escribe el nombre del evento')
  cierto(await page.getByText('Datos del evento').first().isVisible(), 'avanzó')
})
for (const [n, texto] of [[39, 'El mínimo es 40'], [601, 'El máximo es 600']]) {
  await t(`${n} asistentes se rechaza («${texto}»)`, async () => {
    await nuevoEvento('Rango' + sufijo, n)
    await page.waitForSelector(`text=${texto}`)
    igual(await page.getByRole('button', { name: /^Siguiente/ }).isDisabled(), true, 'botón deshabilitado:')
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
// Las pruebas de precios no dependen de si el catálogo tiene precios cargados: la bebida «sin valor» es un producto
// propio de la prueba (sin precio), y los precios del catálogo se leen de la API.
const SIN_PRECIO = 'Bebida sin precio' + sufijo
await api('/catalogo', { method: 'POST', body: { nombre: SIN_PRECIO, clasificacion: 'bebida_general', tipo_calculo: 'unidad_persona', porcion_por_persona: 2 } })
const precioCat = async (n) => { const p = (await api('/catalogo')).cuerpo.find((x) => x.nombre === n); return Number(p.precio_unitario) > 0 ? String(Number(p.precio_unitario)) : '' }
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
await t('QA-04: el valor unitario llega con el precio del catálogo (vacío si no tiene) en las seis', async () => {
  for (const n of SEIS) {
    await page.selectOption('#bebida-producto', await optVal(page, '#bebida-producto', n))
    igual(await page.locator('#bebida-precio').inputValue(), await precioCat(n), n + ':')
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
    igual(await page.locator('#bebida-precio').inputValue(), await precioCat(n), n + ' precio:')
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
  await agregarBebida(SIN_PRECIO)                   // sin valor
  await agregarBebida('Águila', { precio: 3500 })   // con valor
  cierto(await page.getByText('Sin valor').first().isVisible(), 'no muestra «Sin valor»')
  const id = await guardarEvento()
  const d = (await api(`/eventos/${id}`)).cuerpo
  const porNombre = Object.fromEntries(d.productos_calculados.map((p) => [p.nombre, p]))
  igual(Number(porNombre['Vino tinto'].cantidad_con_margen), 37, 'vino:')
  igual(Number(porNombre['Vino tinto'].costo_estimado), 1480000, 'costo vino:')
  igual(Number(porNombre[SIN_PRECIO].cantidad_con_margen), 440, 'sin precio:')
  igual(Number(porNombre[SIN_PRECIO].costo_estimado), 0, 'sin precio costo:')
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
    const e = await api('/eventos', { method: 'POST', body: { nombre_evento: `Umbral ${n}` + sufijo, fecha_evento: fechaLibre(), tipo_evento: 'Boda', duracion_horas: 4, asistentes: n } })
    res[n] = (await api(`/eventos/${e.cuerpo.evento.id}`)).cuerpo.estado_alquiler
  }
  igual(res[150].requiere_alquiler, false, '150:'); igual(res[200].requiere_alquiler, false, '200:'); igual(res[201].requiere_alquiler, true, '201:')
  cierto(/supera la capacidad propia/.test(res[201].motivo), 'motivo')
})
await t('P-05: el umbral viene de la configuración (no está fijo)', async () => {
  const c = await api('/configuracion'); igual(c.cuerpo.umbral_alquiler, 200, 'umbral:')
})
await t('Con 180 asistentes y stock insuficiente avisa que hay que alquilar y que el inventario no alcanza', async () => {
  await nuevoEvento('Faltante' + sufijo, 180); await aRequerimientos(); await pestana('Mobiliario')
  await page.waitForSelector('#mobiliario-elemento option[value]', { state: 'attached' })
  await page.selectOption('#mobiliario-elemento', String(sillaP.id)); await page.fill('#mobiliario-cantidad', '150')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.waitForSelector('text=El inventario propio no alcanza para este evento')
})

// ============ F. HU-05 servicios ============
grupo = 'HU-05 Servicios adicionales'
await t('Agregar DJ con descripción, cantidad y notas; queda en el resumen y en el detalle', async () => {
  await nuevoEvento('Servicios' + sufijo, 120); await aRequerimientos(); await pestana('Servicios')
  await page.selectOption('#servicio-tipo', 'dj'); await page.fill('#servicio-descripcion', 'DJ para recepción')
  await page.fill('#servicio-cantidad', '2'); await page.fill('#servicio-horas', '4'); await page.fill('#servicio-notas', 'Música crossover')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.waitForSelector('text=DJ para recepción')
  const id = await guardarEvento()
  const d = (await api(`/eventos/${id}`)).cuerpo
  const s = d.servicios_adicionales.find((x) => x.tipo === 'dj')
  igual(s.cantidad, 2, 'unidades:'); igual(Number(s.horas), 4, 'horas:'); igual(s.notas, 'Música crossover', 'notas:')
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
  await page.waitForSelector('text=/entero mayor o igual a 1/')
})
await t('COR-04: cantidad 0 no se puede registrar (el campo no baja de 1 y avisa al enviar)', async () => {
  await page.getByLabel('Nombre del elemento').fill('Cero ' + NOMBRE_INV)
  await page.selectOption('#inventario-categoria', 'Mobiliario')
  await page.getByLabel('Cantidad disponible').fill('0')
  await page.getByRole('button', { name: 'Registrar elemento' }).click()
  await page.waitForSelector('text=/entero mayor o igual a 1/')
  igual(await page.getByText('registrado como propio').count(), 0, 'se registró con 0:')
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
  cierto(!c.some((p) => p.nombre.endsWith(sufijo) && p.nombre !== SIN_PRECIO), 'inventario en el catálogo') // SIN_PRECIO es un producto de catálogo creado por la propia prueba
})

// ============ K. HU-10 retiro (QA-02, COR-09) ============
grupo = 'HU-10 Retiro de elementos (QA-02 / COR-09)'
const baja = (await api('/inventario', { method: 'POST', body: { nombre: 'Silla retiro' + sufijo, categoria_inventario: 'Mobiliario', cantidad_propia: 40 } })).cuerpo
await t('Existe una sección «Retiro de elementos» separada de la edición', async () => {
  await page.goto(`${URL}/inventario`)
  await page.getByRole('button', { name: 'Retiro', exact: true }).first().click()
  await page.waitForSelector('text=Retiro de elementos')
})
await t('Elegir elemento y escribir solo la cantidad (sin motivo obligatorio)', async () => {
  await page.selectOption('#retiro-elemento', String(baja.id)); await page.fill('#retiro-cantidad', '6')
  cierto((await page.locator('[aria-live=polite]').filter({ hasText: 'Disponible' }).innerText()).includes('34'), 'sin vista previa 40 → 34')
})
await t('No permite retirar más de lo disponible (aviso y botón deshabilitado)', async () => {
  await page.fill('#retiro-cantidad', '41')
  await page.waitForSelector('text=No puedes retirar más de las')
  igual(await page.getByRole('button', { name: 'Retirar', exact: true }).isDisabled(), true)
  await page.fill('#retiro-cantidad', '6')
})
await t('El sistema resta y muestra el nuevo total', async () => {
  await page.getByRole('button', { name: 'Retirar', exact: true }).click()
  await page.waitForSelector('text=Quedan 34 disponibles')
  const e = (await api('/inventario')).cuerpo.find((x) => x.id === baja.id)
  igual(e.cantidad_propia, 34, 'propia:'); igual(e.cantidad_danada, 6, 'dañada:')
})
await t('Lo retirado deja de contarse como disponible para los eventos', async () => {
  const e = await api('/eventos', { method: 'POST', body: { nombre_evento: 'Retiro efecto' + sufijo, fecha_evento: fechaLibre(), tipo_evento: 'Boda', duracion_horas: 3, asistentes: 100,
    servicios_adicionales: [{ tipo: 'mobiliario', descripcion: 'x', cantidad: 36, producto_id: baja.id }] } })
  const antes = (await api(`/eventos/${e.cuerpo.evento.id}`)).cuerpo.servicios_adicionales[0]
  igual(antes.unidades_alquilar, 2, 'antes: faltan 2 de 36 con 34 disponibles')
  await api(`/inventario/${baja.id}/baja`, { method: 'POST', body: { cantidad: 4, motivo: 'otra rotura' } })
  const despues = (await api(`/eventos/${e.cuerpo.evento.id}`)).cuerpo.servicios_adicionales[0]
  igual(despues.unidades_propias, 30, 'propias:'); igual(despues.unidades_alquilar, 6, 'alquilar:')
})
await t('El historial muestra «Retiro» con la nota por defecto «Retiro de elementos»', async () => {
  const m = (await api(`/inventario/movimientos?elemento_id=${baja.id}&tipo=baja`)).cuerpo
  cierto(m.some((x) => x.notas === 'Retiro de elementos' && x.cantidad === -6), 'sin nota por defecto')
})
await t('COR-09: la sección se llama «Retiro de elementos» y el campo «Cantidad a retirar»', async () => {
  await page.goto(`${URL}/inventario`)
  await page.getByRole('button', { name: 'Retiro', exact: true }).first().click()
  await page.getByRole('heading', { name: 'Retiro de elementos' }).waitFor()
  await page.getByLabel('Cantidad a retirar').waitFor()
  await page.getByLabel('Elemento a retirar').waitFor()
})
await t('COR-09: no quedan textos de «baja» ni de «dañada» en el formulario, las pestañas ni los botones', async () => {
  const textos = [
    await page.locator('main form').first().innerText(),
    await page.getByRole('group', { name: 'Acción' }).innerText(),
    (await page.locator('main li button').allInnerTexts()).join(' '),
    (await page.locator('main li button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') || '').join(' '))),
  ].join(' | ')
  cierto(!/baja|dañad|dañar/i.test(textos), 'quedan textos viejos: ' + (textos.match(/.{0,25}(baja|dañad|dañar).{0,25}/i) || [''])[0])
  cierto((await page.locator('main li button[aria-label^="Retirar unidades de"]').count()) > 0, 'sin botón «Retiro» en las filas')
})
await t('COR-09: el historial y la fila usan el nombre nuevo (Retiro / retiradas)', async () => {
  cierto((await page.getByText('Baja por daño').count()) === 0, 'aparece «Baja por daño»')
  cierto((await page.locator('li', { hasText: 'Silla retiro' + sufijo }).first().innerText()).includes('6 retiradas') || (await page.locator('li', { hasText: 'Silla retiro' + sufijo }).first().innerText()).includes('10 retiradas'), 'la fila no dice «retiradas»')
})
await t('COR-09: el descuento funciona igual por la ruta nueva /retiro y por la anterior /baja', async () => {
  const e = (await api('/inventario', { method: 'POST', body: { nombre: 'Retiro rutas' + sufijo, categoria_inventario: 'Mobiliario', cantidad_propia: 50 } })).cuerpo
  const nuevo = await api(`/inventario/${e.id}/retiro`, { method: 'POST', body: { cantidad: 7 } })
  igual(nuevo.estado, 201, '/retiro:'); igual(nuevo.cuerpo.elemento.cantidad_propia, 43, 'quedan:'); igual(nuevo.cuerpo.movimiento.notas, 'Retiro de elementos', 'nota:')
  const viejo = await api(`/inventario/${e.id}/baja`, { method: 'POST', body: { cantidad: 3, motivo: 'devolución' } })
  igual(viejo.estado, 201, '/baja:'); igual(viejo.cuerpo.elemento.cantidad_propia, 40, 'quedan:'); igual(viejo.cuerpo.elemento.cantidad_danada, 10, 'retiradas acumuladas:')
  igual((await api(`/inventario/${e.id}/retiro`, { method: 'POST', body: { cantidad: 41 } })).estado, 400, 'más de lo disponible:')
  igual((await api(`/inventario/${e.id}/retiro`, { method: 'POST', body: { cantidad: 0 } })).estado, 400, '0:')
  igual((await api(`/inventario/${e.id}/retiro`, { method: 'POST', body: { cantidad: 1.5 } })).estado, 400, '1.5:')
  const mov = (await api(`/inventario/movimientos?elemento_id=${e.id}`)).cuerpo.reduce((suma, m) => suma + m.cantidad, 0)
  igual(mov, 40, 'suma de movimientos = cantidad disponible:')
})


// ============ Corrección: máximos de inventario por categoría (HU-08, HU-11 · RF-11, RF-13, RN-16) ============
grupo = 'Cor. máximos de inventario (RN-16)'
const MAXIMOS = { 'Mobiliario': 2000, 'Vajilla': 6000, 'Bar/Bebidas': 4000, 'Bebidas de Coctelería': 4000 }
// Los elementos de prueba no llevan en el nombre la clave interna de la categoría («Bar/Bebidas»): si no, la
// prueba de «ningún nombre viejo en pantalla» fallaría en la segunda corrida, con los restos de la primera.
const NOMBRE_CORTO = { 'Mobiliario': 'mobiliario', 'Vajilla': 'vajilla', 'Bar/Bebidas': 'generales', 'Bebidas de Coctelería': 'licores' }
const crearElemento = (nombre, categoria, cantidad) => api('/inventario', { method: 'POST', body: { nombre, categoria_inventario: categoria, cantidad_propia: cantidad } })
const adquirir = (id, cantidad) => api(`/inventario/${id}/adquisiciones`, { method: 'POST', body: { cantidad } })

await t('Registrar (API): el valor exacto del máximo se acepta y uno más se rechaza, en las 4 categorías', async () => {
  for (const [cat, max] of Object.entries(MAXIMOS)) {
    const justo = await crearElemento(`Máx ${NOMBRE_CORTO[cat]} ${max}` + sufijo, cat, max)
    igual(justo.estado, 201, `${cat} ${max}:`)
    const pasado = await crearElemento(`Máx ${NOMBRE_CORTO[cat]} ${max + 1}` + sufijo, cat, max + 1)
    igual(pasado.estado, 400, `${cat} ${max + 1}:`)
    cierto(String(pasado.cuerpo.detalle).includes('máximo'), `mensaje ${cat}: ` + pasado.cuerpo.detalle)
  }
})
await t('Registrar (API): 1 millón de sillas se rechaza; negativos, decimales y texto también', async () => {
  igual((await crearElemento('Millón de sillas' + sufijo, 'Mobiliario', 1000000)).estado, 400, '1.000.000:')
  igual((await crearElemento('Negativo' + sufijo, 'Mobiliario', -1)).estado, 400, '-1:')
  igual((await crearElemento('Decimal' + sufijo, 'Mobiliario', 1.5)).estado, 400, '1.5:')
  igual((await crearElemento('Texto' + sufijo, 'Mobiliario', '10')).estado, 400, 'texto:')
  cierto(!(await api('/inventario')).cuerpo.some((e) => /Millón de sillas|Negativo|Decimal|Texto/.test(e.nombre) && e.nombre.endsWith(sufijo)), 'se guardó un elemento inválido')
})
await t('Actualizar cantidad (API): el máximo exacto se acepta y uno más se rechaza; no cambia nada', async () => {
  const e = (await crearElemento('Actualizar máx' + sufijo, 'Mobiliario', 10)).cuerpo
  const fijar = (cantidad) => api(`/inventario/${e.id}/cantidad`, { method: 'PATCH', body: { cantidad_propia: cantidad } })
  igual((await fijar(2001)).estado, 400, '2001:')
  igual((await fijar(100000)).estado, 400, '100000:')
  igual((await api('/inventario')).cuerpo.find((x) => x.id === e.id).cantidad_propia, 10, 'tras rechazo:')
  igual((await fijar(2000)).estado, 200, '2000:')
  igual((await fijar(-1)).estado, 400, '-1:'); igual((await fijar(1.5)).estado, 400, '1.5:')
})
await t('Adquirir (API): un exceso se rechaza y el mensaje dice cuánto se puede adquirir como mucho', async () => {
  const e = (await crearElemento('Adquirir máx' + sufijo, 'Mobiliario', 1800)).cuerpo
  const r = await adquirir(e.id, 201)
  igual(r.estado, 400); cierto(String(r.cuerpo.detalle).includes('como mucho se pueden adquirir 200'), 'mensaje: ' + r.cuerpo.detalle)
  igual((await api('/inventario')).cuerpo.find((x) => x.id === e.id).cantidad_propia, 1800, 'tras rechazo:')
  igual((await adquirir(e.id, 200)).estado, 201, 'justo 200:')
  const lleno = await adquirir(e.id, 1)
  igual(lleno.estado, 400, 'ya en el máximo:'); cierto(String(lleno.cuerpo.detalle).includes('ya tiene el máximo'), 'mensaje: ' + lleno.cuerpo.detalle)
  igual((await adquirir(e.id, 0)).estado, 400, '0:'); igual((await adquirir(e.id, -5)).estado, 400, '-5:'); igual((await adquirir(e.id, 1.5)).estado, 400, '1.5:')
  igual((await adquirir(e.id, 100000)).estado, 400, '100000:')
})
await t('Adquirir (API): el tope depende de la categoría (vajilla admite más que mobiliario)', async () => {
  const v = (await crearElemento('Adquirir vajilla' + sufijo, 'Vajilla', 5000)).cuerpo
  igual((await adquirir(v.id, 1001)).estado, 400, '1001:')
  igual((await adquirir(v.id, 1000)).estado, 201, '1000:')
  igual((await api('/inventario')).cuerpo.find((x) => x.id === v.id).cantidad_propia, 6000, 'total:')
})
await t('Adquirir (API): dos adquisiciones simultáneas no pueden pasar juntas del máximo', async () => {
  const e = (await crearElemento('Adquirir carrera' + sufijo, 'Mobiliario', 1900)).cuerpo
  const rs = await Promise.all([adquirir(e.id, 80), adquirir(e.id, 80), adquirir(e.id, 80)])
  const ok = rs.filter((r) => r.estado === 201).length
  igual(ok, 1, 'aceptadas:')
  cierto((await api('/inventario')).cuerpo.find((x) => x.id === e.id).cantidad_propia <= 2000, 'pasó del máximo')
})
await t('Cambiar categoría (API): no cabe en una categoría con menor máximo', async () => {
  const e = (await crearElemento('Cambio categoría' + sufijo, 'Vajilla', 5000)).cuerpo
  const mover = (cat) => api(`/inventario/${e.id}/categoria`, { method: 'PATCH', body: { categoria_inventario: cat } })
  igual((await mover('Mobiliario')).estado, 400, 'a Mobiliario:')
  igual((await mover('Bar/Bebidas')).estado, 400, 'a Bebidas Generales:')
  igual((await api('/inventario')).cuerpo.find((x) => x.id === e.id).categoria_inventario, 'Vajilla', 'sigue en Vajilla:')
  await api(`/inventario/${e.id}/cantidad`, { method: 'PATCH', body: { cantidad_propia: 1500 } })
  igual((await mover('Mobiliario')).estado, 200, 'con 1500:')
})
await t('Registrar (UI): el máximo se avisa al escribirlo y 2001 no se registra; 2000 sí', async () => {
  await page.goto(`${URL}/inventario`)
  await page.getByLabel('Nombre del elemento').fill('UI máx' + sufijo)
  await page.selectOption('#inventario-categoria', 'Mobiliario')
  await page.getByLabel('Cantidad disponible').fill('2001')
  await page.waitForSelector('text=El máximo por elemento de Mobiliario es 2.000 unidades')
  await page.getByRole('button', { name: 'Registrar elemento' }).click()
  await page.waitForSelector('text=El máximo por elemento de Mobiliario es 2.000 unidades')
  cierto(!(await api('/inventario')).cuerpo.some((e) => e.nombre === 'UI máx' + sufijo), 'se registró con 2001')
  await page.getByLabel('Cantidad disponible').fill('2000')
  await page.getByRole('button', { name: 'Registrar elemento' }).click()
  await page.waitForSelector('text=registrado como propio')
})
await t('Actualizar cantidad (UI): 2001 se rechaza con mensaje claro; 2000 se guarda', async () => {
  await page.reload()
  await page.getByRole('button', { name: 'Actualizar cantidad de UI máx' + sufijo }).click()
  const id = (await api('/inventario')).cuerpo.find((e) => e.nombre === 'UI máx' + sufijo).id
  await page.fill(`#cantidad-${id}`, '2001'); await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await page.waitForSelector('text=El máximo por elemento de Mobiliario es 2.000 unidades')
  await page.fill(`#cantidad-${id}`, '1999'); await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await page.waitForTimeout(700)
  igual((await api('/inventario')).cuerpo.find((e) => e.id === id).cantidad_propia, 1999, 'cantidad:')
})
await t('Adquisición (UI): el aviso dice cuánto se puede adquirir; 2 se rechaza con 1 de margen y 1 se acepta', async () => {
  await page.reload()
  await page.getByRole('button', { name: 'Adquisición', exact: true }).click()
  const id = (await api('/inventario')).cuerpo.find((e) => e.nombre === 'UI máx' + sufijo).id
  await page.selectOption('#adquisicion-elemento', String(id))
  await page.waitForSelector('text=Como mucho puedes adquirir 1 unidades más')
  await page.fill('#adquisicion-cantidad', '2')
  await page.waitForSelector('text=Como mucho se pueden adquirir 1')
  await page.getByRole('button', { name: 'Registrar adquisición', exact: true }).click()
  igual((await api('/inventario')).cuerpo.find((e) => e.id === id).cantidad_propia, 1999, 'no debía cambiar:')
  await page.fill('#adquisicion-cantidad', '1'); await page.getByRole('button', { name: 'Registrar adquisición', exact: true }).click()
  await page.waitForSelector('text=Ahora hay 2.000 disponibles')
})


// ============ Corrección: alquiler solo de mobiliario y vajilla (HU-12 · RF-14, RN-17) ============
grupo = 'Cor. alquiler solo de mobiliario y vajilla (RN-17)'
const crearAlquilable = (nombre, categoria, cantidad, esPropio) => api('/inventario', { method: 'POST', body: { nombre, categoria_inventario: categoria, cantidad_propia: cantidad, es_propio: esPropio } })
const eventoConMobiliario = (asistentes, lineas) => api('/eventos', { method: 'POST', body: { nombre_evento: `Alquiler ${asistentes}` + sufijo, fecha_evento: fechaLibre(), tipo_evento: 'Boda', duracion_horas: 5, asistentes,
  servicios_adicionales: lineas.map(([producto_id, cantidad, descripcion]) => ({ tipo: 'mobiliario', producto_id, cantidad, descripcion })) } })

await t('Registrar (API): una bebida no se puede registrar como alquilada; mobiliario y vajilla sí', async () => {
  for (const cat of ['Bar/Bebidas', 'Bebidas de Coctelería']) {
    const r = await crearAlquilable(`Bebida alquilada ${NOMBRE_CORTO[cat]}` + sufijo, cat, 100, false)
    igual(r.estado, 400, `${cat}:`); cierto(String(r.cuerpo.detalle).includes('Solo se alquila mobiliario y vajilla'), 'mensaje: ' + r.cuerpo.detalle)
    igual((await crearAlquilable(`Bebida propia ${NOMBRE_CORTO[cat]}` + sufijo, cat, 100, true)).estado, 201, `${cat} propia:`)
  }
  igual((await crearAlquilable('Mobiliario alquilado' + sufijo, 'Mobiliario', 10, false)).estado, 201, 'Mobiliario:')
  igual((await crearAlquilable('Vajilla alquilada' + sufijo, 'Vajilla', 10, false)).estado, 201, 'Vajilla:')
  cierto(!(await api('/inventario')).cuerpo.some((e) => /^Bebida alquilada/.test(e.nombre) && e.nombre.endsWith(sufijo)), 'se guardó una bebida alquilada')
})
await t('Marcar como alquilado (API): una bebida no; mobiliario y vajilla sí', async () => {
  const beb = (await crearAlquilable('Bebida marcar' + sufijo, 'Bar/Bebidas', 50, true)).cuerpo
  const mob = (await crearAlquilable('Mobiliario marcar' + sufijo, 'Mobiliario', 50, true)).cuerpo
  const marcar = (id, v) => api(`/inventario/${id}/propiedad`, { method: 'PATCH', body: { es_propio: v } })
  igual((await marcar(beb.id, false)).estado, 400, 'bebida:')
  igual((await marcar(beb.id, true)).estado, 200, 'bebida propia (no cambia nada):')
  igual((await marcar(mob.id, false)).estado, 200, 'mobiliario:')
  igual((await api('/inventario')).cuerpo.find((x) => x.id === beb.id).es_propio, true, 'bebida sigue propia:')
})
await t('Cambiar categoría (API): un elemento alquilado no puede pasar a bebidas', async () => {
  const e = (await crearAlquilable('Alquilado cambio' + sufijo, 'Vajilla', 10, false)).cuerpo
  const mover = (cat) => api(`/inventario/${e.id}/categoria`, { method: 'PATCH', body: { categoria_inventario: cat } })
  igual((await mover('Bar/Bebidas')).estado, 400, 'a Bebidas Generales:')
  igual((await mover('Bebidas de Coctelería')).estado, 400, 'a Licores:')
  igual((await mover('Mobiliario')).estado, 200, 'a Mobiliario:')
  const p = (await crearAlquilable('Propio cambio' + sufijo, 'Mobiliario', 10, true)).cuerpo
  igual((await api(`/inventario/${p.id}/categoria`, { method: 'PATCH', body: { categoria_inventario: 'Bar/Bebidas' } })).estado, 200, 'propio a bebidas (sin alquiler):')
})
await t('Evento (API): la cantidad de mobiliario es un entero de 1 a 2.000 (el máximo exacto sí, uno más no)', async () => {
  const el = (await crearAlquilable('Cantidad evento' + sufijo, 'Mobiliario', 100, true)).cuerpo
  const antes = (await api('/eventos')).cuerpo.length
  for (const v of [0, -5, 1.5, 2001, 1000000, '10', null]) {
    const r = await eventoConMobiliario(100, [[el.id, v]])
    igual(r.estado, 400, `cantidad ${JSON.stringify(v)}:`)
  }
  igual((await api('/eventos')).cuerpo.length, antes, 'eventos guardados con datos inválidos:')
  const otro = await eventoConMobiliario(100, [[null, 2000, 'Carpa 10 x 20 m']])
  igual(otro.estado, 201, '2000 de «Otro»:')
  igual((await eventoConMobiliario(100, [[el.id, 2000]])).estado, 201, '2000 del inventario:')
})
await t('Alquiler (API), 250 asistentes: se alquila exactamente lo requerido menos lo propio disponible', async () => {
  const e = (await crearElemento('Mesas 250' + sufijo, 'Mobiliario', 150)).cuerpo
  const r = await eventoConMobiliario(250, [[e.id, 250]])
  igual(r.estado, 201)
  const det = (await api(`/eventos/${r.cuerpo.evento.id}`)).cuerpo
  const l = det.servicios_adicionales[0]
  igual(l.unidades_propias, 150, 'propias:'); igual(l.unidades_alquilar, 100, 'a alquilar (250 − 150):')
  igual(det.estado_alquiler.unidades_alquilar, 100, 'total a alquilar:'); igual(det.estado_alquiler.inventario_insuficiente, true, 'falta inventario:')
  igual(det.aviso_alquiler, true, 'aviso por umbral (250 > 200):')
})
await t('Alquiler (API), 150 asistentes: si no falta nada, no se alquila nada', async () => {
  const e = (await crearElemento('Mesas 150' + sufijo, 'Mobiliario', 150)).cuerpo
  const r = await eventoConMobiliario(150, [[e.id, 150]])
  igual(r.estado, 201)
  const det = (await api(`/eventos/${r.cuerpo.evento.id}`)).cuerpo
  const l = det.servicios_adicionales[0]
  igual(l.unidades_propias, 150, 'propias:'); igual(l.unidades_alquilar, 0, 'a alquilar:')
  igual(det.estado_alquiler.unidades_alquilar, 0, 'total a alquilar:'); igual(det.estado_alquiler.inventario_insuficiente, false, 'no falta inventario:')
  igual(det.aviso_alquiler, false, 'sin aviso (150 ≤ 200):')
})
await t('Alquiler (API): nunca pasa de lo requerido menos lo propio, ni con un elemento alquilado ni con «Otro»', async () => {
  const propio = (await crearElemento('Alq propio' + sufijo, 'Mobiliario', 80)).cuerpo
  const alquilado = (await crearAlquilable('Alq proveedor' + sufijo, 'Mobiliario', 500, false)).cuerpo
  const r = await eventoConMobiliario(300, [[propio.id, 50], [alquilado.id, 120], [null, 40, 'Carpa']])
  igual(r.estado, 201)
  const l = (await api(`/eventos/${r.cuerpo.evento.id}`)).cuerpo.servicios_adicionales
  const porNombre = (n) => l.find((x) => x.descripcion.startsWith(n))
  igual(porNombre('Alq propio').unidades_alquilar, 0, 'propio con stock de sobra:')
  igual(porNombre('Alq proveedor').unidades_alquilar, 120, 'alquilado: todo lo requerido y no más:')
  igual(porNombre('Carpa').unidades_alquilar, 40, '«Otro»: todo lo requerido y no más:')
  for (const x of l) cierto(Number(x.unidades_alquilar) <= Number(x.cantidad) - Number(x.unidades_propias), `${x.descripcion}: alquilar > requerido − propio`)
})
await t('Inventario (UI): al elegir una bebida no se ofrece «Alquilado»; con mobiliario o vajilla sí', async () => {
  await page.goto(`${URL}/inventario`)
  const alquilado = page.getByRole('button', { name: 'Alquilado', exact: true })
  await page.selectOption('#inventario-categoria', 'Mobiliario')
  igual(await alquilado.isDisabled(), false, 'Mobiliario:')
  await alquilado.click(); igual(await alquilado.getAttribute('aria-pressed'), 'true', 'marcado:')
  await page.selectOption('#inventario-categoria', 'Bar/Bebidas')
  igual(await alquilado.isDisabled(), true, 'Bebidas Generales:')
  igual(await page.getByRole('button', { name: 'Propio', exact: true }).getAttribute('aria-pressed'), 'true', 'vuelve a Propio:')
  await page.waitForSelector('text=Solo se alquila mobiliario y vajilla')
  await page.selectOption('#inventario-categoria', 'Bebidas de Coctelería')
  igual(await alquilado.isDisabled(), true, 'Licores:')
  await page.selectOption('#inventario-categoria', 'Vajilla')
  igual(await alquilado.isDisabled(), false, 'Vajilla:')
})
await t('Inventario (UI): al editar una bebida el selector de propiedad no trae «Alquilado»', async () => {
  await page.reload()
  const beb = (await api('/inventario')).cuerpo.find((x) => x.nombre === 'Bebida propia generales' + sufijo)
  const mob = (await api('/inventario')).cuerpo.find((x) => x.nombre === 'Mobiliario alquilado' + sufijo)
  await page.fill('#buscar-inventario', beb.nombre)
  await page.getByRole('button', { name: `Actualizar cantidad de ${beb.nombre}` }).click()
  igual(await page.locator(`#propiedad-${beb.id} option[value=alquilado]`).count(), 0, 'bebida:')
  await page.fill('#buscar-inventario', mob.nombre)
  await page.getByRole('button', { name: `Actualizar cantidad de ${mob.nombre}` }).click()
  igual(await page.locator(`#propiedad-${mob.id} option[value=alquilado]`).count(), 1, 'mobiliario:')
  await page.fill('#buscar-inventario', '')
})
await t('Evento (UI), 250 y 150 asistentes: «A alquilar» es lo requerido menos lo propio, y 0 si no falta nada', async () => {
  const e = (await api('/inventario')).cuerpo.find((x) => x.nombre === 'Mesas 250' + sufijo)
  const filaMob = () => page.locator('li', { hasText: e.nombre }).first().innerText()
  await nuevoEvento('UI alquiler 250' + sufijo, 250)
  await aRequerimientos(); await pestana('Mobiliario')
  await page.selectOption('#mobiliario-elemento', String(e.id)); await page.fill('#mobiliario-cantidad', '250')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  const t250 = (await filaMob()).replace(/\s+/g, ' ')
  cierto(/150/.test(t250) && /100/.test(t250), 'la fila no muestra 150 propias y 100 a alquilar: ' + t250)
  cierto(await page.getByText('Hay que alquilar 100 unidades').count() === 1, 'no avisa 100 a alquilar')
  // 2001 unidades: no se deja agregar
  await page.getByRole('button', { name: `Quitar ${e.nombre}` }).click()
  await page.selectOption('#mobiliario-elemento', String(e.id)); await page.fill('#mobiliario-cantidad', '2001')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.waitForSelector('text=La cantidad máxima por elemento de mobiliario es 2.000 unidades')
  // 150 asistentes con 150 requeridas y 150 propias: no falta nada
  await nuevoEvento('UI alquiler 150' + sufijo, 150)
  await aRequerimientos(); await pestana('Mobiliario')
  const e150 = (await api('/inventario')).cuerpo.find((x) => x.nombre === 'Mesas 150' + sufijo)
  await page.selectOption('#mobiliario-elemento', String(e150.id)); await page.fill('#mobiliario-cantidad', '150')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.waitForTimeout(400)
  igual(await page.getByText(/Hay que alquilar/).count(), 0, 'avisa alquiler sin faltar nada:')
  cierto(/Propio/.test(await page.locator('li', { hasText: e150.nombre }).first().innerText()), 'no figura como propio')
})



// ============ Corrección: servicios (RN-18) y fecha pasada en la pantalla ============
grupo = 'Cor. servicios RN-18 y fecha pasada (pantalla)'
const ayerLocal = () => { const d = new Date(Date.now() - 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const agregarServicio = async ({ tipo = 'dj', descripcion = 'DJ prueba', unidades, horas }) => {
  await page.selectOption('#servicio-tipo', tipo); await page.fill('#servicio-descripcion', descripcion)
  if (unidades !== undefined) await page.fill('#servicio-cantidad', String(unidades))
  if (horas !== undefined) await page.fill('#servicio-horas', String(horas))
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
}

await t('Fecha de ayer escrita a mano: muestra el error y no deja pasar al paso 2', async () => {
  await nuevoEvento('Fecha ayer' + sufijo, 100)
  await page.fill('input[type=date]', ayerLocal())
  await page.getByRole('button', { name: /^Siguiente/ }).click()
  await page.waitForSelector('text=no se puede registrar un evento en el pasado')
  igual(await page.getByRole('tab', { name: /Alimentos/ }).count(), 0, 'avanzó al paso 2:')
})
await t('Fecha de hace un año y de dentro de 10 años también se bloquean; la de hoy no', async () => {
  const hoy = new Date(); const iso = (y) => `${y}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  await page.fill('input[type=date]', iso(hoy.getFullYear() - 1)); await page.getByRole('button', { name: /^Siguiente/ }).click()
  await page.waitForSelector('text=no se puede registrar un evento en el pasado')
  await page.fill('input[type=date]', iso(hoy.getFullYear() + 10)); await page.getByRole('button', { name: /^Siguiente/ }).click()
  await page.waitForSelector('text=no puede ser más de 5 años en el futuro')
  await page.fill('input[type=date]', fechaLibre()); await page.getByRole('button', { name: /^Siguiente/ }).click()
  await page.getByRole('tab', { name: /Alimentos/ }).waitFor()
})
await t('Servicios: unidades 0 y 6 se rechazan; 1 y 5 se aceptan (5 en «Otro», que admite hasta 5)', async () => {
  await pestana('Servicios')
  for (const u of ['0', '6', '2,5', '-1']) {
    await page.selectOption('#servicio-tipo', 'dj'); await page.fill('#servicio-descripcion', 'DJ prueba'); await page.fill('#servicio-cantidad', u)
    await page.waitForSelector('text=Las unidades deben ser un número entero de 1 a 5')
    await page.getByRole('button', { name: 'Agregar', exact: true }).click()
    igual(await page.getByText('Todavía no has agregado servicios adicionales').count(), 1, `se agregó con ${u} unidades:`)
  }
  await agregarServicio({ descripcion: 'DJ una unidad', unidades: 1, horas: 3 })
  await page.waitForSelector('text=DJ una unidad')
  await agregarServicio({ tipo: 'otro', descripcion: 'Otro cinco', unidades: 5, horas: 3 })
  await page.waitForSelector('text=Otro cinco')
})
await t('Servicios: horas mayores a la duración se rechazan; iguales se aceptan', async () => {
  // el evento dura 5 horas (nuevoEvento)
  await page.selectOption('#servicio-tipo', 'dj'); await page.fill('#servicio-descripcion', 'DJ largo'); await page.fill('#servicio-cantidad', '1')
  await page.fill('#servicio-horas', '6')
  await page.waitForSelector('text=Las horas no pueden superar la duración del evento (5 h)')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  igual(await page.getByText('DJ largo').count(), 0, 'se agregó el servicio largo:')
  await page.fill('#servicio-horas', '300'); await page.waitForSelector('text=Las horas no pueden superar la duración del evento')
  await page.fill('#servicio-horas', '5')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.waitForSelector('text=DJ largo')
})
await t('Si se reduce la duración por debajo de las horas de un servicio, el sistema avisa y no deja continuar', async () => {
  await page.getByRole('button', { name: 'Atrás' }).click()
  await page.fill('#duracion', '3')
  await page.waitForSelector('text=estos servicios ya no caben')
  await page.getByRole('button', { name: /^Siguiente/ }).click()
  await page.getByRole('tab', { name: /Servicios/ }).waitFor()
  await page.waitForSelector('text=Hay servicios que duran más que el evento (3 h)')
  await page.getByRole('button', { name: /^Siguiente/ }).click()
  await page.waitForSelector('text=No se puede continuar')
  igual(await page.getByRole('button', { name: 'Guardar evento' }).count(), 0, 'llegó al resumen:')
  // corregir: quitar el servicio que no cabe y ya se puede continuar
  await pestana('Servicios')
  await page.getByRole('button', { name: /Quitar DJ: DJ largo/ }).click()
  await page.getByRole('button', { name: /^Siguiente/ }).click()
  await page.getByRole('button', { name: 'Guardar evento' }).waitFor()
})
await t('El detalle del evento muestra las unidades y las horas del servicio', async () => {
  await page.getByRole('button', { name: 'Guardar evento' }).click()
  await page.waitForURL('**/eventos?evento=*')
  const id = Number(new globalThis.URL(page.url()).searchParams.get('evento'))
  const d = (await api(`/eventos/${id}`)).cuerpo
  const dj = d.servicios_adicionales.find((x) => x.descripcion === 'DJ una unidad')
  igual(dj.cantidad, 1, 'unidades:'); igual(Number(dj.horas), 3, 'horas:')
  const otro = d.servicios_adicionales.find((x) => x.descripcion === 'Otro cinco')
  igual(otro.cantidad, 5, 'unidades otro:')
  await page.waitForSelector('text=Otro cinco')
  cierto(/5 und/.test(await page.locator('body').innerText()), 'el detalle no muestra «5 und»')
})


await t('COR-06 pantalla: 4 DJs y 6 horas se rechazan; el tope de DJs cuenta todas las líneas', async () => {
  await nuevoEvento('Tope servicios' + sufijo, 100)
  await page.fill('#duracion', '8')
  await aRequerimientos()
  await pestana('Servicios')
  // horas: el evento dura 8 h pero un servicio admite hasta 5
  await page.selectOption('#servicio-tipo', 'dj'); await page.fill('#servicio-descripcion', 'DJ largo'); await page.fill('#servicio-horas', '6')
  await page.waitForSelector('text=Las horas de un servicio van de 1 a 5')
  await page.fill('#servicio-horas', '0,5'); await page.waitForSelector('text=Las horas de un servicio van de 1 a 5')
  // unidades: más de 3 DJs en una línea
  await page.fill('#servicio-horas', '4'); await page.fill('#servicio-cantidad', '4')
  await page.waitForSelector('text=Un evento admite máximo 3 de «DJ»')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  igual(await page.getByText('Todavía no has agregado servicios adicionales').count(), 1, 'se agregaron 4 DJs:')
  // 2 DJs y luego 2 más: el segundo grupo ya no cabe, solo queda 1
  await page.fill('#servicio-cantidad', '2'); await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.waitForSelector('text=DJ largo')
  await page.selectOption('#servicio-tipo', 'dj'); await page.fill('#servicio-descripcion', 'DJ otro'); await page.fill('#servicio-cantidad', '2')
  await page.waitForSelector('text=solo puedes agregar 1 más')
  await page.fill('#servicio-cantidad', '1'); await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.waitForSelector('text=DJ otro')
  // ya están los 3: un DJ más se avisa de inmediato
  await page.selectOption('#servicio-tipo', 'dj'); await page.fill('#servicio-descripcion', 'DJ cuarto'); await page.fill('#servicio-cantidad', '1')
  await page.waitForSelector('text=Ya agregaste el máximo de «DJ» para un evento (3)')
  // las horas que propone el formulario no pasan de 5 aunque el evento dure 8
  await page.selectOption('#servicio-tipo', 'sonido')
  igual(await page.inputValue('#servicio-horas'), '5', 'horas por defecto:')
})


// ============ HU-21 · Calcular meseros (RF-28, RN-04, RN-12) ============
grupo = 'HU-21 Meseros (RF-28 / RN-04 / RN-12)'
const eventoMeseros = (asistentes, extra = {}) => api('/eventos', { method: 'POST', body: { nombre_evento: `Meseros ${asistentes}` + sufijo, fecha_evento: fechaLibre(), tipo_evento: 'Boda', duracion_horas: 5, asistentes, ...extra } })
const meserosEsperados = (a) => Math.floor((a + 19) / 20) // techo de a / 20 con enteros

await t('API: 1 mesero por cada 20 asistentes, redondeado hacia arriba (45 → 3, 60 → 3, 40 → 2, 41 → 3, 600 → 30)', async () => {
  for (const [asistentes, esperado] of [[40, 2], [41, 3], [45, 3], [60, 3], [100, 5], [300, 15], [301, 16], [599, 30], [600, 30]]) {
    const r = await eventoMeseros(asistentes)
    igual(r.estado, 201, `${asistentes} asistentes:`)
    const d = (await api(`/eventos/${r.cuerpo.evento.id}`)).cuerpo
    igual(d.logistica.meseros_requeridos, esperado, `${asistentes} asistentes:`)
    igual(esperado, meserosEsperados(asistentes), `control del esperado para ${asistentes}:`)
  }
})
await t('API: el detalle trae la relación y el dato queda dentro del evento (logistica)', async () => {
  const r = await eventoMeseros(45)
  const d = (await api(`/eventos/${r.cuerpo.evento.id}`)).cuerpo
  igual(d.logistica.asistentes_por_mesero, 20, 'asistentes por mesero:')
  igual(d.logistica.relacion_meseros, '1 por cada 20 asistentes', 'relación:')
  igual(d.logistica.meseros_requeridos, 3, 'meseros:')
})
await t('Registro (paso 1): la vista previa calcula los meseros en vivo (45 → 3) y no muestra nada con asistentes fuera de rango', async () => {
  await nuevoEvento('Vista meseros' + sufijo, 45)
  const fila = page.locator('dl > div').filter({ hasText: /^Meseros/ })
  await page.waitForFunction(() => [...document.querySelectorAll('dl > div')].some((d) => /^Meseros/.test(d.textContent) && /3$/.test(d.textContent.trim())))
  cierto(/3/.test(await fila.innerText()), 'no muestra 3 con 45 asistentes')
  await page.getByLabel('Número de asistentes').fill('61')
  await page.waitForFunction(() => [...document.querySelectorAll('dl > div')].some((d) => /^Meseros/.test(d.textContent) && /4$/.test(d.textContent.trim())))
  await page.getByLabel('Número de asistentes').fill('30')
  await page.waitForFunction(() => [...document.querySelectorAll('dl > div')].some((d) => /^Meseros/.test(d.textContent) && /—$/.test(d.textContent.trim())))
  await page.getByLabel('Número de asistentes').fill('45')
})
await t('Registro (paso 3): el resumen muestra los meseros requeridos antes de guardar', async () => {
  await aRequerimientos()
  await page.getByRole('button', { name: /^Siguiente/ }).click()
  await page.getByRole('button', { name: 'Guardar evento' }).waitFor()
  const txt = await page.locator('main').innerText()
  cierto(/Meseros requeridos\s*3 \(1 por cada 20 asistentes\)/.test(txt.replace(/\n/g, ' ')), 'el resumen no muestra «Meseros requeridos 3 (1 por cada 20 asistentes)»')
})
await t('Detalle del evento: muestra los meseros con la cuenta (45 ÷ 20 = 2,25 → redondea hacia arriba a 3) y coincide con la API', async () => {
  await page.getByRole('button', { name: 'Guardar evento' }).click()
  await page.waitForURL('**/eventos?evento=*')
  const id = Number(new globalThis.URL(page.url()).searchParams.get('evento'))
  await page.waitForSelector('[aria-label="Meseros requeridos"]')
  igual((await page.locator('[aria-label="Meseros requeridos"]').innerText()).trim(), '3', 'valor en pantalla:')
  igual((await api(`/eventos/${id}`)).cuerpo.logistica.meseros_requeridos, 3, 'valor de la API:')
  const txt = (await page.locator('main').innerText()).replace(/\s+/g, ' ')
  cierto(txt.includes('45 ÷ 20 = 2,25 → se redondea hacia arriba a 3'), 'sin la cuenta explicada')
  cierto(txt.includes('Meseros requeridos · 1 por cada 20 asistentes'), 'sin la relación')
})
await t('Detalle del evento: un múltiplo exacto (60 asistentes) muestra 3 sin redondeo', async () => {
  const r = await eventoMeseros(60)
  await page.goto(`${URL}/eventos?evento=${r.cuerpo.evento.id}`)
  await page.waitForSelector('[aria-label="Meseros requeridos"]')
  igual((await page.locator('[aria-label="Meseros requeridos"]').innerText()).trim(), '3')
  cierto((await page.locator('main').innerText()).replace(/\s+/g, ' ').includes('60 ÷ 20 = 3'), 'sin «60 ÷ 20 = 3»')
})


// ============ HU-22 · Calcular cocineros (RF-29, RN-05, RN-12) ============
grupo = 'HU-22 Cocineros (RF-29 / RN-05 / RN-12)'
const eventoCocineros = (asistentes, extra = {}) => api('/eventos', { method: 'POST', body: { nombre_evento: `Cocineros ${asistentes}` + sufijo, fecha_evento: fechaLibre(), tipo_evento: 'Boda', duracion_horas: 5, asistentes, ...extra } })
const cocinerosEsperados = (a) => Math.floor((a + 24) / 25) * 2 // techo de a / 25 con enteros, por 2
const cocinerosDe = async (r) => (await api(`/eventos/${r.cuerpo.evento.id}`)).cuerpo.logistica

await t('API: 2 cocineros por cada 25 asistentes, redondeado hacia arriba (40 → 4, 50 → 4, 51 → 6, 100 → 8, 200 → 16, 320 → 26, 600 → 48)', async () => {
  for (const [asistentes, esperado] of [[40, 4], [50, 4], [51, 6], [100, 8], [200, 16], [300, 24], [301, 26], [320, 26], [599, 48], [600, 48]]) {
    const r = await eventoCocineros(asistentes)
    igual(r.estado, 201, `${asistentes} asistentes:`)
    igual((await cocinerosDe(r)).cocineros_requeridos, esperado, `${asistentes} asistentes:`)
    igual(esperado, cocinerosEsperados(asistentes), `control del esperado para ${asistentes}:`)
  }
})
await t('API: el detalle trae la relación (2 por cada 25 asistentes) dentro de logistica', async () => {
  const l = await cocinerosDe(await eventoCocineros(100))
  igual(l.asistentes_por_grupo_cocina, 25, 'asistentes por grupo:'); igual(l.cocineros_por_grupo, 2, 'cocineros por grupo:')
  igual(l.relacion_cocineros, '2 por cada 25 asistentes', 'relación:'); igual(l.cocineros_requeridos, 8, 'cocineros:')
  igual(l.meseros_requeridos, 5, 'los meseros no cambian:')
})
await t('API: no depende del tipo de evento ni de la comida (40 asistentes → 4 en todos)', async () => {
  const alimento = (await api('/catalogo?clasificacion=alimento')).cuerpo[0]
  const variantes = [
    { tipo_evento: 'Boda' }, { tipo_evento: 'Corporativo' }, { tipo_evento: 'Gala' }, { tipo_evento: 'Cumpleaños' }, { tipo_evento: 'Otro' },
    { tipo_evento: 'Boda', productos: [{ producto_id: alimento.id, porcion_por_persona: 150, componentes_menu: 'Buffet' }] },
    { tipo_evento: 'Boda', productos: [{ producto_id: alimento.id, porcion_por_persona: 40, componentes_menu: 'Snacks ligeros' }] },
  ]
  for (const v of variantes) {
    const r = await eventoCocineros(40, v)
    igual(r.estado, 201, `${JSON.stringify(v).slice(0, 60)}:`)
    igual((await cocinerosDe(r)).cocineros_requeridos, 4, `${JSON.stringify(v).slice(0, 60)}:`)
  }
})
await t('API: un evento buffet de más de 300 asistentes usa la misma regla (320 → 26)', async () => {
  const r = await eventoCocineros(320)
  const d = (await api(`/eventos/${r.cuerpo.evento.id}`)).cuerpo
  igual(d.es_modalidad_buffet, true, 'es buffet:'); igual(d.logistica.cocineros_requeridos, 26, 'cocineros:')
})
await t('Registro (paso 1): la vista previa calcula los cocineros en vivo (45 → 4, 51 → 6) y no muestra nada con asistentes fuera de rango', async () => {
  await nuevoEvento('Vista cocineros' + sufijo, 45)
  const espera = (re) => page.waitForFunction((r) => [...document.querySelectorAll('dl > div')].some((d) => /^Cocineros/.test(d.textContent) && new RegExp(r).test(d.textContent.trim())), re.source)
  await espera(/4$/)
  await page.getByLabel('Número de asistentes').fill('51'); await espera(/6$/)
  await page.getByLabel('Número de asistentes').fill('100'); await espera(/8$/)
  await page.getByLabel('Número de asistentes').fill('30'); await espera(/—$/)
  await page.getByLabel('Número de asistentes').fill('45'); await espera(/4$/)
})
await t('Registro (paso 3): el resumen muestra los cocineros requeridos antes de guardar', async () => {
  await aRequerimientos()
  await page.getByRole('button', { name: /^Siguiente/ }).click()
  await page.getByRole('button', { name: 'Guardar evento' }).waitFor()
  const txt = (await page.locator('main').innerText()).replace(/\n/g, ' ')
  cierto(/Cocineros requeridos\s*4 \(2 por cada 25 asistentes\)/.test(txt), 'el resumen no muestra «Cocineros requeridos 4 (2 por cada 25 asistentes)»')
})
await t('Detalle del evento: muestra los cocineros con la cuenta (45 ÷ 25 = 1,8 → redondea hacia arriba a 2 grupos × 2 = 4) y coincide con la API', async () => {
  await page.getByRole('button', { name: 'Guardar evento' }).click()
  await page.waitForURL('**/eventos?evento=*')
  const id = Number(new globalThis.URL(page.url()).searchParams.get('evento'))
  await page.waitForSelector('[aria-label="Cocineros requeridos"]')
  igual((await page.locator('[aria-label="Cocineros requeridos"]').innerText()).trim(), '4', 'valor en pantalla:')
  igual((await api(`/eventos/${id}`)).cuerpo.logistica.cocineros_requeridos, 4, 'valor de la API:')
  const txt = (await page.locator('main').innerText()).replace(/\s+/g, ' ')
  cierto(txt.includes('45 ÷ 25 = 1,8 → se redondea hacia arriba a 2 grupos × 2 = 4 cocineros'), 'sin la cuenta explicada')
  cierto(txt.includes('Cocineros requeridos · 2 por cada 25 asistentes'), 'sin la relación')
})
await t('Detalle del evento: múltiplo exacto (100 → 8) y buffet (320 → 26) con el mismo cálculo', async () => {
  const exacto = await eventoCocineros(100)
  await page.goto(`${URL}/eventos?evento=${exacto.cuerpo.evento.id}`)
  await page.waitForSelector('[aria-label="Cocineros requeridos"]')
  igual((await page.locator('[aria-label="Cocineros requeridos"]').innerText()).trim(), '8')
  cierto((await page.locator('main').innerText()).replace(/\s+/g, ' ').includes('100 ÷ 25 = 4 grupos × 2 = 8 cocineros'), 'sin «100 ÷ 25 = 4 grupos × 2 = 8»')
  const buffet = await eventoCocineros(320)
  await page.goto(`${URL}/eventos?evento=${buffet.cuerpo.evento.id}`)
  await page.waitForFunction(() => document.querySelector('[aria-label="Cocineros requeridos"]')?.textContent.trim() === '26')
  cierto((await page.locator('main').innerText()).replace(/\s+/g, ' ').includes('320 ÷ 25 = 12,8 → se redondea hacia arriba a 13 grupos × 2 = 26 cocineros'), 'sin la cuenta de 320')
})


// ============ HU-46 · Recetas de platos (RF-54) ============
grupo = 'HU-46 Recetas de platos (RF-54)'
const nuevoPlato = async (nombre) => (await api('/catalogo', { method: 'POST', body: { nombre, clasificacion: 'alimento', tipo_calculo: 'porcion_persona', porcion_por_persona: 100, precio_unitario: 1000 } })).cuerpo
const ing = (nombre, o = {}) => ({ nombre_ingrediente: nombre, unidad_compra: 'kilo', cantidad_porcion: 80, unidad_porcion: 'gramo', ...o })
const guardarReceta = (id, ingredientes) => api(`/catalogo/${id}/receta`, { method: 'PUT', body: { ingredientes } })
const verReceta = async (id) => (await api(`/catalogo/${id}/receta`)).cuerpo
const PLATO_API = await nuevoPlato('Plato receta API' + sufijo)
const NOMBRE_ING = (n) => `${n} QA${sufijo}`

await t('Datos de prueba (escenario 3): el «Arroz verde con almendras» trae exactamente 3 ingredientes (arroz 80 g / kilo, almendras 15 g / libra, cilantro 10 g / libra)', async () => {
  const resumen = (await api('/catalogo/recetas')).cuerpo
  const arroz = resumen.find((p) => p.plato.toLowerCase() === 'arroz verde con almendras')
  cierto(arroz, 'no existe el plato «Arroz verde con almendras»')
  const r = await verReceta(arroz.plato_id)
  igual(r.receta.length, 3, 'ingredientes:'); igual(r.es_dato_prueba, true, 'marcado como dato de prueba:')
  const dato = (n) => r.receta.find((x) => x.ingrediente === n)
  for (const [n, cant, compra] of [['Arroz', 80, 'kilo'], ['Almendras', 15, 'libra'], ['Cilantro', 10, 'libra']]) {
    igual(dato(n)?.cantidad_porcion, cant, `${n} cantidad:`); igual(dato(n)?.unidad_porcion, 'gramo', `${n} unidad:`); igual(dato(n)?.unidad_compra, compra, `${n} compra:`)
  }
})
await t('Datos de prueba: «Pechuga a la plancha» (pechuga de pollo 200 g / kilo) y «Papa salada» (papa 150 g / arroba)', async () => {
  const resumen = (await api('/catalogo/recetas')).cuerpo
  for (const [plato, ingrediente, cant, compra] of [['pechuga a la plancha', 'Pechuga de pollo', 200, 'kilo'], ['papa salada', 'Papa', 150, 'arroba']]) {
    const p = resumen.find((x) => x.plato.toLowerCase() === plato); cierto(p, `no existe ${plato}`)
    const r = await verReceta(p.plato_id)
    igual(r.receta.length, 1, `${plato} ingredientes:`); igual(r.receta[0].ingrediente, ingrediente); igual(r.receta[0].cantidad_porcion, cant); igual(r.receta[0].unidad_compra, compra)
  }
})
await t('Registrar la receta de un plato (escenario 1): 200 con cantidad, unidad de porción y unidad de compra; se puede consultar', async () => {
  const r = await guardarReceta(PLATO_API.id, [ing(NOMBRE_ING('Papa'), { unidad_compra: 'arroba', cantidad_porcion: 150 })])
  igual(r.estado, 200, 'estado:'); igual(r.cuerpo.plato_id, PLATO_API.id); igual(r.cuerpo.plato, PLATO_API.nombre)
  igual(r.cuerpo.es_dato_prueba, false, 'es_dato_prueba:')
  const l = r.cuerpo.receta[0]
  igual(l.ingrediente, NOMBRE_ING('Papa')); igual(l.cantidad_porcion, 150); igual(l.unidad_porcion, 'gramo'); igual(l.unidad_compra, 'arroba')
  igual(JSON.stringify((await verReceta(PLATO_API.id)).receta), JSON.stringify(r.cuerpo.receta), 'GET igual al PUT:')
})
await t('Un plato sin receta responde 200 con la lista vacía', async () => {
  const p = await nuevoPlato('Plato sin receta' + sufijo)
  const r = await api(`/catalogo/${p.id}/receta`)
  igual(r.estado, 200); igual(r.cuerpo.receta.length, 0); igual(r.cuerpo.es_dato_prueba, false)
})
await t('Editar la receta: la nueva reemplaza a la anterior (varios ingredientes, cantidades con decimales)', async () => {
  const r = await guardarReceta(PLATO_API.id, [
    ing(NOMBRE_ING('Arroz'), { cantidad_porcion: 80 }),
    ing(NOMBRE_ING('Azafrán'), { unidad_compra: 'gramo', cantidad_porcion: 0.5 }),
    ing(NOMBRE_ING('Aceite'), { unidad_compra: 'libra', cantidad_porcion: 1.25, unidad_porcion: 'libra' }),
  ])
  igual(r.estado, 200); igual(r.cuerpo.receta.length, 3, 'ingredientes:')
  igual(r.cuerpo.receta[1].cantidad_porcion, 0.5, 'decimal:'); igual(r.cuerpo.receta[2].unidad_porcion, 'libra', 'unidad porción:')
  cierto(!(await verReceta(PLATO_API.id)).receta.some((x) => x.ingrediente === NOMBRE_ING('Papa')), 'la papa anterior sigue en la receta')
})
await t('Las unidades de la historia (GRAM, KILO, POUND, ARROBA), el plural y las abreviaturas también se aceptan', async () => {
  const p = await nuevoPlato('Plato unidades' + sufijo)
  const r = await guardarReceta(p.id, [
    ing(NOMBRE_ING('U1'), { unidad_compra: 'KILO', unidad_porcion: 'GRAM' }), ing(NOMBRE_ING('U2'), { unidad_compra: 'POUND', unidad_porcion: 'g' }),
    ing(NOMBRE_ING('U3'), { unidad_compra: 'ARROBA', unidad_porcion: 'Gramos' }), ing(NOMBRE_ING('U4'), { unidad_compra: 'libras', unidad_porcion: 'KG', cantidad_porcion: 0.1 }),
  ])
  igual(r.estado, 200); igual(r.cuerpo.receta.map((x) => x.unidad_compra).join(), 'kilo,libra,arroba,libra', 'compra:'); igual(r.cuerpo.receta[3].unidad_porcion, 'kilo', 'KG:')
})
await t('Unidades no permitidas (escenario 2): LITROS, PAQUETES y otras dan 400 diciendo que solo son gramos, kilos, libras o arrobas', async () => {
  for (const mala of ['LITROS', 'PAQUETES', 'ml', 'onza', '', null, 5]) {
    for (const campo of ['unidad_compra', 'unidad_porcion']) {
      const r = await guardarReceta(PLATO_API.id, [ing(NOMBRE_ING('Mala'), { [campo]: mala })])
      igual(r.estado, 400, `${campo}=${mala}:`)
      cierto(/solo gramos, kilos, libras o arrobas/.test(r.cuerpo.detalle), `mensaje de ${campo}=${mala}: ${r.cuerpo.detalle}`)
    }
  }
})
await t('La cantidad por porción debe ser mayor a 0: 0, negativos, texto, vacío, más de 3 decimales y más de 1 kg dan 400', async () => {
  for (const [mala, motivo] of [[0, 'cero'], [-1, 'negativo'], ['80', 'texto'], [null, 'nulo'], [12.3456, '4 decimales'], [1001, 'más de 1000 g'], [2, 'kilos de más (con kilo)']]) {
    const r = await guardarReceta(PLATO_API.id, [ing(NOMBRE_ING('Cant'), { cantidad_porcion: mala, ...(motivo.includes('kilos') ? { unidad_porcion: 'kilo' } : {}) })])
    igual(r.estado, 400, `${motivo}:`)
  }
  igual((await guardarReceta(PLATO_API.id, [ing(NOMBRE_ING('Cant'), { cantidad_porcion: 1000 })])).estado, 200, '1000 g (límite exacto):')
  igual((await guardarReceta(PLATO_API.id, [ing(NOMBRE_ING('Cant'), { cantidad_porcion: 0.001 })])).estado, 200, '0,001 (mínimo con 3 decimales):')
})
await t('La receta necesita al menos un ingrediente (máximo 30), una lista válida y nombres sin repetir', async () => {
  for (const cuerpo of [{ ingredientes: [] }, {}, { ingredientes: 'x' }, { ingredientes: [null] }, { ingredientes: [5] }]) {
    igual((await api(`/catalogo/${PLATO_API.id}/receta`, { method: 'PUT', body: cuerpo })).estado, 400, JSON.stringify(cuerpo) + ':')
  }
  igual((await guardarReceta(PLATO_API.id, Array.from({ length: 31 }, (_, i) => ing(NOMBRE_ING(`Mucho${i}`))))).estado, 400, '31 ingredientes:')
  igual((await guardarReceta(PLATO_API.id, Array.from({ length: 30 }, (_, i) => ing(NOMBRE_ING(`Treinta${i}`), { cantidad_porcion: 10 })))).estado, 200, '30 ingredientes:')
  for (const [a, b] of [['Pimentón', 'pimenton'], ['Sal', ' sal '], ['Pechuga de pollo', 'PECHUGA  DE POLLO']]) {
    const r = await guardarReceta(PLATO_API.id, [ing(NOMBRE_ING(a)), ing(NOMBRE_ING(b))])
    igual(r.estado, 400, `${a}/${b}:`)
  }
  for (const nombre of ['', '   ', 'x'.repeat(101)]) igual((await guardarReceta(PLATO_API.id, [ing(nombre)])).estado, 400, `nombre «${nombre.slice(0, 5)}…»:`)
})
await t('Un guardado inválido no cambia nada: la receta anterior sigue intacta (todo o nada)', async () => {
  const p = await nuevoPlato('Plato atómico' + sufijo)
  igual((await guardarReceta(p.id, [ing(NOMBRE_ING('Bueno'))])).estado, 200)
  const r = await guardarReceta(p.id, [ing(NOMBRE_ING('Nuevo')), ing(NOMBRE_ING('Malo'), { unidad_compra: 'LITROS' })])
  igual(r.estado, 400)
  const despues = await verReceta(p.id)
  igual(despues.receta.length, 1); igual(despues.receta[0].ingrediente, NOMBRE_ING('Bueno'))
  cierto(!(await api('/catalogo/ingredientes')).cuerpo.some((x) => x.nombre === NOMBRE_ING('Nuevo')), 'se creó un ingrediente de un guardado rechazado')
})
await t('Plato inexistente: 404; id con texto, cero o negativo: 400; una bebida o un elemento del inventario no tienen receta', async () => {
  igual((await api('/catalogo/99999999/receta')).estado, 404); igual((await guardarReceta(99999999, [ing('X')])).estado, 404)
  for (const id of ['abc', '0', '-3', '1.5', '99999999999']) igual((await api(`/catalogo/${id}/receta`)).estado, 400, `id ${id}:`)
  const bebida = (await api('/catalogo?clasificacion=bebida_general')).cuerpo[0]
  const r = await guardarReceta(bebida.id, [ing('Agua')])
  igual(r.estado, 400); cierto(/Solo los alimentos/.test(r.cuerpo.detalle), 'mensaje de bebida')
  const elemento = (await api('/inventario')).cuerpo[0]
  igual((await api(`/catalogo/${elemento.id}/receta`)).estado, 404, 'elemento de inventario:')
})
await t('La unidad de compra es del ingrediente: otra receta que ya lo compra distinto da 409; si solo lo usa esta receta, se corrige', async () => {
  const a = await nuevoPlato('Plato compra A' + sufijo), b = await nuevoPlato('Plato compra B' + sufijo)
  const harina = NOMBRE_ING('Harina')
  igual((await guardarReceta(a.id, [ing(harina, { unidad_compra: 'kilo' })])).estado, 200)
  const conflicto = await guardarReceta(b.id, [ing(harina.toUpperCase(), { unidad_compra: 'libra' })])
  igual(conflicto.estado, 409, 'otra receta con libra:'); cierto(/ya se compra por kilos/.test(conflicto.cuerpo.detalle), conflicto.cuerpo.detalle)
  igual((await verReceta(b.id)).receta.length, 0, 'la receta B quedó vacía:')
  const igualUnidad = await guardarReceta(b.id, [ing(harina.toLowerCase(), { unidad_compra: 'kilo', cantidad_porcion: 30 })])
  igual(igualUnidad.estado, 200, 'misma unidad:'); igual(igualUnidad.cuerpo.receta[0].ingrediente, harina, 'conserva el nombre del maestro:')
  // solo A usa «Solo A»: se puede corregir su unidad
  const solo = NOMBRE_ING('Solo A')
  await guardarReceta(a.id, [ing(solo, { unidad_compra: 'kilo' })])
  const corregido = await guardarReceta(a.id, [ing(solo, { unidad_compra: 'arroba' })])
  igual(corregido.estado, 200, 'corregir unidad propia:'); igual(corregido.cuerpo.receta[0].unidad_compra, 'arroba')
  const maestro = (await api('/catalogo/ingredientes')).cuerpo.find((x) => x.nombre === harina)
  igual(maestro.platos, 1, 'platos que lo usan (solo B; A pasó a «Solo A»):'); igual(maestro.unidad_compra, 'kilo')
})
await t('Guardados simultáneos: 12 a la vez sobre el mismo plato terminan con UNA receta completa (sin mezclas ni errores)', async () => {
  const p = await nuevoPlato('Plato concurrente' + sufijo)
  const rs = await Promise.all(Array.from({ length: 12 }, (_, i) => guardarReceta(p.id, [ing(NOMBRE_ING(`Conc${i}`), { cantidad_porcion: i + 1 }), ing(NOMBRE_ING(`Conc${i}b`), { cantidad_porcion: i + 1 })])))
  igual(rs.filter((r) => r.estado === 200).length, 12, 'respuestas 200:')
  const final = await verReceta(p.id)
  igual(final.receta.length, 2, 'ingredientes:'); igual(final.receta[0].cantidad_porcion, final.receta[1].cantidad_porcion, 'las dos líneas son del mismo guardado:')
})
await t('El mismo ingrediente nuevo creado a la vez desde varios platos queda una sola vez en el maestro', async () => {
  const platos = await Promise.all(Array.from({ length: 8 }, (_, i) => nuevoPlato(`Plato carrera ${i}` + sufijo)))
  const nombre = NOMBRE_ING('Carrera')
  const rs = await Promise.all(platos.map((p, i) => guardarReceta(p.id, [ing(i % 2 ? nombre.toUpperCase() : nombre)])))
  igual(rs.filter((r) => r.estado === 500).length, 0, 'errores 500:'); igual(rs.filter((r) => r.estado === 200).length, 8, 'respuestas 200:')
  igual((await api('/catalogo/ingredientes')).cuerpo.filter((x) => x.nombre.toLowerCase() === nombre.toLowerCase()).length, 1, 'copias en el maestro:')
})
await t('Sin sesión no se ve ni se guarda ninguna receta (401)', async () => {
  const sin = (ruta, op = {}) => fetch(`${API}${ruta}`, { headers: { 'Content-Type': 'application/json' }, ...op }).then((r) => r.status)
  igual(await sin(`/catalogo/${PLATO_API.id}/receta`), 401); igual(await sin('/catalogo/recetas'), 401); igual(await sin('/catalogo/ingredientes'), 401)
  igual(await sin(`/catalogo/${PLATO_API.id}/receta`, { method: 'PUT', body: JSON.stringify({ ingredientes: [ing('X')] }) }), 401)
})

// --- Pantalla: Catálogo → Recetas de Platos
const PLATO_UI = await nuevoPlato('Plato receta UI' + sufijo)
const abrirRecetas = async () => {
  await page.goto(`${URL}/catalogo`)
  await page.getByRole('button', { name: 'Recetas de Platos' }).click()
  await page.getByRole('list', { name: 'Platos del catálogo' }).waitFor()
}
const elegirPlato = async (nombre) => {
  await page.getByRole('button', { name: new RegExp(nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first().click()
  await page.getByRole('heading', { name: new RegExp(`Receta de «${nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}»`) }).waitFor()
}
await t('Pantalla: la pestaña «Recetas de Platos» lista los platos con su estado (3 ingredientes, «Datos de prueba», «Sin receta»)', async () => {
  await abrirRecetas()
  const lista = (await page.getByRole('list', { name: 'Platos del catálogo' }).innerText()).replace(/\s+/g, ' ')
  cierto(/Arroz Verde con Almendras 3 ingredientes Datos de prueba/i.test(lista), 'falta el arroz con 3 ingredientes y «Datos de prueba»: ' + lista.slice(0, 200))
  cierto(/Papa salada 1 ingrediente Datos de prueba/i.test(lista), 'falta la papa salada')
  cierto(/Plato receta UI.* Sin receta/.test(lista), 'falta «Sin receta» en el plato nuevo')
})
await t('Pantalla: el buscador filtra los platos por nombre y avisa cuando ninguno coincide', async () => {
  await page.fill('#buscar-plato', 'papa sal')
  await page.waitForFunction(() => document.querySelectorAll('ul[aria-label="Platos del catálogo"] > li').length === 1)
  cierto(/Papa salada/.test(await page.getByRole('list', { name: 'Platos del catálogo' }).innerText()), 'no quedó «Papa salada»')
  await page.fill('#buscar-plato', 'zzzz-no-existe'); await page.waitForSelector('text=Ningún plato coincide con la búsqueda')
  await page.fill('#buscar-plato', '')
})
await t('Pantalla: abrir una receta de ejemplo muestra sus ingredientes, la cantidad, la unidad, cómo se compra y el aviso de dato de prueba', async () => {
  await elegirPlato('Arroz Verde con Almendras')
  await page.waitForSelector('text=dato de prueba')
  const ol = page.getByRole('list', { name: 'Ingredientes de la receta' })
  igual(await ol.locator('li').count(), 3, 'filas:')
  igual(await page.locator('#rec-nombre-0').inputValue(), 'Arroz'); igual(await page.locator('#rec-cantidad-0').inputValue(), '80')
  igual(await page.locator('#rec-unidad-0').inputValue(), 'gramo'); igual(await page.locator('#rec-compra-0').inputValue(), 'kilo')
  igual(await page.locator('#rec-compra-1').inputValue(), 'libra', 'almendras se compran por libra:')
})
await t('Pantalla: registrar la receta de un plato nuevo (ingrediente, cantidad, unidad, compra) y verla guardada al volver', async () => {
  await elegirPlato(PLATO_UI.nombre)
  await page.fill('#rec-nombre-0', NOMBRE_ING('Zanahoria')); await page.fill('#rec-cantidad-0', '120,5')
  await page.selectOption('#rec-compra-0', 'libra')
  await page.getByRole('button', { name: 'Agregar ingrediente' }).click()
  await page.fill('#rec-nombre-1', NOMBRE_ING('Mantequilla')); await page.fill('#rec-cantidad-1', '0,5'); await page.selectOption('#rec-unidad-1', 'libra'); await page.selectOption('#rec-compra-1', 'kilo')
  await page.waitForSelector('text=250 g')
  await page.getByRole('button', { name: 'Guardar receta' }).click()
  await page.waitForSelector(`text=Receta de «${PLATO_UI.nombre}» guardada: 2 ingredientes`)
  const r = await verReceta(PLATO_UI.id)
  igual(r.receta.length, 2); igual(r.receta[0].cantidad_porcion, 120.5, 'coma decimal:'); igual(r.receta[0].unidad_compra, 'libra'); igual(r.receta[1].unidad_porcion, 'libra'); igual(r.es_dato_prueba, false)
  await abrirRecetas()
  cierto(/Plato receta UI.* 2 ingredientes/.test((await page.getByRole('list', { name: 'Platos del catálogo' }).innerText()).replace(/\s+/g, ' ')), 'la lista no muestra 2 ingredientes')
})
await t('Pantalla: editar la receta (cambiar cantidad, quitar un ingrediente) muestra «Cambios sin guardar» y se guarda', async () => {
  await elegirPlato(PLATO_UI.nombre)
  await page.fill('#rec-cantidad-0', '100')
  await page.waitForSelector('text=Cambios sin guardar')
  await page.getByRole('button', { name: /Quitar el ingrediente 2/ }).click()
  await page.getByRole('button', { name: 'Guardar receta' }).click()
  await page.waitForSelector('text=guardada: 1 ingrediente')
  const r = await verReceta(PLATO_UI.id)
  igual(r.receta.length, 1); igual(r.receta[0].cantidad_porcion, 100)
  igual(await page.getByText('Cambios sin guardar').count(), 0, 'sigue el aviso de cambios:')
})
await t('Pantalla: «Descartar cambios» devuelve la receta guardada', async () => {
  await page.fill('#rec-cantidad-0', '999'); await page.waitForSelector('text=Cambios sin guardar')
  await page.getByRole('button', { name: 'Descartar cambios' }).click()
  igual(await page.locator('#rec-cantidad-0').inputValue(), '100')
})
await t('Pantalla: cantidad 0, negativa, con texto, con más de 3 decimales o de más de 1 kg se rechazan con su mensaje y no se guardan', async () => {
  const antes = JSON.stringify((await verReceta(PLATO_UI.id)).receta)
  for (const [valor, mensaje, unidad] of [['0', 'mayor a 0'], ['-5', 'mayor a 0'], ['abc', 'mayor a 0'], ['12,3456', 'Máximo 3 decimales'], ['1500', 'el máximo es 1.000 g'], ['2', 'el máximo es 1.000 g', 'kilo']]) {
    await page.selectOption('#rec-unidad-0', unidad || 'gramo')
    await page.fill('#rec-cantidad-0', valor)
    await page.waitForSelector(`text=${mensaje}`)
    await page.getByRole('button', { name: 'Guardar receta' }).click()
    await page.waitForSelector('text=Corrige los ingredientes marcados')
  }
  igual(JSON.stringify((await verReceta(PLATO_UI.id)).receta), antes, 'la receta cambió:')
  await page.getByRole('button', { name: 'Descartar cambios' }).click()
})
await t('Pantalla: ingrediente repetido o sin nombre se rechaza; no se puede dejar la receta sin ingredientes (la última fila no se quita)', async () => {
  await page.getByRole('button', { name: 'Agregar ingrediente' }).click()
  await page.fill('#rec-nombre-1', NOMBRE_ING('Zanahoria').toUpperCase()); await page.fill('#rec-cantidad-1', '10')
  await page.waitForSelector('text=está repetido')
  await page.getByRole('button', { name: 'Guardar receta' }).click()
  await page.waitForSelector('text=Corrige los ingredientes marcados')
  await page.fill('#rec-nombre-1', ''); await page.waitForSelector('text=Escribe el nombre del ingrediente')
  await page.getByRole('button', { name: /Quitar el ingrediente 2/ }).click()
  igual(await page.getByRole('button', { name: /Quitar el ingrediente 1/ }).isDisabled(), true, 'la única fila quedó habilitada para quitar:')
  igual(await page.getByText('Cambios sin guardar').count(), 0, 'quitar la fila nueva debía dejar la receta como estaba:')
})
await t('Pantalla: un ingrediente que otra receta ya compra se rellena con esa unidad de compra y no se puede cambiar', async () => {
  const otro = await nuevoPlato('Plato compra UI' + sufijo)
  await abrirRecetas(); await elegirPlato(otro.nombre)
  await page.fill('#rec-nombre-0', 'arroz')   // ya existe en el maestro (kilo), lo usa el plato de ejemplo
  igual(await page.locator('#rec-compra-0').inputValue(), 'kilo', 'unidad rellenada:')
  igual(await page.locator('#rec-compra-0').isDisabled(), true, 'select bloqueado:')
  await page.waitForSelector('text=Ya se compra por kilos')
  await page.fill('#rec-nombre-0', NOMBRE_ING('Nuevo libre'))
  igual(await page.locator('#rec-compra-0').isDisabled(), false, 'un ingrediente nuevo sí se elige:')
  await page.goto(`${URL}/catalogo`) // vuelve a la pestaña de productos: los grupos siguientes parten de ahí
})


// ============ HU-47 · Ingredientes a comprar (RF-55, RN-09, RN-20) ============
grupo = 'HU-47 Ingredientes a comprar (RF-55 / RN-20)'
const platoConReceta = async (nombre, lineas) => { const p = await nuevoPlato(nombre + sufijo); cierto((await guardarReceta(p.id, lineas)).estado === 200, 'no se guardó la receta de ' + nombre); return p }
const eventoCon = (asistentes, platos, extra = {}) => api('/eventos', { method: 'POST', body: { nombre_evento: `Compras ${asistentes}` + sufijo, fecha_evento: fechaLibre(), tipo_evento: 'Boda', duracion_horas: 5, asistentes, productos: platos.map((p) => ({ producto_id: p.id, porcion_por_persona: 150 })), ...extra } })
const comprasDe = async (r) => (await api(`/eventos/${r.cuerpo.evento.id}`)).cuerpo.compras_ingredientes
const compra = (c, nombre) => c.items.find((i) => i.ingrediente === nombre)
const techoCompra = (asist, gramosPorPersona, gramosUnidad) => Math.floor((asist * gramosPorPersona * 110 + gramosUnidad * 100 - 1) / (gramosUnidad * 100)) // control con enteros
const PECHUGA = NOMBRE_ING('Pechuga de pollo'), CILANTRO = NOMBRE_ING('Cilantro'), PAPA = NOMBRE_ING('Papa')

await t('Escenario 1: 100 asistentes × 200 g de pechuga = 20.000 g → 22.000 g con margen → 22 kilos', async () => {
  const plato = await platoConReceta('Pechuga compras', [ing(PECHUGA, { unidad_compra: 'kilo', cantidad_porcion: 200 })])
  const c = await comprasDe(await eventoCon(100, [plato]))
  const i = compra(c, PECHUGA)
  igual(i.cantidad_a_comprar, 22, 'cantidad:'); igual(i.unidad_compra, 'kilo', 'unidad:'); igual(i.gramos_base, 20000, 'base:'); igual(i.gramos_con_margen, 22000, 'con margen:')
  igual(c.margen_porcentaje, 10, 'margen:'); igual(c.asistentes, 100, 'asistentes:')
})
await t('Escenario 2: el cilantro de dos platos (10 g y 5 g) con 50 asistentes se suma en un solo total: 750 g → 825 g → 1,65 libras → 2 libras', async () => {
  const a = await platoConReceta('Plato A cilantro', [ing(CILANTRO, { unidad_compra: 'libra', cantidad_porcion: 10 })])
  const b = await platoConReceta('Plato B cilantro', [ing(CILANTRO, { unidad_compra: 'libra', cantidad_porcion: 5 })])
  const c = await comprasDe(await eventoCon(50, [a, b]))
  igual(c.items.length, 1, 'un solo total:'); const i = c.items[0]
  igual(i.gramos_base, 750); igual(i.gramos_con_margen, 825); igual(i.cantidad_exacta, 1.65); igual(i.cantidad_a_comprar, 2); igual(i.unidad_compra, 'libra'); igual(i.platos.length, 2, 'platos que lo usan:')
})
await t('Escenario 3: 200 asistentes × 150 g de papa = 30.000 g → 33.000 g → 2,64 arrobas → 3 arrobas; y 40 asistentes → 6.600 g → 1 arroba', async () => {
  const plato = await platoConReceta('Papa compras', [ing(PAPA, { unidad_compra: 'arroba', cantidad_porcion: 150 })])
  let i = compra(await comprasDe(await eventoCon(200, [plato])), PAPA)
  igual(i.cantidad_a_comprar, 3); igual(i.unidad_compra, 'arroba'); igual(i.gramos_con_margen, 33000); igual(i.cantidad_exacta, 2.64)
  i = compra(await comprasDe(await eventoCon(40, [plato])), PAPA)
  igual(i.gramos_con_margen, 6600); igual(i.cantidad_a_comprar, 1)
})
await t('Con más o menos asistentes el cálculo se actualiza y siempre alcanza sin comprar de más (40 a 600)', async () => {
  const plato = await platoConReceta('Papa variable', [ing(NOMBRE_ING('Papa variable'), { unidad_compra: 'arroba', cantidad_porcion: 150 })])
  let anterior = 0
  for (const n of [40, 41, 75, 100, 167, 250, 333, 400, 599, 600]) {
    const i = compra(await comprasDe(await eventoCon(n, [plato])), NOMBRE_ING('Papa variable'))
    igual(i.cantidad_a_comprar, techoCompra(n, 150, 12500), `${n} asistentes:`)
    cierto(i.cantidad_a_comprar >= anterior, `${n} asistentes bajó`); anterior = i.cantidad_a_comprar
  }
})
await t('Las porciones en libras, kilos o arrobas se convierten a gramos antes de calcular (100 asistentes × 0,4 libras = 20.000 g)', async () => {
  const plato = await platoConReceta('Porción en libras', [ing(NOMBRE_ING('Lentejas'), { unidad_compra: 'libra', cantidad_porcion: 0.4, unidad_porcion: 'libra' }), ing(NOMBRE_ING('Harina'), { unidad_compra: 'kilo', cantidad_porcion: 0.2, unidad_porcion: 'kilo' })])
  const c = await comprasDe(await eventoCon(100, [plato]))
  igual(compra(c, NOMBRE_ING('Lentejas')).gramos_base, 20000); igual(compra(c, NOMBRE_ING('Lentejas')).cantidad_a_comprar, 44)
  igual(compra(c, NOMBRE_ING('Harina')).gramos_base, 20000); igual(compra(c, NOMBRE_ING('Harina')).cantidad_a_comprar, 22)
})
await t('El margen se aplica una sola vez sobre el total sumado (3 platos de 3 g, 50 asistentes: 450 g → 495 g → 1 libra, no 3)', async () => {
  const sal = NOMBRE_ING('Sal compras')
  const platos = await Promise.all([1, 2, 3].map((n) => platoConReceta(`Plato sal ${n}`, [ing(sal, { unidad_compra: 'libra', cantidad_porcion: 3 })])))
  const c = await comprasDe(await eventoCon(50, platos))
  igual(compra(c, sal).cantidad_a_comprar, 1); igual(compra(c, sal).gramos_con_margen, 495)
})
await t('Un plato sin receta se avisa aparte; las bebidas y el mobiliario no cuentan; un evento sin alimentos da la lista vacía', async () => {
  const sinReceta = await nuevoPlato('Plato sin receta compras' + sufijo)
  const conReceta = await platoConReceta('Plato con receta compras', [ing(NOMBRE_ING('Aceite compras'), { unidad_compra: 'libra', cantidad_porcion: 5 })])
  const bebida = (await api('/catalogo?clasificacion=bebida_general')).cuerpo[0]
  const r = await eventoCon(100, [sinReceta, conReceta], { productos: [{ producto_id: sinReceta.id, porcion_por_persona: 100 }, { producto_id: conReceta.id, porcion_por_persona: 100 }, { producto_id: bebida.id, porcion_por_persona: 2 }] })
  igual(r.estado, 201); const c = await comprasDe(r)
  igual(c.platos_con_receta, 1, 'platos con receta:'); igual(c.platos_sin_receta.length, 1, 'platos sin receta:'); igual(c.platos_sin_receta[0].producto_id, sinReceta.id)
  igual(c.items.length, 1, 'solo el ingrediente del plato con receta:')
  const vacio = await comprasDe(await eventoCon(100, []))
  igual(vacio.items.length, 0); igual(vacio.platos_con_receta, 0); igual(vacio.platos_sin_receta.length, 0)
})
await t('Si se edita la receta, el detalle del evento ya guardado muestra la compra con la receta nueva (se calcula al consultar)', async () => {
  const plato = await platoConReceta('Plato editable compras', [ing(NOMBRE_ING('Arvejas'), { unidad_compra: 'kilo', cantidad_porcion: 100 })])
  const r = await eventoCon(100, [plato])
  igual(compra(await comprasDe(r), NOMBRE_ING('Arvejas')).cantidad_a_comprar, 11)
  await guardarReceta(plato.id, [ing(NOMBRE_ING('Arvejas'), { unidad_compra: 'kilo', cantidad_porcion: 200 })])
  igual(compra(await comprasDe(r), NOMBRE_ING('Arvejas')).cantidad_a_comprar, 22)
})
await t('Cálculo previo (antes de guardar): POST /eventos/calcular-compras da lo mismo que el detalle, ignora ids repetidos y sin platos da lista vacía', async () => {
  const plato = await platoConReceta('Plato previo', [ing(NOMBRE_ING('Zapallo'), { unidad_compra: 'arroba', cantidad_porcion: 150 })])
  const previo = await api('/eventos/calcular-compras', { method: 'POST', body: { asistentes: 200, productos: [plato.id, plato.id] } })
  igual(previo.estado, 200); igual(compra(previo.cuerpo, NOMBRE_ING('Zapallo')).cantidad_a_comprar, 3); igual(previo.cuerpo.items.length, 1)
  igual(JSON.stringify(previo.cuerpo.items), JSON.stringify((await comprasDe(await eventoCon(200, [plato]))).items), 'igual al detalle:')
  igual((await api('/eventos/calcular-compras', { method: 'POST', body: { asistentes: 200, productos: [] } })).cuerpo.items.length, 0)
})
await t('Cálculo previo: asistentes fuera de 40–600, decimales o texto; platos que no existen, bebidas o ids inválidos dan 400; sin sesión 401', async () => {
  const plato = await platoConReceta('Plato previo 2', [ing(NOMBRE_ING('Berenjena'), { cantidad_porcion: 100 })])
  const bebida = (await api('/catalogo?clasificacion=bebida_general')).cuerpo[0]
  const malos = [{ asistentes: 39, productos: [plato.id] }, { asistentes: 601, productos: [plato.id] }, { asistentes: 100.5, productos: [plato.id] }, { asistentes: '100', productos: [plato.id] }, { asistentes: null, productos: [] }, {},
    { asistentes: 100, productos: 'x' }, { asistentes: 100 }, { asistentes: 100, productos: [1.5] }, { asistentes: 100, productos: ['3'] }, { asistentes: 100, productos: [0] }, { asistentes: 100, productos: [-1] },
    { asistentes: 100, productos: [99999999] }, { asistentes: 100, productos: [bebida.id] }, { asistentes: 100, productos: Array.from({ length: 101 }, (_, i) => i + 1) }]
  for (const body of malos) igual((await api('/eventos/calcular-compras', { method: 'POST', body })).estado, 400, JSON.stringify(body).slice(0, 60) + ':')
  igual((await api('/eventos/calcular-compras', { method: 'POST', body: { asistentes: 40, productos: [plato.id] } })).estado, 200, '40 (límite exacto):')
  igual((await api('/eventos/calcular-compras', { method: 'POST', body: { asistentes: 600, productos: [plato.id] } })).estado, 200, '600 (límite exacto):')
  igual(await fetch(`${API}/eventos/calcular-compras`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then((r) => r.status), 401)
})

// --- Pantalla
await t('Pantalla (registro, paso 3): el resumen calcula los ingredientes a comprar de los platos elegidos antes de guardar', async () => {
  const plato = await platoConReceta('Plato resumen compras', [ing(NOMBRE_ING('Pechuga resumen'), { unidad_compra: 'kilo', cantidad_porcion: 200 }), ing(NOMBRE_ING('Cilantro resumen'), { unidad_compra: 'libra', cantidad_porcion: 10 })])
  await nuevoEvento('Resumen compras' + sufijo, 100); await aRequerimientos()
  await page.waitForSelector('#alimento-producto option[value]', { state: 'attached' })
  await page.selectOption('#alimento-producto', await optVal(page, '#alimento-producto', plato.nombre))
  await page.getByRole('button', { name: 'Agregar', exact: true }).click(); await page.waitForSelector(`text=${plato.nombre}`)
  await page.getByRole('button', { name: /^Siguiente/ }).click(); await page.getByRole('button', { name: 'Guardar evento' }).waitFor()
  const lista = page.getByRole('list', { name: 'Lista de ingredientes a comprar' }); await lista.waitFor()
  igual((await lista.locator(`[data-ingrediente="${NOMBRE_ING('Pechuga resumen')}"]`).innerText()).trim(), '22 kilos', 'pechuga:')
  igual((await lista.locator(`[data-ingrediente="${NOMBRE_ING('Cilantro resumen')}"]`).innerText()).trim(), '3 libras', 'cilantro (1.100 g con margen → 2,2 libras):')
  cierto((await page.locator('main').innerText()).replace(/\s+/g, ' ').includes('Para 100 asistentes, con 10 % de margen'), 'sin la explicación del margen')
})
await t('Pantalla (detalle del evento): muestra lo que hay que comprar, en su unidad, coincide con la API y avisa de los platos sin receta', async () => {
  const sinReceta = await nuevoPlato('Plato detalle sin receta' + sufijo)
  const plato = await platoConReceta('Plato detalle compras', [ing(NOMBRE_ING('Arroz detalle'), { unidad_compra: 'kilo', cantidad_porcion: 80 }), ing(NOMBRE_ING('Papa detalle'), { unidad_compra: 'arroba', cantidad_porcion: 150 })])
  const r = await eventoCon(200, [plato, sinReceta])
  await page.goto(`${URL}/eventos?evento=${r.cuerpo.evento.id}`)
  const lista = page.getByRole('list', { name: 'Lista de ingredientes a comprar' }); await lista.waitFor()
  const api_ = await comprasDe(r)
  for (const nombre of [NOMBRE_ING('Arroz detalle'), NOMBRE_ING('Papa detalle')]) {
    const i = compra(api_, nombre); const esperado = `${i.cantidad_a_comprar} ${i.cantidad_a_comprar === 1 ? i.unidad_compra : i.unidad_compra + 's'}`
    igual((await lista.locator(`[data-ingrediente="${nombre}"]`).innerText()).trim(), esperado, nombre + ':')
  }
  igual((await lista.locator(`[data-ingrediente="${NOMBRE_ING('Arroz detalle')}"]`).innerText()).trim(), '18 kilos', 'arroz: 200 × 80 g × 1,10 = 17,6 kg → 18:')
  igual((await lista.locator(`[data-ingrediente="${NOMBRE_ING('Papa detalle')}"]`).innerText()).trim(), '3 arrobas', 'papa:')
  const txt = (await page.locator('main').innerText()).replace(/\s+/g, ' ')
  cierto(txt.includes('Este plato no tiene receta') && txt.includes('Plato detalle sin receta'), 'sin el aviso del plato sin receta')
  cierto(txt.includes('33.000 g con margen'), 'sin los gramos con margen de la papa')
})
await t('Pantalla (detalle): un evento sin alimentos explica que no hay ingredientes que calcular', async () => {
  const r = await eventoCon(100, [])
  await page.goto(`${URL}/eventos?evento=${r.cuerpo.evento.id}`)
  await page.waitForSelector('text=no tiene alimentos, así que no hay ingredientes que calcular')
})


// ============ Límites de ml y gramos, y el «0» que no se podía borrar ============
grupo = 'Límites de ml y gramos · campos sin cero pegado'
// Borra el campo y escribe un 7: si queda «07», el cero estaba pegado
const borrarYEscribir = async (selector) => {
  const c = page.locator(selector); await c.click(); await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.press('Backspace')
  const vacio = await c.inputValue(); await page.keyboard.type('7')
  return { vacio, escrito: await c.inputValue() }
}
const aTabCocteles = async () => { await page.goto(`${URL}/catalogo`); await page.getByRole('button', { name: 'Recetas de Cóctel' }).click(); await page.getByRole('heading', { name: /Crear Receta de Cóctel/ }).waitFor() }

await t('Cócteles: el campo de mililitros se puede borrar y reescribir (no queda un «0» pegado)', async () => {
  await aTabCocteles()
  const r = await borrarYEscribir('input[aria-label="Mililitros del licor 1"]')
  igual(r.vacio, '', 'tras borrar:'); igual(r.escrito, '7', 'tras escribir 7:')
})
await t('Cócteles: los asistentes y los cócteles por persona de la calculadora se pueden borrar y reescribir', async () => {
  await page.getByRole('button', { name: /Agregar otro licor/ }).waitFor()
  const hay = await page.getByRole('heading', { name: /Calcular licor por cóctel/ }).count()
  if (!hay) { // la calculadora aparece cuando hay cócteles: se crea uno por la API
    const licor = (await api('/catalogo?clasificacion=bar_cocteleria')).cuerpo[0]
    igual((await api('/cocteles', { method: 'POST', body: { nombre: 'Cóctel ceros' + sufijo, ingredientes: [{ licor_id: licor.id, mililitros: 50 }] } })).estado, 201)
    await aTabCocteles()
  }
  const as = await borrarYEscribir('input[aria-label^="Número de asistentes"]'); igual(as.vacio, '', 'asistentes tras borrar:'); igual(as.escrito, '7', 'asistentes tras escribir 7:')
  const pp = await borrarYEscribir('input[aria-label^="Cócteles por persona"]'); igual(pp.vacio, '', 'por persona tras borrar:'); igual(pp.escrito, '7', 'por persona tras escribir 7:')
})
await t('Cócteles: 15.000 ml se avisan apenas se escriben («Máximo 250 ml por licor»), también 0, texto y 3 decimales; no se guarda', async () => {
  await aTabCocteles()
  const ml = 'input[aria-label="Mililitros del licor 1"]'
  for (const [valor, mensaje] of [['15000', 'Máximo 250 ml por licor'], ['251', 'Máximo 250 ml por licor'], ['0', 'mayor a 0'], ['abc', 'mayor a 0'], ['12,345', 'Máximo 2 decimales']]) {
    await page.fill(ml, valor); await page.waitForSelector(`text=${mensaje}`)
  }
  await page.fill(ml, '250'); igual(await page.getByText('Máximo 250 ml por licor').count(), 0, '250 sí es válido:')
  await page.fill('input[placeholder="Ej. Mojito, Gin Tonic"]', 'Cóctel rechazado' + sufijo)
  await page.selectOption('select >> nth=0', { index: 1 }).catch(() => {})
  await page.fill(ml, '15000')
  await page.getByRole('button', { name: 'Crear Cóctel' }).click()
  await page.waitForSelector('text=Corrige los mililitros marcados')
  cierto(!(await api('/cocteles')).cuerpo.some((c) => c.nombre === 'Cóctel rechazado' + sufijo), 'se guardó el cóctel con 15.000 ml')
})
await t('Cócteles: crear una receta con 45,5 ml por la pantalla la guarda con ese valor; sin licor o con licor repetido avisa dentro del formulario', async () => {
  await aTabCocteles()
  const licor = (await api('/catalogo?clasificacion=bar_cocteleria')).cuerpo[0]
  await page.fill('input[placeholder="Ej. Mojito, Gin Tonic"]', 'Cóctel pantalla' + sufijo)
  await page.getByRole('button', { name: 'Crear Cóctel' }).click(); await page.waitForSelector('text=Selecciona un licor en cada fila')
  await page.selectOption('form select >> nth=0', String(licor.id)); await page.fill('input[aria-label="Mililitros del licor 1"]', '45,5')
  await page.getByRole('button', { name: /Agregar otro licor/ }).click(); await page.selectOption('form select >> nth=1', String(licor.id))
  await page.getByRole('button', { name: 'Crear Cóctel' }).click(); await page.waitForSelector('text=mismo licor más de una vez')
  await page.locator('button[title="Quitar licor"]').last().click() // quita la fila repetida (la segunda)
  await page.getByRole('button', { name: 'Crear Cóctel' }).click()
  await page.waitForSelector(`text=Cóctel pantalla${sufijo}`)
  const c = (await api('/cocteles')).cuerpo.find((x) => x.nombre === 'Cóctel pantalla' + sufijo)
  igual(Number(c.ingredientes[0].mililitros), 45.5, 'mililitros guardados:')
})
await t('Calculadora de licor: asistentes fuera de 40–600 y cócteles por persona fuera de 1–10 se avisan dentro del formulario y no calculan', async () => {
  await aTabCocteles()
  await page.fill('input[aria-label^="Número de asistentes"]', '5'); await page.waitForSelector('text=Debe estar entre 40 y 600 asistentes')
  await page.fill('input[aria-label^="Número de asistentes"]', '601'); await page.waitForSelector('text=Debe estar entre 40 y 600 asistentes')
  await page.fill('input[aria-label^="Número de asistentes"]', '40,5'); await page.waitForSelector('text=Debe ser un número entero')
  await page.fill('input[aria-label^="Cócteles por persona"]', '11'); await page.waitForSelector('text=Debe ser un entero de 1 a 10')
  await page.fill('input[aria-label^="Cócteles por persona"]', '0'); await page.waitForSelector('text=Debe ser un entero de 1 a 10')
  await page.getByRole('button', { name: 'Calcular Botellas Necesarias' }).click(); await page.waitForSelector('text=Corrige los campos marcados antes de calcular')
  await page.fill('input[aria-label^="Número de asistentes"]', '100'); await page.fill('input[aria-label^="Cócteles por persona"]', '2')
  await page.getByRole('button', { name: 'Calcular Botellas Necesarias' }).click(); await page.waitForSelector('text=Botellas consolidadas a comprar')
})
await t('Catálogo: 15.000 ml en la botella, 15.000 g por persona y un precio exagerado se avisan apenas se escriben, y no se guardan', async () => {
  await page.goto(`${URL}/catalogo`); await page.getByLabel('Nombre del producto').waitFor()
  await page.fill('#catalogo-nombre', 'Botella enorme' + sufijo).catch(async () => page.getByLabel('Nombre del producto').fill('Botella enorme' + sufijo))
  await page.selectOption('#catalogo-grupo', 'bebida_general'); await page.selectOption('#catalogo-tipo', 'botella_compartida')
  await page.fill('#catalogo-volumen', '15000'); await page.waitForSelector('text=Máximo 5.000 ml por botella')
  await page.fill('#catalogo-volumen', '5000'); igual(await page.getByText('Máximo 5.000 ml por botella').count(), 0, '5000 sí es válido:')
  await page.fill('#catalogo-volumen', '750'); await page.fill('#catalogo-tamano', '800'); await page.waitForSelector('text=La porción no puede ser mayor que la botella')
  await page.fill('#catalogo-volumen', '15000'); await page.fill('#catalogo-tamano', '100'); await page.getByRole('button', { name: 'Crear producto' }).click()
  await page.waitForSelector('text=Máximo 5.000 ml por botella')
  cierto(!(await api('/catalogo')).cuerpo.some((p) => p.nombre === 'Botella enorme' + sufijo), 'se guardó la botella de 15.000 ml')
  await page.selectOption('#catalogo-grupo', 'alimento'); await page.fill('#catalogo-porcion', '15000'); await page.waitForSelector('text=Máximo 1.000 g por persona')
  await page.fill('#catalogo-porcion', '1000'); igual(await page.getByText('Máximo 1.000 g por persona').count(), 0, '1000 sí es válido:')
  await page.fill('#catalogo-precio', '999999999999'); await page.waitForSelector('text=El precio no puede pasar de $100.000.000')
})
await t('Nuevo evento (paso 2): 15.000 g de un alimento y un valor de bebida exagerado se avisan apenas se escriben y no se agregan', async () => {
  await nuevoEvento('Límites paso 2' + sufijo, 100); await aRequerimientos()
  await page.waitForSelector('#alimento-producto option[value]', { state: 'attached' })
  await page.selectOption('#alimento-producto', await optVal(page, '#alimento-producto', 'Medallones de Lomo de Res'))
  await page.fill('#alimento-porcion', '15000'); await page.waitForSelector('text=Máximo 1.000 g por persona')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click(); await page.waitForSelector('text=Máximo 1.000 g por persona')
  igual(await page.getByRole('button', { name: /Quitar Medallones/ }).count(), 0, 'se agregó con 15.000 g:')
  await page.fill('#alimento-porcion', '0'); await page.waitForSelector('text=al menos 1 g')
  await page.fill('#alimento-porcion', '200'); igual(await page.getByText('Máximo 1.000 g por persona').count(), 0, '200 sí es válido:')
  await pestana('Bebidas')
  await page.selectOption('#bebida-producto', await optVal(page, '#bebida-producto', 'Poker')).catch(() => {})
  await page.fill('#bebida-precio', '999999999999'); await page.waitForSelector('text=El valor no puede pasar de $100.000.000')
})
await t('Campos numéricos del registro, el inventario y el catálogo: se pueden borrar y reescribir (sin cero pegado)', async () => {
  for (const [ruta, campos] of [['/inventario', ['#inventario-cantidad']], ['/eventos/nuevo', ['#duracion', '#asistentes']]]) {
    await page.goto(`${URL}${ruta}`)
    for (const c of campos) { await page.waitForSelector(c); const r = await borrarYEscribir(c); igual(r.vacio, '', `${ruta} ${c} tras borrar:`); igual(r.escrito, '7', `${ruta} ${c} tras escribir 7:`) }
  }
})


// ============ L. Catálogo ============
grupo = 'Catálogo'
await t('«Catálogo» es una opción del menú y abre su pantalla', async () => {
  await abrirMenu()
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
  // SIN_PRECIO es la bebida propia de las pruebas de precios: se usó en un evento guardado (ver QA-04)
  const usado = (await api('/catalogo')).cuerpo.find((p) => p.nombre === SIN_PRECIO)
  const r = await api(`/catalogo/${usado.id}`, { method: 'PUT', body: { nombre: SIN_PRECIO, clasificacion: 'bar_cocteleria', tipo_calculo: 'unidad_persona', porcion_por_persona: 2, precio_unitario: 0 } })
  igual(r.estado, 409)
  igual((await api('/catalogo')).cuerpo.find((p) => p.nombre === SIN_PRECIO).clasificacion, 'bebida_general', 'no debía cambiar de grupo:')
})

// ============ L2. Corrección: unidades por persona = entero de 1 a 10 (HU-03, HU-43 · RF-22, RN-15) ============
grupo = 'Cor. unidades por persona (RF-22 / RN-15)'
const MSG_UNIDADES = 'Las unidades por persona deben ser un número entero de 1 a 10'
const nuevaBebidaCatalogo = (nombre, porcion) => api('/catalogo', { method: 'POST', body: { nombre, clasificacion: 'bebida_general', tipo_calculo: 'unidad_persona', porcion_por_persona: porcion } })
const eventoConUnidades = async (productoId, porcion) => {
  return api('/eventos', { method: 'POST', body: { nombre_evento: 'Unidades' + sufijo, fecha_evento: fechaLibre(), tipo_evento: 'Boda', duracion_horas: 5, asistentes: 100, productos: [{ producto_id: productoId, porcion_por_persona: porcion, precio_unitario: 3000 }] } })
}
const poker = (await api('/catalogo')).cuerpo.find((p) => p.nombre === 'Poker')

await t('Catálogo (API): 1,4 se rechaza con un mensaje claro', async () => {
  const r = await nuevaBebidaCatalogo('Unidades 1.4' + sufijo, 1.4)
  igual(r.estado, 400); cierto(String(r.cuerpo.detalle).includes(MSG_UNIDADES), 'mensaje: ' + r.cuerpo.detalle)
})
await t('Catálogo (API): 0 y 11 se rechazan; 1 y 10 se aceptan', async () => {
  igual((await nuevaBebidaCatalogo('Unidades 0' + sufijo, 0)).estado, 400, '0:')
  igual((await nuevaBebidaCatalogo('Unidades 11' + sufijo, 11)).estado, 400, '11:')
  igual((await nuevaBebidaCatalogo('Unidades -1' + sufijo, -1)).estado, 400, '-1:')
  igual((await nuevaBebidaCatalogo('Unidades uno' + sufijo, '1')).estado, 400, 'texto:')
  igual((await nuevaBebidaCatalogo('Unidades 1' + sufijo, 1)).estado, 201, '1:')
  igual((await nuevaBebidaCatalogo('Unidades 10' + sufijo, 10)).estado, 201, '10:')
})
await t('Catálogo (API): editar un producto con 1,4 se rechaza', async () => {
  const p = (await api('/catalogo')).cuerpo.find((x) => x.nombre === 'Unidades 1' + sufijo)
  const r = await api(`/catalogo/${p.id}`, { method: 'PUT', body: { nombre: p.nombre, clasificacion: 'bebida_general', tipo_calculo: 'unidad_persona', porcion_por_persona: 1.4 } })
  igual(r.estado, 400)
  igual((await api(`/catalogo/${p.id}`, { method: 'PUT', body: { nombre: p.nombre, clasificacion: 'bebida_general', tipo_calculo: 'unidad_persona', porcion_por_persona: 3 } })).estado, 200, 'entero válido:')
})
await t('Evento (API): 1,4, 0 y 11 se rechazan con mensaje claro y no guardan nada', async () => {
  const antes = (await api('/eventos')).cuerpo.length
  for (const v of [1.4, 0, 11, -2, '1,4']) {
    const r = await eventoConUnidades(poker.id, v)
    igual(r.estado, 400, `${v}:`); cierto(/Poker.*deben ser un número entero de 1 a 10/.test(String(r.cuerpo.detalle)), `mensaje con ${v}: ` + r.cuerpo.detalle)
  }
  igual((await api('/eventos')).cuerpo.length, antes, 'eventos guardados:')
})
await t('Evento (API): los enteros 1 y 10 se aceptan (valor exacto del límite)', async () => {
  for (const v of [1, 10]) {
    const r = await eventoConUnidades(poker.id, v)
    igual(r.estado, 201, `${v}:`)
    const det = (await api(`/eventos/${r.cuerpo.evento.id}`)).cuerpo
    igual(Number(det.productos_calculados[0].porcion_por_persona), v, 'porción guardada:')
  }
})
await t('Evento (UI): 1,4 muestra el mensaje y no deja agregar; luego un entero sí', async () => {
  await nuevoEvento('UI unidades' + sufijo, 100)
  await aRequerimientos(); await pestana('Bebidas')
  await page.selectOption('#bebida-producto', await optVal(page, '#bebida-producto', 'Poker'))
  await page.fill('#bebida-unidades', '1,4')
  await page.waitForSelector(`text=${MSG_UNIDADES}`)
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.waitForSelector(`text=${MSG_UNIDADES}`)
  igual(await page.getByText('Todavía no has agregado bebidas generales').count(), 1, 'se agregó algo:')
  await page.fill('#bebida-unidades', '3')
  igual(await page.getByText(MSG_UNIDADES).count(), 0, 'el mensaje debía desaparecer:')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.waitForSelector('text=300 und')
})
await t('Evento (UI): 0 y 11 se rechazan; 10 se acepta', async () => {
  await page.selectOption('#bebida-producto', await optVal(page, '#bebida-producto', 'Águila'))
  for (const v of ['0', '11', '2.5', '-1']) {
    await page.fill('#bebida-unidades', v)
    await page.getByRole('button', { name: 'Agregar', exact: true }).click()
    await page.waitForSelector(`text=${MSG_UNIDADES}`)
  }
  await page.fill('#bebida-unidades', '10')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.waitForSelector('text=1.000 und')
})
await t('Catálogo (UI): 1,4 se rechaza con un mensaje claro y 10 se acepta', async () => {
  await page.goto(`${URL}/catalogo`)
  await page.getByLabel('Nombre del producto').fill('UI unidades' + sufijo)
  await page.selectOption('#catalogo-grupo', 'bebida_general')
  await page.fill('#catalogo-porcion', '1,4')
  await page.waitForSelector(`text=${MSG_UNIDADES}`)
  await page.getByRole('button', { name: 'Crear producto' }).click()
  await page.waitForSelector(`text=${MSG_UNIDADES}`)
  cierto(!(await api('/catalogo')).cuerpo.some((x) => x.nombre === 'UI unidades' + sufijo), 'se creó con 1,4')
  await page.fill('#catalogo-porcion', '10')
  await page.getByRole('button', { name: 'Crear producto' }).click()
  await page.waitForSelector('text=quedó en el catálogo')
})
await t('Las bebidas ya registradas siguen abriéndose sin error (catálogo y eventos)', async () => {
  await page.goto(`${URL}/catalogo`)
  await page.getByRole('button', { name: 'Editar Poker' }).click()
  igual(await page.locator('#catalogo-porcion').inputValue(), '2', 'valor guardado:')
  igual(await page.getByText(MSG_UNIDADES).count(), 0, 'error al abrir:')
  const lista = (await api('/eventos')).cuerpo
  cierto(lista.length > 0, 'sin eventos')
  for (const e of lista.slice(0, 5)) igual((await api(`/eventos/${e.id}`)).estado, 200, `evento ${e.id}:`)
})

// ============ M. Transversales ============
grupo = 'Transversales'
await t('Modo oscuro se activa y se recuerda al recargar', async () => {
  await page.goto(`${URL}/eventos`)
  await abrirMenu()
  await page.getByRole('switch', { name: /Modo oscuro/ }).click()
  cierto(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'no activó')
  await page.reload(); await page.waitForSelector('nav', { state: 'attached' })
  cierto(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'no se recordó')
  await abrirMenu()
  await page.getByRole('switch', { name: /Modo oscuro/ }).click()
})
await t('Sin errores de JavaScript en consola durante todo el recorrido', async () => {
  cierto(erroresConsola.length === 0, erroresConsola.slice(0, 3).join(' | '))
})
await t('Cerrar sesión vuelve al login', async () => {
  await abrirMenu()
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
