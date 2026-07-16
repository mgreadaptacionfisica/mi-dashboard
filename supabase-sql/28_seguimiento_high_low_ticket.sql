-- Separa de forma clara y explícita el seguimiento High Ticket del Low
-- Ticket dentro de "Sistema de trabajo con clientes". Antes solo existía el
-- track High Ticket (contacto diario); se retitulan los pasos 6 y 7 para
-- dejar claro que son la variante High Ticket, y se añade un paso 6b nuevo
-- y separado con el protocolo Low Ticket completo.
update public.sops set
  titulo = '6. Seguimiento diario — High Ticket',
  contenido = '(High Ticket: contacto diario. Para clientes Low Ticket, ver el paso "6b. Seguimiento — Low Ticket": la semana 1 es igual que aquí, a partir de la semana 2 el seguimiento pasa a ser semanal.)

- Revisar el grupo de WhatsApp todos los días, responder en menos de 12h.
- Contacto mínimo semanal (ver módulo Contacto semanal en Equipo): lunes (inicio semana), miércoles/jueves (mitad semana), viernes/sábado (fin de semana).
- Irritabilidad muy alta: preguntar al día siguiente de cada entrenamiento.
- Estar pendiente de detalles personales que comenten.
- Recomendado: seguimiento diario vía dashboard de Harbiz, modificando el entreno sobre la marcha.',
  actualizado_en = '2026-07-16'
where id = 'sop-sistema-6-seguimiento-diario';

update public.sops set
  titulo = '7. Seguimiento semanal — High Ticket',
  contenido = '(High Ticket. En Low Ticket, a partir de la semana 2 este repaso lo hace la propia persona guiándose por lo explicado en el paso 3 — ver "6b. Seguimiento — Low Ticket".)

- Revisar sesión por sesión y el formulario de seguimiento.
- Cambios según irritabilidad: molestia tolerable → mantener carga; duele mucho → regresión/eliminar; sin dolor → progresar (carga, velocidad, ROM, uni/bilateral, brazo de momento, ángulo, RIR, plano, resistencia).
- Cambio de fase: introducir ejercicios nuevos poco a poco (1-2 series), cuidando volumen total.
- Revisar objetivos no cumplidos y necesidad de cambio de días.',
  actualizado_en = '2026-07-16'
where id = 'sop-sistema-7-seguimiento-semanal';

insert into public.sops (id, titulo, categoria, contenido, enlace, actualizado_en) values
('sop-sistema-6b-seguimiento-low-ticket', '6b. Seguimiento — Low Ticket', 'Sistema de trabajo con clientes', 'Diferencia clave frente a High Ticket: en High Ticket el técnico revisa y reprograma cada semana (pasos 6 y 7). En Low Ticket, a partir de la semana 2, se enseña a la persona a evolucionar su propio programa, y el técnico pasa a resolver dudas en vez de reprogramar activamente.

Semana 1: igual que en High Ticket (ver pasos 6 y 7) — seguimiento normal, para arrancar bien y detectar pronto cualquier problema.

A partir de la semana 2: seguimiento reducido a una vez por semana. Dos formas de resolver dudas (elegir una según el caso):
- WhatsApp: la persona escribe sus dudas y se resuelven una vez a la semana (no a diario).
- Google Drive: se prepara una carpeta para que suba sus vídeos de entrenamiento, y se analizan una vez a la semana.

Qué hay que enseñarle a la persona (esto es lo que hace posible el modelo, no es opcional): desde el paso 5 (explicación del programa), explicarle con claridad cómo progresar ella misma dentro de su fase y objetivos ya establecidos (ver paso 3) — qué señales indican que puede subir carga/dificultad y cuáles indican que debe bajarla o mantenerla.

Importante — esto es justo lo que falló con el cliente que se perdió: se le propuso más trabajo del que correspondía a su fase. Con seguimiento reducido a una vez por semana el margen de error es menor todavía, así que en Low Ticket hay que ser especialmente conservador preparando el programa inicial (ver paso 4) — mejor quedarse corto la primera semana que saturar.', '', '2026-07-16')
on conflict (id) do update set
  titulo = excluded.titulo,
  categoria = excluded.categoria,
  contenido = excluded.contenido,
  enlace = excluded.enlace,
  actualizado_en = excluded.actualizado_en;

notify pgrst, 'reload schema';
