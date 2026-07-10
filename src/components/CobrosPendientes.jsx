import { useMemo, useState } from 'react'
import { insertFinanzaRemote, deleteFinanzaRemote } from '../lib/queries/finanzas'
import { updateClienteRemote } from '../lib/queries/clientes'

// Vista global de plazos pendientes de cobro, generados desde Clientes al
// contratar un servicio en 2 o 3 plazos. Al marcar un plazo como cobrado,
// se actualiza el cliente (pagado + fecha real de cobro) y se añade
// automáticamente un ingreso en Finanzas > Ingresos empresa. El id de ese
// ingreso es determinista (cliente.id + número de plazo, sin Date.now())
// para poder encontrarlo y borrarlo si se deshace el cobro.

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function euro(n) {
  return `${(Number(n) || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}€`
}

function idIngresoPlazo(clienteId, numero) {
  return `fin-plazo-${clienteId}-${numero}`
}

export default function CobrosPendientes({ clientes = [], setClientes, setIngresosEmpresa }) {
  const [editando, setEditando] = useState(null) // `${clienteIndex}-${numero}`

  const pendientes = useMemo(() => {
    const lista = []
    clientes.forEach((cliente, clienteIndex) => {
      (cliente.Plazos || []).forEach((plazo) => {
        if (!plazo.pagado) {
          lista.push({
            ...plazo,
            clienteIndex,
            clienteId: cliente.id,
            clienteNombre: cliente.Nombre,
            servicio: cliente['Servicio contratado'],
            totalPlazos: (cliente.Plazos || []).length,
          })
        }
      })
    })
    return lista.sort((a, b) => (a.fecha || '') < (b.fecha || '') ? -1 : 1)
  }, [clientes])

  const cobradosRecientes = useMemo(() => {
    const lista = []
    clientes.forEach((cliente, clienteIndex) => {
      (cliente.Plazos || []).forEach((plazo) => {
        if (plazo.pagado) {
          lista.push({
            ...plazo,
            clienteIndex,
            clienteId: cliente.id,
            clienteNombre: cliente.Nombre,
            servicio: cliente['Servicio contratado'],
            totalPlazos: (cliente.Plazos || []).length,
          })
        }
      })
    })
    return lista.sort((a, b) => (b.fechaPago || '') < (a.fechaPago || '') ? -1 : 1).slice(0, 8)
  }, [clientes])

  const totalPendiente = useMemo(
    () => pendientes.reduce((sum, p) => sum + (Number(p.importe) || 0), 0),
    [pendientes]
  )

  const actualizarPlazo = (clienteIndex, numero, patch) => {
    const cliente = clientes[clienteIndex]
    const plazosActualizados = (cliente?.Plazos || []).map(p => p.numero === numero ? { ...p, ...patch } : p)
    setClientes(prev => prev.map((c, i) => i === clienteIndex ? { ...c, Plazos: plazosActualizados } : c))
    if (cliente?.id) updateClienteRemote(cliente.id, { Plazos: plazosActualizados })
  }

  const marcarCobrado = (plazo) => {
    const hoy = todayISO()
    actualizarPlazo(plazo.clienteIndex, plazo.numero, { pagado: true, fechaPago: hoy })
    if (typeof setIngresosEmpresa === 'function' && plazo.clienteId) {
      const nuevoIngreso = {
        id: idIngresoPlazo(plazo.clienteId, plazo.numero),
        fecha: hoy,
        concepto: `Plazo ${plazo.numero}/${plazo.totalPlazos} — ${plazo.clienteNombre}${plazo.servicio ? ' · ' + plazo.servicio : ''}`,
        importe: Number(plazo.importe) || 0,
        notas: 'Cobro automático desde Clientes > Cobros pendientes',
        origen: 'cobro_cliente',
        clienteId: plazo.clienteId,
        plazoNumero: plazo.numero,
      }
      setIngresosEmpresa(prev => [nuevoIngreso, ...prev])
      insertFinanzaRemote('ingresos_empresa', nuevoIngreso)
    }
  }

  // Deshacer: vuelve el plazo a pendiente (sin fecha de cobro) y borra el
  // ingreso automático que se había creado en Finanzas > Ingresos empresa.
  const deshacerCobro = (plazo) => {
    actualizarPlazo(plazo.clienteIndex, plazo.numero, { pagado: false, fechaPago: null })
    if (typeof setIngresosEmpresa === 'function' && plazo.clienteId) {
      const id = idIngresoPlazo(plazo.clienteId, plazo.numero)
      setIngresosEmpresa(prev => prev.filter(ingreso => ingreso.id !== id))
      deleteFinanzaRemote('ingresos_empresa', id)
    }
  }

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Plazos pendientes</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>💳</div>
          </div>
          <div className="kpi-card-value">{pendientes.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total pendiente de cobrar</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>💶</div>
          </div>
          <div className="kpi-card-value">{euro(totalPendiente)}</div>
        </div>
      </div>

      <div className="table-card">
        <div className="card-header">
          <div>
            <div className="card-title">Plazos pendientes de cobro</div>
            <div className="card-subtitle">Ordenados por fecha prevista. Al marcar "Cobrado" se añade automáticamente a Finanzas &gt; Ingresos empresa.</div>
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Plazo</th>
                <th>Importe</th>
                <th>Fecha prevista</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.map((plazo) => {
                const key = `${plazo.clienteIndex}-${plazo.numero}`
                const enEdicion = editando === key
                return (
                  <tr key={key}>
                    <td style={{ fontWeight: 600 }}>{plazo.clienteNombre || '—'}</td>
                    <td>{plazo.servicio || '—'}</td>
                    <td>{plazo.numero}/{plazo.totalPlazos}</td>
                    <td>
                      {enEdicion ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={plazo.importe}
                          onChange={e => actualizarPlazo(plazo.clienteIndex, plazo.numero, { importe: e.target.value })}
                          style={{ width: 90 }}
                        />
                      ) : euro(plazo.importe)}
                    </td>
                    <td>
                      {enEdicion ? (
                        <input
                          type="date"
                          value={plazo.fecha || ''}
                          onChange={e => actualizarPlazo(plazo.clienteIndex, plazo.numero, { fecha: e.target.value })}
                        />
                      ) : formatFecha(plazo.fecha)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="row-action-btn"
                        onClick={() => setEditando(enEdicion ? null : key)}
                      >
                        {enEdicion ? 'Listo' : 'Editar'}
                      </button>
                      <button
                        type="button"
                        className="row-action-btn"
                        onClick={() => marcarCobrado(plazo)}
                      >
                        ✅ Marcar cobrado
                      </button>
                    </td>
                  </tr>
                )
              })}
              {pendientes.length === 0 && (
                <tr><td colSpan={6} className="lead-log-empty">No hay plazos pendientes de cobro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {cobradosRecientes.length > 0 && (
        <div className="table-card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Cobrados recientemente</div>
              <div className="card-subtitle">Últimos plazos marcados como cobrados. "Deshacer" los vuelve a pendiente y borra el ingreso de Finanzas.</div>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Plazo</th>
                  <th>Importe</th>
                  <th>Fecha de cobro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cobradosRecientes.map((plazo) => (
                  <tr key={`${plazo.clienteIndex}-${plazo.numero}-cobrado`}>
                    <td style={{ fontWeight: 600 }}>{plazo.clienteNombre || '—'}</td>
                    <td>{plazo.servicio || '—'}</td>
                    <td>{plazo.numero}/{plazo.totalPlazos}</td>
                    <td>{euro(plazo.importe)}</td>
                    <td>{formatFecha(plazo.fechaPago)}</td>
                    <td>
                      <button
                        type="button"
                        className="row-action-btn"
                        onClick={() => deshacerCobro(plazo)}
                      >
                        ↩️ Deshacer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
