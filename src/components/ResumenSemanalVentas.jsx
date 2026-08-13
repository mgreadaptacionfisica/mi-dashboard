import { useMemo, useState } from 'react'

// Resumen semanal de Ventas (pestaña "📈 Resumen semanal", a petición de
// Raúl): la foto de la semana de un vistazo — cuántas llamadas hubo, cuántas
// se dieron de verdad, cuántos no shows y cancelaciones, cuántas compraron y
// cuánto dinero se cerró. No guarda nada: son cuentas hechas sobre los leads
// que ya hay en el pipeline.
//
// Dos criterios de fecha distintos a propósito, porque son dos preguntas
// distintas:
//   - Las LLAMADAS se cuentan por `fechaAgenda` (el día para el que está
//     puesta la llamada).
//   - El DINERO se cuenta por `venta.fechaCierre` (el día en el que se firmó),
//     que puede caer en otra semana que la llamada — un lead que estuvo en
//     seguimiento y cerró dos semanas después suma en la semana en la que
//     pagó, que es lo que interesa para saber cuánto se vendió esa semana.

// Fechas en horario local (no toISOString, que se va a UTC y en España
// devolvería el día anterior). Aquí no son "claves" de agrupación como en
// seguimientoHelpers: son fechas reales que se comparan con la fecha_agenda
// de cada lead, así que tienen que ser exactas.
const dosDigitos = (n) => String(n).padStart(2, '0')
const isoLocal = (d) => `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`

function lunesDe(fecha) {
  const d = new Date(fecha)
  const dia = d.getDay()
  d.setDate(d.getDate() + (dia === 0 ? -6 : 1 - dia))
  d.setHours(0, 0, 0, 0)
  return d
}

function rangoSemana(offset) {
  const lunes = lunesDe(new Date())
  lunes.setDate(lunes.getDate() + offset * 7)
  const domingo = new Date(lunes)
  domingo.setDate(domingo.getDate() + 6)
  return { desde: isoLocal(lunes), hasta: isoLocal(domingo) }
}

function formatRango(desde, hasta) {
  const fmt = (iso) => {
    const d = new Date(`${iso}T00:00:00`)
    return `${d.getDate()} ${d.toLocaleString('es-ES', { month: 'short' })}`
  }
  return `${fmt(desde)} – ${fmt(hasta)}`
}

const euros = (n) => `${Math.round(n).toLocaleString('es-ES')} €`

// Resultado de la llamada de un lead que todavía no tiene historial (leads
// anteriores a la migración 54). Si no hay `resultadoLlamada` se deduce de la
// etapa: si ya pasó de "agendada", la llamada se dio.
function resultadoSinHistorial(lead) {
  if (lead.resultadoLlamada) return lead.resultadoLlamada
  return ['realizada', 'seguimiento', 'ganada', 'perdida'].includes(lead.etapa) ? 'realizada' : null
}

// Intentos de llamada de un lead dentro de la semana. La fuente buena es
// `historialLlamadas`: guarda cada intento con la fecha que tenía puesta en
// ese momento, así que un no show sigue contando en su semana aunque después
// se reagendara (antes esa llamada se movía de semana y el no show se
// evaporaba). Un lead reagendado dentro de la misma semana cuenta como dos
// intentos, que es lo que de verdad pasó.
function intentosEnSemana(lead, enSemana) {
  const historial = lead.historialLlamadas || []
  const intentos = historial
    .filter((e) => enSemana(e.fecha))
    .map((e) => ({ lead, fecha: e.fecha, resultado: e.resultado }))

  // Además, la llamada que el lead tiene puesta ahora mismo — pero solo si no
  // está ya en el historial, para no contarla dos veces. Sin historial (leads
  // de antes de la 54) se recurre a su resultado suelto.
  const yaRegistrada = historial.some((e) => e.fecha === lead.fechaAgenda)
  if (!yaRegistrada && enSemana(lead.fechaAgenda)) {
    intentos.push({
      lead,
      fecha: lead.fechaAgenda,
      resultado: historial.length === 0 ? resultadoSinHistorial(lead) : null,
    })
  }
  return intentos
}

// Exportada para poder comprobarla de forma aislada (no la usa nadie más).
export function calcularResumen(ventas, desde, hasta) {
  const enSemana = (fecha) => Boolean(fecha) && fecha >= desde && fecha <= hasta

  const intentos = ventas.flatMap((l) => intentosEnSemana(l, enSemana))
  const realizadas = intentos.filter((i) => i.resultado === 'realizada')
  const noShows = intentos.filter((i) => i.resultado === 'no_show')
  const canceladas = intentos.filter((i) => i.resultado === 'cancelada')
  const reagendadas = intentos.filter((i) => i.resultado === 'modificada')
  // "Por hacer": la llamada está puesta y todavía no tiene resultado. En la
  // semana en curso son las que quedan por delante; en una semana pasada, las
  // que se quedaron sin marcar.
  const pendientes = intentos.filter((i) => !i.resultado)

  // Ganadas / perdidas / en seguimiento son estados del LEAD, no de cada
  // intento, así que se cuentan sobre los leads distintos (si no, un lead con
  // dos intentos esa semana contaría dos veces).
  const unicos = (lista) => [...new Map(lista.map((i) => [i.lead.id, i.lead])).values()]

  // "Compraron" se cuenta solo entre los que tuvieron una llamada que SÍ se
  // dio esa semana. Si no, un lead al que se le dio plantón el martes y que
  // acabó comprando dos semanas después aparecería como compra en la semana
  // del plantón, donde en realidad no se habló con él. Así, además, el
  // numerador y el denominador de la tasa de cierre salen del mismo sitio.
  const ganadas = unicos(realizadas).filter((l) => l.etapa === 'ganada')
  // Perdidas y seguimiento sí van sobre cualquier intento: un no show que no
  // quiso reagendar se pierde en esa semana, aunque la llamada no se diera.
  const leadsSemana = unicos(intentos)
  const perdidas = leadsSemana.filter((l) => l.etapa === 'perdida')
  const enSeguimiento = leadsSemana.filter((l) => l.etapa === 'seguimiento')

  // El dinero va por fecha de cierre, no por la de la llamada.
  const cierres = ventas.filter((l) => l.etapa === 'ganada' && enSemana(l.venta?.fechaCierre))
  const facturado = cierres.reduce((total, l) => total + (Number(l.venta?.importe) || 0), 0)

  const nuevos = ventas.filter((l) => enSemana(l.creadoEn))

  const conResultado = realizadas.length + noShows.length + canceladas.length
  const asistencia = conResultado > 0 ? Math.round((realizadas.length / conResultado) * 100) : null
  const cierre = realizadas.length > 0 ? Math.round((ganadas.length / realizadas.length) * 100) : null

  return {
    llamadas: intentos.length,
    realizadas: realizadas.length,
    noShows: noShows.length,
    canceladas: canceladas.length,
    reagendadas: reagendadas.length,
    pendientes: pendientes.length,
    ganadas: ganadas.length,
    perdidas: perdidas.length,
    enSeguimiento: enSeguimiento.length,
    nuevos: nuevos.length,
    asistencia,
    cierre,
    cierres,
    facturado,
    ticketMedio: cierres.length > 0 ? facturado / cierres.length : 0,
    intentos,
  }
}

// Diferencia contra la semana anterior, para saber si vamos mejor o peor sin
// tener que ir a mirarla. Se omite cuando las dos semanas están a cero (no
// aporta nada ver "=0" en todo).
// `menosEsMejor` invierte el color: en no shows y cancelaciones, subir es una
// mala noticia y tiene que verse en rojo aunque la flecha apunte hacia arriba.
function Delta({ actual, anterior, sufijo = '', menosEsMejor = false }) {
  if (!actual && !anterior) return null
  const dif = actual - anterior
  if (dif === 0) return <div className="kpi-card-delta kpi-delta-igual">= que la semana pasada</div>
  const signo = dif > 0 ? '▲' : '▼'
  const texto = sufijo === '€' ? euros(Math.abs(dif)) : `${Math.abs(dif)}${sufijo}`
  const bien = menosEsMejor ? dif < 0 : dif > 0
  return (
    <div className={`kpi-card-delta ${bien ? 'kpi-delta-sube' : 'kpi-delta-baja'}`}>
      {signo} {texto} vs semana pasada
    </div>
  )
}

export default function ResumenSemanalVentas({ ventas = [], onAbrirLead }) {
  // 0 = semana actual, -1 = la anterior. Igual que el resto de navegadores de
  // semana del panel, para no cambiar de gesto entre secciones.
  const [offset, setOffset] = useState(0)

  const { desde, hasta } = useMemo(() => rangoSemana(offset), [offset])
  const anterior = useMemo(() => rangoSemana(offset - 1), [offset])

  const resumen = useMemo(() => calcularResumen(ventas, desde, hasta), [ventas, desde, hasta])
  const resumenAnterior = useMemo(() => calcularResumen(ventas, anterior.desde, anterior.hasta), [ventas, anterior])

  // Actividad por closer: quién ha tenido cuántas llamadas y qué ha cerrado.
  // Las llamadas salen de las de la semana; el dinero, de los cierres de la
  // semana (mismo criterio de fechas que arriba).
  const porCloser = useMemo(() => {
    const mapa = {}
    const fila = (nombre) => {
      if (!mapa[nombre]) mapa[nombre] = { closer: nombre, llamadas: 0, realizadas: 0, noShows: 0, canceladas: 0, ganadas: 0, facturado: 0 }
      return mapa[nombre]
    }
    resumen.intentos.forEach((i) => {
      const f = fila(i.lead.closer || 'Sin closer')
      f.llamadas += 1
      if (i.resultado === 'realizada') f.realizadas += 1
      if (i.resultado === 'no_show') f.noShows += 1
      if (i.resultado === 'cancelada') f.canceladas += 1
    })
    // Las compras van por lead, no por intento: un lead reagendado dos veces
    // en la misma semana solo compró una vez.
    const leadsUnicos = [...new Map(resumen.intentos.map((i) => [i.lead.id, i.lead])).values()]
    leadsUnicos.forEach((l) => {
      if (l.etapa === 'ganada') fila(l.closer || 'Sin closer').ganadas += 1
    })
    resumen.cierres.forEach((l) => {
      fila(l.closer || 'Sin closer').facturado += Number(l.venta?.importe) || 0
    })
    return Object.values(mapa).sort((a, b) => b.facturado - a.facturado || b.ganadas - a.ganadas || b.llamadas - a.llamadas)
  }, [resumen])

  return (
    <>
      <div className="ventas-resumen-nav">
        <button type="button" className="secondary-action" onClick={() => setOffset((o) => o - 1)}>← Semana anterior</button>
        <strong>Semana del {formatRango(desde, hasta)}{offset === 0 ? ' (actual)' : ''}</strong>
        {offset === 0 ? (
          <button type="button" className="secondary-action" onClick={() => setOffset((o) => o + 1)}>Semana siguiente →</button>
        ) : (
          <button type="button" className="secondary-action" onClick={() => setOffset(0)}>Volver a esta semana →</button>
        )}
      </div>

      <div className="card-title" style={{ margin: '0 0 10px' }}>📞 Llamadas de la semana</div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Llamadas agendadas</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>🗓️</div>
          </div>
          <div className="kpi-card-value">{resumen.llamadas}</div>
          <Delta actual={resumen.llamadas} anterior={resumenAnterior.llamadas} />
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Realizadas</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>✅</div>
          </div>
          <div className="kpi-card-value">{resumen.realizadas}</div>
          <Delta actual={resumen.realizadas} anterior={resumenAnterior.realizadas} />
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">No shows</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>👻</div>
          </div>
          <div className="kpi-card-value">{resumen.noShows}</div>
          <Delta actual={resumen.noShows} anterior={resumenAnterior.noShows} menosEsMejor />
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Canceladas</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ffedd5, #fed7aa)' }}>🚫</div>
          </div>
          <div className="kpi-card-value">{resumen.canceladas}</div>
          <Delta actual={resumen.canceladas} anterior={resumenAnterior.canceladas} menosEsMejor />
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Reagendadas</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)' }}>🔄</div>
          </div>
          <div className="kpi-card-value">{resumen.reagendadas}</div>
          <Delta actual={resumen.reagendadas} anterior={resumenAnterior.reagendadas} menosEsMejor />
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Por hacer / sin marcar</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)' }}>⏳</div>
          </div>
          <div className="kpi-card-value">{resumen.pendientes}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">% de asistencia</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>📈</div>
          </div>
          <div className="kpi-card-value">{resumen.asistencia === null ? '—' : `${resumen.asistencia}%`}</div>
          <div className="kpi-card-delta kpi-delta-nota">de las llamadas con resultado</div>
        </div>
      </div>

      <div className="card-title" style={{ margin: '0 0 10px' }}>💰 Cierres y dinero</div>
      <div className="kpi-grid">
        <div className="kpi-card kpi-card-destacada">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Vendido esta semana</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>💰</div>
          </div>
          <div className="kpi-card-value">{euros(resumen.facturado)}</div>
          <Delta actual={resumen.facturado} anterior={resumenAnterior.facturado} sufijo="€" />
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Ventas cerradas</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>🤝</div>
          </div>
          <div className="kpi-card-value">{resumen.cierres.length}</div>
          <Delta actual={resumen.cierres.length} anterior={resumenAnterior.cierres.length} />
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Ticket medio</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>🎟️</div>
          </div>
          <div className="kpi-card-value">{resumen.cierres.length > 0 ? euros(resumen.ticketMedio) : '—'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Tasa de cierre</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>🎯</div>
          </div>
          <div className="kpi-card-value">{resumen.cierre === null ? '—' : `${resumen.cierre}%`}</div>
          <div className="kpi-card-delta kpi-delta-nota">compras sobre llamadas realizadas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">En seguimiento</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>🔁</div>
          </div>
          <div className="kpi-card-value">{resumen.enSeguimiento}</div>
          <div className="kpi-card-delta kpi-delta-nota">de las llamadas de esta semana</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Perdidas</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>✖️</div>
          </div>
          <div className="kpi-card-value">{resumen.perdidas}</div>
          <div className="kpi-card-delta kpi-delta-nota">{resumen.nuevos} lead{resumen.nuevos === 1 ? '' : 's'} nuevo{resumen.nuevos === 1 ? '' : 's'} esta semana</div>
        </div>
      </div>

      <div className="table-card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Ventas de la semana</div>
            <div className="card-subtitle">Lo que se ha firmado entre el {formatRango(desde, hasta)}, por fecha de cierre.</div>
          </div>
        </div>
        {resumen.cierres.length === 0 ? (
          <p className="lead-log-empty" style={{ padding: '20px' }}>Todavía no hay ninguna venta cerrada esta semana.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Closer</th>
                  <th>Forma de pago</th>
                  <th style={{ textAlign: 'right' }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {resumen.cierres.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {typeof onAbrirLead === 'function' ? (
                        <button type="button" className="tabla-link-btn" onClick={() => onAbrirLead(l.id)} title="Abrir el lead en el pipeline">
                          {l.nombre}
                        </button>
                      ) : l.nombre}
                    </td>
                    <td>{l.venta?.servicio || '—'}</td>
                    <td>{l.closer || 'Sin closer'}</td>
                    <td>
                      {l.venta?.tipoPago === 'unico' && 'Pago único'}
                      {l.venta?.tipoPago === 'plazos' && `${l.venta?.numPlazos} plazos`}
                      {l.venta?.tipoPago === 'financiado' && `Financiado${l.venta?.planFinanciado ? ` — ${l.venta.planFinanciado}` : ''}`}
                      {l.venta?.formaPago ? ` · ${l.venta.formaPago}` : ''}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{euros(Number(l.venta?.importe) || 0)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} style={{ fontWeight: 700 }}>Total</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{euros(resumen.facturado)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="table-card">
        <div className="card-header">
          <div>
            <div className="card-title">Por closer</div>
            <div className="card-subtitle">Actividad y cierres de cada uno en esta semana.</div>
          </div>
        </div>
        {porCloser.length === 0 ? (
          <p className="lead-log-empty" style={{ padding: '20px' }}>No hay actividad registrada en esta semana.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Closer</th>
                  <th>Llamadas</th>
                  <th>Realizadas</th>
                  <th>No show</th>
                  <th>Canceladas</th>
                  <th>Compraron</th>
                  <th style={{ textAlign: 'right' }}>Vendido</th>
                </tr>
              </thead>
              <tbody>
                {porCloser.map((c) => (
                  <tr key={c.closer}>
                    <td>👤 {c.closer}</td>
                    <td>{c.llamadas}</td>
                    <td>{c.realizadas}</td>
                    <td>{c.noShows}</td>
                    <td>{c.canceladas}</td>
                    <td>{c.ganadas}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{euros(c.facturado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="valoracion-referencia" style={{ marginTop: 14 }}>
        ℹ️ Cada llamada cuenta en la semana del día para el que estaba puesta, y se queda ahí aunque después se
        reagende: si alguien no se presentó el martes y se le pasó a la semana siguiente, ese no show sigue contando
        aquí y la nueva llamada cuenta en su semana. El dinero, en cambio, va por la fecha en la que se cerró la venta,
        así que un lead que firmó semanas después de su llamada suma en la semana en la que pagó.
      </p>
    </>
  )
}
