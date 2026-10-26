import { useMemo, useState } from 'react'
import { harbizSinEmparejar, sugerenciaPorNombre } from '../utils/sesionesHarbiz'

// Clientes de Harbiz con entrenos recientes que no casan con ninguna ficha
// (ni por email ni emparejados a mano). Mientras no se emparejen, sus
// entrenos no llegan a ⚡ Registro de sesiones. Se empareja una vez y ya.
//
// "No es del panel" (cuentas de prueba, clientes que no llevamos aquí) se
// recuerda solo en este navegador: es una comodidad para que no moleste,
// no un dato que tenga que compartir el equipo.
const CLAVE_IGNORADOS = 'mg-harbiz-ignorados'

function leerIgnorados() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE_IGNORADOS) || '[]'))
  } catch (_) {
    return new Set()
  }
}

export default function HarbizSinEmparejar({ sesiones, clientes, onEmparejar }) {
  const [ignorados, setIgnorados] = useState(leerIgnorados)
  const pendientes = useMemo(
    () => harbizSinEmparejar(sesiones, clientes).filter((h) => !ignorados.has(h.harbizClienteId)),
    [sesiones, clientes, ignorados]
  )
  // Solo se ofrecen fichas sin emparejar: las ya emparejadas no pueden ser.
  const opciones = useMemo(
    () => (clientes || []).filter((c) => !c['Harbiz ID']).sort((a, b) => a.Nombre.localeCompare(b.Nombre)),
    [clientes]
  )
  if (pendientes.length === 0) return null

  const ignorar = (id) => {
    const nuevo = new Set(ignorados)
    nuevo.add(id)
    setIgnorados(nuevo)
    try { localStorage.setItem(CLAVE_IGNORADOS, JSON.stringify([...nuevo])) } catch (_) { /* noop */ }
  }

  return (
    <div className="cq-huerfanos">
      <strong>🔗 {pendientes.length} cliente{pendientes.length === 1 ? '' : 's'} de Harbiz sin emparejar</strong>
      <p>
        Han entrenado en Harbiz pero su email no coincide con ninguna ficha, así que sus sesiones no llegan a
        ⚡ Registro de sesiones. Emparéjalos una vez y a partir de ahí entran solos.
      </p>
      {pendientes.map((h) => {
        const sugerido = sugerenciaPorNombre(h.nombre, clientes)
        return (
          <div key={h.harbizClienteId} className="cq-huerfano">
            <span className="cq-huerfano-nombre">
              {h.nombre || '(sin nombre)'}
              {h.email && <em> · {h.email}</em>}
              <em> · {h.sesiones} entreno{h.sesiones === 1 ? '' : 's'}</em>
            </span>
            {sugerido && (
              <button type="button" className="secondary-action" onClick={() => onEmparejar(sugerido, h.harbizClienteId)}>
                ✓ Es {sugerido.Nombre}
              </button>
            )}
            <select
              defaultValue=""
              onChange={(e) => {
                const cliente = opciones.find((c) => c.id === e.target.value)
                if (cliente) onEmparejar(cliente, h.harbizClienteId)
              }}
            >
              <option value="">Emparejar con…</option>
              {opciones.map((c) => (
                <option key={c.id} value={c.id}>{c.Nombre}</option>
              ))}
            </select>
            <button type="button" className="secondary-action" onClick={() => ignorar(h.harbizClienteId)} title="Ocultar en este navegador">
              No es del panel
            </button>
          </div>
        )
      })}
    </div>
  )
}
