// Resumen de la semana de un cliente, de solo lectura: sesiones, notas de
// sesión (cambios, molestias, lo que ha contado por WhatsApp…), cambios de la
// semana, contacto semanal y el comentario del trabajador. Lo calcula
// resumenSemanaCliente() (utils/seguimientoHelpers.js) y se pinta igual en el
// modal de Seguimiento y en la pestaña 📝 Resúmenes (admin), para que Raúl lea
// exactamente lo mismo que ve el trabajador.
export default function ResumenSemanaCliente({ resumen, mostrarComentario = true }) {
  const { sesiones, notas, cambios, contacto, comentario } = resumen
  // Los problemas van arriba del todo: de una semana, lo primero que hay que
  // saber es si ha pasado algo y qué se ha hecho, no cuántas sesiones hubo.
  const problemas = resumen.problemas || { nuevos: [], resueltos: [], acciones: [], abiertos: [] }
  return (
    <div className="resumen-semana">
      <div className="resumen-semana-cifras">
        <span className={sesiones.total > 0 && sesiones.revisadas === sesiones.total ? 'resumen-ok' : ''}>
          🏋️ Sesiones {sesiones.revisadas}/{sesiones.total}
        </span>
        <span className={cambios.length > 0 && cambios.every((c) => c.hecho) ? 'resumen-ok' : ''}>
          🔧 Cambios {cambios.filter((c) => c.hecho).length}/{cambios.length}
        </span>
        <span className={contacto.hechos === 3 ? 'resumen-ok' : ''}>🤝 Contacto {contacto.hechos}/3</span>
        {problemas.abiertos.length > 0 && (
          <span className="resumen-alerta">🚨 {problemas.abiertos.length} problema{problemas.abiertos.length === 1 ? '' : 's'} abierto{problemas.abiertos.length === 1 ? '' : 's'}</span>
        )}
      </div>

      {(problemas.nuevos.length > 0 || problemas.acciones.length > 0 || problemas.resueltos.length > 0) && (
        <div className="resumen-semana-bloque">
          <span className="resumen-semana-etq">🚨 Problemas y soluciones</span>
          <ul>
            {problemas.nuevos.map((p) => (
              <li key={`n-${p.id}`}><strong>Nuevo:</strong> {p.problema}{(p.acciones || []).length === 0 ? ' — sin ningún cambio apuntado todavía' : ''}</li>
            ))}
            {problemas.acciones.map((a, i) => (
              <li key={`a-${i}`}>🔧 <strong>{a.problema}:</strong> {a.texto}</li>
            ))}
            {problemas.resueltos.map((p) => (
              <li key={`r-${p.id}`}>✅ <strong>Resuelto:</strong> {p.problema}{p.resultado ? ` — ${p.resultado}` : ''}</li>
            ))}
          </ul>
        </div>
      )}

      {notas.length > 0 && (
        <div className="resumen-semana-bloque">
          <span className="resumen-semana-etq">💬 Notas de las sesiones</span>
          <ul>
            {notas.map((n, i) => (
              <li key={i}><strong>{n.dia} · {n.sesion}:</strong> {n.nota}</li>
            ))}
          </ul>
        </div>
      )}

      {cambios.length > 0 && (
        <div className="resumen-semana-bloque">
          <span className="resumen-semana-etq">🔧 Cambios de la semana</span>
          <ul>
            {cambios.map((c, i) => <li key={i}>{c.hecho ? '✅' : '⬜'} {c.texto}</li>)}
          </ul>
        </div>
      )}

      {contacto.puntos.some((p) => p.comentario) && (
        <div className="resumen-semana-bloque">
          <span className="resumen-semana-etq">🤝 Lo que ha contado en el contacto</span>
          <ul>
            {contacto.puntos.filter((p) => p.comentario).map((p) => (
              <li key={p.label}><strong>{p.label}:</strong> {p.comentario}</li>
            ))}
          </ul>
        </div>
      )}

      {mostrarComentario && (
        <div className="resumen-semana-bloque">
          <span className="resumen-semana-etq">📝 Comentario del trabajador</span>
          {comentario
            ? <p className="resumen-semana-comentario">{comentario}</p>
            : <p className="lead-log-empty">Sin comentario esta semana.</p>}
        </div>
      )}

      {notas.length === 0 && cambios.length === 0 && problemas.nuevos.length === 0 && problemas.acciones.length === 0 && problemas.resueltos.length === 0 && !contacto.puntos.some((p) => p.comentario) && !mostrarComentario && (
        <p className="lead-log-empty">Sin notas ni cambios esta semana.</p>
      )}
    </div>
  )
}
