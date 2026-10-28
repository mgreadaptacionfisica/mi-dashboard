// Protocolo de la llamada de venta, paso a paso, para ir marcándolo en la
// ficha de cada lead (Ventas → Pipeline). Es el mismo protocolo del Manual del
// Closer, pero aquí cada paso es una casilla y los que son un mensaje llevan
// su plantilla, que se abre ya escrita en WhatsApp.
//
// Dónde se guarda (sin migración, en columnas jsonb que ya existían):
// - Pasos antes de la llamada → `preLlamada[clave]`. Las claves `whatsapp`,
//   `prellamada` y `recordatorio` son las tres casillas de siempre y NO se
//   renombran: el Embudo (`checklistCompleto` en embudoVentas.js) y la ficha
//   del closer (comisionesCloser.js) las usan para comparar la asistencia
//   con y sin checklist.
// - Pasos del seguimiento de 48 h → `seguimiento.pasos[clave]`.

export const VIDEO_PRELLAMADA = 'https://youtu.be/0YRQGIje8fw'

// `plantilla` = clave en textoPlantilla(); los pasos sin ella son cosas que se
// hacen (un audio, preparar la llamada), no un mensaje que se pueda escribir.
export const PASOS_PRELLAMADA = [
  {
    clave: 'triaje',
    titulo: 'Triaje: ¿encaja?',
    cuando: 'Al reservar',
    ayuda: 'Meses con dolor + ha probado cosas + quiere volver a su deporte → llamada completa. Muy poco tiempo con dolor → llamada corta (low ticket). No es lo nuestro → se le orienta por WhatsApp y se libera el hueco.',
  },
  {
    clave: 'whatsapp',
    titulo: 'Primer contacto por WhatsApp',
    cuando: 'Antes de 15 min',
    ayuda: 'Mejor un audio de 30–40 s que un texto. Si decide con su pareja, invítala ya a la llamada. Si la cita está a más de 72 h, ofrécele un hueco antes.',
    plantilla: 'contacto',
  },
  {
    clave: 'prellamada',
    titulo: 'Vídeo prellamada enviado',
    cuando: 'Con el primer contacto',
    ayuda: 'Va dentro del mensaje de primer contacto. Si no lo has puesto ahí, mándalo aparte.',
  },
  {
    clave: 'contesto',
    titulo: 'Ha contestado',
    cuando: 'En las primeras horas',
    ayuda: 'Quien contesta antes de la llamada viene mucho más. Si en 4 h no ha contestado, segundo mensaje corto o llamada.',
  },
  {
    clave: 'recordatorio',
    titulo: 'Recordatorio 24 h antes',
    cuando: 'El día anterior',
    ayuda: 'Pide confirmación explícita y pregunta por el vídeo. Si no confirma, llámale 2–3 h antes de la cita.',
    plantilla: 'recordatorio',
  },
  {
    clave: 'aviso10',
    titulo: 'Aviso 10 min antes con el enlace',
    cuando: '10 min antes',
    plantilla: 'aviso10',
  },
  {
    clave: 'preparada',
    titulo: 'Llamada preparada',
    cuando: '5 min antes',
    ayuda: 'Lee la ficha y el informe. Escribe 3 hipótesis (qué le duele, qué ha probado, qué quiere), elige su caso de éxito y ten abiertos los enlaces de pago.',
  },
]

// Seguimiento de 48 h cuando tuvo la llamada y no compró en ella (etapa
// Seguimiento con origen normal, no el de reagendar un no show).
export const PASOS_SEGUIMIENTO = [
  {
    clave: 'resumen',
    titulo: 'Resumen por WhatsApp',
    cuando: 'Mismo día',
    ayuda: 'Lo que te contó, lo que le propones y cuándo le escribes. Adjunta el caso de éxito que responde a su duda.',
    plantilla: 'resumen',
  },
  {
    clave: 'audio24',
    titulo: 'Audio que responde a su objeción',
    cuando: 'A las 24 h',
    ayuda: 'Corto y personal, sobre SU objeción concreta. Nunca «¿qué tal, lo has pensado?».',
  },
  {
    clave: 'pregunta48',
    titulo: 'Pregunta cerrada',
    cuando: 'A las 48 h',
    ayuda: 'Sí → pago. No → márcalo como perdido con el motivo real.',
    plantilla: 'pregunta48',
  },
  {
    clave: 'ultimo',
    titulo: 'Último intento',
    cuando: 'A los 3 días sin respuesta',
    ayuda: 'Si tampoco contesta, márcalo como perdido. Un seguimiento que se alarga semanas casi nunca cierra.',
    plantilla: 'ultimo',
  },
]

// Guion de la llamada en una pantalla, para tenerlo abierto mientras se
// habla. La versión larga (con el porqué de cada paso) está en el manual.
export const GUION_LLAMADA = [
  {
    titulo: 'Conexión',
    minutos: '2 min',
    frases: [
      '«Hola [nombre], ¿qué tal? ¿Desde dónde me hablas?»',
      '«Me dijiste que lo que más te limita es […]. ¿Pudiste ver el vídeo de Raúl?»',
    ],
  },
  {
    titulo: 'Marco',
    minutos: '2 min',
    frases: [
      '«Te hago unas preguntas para entender bien tu caso. Si veo que te podemos ayudar, te explico cómo y lo que cuesta; si no, te lo digo igual de claro.»',
      '«Lo único que te pido es que al final me digas un sí o un no. ¿Te parece justo?»',
      '«Si al final lo ves claro, ¿la decisión es solo tuya o lo quieres hablar con alguien?»',
    ],
  },
  {
    titulo: 'Descubrimiento',
    minutos: '12–15 min',
    frases: [
      'Presente: «¿Qué has dejado de hacer por el hombro?» → «¿Y eso cómo te afecta?» → «¿Y cómo te sientes con eso?»',
      'Pasado: «¿Qué has probado y por qué crees que no funcionó? ¿Cuánto llevas gastado en intentarlo?»',
      'Futuro: «¿Cómo te verías en 4–6 meses sin la lesión?» · «Si dentro de seis meses sigues igual, ¿qué pasa?»',
      'Por qué ahora: «Llevas [X meses] así. ¿Por qué pedir ayuda ahora y no hace tres meses?»',
      'Prioridad: «Del 1 al 10, ¿cuánta prioridad tiene solucionarlo ya?» 8+ → «¿Por qué un 8 y no un 5?» · <7 → «¿Qué haría falta para que fuera un 9?»',
    ],
  },
  {
    titulo: 'Resumen',
    minutos: '2 min',
    frases: [
      '«A ver si lo he entendido: llevas [tiempo] con dolor, has probado [X], has dejado de [Y] y quieres [objetivo] porque [motivo]. ¿Es así?»',
      'Espera al «sí, eso es». Entonces: «¿Quieres que te cuente cómo lo trabajaríamos en tu caso?»',
    ],
  },
  {
    titulo: 'Propuesta',
    minutos: '5 min',
    frases: [
      '«Tú me has dicho [frase suya]. Por eso empezamos con […].» Tres conexiones bastan; no repitas el vídeo.',
      'Nombra su caso de éxito.',
      'Termómetro: «Del 1 al 10, ¿cuánto ves que esto es lo que necesitas?» <8 → «¿Qué te falta para verlo un 10?»',
    ],
  },
  {
    titulo: 'Precio y cierre',
    minutos: '3 min',
    frases: [
      '«Por lo que me has contado, te recomiendo el [plan], porque [motivo]. Son [precio]. ¿Lo empezamos?»',
      'Y te callas. Ni financiación ni matices hasta que hable.',
    ],
  },
  {
    titulo: 'Pago',
    minutos: '3–5 min',
    frases: [
      '«Te paso el enlace por WhatsApp y lo hacemos juntos ahora.»',
      'Onboarding desde la venta («Copiar enlace») y: «Has tomado una buena decisión. Lo difícil era dar el paso.»',
    ],
  },
]

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// "el martes 3 de noviembre a las 18:00". Se parte el ISO a mano (sin
// new Date('YYYY-MM-DD'), que lo toma en UTC y puede dar el día anterior).
function textoCita(lead) {
  const [a, m, d] = (lead.fechaAgenda || '').split('-').map(Number)
  if (!a || !m || !d) return lead.horaAgenda ? `a las ${lead.horaAgenda}` : 'para la llamada'
  const fecha = new Date(a, m - 1, d)
  const dia = `el ${DIAS_SEMANA[fecha.getDay()]} ${d} de ${MESES[m - 1]}`
  return lead.horaAgenda ? `${dia} a las ${lead.horaAgenda.slice(0, 5)}` : dia
}

const primerNombre = (lead) => (lead.nombre || '').trim().split(/\s+/)[0] || ''

// Lo que va entre corchetes lo completa la closer antes de enviar: el enlace
// abre WhatsApp con el texto como borrador, no lo manda solo.
export function textoPlantilla(clave, lead) {
  const nombre = primerNombre(lead)
  const closer = lead.closer || '[tu nombre]'
  const cita = textoCita(lead)
  switch (clave) {
    case 'contacto':
      return `Hola ${nombre}, soy ${closer}, del equipo de Raúl Morales. He visto que has reservado ${cita} por tu hombro. Te dejo un vídeo corto de Raúl donde explica cómo trabajamos y cómo va a ir la llamada, para que la aprovechemos al máximo: ${VIDEO_PRELLAMADA}\n\nPara preparármela: ¿qué es lo que más te limita ahora mismo? Y confírmame que te viene bien esa hora.`
    case 'recordatorio':
      return `${nombre}, mañana a las ${(lead.horaAgenda || '[hora]').slice(0, 5)} tenemos la llamada sobre tu hombro. Busca un sitio tranquilo con cámara, son unos 30 minutos. ¿Pudiste ver el vídeo de Raúl? Respóndeme con un «sí» para dejarte el hueco confirmado.${lead.enlaceLlamada ? `\n\nEl enlace de la llamada: ${lead.enlaceLlamada}` : ''}`
    case 'aviso10':
      return `${nombre}, en 10 minutos te espero aquí: ${lead.enlaceLlamada || '[enlace de la llamada]'}. ¡Hasta ahora!`
    case 'resumen':
      return `${nombre}, gracias por la llamada de hoy. Lo que me contaste: [resumen con sus palabras]. Lo que te propongo: [plan] porque [motivo]. Te escribo el [día] para que me digas sí o no.`
    case 'pregunta48':
      return `${nombre}, quedamos en hablar hoy. ¿Te guardo la plaza o se la doy a otra persona?`
    case 'ultimo':
      return `${nombre}, te escribo por última vez para no molestarte. Si en algún momento quieres retomarlo, aquí estoy.`
    default:
      return ''
  }
}

// wa.me necesita el número con prefijo y solo dígitos. Un móvil español de 9
// cifras sin prefijo se completa con 34 (casi todos los leads). Sin teléfono
// se abre WhatsApp para elegir el chat a mano.
export function enlaceWhatsApp(telefono, texto) {
  let digitos = String(telefono || '').replace(/\D/g, '')
  if (digitos.startsWith('00')) digitos = digitos.slice(2)
  if (digitos.length === 9 && /^[6789]/.test(digitos)) digitos = `34${digitos}`
  return `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`
}

// Progreso del protocolo pre-llamada, para la tarjeta del pipeline: cuántos
// van y cuál es el siguiente sin hacer.
export function progresoPrellamada(lead) {
  const hechos = PASOS_PRELLAMADA.filter((p) => lead.preLlamada?.[p.clave])
  const siguiente = PASOS_PRELLAMADA.find((p) => !lead.preLlamada?.[p.clave]) || null
  return { hechos: hechos.length, total: PASOS_PRELLAMADA.length, siguiente }
}
