-- Calendario de contenido: ritmo diario (YouTube + Instagram + historias) y
-- cortes de los vídeos largos.
--
-- 1) origen_id: un "Corte (Short + Reel)" apunta al vídeo largo del que sale,
--    para moverlos juntos si cambia la fecha del largo y borrarlos con él.
-- 2) Formato propuesto para las 45 ideas del banco (migración 21), que entraron
--    sin formato. El botón «Distribuir ideas» usa el formato para saber a qué
--    hueco va cada una: «Vídeo largo» → martes/viernes en YouTube; «Reel» →
--    el Reel/Short del día. Solo se toca lo que sigue sin formato, así que no
--    pisa nada que se haya cambiado a mano desde el panel.

alter table public.contenido_ideas
  add column if not exists origen_id text;

create index if not exists contenido_ideas_origen_id_idx
  on public.contenido_ideas (origen_id);

-- Temas que piden explicación con calma (más de 1 minuto) → vídeo largo.
update public.contenido_ideas
   set formato = 'Vídeo largo',
       redes = case when redes = '{}' then '{YouTube}' else redes end
 where coalesce(formato, '') = ''
   and id in (
     'idea-post-01', -- Guía: cómo entrenar lesionado
     'idea-post-04', -- Analogía de las 34 piezas
     'idea-post-14', -- Por qué las terapias pasivas no son la solución
     'idea-post-18', -- No fue el ejercicio, fue la mala gestión de cargas
     'idea-post-19', -- Cuanto antes empieces, mejor (neuroplasticidad)
     'idea-post-23', -- El iceberg de tu lesión
     'idea-post-24', -- Por qué las terapias no preparan el tejido
     'idea-post-29', -- Excéntrico y progresión: cuándo meterlos
     'idea-post-31', -- La educación del dolor importa más que el ejercicio
     'idea-post-37', -- Por qué te duele el hombro en press de banca
     'idea-post-39', -- Mi caso: también me dijeron que no volvería a entrenar
     'idea-post-41', -- La diferencia no está en la resonancia
     'idea-post-42'  -- Qué es una recuperación de verdad
   );

-- El resto son frases o demostraciones cortas → Reel (se sube también como Short).
update public.contenido_ideas
   set formato = 'Reel',
       redes = case when redes = '{}' then '{Instagram,YouTube}' else redes end
 where coalesce(formato, '') = ''
   and id like 'idea-post-%';

notify pgrst, 'reload schema';
