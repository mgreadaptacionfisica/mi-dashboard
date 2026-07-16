-- Amplía el SOP "4. Preparación del programa" con una guía concreta de qué
-- tipo de ejercicios corresponden a cada fase (no solo cuándo/con qué
-- frecuencia actualizar el programa, que es lo que ya cubría antes). Basado
-- en "Tratamiento del RCSRP mediante el ejercicio" (Vicente Giles, ver
-- Formación clínica RCSRP), con los ajustes que pidió Raúl: la pliometría
-- se introduce en la transición Fase 2 → Fase 3 (no antes), y se añade la
-- referencia de fuerza progresiva del press militar (que ahora también
-- aparece directamente en el formulario de Valoración, según la fase).
update public.sops set
  contenido = '- Usar las fases y objetivos ya establecidos para prepararlo.
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

Fuente: "Tratamiento del RCSRP mediante el ejercicio" (Vicente Giles) — ver Formación clínica RCSRP para el PDF completo con ejemplos de sesión y de mesociclo semanal por fase.',
  actualizado_en = '2026-07-16'
where id = 'sop-sistema-4-programa';

notify pgrst, 'reload schema';
