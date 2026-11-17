import { useEffect, useMemo, useState } from 'react'
import { COLOR_TRAMO, LEADMAGNETS, leadmagnetPorSlug, puntuacionMaxima } from '../data/leadmagnets'
import { deleteLeadmagnetLead, fetchLeadmagnetLeads, updateLeadmagnetLead } from '../lib/queries/leadmagnets'
import { enlaceWhatsApp } from '../utils/protocoloLlamada'
import { esDemo } from '../lib/demoGuard'

// Ventas → 🧲 Leadmagnets: quién ha dejado sus datos en una página de
// leadmagnet (migración 80). Son leads FRÍOS: no están en el Pipeline hasta
// que agendan, para no descuadrar el embudo (que empieza en «Agendada»).
//
// Esta pestaña se carga sus propios datos al abrirse (no pasan por App.jsx):
// solo se usan aquí. Por eso el modo demo se aplica aquí mismo, a mano.
//
// «Ya en Pipeline» se calcula cruzando teléfono (9 últimos dígitos) o email
// con `ventas`: así sale tanto si lo pasa la closer con el botón como si la
// persona reserva sola por el calendario de GHL.

const ultimos9 = (t) => String(t || '').replace(/\D/g, '').slice(-9)

const ETIQUETA_RESULTADO = { verde: 'Verde', amarillo: 'Amarillo', rojo: 'Rojo' }

function textoRespuesta(lm, clave, valor) {
  if (clave === 'variante' && lm?.preguntaVariante) {
    return lm.preguntaVariante.opciones.find(([v]) => v === valor)?.[1] || valor
  }
  const p = (lm?.preguntas || []).find((x) => x.id === clave)
  if (!p) return String(valor)
  return p.opciones.find(([, v]) => v === valor)?.[0] ?? String(valor)
}

function etiquetaPregunta(lm, clave) {
  if (clave === 'zona') return 'Zona'
  if (clave === 'lado') return 'Hombro'
  if (clave === 'variante') return 'Cómo está'
  return (lm?.preguntas || []).find((x) => x.id === clave)?.texto || clave
}

function fechaHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function LeadsLeadmagnet({ ventas = [], onPasarAPipeline }) {
  const [leads, setLeads] = useState(null)
  const [filtroLm, setFiltroLm] = useState('')
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [abierto, setAbierto] = useState(null)
  const [copiado, setCopiado] = useState('')

  useEffect(() => {
    let vivo = true
    fetchLeadmagnetLeads().then((data) => { if (vivo) setLeads(data) })
    return () => { vivo = false }
  }, [])

  const demo = esDemo()
  const visibles = useMemo(() => (leads || []).map((l, i) => (demo
    ? { ...l, nombre: `Lead ${i + 1}`, email: l.email ? 'lead@ejemplo.com' : '', telefono: l.telefono ? '600000000' : '' }
    : l)), [leads, demo])

  // Índices de ventas por teléfono y email para el «Ya en Pipeline».
  const enPipeline = useMemo(() => {
    const tels = new Set(ventas.map((v) => ultimos9(v.telefono)).filter((t) => t.length === 9))
    const emails = new Set(ventas.map((v) => (v.email || '').toLowerCase()).filter(Boolean))
    return (l) => (ultimos9(l.telefono).length === 9 && tels.has(ultimos9(l.telefono)))
      || (l.email && emails.has(l.email.toLowerCase()))
  }, [ventas])

  const filtrados = visibles.filter((l) => (!filtroLm || l.leadmagnet === filtroLm)
    && (!soloPendientes || (!l.contactado && !enPipeline(l))))

  const cuenta = (slug) => visibles.filter((l) => l.leadmagnet === slug).length
  const pendientes = visibles.filter((l) => !l.contactado && !enPipeline(l)).length

  const cambiar = (id, patch) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    updateLeadmagnetLead(id, patch)
  }

  const borrar = (l) => {
    if (!window.confirm(`¿Borrar el contacto de ${l.nombre || 'esta persona'}?`)) return
    setLeads((prev) => prev.filter((x) => x.id !== l.id))
    deleteLeadmagnetLead(l.id)
  }

  const copiar = async (lm) => {
    const url = `${window.location.origin}${lm.ruta}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(lm.slug)
      setTimeout(() => setCopiado(''), 1500)
    } catch (e) {
      window.prompt('Copia el enlace:', url)
    }
  }

  const mensajeWhatsapp = (l) => {
    const lm = leadmagnetPorSlug(l.leadmagnet)
    const nombre = (l.nombre || '').split(' ')[0]
    return `Hola ${nombre}, soy de MG Readaptación Física. He visto que has hecho nuestro «${lm?.titulo || 'recurso'}». ¿Qué tal? Si quieres, te cuento qué haría yo en tu caso.`
  }

  return (
    <>
      <div className="kpi-grid">
        {LEADMAGNETS.map((lm) => (
          <div key={lm.slug} className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">{lm.titulo}</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>🧲</div>
            </div>
            <div className="kpi-card-value">{cuenta(lm.slug)}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <button type="button" className="secondary-action" onClick={() => copiar(lm)}>
                {copiado === lm.slug ? '✓ Copiado' : '📋 Copiar enlace'}
              </button>
              <a className="secondary-action" href={lm.ruta} target="_blank" rel="noopener noreferrer">Abrir ↗</a>
            </div>
          </div>
        ))}
      </div>

      <div className="table-card">
        <div className="card-header">
          <div>
            <div className="card-title">Contactos de leadmagnets</div>
            <div className="card-subtitle">
              {visibles.length} en total · {pendientes} sin contactar ni en Pipeline. Pasa al Pipeline a quien agende llamada.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={filtroLm} onChange={(e) => setFiltroLm(e.target.value)}>
              <option value="">Todos los leadmagnets</option>
              {LEADMAGNETS.map((lm) => <option key={lm.slug} value={lm.slug}>{lm.titulo}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />
              Solo pendientes
            </label>
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nombre</th>
                <th>Leadmagnet</th>
                <th>Resultado</th>
                <th>Contactado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {leads === null && (
                <tr><td colSpan={6} className="lead-log-empty">Cargando…</td></tr>
              )}
              {leads !== null && filtrados.length === 0 && (
                <tr><td colSpan={6} className="lead-log-empty">Todavía no hay contactos. Comparte los enlaces de arriba en tus Reels e historias.</td></tr>
              )}
              {filtrados.map((l) => {
                const lm = leadmagnetPorSlug(l.leadmagnet)
                const yaEnPipeline = enPipeline(l)
                const color = COLOR_TRAMO[l.resultado]
                return [
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fechaHora(l.creadoEn)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{l.nombre || 'Sin nombre'}</div>
                      <div className="card-subtitle">{[l.telefono, l.email].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td>{lm?.titulo || l.leadmagnet}</td>
                    <td>
                      {color ? (
                        <span className="status-pill" style={{ background: `${color}1f`, color }}>
                          {ETIQUETA_RESULTADO[l.resultado]}{l.puntuacion != null && lm ? ` · ${l.puntuacion}/${puntuacionMaxima(lm)}` : ''}
                        </span>
                      ) : (l.resultado ? textoRespuesta(lm, 'variante', l.resultado) : '—')}
                    </td>
                    <td>
                      <input type="checkbox" checked={l.contactado} onChange={(e) => cambiar(l.id, { contactado: e.target.checked })} />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {l.telefono && (
                        <a className="row-action-btn" href={enlaceWhatsApp(l.telefono, mensajeWhatsapp(l))} target="_blank" rel="noopener noreferrer"
                          onClick={() => { if (!l.contactado) cambiar(l.id, { contactado: true }) }}>
                          💬 WhatsApp
                        </a>
                      )}
                      {yaEnPipeline ? (
                        <span className="status-pill status-activo" style={{ marginLeft: 6 }}>✅ Ya en Pipeline</span>
                      ) : (
                        <button type="button" className="row-action-btn" onClick={() => onPasarAPipeline?.(l)}>📞 Pasar a Pipeline</button>
                      )}
                      <button type="button" className="row-action-btn" onClick={() => setAbierto(abierto === l.id ? null : l.id)}>
                        {abierto === l.id ? 'Ocultar' : 'Respuestas'}
                      </button>
                      <button type="button" className="row-action-btn" onClick={() => borrar(l)}>Borrar</button>
                    </td>
                  </tr>,
                  abierto === l.id && (
                    <tr key={`${l.id}-detalle`}>
                      <td colSpan={6}>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                          {Object.entries(l.respuestas || {}).map(([k, v]) => (
                            <li key={k}><strong>{etiquetaPregunta(lm, k)}</strong>: {textoRespuesta(lm, k, v)}</li>
                          ))}
                          {l.atribucion && (
                            <li><strong>Origen</strong>: {Object.entries(l.atribucion).map(([k, v]) => `${k}=${v}`).join(' · ')}</li>
                          )}
                        </ul>
                        <textarea
                          rows={2}
                          style={{ marginTop: 8 }}
                          placeholder="Notas (qué le has dicho, cuándo volver a escribir…)"
                          defaultValue={l.notas}
                          onBlur={(e) => { if (e.target.value !== l.notas) cambiar(l.id, { notas: e.target.value }) }}
                        />
                      </td>
                    </tr>
                  ),
                ]
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
