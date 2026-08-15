-- "Proyectos": herramienta de organización personal del admin (Raúl) para
-- llevar los proyectos del negocio y los suyos propios, cada uno partido en
-- pasos con checkbox. El % de avance NO se guarda aquí a propósito: se
-- calcula siempre en la UI como pasos hechos ÷ pasos totales, así nunca se
-- queda desincronizado con los pasos reales (ver src/components/Proyectos.jsx).
--
-- RLS permisiva (auth.uid() is not null), como la mayoría de tablas del panel:
-- el control real de acceso lo hace la UI, porque 'proyectos' solo está en
-- SECCIONES_POR_ROL.admin (ver src/lib/auth.js). Se deja permisiva a
-- propósito y no con el patrón admin-only de enlaces_interes por si más
-- adelante se quiere compartir un proyecto con alguien del equipo — así el
-- cambio es solo de UI, sin tocar políticas.
create table if not exists public.proyectos (
  id text primary key,
  nombre text not null,
  descripcion text,
  fecha_objetivo date,
  prioridad text not null default 'media',
  estado text not null default 'planificado',
  ambito text not null default 'profesional',
  created_at timestamptz not null default now()
);

-- Por si la tabla ya existía de una ejecución anterior a medias.
alter table public.proyectos add column if not exists descripcion text;
alter table public.proyectos add column if not exists fecha_objetivo date;
alter table public.proyectos add column if not exists prioridad text not null default 'media';
alter table public.proyectos add column if not exists estado text not null default 'planificado';
alter table public.proyectos add column if not exists ambito text not null default 'profesional';
alter table public.proyectos add column if not exists created_at timestamptz not null default now();

-- Los valores permitidos se validan también aquí (no solo en el <select> de
-- la UI) para que un dato raro no llegue nunca a la tabla.
alter table public.proyectos drop constraint if exists proyectos_prioridad_check;
alter table public.proyectos add constraint proyectos_prioridad_check
  check (prioridad in ('alta', 'media', 'baja'));

alter table public.proyectos drop constraint if exists proyectos_estado_check;
alter table public.proyectos add constraint proyectos_estado_check
  check (estado in ('planificado', 'en_curso', 'completado'));

alter table public.proyectos drop constraint if exists proyectos_ambito_check;
alter table public.proyectos add constraint proyectos_ambito_check
  check (ambito in ('personal', 'profesional'));

-- Pasos de cada proyecto. 'orden' permite mantener el orden en que se
-- escribieron aunque se marquen/desmarquen. El borrado en cascada evita
-- dejar pasos huérfanos al eliminar un proyecto.
create table if not exists public.proyecto_pasos (
  id text primary key,
  proyecto_id text not null references public.proyectos(id) on delete cascade,
  texto text not null,
  hecho boolean not null default false,
  prioridad text,
  fecha date,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.proyecto_pasos add column if not exists prioridad text;
alter table public.proyecto_pasos add column if not exists fecha date;
alter table public.proyecto_pasos add column if not exists orden integer not null default 0;
alter table public.proyecto_pasos add column if not exists created_at timestamptz not null default now();

-- La prioridad del paso es opcional (a diferencia de la del proyecto), así
-- que el check tiene que dejar pasar el null.
alter table public.proyecto_pasos drop constraint if exists proyecto_pasos_prioridad_check;
alter table public.proyecto_pasos add constraint proyecto_pasos_prioridad_check
  check (prioridad is null or prioridad in ('alta', 'media', 'baja'));

create index if not exists proyecto_pasos_proyecto_id_idx on public.proyecto_pasos (proyecto_id);

alter table public.proyectos enable row level security;
alter table public.proyecto_pasos enable row level security;

drop policy if exists "proyectos_rw" on public.proyectos;
create policy "proyectos_rw" on public.proyectos
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "proyecto_pasos_rw" on public.proyecto_pasos;
create policy "proyecto_pasos_rw" on public.proyecto_pasos
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

notify pgrst, 'reload schema';
