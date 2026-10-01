-- De dónde viene cada lead del pipeline: 'instagram' o 'whatsapp'.
-- Se elige al crear el lead (Ventas → ＋ Nuevo lead) y se puede corregir
-- después desde el detalle. Es nullable a propósito: los leads que ya
-- existían no lo tienen y se quedan como "sin indicar".
--
-- IMPORTANTE: ejecutar ANTES de desplegar el código que la usa; si no,
-- Supabase rechaza el insert del lead por columna desconocida.
alter table public.ventas add column if not exists canal_origen text;

notify pgrst, 'reload schema';
