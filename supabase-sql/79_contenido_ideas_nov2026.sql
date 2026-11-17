-- 4 ideas nuevas de contenido (Raúl, 17-11-2026). Entran sin fecha, al Listado
-- de ideas, para repartirlas con «🪄 Distribuir ideas». El id «contenido-2026…»
-- hace que salgan antes que el banco antiguo (idea-post-NN).
-- Formato: largos → martes/viernes en YouTube (con sus 3 cortes); Reels → el
-- Reel + Short del día.
insert into public.contenido_ideas (id, titulo, descripcion, redes, formato, estado) values
('contenido-20261117-1',
 'Qué pasa cuando te lesionas',
 'Vídeo de YouTube: qué ocurre en el cuerpo (tejido, dolor, miedo, pérdida de forma) cuando te lesionas y qué hacer desde el primer día. Base para los cortes de la semana.',
 '{YouTube}', 'Vídeo largo', 'Idea'),
('contenido-20261117-2',
 'El error de pensar que ya estás recuperado',
 'Que no duela no significa estar recuperado: falta tolerar la carga y volver a tu deporte. CTA al leadmagnet: test «¿Estás recuperado de verdad?» (comenta RECUPERADO y te lo mando).',
 '{Instagram,YouTube}', 'Reel', 'Idea'),
('contenido-20261117-3',
 'El ejercicio te enseña a moverte sin dolor',
 'El ejercicio no es solo fuerza: es aprender (y que el sistema nervioso aprenda) que puedes moverte sin dolor.',
 '{Instagram,YouTube}', 'Reel', 'Idea'),
('contenido-20261117-4',
 'Cómo distribuir el entrenamiento con lesión de manguito rotador',
 'Vídeo de YouTube: cómo repartir la semana (días de hombro, de empuje/tirón, volumen e intensidad) con una lesión de manguito rotador. CTA al leadmagnet: plantilla semanal descargable.',
 '{YouTube}', 'Vídeo largo', 'Idea')
on conflict (id) do nothing;

notify pgrst, 'reload schema';
