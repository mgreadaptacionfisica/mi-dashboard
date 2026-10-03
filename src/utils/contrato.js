// Contrato de prestación de servicios que el cliente firma online desde el
// onboarding. Aquí vive TODO lo que es texto legal y cálculo, para que el
// formulario público (ContratoCliente.jsx) y el PDF que descarga Raúl desde
// Clientes salgan de la misma fuente.
//
// Ojo al cambiar la redacción: los contratos ya firmados NO se ven afectados,
// porque al firmar se guarda una foto de las cláusulas en la columna `texto`
// (migración 62) y el PDF se genera desde esa foto. Sube VERSION_CONTRATO
// cuando cambie algo de fondo, para poder saber qué firmó cada uno.

export const VERSION_CONTRATO = 'v4 · oct 2026'

// Datos fijos de EL PROFESIONAL. Sin domicilio a propósito (Raúl ya no vive
// en Alcaucín y no quiere poner la dirección de la LLC): el contacto es el
// email. Si algún día se añade una dirección, va aquí y en "Reunidos".
export const PROFESIONAL = {
  nombre: 'Raúl Morales García',
  dni: '26807134-J',
  email: 'mgreadaptacionfisica@gmail.com',
  titulo: 'Graduado en Ciencias de la Actividad Física y del Deporte',
  marca: 'MG Readaptación Física',
}

// Antes era un hueco a rellenar en cada contrato. Se fija aquí porque nadie
// lo negociaba y el cliente no sabía qué poner.
export const PREAVISO_DIAS = 7

// Solo los dos programas que se venden. Si se quita una duración, los
// contratos ya firmados con ella siguen saliendo bien en el PDF (usan su foto
// de cláusulas); solo la lista de Clientes la enseñaría como "—".
export const DURACIONES = [
  { id: 'cuatrimestral', label: 'Cuatrimestral', detalle: '4 meses' },
  { id: 'semestral', label: 'Semestral', detalle: '6 meses' },
]

export const FORMAS_PAGO = [
  { id: 'completo', label: 'Pago completo' },
  { id: 'plazos', label: 'Pago a plazos' },
]

// seQura va aparte de Hotmart porque cambia el contrato: con seQura el
// cliente financia con ellos, a nosotros nos llega el importe entero y los
// plazos son cosa suya (ver cláusula 3). Se registra como pago completo.
export const METODOS_PAGO = [
  { id: 'stripe', label: 'Tarjeta (Stripe)' },
  { id: 'hotmart', label: 'Hotmart' },
  { id: 'sequra', label: 'Hotmart financiado con seQura' },
  { id: 'transferencia', label: 'Transferencia bancaria' },
]

export const OPCIONES_IMAGEN = [
  { id: 'no', label: 'NO autorizo el uso de mi imagen, voz ni testimonios.' },
  { id: 'escritos', label: 'Autorizo únicamente testimonios escritos.' },
  { id: 'imagen', label: 'Autorizo el uso de imágenes o vídeos con fines de divulgación profesional.' },
]

const etiqueta = (lista, id) => (lista.find((o) => o.id === id) || {}).label || '—'

export function formatoEuros(valor) {
  const n = Number(String(valor ?? '').replace(',', '.'))
  if (!Number.isFinite(n) || valor === '' || valor == null) return '—'
  return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €'
}

export function fechaLarga(fecha) {
  const d = fecha ? new Date(fecha) : new Date()
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Las cláusulas, ya con los datos del cliente dentro. Devuelve
// [{ titulo, parrafos: [string] }]: es lo que se enseña al firmar y lo que se
// guarda como foto en la fila.
export function clausulasContrato(d = {}) {
  const duracion = DURACIONES.find((x) => x.id === d.duracion)
  const pago = d.formaPago === 'plazos'
    ? `Pago a plazos: un primer pago de ${formatoEuros(d.primerPago)} y ${d.numPlazos || '—'} plazos de ${formatoEuros(d.importePlazo)}.`
    : `Pago completo, en un único pago de ${formatoEuros(d.importe)}.`

  return [
    {
      titulo: 'Reunidos',
      parrafos: [
        `De una parte, D. ${PROFESIONAL.nombre}, con DNI nº ${PROFESIONAL.dni}, ${PROFESIONAL.titulo}, con email de contacto ${PROFESIONAL.email}, que actúa bajo el nombre comercial ${PROFESIONAL.marca} (en adelante, «EL PROFESIONAL»).`,
        `Y de otra parte, D./Dña. ${d.nombre || '—'}, con DNI nº ${d.dni || '—'}, domicilio en ${d.domicilio || '—'} y email ${d.email || '—'} (en adelante, «EL CLIENTE»).`,
        'Ambas partes, reconociéndose plena capacidad para contratar, acuerdan suscribir el presente Contrato de Prestación de Servicios, que se regirá por las siguientes cláusulas.',
      ],
    },
    {
      titulo: '1. Objeto del contrato',
      parrafos: [
        'Prestación, por parte de EL PROFESIONAL, de un programa de readaptación física y deportiva personalizado, que incluye valoración inicial, diseño y planificación del entrenamiento, seguimiento diario, las videollamadas necesarias y controles semanales y mensuales.',
        'EL PROFESIONAL podrá apoyarse en los profesionales de su equipo (readaptadores y fisioterapeutas) para prestar el servicio, manteniendo en todo caso la responsabilidad frente a EL CLIENTE.',
      ],
    },
    {
      titulo: '2. Duración',
      parrafos: [
        `La duración del servicio será ${duracion ? `${duracion.label.toLowerCase()} (${duracion.detalle})` : '—'}, a contar desde el inicio del programa.`,
        `El contrato se renovará automáticamente por el mismo periodo, salvo que cualquiera de las partes comunique por escrito (vale email o WhatsApp) su voluntad de no renovar con al menos ${PREAVISO_DIAS} días de antelación al final del periodo en curso.`,
      ],
    },
    {
      titulo: '3. Honorarios y forma de pago',
      parrafos: [
        `El importe total de los servicios contratados asciende a ${formatoEuros(d.importe)}.`,
        pago,
        `Método de pago: ${etiqueta(METODOS_PAGO, d.metodoPago)}.`,
        // El matiz final no es adorno: con un crédito vinculado la ley le
        // deja al consumidor reclamar también a la financiera si el servicio
        // falla, y eso no se puede quitar por contrato.
        ...(d.metodoPago === 'sequra'
          ? ['Al financiar con seQura, EL PROFESIONAL recibe el importe total y el pago aplazado se rige por el contrato de financiación que EL CLIENTE suscribe directamente con seQura. Las cuotas, sus vencimientos, intereses y posibles impagos son responsabilidad de esa relación entre EL CLIENTE y seQura, no de EL PROFESIONAL, sin perjuicio de los derechos que la ley reconoce a EL CLIENTE como consumidor.']
          : []),
      ],
    },
    {
      titulo: '4. Compromisos de EL PROFESIONAL',
      parrafos: [
        'a) Evaluar la condición física y las necesidades de EL CLIENTE.',
        'b) Diseñar un programa personalizado de entrenamiento y readaptación.',
        'c) Realizar seguimiento diario del proceso.',
        'd) Mantener videollamadas y comunicación según las necesidades.',
        'e) Establecer controles semanales y mensuales de evolución.',
        'f) Si EL CLIENTE cumple íntegramente el plan (sesiones, registros y formularios) y demuestra compromiso, y aun así no se alcanzan los objetivos establecidos en la valoración inicial, EL PROFESIONAL devolverá el importe correspondiente al periodo contratado.',
      ],
    },
    {
      titulo: '5. Compromisos de EL CLIENTE',
      parrafos: [
        'a) Seguir el plan de entrenamiento y las pautas con diligencia.',
        'b) Avisar con antelación de cualquier cambio necesario.',
        'c) No compartir el material sin autorización de EL PROFESIONAL.',
        'd) Mantener el compromiso suficiente para lograr la recuperación.',
        'e) Informar con veracidad de su estado de salud, lesiones y medicación, y de cualquier cambio relevante. El programa no sustituye el diagnóstico ni el tratamiento médico: ante síntomas que lo requieran, EL CLIENTE acudirá a su médico.',
      ],
    },
    {
      titulo: '6. Desistimiento, cancelación y reembolsos',
      parrafos: [
        'Al contratarse a distancia, EL CLIENTE dispone de 14 días naturales para desistir. EL CLIENTE pide expresamente que el servicio empiece antes de que acabe ese plazo; si desiste dentro de él, abonará la parte proporcional del servicio ya prestado.',
        'Pasado ese plazo, en caso de desistimiento voluntario de EL CLIENTE sin causa justificada, no se reembolsarán las cantidades ya abonadas. Procederá la devolución únicamente en los términos de la cláusula 4.f).',
      ],
    },
    {
      titulo: '7. Protección de datos',
      parrafos: [
        'Los datos personales de EL CLIENTE serán tratados conforme al RGPD y a la LOPDGDD, con la única finalidad de prestar y gestionar el servicio contratado.',
        'Entre ellos hay datos de salud, que EL CLIENTE consiente expresamente que se traten para ese fin. Solo tendrán acceso los profesionales del equipo que intervienen en su programa y los proveedores imprescindibles para prestarlo (como la app de entrenamiento), y no se cederán a terceros salvo obligación legal.',
        `EL CLIENTE podrá ejercer sus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a ${PROFESIONAL.email}.`,
      ],
    },
    {
      titulo: '8. Autorización de uso de imagen y testimonio',
      parrafos: [
        `EL CLIENTE manifiesta: «${etiqueta(OPCIONES_IMAGEN, d.imagen)}»`,
        'La autorización es revocable en cualquier momento mediante comunicación escrita, sin efectos retroactivos sobre publicaciones ya realizadas.',
      ],
    },
    {
      titulo: '9. Firma electrónica',
      parrafos: [
        `Las partes aceptan la firma electrónica de este contrato a través del formulario online de ${PROFESIONAL.marca}, con la misma validez que la firma manuscrita. EL CLIENTE puede descargar su copia en el momento de firmar.`,
      ],
    },
    {
      titulo: '10. Jurisdicción',
      parrafos: [
        'Para cualquier controversia, las partes se someten a los Juzgados y Tribunales que correspondan según la normativa de protección de consumidores.',
      ],
    },
  ]
}

// Qué falta para poder firmar. Devuelve una lista de textos (vacía = listo).
export function faltasContrato(d = {}, hayFirma = false) {
  const faltas = []
  if (!String(d.nombre || '').trim()) faltas.push('tu nombre y apellidos')
  if (!String(d.dni || '').trim()) faltas.push('tu DNI')
  if (!String(d.domicilio || '').trim()) faltas.push('tu domicilio')
  if (!String(d.email || '').trim()) faltas.push('tu email')
  if (!d.duracion) faltas.push('la duración')
  if (!String(d.importe || '').trim()) faltas.push('el importe total')
  if (!d.formaPago) faltas.push('la forma de pago')
  if (d.formaPago === 'plazos' && (!d.primerPago || !d.numPlazos || !d.importePlazo)) faltas.push('el detalle de los plazos')
  if (!d.metodoPago) faltas.push('el método de pago')
  if (!d.imagen) faltas.push('la autorización de imagen')
  if (!d.aceptaContrato) faltas.push('aceptar las condiciones')
  if (!hayFirma) faltas.push('tu firma')
  return faltas
}

// Contrato del cliente. Mismo criterio que cuestionarioDeCliente: la lista
// viene ordenada por fecha descendente, así que el primero que casa es el
// último firmado.
export function contratoDeCliente(contratos, clienteNombre, normaliza) {
  const buscado = normaliza(clienteNombre)
  if (!buscado) return null
  return (contratos || []).find((c) => normaliza(c.clienteNombre) === buscado) || null
}

// Parámetros que puede llevar el enlace del onboarding, para que la closer
// deje rellenas las condiciones que ya ha cerrado con el cliente (y este no
// tenga que adivinar el importe). Los que lleguen en el enlace salen
// bloqueados en el formulario.
export const PARAMS_ENLACE = {
  c: 'nombre',
  d: 'duracion',
  i: 'importe',
  p: 'formaPago',
  pp: 'primerPago',
  n: 'numPlazos',
  ip: 'importePlazo',
  m: 'metodoPago',
}

export function datosDelEnlace() {
  const datos = {}
  try {
    const q = new URLSearchParams(window.location.search)
    Object.entries(PARAMS_ENLACE).forEach(([param, campo]) => {
      const v = q.get(param)
      if (v) datos[campo] = v
    })
  } catch (e) { /* sin parámetros: formulario en blanco */ }
  return datos
}

export function enlaceOnboarding(ruta, datos = {}, origen) {
  const base = origen || (typeof window !== 'undefined' ? window.location.origin : '')
  const q = new URLSearchParams()
  Object.entries(PARAMS_ENLACE).forEach(([param, campo]) => {
    const v = datos[campo]
    if (v !== undefined && v !== null && String(v).trim() !== '') q.set(param, String(v).trim())
  })
  const s = q.toString()
  return `${base}${ruta}${s ? `?${s}` : ''}`
}

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// "Descargar PDF": abre el contrato en una ventana nueva con formato de folio
// y lanza el diálogo de impresión, donde se elige "Guardar como PDF". Se hace
// así en vez de con una librería de PDF para no meter ~300 KB de dependencia
// en el bundle público por un botón.
//
// Usa la FOTO de cláusulas guardada (`contrato.texto`) si la hay; solo si no
// (vista previa antes de firmar) las genera con el código actual.
export function imprimirContrato(contrato) {
  const d = contrato.datos || {}
  const clausulas = (contrato.texto && contrato.texto.length) ? contrato.texto : clausulasContrato(d)
  const w = window.open('', '_blank')
  if (!w) {
    alert('El navegador ha bloqueado la ventana. Permite las ventanas emergentes para descargar el contrato.')
    return
  }
  const cuerpo = clausulas.map((c) => `
    <h2>${esc(c.titulo)}</h2>
    ${c.parrafos.map((p) => `<p>${esc(p)}</p>`).join('')}
  `).join('')

  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Contrato ${esc(d.nombre || contrato.clienteNombre || '')}</title>
<style>
  @page { size: A4; margin: 18mm 18mm 20mm; }
  body { font-family: Helvetica, Arial, sans-serif; color: #111; font-size: 11pt; line-height: 1.45; max-width: 760px; margin: 24px auto; padding: 0 16px; }
  h1 { font-size: 14pt; text-align: center; margin: 0 0 4px; }
  .sub { text-align: center; color: #555; font-size: 10pt; margin-bottom: 18px; }
  h2 { font-size: 11pt; margin: 14px 0 4px; }
  p { margin: 0 0 6px; text-align: justify; }
  .firmas { display: flex; gap: 32px; margin-top: 28px; page-break-inside: avoid; }
  .firma { flex: 1; }
  .firma-caja { border: 1px solid #999; height: 110px; display: flex; align-items: center; justify-content: center; }
  .firma-caja img { max-height: 104px; max-width: 100%; }
  .firma small { display: block; margin-top: 6px; color: #333; font-size: 9.5pt; }
  .pie { margin-top: 22px; font-size: 8.5pt; color: #777; border-top: 1px solid #ddd; padding-top: 8px; }
</style></head><body>
  <h1>CONTRATO DE PRESTACIÓN DE SERVICIOS DE READAPTACIÓN FÍSICA Y DEPORTIVA</h1>
  <div class="sub">Firmado electrónicamente el ${esc(fechaLarga(contrato.firmadoEn))}</div>
  ${cuerpo}
  <p style="margin-top:14px">Y en prueba de conformidad, firman el presente contrato en la fecha indicada.</p>
  <div class="firmas">
    <div class="firma">
      <strong>EL PROFESIONAL</strong>
      <div class="firma-caja"></div>
      <small>${esc(PROFESIONAL.nombre)} · DNI ${esc(PROFESIONAL.dni)}</small>
    </div>
    <div class="firma">
      <strong>EL CLIENTE</strong>
      <div class="firma-caja">${contrato.firma ? `<img src="${esc(contrato.firma)}" alt="Firma">` : ''}</div>
      <small>${esc(d.nombre || contrato.clienteNombre || '')} · DNI ${esc(d.dni || contrato.dni || '')}</small>
    </div>
  </div>
  <div class="pie">
    Firmado electrónicamente el ${esc(new Date(contrato.firmadoEn || Date.now()).toLocaleString('es-ES'))}
    · Contrato ${esc(contrato.version || VERSION_CONTRATO)} · Ref. ${esc(contrato.id || '—')}
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print() }, 250) }</script>
</body></html>`)
  w.document.close()
}
