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
  for (let i = 0; i < 50; i++) {
    const f = new Date(Date.now() + (30 + Math.floor(Math.random() * 1500)) * 86400000).toISOString().slice(0, 10)
    if (!DIAS_OCUPADOS.has(f)) return f
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
await t('Servicios: unidades 0 y 6 se rechazan; 1 y 5 se aceptan', async () => {
  await pestana('Servicios')
  for (const u of ['0', '6', '2,5', '-1']) {
    await page.selectOption('#servicio-tipo', 'dj'); await page.fill('#servicio-descripcion', 'DJ prueba'); await page.fill('#servicio-cantidad', u)
    await page.waitForSelector('text=Las unidades deben ser un número entero de 1 a 5')
    await page.getByRole('button', { name: 'Agregar', exact: true }).click()
    igual(await page.getByText('Todavía no has agregado servicios adicionales').count(), 1, `se agregó con ${u} unidades:`)
  }
  await agregarServicio({ descripcion: 'DJ una unidad', unidades: 1, horas: 3 })
  await page.waitForSelector('text=DJ una unidad')
  await agregarServicio({ tipo: 'sonido', descripcion: 'Sonido cinco', unidades: 5, horas: 3 })
  await page.waitForSelector('text=Sonido cinco')
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
  const sonido = d.servicios_adicionales.find((x) => x.descripcion === 'Sonido cinco')
  igual(sonido.cantidad, 5, 'unidades sonido:')
  await page.waitForSelector('text=Sonido cinco')
  cierto(/5 und/.test(await page.locator('body').innerText()), 'el detalle no muestra «5 und»')
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
