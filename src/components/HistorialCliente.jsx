import { useMemo, useState } from 'react'
import { historialCliente } from '../utils/seguimientoHelpers'

// Historial del cliente (vista 📜 del modal de Seguimiento): todo lo apuntado
// semana a semana y con fecha — notas de sesión, cambios, contacto y
// comentario semanal — con un buscador para encontrar cuándo pasó algo
// ("dolor", "press", "hombro"…). Solo lectura; los datos son los de siempre
// (ver historialCliente() en utils/seguimientoHelpers.js).

const ICONO = { nota: '💬', cambio: '🔧', contacto: '🤝', comentario: '📝' }

// Sin tildes ni mayúsculas, para que "dolor" encuentre "Dolor" y "rotacion"
// encuentre "rotación".
const normalizar = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function HistorialCliente({ clienteNombre, seguimientos, contactos, revisionesSemanales, onIrSemana }) {
  const [busqueda, setBusqueda] = useState('')

  const semanas = useMemo(
    () => historialCliente({ clienteNombre, seguimientos, contactos, revisionesSemanales }),
    [clienteNombre, seguimientos, contactos, revisionesSemanales]
  )

  const q = normalizar(busqueda.trim())
  const visibles = q
    ? semanas
      .map((s) => ({ ...s, entradas: s.entradas.filter((e) => normalizar(`${e.titulo} ${e.texto}`).includes(q)) }))
      .filter((s) => s.entradas.length > 0)
    : semanas
  const totalCoincidencias = visibles.reduce((n, s) => n + s.entradas.length, 0)

  return (
    <div className="historial-cliente">
      <div className="historial-cliente-busqueda">
        <input
          type="search"
          placeholder="Buscar en el historial: dolor, un ejercicio, un cambio…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {q && <span className="nota">{totalCoincidencias} resultado{totalCoincidencias === 1 ? '' : 's'}</span>}
      </div>

      {semanas.length === 0 && (
        <p className="lead-log-empty">Todavía no hay nada apuntado: aquí irán apareciendo las notas de sesión, los cambios, el contacto y los comentarios semanales.</p>
      )}
      {semanas.length > 0 && visibles.length === 0 && (
        <p className="lead-log-empty">Nada coincide con «{busqueda}».</p>
      )}

      {visibles.map((s) => (
        <div key={s.semana} className="historial-semana">
          <div className="historial-semana-cabecera">
            <button type="button" className="tabla-link-btn" onClick={() => onIrSemana?.(s.semana)} title="Ir a esta semana">
              Semana del {s.rango}
            </button>
            <span className={`status-pill ${s.cerrada ? 'status-activo' : 'status-pendiente'}`}>
              {s.cerrada ? `✅ Cerrada${s.cerradaPor ? ` · ${s.cerradaPor}` : ''}` : '⏳ Sin cerrar'}
            </span>
          </div>
          <ul className="historial-entradas">
            {s.entradas.map((e, i) => (
              <li key={i} className={`historial-entrada historial-entrada-${e.tipo}`}>
                <span className="historial-entrada-fecha">{e.fecha}</span>
                <span>
                  {ICONO[e.tipo]} <strong>{e.titulo}{e.tipo === 'cambio' ? (e.hecho ? ' ✅' : ' ⬜') : ''}:</strong> {e.texto}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
