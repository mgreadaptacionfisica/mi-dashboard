// Gente que ha pagado una reserva pero todavía no el resto. Tienen ficha en
// `clientes` con estado 'RESERVA' (la crea la venta con reserva en Ventas),
// pero NO cuentan como clientes: no salen en el listado por defecto, ni en
// Seguimiento, Valoración, Dashboard ni en el equipo técnico (todos filtran
// por 'ACTIVO'). Muchos acaban sin pagar o desaparecen, y así no ensucian.
//
// Pasan a ACTIVO solos al cobrar el primer pago después de la reserva (en
// Cobros pendientes), o a mano con «Ya ha pagado». «No pagó» los pasa a
// NO ACTIVO y quita los cobros que quedaban pendientes; la reserva cobrada
// se queda en Finanzas.

function euro(n) {
  return `${(Number(n) || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}€`
}

function formatFecha(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export const ESTADO_RESERVA = 'RESERVA'

export function esReserva(cliente) {
  return (cliente?.['Estado del cliente'] || '').toUpperCase() === ESTADO_RESERVA
}

export default function ReservasPendientes({ clientes, onPasarACliente, onNoPago }) {
  const reservas = (clientes || []).filter(esReserva)
  if (reservas.length === 0) return null

  return (
    <div className="reservas-pendientes">
      <strong>🔖 {reservas.length} reserva{reservas.length === 1 ? '' : 's'} pendiente{reservas.length === 1 ? '' : 's'} de pago</strong>
      <p>
        Han pagado la reserva pero aún no el resto, así que todavía no cuentan como clientes. Pasan a cliente solos
        al marcar cobrado en «Cobros pendientes» el primer pago después de la reserva.
      </p>
      {reservas.map((c) => {
        const plazos = c.Plazos || []
        const pagado = plazos.filter((p) => p.pagado).reduce((s, p) => s + (Number(p.importe) || 0), 0)
        const pendientes = plazos.filter((p) => !p.pagado)
        const pendiente = pendientes.reduce((s, p) => s + (Number(p.importe) || 0), 0)
        const proxima = pendientes.map((p) => p.fecha).filter(Boolean).sort()[0]
        return (
          <div key={c.id || c.Nombre} className="reserva-fila">
            <span className="reserva-nombre">
              {c.Nombre}
              <em>
                {c['Servicio contratado'] ? ` · ${c['Servicio contratado']}` : ''}
                {` · reserva ${euro(pagado)}`}
                {pendiente > 0 ? ` · falta ${euro(pendiente)}${proxima ? ` (desde ${formatFecha(proxima)})` : ''}` : ''}
              </em>
            </span>
            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                if (window.confirm(`¿Pasar a ${c.Nombre} a cliente ACTIVO? Los cobros pendientes no se tocan.`)) onPasarACliente(c)
              }}
            >
              ✅ Ya ha pagado
            </button>
            <button
              type="button"
              className="reserva-no-pago"
              onClick={() => {
                if (window.confirm(`¿${c.Nombre} no va a pagar? Pasa a NO ACTIVO y se quitan sus cobros pendientes (la reserva cobrada se queda en Finanzas).`)) onNoPago(c)
              }}
            >
              ❌ No pagó
            </button>
          </div>
        )
      })}
    </div>
  )
}
