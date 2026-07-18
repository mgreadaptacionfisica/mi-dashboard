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
    reservaPct: 20,
    reservaDias: 15,
    notas: 'Comisión de plataforma 9,9% + 0,50. Todas las ventas Hotmart de Raúl van con financiación seQura (Hotmart la usa para ofrecer pago aplazado al cliente): el reparto real es 80% al momento del cobro y 20% liberado unos 15 días después — ajusta los días si ves que varía.',
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
