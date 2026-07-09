// Genera los INSERT de Supabase para clientes y setting_instagram a partir
// de los JSON exportados por export-data.mjs. Solo genera el SQL: no se
// conecta a ninguna base de datos ni ejecuta nada.
//
// Uso: node scripts/generate-insert-sql.mjs

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const EXPORTS_DIR = path.join(process.cwd(), 'supabase-sql', 'exports')
const OUT_DIR = path.join(process.cwd(), 'supabase-sql')

const MESES_ES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
}

function parseFechaEsp(value) {
  if (!value) return null
  const m = /^(\d{1,2}) de ([a-záéíóúñ]+) de (\d{4})/i.exec(value.trim())
  if (!m) return null
  const mes = MESES_ES[m[2].toLowerCase()]
  if (!mes) return null
  return `${m[3]}-${String(mes).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`
}

function sqlStr(value) {
  if (value === null || value === undefined || value === '') return 'null'
  return `'${String(value).replace(/'/g, "''")}'`
}

function sqlDate(isoOrNull) {
  return isoOrNull ? `'${isoOrNull}'` : 'null'
}

function sqlNum(value) {
  if (value === null || value === undefined || value === '') return 'null'
  const n = Number(value)
  return Number.isNaN(n) ? 'null' : String(n)
}

// ---------- clientes ----------
const clientes = JSON.parse(await readFile(path.join(EXPORTS_DIR, 'clientes.json'), 'utf8'))

const clientesRows = clientes.map((c) => {
  const cols = [
    sqlStr(c['Nombre']),
    sqlStr(c['Drive']),
    sqlStr(c['Email']),
    sqlStr(c['Estado del cliente']),
    sqlDate(parseFechaEsp(c['Fecha inicio'])),
    sqlDate(parseFechaEsp(c['Fecha fin'])),
    sqlDate(parseFechaEsp(c['Fecha primer pago'])),
    sqlDate(parseFechaEsp(c['Fecha segundo pago'])),
    sqlDate(parseFechaEsp(c['Fecha tercer pago'])),
    sqlStr(c['Forma de pago']),
    sqlStr(c['Pago']),
    sqlNum(c['Primer pago']),
    sqlNum(c['Segundo pago']),
    sqlNum(c['Tercer pago']),
    sqlStr(c['Renueva'] || 'No'),
    sqlStr(c['Forma de renovación']),
    sqlNum(c['Importe renovación']),
    sqlDate(parseFechaEsp(c['Fecha renovación'])),
    sqlStr(c['Servicio contratado']),
    sqlStr(c['Teléfono']),
    sqlStr(c['Tipo de cliente']),
  ]
  return `(${cols.join(', ')})`
})

const clientesSql = `-- Generado automáticamente desde src/data/clientes.js (export-data.mjs + generate-insert-sql.mjs)
-- Revisar unas cuantas filas contra el panel antes de darle a Run, por tratarse de datos reales de facturación.
insert into public.clientes (
  nombre, drive, email, estado, fecha_inicio, fecha_fin,
  fecha_primer_pago, fecha_segundo_pago, fecha_tercer_pago,
  forma_pago, pago, primer_pago, segundo_pago, tercer_pago,
  renueva, forma_renovacion, importe_renovacion, fecha_renovacion,
  servicio_contratado, telefono, tipo_cliente
) values
${clientesRows.join(',\n')};
`

await writeFile(path.join(OUT_DIR, '04b_clientes_data.sql'), clientesSql, 'utf8')
console.log(`04b_clientes_data.sql generado (${clientes.length} clientes)`)

// ---------- setting_instagram ----------
const setting = JSON.parse(await readFile(path.join(EXPORTS_DIR, 'setting.json'), 'utf8'))

const settingRows = setting.map((s) => {
  const cols = [
    sqlDate(s.fecha),
    sqlNum(s.bienvenidasEnviadas ?? 0),
    sqlNum(s.bienvenidasRespondidas ?? 0),
    sqlStr(s.mensajeBienvenida),
    sqlNum(s.fupEnviados ?? 0),
    sqlNum(s.fupRespondidas ?? 0),
    sqlStr(s.mensajeFup),
    sqlStr(s.ultimaBienvenida),
    sqlNum(s.llamadas ?? 0),
    sqlNum(s.ventas ?? 0),
  ]
  return `(${cols.join(', ')})`
})

const settingSql = `-- Generado automáticamente desde src/data/setting.js
insert into public.setting_instagram (
  fecha, bienvenidas_enviadas, bienvenidas_respondidas, mensaje_bienvenida,
  fup_enviados, fup_respondidas, mensaje_fup, ultima_bienvenida, llamadas, ventas
) values
${settingRows.join(',\n')}
on conflict (fecha) do nothing;
`

await writeFile(path.join(OUT_DIR, '08b_setting_instagram_data.sql'), settingSql, 'utf8')
console.log(`08b_setting_instagram_data.sql generado (${setting.length} registros)`)
