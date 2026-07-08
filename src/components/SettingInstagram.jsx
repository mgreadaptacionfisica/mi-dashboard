import { useMemo, useState } from 'react'
import { MENSAJES_BIENVENIDA, MENSAJES_FUP } from '../data/mensajesSetting'

const MENSAJE_IDS = ['N1', 'N2', 'N3']

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const initialForm = {
  fecha: todayISO(),
  bienvenidasEnviadas: '',
  bienvenidasRespondidas: '',
  mensajeBienvenida: '',
  fupEnviados: '',
  fupRespondidas: '',
  mensajeFup: '',
  ultimaBienvenida: '',
  llamadas: '',
  ventas: '',
}

function pct(numerador, denominador) {
  if (!denominador) return '—'
  return `${Math.round((numerador / denominador) * 100)}%`
}

function formatFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function SettingInstagram({ setting = [], setSetting }) {
  const [showForm, setShowForm] = useState(false)
  const [editingFecha, setEditingFecha] = useState(null)
  const [formData, setFormData] = useState(initialForm)
  const [showMensajes, setShowMensajes] = useState(false)

  const registrosOrdenados = useMemo(
    () => [...setting].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)),
    [setting]
  )

  const totales = useMemo(() => {
    const acc = setting.reduce((sum, r) => ({
      bienvenidasEnviadas: sum.bienvenidasEnviadas + (Number(r.bienvenidasEnviadas) || 0),
      bienvenidasRespondidas: sum.bienvenidasRespondidas + (Number(r.bienvenidasRespondidas) || 0),
      fupEnviados: sum.fupEnviados + (Number(r.fupEnviados) || 0),
      fupRespondidas: sum.fupRespondidas + (Number(r.fupRespondidas) || 0),
      llamadas: sum.llamadas + (Number(r.llamadas) || 0),
      ventas: sum.ventas + (Number(r.ventas) || 0),
    }), {
      bienvenidasEnviadas: 0, bienvenidasRespondidas: 0, fupEnviados: 0, fupRespondidas: 0, llamadas: 0, ventas: 0,
    })
    return acc
  }, [setting])

  const rendimientoBienvenida = useMemo(() => MENSAJE_IDS.map((id) => {
    const dias = setting.filter((r) => r.mensajeBienvenida === id)
    const enviadas = dias.reduce((s, r) => s + (Number(r.bienvenidasEnviadas) || 0), 0)
    const respondidas = dias.reduce((s, r) => s + (Number(r.bienvenidasRespondidas) || 0), 0)
    return { id, dias: dias.length, enviadas, respondidas, pct: pct(respondidas, enviadas) }
  }), [setting])

  const rendimientoFup = useMemo(() => MENSAJE_IDS.map((id) => {
    const dias = setting.filter((r) => r.mensajeFup === id)
    const enviados = dias.reduce((s, r) => s + (Number(r.fupEnviados) || 0), 0)
    const respondidas = dias.reduce((s, r) => s + (Number(r.fupRespondidas) || 0), 0)
    return { id, dias: dias.length, enviados, respondidas, pct: pct(respondidas, enviados) }
  }), [setting])

  const openNewForm = () => {
    setEditingFecha(null)
    setFormData({ ...initialForm, fecha: todayISO() })
    setShowForm(true)
  }

  const openEditForm = (registro) => {
    setEditingFecha(registro.fecha)
    setFormData({
      fecha: registro.fecha,
      bienvenidasEnviadas: registro.bienvenidasEnviadas ?? '',
      bienvenidasRespondidas: registro.bienvenidasRespondidas ?? '',
      mensajeBienvenida: registro.mensajeBienvenida || '',
      fupEnviados: registro.fupEnviados ?? '',
      fupRespondidas: registro.fupRespondidas ?? '',
      mensajeFup: registro.mensajeFup || '',
      ultimaBienvenida: registro.ultimaBienvenida || '',
      llamadas: registro.llamadas ?? '',
      ventas: registro.ventas ?? '',
    })
    setShowForm(true)
  }

  const eliminarRegistro = (fecha) => {
    if (typeof setSetting !== 'function') return
    setSetting((prev) => prev.filter((r) => r.fecha !== fecha))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (typeof setSetting !== 'function') return

    const nuevoRegistro = {
      fecha: formData.fecha || todayISO(),
      bienvenidasEnviadas: Number(formData.bienvenidasEnviadas) || 0,
      bienvenidasRespondidas: Number(formData.bienvenidasRespondidas) || 0,
      mensajeBienvenida: formData.mensajeBienvenida,
      fupEnviados: Number(formData.fupEnviados) || 0,
      fupRespondidas: Number(formData.fupRespondidas) || 0,
      mensajeFup: formData.mensajeFup,
      ultimaBienvenida: formData.ultimaBienvenida.trim(),
      llamadas: Number(formData.llamadas) || 0,
      ventas: Number(formData.ventas) || 0,
    }

    setSetting((prev) => {
      const existeFecha = editingFecha
        ? prev.some((r) => r.fecha === editingFecha)
        : prev.some((r) => r.fecha === nuevoRegistro.fecha)
      if (editingFecha) {
        return prev.map((r) => (r.fecha === editingFecha ? nuevoRegistro : r))
      }
      if (existeFecha) {
        return prev.map((r) => (r.fecha === nuevoRegistro.fecha ? nuevoRegistro : r))
      }
      return [nuevoRegistro, ...prev]
    })

    setShowForm(false)
    setEditingFecha(null)
    setFormData(initialForm)
  }

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Bienvenidas enviadas</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>👋</div>
          </div>
          <div className="kpi-card-value">{totales.bienvenidasEnviadas}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">% Respuesta bienvenida</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>💬</div>
          </div>
          <div className="kpi-card-value">{pct(totales.bienvenidasRespondidas, totales.bienvenidasEnviadas)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">FUP enviados</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>🚀</div>
          </div>
          <div className="kpi-card-value">{totales.fupEnviados}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">% Respuesta FUP</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>📨</div>
          </div>
          <div className="kpi-card-value">{pct(totales.fupRespondidas, totales.fupEnviados)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Llamadas</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>📞</div>
          </div>
          <div className="kpi-card-value">{totales.llamadas}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Ventas</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>✅</div>
          </div>
          <div className="kpi-card-value">{totales.ventas}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">% Conversión a venta</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>📈</div>
          </div>
          <div className="kpi-card-value">{pct(totales.ventas, totales.bienvenidasEnviadas)}</div>
        </div>
      </div>

      <div className="table-card">
        <div className="card-header">
          <div>
            <div className="card-title">Rendimiento por mensaje</div>
            <div className="card-subtitle">Comparativa de plantillas N1 / N2 / N3</div>
          </div>
          <button type="button" className="row-action-btn" onClick={() => setShowMensajes((v) => !v)}>
            {showMensajes ? 'Ocultar textos' : 'Ver textos de los mensajes'}
          </button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mensaje</th>
                <th>Días usado</th>
                <th>Bienvenidas enviadas</th>
                <th>Respondidas</th>
                <th>% Respuesta</th>
                <th>FUP enviados</th>
                <th>FUP respondidos</th>
                <th>% Respuesta FUP</th>
              </tr>
            </thead>
            <tbody>
              {MENSAJE_IDS.map((id) => {
                const b = rendimientoBienvenida.find((r) => r.id === id)
                const f = rendimientoFup.find((r) => r.id === id)
                return (
                  <tr key={id}>
                    <td style={{ fontWeight: 600 }}>{id}</td>
                    <td>{b.dias}</td>
                    <td>{b.enviadas}</td>
                    <td>{b.respondidas}</td>
                    <td>{b.pct}</td>
                    <td>{f.enviados}</td>
                    <td>{f.respondidas}</td>
                    <td>{f.pct}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {showMensajes && (
          <div className="lead-detail-columns" style={{ padding: '0 20px 20px' }}>
            <div>
              <label className="lead-detail-label">Textos de bienvenida</label>
              <ul className="lead-log-list">
                {MENSAJES_BIENVENIDA.map((m) => (
                  <li key={m.id}><strong>{m.id}</strong> — {m.descripcion}<br />{m.texto}</li>
                ))}
              </ul>
            </div>
            <div>
              <label className="lead-detail-label">Textos de follow-up</label>
              <ul className="lead-log-list">
                {MENSAJES_FUP.map((m) => (
                  <li key={m.id}><strong>{m.id}</strong> — {m.descripcion}<br />{m.texto}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="table-card">
        <div className="card-header">
          <div>
            <div className="card-title">Registro diario</div>
            <div className="card-subtitle">{setting.length} días registrados</div>
          </div>
          <button type="button" className="add-client-btn" onClick={openNewForm}>＋ Añadir día</button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Bienvenidas</th>
                <th>Respondidas</th>
                <th>Mensaje</th>
                <th>FUP</th>
                <th>Respondidos</th>
                <th>Mensaje FUP</th>
                <th>Última bienvenida</th>
                <th>Llamadas</th>
                <th>Ventas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registrosOrdenados.map((registro) => (
                <tr key={registro.fecha}>
                  <td style={{ fontWeight: 600 }}>{formatFecha(registro.fecha)}</td>
                  <td>{registro.bienvenidasEnviadas}</td>
                  <td>{registro.bienvenidasRespondidas}</td>
                  <td>{registro.mensajeBienvenida || '—'}</td>
                  <td>{registro.fupEnviados}</td>
                  <td>{registro.fupRespondidas}</td>
                  <td>{registro.mensajeFup || '—'}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{registro.ultimaBienvenida || '—'}</td>
                  <td>{registro.llamadas}</td>
                  <td>{registro.ventas}</td>
                  <td>
                    <button type="button" className="row-action-btn" onClick={() => openEditForm(registro)}>Editar</button>
                    <button type="button" className="row-action-btn" onClick={() => eliminarRegistro(registro.fecha)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {registrosOrdenados.length === 0 && (
                <tr><td colSpan={11} className="lead-log-empty">Sin registros todavía.</td></tr>
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
                <div className="card-title">{editingFecha ? 'Editar día' : 'Añadir día'}</div>
                <div className="card-subtitle">Registro de setting de Instagram</div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <label className="lead-detail-label">Fecha</label>
              <input
                type="date"
                required
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              />

              <div className="lead-detail-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label className="lead-detail-label">Bienvenidas enviadas</label>
                  <input type="number" min="0" value={formData.bienvenidasEnviadas}
                    onChange={(e) => setFormData({ ...formData, bienvenidasEnviadas: e.target.value })} />
                </div>
                <div>
                  <label className="lead-detail-label">Bienvenidas respondidas</label>
                  <input type="number" min="0" value={formData.bienvenidasRespondidas}
                    onChange={(e) => setFormData({ ...formData, bienvenidasRespondidas: e.target.value })} />
                </div>
              </div>

              <label className="lead-detail-label">Mensaje de bienvenida usado</label>
              <select value={formData.mensajeBienvenida} onChange={(e) => setFormData({ ...formData, mensajeBienvenida: e.target.value })}>
                <option value="">Sin especificar</option>
                {MENSAJE_IDS.map((id) => <option key={id} value={id}>{id}</option>)}
              </select>

              <div className="lead-detail-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label className="lead-detail-label">FUP enviados</label>
                  <input type="number" min="0" value={formData.fupEnviados}
                    onChange={(e) => setFormData({ ...formData, fupEnviados: e.target.value })} />
                </div>
                <div>
                  <label className="lead-detail-label">FUP respondidos</label>
                  <input type="number" min="0" value={formData.fupRespondidas}
                    onChange={(e) => setFormData({ ...formData, fupRespondidas: e.target.value })} />
                </div>
              </div>

              <label className="lead-detail-label">Mensaje de FUP usado</label>
              <select value={formData.mensajeFup} onChange={(e) => setFormData({ ...formData, mensajeFup: e.target.value })}>
                <option value="">Sin especificar</option>
                {MENSAJE_IDS.map((id) => <option key={id} value={id}>{id}</option>)}
              </select>

              <label className="lead-detail-label">Última bienvenida del día (usuario de Instagram)</label>
              <input
                placeholder="Ej: usuario_instagram"
                value={formData.ultimaBienvenida}
                onChange={(e) => setFormData({ ...formData, ultimaBienvenida: e.target.value })}
              />

              <div className="lead-detail-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label className="lead-detail-label">Llamadas agendadas</label>
                  <input type="number" min="0" value={formData.llamadas}
                    onChange={(e) => setFormData({ ...formData, llamadas: e.target.value })} />
                </div>
                <div>
                  <label className="lead-detail-label">Ventas cerradas</label>
                  <input type="number" min="0" value={formData.ventas}
                    onChange={(e) => setFormData({ ...formData, ventas: e.target.value })} />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="primary-action">Guardar día</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
