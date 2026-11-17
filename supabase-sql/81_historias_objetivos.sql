-- Historias: de «temática del día» a OBJETIVO + reparto por día (nov 2026).
-- Actualiza las entradas de historias que creó «Distribuir ideas»
-- (id historias-AAAA-MM-DD) y que siguen en estado «Idea», para que digan el
-- objetivo del día y cómo repartirlas (ver SEMANA_HISTORIAS en
-- src/utils/distribuirContenido.js, de donde sale este texto).
-- Martes y viernes conservan el título del vídeo largo si lo tenían.
-- No toca las que ya están grabadas, programadas o publicadas.

update public.contenido_ideas c
   set titulo = '⭕ Historias · ' || d.objetivo
                || coalesce(' («' || substring(c.titulo from '«([^»]+)»') || '»)', ''),
       descripcion = d.descripcion
  from (values
    (0, 'Conexión personal', 'Objetivo: Conexión personal. Humanizar la cuenta: que te conozcan fuera del trabajo. Día ligero.
Cuántas: 2-3 historias.
• Cuando quieras · 1-2: algo personal (tu entreno, una reflexión de la semana).
• Noche · 1: lo que viene la semana que viene + recordatorio de los vídeos de la semana.'),
    (1, 'Conexión', 'Objetivo: Conexión. Abrir la semana y recoger dudas (son el material del jueves).
Cuántas: 3-4 historias.
• Por la mañana · 1-2 historias: tú en cámara contando qué vas a hacer esta semana o algo tuyo.
• Mediodía · 1: un dato o una situación con la que tu cliente se identifique.
• Tarde-noche · 1: caja de preguntas («¿qué te duele o qué quieres saber?»).'),
    (2, 'Tráfico al vídeo de YouTube', 'Objetivo: Tráfico al vídeo de YouTube. Llevar gente al vídeo largo que sale hoy.
Cuántas: 3 historias.
• Cuando sale el vídeo · 1: el problema que resuelve, en una frase y en vídeo.
• 1: un trozo de 10-15 s del vídeo (lo más potente).
• 1: sticker de enlace al vídeo + encuesta («¿te pasa?»).'),
    (3, 'Autoridad', 'Objetivo: Autoridad. Enseñar cómo trabajas y por qué sabes lo que haces.
Cuántas: 4 historias.
• Mañana o mediodía · secuencia de 3 seguidas: detrás de cámaras de una sesión o de cómo decides algo (qué ves → qué haces → por qué).
• Noche · 1: la conclusión + «si te pasa, escríbeme».'),
    (4, 'Educación e interacción', 'Objetivo: Educación e interacción. Responder las dudas del lunes: demuestra que escuchas y resuelve objeciones.
Cuántas: 3-5 historias.
• A lo largo del día · 1 pregunta por historia, respondida en vídeo (2-4 en total).
• Última · 1: «¿te ha quedado alguna duda? Respóndeme aquí».'),
    (5, 'Prueba social + tráfico', 'Objetivo: Prueba social + tráfico. Que vean resultados reales y llevar al vídeo largo de hoy.
Cuántas: 4 historias.
• Mañana · 2: el caso o resultado de un cliente (antes → qué hicimos → ahora), o un mensaje suyo.
• Cuando sale el vídeo · 1: avance del vídeo de hoy.
• 1: sticker de enlace al vídeo.'),
    (6, 'Conversión', 'Objetivo: Conversión. Convertir seguidores en contactos con un leadmagnet o en llamadas.
Cuántas: 3 historias.
• Mañana · 1: encuesta sobre un problema («¿te duele el hombro al hacer press?»).
• 1: por qué pasa, en 15 s, y que tienes algo que lo explica.
• 1: CTA claro, con enlace al test o recurso, o «escríbeme PALABRA y te lo mando».')
  ) as d(dow, objetivo, descripcion)
 where c.id like 'historias-%'
   and c.estado = 'Idea'
   and c.fecha is not null
   and extract(dow from c.fecha) = d.dow;

notify pgrst, 'reload schema';
