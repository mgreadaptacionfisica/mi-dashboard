import { useMemo, useState } from 'react'
import { mondayOf, toISO, formatRangoSemana, resumenSemanaCliente, motivosNoCierre } from '../utils/seguimientoHelpers'
import ResumenSemanaCliente from './ResumenSemanaCliente'

// Pestaña "📝 Resúmenes" de Seguimiento y Valoración (solo admin): el resumen
// semanal de cada cliente, uno detrás de otro, para que Raúl lea de un tirón
// cómo ha ido la semana de todo el equipo: notas de sesión, cambios, contacto
// y el comentario de cada trabajador. No escribe nada; el nombre del cliente
// abre su seguimiento en esa semana por si hay que tocar algo.
//
// Por defecto enseña la semana PASADA: el resumen tiene sentido cuando la
// semana ya se ha cerrado, y lo normal es leerlo el lunes. Recibe
// `clientes` ya filtrados (respeta el filtro por trabajador de arriba).

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'comentario', label: 'Con comentario' },
  { id: 'abiertas', label: 'Sin cerrar' },
]

export default function ResumenesSemanales({ clientes = [], seguimientos = [], contactos = [], revisionesSemanales = [], trabajadoresDe, onAbrirSeguimiento }) {
  const [offset, setOffset] = useState(-1)
  const [filtro, setFiltro] = useState('todos')

  // Misma clave de semana que el resto de la sección (mondayOf + toISO), para
  // que cuadre con lo guardado.
  const semana = useMemo(() => {
    const base = mondayOf(new Date())
    base.setDate(base.getDate() + offset * 7)
    return toISO(base)
  }, [offset])

  const filas = useMemo(() => clientes.map((cliente) => {
    const seguimiento = seguimientos.find((s) => s.clienteNombre === cliente.Nombre && s.semana === semana)
    const contacto = contactos.find((c) => c.clienteNombre === cliente.Nombre && c.semana === semana)
    const cerrada = revisionesSemanales.find((r) => r.clienteNombre === cliente.Nombre && r.semana === semana && r.revisado)
    return {
      cliente,
      resumen: resumenSemanaCliente({ seguimiento, contacto }),
      faltan: motivosNoCierre({ seguimiento, contacto }).length,
      cerrada,
    }
  })
    // Primero los que tienen algo que leer; dentro, por nombre.
    .sort((a, b) => Number(b.resumen.tieneContenido) - Number(a.resumen.tieneContenido)
      || (a.cliente.Nombre || '').localeCompare(b.cliente.Nombre || '', 'es')),
  [clientes, seguimientos, contactos, revisionesSemanales, semana])

  const visibles = filas.filter((f) => {
    if (filtro === 'comentario') return Boolean(f.resumen.comentario)
    if (filtro === 'abiertas') return !f.cerrada
    return true
  })
  const cerradas = filas.filter((f) => f.cerrada).length
  const conComentario = filas.filter((f) => f.resumen.comentario).length

  return (
    <div className="table-card">
      <div className="card-header">
        <div>
          <div className="card-title">📝 Resúmenes de la semana</div>
          <div className="card-subtitle">
            Lo que ha pasado con cada cliente: notas de las sesiones, cambios, contacto y el comentario del trabajador.
          </div>
        </div>
      </div>

      <div className="resumenes-barra">
        <div className="seguimiento-week-nav" style={{ margin: 0 }}>
          <button type="button" className="secondary-action" onClick={() => setOffset((o) => o - 1)}>← Anterior</button>
          <strong>
            Semana del {formatRangoSemana(semana)}
            {offset === 0 ? ' (actual)' : offset === -1 ? ' (pasada)' : ''}
          </strong>
          <button type="button" className="secondary-action" onClick={() => setOffset((o) => o + 1)} disabled={offset >= 0}>Siguiente →</button>
        </div>
        <div className="seguimiento-filtro-chips">
          {FILTROS.map((f) => (
            <button key={f.id} type="button" className={`period-btn ${filtro === f.id ? 'active' : ''}`} onClick={() => setFiltro(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="resumenes-totales">
          ✅ {cerradas}/{filas.length} cerradas · 📝 {conComentario}/{filas.length} con comentario
        </span>
      </div>

      {visibles.length === 0 ? (
        <p className="lead-log-empty" style={{ padding: 20 }}>No hay clientes con ese filtro en esta semana.</p>
      ) : (
        <div className="resumenes-lista">
          {visibles.map(({ cliente, resumen, cerrada, faltan }) => (
            <div key={cliente.id || cliente.Nombre} className={`resumenes-item ${cerrada ? '' : 'resumenes-item-abierta'}`}>
              <div className="resumenes-item-cabecera">
                <button
                  type="button"
                  className="tabla-link-btn"
                  onClick={() => onAbrirSeguimiento?.(cliente, semana)}
                  title="Abrir el seguimiento de este cliente en esta semana"
                >
                  {cliente.Nombre}
                </button>
                {typeof trabajadoresDe === 'function' && trabajadoresDe(cliente).length > 0 && (
                  <span className="resumenes-item-trabajador">👤 {trabajadoresDe(cliente).join(', ')}</span>
                )}
                <span className={`status-pill ${cerrada ? 'status-activo' : 'status-pendiente'}`}>
                  {cerrada ? `✅ Cerrada${cerrada.revisadoPor ? ` · ${cerrada.revisadoPor}` : ''}` : `⏳ Sin cerrar${faltan ? ` · faltan ${faltan}` : ''}`}
                </span>
              </div>
              <ResumenSemanaCliente resumen={resumen} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
