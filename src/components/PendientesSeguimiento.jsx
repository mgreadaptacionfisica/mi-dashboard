import { useMemo, useState } from 'react'
import { resumenPendientes } from '../utils/seguimientoHelpers'

// Panel "Pendientes" de Seguimiento y Valoración (solo admin, a petición de
// Raúl): la foto de golpe de todo lo que le falta al equipo por hacer con los
// clientes —sesiones sin marcar, cambios sin hacer, semanas sin cerrar y
// contacto semanal— sin tener que entrar cliente por cliente a comprobarlo.
//
// No añade ningún dato nuevo ni deja editar nada aquí: es solo un ÍNDICE de
// lo que ya vive en las otras dos pestañas y en el modal de Seguimiento. Cada
// pendiente es un botón que te deja justo en el sitio donde se arregla, para
// que revisar sea "pulsar, arreglar, volver" y no ir buscando la semana a
// mano. Por eso mismo no duplica la edición: quien manda sobre el dato sigue
// siendo la pestaña de siempre (ver CLAUDE.md, "Seguimiento y Valoración").
//
// Se pinta sobre `pendientes`, que ya viene calculado y filtrado en
// ClientesEquipo (respeta el filtro por trabajador del admin).
const ICONO_TIPO = {
  semana: '🔒',
  sesiones: '⬜',
  cambios: '📝',
  contacto: '🤝',
  'sin-registro': '📭',
}

const AYUDA_TIPO = {
  semana: 'Abre el seguimiento de esa semana para repasarla y marcar el check de "semana revisada y cerrada"',
  sesiones: 'Lleva la rejilla de registro a esa semana para marcar las sesiones que falten',
  cambios: 'Abre el seguimiento de esa semana, donde se marcan los cambios como hechos',
  contacto: 'Abre la pestaña de contacto semanal (si el contacto es de una semana pasada, retrocede allí con "← Semana anterior")',
  'sin-registro': 'Lleva la rejilla de registro a esa semana para añadir las sesiones',
}

export default function PendientesSeguimiento({ pendientes = [], totalClientes = 0, onAbrirSeguimiento, onIrRegistro, onIrContacto }) {
  // Por defecto se ve todo (también lo de la semana en curso, que es lo que
  // permite adelantarse); el interruptor deja quedarse solo con lo atrasado,
  // que es lo que hay que recuperar sí o sí.
  const [soloAtrasado, setSoloAtrasado] = useState(false)

  const resumen = useMemo(() => resumenPendientes(pendientes), [pendientes])
  const lista = soloAtrasado ? pendientes.filter((p) => p.atrasado) : pendientes

  // Cada tipo de pendiente se arregla en un sitio distinto: el check de cierre
  // y los cambios viven en el modal de Seguimiento; las sesiones, en la
  // rejilla de registro (que es la única que las edita); el contacto, en su
  // pestaña.
  const abrirItem = (cliente, item) => {
    if (item.tipo === 'contacto') {
      onIrContacto?.(item.semana)
      return
    }
    if (item.tipo === 'sesiones' || item.tipo === 'sin-registro') {
      onIrRegistro?.(item.semana)
      return
    }
    onAbrirSeguimiento?.(cliente, item.semana)
  }

  return (
    <div className="table-card">
      <div className="card-header">
        <div>
          <div className="card-title">Pendientes del equipo</div>
          <div className="card-subtitle">
            Todo lo que falta por hacer en seguimiento y contacto, cliente a cliente. Pulsa cualquier pendiente y te
            lleva al sitio exacto donde se arregla.
          </div>
        </div>
      </div>

      <div className="pendientes-resumen">
        <div className={`pendientes-kpi${resumen.clientesAtrasados > 0 ? ' pendientes-kpi-alerta' : ''}`}>
          <span className="pendientes-kpi-valor">{resumen.clientesAtrasados}</span>
          <span className="pendientes-kpi-label">clientes con algo atrasado</span>
        </div>
        <div className="pendientes-kpi">
          <span className="pendientes-kpi-valor">{resumen.clientes}<span className="pendientes-kpi-total">/{totalClientes}</span></span>
          <span className="pendientes-kpi-label">con algo pendiente</span>
        </div>
        <div className="pendientes-kpi">
          <span className="pendientes-kpi-valor">{resumen.semanasSinCerrar}</span>
          <span className="pendientes-kpi-label">semanas sin cerrar</span>
        </div>
        <div className="pendientes-kpi">
          <span className="pendientes-kpi-valor">{resumen.sesiones}</span>
          <span className="pendientes-kpi-label">sesiones sin marcar</span>
        </div>
        <div className="pendientes-kpi">
          <span className="pendientes-kpi-valor">{resumen.cambios}</span>
          <span className="pendientes-kpi-label">cambios sin hacer</span>
        </div>
        <div className="pendientes-kpi">
          <span className="pendientes-kpi-valor">{resumen.contactos}</span>
          <span className="pendientes-kpi-label">contactos por hacer</span>
        </div>
      </div>

      <div className="pendientes-controles">
        <label className="pendientes-toggle">
          <input type="checkbox" checked={soloAtrasado} onChange={() => setSoloAtrasado((v) => !v)} />
          <span>Ver solo lo atrasado (semanas ya terminadas)</span>
        </label>
        <span className="pendientes-leyenda">
          🔴 atrasado = de una semana que ya acabó · 🟡 esta semana = aún se puede hacer
        </span>
      </div>

      {pendientes.length === 0 && (
        <p className="lead-log-empty" style={{ padding: '24px 20px' }}>
          🎉 No queda nada pendiente: todas las semanas cerradas, las sesiones marcadas y los contactos hechos.
        </p>
      )}

      {pendientes.length > 0 && lista.length === 0 && (
        <p className="lead-log-empty" style={{ padding: '24px 20px' }}>
          ✅ Nada atrasado. Lo que queda es de la semana en curso — quita el filtro para verlo.
        </p>
      )}

      {lista.length > 0 && (
        <div className="table-wrapper">
          <table className="pendientes-tabla">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Responsable</th>
                <th>Qué falta</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(({ cliente, items, atrasado, responsables = [] }) => (
                <tr key={cliente.id || cliente.Nombre}>
                  <td>
                    <button
                      type="button"
                      className="pendientes-nombre"
                      onClick={() => onAbrirSeguimiento?.(cliente, items[0]?.semana)}
                      title="Abrir el seguimiento de este cliente"
                    >
                      {atrasado ? '🔴' : '🟡'} {cliente.Nombre || '—'}
                    </button>
                  </td>
                  <td className="pendientes-responsable">
                    {responsables.length > 0 ? responsables.join(', ') : <span className="pendientes-sin-asignar">⚠️ Sin asignar</span>}
                  </td>
                  <td>
                    <div className="pendientes-chips">
                      {items.map((item, i) => (
                        <button
                          key={`${item.tipo}-${item.semana}-${i}`}
                          type="button"
                          className={`pendientes-chip pendientes-chip-${item.nivel}`}
                          onClick={() => abrirItem(cliente, item)}
                          title={AYUDA_TIPO[item.tipo]}
                        >
                          {ICONO_TIPO[item.tipo]} {item.texto}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
