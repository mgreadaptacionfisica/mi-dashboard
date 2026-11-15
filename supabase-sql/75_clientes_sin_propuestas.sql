-- 75 · Clientes sin 🤖 Propuestas (Raúl, 2026-11-15)
--
-- Hay clientes a los que la rutina se les cambia cada semana (casos
-- puntuales): proponer "sube a X kg" sobre un ejercicio que la semana que
-- viene ya no estará no sirve, y si el ✅ va a Harbiz, encima escribe en
-- una sesión que se va a rehacer. Con esta marca el panel no calcula
-- propuestas para ese cliente (ni en ⚡ Registro, ni en el índice 🤖, ni
-- llega nada a la rutina Panel → Harbiz). Se activa y desactiva desde la
-- pestaña 🤖 Propuestas de Seguimiento y Valoración.
--
-- Las sesiones de Harbiz se siguen leyendo igual: solo se apagan las
-- propuestas. false (por defecto) = propuestas activas.

alter table public.clientes add column if not exists sin_propuestas boolean not null default false;

notify pgrst, 'reload schema';
