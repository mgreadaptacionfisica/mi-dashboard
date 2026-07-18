// Utilidades para trabajar con las fechas del panel, que pueden venir en
// varios formatos heredados del CSV/Notion — texto en español ("31 de mayo
// de 2026"), con guiones o barras en formato día-mes-año (31-05-2026,
// 31/05/2026) — o ya en ISO (YYYY-MM-DD, el formato que usan los inputs
// type="date"). Se usa tanto para mostrar las fechas de forma consistente
// como para calcular avisos (renovaciones, etc.) sin importar de dónde
// venga la fecha original.

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
  const larga = /^(\d{1,2}) de ([a-záéíóúñ]+) de (\d{4})/i.exec(texto)
  if (larga) {
    const mes = MESES_ES[larga[2].toLowerCase()]
    if (mes) return `${larga[3]}-${String(mes).padStart(2, '0')}-${String(larga[1]).padStart(2, '0')}`
  }
  // Día-mes-año con guiones o barras (31-05-2026 / 31/05/2026), el formato
  // habitual en España cuando no es ISO ni texto largo.
  const corta = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(texto)
  if (corta) {
    const dia = Number(corta[1])
    const mes = Number(corta[2])
    const anio = Number(corta[3])
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
      return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    }
  }
  return null
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
