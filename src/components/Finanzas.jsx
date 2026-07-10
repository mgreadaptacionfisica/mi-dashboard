import { useMemo, useState } from 'react'
import { insertFinanzaRemote, updateFinanzaRemote, deleteFinanzaRemote } from '../lib/queries/finanzas'

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

const initialForm = { fecha: todayISO(), concepto: '', importe: '', notas: '' }

function LedgerTable({ entradas = [], setEntradas, etiqueta, mostrarOrigen, tabla }) {
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
                  <td style={{ fontWeight: 600 }}>{entrada.concepto || '—'}</td>
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
          <LedgerTable entradas={ingresosEmpresa} setEntradas={setIngresosEmpresa} etiqueta="Ingresos empresa" mostrarOrigen tabla="ingresos_empresa" />
        )}
        {activeTab === 'gastosEmpresa' && (
          <LedgerTable entradas={gastosEmpresa} setEntradas={setGastosEmpresa} etiqueta="Gastos empresa" mostrarOrigen tabla="gastos_empresa" />
        )}
        {activeTab === 'ingresosPersonales' && (
          <LedgerTable entradas={ingresosPersonales} setEntradas={setIngresosPersonales} etiqueta="Ingresos personales" tabla="ingresos_personales" />
        )}
        {activeTab === 'gastosPersonales' && (
          <LedgerTable entradas={gastosPersonales} setEntradas={setGastosPersonales} etiqueta="Gastos personales" tabla="gastos_personales" />
        )}
      </main>
    </>
  )
}
