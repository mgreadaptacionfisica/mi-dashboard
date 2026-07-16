// SOPs / protocolos internos de MG Group, organizados por categoría.
// { id, titulo: '', categoria: '', contenido: '', enlace: '', actualizadoEn: 'YYYY-MM-DD' }
// - contenido: texto libre (opcional), útil para protocolos simples sin imágenes/formato.
// - enlace: URL a un documento externo ya subido (Google Drive/Doc/PDF), opcional.
//   Se muestra como botón "Abrir documento". Recomendado para protocolos con imágenes o formato.
//
// Categoría "Sistema de trabajo con clientes": paso a paso completo, desde que el cliente
// paga hasta la renovación (migrado del documento "Paso a paso sistema de trabajo").
// Categoría "Protocolos clínicos": protocolos de valoración y tratamiento específicos
// (con tablas, diagramas y algoritmos, por eso van como PDF enlazado en vez de texto).
const sops = [
  {
    id: 'sop-sistema-1-acceso',
    titulo: '1. Acceso del paciente',
    categoria: 'Sistema de trabajo con clientes',
    contenido: `Una vez pagado:
- Se crea un grupo de WhatsApp y nos presentamos: "Soy [nombre], el fisioterapeuta del equipo, que te va a acompañar en este proceso para que te recuperes lo antes posible. Cualquier duda aquí estoy".
- Se le da acceso a la app (esto lo hace Raúl o directamente la closer).
- Se le explica la app y se le dice que tiene dos formularios que rellenar, y se le asignan los workouts de evaluación de hombro y general.
- Crear carpeta de Google Drive para la persona.

Documento de referencia adicional: https://drive.google.com/file/d/1iOxh2YIRyEvWvmreYpY2srkOXHHBumTE/view?usp=sharing`,
    enlace: '',
    actualizadoEn: '2026-07-09',
  },
  {
    id: 'sop-sistema-2-evaluacion',
    titulo: '2. Evaluación',
    categoria: 'Sistema de trabajo con clientes',
    contenido: `Dos formas de evaluar:
- A través de vídeos (formularios + workouts de evaluación ya asignados en la app).
- Si la persona genera más confianza haciéndolo así, quedar y evaluar por videollamada.

Diagnóstico diferencial:
- Evaluar movilidad e irritabilidad al dolor (enviar formulario SPADI o TAMPA si hace falta).
- Revisar los dos formularios (inicial y de dolor).
- Evaluar según irritabilidad:
  · Irritabilidad alta → NO evaluar fuerza, solo reducir síntomas y explicar dolor y patología.
  · Irritabilidad media → analizar fuerza.
  · Irritabilidad baja → ver nivel y objetivo personal.

Para la valoración clínica específica de hombro (diagnóstico diferencial completo, tests, algoritmo RCSRP y prescripción de ejercicio por fases), ver el protocolo clínico "Protocolo RCSRP (hombro)" en la categoría Protocolos clínicos — tiene las tablas, diagramas y algoritmos completos.`,
    enlace: '',
    actualizadoEn: '2026-07-09',
  },
  {
    id: 'sop-sistema-3-fases',
    titulo: '3. Establecer fase y objetivos',
    categoria: 'Sistema de trabajo con clientes',
    contenido: `REGLA DE TRANSICIÓN (leer antes de subir a alguien de fase):
No se sube de fase solo porque mejore el SPADI o el dolor. Se sube de fase cuando se cumplen las DOS cosas:
1) El criterio de dolor/SPADI de la fase siguiente (ver más abajo).
2) Los objetivos concretos marcados para la fase actual (ver "Objetivos por fase" más abajo) — no solo "ha mejorado", sino que el objetivo que se marcó se ha cumplido de verdad.
En el panel, al crear una nueva valoración se marcan como cumplidos los objetivos de la valoración anterior. Si subes de fase sin haberlos marcado todos, el panel avisa (no bloquea — la decisión sigue siendo tuya, pero revisa que sea correcto antes de continuar).

Cadencia de reevaluación: reevaluar cada 2-3 semanas, o antes si sospechas que ya se han cumplido los objetivos de la fase actual. No dejar pasar más de un mes sin repetir la valoración — cuanto más se tarde en detectar que toca cambiar de fase (para bien o para mal), más margen de error hay.

Fases (según irritabilidad y movilidad, medido con SPADI):
- FASE 1: irritabilidad alta-moderada, baja movilidad (SPADI <50), dolor entre sesiones. Objetivo: ejercicios para reducir dolor y ganar movilidad.
- FASE 2: irritabilidad baja (SPADI <10), solo molestia en sesiones, sin dolor entre sesiones. Objetivo: ejercicios de fuerza.
- FASE 3: dolor solo ante picos de carga (SPADI 0), dolor solo en gestos del deporte. Objetivo: introducir movimientos específicos del deporte.
- FASE 4: dolor solo ante picos de carga (SPADI 0), sin dolor en su deporte. Objetivo: mejora de rendimiento.

Objetivos por fase:
- FASE 1: reducir irritabilidad y ganar movilidad. Ser concreto en qué movilidad debe ganar — solo los ejercicios que realmente hagan falta, sin saturar.
- FASE 2: reducir irritabilidad y ganar fuerza. Marcar objetivos de carga para pasar a la siguiente fase: https://docs.google.com/spreadsheets/d/1fPqA--StIixU1wVfkeD0u8J1s3YSwUxv/edit?usp=sharing&ouid=116406665588224230463&rtpof=true&sd=true
- FASE 3: objetivos según el deporte — hablar con la persona y ser muy concreto (ej: conseguir hacer snatch sin dolor).
- FASE 4: objetivos de rendimiento — hablar con la persona y ser muy concreto (ej: conseguir un snatch con 100kg).`,
    enlace: '',
    actualizadoEn: '2026-07-16',
  },
  {
    id: 'sop-sistema-4-programa',
    titulo: '4. Preparación del programa',
    categoria: 'Sistema de trabajo con clientes',
    contenido: `- Usar las fases y objetivos ya establecidos para prepararlo.
- Revisar disponibilidad y material del que dispone la persona.
- Fase 1: ir preparando semana a semana según su evolución. Poner ejercicios diarios.
- A partir de fase 2: preparar una semana y duplicarla en Harbiz. Ojo: en esa primera semana se evalúa la fuerza (añadir ejercicios en el calentamiento de evaluación).
- Usar solo los ejercicios necesarios para cumplir los objetivos marcados.
- Los ejercicios de readaptación se introducen en el calentamiento.
- Tener en cuenta los gustos de la persona con los ejercicios.
- Establecer formulario de seguimiento semanal y mensual.
- A partir de la semana 2-3, explicar e introducir el RIR (salvo que la persona ya lo conozca).

QUÉ INTRODUCIR EN CADA FASE:

FASE 1 — reducir dolor e irritabilidad:
- Empujes: overhead ASISTIDO, sin dolor. Tempos lentos, ROM limitado al principio; progresar en ángulo y plano según tolerancia. Buscar el plano que menos moleste (el sagital suele tolerarse mejor que el coronal).
- Isometrías (palanca corta, ROM bajo) como calentamiento — muy bien toleradas, generan confianza antes de cargas mayores.
- Tracciones: muy bien toleradas en esta fase, permiten mover cargas altas (motivación) — ej. remo en 3 apoyos, iso-dinámico.
- Trabajo periescapular si hay bajo resultado en el posterior shoulder endurance test.
- Pliometría: todavía NO se introduce.
- Fuerza de referencia: press militar unilateral en torno al 15-20% del peso corporal.
- Controlar la respuesta a la carga: si hay dolor al levantar el brazo pasadas 24h, bajar intensidad en la siguiente sesión.

FASE 2 — recuperar capacidad:
- Empujes overhead ya SIN asistencia — progresar en ángulo según tolerancia, buscando ganar fuerza y reducir asimetrías entre lados.
- Rango de movimiento más amplio y planos más exigentes que en fase 1.
- Pliometría: se introduce en la TRANSICIÓN hacia fase 3, es decir, hacia el final de esta fase — empezar por pliometría básica horizontal, sin contramovimiento (ej. lanzamiento tipo shot put), como preparación para la fase 3.
- Fuerza de referencia: press militar unilateral en torno al 20-30% del peso corporal.
- Seguir controlando la respuesta a la carga (dolor a las 24h).

FASE 3 — aproximación a gestos deportivos:
- Empujes overhead con velocidad angular alta; introducir derivados de olímpicos.
- Pliometría intermedia: overhead, con contramovimiento y cadena cinética completa.
- Introducir ya el gesto específico del deporte de la persona, con progresión gradual de volumen (nº de repeticiones/lanzamientos) — no todo de golpe.
- Controlar el dolor tras el gesto deportivo, no solo durante.
- Fuerza de referencia: press militar en torno al 30-50% del peso corporal (RM).
- Al reintroducir el deporte, controlar 4 variables: volumen de exposición, carácter del esfuerzo (RPE), densidad (descanso entre gestos) y frecuencia semanal — empezar conservador (ej. 1 sesión de deporte/semana + 2 de fuerza) y subir progresivamente.

FASE 4 — vuelta al rendimiento:
- Entrenamiento ya enfocado a rendimiento — buscar PRs en patrones básicos.
- Pliometría avanzada: énfasis en velocidad, caída repetida (bounces).
- Controlar la fatiga según la densidad de los entrenamientos del deporte.
- Fuerza de referencia: press militar en torno al 50-80% del peso corporal (RM).

Estas referencias de fuerza progresiva también aparecen directamente en el formulario de Valoración, junto al campo de Press militar, según la fase confirmada del cliente — no hace falta memorizarlas.

Fuente: "Tratamiento del RCSRP mediante el ejercicio" (Vicente Giles) — ver Formación clínica RCSRP para el PDF completo con ejemplos de sesión y de mesociclo semanal por fase.`,
    enlace: '',
    actualizadoEn: '2026-07-16',
  },
  {
    id: 'sop-sistema-5-explicacion',
    titulo: '5. Explicación del programa al cliente',
    categoria: 'Sistema de trabajo con clientes',
    contenido: `Se hace por Loom:
- Explicar la evaluación y sus resultados.
- Explicar en qué fase empieza y por qué.
- Explicar los objetivos de cada fase y por qué hay que cumplirlos para pasar a la siguiente — dejar claro que no hay un tiempo fijo, depende de la persona.
- Explicar la programación de la primera semana y por qué se empieza así.
- Decirle que revise todo y que comunique dudas o cambios necesarios. Importante: si no dice nada, se entiende que está todo correcto.`,
    enlace: '',
    actualizadoEn: '2026-07-09',
  },
  {
    id: 'sop-sistema-6-seguimiento-diario',
    titulo: '6. Seguimiento diario',
    categoria: 'Sistema de trabajo con clientes',
    contenido: `- Revisar el grupo de WhatsApp todos los días por si hay dudas o comentarios. Intentar no tardar más de 12h en responder (cuanto antes, mejor).
- Contacto mínimo semanal (ver módulo "Contacto semanal" en Equipo → detalle de técnico, con checks por cliente):
  · Inicio de semana (lunes): cómo ha ido el fin de semana y cómo se plantea la semana.
  · Mitad de semana (miércoles o jueves): cómo va la semana.
  · Fin de semana (viernes o sábado): cómo ha ido la semana.
- Si la persona tiene irritabilidad muy alta, preguntar al día siguiente de cualquier entrenamiento.
- Estar pendiente de detalles personales que comenten (mal momento, algo familiar, un examen...) — puede marcar la diferencia.
- Recomendado: llevar seguimiento diario de todo lo que hace la persona (dashboard de Harbiz) e ir modificando el entreno de la semana siguiente sobre la marcha. Todos los cambios que se hagan día a día quitan trabajo para el fin de semana.`,
    enlace: '',
    actualizadoEn: '2026-07-09',
  },
  {
    id: 'sop-sistema-7-seguimiento-semanal',
    titulo: '7. Seguimiento semanal',
    categoria: 'Sistema de trabajo con clientes',
    contenido: `- Revisar sesión por sesión (mejor si ya se ha ido revisando día a día).
- Revisar el formulario de seguimiento (si no lo rellena, decirle que debe hacerlo para poder preparar bien la semana siguiente).
- Hacer los cambios necesarios para la semana siguiente. Qué cambiar:
  · Ejercicios de movilidad: aumentar tiempo de ejecución, rango de movimiento, intensidad o punto de aplicación de la fuerza.
  · Ejercicios de fuerza (según irritabilidad): molestia tolerable → mantener carga; duele mucho → regresión o eliminar ejercicio; sin dolor → progresar con: aumentar carga (10-15%) o mantener carga y más repeticiones, aumentar velocidad de ejecución, aumentar ROM, pasar de bilateral a unilateral, aumentar el brazo de momento, modificar el ángulo de empuje, aumentar el carácter del esfuerzo (RIR), pasar de un movimiento seguro a uno más amenazante, o cambiar el perfil de resistencia.
  · Estos cambios se muestran en los comentarios del ejercicio. Explicar que un cambio puede generar algo de molestia y que puede ser normal.
- Cambio de fase: introducir ejercicios nuevos poco a poco (1-2 series para probar), cuidando el volumen total — si hace falta, quitar otro ejercicio.
- Revisar bien los objetivos no cumplidos y los que se quieran cumplir esa semana (formulario).
- Revisar si la persona necesita cambio de días por algo personal (por eso se programa semana a semana).`,
    enlace: '',
    actualizadoEn: '2026-07-09',
  },
  {
    id: 'sop-sistema-8-mensual-videollamadas',
    titulo: '8. Seguimiento mensual y videollamadas',
    categoria: 'Sistema de trabajo con clientes',
    contenido: `Seguimiento mensual:
- Revisar seguimiento mensual y objetivos.
- Reevaluar movilidad y fuerza si hace falta (programarlo esa semana).
- Videollamada si la persona lo considera necesario; si no se hace, enviar un Loom mostrando los avances.

Videollamadas:
- Todas las que hagan falta, pero mínimo una al mes.
- Si el dolor no se va y la persona está frustrada, valorar videollamada para explicar y educar sobre el dolor.`,
    enlace: '',
    actualizadoEn: '2026-07-09',
  },
  {
    id: 'sop-sistema-9-renovacion',
    titulo: '9. Renovación',
    categoria: 'Sistema de trabajo con clientes',
    contenido: `Al final del último mes (actualmente se venden cuatrimestres): hacer videollamada sí o sí para ver a la persona, dar feedback del programa y ofrecer renovación para seguir consiguiendo sus objetivos y evitar lesiones.`,
    enlace: '',
    actualizadoEn: '2026-07-09',
  },
  {
    id: 'sop-clinico-rcsrp-hombro',
    titulo: 'Protocolo RCSRP (hombro) — valoración y tratamiento',
    categoria: 'Protocolos clínicos',
    contenido: `Protocolo clínico completo de valoración y tratamiento del RCSRP (patología del manguito rotador), con anamnesis, diagnóstico diferencial (columna cervical, hombro rígido, inestabilidad, articulación AC, bíceps), algoritmo de valoración, valoración funcional (movilidad, fuerza), y prescripción de ejercicio por fases (Fase 1 a Fase 4) con ejemplos de sesión y mesociclo semanal.

Incluye tablas, diagramas y algoritmos — por eso está como documento adjunto en vez de texto. Ábrelo desde el botón de arriba.

Resumen rápido de fases:
- Fase 1: reducir irritabilidad, isometrías, movilidad diaria, empujes lejos de la fatiga, alto volumen de tracciones.
- Fase 2: overhead sin asistencia, ganar fuerza y reducir asimetrías, pliometría básica concéntrica.
- Fase 3: introducir gestos deportivos, overhead con velocidad, pliometría con contramovimiento.
- Fase 4: entrenamientos del deporte, búsqueda de PR en patrones básicos, pliometría avanzada.`,
    enlace: '/protocolo-hombro-rcsrp.pdf',
    actualizadoEn: '2026-07-09',
  },
]

export default sops
