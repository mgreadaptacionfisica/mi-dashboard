import { useState } from 'react'
import {
  crearProblema,
  anadirAccion,
  quitarAccion,
  resolverProblema,
  reabrirProblema,
  problemasDeCliente,
  diasAbierto,
  diasSinAccion,
  textoOrigen,
  DIAS_SIN_ACCION_AVISO,
} from '../utils/problemasCliente'
import { upsertProblemaClienteRemote, deleteProblemaClienteRemote } from '../lib/queries/problemasCliente'
import { formatFechaISO } from '../utils/fechasEsp'

// "Problemas y soluciones" de un cliente: qué le ha pasado y qué hemos hecho
// por ello. Es el sitio donde vive la cadena entera de cada problema
// (detectado → cambios que hemos probado → cómo acabó), fuera de la semana,
// porque un problema dura lo que dura.
//
// Se pinta dentro del modal de Seguimiento (pestaña 🚨). El alta habitual NO
// es aquí: lo normal es abrir el problema desde el 💬 de una sesión, en la
// rejilla de ⚡ Registro de sesiones, que es donde el entrenador está cuando
// lo ve. El formulario de aquí es para lo que no sale entrenando (lo contó
// por WhatsApp, lo detecta Raúl repasando).
export default function ProblemasCliente({ clienteNombre, problemas = [], setProblemas, miIdentidad = '', soloLectura = false }) {
  const [nuevoTexto, setNuevoTexto] = useState('')
  const [accionDraft, setAccionDraft] = useState({})
  // Problema que está enseñando el cuadro de "cómo ha acabado" antes de
  // cerrarse: se pide el resultado a propósito, porque un problema resuelto
  // sin decir cómo no sirve para la próxima vez.
  const [resolviendo, setResolviendo] = useState(null)
  const [resultadoDraft, setResultadoDraft] = useState('')
  const [verResueltos, setVerResueltos] = useState(false)

  const { abiertos, resueltos } = problemasDeCliente(problemas, clienteNombre)

  // Guardado: estado local al momento + upsert por id. Mismo patrón que el
  // resto del panel (optimista; si Supabase falla, avisaErrorGuardado canta).
  const guardar = (problema) => {
    if (typeof setProblemas !== 'function') return
    setProblemas((prev) => {
      const existe = prev.some((p) => p.id === problema.id)
      return existe ? prev.map((p) => (p.id === problema.id ? problema : p)) : [...prev, problema]
    })
    upsertProblemaClienteRemote(problema)
  }

  const borrar = (id) => {
    if (typeof setProblemas !== 'function') return
    setProblemas((prev) => prev.filter((p) => p.id !== id))
    deleteProblemaClienteRemote(id)
  }

  const apuntarProblema = (e) => {
    e.preventDefault()
    const texto = nuevoTexto.trim()
    if (!texto) return
    guardar(crearProblema({ clienteNombre, problema: texto, por: miIdentidad, origen: 'manual' }))
    setNuevoTexto('')
  }

  const apuntarAccion = (problema) => {
    const texto = (accionDraft[problema.id] || '').trim()
    if (!texto) return
    guardar(anadirAccion(problema, { texto, por: miIdentidad }))
    setAccionDraft((prev) => ({ ...prev, [problema.id]: '' }))
  }

  const confirmarResolucion = (problema) => {
    guardar(resolverProblema(problema, { resultado: resultadoDraft, por: miIdentidad }))
    setResolviendo(null)
    setResultadoDraft('')
  }

  const pintarProblema = (p, cerrado = false) => {
    const dias = diasAbierto(p)
    const sinAccion = diasSinAccion(p)
    const acciones = p.acciones || []
    const alarma = !cerrado && acciones.length === 0 && sinAccion >= DIAS_SIN_ACCION_AVISO
    return (
      <div key={p.id} className={`problema-card${cerrado ? ' problema-card-resuelto' : ''}${alarma ? ' problema-card-alarma' : ''}`}>
        <div className="problema-card-head">
          <span className="problema-texto">{cerrado ? '✅' : '🚨'} {p.problema}</span>
          {!soloLectura && (
            <button type="button" className="problema-btn-borrar" onClick={() => borrar(p.id)} title="Borrar este problema (solo si se apuntó por error)">✕</button>
          )}
        </div>

        <div className="problema-meta">
          <span>Detectado el {formatFechaISO(p.detectadoEn)}</span>
          {!cerrado && <span className={alarma ? 'problema-meta-alarma' : ''}>· {dias === 0 ? 'hoy' : `abierto ${dias} día${dias === 1 ? '' : 's'}`}</span>}
          {cerrado && p.resueltoEn && <span>· resuelto el {formatFechaISO(p.resueltoEn)} ({dias} día{dias === 1 ? '' : 's'})</span>}
          {p.detectadoPor && <span>· {p.detectadoPor}</span>}
          <span>· {textoOrigen(p)}</span>
        </div>

        {alarma && (
          <div className="problema-alarma-aviso">
            ⚠️ Lleva {sinAccion} días sin que se haya hecho nada por él. Apunta abajo qué has cambiado.
          </div>
        )}

        <ol className="problema-acciones">
          {acciones.length === 0 && !cerrado && (
            <li className="lead-log-empty">Todavía no se ha apuntado ningún cambio para resolverlo.</li>
          )}
          {acciones.map((a, i) => (
            <li key={i}>
              <span className="problema-accion-fecha">{formatFechaISO(a.fecha)}</span>
              <span className="problema-accion-texto">{a.texto}</span>
              {a.por && <span className="problema-accion-por">{a.por}</span>}
              {!soloLectura && !cerrado && (
                <button type="button" className="problema-btn-borrar" onClick={() => guardar(quitarAccion(p, i))} title="Quitar este cambio">✕</button>
              )}
            </li>
          ))}
        </ol>

        {cerrado && p.resultado && (
          <p className="problema-resultado">🏁 Cómo acabó: {p.resultado}</p>
        )}

        {!soloLectura && !cerrado && (
          <>
            <div className="problema-add-accion">
              <input
                type="text"
                placeholder="¿Qué hemos hecho para solucionarlo?"
                value={accionDraft[p.id] || ''}
                onChange={(e) => setAccionDraft((prev) => ({ ...prev, [p.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apuntarAccion(p) } }}
              />
              <button type="button" className="secondary-action" onClick={() => apuntarAccion(p)}>＋ Cambio</button>
            </div>

            {resolviendo === p.id ? (
              <div className="problema-resolver-form">
                <label className="lead-detail-label" htmlFor={`res-${p.id}`}>¿Cómo ha acabado?</label>
                <textarea
                  id={`res-${p.id}`}
                  rows={2}
                  autoFocus
                  placeholder="Ya no le molesta, ha vuelto al ejercicio normal, se queda con la variante…"
                  value={resultadoDraft}
                  onChange={(e) => setResultadoDraft(e.target.value)}
                />
                <div className="problema-resolver-btns">
                  <button type="button" className="primary-action" onClick={() => confirmarResolucion(p)}>✅ Marcar resuelto</button>
                  <button type="button" className="secondary-action" onClick={() => { setResolviendo(null); setResultadoDraft('') }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="secondary-action problema-btn-resolver"
                onClick={() => { setResolviendo(p.id); setResultadoDraft('') }}
              >
                ✅ Resolver
              </button>
            )}
          </>
        )}

        {!soloLectura && cerrado && (
          <button type="button" className="secondary-action problema-btn-resolver" onClick={() => guardar(reabrirProblema(p))}>
            ↩️ Ha vuelto — reabrir
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="problemas-cliente">
      <div className="problemas-intro">
        🚨 <strong>Problemas y soluciones.</strong> Lo que le pasa al cliente y qué hemos hecho por ello.
        A diferencia de las notas de la semana, esto <strong>no desaparece el lunes</strong>: un problema sigue
        abierto hasta que se resuelve. Lo normal es abrirlo desde el 💬 de la sesión donde aparece.
      </div>

      {!soloLectura && (
        <form className="problema-add" onSubmit={apuntarProblema}>
          <input
            type="text"
            placeholder="Apuntar un problema nuevo (molestia, no puede hacer un ejercicio, no descansa…)"
            value={nuevoTexto}
            onChange={(e) => setNuevoTexto(e.target.value)}
          />
          <button type="submit" className="secondary-action">＋ Problema</button>
        </form>
      )}

      <div className="problemas-bloque">
        <span className="resumen-semana-etq">Abiertos ({abiertos.length})</span>
        {abiertos.length === 0
          ? <p className="lead-log-empty">Ningún problema abierto. 👌</p>
          : abiertos.map((p) => pintarProblema(p, false))}
      </div>

      {resueltos.length > 0 && (
        <div className="problemas-bloque">
          <button type="button" className="problemas-toggle-resueltos" onClick={() => setVerResueltos((v) => !v)}>
            {verResueltos ? '▾' : '▸'} Resueltos ({resueltos.length})
          </button>
          {verResueltos && resueltos.map((p) => pintarProblema(p, true))}
        </div>
      )}
    </div>
  )
}
