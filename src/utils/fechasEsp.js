// Utilidades para trabajar con las fechas del panel, que pueden venir en
// dos formatos: texto en español (heredado del CSV/Notion, ej. "31 de mayo
// de 2026") o ISO (YYYY-MM-DD, los inputs type="date" nuevos). Se usa para
// poder calcular avisos (renovaciones, etc.) sin importar de dónde venga
// la fecha.

const MESES_ES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
}

// Devuelve la fecha en formato ISO (YYYY-MM-DD) o null si no se puede
// interpretar (vacía, texto libre no reconocido, etc.).
export function parseFechaFlexible(value) {
  if (!value) return null
  const texto = String(value).trim()
  if (!texto) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10)
  const m = /^(\d{1,2}) de ([a-záéíóúñ]+) de (\d{4})/i.exec(texto)
  if (!m) return null
  const mes = MESES_ES[m[2].toLowerCase()]
  if (!mes) return null
  return `${m[3]}-${String(mes).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`
}

export function sumarDias(iso, dias) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

export function formatFechaISO(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
