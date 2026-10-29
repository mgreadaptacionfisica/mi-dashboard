import { cifrasDetalleHarbiz } from '../utils/sesionesHarbiz'

// Lo que escribió el cliente en Harbiz al completar un entreno (RPE, duración,
// comentario general y comentarios por ejercicio), debajo de la sesión. Viene
// ya limpio en `tarea.harbizDetalle` (ver volcarSesionesHarbiz). Plegado por
// defecto: en la rejilla no cabe un entreno con cinco comentarios, así que
// solo se ve la línea corta y se abre al pulsar.
export default function DetalleHarbiz({ detalle }) {
  if (!detalle) return null
  const cifras = cifrasDetalleHarbiz(detalle)
  const nComentarios = (detalle.comentario ? 1 : 0) + detalle.ejercicios.length
  // Solo cifras, sin nada que leer: una línea, sin desplegable.
  if (nComentarios === 0) {
    return <span className="harbiz-detalle-cifras" title="Lo que marcó el cliente en Harbiz">📊 {cifras}</span>
  }
  return (
    <details className="harbiz-detalle">
      <summary title="Lo que escribió el cliente en Harbiz al completar el entreno">
        🗣️ {nComentarios} comentario{nComentarios === 1 ? '' : 's'}{cifras ? ` · ${cifras}` : ''}
      </summary>
      {detalle.comentario && <p className="harbiz-detalle-general">«{detalle.comentario}»</p>}
      {detalle.ejercicios.length > 0 && (
        <ul>
          {detalle.ejercicios.map((e, i) => (
            <li key={i}><strong>{e.nombre || 'Ejercicio'}:</strong> {e.comentario}</li>
          ))}
        </ul>
      )}
    </details>
  )
}
