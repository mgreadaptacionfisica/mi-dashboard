// Leadmagnets de MG Readaptación Física: el CONTENIDO de cada página pública.
//
// Cada uno vive en su ruta (ver PUBLIC_PATHS en App.jsx) y lo pinta
// LeadMagnet.jsx. El flujo es siempre: entradilla → (preguntas, si es un test)
// → nombre/email/WhatsApp → resultado o recurso en pantalla, imprimible como
// PDF con el botón «Descargar PDF». El contacto se guarda en
// `leadmagnet_leads` (migración 80) y sale en Ventas → 🧲 Leadmagnets.
//
// Para añadir uno nuevo: copia un bloque, cambia `slug` y `ruta`, y añade la
// ruta a PUBLIC_PATHS en App.jsx. El texto lo puede tocar Raúl sin miedo; lo
// único que no se debe cambiar en uno ya publicado es el `slug` (es lo que
// queda guardado en cada contacto).
//
// tipos:
//  - 'test':     preguntas con puntos → tramo de resultado (verde/amarillo/rojo)
//  - 'recurso':  contenido fijo (secciones), opcionalmente con una pregunta
//                previa que elige qué versión enseñar (`variantes`)

export const WHATSAPP_MG = '34685635028'

export const AVISO_SANITARIO =
  'Este material es divulgativo y no sustituye una valoración profesional. Si tienes dolor intenso, ' +
  'pérdida de fuerza repentina, hormigueo, dolor nocturno que no cede o has tenido un golpe o caída, ' +
  'consulta con un profesional sanitario antes de entrenar.'

// Tramos de resultado: `min` es la puntuación mínima (sobre el total del test).
const COLOR_TRAMO = { verde: '#008A41', amarillo: '#d97706', rojo: '#dc2626' }
export { COLOR_TRAMO }

export const LEADMAGNETS = [
  // ───────────────────────────────────────────────────────────── 1
  {
    slug: 'test-recuperacion',
    ruta: '/test-recuperacion',
    tipo: 'test',
    titulo: '¿Estás recuperado de verdad?',
    gancho: 'Que ya no te duela no significa que estés recuperado.',
    entradilla:
      'El error más común después de una lesión es dar por hecho que, si ya no duele, está curado. ' +
      'Pero recuperarse es volver a tolerar la carga de tu día a día y de tu deporte sin recaer. ' +
      'Responde estas 10 preguntas (2 minutos) y te decimos en qué punto estás de verdad.',
    meta: ['2 minutos', '10 preguntas', 'Resultado al momento'],
    preguntaZona: true,
    preguntas: [
      {
        id: 'p1',
        texto: '¿Te duele en el día a día (vestirte, coger cosas, dormir, subir escaleras)?',
        opciones: [['Nunca', 2], ['A veces', 1], ['A menudo', 0]],
      },
      {
        id: 'p2',
        texto: '¿Has vuelto a entrenar o a hacer tu deporte con la misma carga que antes de la lesión?',
        opciones: [['Sí, igual o más', 2], ['Sí, pero con menos peso o intensidad', 1], ['No', 0]],
      },
      {
        id: 'p3',
        texto: 'Al día siguiente de entrenar fuerte, ¿cómo está la zona?',
        opciones: [['Igual que antes de entrenar', 2], ['Algo molesta, pero se pasa en menos de 24 h', 1], ['Peor, y dura más de 24 h', 0]],
      },
      {
        id: 'p4',
        texto: '¿Evitas algún ejercicio o movimiento por miedo a que vuelva el dolor?',
        opciones: [['No, hago de todo', 2], ['Alguno', 1], ['Varios', 0]],
      },
      {
        id: 'p5',
        texto: 'Comparado con el lado sano, ¿tienes la misma fuerza?',
        opciones: [['Sí, lo he comprobado', 2], ['No lo sé', 1], ['No, el lado lesionado es más débil', 0]],
      },
      {
        id: 'p6',
        texto: 'Comparado con el lado sano, ¿tienes el mismo rango de movimiento?',
        opciones: [['Sí', 2], ['Casi', 1], ['No', 0]],
      },
      {
        id: 'p7',
        texto: 'En tu recuperación, ¿has hecho entrenamiento de fuerza progresivo (subiendo cargas semana a semana)?',
        opciones: [['Sí, pautado por un profesional', 2], ['Algo, por mi cuenta', 1], ['No: solo terapia, gomas o reposo', 0]],
      },
      {
        id: 'p8',
        texto: 'Cuando te dieron el alta (o te la diste tú), ¿por qué fue?',
        opciones: [['Porque pasé pruebas de fuerza y función', 2], ['No me dieron alta / no lo sé', 1], ['Porque ya no dolía', 0]],
      },
      {
        id: 'p9',
        texto: '¿Has tenido recaídas o molestias que vuelven en el último año?',
        opciones: [['Ninguna', 2], ['Una', 1], ['Varias', 0]],
      },
      {
        id: 'p10',
        texto: '¿Confías al 100 % en esa zona en movimientos rápidos, explosivos o con mucho peso?',
        opciones: [['Sí', 2], ['Más o menos', 1], ['No', 0]],
      },
    ],
    tramos: [
      {
        min: 16,
        color: 'verde',
        titulo: 'Estás recuperado (o muy cerca)',
        texto:
          'Toleras la carga, tienes fuerza y confianza. Ahora el objetivo es que no vuelva: mantén el ' +
          'trabajo de fuerza de esa zona 1-2 veces por semana y progresa con cabeza.',
        claves: [
          'No dejes del todo los ejercicios de la recuperación: pasa a hacerlos como mantenimiento.',
          'Si subes mucho la carga o cambias de deporte, vigila la respuesta a las 24 h.',
          'Si aparece una molestia que dura más de 24-48 h, baja la carga antes de que vaya a más.',
        ],
      },
      {
        min: 9,
        color: 'amarillo',
        titulo: 'Sin dolor no es lo mismo que recuperado',
        texto:
          'Probablemente ya no te duele en el día a día, pero hay huecos: fuerza, rango, confianza o ' +
          'tolerancia a la carga. Es justo la fase en la que más gente recae, porque vuelve a entrenar ' +
          'como antes sin haber preparado el tejido.',
        claves: [
          'Compara fuerza y movilidad con el lado sano: si hay diferencia, ahí está el trabajo.',
          'Sube la carga de forma progresiva, no de golpe: el tejido se adapta a lo que le pides poco a poco.',
          'El miedo a un movimiento también se entrena: se recupera haciéndolo con una carga que toleres.',
        ],
      },
      {
        min: 0,
        color: 'rojo',
        titulo: 'Todavía no estás recuperado',
        texto:
          'El dolor, las recaídas o la falta de fuerza te dicen que el proceso no está terminado. No es ' +
          'culpa tuya ni de tu cuerpo: lo normal es que falte la parte de carga progresiva y adaptada a ' +
          'tu deporte, que es la que te deja volver sin miedo.',
        claves: [
          'El reposo y las terapias pasivas calman, pero no preparan el tejido para volver a cargar.',
          'Cuanto antes empieces un trabajo de fuerza bien dosificado, más fácil será.',
          'Necesitas un plan con progresión y alguien que lo ajuste según cómo respondes.',
        ],
      },
    ],
    cta: 'Si quieres que miremos tu caso y te digamos qué te falta para volver, escríbenos y te explicamos cómo trabajamos.',
  },

  // ───────────────────────────────────────────────────────────── 2
  {
    slug: 'semaforo-dolor',
    ruta: '/semaforo-dolor',
    tipo: 'recurso',
    titulo: 'El semáforo del dolor',
    gancho: 'Cuándo seguir entrenando, cuándo bajar y cuándo parar.',
    entradilla:
      'Con una lesión, la pregunta de cada entreno es la misma: «¿esto que noto es normal o me estoy ' +
      'haciendo daño?». El semáforo del dolor te da una regla sencilla para decidir sin miedo y sin ' +
      'parar de entrenar más de lo necesario.',
    meta: ['1 página', 'Para imprimir o guardar en el móvil'],
    secciones: [
      {
        titulo: 'Cómo se usa',
        texto:
          'Puntúa tu dolor de 0 (nada) a 10 (el peor imaginable) en dos momentos: DURANTE el ejercicio y ' +
          'a la MAÑANA SIGUIENTE. Con esas dos notas, mira en qué color estás.',
      },
      {
        titulo: '🟢 Verde: sigue y progresa',
        color: 'verde',
        puntos: [
          'Dolor de 0 a 3 sobre 10 durante el ejercicio.',
          'Al día siguiente estás igual que antes de entrenar.',
          'Puedes mantener el ejercicio y subir un poco la carga la próxima sesión.',
        ],
      },
      {
        titulo: '🟡 Amarillo: mantén, no subas',
        color: 'amarillo',
        puntos: [
          'Dolor de 4 a 5 sobre 10 durante el ejercicio, o una molestia que dura hasta 24 h.',
          'Repite la misma carga la próxima vez; no progreses todavía.',
          'Ajusta algo: menos rango, más lento, menos series o algo menos de peso.',
        ],
      },
      {
        titulo: '🔴 Rojo: baja la carga',
        color: 'rojo',
        puntos: [
          'Dolor de más de 5 sobre 10, o que va subiendo serie a serie.',
          'Al día siguiente estás peor y dura más de 24-48 h.',
          'Baja claramente la carga (o cambia el ejercicio) hasta volver a verde. No es parar: es dosificar.',
        ],
      },
      {
        titulo: 'Cómo ajustar sin dejar de entrenar',
        puntos: [
          'Rango: haz el movimiento solo hasta donde no pase de verde.',
          'Velocidad: más lento (3-4 s bajando) suele doler menos y sigue siendo muy útil.',
          'Carga y volumen: menos peso o menos series antes que dejar el ejercicio.',
          'Ejercicio: cambia a una variante parecida que toleres (máquina, polea, agarre neutro…).',
          'Frecuencia: deja 48 h entre sesiones de la zona lesionada.',
        ],
      },
      {
        titulo: '⛔ Cuándo parar y consultar',
        color: 'rojo',
        puntos: [
          'Dolor nocturno intenso que no cambia con la postura.',
          'Pérdida de fuerza repentina, hormigueo o adormecimiento.',
          'Inflamación grande, calor o deformidad, o después de un golpe o caída.',
          'Fiebre o malestar general junto con el dolor.',
        ],
      },
    ],
    cta: 'Si llevas tiempo moviéndote entre el amarillo y el rojo y no sabes cómo salir de ahí, escríbenos y lo vemos.',
  },

  // ───────────────────────────────────────────────────────────── 3
  {
    slug: 'autotest-hombro',
    ruta: '/autotest-hombro',
    tipo: 'test',
    titulo: 'Autotest de hombro en casa',
    gancho: '6 pruebas de 5 minutos para saber cómo está tu hombro.',
    entradilla:
      'Haz estas 6 pruebas con el hombro que te molesta y compáralo con el otro. No necesitas material ' +
      '(como mucho una botella de agua o una mancuerna de 1-2 kg). Para cada prueba, marca lo que te ha ' +
      'pasado y al final verás tu resultado.',
    meta: ['5 minutos', '6 pruebas', 'Sin material'],
    preguntaLado: true,
    preguntas: [
      {
        id: 'a1',
        texto: '1. Elevación por delante, de espaldas a la pared',
        pista:
          'De pie con la espalda, la cabeza y el culo pegados a la pared. Sube el brazo estirado por delante ' +
          'hasta arriba intentando tocar la pared con el pulgar, sin despegar la zona lumbar.',
        video: '',
        opciones: [['Toco la pared sin dolor', 2], ['Llego casi, o con algo de molestia', 1], ['Me quedo lejos o duele bastante', 0]],
      },
      {
        id: 'a2',
        texto: '2. Arco doloroso (elevación lateral)',
        pista:
          'Sube el brazo estirado por el lateral, despacio, hasta arriba, y bájalo igual de despacio. ' +
          'Fíjate si duele en el tramo del medio (más o menos entre la altura del hombro y un poco por encima).',
        video: '',
        opciones: [['No duele en ningún momento', 2], ['Molesta un poco en el tramo medio', 1], ['Duele claramente o no puedo subirlo', 0]],
      },
      {
        id: 'a3',
        texto: '3. Rascarse la espalda',
        pista:
          'Lleva la mano por detrás de la espalda, desde abajo, e intenta subirla lo más alto que puedas ' +
          'entre los omóplatos. Compara hasta dónde llegas con el otro brazo.',
        video: '',
        opciones: [['Llego igual que con el otro lado', 2], ['Llego algo menos (un palmo o menos)', 1], ['Llego mucho menos o duele', 0]],
      },
      {
        id: 'a4',
        texto: '4. Rotación externa con el codo pegado',
        pista:
          'Codo pegado al cuerpo y doblado a 90º, antebrazo hacia delante. Abre la mano hacia fuera girando ' +
          'el brazo, sin despegar el codo. Compara el recorrido con el otro lado.',
        video: '',
        opciones: [['El mismo recorrido, sin dolor', 2], ['Algo menos de recorrido o algo de molestia', 1], ['Bastante menos o duele', 0]],
      },
      {
        id: 'a5',
        texto: '5. Fuerza de rotación externa',
        pista:
          'Túmbate de lado sobre el hombro sano, con una toalla entre el codo y el costado. Con una botella ' +
          'o mancuerna de 1-2 kg, gira el antebrazo hacia arriba y abajo despacio. Cuenta las repeticiones ' +
          'limpias antes de que la técnica se rompa o aparezca dolor.',
        video: '',
        opciones: [['15 o más, sin dolor', 2], ['Entre 8 y 14', 1], ['Menos de 8, o duele', 0]],
      },
      {
        id: 'a6',
        texto: '6. Flexiones (en el suelo o apoyado en la pared)',
        pista:
          'Haz flexiones con la versión que uses normalmente (suelo, rodillas o pared). Cuenta las que haces ' +
          'con buena técnica y fíjate en el hombro.',
        video: '',
        opciones: [['10 o más, sin dolor', 2], ['Puedo, pero molesta o hago menos de 10', 1], ['No puedo o duele bastante', 0]],
      },
    ],
    tramos: [
      {
        min: 10,
        color: 'verde',
        titulo: 'Tu hombro está en buena forma',
        texto:
          'Movilidad y fuerza parecidas al otro lado y sin dolor. Si aun así te molesta al entrenar, ' +
          'lo más probable es que el problema sea de gestión de cargas (cuánto, cuándo y cómo entrenas), ' +
          'no del hombro en sí.',
        claves: [
          'Mantén 1-2 días por semana de trabajo de manguito rotador y escápula.',
          'Revisa la progresión de tus ejercicios de empuje y por encima de la cabeza.',
          'Usa el semáforo del dolor para decidir cuándo subir carga.',
        ],
      },
      {
        min: 6,
        color: 'amarillo',
        titulo: 'Hay cosas que trabajar',
        texto:
          'Alguna prueba sale peor que en el otro lado: falta rango, fuerza o tolerancia en algún tramo. ' +
          'Es lo típico de un hombro que «va tirando» pero que se queja cuando aprietas en el gimnasio.',
        claves: [
          'Trabaja específicamente lo que ha salido peor (rango, rotación externa o empuje).',
          'Mientras tanto, adapta los ejercicios que duelen en vez de dejarlos del todo.',
          'Repite el autotest en 4 semanas para ver si mejoras.',
        ],
      },
      {
        min: 0,
        color: 'rojo',
        titulo: 'Tu hombro necesita un plan',
        texto:
          'Varias pruebas salen con dolor o muy por debajo del otro lado. No es para alarmarse, pero sí ' +
          'para dejar de esperar a que se pase solo: con un trabajo de fuerza progresivo y bien dosificado ' +
          'estos números mejoran.',
        claves: [
          'Evita por ahora las cargas altas por encima de la cabeza y los rangos que duelen.',
          'No te quedes en reposo: un hombro que no se carga pierde todavía más tolerancia.',
          'Lo ideal es que alguien valore tu caso y te paute por dónde empezar.',
        ],
      },
    ],
    cta: 'Si quieres que revisemos tu resultado contigo y te digamos por dónde empezar, escríbenos por WhatsApp.',
  },

  // ───────────────────────────────────────────────────────────── 4
  {
    slug: 'plantilla-manguito',
    ruta: '/plantilla-manguito',
    tipo: 'recurso',
    titulo: 'Plantilla semanal: entrenar con lesión de manguito rotador',
    gancho: 'Cómo repartir tu semana de gimnasio sin dejar de entrenar.',
    entradilla:
      'Con una lesión de manguito rotador no hace falta dejar el gimnasio: hace falta repartir bien la ' +
      'semana. Elige en qué punto estás y te damos la distribución semanal, qué ejercicios priorizar y ' +
      'cómo progresar.',
    meta: ['3 fases', 'Semana tipo de 4 días', 'Para imprimir'],
    preguntaVariante: {
      texto: '¿Cómo está tu hombro ahora mismo?',
      opciones: [
        ['fase1', 'Me duele bastante (más de 4/10) y me molesta en el día a día'],
        ['fase2', 'Me duele poco (3/10 o menos), sobre todo al entrenar'],
        ['fase3', 'Casi no me duele, pero no me atrevo a cargar como antes'],
      ],
    },
    variantes: {
      fase1: {
        titulo: 'Fase 1 · Calmar y seguir entrenando',
        objetivo: 'Bajar la irritación del hombro sin perder forma física en el resto del cuerpo.',
        semana: [
          ['Lunes', 'Pierna + hombro A (isométricos)'],
          ['Martes', 'Tirón sin dolor (remo con apoyo, jalón en rango cómodo) + core'],
          ['Miércoles', 'Descanso activo: caminar, bici, movilidad suave'],
          ['Jueves', 'Pierna + hombro A (isométricos)'],
          ['Viernes', 'Brazos y torso adaptados (sin dolor) + hombro A'],
          ['Sábado', 'Cardio o deporte sin uso del brazo'],
          ['Domingo', 'Descanso'],
        ],
        bloques: [
          {
            titulo: 'Hombro A: isométricos',
            puntos: [
              'Rotación externa contra la pared o una puerta: 5 × 30-45 s empujando a un 30-50 % de tu fuerza.',
              'Rotación interna, igual: 5 × 30-45 s.',
              'Abducción (empujar el codo hacia fuera contra la pared): 5 × 30-45 s.',
              'Deben quedarse en verde en el semáforo del dolor (0-3/10).',
            ],
          },
          {
            titulo: 'Qué evitar por ahora',
            puntos: [
              'Press por encima de la cabeza y elevaciones laterales con peso.',
              'Fondos y press de banca con rango completo si duelen.',
              'Dormir sobre ese hombro, si puedes evitarlo.',
            ],
          },
        ],
        progresion: 'Cuando lleves 1-2 semanas con dolor de 3/10 o menos en el día a día, pasa a la fase 2.',
      },
      fase2: {
        titulo: 'Fase 2 · Construir fuerza',
        objetivo: 'Que el manguito y la escápula vuelvan a tolerar carga, con progresión semanal.',
        semana: [
          ['Lunes', 'Pierna + hombro B (manguito)'],
          ['Martes', 'Torso: tirón completo + empuje horizontal en rango sin dolor'],
          ['Miércoles', 'Descanso activo o cardio'],
          ['Jueves', 'Pierna + hombro B (manguito)'],
          ['Viernes', 'Torso: empuje adaptado (mancuernas, agarre neutro) + escápula'],
          ['Sábado', 'Cardio o deporte'],
          ['Domingo', 'Descanso'],
        ],
        bloques: [
          {
            titulo: 'Hombro B: manguito y escápula (2-3 días por semana, con 48 h entre medias)',
            puntos: [
              'Rotación externa tumbado de lado con mancuerna: 3 × 10-15.',
              'Rotación externa con goma o polea a 0º (codo pegado): 3 × 12-15.',
              'Elevación en el plano de la escápula (brazos en «V») hasta la altura del hombro: 3 × 10-12.',
              'Remo con apoyo o en polea: 3 × 10-12.',
              'Deja 2-3 repeticiones en reserva y mantente en verde o amarillo.',
            ],
          },
          {
            titulo: 'Cómo progresar',
            puntos: [
              'Si una semana todo está en verde, sube un poco la carga o 1-2 repeticiones.',
              'Si sale amarillo, repite la semana igual.',
              'Si sale rojo, vuelve a la carga de la semana anterior.',
            ],
          },
        ],
        progresion: 'Cuando hagas los ejercicios con carga moderada en verde y el empuje horizontal ya no duela, pasa a la fase 3.',
      },
      fase3: {
        titulo: 'Fase 3 · Volver a cargar como antes',
        objetivo: 'Recuperar los ejercicios pesados y por encima de la cabeza, y la confianza en el hombro.',
        semana: [
          ['Lunes', 'Pierna + hombro C (fuerza)'],
          ['Martes', 'Empuje: press banca/inclinado progresivo + manguito'],
          ['Miércoles', 'Descanso activo o cardio'],
          ['Jueves', 'Pierna + core'],
          ['Viernes', 'Tirón pesado (dominadas, remo) + press por encima de la cabeza progresivo'],
          ['Sábado', 'Deporte o cardio'],
          ['Domingo', 'Descanso'],
        ],
        bloques: [
          {
            titulo: 'Hombro C: fuerza y potencia',
            puntos: [
              'Rotación externa con más carga: 3 × 6-10.',
              'Press militar o con mancuernas, empezando con poco peso y rango completo: 3 × 6-10.',
              'Si tu deporte lo pide: lanzamientos de balón medicinal o movimientos rápidos, 3 × 6-8.',
              'Sigue haciendo 1-2 días de manguito como mantenimiento aunque ya no duela.',
            ],
          },
          {
            titulo: 'Señales de que vas bien',
            puntos: [
              'Vuelves a tus cargas de antes y al día siguiente estás igual.',
              'La fuerza de rotación externa es parecida a la del otro lado.',
              'Ya no evitas ningún ejercicio por miedo.',
            ],
          },
        ],
        progresion: 'Sube las cargas de los ejercicios grandes alrededor de un 5-10 % cada semana mientras todo siga en verde.',
      },
    },
    reglas: [
      'Usa el semáforo del dolor: verde sigue, amarillo mantén, rojo baja.',
      'Deja 48 h entre sesiones de hombro.',
      'No es parar de entrenar: es adaptar el hombro y entrenar fuerte todo lo demás.',
    ],
    cta: 'Esta plantilla es general. Si quieres un plan hecho para tu hombro y tu deporte, con alguien que lo ajuste cada semana, escríbenos.',
  },
]

export function leadmagnetPorRuta(ruta) {
  return LEADMAGNETS.find((l) => l.ruta === ruta) || null
}

export function leadmagnetPorSlug(slug) {
  return LEADMAGNETS.find((l) => l.slug === slug) || null
}

export function puntuacionMaxima(lm) {
  return (lm.preguntas || []).reduce((t, p) => t + Math.max(...p.opciones.map((o) => o[1])), 0)
}

export function tramoDe(lm, puntos) {
  return (lm.tramos || []).find((t) => puntos >= t.min) || null
}
