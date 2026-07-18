import { useMemo, useState } from 'react'
import { insertFinanzaRemote, deleteFinanzaRemote } from '../lib/queries/finanzas'
import { updateClienteRemote } from '../lib/queries/clientes'
import { calcularComision, construirComisionCobro } from '../utils/comisionesHelpers'

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

export default function CobrosPendientes({ clientes = [], setClientes, setIngresosEmpresa, setGastosEmpresa, tarifasPasarela = [] }) {
  const [editando, setEditando] = useState(null) // `${clienteIndex}-${numero}`
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nuevoCobro, setNuevoCobro] = useState({ clienteId: '', concepto: '', importe: '', fecha: todayISO() })

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
            formaPago: cliente['Forma de pago'],
            totalPlazos: (cliente.Plazos || []).length,
          })
        }
      })
    })
    return lista.sort((a, b) => (a.fecha || '') < (b.fecha || '') ? -1 : 1)
  }, [clientes])

  // Comisión estimada de la pasarela del cliente (Stripe/Hotmart/...), solo
  // para mostrarla antes de cobrar — el cálculo real (y el gasto que se
  // genera) pasa en marcarCobrado, con la tarifa vigente en ese momento.
  const tarifaDe = (formaPago) => tarifasPasarela.find((t) => t.id === formaPago)

  // Añadir un cobro pendiente manualmente, sin pasar por el alta de cliente
  // ni por el cierre de venta en Ventas — para ajustes, cobros sueltos o
  // servicios adicionales facturados a un cliente ya existente.
  const añadirCobroManual = () => {
    const clienteIndex = clientes.findIndex((c) => c.id === nuevoCobro.clienteId)
    if (clienteIndex === -1) return
    const cliente = clientes[clienteIndex]
    const importe = Number(nuevoCobro.importe)
    if (!importe || importe <= 0) return
    const existentes = cliente.Plazos || []
    const siguienteNumero = existentes.length ? Math.max(...existentes.map((p) => p.numero || 0)) + 1 : 1
    const nuevoPlazo = {
      numero: siguienteNumero,
      importe,
      fecha: nuevoCobro.fecha || todayISO(),
      pagado: false,
      fechaPago: null,
      concepto: nuevoCobro.concepto || '',
    }
    const plazosActualizados = [...existentes, nuevoPlazo]
    setClientes(prev => prev.map((c, i) => i === clienteIndex ? { ...c, Plazos: plazosActualizados } : c))
    if (cliente.id) updateClienteRemote(cliente.id, { Plazos: plazosActualizados })
    setNuevoCobro({ clienteId: '', concepto: '', importe: '', fecha: todayISO() })
    setMostrarForm(false)
  }

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
    if (typeof setIngresosEmpresa !== 'function' || !plazo.clienteId) return

    const idBase = idIngresoPlazo(plazo.clienteId, plazo.numero)
    const tarifa = tarifaDe(plazo.formaPago)
    const { gasto, notaReserva } = construirComisionCobro({ idBase, fecha: hoy, importeBruto: plazo.importe, tarifa })

    // El ingreso se registra por el importe BRUTO (lo que paga el
    // cliente) — la comisión de la pasarela se registra aparte, como
    // gasto, para poder ver por separado cuánto se factura de verdad y
    // cuánto se comen las comisiones (ver utils/comisionesHelpers.js).
    const nuevoIngreso = {
      id: idBase,
      fecha: hoy,
      concepto: `Plazo ${plazo.numero}/${plazo.totalPlazos} — ${plazo.clienteNombre}${plazo.servicio ? ' · ' + plazo.servicio : ''}`,
      importe: Number(plazo.importe) || 0,
      notas: ['Cobro automático desde Clientes > Cobros pendientes', notaReserva].filter(Boolean).join(' — '),
      origen: 'cobro_cliente',
      clienteId: plazo.clienteId,
      plazoNumero: plazo.numero,
    }
    setIngresosEmpresa(prev => [nuevoIngreso, ...prev])
    insertFinanzaRemote('ingresos_empresa', nuevoIngreso)

    if (gasto && typeof setGastosEmpresa === 'function') {
      setGastosEmpresa(prev => [gasto, ...prev])
      insertFinanzaRemote('gastos_empresa', gasto)
    }
  }

  // Deshacer: vuelve el plazo a pendiente (sin fecha de cobro) y borra el
  // ingreso y la comisión automáticos que se habían creado en Finanzas.
  const deshacerCobro = (plazo) => {
    actualizarPlazo(plazo.clienteIndex, plazo.numero, { pagado: false, fechaPago: null })
    if (!plazo.clienteId) return
    const idBase = idIngresoPlazo(plazo.clienteId, plazo.numero)
    if (typeof setIngresosEmpresa === 'function') {
      setIngresosEmpresa(prev => prev.filter(ingreso => ingreso.id !== idBase))
      deleteFinanzaRemote('ingresos_empresa', idBase)
    }
    if (typeof setGastosEmpresa === 'function') {
      const idComision = `${idBase}-comision`
      setGastosEmpresa(prev => prev.filter(g => g.id !== idComision))
      deleteFinanzaRemote('gastos_empresa', idComision)
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
          <button type="button" className="secondary-action" onClick={() => setMostrarForm(v => !v)}>
            {mostrarForm ? 'Cancelar' : '➕ Añadir cobro pendiente'}
          </button>
        </div>

        {mostrarForm && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', padding: '12px 16px', borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 4 }}>
              Cliente
              <select
                value={nuevoCobro.clienteId}
                onChange={(e) => setNuevoCobro(prev => ({ ...prev, clienteId: e.target.value }))}
                style={{ minWidth: 180 }}
              >
                <option value="">Selecciona...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.Nombre}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 4 }}>
              Concepto (opcional)
              <input
                type="text"
                placeholder="Ej. Sesión extra, ajuste..."
                value={nuevoCobro.concepto}
                onChange={(e) => setNuevoCobro(prev => ({ ...prev, concepto: e.target.value }))}
                style={{ minWidth: 160 }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 4 }}>
              Importe (€)
              <input
                type="number"
                min="0"
                step="0.01"
                value={nuevoCobro.importe}
                onChange={(e) => setNuevoCobro(prev => ({ ...prev, importe: e.target.value }))}
                style={{ width: 100 }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 4 }}>
              Fecha prevista
              <input
                type="date"
                value={nuevoCobro.fecha}
                onChange={(e) => setNuevoCobro(prev => ({ ...prev, fecha: e.target.value }))}
              />
            </label>
            <button
              type="button"
              className="row-action-btn"
              disabled={!nuevoCobro.clienteId || !nuevoCobro.importe}
              onClick={añadirCobroManual}
            >
              Añadir
            </button>
          </div>
        )}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Plazo</th>
                <th>Pasarela</th>
                <th>Importe</th>
                <th>Fecha prevista</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.map((plazo) => {
                const key = `${plazo.clienteIndex}-${plazo.numero}`
                const enEdicion = editando === key
                const tarifa = tarifaDe(plazo.formaPago)
                const comisionEstimada = calcularComision(plazo.importe, tarifa)
                return (
                  <tr key={key}>
                    <td style={{ fontWeight: 600 }}>{plazo.clienteNombre || '—'}</td>
                    <td>{plazo.concepto || plazo.servicio || '—'}</td>
                    <td>{plazo.numero}/{plazo.totalPlazos}</td>
                    <td>
                      {plazo.formaPago || '—'}
                      {comisionEstimada > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                          Comisión ≈ {euro(comisionEstimada)}
                        </div>
                      )}
                    </td>
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
                <tr><td colSpan={7} className="lead-log-empty">No hay plazos pendientes de cobro.</td></tr>
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
