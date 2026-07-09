-- 1) Tabla SOPs
create table if not exists public.sops (
  id text primary key,
  titulo text not null,
  categoria text not null default '',
  contenido text default '',
  enlace text default '',
  actualizado_en date,
  created_at timestamptz not null default now()
);

-- 2) Row Level Security
-- Nota temporal: como todavía no tenemos login por persona (eso viene en el
-- paso de "Auth y roles" más adelante), dejamos lectura/escritura abierta a
-- cualquiera que tenga la clave "publishable" (la del frontend). No es la
-- config final, es la config del piloto para validar que todo funciona.
alter table public.sops enable row level security;

create policy "sops_select_all" on public.sops
  for select using (true);

create policy "sops_insert_all" on public.sops
  for insert with check (true);

create policy "sops_update_all" on public.sops
  for update using (true);

create policy "sops_delete_all" on public.sops
  for delete using (true);

-- 3) Migración de los SOPs que ya tienes en el panel (src/data/sops.js)
insert into public.sops (id, titulo, categoria, contenido, enlace, actualizado_en) values
('sop-sistema-1-acceso', '1. Acceso del paciente', 'Sistema de trabajo con clientes', 'Una vez pagado:
- Se crea un grupo de WhatsApp y nos presentamos: "Soy [nombre], el fisioterapeuta del equipo, que te va a acompañar en este proceso para que te recuperes lo antes posible. Cualquier duda aquí estoy".
- Se le da acceso a la app (esto lo hace Raúl o directamente la closer).
- Se le explica la app y se le dice que tiene dos formularios que rellenar, y se le asignan los workouts de evaluación de hombro y general.
- Crear carpeta de Google Drive para la persona.

Documento de referencia adicional: https://drive.google.com/file/d/1iOxh2YIRyEvWvmreYpY2srkOXHHBumTE/view?usp=sharing', '', '2026-07-09'),
('sop-sistema-2-evaluacion', '2. Evaluación', 'Sistema de trabajo con clientes', 'Dos formas de evaluar:
- A través de vídeos (formularios + workouts de evaluación ya asignados en la app).
- Si la persona genera más confianza haciéndolo así, quedar y evaluar por videollamada.

Diagnóstico diferencial:
- Evaluar movilidad e irritabilidad al dolor (enviar formulario SPADI o TAMPA si hace falta).
- Revisar los dos formularios (inicial y de dolor).
- Evaluar según irritabilidad:
  · Irritabilidad alta → NO evaluar fuerza, solo reducir síntomas y explicar dolor y patología.
  · Irritabilidad media → analizar fuerza.
  · Irritabilidad baja → ver nivel y objetivo personal.

Para la valoración clínica específica de hombro, ver el protocolo clínico "Protocolo RCSRP (hombro)" en la categoría Protocolos clínicos.', '', '2026-07-09'),
('sop-sistema-3-fases', '3. Establecer fase y objetivos', 'Sistema de trabajo con clientes', 'Fases (según irritabilidad y movilidad, medido con SPADI):
- FASE 1: irritabilidad alta-moderada, baja movilidad (SPADI <50), dolor entre sesiones. Ejercicios para reducir dolor y ganar movilidad.
- FASE 2: irritabilidad baja (SPADI <10), sin dolor entre sesiones. Ejercicios de fuerza.
- FASE 3: dolor solo ante picos de carga (SPADI 0), dolor solo en gestos del deporte. Introducir movimientos específicos del deporte.
- FASE 4: dolor solo ante picos de carga (SPADI 0), sin dolor en su deporte. Mejora de rendimiento.

Objetivos por fase: ser concreto y hablar con la persona (ej. fase 3: "hacer snatch sin dolor"; fase 4: "snatch con 100kg"). Objetivos de fase 2 en: https://docs.google.com/spreadsheets/d/1fPqA--StIixU1wVfkeD0u8J1s3YSwUxv/edit?usp=sharing&ouid=116406665588224230463&rtpof=true&sd=true', '', '2026-07-09'),
('sop-sistema-4-programa', '4. Preparación del programa', 'Sistema de trabajo con clientes', '- Usar las fases y objetivos ya establecidos para prepararlo.
- Revisar disponibilidad y material del que dispone la persona.
- Fase 1: preparar semana a semana según evolución, con ejercicios diarios.
- A partir de fase 2: preparar una semana y duplicarla en Harbiz (ojo, esa primera semana se evalúa la fuerza).
- Usar solo los ejercicios necesarios para los objetivos marcados.
- Los ejercicios de readaptación se introducen en el calentamiento.
- Establecer formulario de seguimiento semanal y mensual.
- A partir de semana 2-3, introducir el RIR si la persona no lo conoce.', '', '2026-07-09'),
('sop-sistema-5-explicacion', '5. Explicación del programa al cliente', 'Sistema de trabajo con clientes', 'Se hace por Loom:
- Explicar la evaluación y sus resultados.
- Explicar en qué fase empieza y por qué.
- Explicar los objetivos de cada fase — no hay tiempo fijo, depende de la persona.
- Explicar la programación de la primera semana y por qué se empieza así.
- Decirle que revise todo y comunique dudas o cambios. Si no dice nada, se entiende que está correcto.', '', '2026-07-09'),
('sop-sistema-6-seguimiento-diario', '6. Seguimiento diario', 'Sistema de trabajo con clientes', '- Revisar el grupo de WhatsApp todos los días, responder en menos de 12h.
- Contacto mínimo semanal (ver módulo Contacto semanal en Equipo): lunes (inicio semana), miércoles/jueves (mitad semana), viernes/sábado (fin de semana).
- Irritabilidad muy alta: preguntar al día siguiente de cada entrenamiento.
- Estar pendiente de detalles personales que comenten.
- Recomendado: seguimiento diario vía dashboard de Harbiz, modificando el entreno sobre la marcha.', '', '2026-07-09'),
('sop-sistema-7-seguimiento-semanal', '7. Seguimiento semanal', 'Sistema de trabajo con clientes', '- Revisar sesión por sesión y el formulario de seguimiento.
- Cambios según irritabilidad: molestia tolerable → mantener carga; duele mucho → regresión/eliminar; sin dolor → progresar (carga, velocidad, ROM, uni/bilateral, brazo de momento, ángulo, RIR, plano, resistencia).
- Cambio de fase: introducir ejercicios nuevos poco a poco (1-2 series), cuidando volumen total.
- Revisar objetivos no cumplidos y necesidad de cambio de días.', '', '2026-07-09'),
('sop-sistema-8-mensual-videollamadas', '8. Seguimiento mensual y videollamadas', 'Sistema de trabajo con clientes', 'Mensual: revisar seguimiento y objetivos, reevaluar movilidad/fuerza si hace falta, videollamada o Loom con avances.

Videollamadas: mínimo una al mes; si hay dolor persistente y frustración, valorar videollamada para explicar y educar sobre el dolor.', '', '2026-07-09'),
('sop-sistema-9-renovacion', '9. Renovación', 'Sistema de trabajo con clientes', 'Al final del último mes (actualmente cuatrimestres): videollamada sí o sí para dar feedback del programa y ofrecer renovación.', '', '2026-07-09'),
('sop-clinico-rcsrp-hombro', 'Protocolo RCSRP (hombro) — valoración y tratamiento', 'Protocolos clínicos', 'Protocolo clínico completo de valoración y tratamiento del RCSRP: anamnesis, diagnóstico diferencial, algoritmo de valoración, valoración funcional, y prescripción de ejercicio por fases (1-4).

Resumen rápido de fases:
- Fase 1: reducir irritabilidad, isometrías, movilidad diaria, empujes lejos de fatiga, alto volumen de tracciones.
- Fase 2: overhead sin asistencia, ganar fuerza y reducir asimetrías, pliometría básica concéntrica.
- Fase 3: introducir gestos deportivos, overhead con velocidad, pliometría con contramovimiento.
- Fase 4: entrenamientos del deporte, PR en patrones básicos, pliometría avanzada.', '/protocolo-hombro-rcsrp.pdf', '2026-07-09')
on conflict (id) do nothing;
