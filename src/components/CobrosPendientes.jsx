import { useMemo, useState } from 'react'
import { insertFinanzaRemote, deleteFinanzaRemote } from '../lib/queries/finanzas'
import { updateClienteRemote } from '../lib/queries/clientes'
import { generarPlazosDesdeFecha } from '../lib/plazos'
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

// Un plazo "de contrato" es el que salió del plan inicial del cliente: no
// lleva origen (los de renovación llevan 'renovacion' y los cobros sueltos
// 'manual') ni concepto propio. Son los únicos que se rehacen al cambiar el
// plan de pago; los de renovación y los cobros sueltos se quedan intactos.
// Los cobros sueltos antiguos no tienen `origen` (se añadió después), pero sí
// concepto, que es lo que los distingue.
function esPlazoContrato(plazo) {
  return !plazo.origen && !plazo.concepto
}

// Los plazos ya cobrados NUNCA se renumeran: el ingreso que generaron en
// Finanzas tiene un id determinista (`fin-plazo-{clienteId}-{numero}`), así
// que cambiarles el número dejaría ese ingreso huérfano y rompería el
// "Deshacer". Al rehacer el plan, los plazos nuevos cogen los números libres
// más bajos, empezando por el 1, para que la columna "Plazo x/y" siga
// leyéndose bien.
function numerosLibres(reservados, cuantos) {
  const usados = new Set(reservados)
  const libres = []
  let n = 1
  while (libres.length < cuantos) {
    if (!usados.has(n)) libres.push(n)
    n += 1
  }
  return libres
}

export default function CobrosPendientes({ clientes = [], setClientes, setIngresosEmpresa, setGastosEmpresa, tarifasPasarela = [] }) {
  const [editando, setEditando] = useState(null) // `${clienteIndex}-${numero}`
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nuevoCobro, setNuevoCobro] = useState({ clienteId: '', concepto: '', importe: '', fecha: todayISO() })
  const [mostrarPlan, setMostrarPlan] = useState(false)
  const [nuevoPlan, setNuevoPlan] = useState({ clienteId: '', numPlazos: 3, importe: '', fecha: todayISO() })

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
      // Marca de "cobro suelto": lo distingue de los plazos del contrato para
      // que "Cambiar plan de pago" no lo borre al rehacer el plan.
      origen: 'manual',
    }
    const plazosActualizados = [...existentes, nuevoPlazo]
    setClientes(prev => prev.map((c, i) => i === clienteIndex ? { ...c, Plazos: plazosActualizados } : c))
    if (cliente.id) updateClienteRemote(cliente.id, { Plazos: plazosActualizados })
    setNuevoCobro({ clienteId: '', concepto: '', importe: '', fecha: todayISO() })
    setMostrarForm(false)
  }

  // Foto del plan de contrato del cliente elegido en "Cambiar plan de pago":
  // qué lleva cobrado, qué queda pendiente y cuántos cobros hay que no se
  // van a tocar (renovación o sueltos).
  const planCliente = useMemo(() => {
    const cliente = clientes.find((c) => c.id === nuevoPlan.clienteId)
    if (!cliente) return null
    const plazos = cliente.Plazos || []
    const contrato = plazos.filter(esPlazoContrato)
    const pendientes = contrato.filter((p) => !p.pagado)
    const cobrados = contrato.filter((p) => p.pagado)
    return {
      cliente,
      plazos,
      pendientes,
      cobrados,
      importePendiente: pendientes.reduce((sum, p) => sum + (Number(p.importe) || 0), 0),
      importeCobrado: cobrados.reduce((sum, p) => sum + (Number(p.importe) || 0), 0),
      intocables: plazos.length - contrato.length,
    }
  }, [clientes, nuevoPlan.clienteId])

  // Al elegir cliente se precargan el importe pendiente y la fecha del primer
  // cobro que tenía previsto: lo normal es repartir eso mismo en más veces.
  const elegirClientePlan = (clienteId) => {
    const cliente = clientes.find((c) => c.id === clienteId)
    const pendientes = (cliente?.Plazos || []).filter((p) => esPlazoContrato(p) && !p.pagado)
    const importe = pendientes.reduce((sum, p) => sum + (Number(p.importe) || 0), 0)
    const primeraFecha = pendientes.map((p) => p.fecha).filter(Boolean).sort()[0]
    setNuevoPlan(prev => ({
      ...prev,
      clienteId,
      importe: importe > 0 ? String(importe) : '',
      fecha: primeraFecha || todayISO(),
    }))
  }

  // Rehace los plazos PENDIENTES del contrato: el caso típico es el cliente
  // que contrató en pago único y luego pide pagarlo en 2 o 3 veces (o al
  // revés). Solo toca lo pendiente del contrato — lo ya cobrado, los cobros
  // sueltos y los de renovación se conservan tal cual, con su número, para no
  // romper los ingresos que ya están en Finanzas.
  const cambiarPlanDePago = () => {
    if (!planCliente) return
    const n = Math.round(Number(nuevoPlan.numPlazos) || 0)
    const importe = Number(nuevoPlan.importe) || 0
    if (n < 1 || n > 12 || importe <= 0) return
    const clienteIndex = clientes.findIndex((c) => c.id === nuevoPlan.clienteId)
    if (clienteIndex === -1) return

    const cuota = Math.round((importe / n) * 100) / 100
    const aviso = `Se van a rehacer los cobros pendientes de ${planCliente.cliente.Nombre}: ${planCliente.pendientes.length} pendiente(s) por ${euro(planCliente.importePendiente)} pasan a ${n} plazo(s) de ${euro(cuota)}.` +
      (planCliente.cobrados.length > 0 ? `\n\nLo ya cobrado (${planCliente.cobrados.length} plazo(s), ${euro(planCliente.importeCobrado)}) no se toca.` : '') +
      (planCliente.intocables > 0 ? `\nLos ${planCliente.intocables} cobro(s) de renovación o sueltos tampoco.` : '') +
      '\n\n¿Continuar?'
    if (!window.confirm(aviso)) return

    const conservados = planCliente.plazos.filter((p) => !(esPlazoContrato(p) && !p.pagado))
    const libres = numerosLibres(conservados.map((p) => p.numero), n)
    const nuevos = generarPlazosDesdeFecha(n, importe, nuevoPlan.fecha).map((p, i) => ({ ...p, numero: libres[i] }))
    const plazosFinal = [...conservados, ...nuevos].sort((a, b) => (a.numero || 0) - (b.numero || 0))

    // "Tipo de pago" de la ficha es solo la etiqueta del plan, pero si se
    // queda desfasada confunde, así que se recalcula con los plazos de
    // contrato que quedan.
    const totalContrato = plazosFinal.filter(esPlazoContrato).length
    const patch = { Plazos: plazosFinal, Pago: totalContrato === 1 ? 'COMPLETO' : `${totalContrato} PLAZOS` }

    setClientes(prev => prev.map((c, i) => i === clienteIndex ? { ...c, ...patch } : c))
    if (planCliente.cliente.id) updateClienteRemote(planCliente.cliente.id, patch)
    setNuevoPlan({ clienteId: '', numPlazos: 3, importe: '', fecha: todayISO() })
    setMostrarPlan(false)
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="secondary-action"
              onClick={() => { setMostrarPlan(v => !v); setMostrarForm(false) }}
            >
              {mostrarPlan ? 'Cancelar' : '🔄 Cambiar plan de pago'}
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={() => { setMostrarForm(v => !v); setMostrarPlan(false) }}
            >
              {mostrarForm ? 'Cancelar' : '➕ Añadir cobro pendiente'}
            </button>
          </div>
        </div>

        {mostrarPlan && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
              Reparte lo que queda por cobrar del contrato en el número de plazos que quieras (p. ej. un pago único que el cliente pide pagar en 3 veces).
              Lo ya cobrado, los cobros sueltos y los de renovación no se tocan.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 4 }}>
                Cliente
                <select
                  value={nuevoPlan.clienteId}
                  onChange={(e) => elegirClientePlan(e.target.value)}
                  style={{ minWidth: 180 }}
                >
                  <option value="">Selecciona...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.Nombre}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 4 }}>
                Nº de plazos
                <input
                  type="number"
                  min="1"
                  max="12"
                  step="1"
                  value={nuevoPlan.numPlazos}
                  onChange={(e) => setNuevoPlan(prev => ({ ...prev, numPlazos: e.target.value }))}
                  style={{ width: 90 }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 4 }}>
                Importe a repartir (€)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={nuevoPlan.importe}
                  onChange={(e) => setNuevoPlan(prev => ({ ...prev, importe: e.target.value }))}
                  style={{ width: 130 }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 4 }}>
                Fecha del primer plazo
                <input
                  type="date"
                  value={nuevoPlan.fecha}
                  onChange={(e) => setNuevoPlan(prev => ({ ...prev, fecha: e.target.value }))}
                />
              </label>
              <button
                type="button"
                className="row-action-btn"
                disabled={!planCliente || !(Number(nuevoPlan.importe) > 0) || !(Number(nuevoPlan.numPlazos) >= 1)}
                onClick={cambiarPlanDePago}
              >
                Aplicar
              </button>
            </div>
            {planCliente && (
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 10 }}>
                {planCliente.cobrados.length > 0 && (
                  <div>✅ Ya cobrado: {planCliente.cobrados.length} plazo(s) — {euro(planCliente.importeCobrado)} (no se toca)</div>
                )}
                <div>
                  ⏳ Pendiente del contrato: {planCliente.pendientes.length} plazo(s) — {euro(planCliente.importePendiente)}
                  {planCliente.pendientes.length === 0 && ' (no queda nada pendiente: al aplicar se crearán cobros nuevos)'}
                </div>
                {planCliente.intocables > 0 && (
                  <div>🔒 {planCliente.intocables} cobro(s) de renovación o sueltos: se conservan</div>
                )}
                {Number(nuevoPlan.importe) > 0 && Number(nuevoPlan.numPlazos) >= 1 && (
                  <div style={{ marginTop: 4, fontWeight: 600, color: 'var(--color-text)' }}>
                    → Quedará en {Math.round(Number(nuevoPlan.numPlazos))} plazo(s) de {euro(Math.round((Number(nuevoPlan.importe) / Math.round(Number(nuevoPlan.numPlazos))) * 100) / 100)}, mensuales desde {formatFecha(nuevoPlan.fecha)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
