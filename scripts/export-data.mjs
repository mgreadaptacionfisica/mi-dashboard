// Exporta los datos reales de src/data/*.js a JSON, como paso previo a
// generar los INSERT de Supabase (sobre todo para clientes.js y setting.js,
// que tienen datos reales y no conviene transcribir a mano).
//
// Uso: node scripts/export-data.mjs
// Genera un .json por módulo dentro de supabase-sql/exports/

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const OUT_DIR = path.join(process.cwd(), 'supabase-sql', 'exports')

const modulos = [
  'clientes',
  'team',
  'ventas',
  'seguimientos',
  'setting',
  'mensajesSetting',
  'adsKpi',
  'adsNotasMensuales',
  'anuncios',
  'recontactos',
  'ingresosPersonales',
  'gastosPersonales',
  'gastosProfesionales',
  'contenidoIdeas',
  'contactosSemanales',
  'valoracionesClientes',
  'servicios',
  'renovaciones',
  'sops',
  'mensajesEquipo',
]

await mkdir(OUT_DIR, { recursive: true })

for (const nombre of modulos) {
  try {
    const mod = await import(`../src/data/${nombre}.js`)
    const payload = mod.default !== undefined ? mod.default : mod
    await writeFile(
      path.join(OUT_DIR, `${nombre}.json`),
      JSON.stringify(payload, null, 2),
      'utf8'
    )
    const count = Array.isArray(payload) ? payload.length : Object.keys(payload).length
    console.log(`OK  ${nombre}.json  (${count} elementos)`)
  } catch (e) {
    console.error(`FALLO ${nombre}:`, e.message)
  }
}

console.log('\nExportado en supabase-sql/exports/')
