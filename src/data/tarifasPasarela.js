// Fallback estático de tarifas_pasarela — ver supabase-sql/39_tarifas_pasarela.sql
// y utils/comisionesHelpers.js. Solo se usa si Supabase no está disponible.
const tarifasPasarela = [
  {
    id: 'Stripe',
    pasarela: 'Stripe',
    porcentaje: 1.5,
    fijo: 0.25,
    reservaPct: 0,
    reservaDias: 0,
    notas: 'Tarjeta estándar del Espacio Económico Europeo. Si el cliente paga con tarjeta premium o no europea, la comisión real es mayor — ajusta a mano si hace falta.',
    actualizadoEn: '2026-07-18',
  },
  {
    id: 'HOTMART',
    pasarela: 'Hotmart',
    porcentaje: 9.9,
    fijo: 0.50,
    reservaPct: 10,
    reservaDias: 15,
    notas: 'Comisión de plataforma 9,9% + 0,50 (moneda de la venta). Reserva de seguridad: 10% retenido 15 días, confirmar en tu panel de Hotmart si tu cuenta tiene otro plazo/porcentaje.',
    actualizadoEn: '2026-07-18',
  },
  {
    id: 'Bizum',
    pasarela: 'Bizum',
    porcentaje: 0,
    fijo: 0,
    reservaPct: 0,
    reservaDias: 0,
    notas: 'Sin comisión.',
    actualizadoEn: '2026-07-18',
  },
  {
    id: 'Transferencia',
    pasarela: 'Transferencia',
    porcentaje: 0,
    fijo: 0,
    reservaPct: 0,
    reservaDias: 0,
    notas: 'Sin comisión.',
    actualizadoEn: '2026-07-18',
  },
]

export default tarifasPasarela
