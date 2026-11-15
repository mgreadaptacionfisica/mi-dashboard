-- 77 · 📣 Para explicar al cliente, como lista con check (Raúl, 2026-11-15)
--
-- En la 76 era un texto libre. Raúl quiere que funcione como 🔧 Cambios de
-- la semana: una lista de puntos, cada uno con su check para ir marcando lo
-- que ya se le ha explicado al cliente, y con la SESIÓN en la que está el
-- cambio. Cada punto: { texto, sesion, explicado, explicadoEn }.
--
-- La columna pasa de text a jsonb. Lo que ya estuviera escrito se guarda
-- como un string JSON y el panel lo trocea en puntos al leerlo
-- (normalizarParaCliente), así no se pierde nada. Solo se convierte si
-- todavía es text, para poder correr esto más de una vez.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'seguimientos'
      and column_name = 'para_cliente' and data_type = 'text'
  ) then
    alter table public.seguimientos
      alter column para_cliente type jsonb
      using case
        when nullif(btrim(para_cliente), '') is null then null
        when btrim(para_cliente) like '[%' then para_cliente::jsonb
        else to_jsonb(para_cliente)
      end;
  end if;
end $$;

alter table public.seguimientos add column if not exists para_cliente jsonb;

notify pgrst, 'reload schema';
