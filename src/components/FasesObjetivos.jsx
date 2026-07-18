import { useState } from 'react'
import { FASES, faseInfo, faseAutomatica, objetivosDeFase } from '../utils/valoracionHelpers'
import {
  insertObjetivoClienteFaseRemote,
  updateObjetivoClienteFaseRemote,
  deleteObjetivoClienteFaseRemote,
} from '../lib/queries/objetivosClienteFase'

// Sección separada de Valoración (a petición de Raúl): cada cliente tiene
// su propia lista de objetivos, agrupados por fase (1-4), en vez de un
// catálogo compartido o un único texto libre por valoración. Se ven las 4
// fases a la vez porque en la práctica se puede ir trabajando ya en
// objetivos de una fase posterior aunque la anterior no esté cerrada del
// todo — lo que hace que la fase "oficial" avance sola es que TODOS los
// objetivos de una fase estén marcados como cumplidos (ver faseAutomatica
// en valoracionHelpers.js).
export default function FasesObjetivos({ cliente, objetivosClienteFase = [], setObjetivosClienteFase, onClose }) {
  const [nuevoTexto, setNuevoTexto] = useState({})

  const objetivosDelCliente = objetivosClienteFase.filter((o) => o.clienteNombre === cliente.Nombre)
  const faseConfirmada = faseAutomatica(objetivosDelCliente)
  const faseConfirmadaInfo = faseInfo(faseConfirmada)

  const addObjetivo = (faseNumero) => {
    const texto = (nuevoTexto[faseNumero] || '').trim()
    if (!texto || typeof setObjetivosClienteFase !== 'function') return
    const ordenActual = objetivosDeFase(objetivosDelCliente, faseNumero).length
    const nuevo = {
      id: `objc-${Date.now()}`,
      clienteNombre: cliente.Nombre,
      fase: faseNumero,
      texto,
      cumplido: false,
      cumplidoEn: null,
      orden: ordenActual + 1,
      creadoEn: new Date().toISOString(),
    }
    setObjetivosClienteFase((prev) => [...prev, nuevo])
    insertObjetivoClienteFaseRemote(nuevo)
    setNuevoTexto((prev) => ({ ...prev, [faseNumero]: '' }))
  }

  const toggleCumplido = (objetivo) => {
    if (typeof setObjetivosClienteFase !== 'function') return
    const cumplido = !objetivo.cumplido
    const cumplidoEn = cumplido ? new Date().toISOString().slice(0, 10) : null
    setObjetivosClienteFase((prev) => prev.map((o) => (o.id === objetivo.id ? { ...o, cumplido, cumplidoEn } : o)))
    updateObjetivoClienteFaseRemote(objetivo.id, { cumplido, cumplidoEn })
  }

  const eliminarObjetivo = (id) => {
    if (typeof setObjetivosClienteFase !== 'function') return
    setObjetivosClienteFase((prev) => prev.filter((o) => o.id !== id))
    deleteObjetivoClienteFaseRemote(id)
  }

  return (
    <div className="client-modal-overlay" onClick={onClose}>
      <div className="client-modal seguimiento-modal fases-objetivos-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div>
            <div className="card-title">Fases y objetivos — {cliente.Nombre}</div>
            <div className="card-subtitle">Objetivos propios de este cliente; la fase confirmada avanza sola al completarlos</div>
          </div>
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        {faseConfirmada ? (
          <div className="valoracion-fase-banner">
            📍 <strong>Fase confirmada: {faseConfirmada}</strong> — {faseConfirmadaInfo?.criterio}
          </div>
        ) : (
          <div className="valoracion-fase-banner" style={{ color: 'var(--color-text-secondary)' }}>
            Sin fase confirmada todavía — añade objetivos a la Fase 1 y márcalos como cumplidos para empezar.
          </div>
        )}

        <div className="fases-objetivos-grid">
          {FASES.map((f) => {
            const items = objetivosDeFase(objetivosDelCliente, f.numero)
            const completa = items.length > 0 && items.every((o) => o.cumplido)
            return (
              <div key={f.numero} className={`fases-objetivos-columna${completa ? ' fases-objetivos-columna-completa' : ''}`}>
                <div className="fases-objetivos-columna-header">
                  <strong>{f.titulo}</strong>
                  {completa && <span className="status-pill status-activo">Completa</span>}
                </div>
                <p className="valoracion-referencia">{f.criterio}</p>
                <ul className="fases-objetivos-lista">
                  {items.length === 0 && <li className="lead-log-empty">Sin objetivos todavía.</li>}
                  {items.map((o) => (
                    <li key={o.id} className={o.cumplido ? 'fases-objetivo-cumplido' : ''}>
                      <label>
                        <input type="checkbox" checked={o.cumplido} onChange={() => toggleCumplido(o)} />
                        <span>{o.texto}</span>
                      </label>
                      <button type="button" className="row-action-btn" onClick={() => eliminarObjetivo(o.id)}>✕</button>
                    </li>
                  ))}
                </ul>
                <div className="fases-objetivos-add">
                  <input
                    type="text"
                    placeholder={`Nuevo objetivo para ${f.titulo}...`}
                    value={nuevoTexto[f.numero] || ''}
                    onChange={(e) => setNuevoTexto((prev) => ({ ...prev, [f.numero]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addObjetivo(f.numero)
                      }
                    }}
                  />
                  <button type="button" className="row-action-btn" onClick={() => addObjetivo(f.numero)}>Añadir</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
