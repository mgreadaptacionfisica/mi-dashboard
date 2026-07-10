import { useMemo, useState } from 'react'
import { upsertAdsKpiRemote, upsertAdsNotaRemote, insertAnuncioRemote, updateAnuncioRemote, deleteAnuncioRemote } from '../lib/queries/ads'

export const MESES_ADS = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
]

const SEMANAS = [1, 2, 3, 4, 5]

const BASE_METRICAS = [
  { key: 'bienvenidas', label: 'Bienvenidas dadas' },
  { key: 'conversaciones', label: 'Conversaciones iniciadas' },
  { key: 'agendas', label: 'Agendas' },
  { key: 'llamadas', label: 'Llamadas realizadas' },
  { key: 'canceladas', label: 'Canceladas' },
  { key: 'noShow', label: 'No show' },
  { key: 'ventas', label: 'Nº ventas' },
  { key: 'facturado', label: 'Facturado total (€)' },
  { key: 'cashCobrado', label: 'Cash cobrado (€)' },
  { key: 'inversion', label: 'Inversión ads (€)' },
]

const REGISTRO_VACIO = BASE_METRICAS.reduce((acc, m) => ({ ...acc, [m.key]: 0 }), {})

function sumar(a, b) {
  const out = {}
  BASE_METRICAS.forEach((m) => { out[m.key] = (Number(a[m.key]) || 0) + (Number(b[m.key]) || 0) })
  return out
}

function calcDerivadas(m) {
  const div = (num, den) => (den ? num / den : 0)
  return {
    pendiente: Math.max((m.facturado || 0) - (m.cashCobrado || 0), 0),
    costeConversacion: div(m.inversion, m.conversaciones),
    costeAgenda: div(m.inversion, m.agendas),
    costeLlamada: div(m.inversion, m.llamadas),
    costeVenta: div(m.inversion, m.ventas),
    roasFacturado: div(m.facturado, m.inversion),
    roasCash: div(m.cashCobrado, m.inversion),
    tasaConversacion: div(m.conversaciones, m.bienvenidas),
    tasaAgenda: div(m.agendas, m.conversaciones),
    showRate: div(m.llamadas, Math.max((m.agendas || 0) - (m.canceladas || 0), 1)),
    tasaCierre: div(m.ventas, m.llamadas),
  }
}

function euro(n) {
  return `${Math.round(n || 0).toLocaleString('es-ES')}€`
}

function pct(n) {
  return `${Math.round((n || 0) * 100)}%`
}

function ratio(n) {
  return `${(n || 0).toFixed(2)}x`
}

function mesActual() {
  return MESES_ADS[new Date().getMonth()]
}

const initialAnuncioForm = { nombre: '', video: '', llamadas: '', ventas: '' }

export default function AdsKpi({ adsKpi = [], setAdsKpi, adsNotas = [], setAdsNotas, anuncios = [], setAnuncios }) {
  const [vista, setVista] = useState('mensual')
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActual())
  const [showAnuncioForm, setShowAnuncioForm] = useState(false)
  const [editingAnuncioIndex, setEditingAnuncioIndex] = useState(null)
  const [anuncioForm, setAnuncioForm] = useState(initialAnuncioForm)

  const getSemana = (mes, semana) =>
    adsKpi.find((r) => r.mes === mes && r.semana === semana) || { mes, semana, ...REGISTRO_VACIO }

  const actualizarSemana = (mes, semana, key, valor) => {
    if (typeof setAdsKpi !== 'function') return
    const num = valor === '' ? 0 : Number(valor)
    const existente = adsKpi.find((r) => r.mes === mes && r.semana === semana)
    const actualizado = existente ? { ...existente, [key]: num } : { mes, semana, ...REGISTRO_VACIO, [key]: num }
    setAdsKpi((prev) => {
      const existe = prev.some((r) => r.mes === mes && r.semana === semana)
      if (existe) return prev.map((r) => (r.mes === mes && r.semana === semana ? actualizado : r))
      return [...prev, actualizado]
    })
    upsertAdsKpiRemote(actualizado)
  }

  const notaDelMes = adsNotas.find((n) => n.mes === mesSeleccionado)?.notas || ''

  const actualizarNota = (mes, texto) => {
    if (typeof setAdsNotas !== 'function') return
    setAdsNotas((prev) => {
      const existe = prev.some((n) => n.mes === mes)
      if (existe) return prev.map((n) => (n.mes === mes ? { ...n, notas: texto } : n))
      return [...prev, { mes, notas: texto }]
    })
    upsertAdsNotaRemote(mes, texto)
  }

  const totalesMes = useMemo(() => {
    const semanas = SEMANAS.map((s) => getSemana(mesSeleccionado, s))
    return semanas.reduce((acc, s) => sumar(acc, s), { ...REGISTRO_VACIO })
  }, [adsKpi, mesSeleccionado])

  const resumenAnual = useMemo(() => MESES_ADS.map((mes) => {
    const semanas = SEMANAS.map((s) => getSemana(mes, s))
    const totales = semanas.reduce((acc, s) => sumar(acc, s), { ...REGISTRO_VACIO })
    const derivadas = calcDerivadas(totales)
    return { mes, totales, derivadas }
  }), [adsKpi])

  const totalAnual = useMemo(() => {
    const totales = resumenAnual.reduce((acc, m) => sumar(acc, m.totales), { ...REGISTRO_VACIO })
    const derivadas = calcDerivadas(totales)
    return { totales, derivadas }
  }, [resumenAnual])

  const openNewAnuncio = () => {
    setEditingAnuncioIndex(null)
    setAnuncioForm(initialAnuncioForm)
    setShowAnuncioForm(true)
  }

  const openEditAnuncio = (index) => {
    const a = anuncios[index]
    setEditingAnuncioIndex(index)
    setAnuncioForm({
      nombre: a.nombre || '',
      video: a.video || '',
      llamadas: a.llamadas ?? '',
      ventas: a.ventas ?? '',
    })
    setShowAnuncioForm(true)
  }

  const eliminarAnuncio = (index) => {
    if (typeof setAnuncios !== 'function') return
    const anuncio = anuncios[index]
    setAnuncios((prev) => prev.filter((_, i) => i !== index))
    if (anuncio?.id) deleteAnuncioRemote(anuncio.id)
  }

  const handleSubmitAnuncio = (event) => {
    event.preventDefault()
    if (typeof setAnuncios !== 'function') return
    const base = {
      nombre: anuncioForm.nombre.trim(),
      video: anuncioForm.video.trim(),
      llamadas: Number(anuncioForm.llamadas) || 0,
      ventas: Number(anuncioForm.ventas) || 0,
    }
    if (editingAnuncioIndex === null) {
      const nuevo = { ...base, id: `anuncio-${Date.now()}` }
      setAnuncios((prev) => [nuevo, ...prev])
      insertAnuncioRemote(nuevo)
    } else {
      const existente = anuncios[editingAnuncioIndex]
      const actualizado = { ...base, id: existente?.id }
      setAnuncios((prev) => prev.map((a, i) => (i === editingAnuncioIndex ? actualizado : a)))
      if (existente?.id) updateAnuncioRemote(existente.id, base)
    }
    setShowAnuncioForm(false)
    setEditingAnuncioIndex(null)
    setAnuncioForm(initialAnuncioForm)
  }

  const derivadasMes = calcDerivadas(totalesMes)

  return (
    <>
      <div className="tabs-bar" style={{ marginBottom: 16 }}>
        <button type="button" className={`tab-btn ${vista === 'mensual' ? 'tab-btn-active' : ''}`} onClick={() => setVista('mensual')}>📅 Mensual</button>
        <button type="button" className={`tab-btn ${vista === 'anual' ? 'tab-btn-active' : ''}`} onClick={() => setVista('anual')}>📈 Resumen anual</button>
        <button type="button" className={`tab-btn ${vista === 'anuncios' ? 'tab-btn-active' : ''}`} onClick={() => setVista('anuncios')}>🎬 Por anuncio</button>
      </div>

      {vista === 'mensual' && (
        <>
          <div className="filters-grid" style={{ marginBottom: 16 }}>
            <select className="filter-select" value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)}>
              {MESES_ADS.map((mes) => <option key={mes} value={mes}>{mes}</option>)}
            </select>
          </div>

          <div className="table-card">
            <div className="card-header">
              <div>
                <div className="card-title">Resumen ads {mesSeleccionado.toLowerCase()} 2026</div>
                <div className="card-subtitle">Editar los valores de cada semana</div>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Métrica</th>
                    {SEMANAS.map((s) => <th key={s}>Semana {s}</th>)}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {BASE_METRICAS.map((metrica) => (
                    <tr key={metrica.key}>
                      <td style={{ fontWeight: 600 }}>{metrica.label}</td>
                      {SEMANAS.map((s) => {
                        const registro = getSemana(mesSeleccionado, s)
                        return (
                          <td key={s}>
                            <input
                              type="number"
                              min="0"
                              value={registro[metrica.key] || ''}
                              placeholder="0"
                              style={{ width: 70 }}
                              onChange={(e) => actualizarSemana(mesSeleccionado, s, metrica.key, e.target.value)}
                            />
                          </td>
                        )
                      })}
                      <td style={{ fontWeight: 600 }}>
                        {metrica.key === 'facturado' || metrica.key === 'cashCobrado' || metrica.key === 'inversion'
                          ? euro(totalesMes[metrica.key])
                          : (totalesMes[metrica.key] || 0)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontWeight: 600 }}>Pendiente por cobrar (€)</td>
                    {SEMANAS.map((s) => {
                      const d = calcDerivadas(getSemana(mesSeleccionado, s))
                      return <td key={s}>{euro(d.pendiente)}</td>
                    })}
                    <td style={{ fontWeight: 600 }}>{euro(derivadasMes.pendiente)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Coste por conversación (€)</td>
                    {SEMANAS.map((s) => {
                      const d = calcDerivadas(getSemana(mesSeleccionado, s))
                      return <td key={s}>{euro(d.costeConversacion)}</td>
                    })}
                    <td style={{ fontWeight: 600 }}>{euro(derivadasMes.costeConversacion)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Coste por agenda (€)</td>
                    {SEMANAS.map((s) => {
                      const d = calcDerivadas(getSemana(mesSeleccionado, s))
                      return <td key={s}>{euro(d.costeAgenda)}</td>
                    })}
                    <td style={{ fontWeight: 600 }}>{euro(derivadasMes.costeAgenda)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Coste por llamada realizada (€)</td>
                    {SEMANAS.map((s) => {
                      const d = calcDerivadas(getSemana(mesSeleccionado, s))
                      return <td key={s}>{euro(d.costeLlamada)}</td>
                    })}
                    <td style={{ fontWeight: 600 }}>{euro(derivadasMes.costeLlamada)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Coste por venta (€)</td>
                    {SEMANAS.map((s) => {
                      const d = calcDerivadas(getSemana(mesSeleccionado, s))
                      return <td key={s}>{euro(d.costeVenta)}</td>
                    })}
                    <td style={{ fontWeight: 600 }}>{euro(derivadasMes.costeVenta)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>ROAS facturado</td>
                    {SEMANAS.map((s) => {
                      const d = calcDerivadas(getSemana(mesSeleccionado, s))
                      return <td key={s}>{ratio(d.roasFacturado)}</td>
                    })}
                    <td style={{ fontWeight: 600 }}>{ratio(derivadasMes.roasFacturado)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>ROAS cash</td>
                    {SEMANAS.map((s) => {
                      const d = calcDerivadas(getSemana(mesSeleccionado, s))
                      return <td key={s}>{ratio(d.roasCash)}</td>
                    })}
                    <td style={{ fontWeight: 600 }}>{ratio(derivadasMes.roasCash)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Tasa conversación (%)</td>
                    {SEMANAS.map((s) => {
                      const d = calcDerivadas(getSemana(mesSeleccionado, s))
                      return <td key={s}>{pct(d.tasaConversacion)}</td>
                    })}
                    <td style={{ fontWeight: 600 }}>{pct(derivadasMes.tasaConversacion)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Tasa agenda (%)</td>
                    {SEMANAS.map((s) => {
                      const d = calcDerivadas(getSemana(mesSeleccionado, s))
                      return <td key={s}>{pct(d.tasaAgenda)}</td>
                    })}
                    <td style={{ fontWeight: 600 }}>{pct(derivadasMes.tasaAgenda)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Show rate (%)</td>
                    {SEMANAS.map((s) => {
                      const d = calcDerivadas(getSemana(mesSeleccionado, s))
                      return <td key={s}>{pct(d.showRate)}</td>
                    })}
                    <td style={{ fontWeight: 600 }}>{pct(derivadasMes.showRate)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Tasa cierre (%)</td>
                    {SEMANAS.map((s) => {
                      const d = calcDerivadas(getSemana(mesSeleccionado, s))
                      return <td key={s}>{pct(d.tasaCierre)}</td>
                    })}
                    <td style={{ fontWeight: 600 }}>{pct(derivadasMes.tasaCierre)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 20px 20px' }}>
              <label className="lead-detail-label">Notas / acciones para mejorar — {mesSeleccionado.toLowerCase()}</label>
              <textarea
                rows={3}
                placeholder="Ej: subir inversión en semana 3, revisar guion de llamada..."
                value={notaDelMes}
                onChange={(e) => actualizarNota(mesSeleccionado, e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {vista === 'anual' && (
        <div className="table-card">
          <div className="card-header">
            <div>
              <div className="card-title">Resumen anual ads 2026</div>
              <div className="card-subtitle">La Sala</div>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Facturado (€)</th>
                  <th>Cash cobrado (€)</th>
                  <th>Pendiente (€)</th>
                  <th>Ads (€)</th>
                  <th>Ventas</th>
                  <th>Canceladas</th>
                  <th>No show</th>
                  <th>ROAS fact.</th>
                  <th>ROAS cash</th>
                  <th>Coste venta (€)</th>
                  <th>Tasa cierre (%)</th>
                </tr>
              </thead>
              <tbody>
                {resumenAnual.map(({ mes, totales, derivadas }) => (
                  <tr key={mes}>
                    <td style={{ fontWeight: 600 }}>{mes}</td>
                    <td>{euro(totales.facturado)}</td>
                    <td>{euro(totales.cashCobrado)}</td>
                    <td>{euro(derivadas.pendiente)}</td>
                    <td>{euro(totales.inversion)}</td>
                    <td>{totales.ventas}</td>
                    <td>{totales.canceladas}</td>
                    <td>{totales.noShow}</td>
                    <td>{ratio(derivadas.roasFacturado)}</td>
                    <td>{ratio(derivadas.roasCash)}</td>
                    <td>{euro(derivadas.costeVenta)}</td>
                    <td>{pct(derivadas.tasaCierre)}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700 }}>
                  <td>TOTAL 2026</td>
                  <td>{euro(totalAnual.totales.facturado)}</td>
                  <td>{euro(totalAnual.totales.cashCobrado)}</td>
                  <td>{euro(totalAnual.derivadas.pendiente)}</td>
                  <td>{euro(totalAnual.totales.inversion)}</td>
                  <td>{totalAnual.totales.ventas}</td>
                  <td>{totalAnual.totales.canceladas}</td>
                  <td>{totalAnual.totales.noShow}</td>
                  <td>{ratio(totalAnual.derivadas.roasFacturado)}</td>
                  <td>{ratio(totalAnual.derivadas.roasCash)}</td>
                  <td>{euro(totalAnual.derivadas.costeVenta)}</td>
                  <td>{pct(totalAnual.derivadas.tasaCierre)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            <label className="lead-detail-label">Lectura rápida</label>
            <ul className="lead-log-list">
              <li><strong>Facturado</strong> — valor total vendido, aunque el cliente pague fraccionado.</li>
              <li><strong>Cash cobrado</strong> — dinero real que ha entrado en cuenta.</li>
              <li><strong>ROAS facturado</strong> — mide rendimiento comercial de la campaña.</li>
              <li><strong>ROAS cash</strong> — mide recuperación real de caja.</li>
              <li><strong>Coste por venta</strong> — cuánto cuesta cerrar un cliente desde ads.</li>
            </ul>
          </div>
        </div>
      )}

      {vista === 'anuncios' && (
        <div className="table-card">
          <div className="card-header">
            <div>
              <div className="card-title">Ventas por anuncio</div>
              <div className="card-subtitle">{anuncios.length} anuncios registrados</div>
            </div>
            <button type="button" className="add-client-btn" onClick={openNewAnuncio}>＋ Añadir anuncio</button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Vídeo anuncio</th>
                  <th>Llamadas realizadas</th>
                  <th>Ventas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {anuncios.map((a, index) => (
                  <tr key={`${a.nombre}-${index}`}>
                    <td style={{ fontWeight: 600 }}>{a.nombre || '—'}</td>
                    <td>
                      {a.video ? <a href={a.video} target="_blank" rel="noopener noreferrer">Ver vídeo</a> : '—'}
                    </td>
                    <td>{a.llamadas}</td>
                    <td>{a.ventas}</td>
                    <td>
                      <button type="button" className="row-action-btn" onClick={() => openEditAnuncio(index)}>Editar</button>
                      <button type="button" className="row-action-btn" onClick={() => eliminarAnuncio(index)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
                {anuncios.length === 0 && (
                  <tr><td colSpan={5} className="lead-log-empty">Sin anuncios registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAnuncioForm && (
        <div className="client-modal-overlay" onClick={() => setShowAnuncioForm(false)}>
          <div className="client-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{editingAnuncioIndex === null ? 'Añadir anuncio' : 'Editar anuncio'}</div>
                <div className="card-subtitle">Rendimiento por anuncio/vídeo</div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowAnuncioForm(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmitAnuncio}>
              <input required placeholder="Nombre del anuncio" value={anuncioForm.nombre}
                onChange={(e) => setAnuncioForm({ ...anuncioForm, nombre: e.target.value })} />
              <input type="url" placeholder="Enlace al vídeo del anuncio" value={anuncioForm.video}
                onChange={(e) => setAnuncioForm({ ...anuncioForm, video: e.target.value })} />
              <div className="lead-detail-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label className="lead-detail-label">Llamadas realizadas</label>
                  <input type="number" min="0" value={anuncioForm.llamadas}
                    onChange={(e) => setAnuncioForm({ ...anuncioForm, llamadas: e.target.value })} />
                </div>
                <div>
                  <label className="lead-detail-label">Ventas</label>
                  <input type="number" min="0" value={anuncioForm.ventas}
                    onChange={(e) => setAnuncioForm({ ...anuncioForm, ventas: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowAnuncioForm(false)}>Cancelar</button>
                <button type="submit" className="primary-action">Guardar anuncio</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
