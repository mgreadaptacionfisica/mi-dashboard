import { useMemo, useState } from 'react'
import { insertFinanzaRemote, updateFinanzaRemote, deleteFinanzaRemote } from '../lib/queries/finanzas'
import { insertReglaRecurrenteRemote, updateReglaRecurrenteRemote, deleteReglaRecurrenteRemote } from '../lib/queries/reglasRecurrentes'
import { entradasPendientes, FRECUENCIAS, TABLAS_RECURRENTES } from '../utils/recurrenciaHelpers'
import { updateTarifaPasarelaRemote } from '../lib/queries/tarifasPasarela'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function mesActualISO() {
  return new Date().toISOString().slice(0, 7)
}

function formatFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatMes(mesISO) {
  const [y, m] = mesISO.split('-')
  const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${nombres[Number(m) - 1] || m} ${y}`
}

function euro(n) {
  return `${(Number(n) || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}€`
}

const initialForm = { fecha: todayISO(), concepto: '', importe: '', notas: '', recurrente: false, frecuenciaMeses: '1', fechaFinRecurrencia: '' }

function LedgerTable({ entradas = [], setEntradas, etiqueta, mostrarOrigen, tabla, setReglas }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(initialForm)

  const ordenadas = useMemo(
    () => [...entradas].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)),
    [entradas]
  )

  const totalGeneral = useMemo(
    () => entradas.reduce((sum, e) => sum + (Number(e.importe) || 0), 0),
    [entradas]
  )

  const totalMes = useMemo(() => {
    const mes = mesActualISO()
    return entradas
      .filter((e) => (e.fecha || '').startsWith(mes))
      .reduce((sum, e) => sum + (Number(e.importe) || 0), 0)
  }, [entradas])

  const openNew = () => {
    setEditingId(null)
    setFormData({ ...initialForm, fecha: todayISO() })
    setShowForm(true)
  }

  const openEdit = (entrada) => {
    setEditingId(entrada.id)
    setFormData({
      fecha: entrada.fecha || todayISO(),
      concepto: entrada.concepto || '',
      importe: entrada.importe ?? '',
      notas: entrada.notas || '',
    })
    setShowForm(true)
  }

  const eliminar = (id) => {
    if (typeof setEntradas !== 'function') return
    setEntradas((prev) => prev.filter((e) => e.id !== id))
    deleteFinanzaRemote(tabla, id)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (typeof setEntradas !== 'function') return
    if (editingId) {
      const patch = {
        fecha: formData.fecha,
        concepto: formData.concepto.trim(),
        importe: Number(formData.importe) || 0,
        notas: formData.notas.trim(),
      }
      setEntradas((prev) => prev.map((e) => (e.id === editingId ? { ...e, ...patch } : e)))
      updateFinanzaRemote(tabla, editingId, patch)
    } else if (formData.recurrente) {
      // En vez de una fila suelta, se crea la regla (que se repetirá sola
      // cada X meses — ver utils/recurrenciaHelpers.js) y se genera de una
      // vez la primera fila (y cualquier otra que ya tocara, si la fecha
      // de inicio es anterior a hoy).
      const nuevaRegla = {
        id: `regla-${Date.now()}`,
        tabla,
        concepto: formData.concepto.trim(),
        importe: Number(formData.importe) || 0,
        categoria: '',
        notas: formData.notas.trim(),
        fechaInicio: formData.fecha,
        frecuenciaMeses: Number(formData.frecuenciaMeses) || 1,
        fechaFin: formData.fechaFinRecurrencia || null,
        activa: true,
      }
      if (typeof setReglas === 'function') {
        setReglas((prev) => [nuevaRegla, ...prev])
        insertReglaRecurrenteRemote(nuevaRegla)
      }
      const nuevasEntradas = entradasPendientes(nuevaRegla, entradas)
      nuevasEntradas.forEach((entrada) => insertFinanzaRemote(tabla, entrada))
      setEntradas((prev) => [...nuevasEntradas, ...prev])
    } else {
      const nueva = {
        id: `fin-${Date.now()}`,
        fecha: formData.fecha,
        concepto: formData.concepto.trim(),
        importe: Number(formData.importe) || 0,
        notas: formData.notas.trim(),
        origen: 'manual',
      }
      setEntradas((prev) => [nueva, ...prev])
      insertFinanzaRemote(tabla, nueva)
    }
    setShowForm(false)
    setEditingId(null)
    setFormData(initialForm)
  }

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total {etiqueta.toLowerCase()}</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>💶</div>
          </div>
          <div className="kpi-card-value">{euro(totalGeneral)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Este mes</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>📅</div>
          </div>
          <div className="kpi-card-value">{euro(totalMes)}</div>
        </div>
      </div>

      <div className="table-card">
        <div className="card-header">
          <div>
            <div className="card-title">{etiqueta}</div>
            <div className="card-subtitle">{entradas.length} registros</div>
          </div>
          <button type="button" className="add-client-btn" onClick={openNew}>＋ Añadir</button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                {mostrarOrigen && <th>Origen</th>}
                <th>Importe</th>
                <th>Notas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((entrada) => (
                <tr key={entrada.id}>
                  <td>{formatFecha(entrada.fecha)}</td>
                  <td style={{ fontWeight: 600 }}>
                    {entrada.reglaRecurrenteId && (
                      <span title="Generado por una regla recurrente — gestiónala en la pestaña Recurrentes" style={{ marginRight: 4 }}>🔁</span>
                    )}
                    {entrada.concepto || '—'}
                  </td>
                  {mostrarOrigen && (
                    <td>
                      {entrada.origen === 'equipo' || entrada.origen === 'cobro_cliente'
                        ? <span className="status-pill status-activo">Automático</span>
                        : <span className="status-pill status-inactivo">Manual</span>}
                    </td>
                  )}
                  <td>{euro(entrada.importe)}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{entrada.notas || '—'}</td>
                  <td>
                    <button type="button" className="row-action-btn" onClick={() => openEdit(entrada)}>Editar</button>
                    <button type="button" className="row-action-btn" onClick={() => eliminar(entrada.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {ordenadas.length === 0 && (
                <tr><td colSpan={mostrarOrigen ? 6 : 5} className="lead-log-empty">Sin registros todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="client-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="client-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{editingId ? 'Editar registro' : 'Añadir registro'}</div>
                <div className="card-subtitle">{etiqueta}</div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <label className="lead-detail-label">Fecha</label>
              <input type="date" required value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} />
              <input required placeholder="Concepto" value={formData.concepto}
                onChange={(e) => setFormData({ ...formData, concepto: e.target.value })} />
              <input type="number" min="0" step="0.01" placeholder="Importe (€)" value={formData.importe}
                onChange={(e) => setFormData({ ...formData, importe: e.target.value })} />
              <input placeholder="Notas (opcional)" value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })} />
              {!editingId && (
                <div className="recurrente-toggle">
                  <label className="tareas-check">
                    <input type="checkbox" checked={formData.recurrente}
                      onChange={(e) => setFormData({ ...formData, recurrente: e.target.checked })} />
                    <span>🔁 Es recurrente (se repite solo, no hace falta volver a apuntarlo)</span>
                  </label>
                  {formData.recurrente && (
                    <div className="recurrente-opciones">
                      <select value={formData.frecuenciaMeses}
                        onChange={(e) => setFormData({ ...formData, frecuenciaMeses: e.target.value })}>
                        {FRECUENCIAS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                      <label className="lead-detail-label" style={{ margin: 0 }}>Fecha fin (opcional)</label>
                      <input type="date" value={formData.fechaFinRecurrencia}
                        onChange={(e) => setFormData({ ...formData, fechaFinRecurrencia: e.target.value })} />
                    </div>
                  )}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="primary-action">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function formatFrecuencia(n) {
  const f = FRECUENCIAS.find((x) => x.value === Number(n))
  return f ? f.label : `Cada ${n} meses`
}

const initialReglaForm = { tabla: 'gastos_empresa', concepto: '', importe: '', categoria: '', notas: '', fechaInicio: todayISO(), frecuenciaMeses: '1', fechaFin: '' }

// Gestión de las reglas recurrentes de las 4 tablas a la vez (se puede
// crear una regla nueva directamente aquí, o desde el check "🔁 Es
// recurrente" al añadir un registro en cualquiera de las 4 pestañas). Al
// crear/editar/reanudar una regla se generan al momento las filas de los
// periodos que ya tocan (ver utils/recurrenciaHelpers.js), sin esperar a
// la próxima vez que se abra el panel.
function Recurrentes({
  reglas = [], setReglas,
  ingresosEmpresa = [], setIngresosEmpresa,
  gastosEmpresa = [], setGastosEmpresa,
  ingresosPersonales = [], setIngresosPersonales,
  gastosPersonales = [], setGastosPersonales,
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(initialReglaForm)

  const entradasPorTabla = {
    ingresos_empresa: [ingresosEmpresa, setIngresosEmpresa],
    gastos_empresa: [gastosEmpresa, setGastosEmpresa],
    ingresos_personales: [ingresosPersonales, setIngresosPersonales],
    gastos_personales: [gastosPersonales, setGastosPersonales],
  }

  const generarPendientes = (regla) => {
    const [entradasActuales, setEntradasActuales] = entradasPorTabla[regla.tabla] || [[], null]
    const nuevasEntradas = entradasPendientes(regla, entradasActuales)
    if (nuevasEntradas.length === 0) return
    nuevasEntradas.forEach((entrada) => insertFinanzaRemote(regla.tabla, entrada))
    if (typeof setEntradasActuales === 'function') setEntradasActuales((prev) => [...nuevasEntradas, ...prev])
  }

  const ordenadas = useMemo(
    () => [...reglas].sort((a, b) => (a.fechaInicio < b.fechaInicio ? 1 : -1)),
    [reglas]
  )

  const openNew = () => {
    setEditingId(null)
    setFormData({ ...initialReglaForm, fechaInicio: todayISO() })
    setShowForm(true)
  }

  const openEdit = (regla) => {
    setEditingId(regla.id)
    setFormData({
      tabla: regla.tabla,
      concepto: regla.concepto || '',
      importe: regla.importe ?? '',
      categoria: regla.categoria || '',
      notas: regla.notas || '',
      fechaInicio: regla.fechaInicio || todayISO(),
      frecuenciaMeses: String(regla.frecuenciaMeses || 1),
      fechaFin: regla.fechaFin || '',
    })
    setShowForm(true)
  }

  const eliminar = (id) => {
    if (typeof setReglas !== 'function') return
    if (!window.confirm('¿Eliminar esta regla recurrente? Dejará de generar filas nuevas — las que ya se crearon no se borran.')) return
    setReglas((prev) => prev.filter((r) => r.id !== id))
    deleteReglaRecurrenteRemote(id)
  }

  const toggleActiva = (regla) => {
    if (typeof setReglas !== 'function') return
    const activa = !regla.activa
    const actualizada = { ...regla, activa }
    setReglas((prev) => prev.map((r) => (r.id === regla.id ? actualizada : r)))
    updateReglaRecurrenteRemote(regla.id, { activa })
    if (activa) generarPendientes(actualizada)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (typeof setReglas !== 'function') return
    const patch = {
      tabla: formData.tabla,
      concepto: formData.concepto.trim(),
      importe: Number(formData.importe) || 0,
      categoria: formData.categoria.trim(),
      notas: formData.notas.trim(),
      fechaInicio: formData.fechaInicio,
      frecuenciaMeses: Number(formData.frecuenciaMeses) || 1,
      fechaFin: formData.fechaFin || null,
    }
    let reglaCompleta
    if (editingId) {
      reglaCompleta = { ...reglas.find((r) => r.id === editingId), ...patch, id: editingId }
      setReglas((prev) => prev.map((r) => (r.id === editingId ? reglaCompleta : r)))
      updateReglaRecurrenteRemote(editingId, patch)
    } else {
      reglaCompleta = { id: `regla-${Date.now()}`, activa: true, ...patch }
      setReglas((prev) => [reglaCompleta, ...prev])
      insertReglaRecurrenteRemote(reglaCompleta)
    }
    if (reglaCompleta.activa !== false) generarPendientes(reglaCompleta)
    setShowForm(false)
    setEditingId(null)
    setFormData(initialReglaForm)
  }

  return (
    <div className="table-card">
      <div className="card-header">
        <div>
          <div className="card-title">Gastos e ingresos recurrentes</div>
          <div className="card-subtitle">{reglas.length} reglas — cada una genera sola su fila en la tabla que toque</div>
        </div>
        <button type="button" className="add-client-btn" onClick={openNew}>＋ Añadir regla</button>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Concepto</th>
              <th>Importe</th>
              <th>Frecuencia</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((regla) => (
              <tr key={regla.id}>
                <td>{TABLAS_RECURRENTES.find((t) => t.value === regla.tabla)?.label || regla.tabla}</td>
                <td style={{ fontWeight: 600 }}>{regla.concepto || '—'}</td>
                <td>{euro(regla.importe)}</td>
                <td>{formatFrecuencia(regla.frecuenciaMeses)}</td>
                <td>{formatFecha(regla.fechaInicio)}</td>
                <td>{regla.fechaFin ? formatFecha(regla.fechaFin) : 'Sin fin'}</td>
                <td>
                  {regla.activa
                    ? <span className="status-pill status-activo">Activa</span>
                    : <span className="status-pill status-inactivo">Pausada</span>}
                </td>
                <td>
                  <button type="button" className="row-action-btn" onClick={() => openEdit(regla)}>Editar</button>
                  <button type="button" className="row-action-btn" onClick={() => toggleActiva(regla)}>{regla.activa ? 'Pausar' : 'Reanudar'}</button>
                  <button type="button" className="row-action-btn" onClick={() => eliminar(regla.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {ordenadas.length === 0 && (
              <tr><td colSpan={8} className="lead-log-empty">Sin reglas recurrentes todavía — márcalo al añadir un gasto/ingreso, o créala aquí directamente.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="client-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="client-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{editingId ? 'Editar regla recurrente' : 'Añadir regla recurrente'}</div>
                <div className="card-subtitle">Se generará sola una fila por cada periodo</div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <label className="lead-detail-label">Tipo</label>
              <select value={formData.tabla} onChange={(e) => setFormData({ ...formData, tabla: e.target.value })} disabled={Boolean(editingId)}>
                {TABLAS_RECURRENTES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input required placeholder="Concepto" value={formData.concepto}
                onChange={(e) => setFormData({ ...formData, concepto: e.target.value })} />
              <input type="number" min="0" step="0.01" placeholder="Importe (€)" value={formData.importe}
                onChange={(e) => setFormData({ ...formData, importe: e.target.value })} />
              {formData.tabla === 'gastos_empresa' && (
                <input placeholder="Categoría (opcional)" value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} />
              )}
              <label className="lead-detail-label">Fecha de inicio</label>
              <input type="date" required value={formData.fechaInicio}
                onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })} />
              <label className="lead-detail-label">Repetir</label>
              <select value={formData.frecuenciaMeses} onChange={(e) => setFormData({ ...formData, frecuenciaMeses: e.target.value })}>
                {FRECUENCIAS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <label className="lead-detail-label">Fecha fin (opcional)</label>
              <input type="date" value={formData.fechaFin}
                onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })} />
              <input placeholder="Notas (opcional)" value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })} />
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="primary-action">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Tarifas de comisión por pasarela de pago (Stripe/Hotmart/...). Al marcar
// un cobro en Clientes > Cobros pendientes, se busca aquí la tarifa según
// la "Forma de pago" del cliente y se genera automáticamente el gasto de
// comisión (ver utils/comisionesHelpers.js). Aquí solo se edita el
// porcentaje/fijo/reserva de cada una — no se pueden añadir ni borrar
// pasarelas nuevas desde aquí (las 4 vienen ya creadas por la migración
// 39_tarifas_pasarela.sql).
function Comisiones({ tarifas = [], setTarifas }) {
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(null)

  const openEdit = (t) => {
    setEditingId(t.id)
    setFormData({
      porcentaje: String(t.porcentaje ?? 0),
      fijo: String(t.fijo ?? 0),
      reservaPct: String(t.reservaPct ?? 0),
      reservaDias: String(t.reservaDias ?? 0),
      notas: t.notas || '',
    })
  }

  const guardar = (id) => {
    if (typeof setTarifas !== 'function' || !formData) return
    const patch = {
      porcentaje: Number(formData.porcentaje) || 0,
      fijo: Number(formData.fijo) || 0,
      reservaPct: Number(formData.reservaPct) || 0,
      reservaDias: Number(formData.reservaDias) || 0,
      notas: formData.notas,
      actualizadoEn: todayISO(),
    }
    setTarifas((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    updateTarifaPasarelaRemote(id, patch)
    setEditingId(null)
    setFormData(null)
  }

  return (
    <div className="table-card">
      <div className="card-header">
        <div>
          <div className="card-title">Comisiones de pasarela de pago</div>
          <div className="card-subtitle">Se aplican solas al marcar un cobro en Clientes &gt; Cobros pendientes, según la "Forma de pago" del cliente</div>
        </div>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Pasarela</th>
              <th>% comisión</th>
              <th>Fijo</th>
              <th>Reserva</th>
              <th>Notas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tarifas.map((t) => {
              const enEdicion = editingId === t.id
              return (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.pasarela || t.id}</td>
                  <td>
                    {enEdicion ? (
                      <input type="number" min="0" step="0.01" value={formData.porcentaje}
                        onChange={(e) => setFormData({ ...formData, porcentaje: e.target.value })} style={{ width: 70 }} />
                    ) : `${t.porcentaje}%`}
                  </td>
                  <td>
                    {enEdicion ? (
                      <input type="number" min="0" step="0.01" value={formData.fijo}
                        onChange={(e) => setFormData({ ...formData, fijo: e.target.value })} style={{ width: 70 }} />
                    ) : euro(t.fijo)}
                  </td>
                  <td>
                    {enEdicion ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input type="number" min="0" step="1" placeholder="%" value={formData.reservaPct}
                          onChange={(e) => setFormData({ ...formData, reservaPct: e.target.value })} style={{ width: 50 }} />
                        <input type="number" min="0" step="1" placeholder="días" value={formData.reservaDias}
                          onChange={(e) => setFormData({ ...formData, reservaDias: e.target.value })} style={{ width: 55 }} />
                      </div>
                    ) : (
                      Number(t.reservaPct) > 0 ? `${t.reservaPct}% a ${t.reservaDias} días` : 'Sin reserva'
                    )}
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', maxWidth: 260, fontSize: 12.5 }}>
                    {enEdicion ? (
                      <input value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} style={{ width: '100%' }} />
                    ) : (t.notas || '—')}
                  </td>
                  <td>
                    {enEdicion ? (
                      <>
                        <button type="button" className="row-action-btn" onClick={() => guardar(t.id)}>Guardar</button>
                        <button type="button" className="row-action-btn" onClick={() => { setEditingId(null); setFormData(null) }}>Cancelar</button>
                      </>
                    ) : (
                      <button type="button" className="row-action-btn" onClick={() => openEdit(t)}>Editar</button>
                    )}
                  </td>
                </tr>
              )
            })}
            {tarifas.length === 0 && (
              <tr><td colSpan={6} className="lead-log-empty">Sin tarifas todavía — ejecuta supabase-sql/39_tarifas_pasarela.sql en Supabase.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Agrupa las 4 tablas por mes (YYYY-MM) y por año, para ver de un vistazo
// cómo va la empresa y las finanzas personales de Raúl a lo largo del tiempo.
function Resumen({ ingresosEmpresa, gastosEmpresa, ingresosPersonales, gastosPersonales }) {
  const porMes = useMemo(() => {
    const mapa = {}
    const acumular = (lista, campo) => {
      lista.forEach((entrada) => {
        const mes = (entrada.fecha || '').slice(0, 7)
        if (!mes) return
        if (!mapa[mes]) mapa[mes] = { mes, ingresosEmpresa: 0, gastosEmpresa: 0, ingresosPersonales: 0, gastosPersonales: 0 }
        mapa[mes][campo] += Number(entrada.importe) || 0
      })
    }
    acumular(ingresosEmpresa, 'ingresosEmpresa')
    acumular(gastosEmpresa, 'gastosEmpresa')
    acumular(ingresosPersonales, 'ingresosPersonales')
    acumular(gastosPersonales, 'gastosPersonales')
    return Object.values(mapa).sort((a, b) => (a.mes < b.mes ? 1 : -1))
  }, [ingresosEmpresa, gastosEmpresa, ingresosPersonales, gastosPersonales])

  const porAnio = useMemo(() => {
    const mapa = {}
    porMes.forEach((fila) => {
      const anio = fila.mes.slice(0, 4)
      if (!mapa[anio]) mapa[anio] = { anio, ingresosEmpresa: 0, gastosEmpresa: 0, ingresosPersonales: 0, gastosPersonales: 0 }
      mapa[anio].ingresosEmpresa += fila.ingresosEmpresa
      mapa[anio].gastosEmpresa += fila.gastosEmpresa
      mapa[anio].ingresosPersonales += fila.ingresosPersonales
      mapa[anio].gastosPersonales += fila.gastosPersonales
    })
    return Object.values(mapa).sort((a, b) => (a.anio < b.anio ? 1 : -1))
  }, [porMes])

  return (
    <>
      <div className="table-card">
        <div className="card-header">
          <div>
            <div className="card-title">Resumen mensual</div>
            <div className="card-subtitle">Empresa (Ventas/Clientes/Equipo) y personal (lo que añades tú a mano), mes a mes</div>
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Ingresos empresa</th>
                <th>Gastos empresa</th>
                <th>Balance empresa</th>
                <th>Ingresos personales</th>
                <th>Gastos personales</th>
                <th>Balance personal</th>
              </tr>
            </thead>
            <tbody>
              {porMes.map((fila) => (
                <tr key={fila.mes}>
                  <td style={{ fontWeight: 600 }}>{formatMes(fila.mes)}</td>
                  <td>{euro(fila.ingresosEmpresa)}</td>
                  <td>{euro(fila.gastosEmpresa)}</td>
                  <td style={{ fontWeight: 600, color: fila.ingresosEmpresa - fila.gastosEmpresa >= 0 ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)' }}>
                    {euro(fila.ingresosEmpresa - fila.gastosEmpresa)}
                  </td>
                  <td>{euro(fila.ingresosPersonales)}</td>
                  <td>{euro(fila.gastosPersonales)}</td>
                  <td style={{ fontWeight: 600, color: fila.ingresosPersonales - fila.gastosPersonales >= 0 ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)' }}>
                    {euro(fila.ingresosPersonales - fila.gastosPersonales)}
                  </td>
                </tr>
              ))}
              {porMes.length === 0 && (
                <tr><td colSpan={7} className="lead-log-empty">Todavía no hay movimientos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Resumen anual</div>
            <div className="card-subtitle">Los mismos totales, agrupados por año</div>
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Año</th>
                <th>Ingresos empresa</th>
                <th>Gastos empresa</th>
                <th>Balance empresa</th>
                <th>Ingresos personales</th>
                <th>Gastos personales</th>
                <th>Balance personal</th>
              </tr>
            </thead>
            <tbody>
              {porAnio.map((fila) => (
                <tr key={fila.anio}>
                  <td style={{ fontWeight: 600 }}>{fila.anio}</td>
                  <td>{euro(fila.ingresosEmpresa)}</td>
                  <td>{euro(fila.gastosEmpresa)}</td>
                  <td style={{ fontWeight: 600, color: fila.ingresosEmpresa - fila.gastosEmpresa >= 0 ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)' }}>
                    {euro(fila.ingresosEmpresa - fila.gastosEmpresa)}
                  </td>
                  <td>{euro(fila.ingresosPersonales)}</td>
                  <td>{euro(fila.gastosPersonales)}</td>
                  <td style={{ fontWeight: 600, color: fila.ingresosPersonales - fila.gastosPersonales >= 0 ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)' }}>
                    {euro(fila.ingresosPersonales - fila.gastosPersonales)}
                  </td>
                </tr>
              ))}
              {porAnio.length === 0 && (
                <tr><td colSpan={7} className="lead-log-empty">Todavía no hay movimientos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export default function Finanzas({
  ingresosPersonales = [], setIngresosPersonales,
  gastosPersonales = [], setGastosPersonales,
  ingresosEmpresa = [], setIngresosEmpresa,
  gastosEmpresa = [], setGastosEmpresa,
  reglasRecurrentes = [], setReglasRecurrentes,
  tarifasPasarela = [], setTarifasPasarela,
}) {
  const [activeTab, setActiveTab] = useState('resumen')

  const totalIngresosEmpresa = useMemo(
    () => ingresosEmpresa.reduce((s, e) => s + (Number(e.importe) || 0), 0),
    [ingresosEmpresa]
  )
  const totalGastosEmpresa = useMemo(
    () => gastosEmpresa.reduce((s, e) => s + (Number(e.importe) || 0), 0),
    [gastosEmpresa]
  )
  const totalIngresosPersonales = useMemo(
    () => ingresosPersonales.reduce((s, e) => s + (Number(e.importe) || 0), 0),
    [ingresosPersonales]
  )
  const totalGastosPersonales = useMemo(
    () => gastosPersonales.reduce((s, e) => s + (Number(e.importe) || 0), 0),
    [gastosPersonales]
  )
  const balanceEmpresa = totalIngresosEmpresa - totalGastosEmpresa
  const balancePersonal = totalIngresosPersonales - totalGastosPersonales

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Finanzas</div>
          <div className="topbar-subtitle">Empresa (automático desde Ventas/Clientes/Equipo) y personal (a mano)</div>
        </div>
      </header>

      <main className="page-content">
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Balance empresa</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>🏢</div>
            </div>
            <div className="kpi-card-value">{euro(balanceEmpresa)}</div>
            <div className="kpi-card-footer">
              <span className="badge-text">{euro(totalIngresosEmpresa)} ingresos · {euro(totalGastosEmpresa)} gastos</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Balance personal</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>👤</div>
            </div>
            <div className="kpi-card-value">{euro(balancePersonal)}</div>
            <div className="kpi-card-footer">
              <span className="badge-text">{euro(totalIngresosPersonales)} ingresos · {euro(totalGastosPersonales)} gastos</span>
            </div>
          </div>
        </div>

        <div className="tabs-bar">
          <button type="button" className={`tab-btn ${activeTab === 'resumen' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('resumen')}>
            📊 Resumen
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'ingresosEmpresa' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('ingresosEmpresa')}>
            🏢 Ingresos empresa
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'gastosEmpresa' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('gastosEmpresa')}>
            🏢 Gastos empresa
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'ingresosPersonales' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('ingresosPersonales')}>
            👤 Ingresos personales
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'gastosPersonales' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('gastosPersonales')}>
            👤 Gastos personales
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'recurrentes' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('recurrentes')}>
            🔁 Recurrentes
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'comisiones' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('comisiones')}>
            ⚙️ Comisiones
          </button>
        </div>

        {activeTab === 'resumen' && (
          <Resumen
            ingresosEmpresa={ingresosEmpresa}
            gastosEmpresa={gastosEmpresa}
            ingresosPersonales={ingresosPersonales}
            gastosPersonales={gastosPersonales}
          />
        )}
        {activeTab === 'ingresosEmpresa' && (
          <LedgerTable entradas={ingresosEmpresa} setEntradas={setIngresosEmpresa} etiqueta="Ingresos empresa" mostrarOrigen tabla="ingresos_empresa" setReglas={setReglasRecurrentes} />
        )}
        {activeTab === 'gastosEmpresa' && (
          <LedgerTable entradas={gastosEmpresa} setEntradas={setGastosEmpresa} etiqueta="Gastos empresa" mostrarOrigen tabla="gastos_empresa" setReglas={setReglasRecurrentes} />
        )}
        {activeTab === 'ingresosPersonales' && (
          <LedgerTable entradas={ingresosPersonales} setEntradas={setIngresosPersonales} etiqueta="Ingresos personales" tabla="ingresos_personales" setReglas={setReglasRecurrentes} />
        )}
        {activeTab === 'gastosPersonales' && (
          <LedgerTable entradas={gastosPersonales} setEntradas={setGastosPersonales} etiqueta="Gastos personales" tabla="gastos_personales" setReglas={setReglasRecurrentes} />
        )}
        {activeTab === 'recurrentes' && (
          <Recurrentes
            reglas={reglasRecurrentes} setReglas={setReglasRecurrentes}
            ingresosEmpresa={ingresosEmpresa} setIngresosEmpresa={setIngresosEmpresa}
            gastosEmpresa={gastosEmpresa} setGastosEmpresa={setGastosEmpresa}
            ingresosPersonales={ingresosPersonales} setIngresosPersonales={setIngresosPersonales}
            gastosPersonales={gastosPersonales} setGastosPersonales={setGastosPersonales}
          />
        )}
        {activeTab === 'comisiones' && (
          <Comisiones tarifas={tarifasPasarela} setTarifas={setTarifasPasarela} />
        )}
      </main>
    </>
  )
}
