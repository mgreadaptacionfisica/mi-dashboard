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
// Segundo vídeo, parecido al de arriba: se manda aparte y solo si hace falta,
// para que el primer mensaje siga pidiendo una sola cosa.
export const VIDEO_ENTRENAR_FUERTE = 'https://youtu.be/Sv-BZjINPyM'

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
  // Sin fecha en la ficha, textoCita() da un genérico que aquí no encajaría.
  const citaOHueco = lead.fechaAgenda ? cita : '[día y hora]'
  const hora = lead.horaAgenda ? lead.horaAgenda.slice(0, 5) : '[hora]'
  const enlace = lead.enlaceLlamada || '[enlace de la llamada]'
  switch (clave) {
    case 'contacto':
      return `Hola ${nombre}, soy ${closer}, del equipo de Raúl Morales. He visto que has reservado ${cita} por tu hombro. Te dejo un vídeo corto de Raúl donde explica cómo trabajamos y cómo va a ir la llamada, para que la aprovechemos al máximo: ${VIDEO_PRELLAMADA}\n\nPara preparármela: ¿qué es lo que más te limita ahora mismo? Y confírmame que te viene bien esa hora.`
    case 'recordatorio':
      return `${nombre}, mañana a las ${hora} tenemos la llamada sobre tu hombro. Busca un sitio tranquilo con cámara, son entre 30 y 45 minutos. ¿Pudiste ver el vídeo de Raúl? Respóndeme con un «sí» para dejarte el hueco confirmado.\n\nEl enlace de la llamada: ${enlace}`
    case 'aviso10':
      return `${nombre}, en 10 minutos te espero aquí: ${enlace}. ¡Hasta ahora!`
    case 'huecoAntes':
      return `${nombre}, he visto que tu llamada es ${citaOHueco}. Me ha quedado libre un hueco antes, el [día] a las [hora]. ¿Te lo paso a ese o prefieres dejarlo como está?`
    case 'pareja':
      return `${nombre}, si esta decisión la vas a hablar con [tu pareja / esa persona], lo mejor es que esté también en la llamada. Así escucha lo mismo que tú y os resuelvo las dudas a los dos. ¿Podría estar ${citaOHueco}?`
    case 'sinRespuesta':
      return `${nombre}, ¿has podido ver mi mensaje? Solo necesito que me confirmes si te viene bien la llamada: ${citaOHueco}.`
    case 'noEncaja':
      return `${nombre}, he estado mirando tu caso y prefiero ser claro: creo que ahora mismo nuestro programa no es lo que necesitas. Lo que yo haría en tu lugar es [recomendación]. Te libero la llamada para no hacerte perder el tiempo, y si la cosa cambia, aquí me tienes.`
    case 'videoFuerte':
      return `${nombre}, te dejo otro vídeo de Raúl sobre cómo volver a entrenar fuerte, para que llegues a la llamada con todo más claro: ${VIDEO_ENTRENAR_FUERTE}`
    case 'recordatorioManana':
      return `Buenos días, ${nombre}. Te recuerdo que hoy a las ${hora} tenemos la llamada. El enlace: ${enlace}`
    case 'espera':
      return 'Te estoy esperando en la llamada, ¿todo bien?'
    case 'noShow':
      return 'Nos hemos debido de cruzar. ¿Te viene mejor mañana a las [hora] o el [día] a las [hora]?'
    case 'audio24':
      return `${nombre}, me he quedado pensando en lo que me dijiste de [su objeción]. Justo [cliente] estaba en esa misma situación y [qué pasó / cómo se resolvió]. En tu caso lo haríamos así: [cómo]. Quería que lo tuvieras claro antes de decidir.`
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

// Todos los mensajes juntos, en el orden en que se usan, para el bloque
// "💬 Todos los mensajes" de la ficha. Incluye los que no dependen de un paso
// (no encaja, pareja, no show). `audio` = guion para grabar: solo se copia.
export const MENSAJES_WHATSAPP = [
  {
    grupo: 'Antes de la llamada',
    mensajes: [
      { clave: 'contacto', titulo: 'Primer contacto', cuando: 'Antes de 15 min' },
      { clave: 'huecoAntes', titulo: 'Ofrecer un hueco antes', cuando: 'Cita a más de 72 h' },
      { clave: 'pareja', titulo: 'Invitar a su pareja', cuando: 'Si no decide solo' },
      { clave: 'sinRespuesta', titulo: 'Sin respuesta', cuando: 'A las 4 h' },
      { clave: 'noEncaja', titulo: 'No encaja: orientar y liberar el hueco', cuando: 'Tras el triaje' },
      { clave: 'videoFuerte', titulo: 'Segundo vídeo: volver a entrenar fuerte', cuando: 'Días previos, si la cita tarda' },
      { clave: 'recordatorio', titulo: 'Recordatorio', cuando: '24 h antes' },
      { clave: 'recordatorioManana', titulo: 'Recordatorio de la mañana', cuando: 'Si la llamada es por la tarde' },
      { clave: 'aviso10', titulo: 'Aviso con el enlace', cuando: '10 min antes' },
    ],
  },
  {
    grupo: 'Si no aparece',
    mensajes: [
      { clave: 'espera', titulo: 'Te estoy esperando', cuando: 'Minuto 3, y llámale' },
      { clave: 'noShow', titulo: 'Proponer dos huecos', cuando: 'Minuto 10' },
    ],
  },
  {
    grupo: 'Si tuvo la llamada y no compró',
    mensajes: [
      { clave: 'resumen', titulo: 'Resumen', cuando: 'Mismo día' },
      { clave: 'audio24', titulo: 'Guion del audio sobre su objeción', cuando: 'A las 24 h', audio: true },
      { clave: 'pregunta48', titulo: 'Pregunta cerrada', cuando: 'A las 48 h' },
      { clave: 'ultimo', titulo: 'Último intento', cuando: 'A los 3 días' },
    ],
  },
]

// Casos de éxito del Manual del Closer (tabla "Casos de éxito"): `usar` es el
// perfil de lead con el que encaja y `gancho` lo que se le cuenta en el mensaje.
export const CASOS_EXITO = [
  { clave: 'maria', nombre: 'María', etiqueta: 'María · Pádel', usar: 'Juega al pádel, dolor en el día a día, mujer deportista, quiere volver a su deporte.', gancho: 'que volvió a jugar al pádel sin dolor', enlaces: ['https://www.instagram.com/reel/DFaQ8-LojwS/'] },
  { clave: 'gabor', nombre: 'Gabor', etiqueta: 'Gabor · Gym', usar: 'Le han recomendado operar, miedo a la operación, quiere evitar la cirugía.', gancho: 'a quien le dijeron que necesitaba operarse y evitó la cirugía', enlaces: ['https://www.instagram.com/reel/DQJ2VafjPVZ/'] },
  { clave: 'carlos', nombre: 'Carlos', etiqueta: 'Carlos · Gym', usar: 'Meses o años con dolor, ha probado infiltraciones, frustración acumulada.', gancho: 'que llevaba 2 años con dolor e infiltraciones sin resultado', enlaces: ['https://www.instagram.com/reel/DK9SG8qILMr/'] },
  { clave: 'adan', nombre: 'Adán', etiqueta: 'Adán · Gym', usar: 'Dolor nocturno, dolor fuerte en el día a día, ha ido a urgencias o al ambulatorio.', gancho: 'que no dormía por el dolor', enlaces: ['https://youtu.be/jNX05yz_JQ0'] },
  { clave: 'saulo', nombre: 'Saulo', etiqueta: 'Saulo · Gym / CrossFit', usar: 'No ha parado de entrenar pero tiene dolor, no quiere dejar de entrenar.', gancho: 'que entrenaba siempre con dolor y ahora entrena igual de fuerte sin él', enlaces: ['https://youtu.be/GSBWMjlNViU'] },
  { clave: 'josemiguel1', nombre: 'José Miguel', etiqueta: 'José Miguel (1) · Gym', usar: 'Calcificación, persona mayor que duda de poder recuperarse.', gancho: 'que tenía una calcificación y dudaba por la edad', enlaces: ['https://www.instagram.com/reel/C5Yy0eeoHA2/', 'https://www.instagram.com/reel/C5blSyJoJ75/'] },
  { clave: 'josemiguel2', nombre: 'José Miguel', etiqueta: 'José Miguel (2) · Gym', usar: 'Miedo a que la lesión vuelva, duda de que el resultado dure.', gancho: 'que meses después sigue sin recaídas y sin miedo a entrenar', enlaces: ['https://www.instagram.com/reel/DV9WNpFjXoE/'] },
  { clave: 'david', nombre: 'David', etiqueta: 'David · Entrenador', usar: 'Profesional del fitness, sabe entrenar pero no aplicarlo a su lesión.', gancho: 'entrenador que no sabía readaptar su propio hombro', enlaces: ['https://youtu.be/tEPe4imc3e8'] },
  { clave: 'jaime', nombre: 'Jaime', etiqueta: 'Jaime · Entrenador', usar: 'Formación de entrenador, busca especialistas, «yo ya sé entrenar», mucho tiempo sin entrenar, muy tocado a nivel mental.', gancho: 'entrenador titulado que llevaba casi 3 años sin poder entrenar', enlaces: ['https://youtu.be/pFnCTT2aO80'] },
]

export function textoCasoExito(caso, lead) {
  return `${primerNombre(lead)}, te comparto el caso de ${caso.nombre}, ${caso.gancho}:\n${caso.enlaces.join('\n')}\n\nCreo que te va a resultar útil.`
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
