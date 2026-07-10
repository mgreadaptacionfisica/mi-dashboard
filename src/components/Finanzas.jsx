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

function euro(n) {
  return `${(Number(n) || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}€`
}

const initialForm = { fecha: todayISO(), concepto: '', importe: '', notas: '' }

function LedgerTable({ entradas = [], setEntradas, etiqueta, mostrarOrigenEquipo, tabla }) {
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
                {mostrarOrigenEquipo && <th>Origen</th>}
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
                  {mostrarOrigenEquipo && (
                    <td>
                      {entrada.origen === 'equipo'
                        ? <span className="status-pill status-activo">Pago equipo</span>
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
                <tr><td colSpan={mostrarOrigenEquipo ? 6 : 5} className="lead-log-empty">Sin registros todavía.</td></tr>
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

export default function Finanzas({
  ingresosPersonales = [], setIngresosPersonales,
  gastosPersonales = [], setGastosPersonales,
  gastosProfesionales = [], setGastosProfesionales,
}) {
  const [activeTab, setActiveTab] = useState('ingresos')

  const totalIngresos = useMemo(
    () => ingresosPersonales.reduce((s, e) => s + (Number(e.importe) || 0), 0),
    [ingresosPersonales]
  )
  const totalGastosPersonales = useMemo(
    () => gastosPersonales.reduce((s, e) => s + (Number(e.importe) || 0), 0),
    [gastosPersonales]
  )
  const totalGastosProfesionales = useMemo(
    () => gastosProfesionales.reduce((s, e) => s + (Number(e.importe) || 0), 0),
    [gastosProfesionales]
  )
  const balancePersonal = totalIngresos - totalGastosPersonales

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Finanzas</div>
          <div className="topbar-subtitle">Ingresos y gastos personales, y gastos profesionales de la empresa</div>
        </div>
      </header>

      <main className="page-content">
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Ingresos personales</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>💰</div>
            </div>
            <div className="kpi-card-value">{euro(totalIngresos)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Gastos personales</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>🧾</div>
            </div>
            <div className="kpi-card-value">{euro(totalGastosPersonales)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Balance personal</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>⚖️</div>
            </div>
            <div className="kpi-card-value">{euro(balancePersonal)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Gastos profesionales</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>🏢</div>
            </div>
            <div className="kpi-card-value">{euro(totalGastosProfesionales)}</div>
          </div>
        </div>

        <div className="tabs-bar">
          <button type="button" className={`tab-btn ${activeTab === 'ingresos' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('ingresos')}>
            💰 Ingresos personales
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'gastosPersonales' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('gastosPersonales')}>
            🧾 Gastos personales
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'gastosProfesionales' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('gastosProfesionales')}>
            🏢 Gastos profesionales
          </button>
        </div>

        {activeTab === 'ingresos' && (
          <LedgerTable entradas={ingresosPersonales} setEntradas={setIngresosPersonales} etiqueta="Ingresos personales" tabla="ingresos_personales" />
        )}
        {activeTab === 'gastosPersonales' && (
          <LedgerTable entradas={gastosPersonales} setEntradas={setGastosPersonales} etiqueta="Gastos personales" tabla="gastos_personales" />
        )}
        {activeTab === 'gastosProfesionales' && (
          <LedgerTable entradas={gastosProfesionales} setEntradas={setGastosProfesionales} etiqueta="Gastos profesionales" mostrarOrigenEquipo tabla="gastos_profesionales" />
        )}
      </main>
    </>
  )
}
