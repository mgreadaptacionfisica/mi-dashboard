-- 🎓 Formación: el programa de formación para otros profesionales
-- (fisioterapeutas, entrenadores, readaptadores…) y la lista de interesados.
--
-- El programa aún se está preparando, pero ya hay gente que pregunta: la idea
-- es ir apuntando a cada uno (con su Instagram, WhatsApp o email, lo que haya
-- dado) para poder escribirles cuando se lance. No tiene nada que ver con los
-- clientes ni con el pipeline de ventas: son otro público y otro producto,
-- por eso va en tablas propias y no como leads.
--
-- Solo admin, igual que enlaces_interes: ni el resto de roles ve la sección
-- ni la RLS les deja leer por API (son datos de contacto de terceros).
-- Se puede ejecutar más de una vez sin problema.

create table if not exists public.formacion_interesados (
  id text primary key,
  nombre text not null,
  instagram text,
  whatsapp text,
  email text,
  profesion text,
  -- De dónde ha salido (le escribió por Instagram, una recomendación…).
  origen text,
  -- 'interesado' → 'contactado' → 'inscrito' (o 'descartado').
  estado text not null default 'interesado',
  notas text,
  created_at timestamptz not null default now()
);

-- El programa en sí: una sola fila (id 'principal') con el texto libre que se
-- va escribiendo mientras se prepara (a quién va, temario, formato, precio…).
create table if not exists public.formacion_programa (
  id text primary key,
  titulo text,
  contenido text,
  updated_at timestamptz not null default now()
);

alter table public.formacion_interesados enable row level security;
alter table public.formacion_programa enable row level security;

drop policy if exists "formacion_interesados_admin" on public.formacion_interesados;
create policy "formacion_interesados_admin" on public.formacion_interesados
  for all
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

drop policy if exists "formacion_programa_admin" on public.formacion_programa;
create policy "formacion_programa_admin" on public.formacion_programa
  for all
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

notify pgrst, 'reload schema';
