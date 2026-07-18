-- Comisiones de pasarela de pago (Stripe/Hotmart/Bizum/Transferencia): al
-- marcar un plazo como cobrado en Clientes > Cobros pendientes, el panel
-- mira la "Forma de pago" del cliente, busca su tarifa aquí y genera
-- automáticamente el gasto de comisión correspondiente en Finanzas (ver
-- utils/comisionesHelpers.js). El ingreso se sigue registrando por el
-- importe bruto (lo que paga el cliente) — la comisión es un gasto aparte,
-- así se ve cuánto se factura de verdad y cuánto se comen las comisiones.
--
-- reserva_pct / reserva_dias: solo relevante para Hotmart, que no paga
-- todo de golpe — retiene un % del cobro (reserva de seguridad, por si
-- hay reembolsos/contracargos) durante unos días. No genera una fila de
-- ingreso aparte (para no duplicar el ingreso ya reconocido), pero se
-- añade como nota informativa en el ingreso — ver comisionesHelpers.js.
--
-- Los valores de partida son los publicados por Stripe/Hotmart en julio
-- 2026; edítalos en el panel (pestaña Finanzas > Comisiones) si tu
-- contrato real tiene otras condiciones.
create table if not exists public.tarifas_pasarela (
  id text primary key,
  pasarela text not null,
  porcentaje numeric not null default 0,
  fijo numeric not null default 0,
  reserva_pct numeric not null default 0,
  reserva_dias smallint not null default 0,
  notas text default '',
  actualizado_en date
);

alter table public.tarifas_pasarela enable row level security;

drop policy if exists "tarifas_pasarela_admin_only" on public.tarifas_pasarela;
create policy "tarifas_pasarela_admin_only" on public.tarifas_pasarela
  for all
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

insert into public.tarifas_pasarela (id, pasarela, porcentaje, fijo, reserva_pct, reserva_dias, notas, actualizado_en) values
  ('Stripe', 'Stripe', 1.5, 0.25, 0, 0, 'Tarjeta estándar del Espacio Económico Europeo. Si el cliente paga con tarjeta premium o no europea, la comisión real es mayor — ajusta a mano si hace falta.', '2026-07-18'),
  ('HOTMART', 'Hotmart', 9.9, 0.50, 10, 15, 'Comisión de plataforma 9,9% + 0,50 (moneda de la venta). Reserva de seguridad: 10% retenido 15 días, confirmar en tu panel de Hotmart si tu cuenta tiene otro plazo/porcentaje.', '2026-07-18'),
  ('Bizum', 'Bizum', 0, 0, 0, 0, 'Sin comisión.', '2026-07-18'),
  ('Transferencia', 'Transferencia', 0, 0, 0, 0, 'Sin comisión.', '2026-07-18')
on conflict (id) do nothing;

notify pgrst, 'reload schema';
