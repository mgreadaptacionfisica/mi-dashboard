-- 🤖 Propuestas de progresión: lo que responde el fisio a cada propuesta.
--
-- Las propuestas en sí NO se guardan: las calcula el panel cada vez con las
-- reglas de src/utils/progresion.js a partir de lo que el robot de Harbiz
-- deja en sesiones_harbiz.detalle.registro (reps, kilos, objetivo y la
-- lectura del comentario de cada ejercicio). Así, si se cambia una regla,
-- las propuestas cambian solas sin migrar nada.
--
-- Lo que sí se guarda es la RESPUESTA: aplicada o descartada (con motivo).
-- Sirve para dos cosas: que la propuesta deje de salir como pendiente, y
-- tener con qué pulir las reglas (los motivos de descarte dicen dónde falla).
-- `texto` es una foto de la propuesta tal como se vio al responder, para
-- poder leer el motivo con su contexto aunque la regla cambie después.
--
-- El id es el de la propuesta: "cliente|semana|tipo|ejercicio".
-- Enlazada por cliente_nombre como el resto del historial: renombrarCliente
-- la arrastra (ver src/lib/queries/renombrarCliente.js).
--
-- Se puede ejecutar más de una vez sin problema.

create table if not exists public.propuestas_progresion (
  id text primary key,
  cliente_nombre text not null,
  semana date not null,
  ejercicio text not null,
  tipo text not null,
  texto text,
  estado text not null check (estado in ('aplicada', 'descartada')),
  motivo text,
  respondido_por text,
  respondido_en timestamptz not null default now()
);

create index if not exists propuestas_progresion_cliente_idx
  on public.propuestas_progresion (cliente_nombre, semana);

alter table public.propuestas_progresion enable row level security;

-- Mismo patrón permisivo que seguimientos: lo usan admin y técnicos, y el
-- control de qué cliente ve cada uno lo hace la UI.
drop policy if exists "propuestas_progresion_select" on public.propuestas_progresion;
create policy "propuestas_progresion_select" on public.propuestas_progresion
  for select using (auth.uid() is not null);
drop policy if exists "propuestas_progresion_insert" on public.propuestas_progresion;
create policy "propuestas_progresion_insert" on public.propuestas_progresion
  for insert with check (auth.uid() is not null);
drop policy if exists "propuestas_progresion_update" on public.propuestas_progresion;
create policy "propuestas_progresion_update" on public.propuestas_progresion
  for update using (auth.uid() is not null);
drop policy if exists "propuestas_progresion_delete" on public.propuestas_progresion;
create policy "propuestas_progresion_delete" on public.propuestas_progresion
  for delete using (auth.uid() is not null);

notify pgrst, 'reload schema';
