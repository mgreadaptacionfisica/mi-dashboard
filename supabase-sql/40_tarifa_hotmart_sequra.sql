-- Corrige la tarifa de Hotmart: todas las ventas de Raúl por Hotmart pasan
-- por la financiación de seQura (Hotmart usa seQura para poder ofrecer
-- pago aplazado/financiado al cliente). El reparto real que ve Raúl es
-- 80% al momento del cobro / 20% unos 15 días después — no el 90/10
-- genérico de la reserva de seguridad estándar de Hotmart que se puso en
-- la migración 39 (esa cifra era la publicada por Hotmart para ventas sin
-- financiar; con seQura de por medio el reparto es distinto).
update public.tarifas_pasarela set
  reserva_pct = 20,
  reserva_dias = 15,
  notas = 'Comisión de plataforma 9,9% + 0,50. Todas las ventas Hotmart de Raúl van con financiación seQura (Hotmart la usa para ofrecer pago aplazado al cliente): el reparto real es 80% al momento del cobro y 20% liberado unos 15 días después — ajusta los días si ves que varía.',
  actualizado_en = '2026-07-18'
where id = 'HOTMART';

notify pgrst, 'reload schema';
