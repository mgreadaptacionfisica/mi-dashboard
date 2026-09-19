import { useMemo, useState } from 'react'
import {
  REFERENCIAS, PERIODOS, rangoPeriodo, rangoAnterior, filtrarPorPeriodo,
  calcularEmbudo, diagnosticar, semaforo, huecosDeDatos,
} from '../utils/embudoVentas'

// Pestaña "🩺 Embudo" de Ventas: el proceso de venta paso a paso, con un
// semáforo en cada paso y un aviso arriba que dice DÓNDE se está perdiendo la
// venta y qué revisar. Toda la lógica (qué cuenta como asistencia, cierre,
// etc.) vive en utils/embudoVentas.js; aquí solo se pinta. No escribe nada.

const euros = (n) => `${Math.round(n).toLocaleString('es-ES')} €`
const pctTxt = (v) => (v === null ? '—' : `${v}%`)
const fechaCorta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '')

const ETIQUETA_COLOR = { verde: 'Bien', ambar: 'Mejorable', rojo: 'Flojo', gris: 'Pocos datos' }

function Pill({ valor, clave, muestra }) {
  const color = semaforo(valor, clave, muestra)
  return <span className={`embudo-pill embudo-pill-${color}`} title={ETIQUETA_COLOR[color]}>{pctTxt(valor)}</span>
}

// Diferencia en puntos contra el periodo anterior. Solo se enseña si los dos
// periodos tienen el dato.
function DeltaPuntos({ actual, anterior }) {
  if (actual === null || anterior === null || anterior === undefined) return null
  const dif = actual - anterior
  if (dif === 0) return <span className="embudo-delta kpi-delta-igual">= que el periodo anterior</span>
  return (
    <span className={`embudo-delta ${dif > 0 ? 'kpi-delta-sube' : 'kpi-delta-baja'}`}>
      {dif > 0 ? '▲' : '▼'} {Math.abs(dif)} pts vs periodo anterior ({anterior}%)
    </span>
  )
}

// Un paso del embudo: barra proporcional a los que agendaron + el % del paso.
function Paso({ numero, titulo, cantidad, total, porcentaje, clave, muestra, anterior, pregunta, children }) {
  const ancho = total > 0 ? Math.max(4, Math.round((cantidad / total) * 100)) : 0
  const color = clave ? semaforo(porcentaje, clave, muestra) : 'neutro'
  return (
    <div className="embudo-paso">
      <div className="embudo-paso-cabecera">
        <div>
          <span className="embudo-paso-numero">{numero}</span>
          <strong>{titulo}</strong>
          {pregunta && <span className="embudo-paso-pregunta">{pregunta}</span>}
        </div>
        {clave && (
          <div className="embudo-paso-pct">
            <Pill valor={porcentaje} clave={clave} muestra={muestra} />
          </div>
        )}
      </div>
      <div className="embudo-barra">
        <div className={`embudo-barra-relleno embudo-barra-${color}`} style={{ width: `${ancho}%` }}>
          <span>{cantidad}</span>
        </div>
      </div>
      <div className="embudo-paso-detalle">
        {children}
        {clave && <span className="embudo-referencia">{REFERENCIAS[clave].texto}</span>}
        {clave && <DeltaPuntos actual={porcentaje} anterior={anterior} />}
      </div>
    </div>
  )
}

function ListaMotivos({ lista, vacio }) {
  if (lista.length === 0) return <p className="lead-log-empty">{vacio}</p>
  return (
    <ul className="embudo-motivos">
      {lista.slice(0, 6).map((m) => (
        <li key={m.motivo || m.texto}>
          <span>{m.motivo || m.texto}</span>
          <strong>{m.total}</strong>
        </li>
      ))}
    </ul>
  )
}

export default function EmbudoVentas({ ventas = [], onAbrirLead }) {
  const [periodo, setPeriodo] = useState('90')
  const [closer, setCloser] = useState('todos')

  const closers = useMemo(
    () => [...new Set(ventas.map((l) => l.closer || 'Sin closer'))].sort(),
    [ventas]
  )
  const deCloser = useMemo(
    () => (closer === 'todos' ? ventas : ventas.filter((l) => (l.closer || 'Sin closer') === closer)),
    [ventas, closer]
  )

  const embudo = useMemo(() => calcularEmbudo(filtrarPorPeriodo(deCloser, rangoPeriodo(periodo))), [deCloser, periodo])
  const embudoAnterior = useMemo(() => {
    const rango = rangoAnterior(periodo)
    return rango ? calcularEmbudo(filtrarPorPeriodo(deCloser, rango)) : null
  }, [deCloser, periodo])
  const diagnostico = useMemo(() => diagnosticar(embudo), [embudo])

  const hoyISO = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])
  const huecos = useMemo(() => huecosDeDatos(deCloser, hoyISO), [deCloser, hoyISO])
  const leadsHueco = [...huecos.sinResultado, ...huecos.sinDecision]

  // Tabla por closer: siempre de todo el equipo (ignora el filtro de closer,
  // que es justo para comparar), pero sí respeta el periodo.
  const porCloser = useMemo(() => {
    const enPeriodo = filtrarPorPeriodo(ventas, rangoPeriodo(periodo))
    return closers
      .map((c) => ({ closer: c, ...calcularEmbudo(enPeriodo.filter((l) => (l.closer || 'Sin closer') === c)) }))
      .filter((f) => f.agendados > 0)
      .sort((a, b) => b.vendido - a.vendido || b.agendados - a.agendados)
  }, [ventas, closers, periodo])

  const ant = embudoAnterior || {}
  const principal = diagnostico.principal

  return (
    <>
      <div className="embudo-filtros">
        <div className="seguimiento-filtro-chips">
          {PERIODOS.map((p) => (
            <button key={p.id} type="button" className={`period-btn ${periodo === p.id ? 'active' : ''}`} onClick={() => setPeriodo(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        {closers.length > 1 && (
          <div className="seguimiento-filtro-chips">
            <button type="button" className={`period-btn ${closer === 'todos' ? 'active' : ''}`} onClick={() => setCloser('todos')}>Todo el equipo</button>
            {closers.map((c) => (
              <button key={c} type="button" className={`period-btn ${closer === c ? 'active' : ''}`} onClick={() => setCloser(c)}>👤 {c}</button>
            ))}
          </div>
        )}
      </div>

      {/* ---- Diagnóstico: lo primero que se lee ---- */}
      {diagnostico.sinDatos ? (
        <div className="embudo-diagnostico embudo-diagnostico-gris">
          <p className="embudo-diagnostico-titulo">📭 Todavía hay pocos datos en este periodo para sacar conclusiones</p>
          <p>Hace falta un mínimo de 5 personas en un paso para darle color. Prueba con "Últimos 90 días" o "Todo".</p>
        </div>
      ) : principal ? (
        <div className={`embudo-diagnostico embudo-diagnostico-${principal.color}`}>
          <p className="embudo-diagnostico-titulo">
            {principal.color === 'rojo' ? '🔴' : '🟠'} Dónde está fallando: {principal.titulo}
          </p>
          <p>
            <strong>{principal.valor}%</strong> frente a una referencia de {REFERENCIAS[principal.clave].bien}% — la venta se
            está perdiendo <strong>{principal.donde}</strong>. Qué revisar:
          </p>
          <ul>
            {principal.revisar.map((r) => <li key={r}>{r}</li>)}
          </ul>
          {diagnostico.secundarios.length > 0 && (
            <p className="embudo-diagnostico-extra">
              También por debajo: {diagnostico.secundarios.map((s) => `${s.titulo.toLowerCase()} (${s.valor}%)`).join(' · ')}
            </p>
          )}
        </div>
      ) : (
        <div className="embudo-diagnostico embudo-diagnostico-verde">
          <p className="embudo-diagnostico-titulo">✅ Todos los pasos con datos están en rango</p>
          <p>Asistencia, cierre y seguimiento están en o por encima de la referencia. Para crecer, lo que más mueve ahora es meter más llamadas.</p>
        </div>
      )}

      {leadsHueco.length > 0 && (
        <div className="embudo-huecos">
          <strong>⚠️ {leadsHueco.length} lead{leadsHueco.length === 1 ? '' : 's'} sin marcar</strong> — no cuentan en ningún % hasta que se marquen:
          {' '}
          {leadsHueco.slice(0, 8).map((l, i) => (
            <span key={l.id}>
              {i > 0 && ', '}
              <button type="button" className="tabla-link-btn" onClick={() => onAbrirLead?.(l.id)}>
                {l.nombre}
              </button>
              <span className="embudo-huecos-motivo"> ({l.etapa === 'agendada' ? `llamada del ${fechaCorta(l.fechaAgenda)} sin resultado` : 'llamada hecha, falta si compró'})</span>
            </span>
          ))}
          {leadsHueco.length > 8 && ` y ${leadsHueco.length - 8} más`}
        </div>
      )}

      {/* ---- El embudo ---- */}
      <div className="table-card embudo-card">
        <div className="card-header">
          <div>
            <div className="card-title">El proceso de venta, paso a paso</div>
            <div className="card-subtitle">Cada % se mide solo sobre los que llegaron a ese paso. Un no show no baja el cierre: baja la asistencia.</div>
          </div>
        </div>

        <Paso numero="1" titulo="Agendan llamada" cantidad={embudo.agendados} total={embudo.agendados}>
          <span>{embudo.pendientesDeLlamada} aún con la llamada por delante (no cuentan todavía)</span>
        </Paso>

        <Paso
          numero="2" titulo="Se presentan" pregunta="¿Vienen a la llamada?"
          cantidad={embudo.asistieron} total={embudo.agendados}
          porcentaje={embudo.tasaAsistencia} clave="asistencia" muestra={embudo.resueltosAsistencia} anterior={ant.tasaAsistencia}
        >
          <span>{embudo.noAsistieron} no llegaron a tenerla (no show / cancelación)</span>
          {embudo.fallaron > 0 && (
            <span>
              · Rescate de plantones: {embudo.rescatados} de {embudo.fallaronResueltos}{' '}
              <Pill valor={embudo.tasaRescate} clave="rescate" muestra={embudo.fallaronResueltos} />
            </span>
          )}
        </Paso>

        <Paso
          numero="3" titulo="Compran" pregunta="De los que vienen, ¿cuántos compran?"
          cantidad={embudo.ganadasConLlamada} total={embudo.agendados}
          porcentaje={embudo.tasaCierre} clave="cierre" muestra={embudo.asistieron} anterior={ant.tasaCierre}
        >
          <span>{embudo.compraronEnLlamada} en la propia llamada ({pctTxt(embudo.tasaCierreEnLlamada)}) · {embudo.ganadasTrasSeguimiento} después, en seguimiento</span>
        </Paso>

        <Paso
          numero="↳" titulo="Seguimiento" pregunta="De los que no compraron en la llamada, ¿cuántos se recuperan?"
          cantidad={embudo.ganadasTrasSeguimiento} total={embudo.agendados}
          porcentaje={embudo.tasaSeguimiento} clave="seguimiento" muestra={embudo.decididosSeguimiento} anterior={ant.tasaSeguimiento}
        >
          <span>{embudo.aSeguimiento} pasaron a seguimiento: {embudo.ganadasTrasSeguimiento} compraron, {embudo.perdidasTrasSeguimiento} perdidos, {embudo.abiertosEnSeguimiento} aún abiertos</span>
        </Paso>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card kpi-card-destacada">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Vendido</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>💰</div>
          </div>
          <div className="kpi-card-value">{euros(embudo.vendido)}</div>
          <div className="kpi-card-delta kpi-delta-nota">{embudo.ganadas} venta{embudo.ganadas === 1 ? '' : 's'} de estas personas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Ticket medio</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>🎟️</div>
          </div>
          <div className="kpi-card-value">{embudo.ticketMedio === null ? '—' : euros(embudo.ticketMedio)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">€ por llamada hecha</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>📞</div>
          </div>
          <div className="kpi-card-value">{embudo.eurosPorLlamada === null ? '—' : euros(embudo.eurosPorLlamada)}</div>
          <div className="kpi-card-delta kpi-delta-nota">lo que vale cada llamada que se tiene</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Checklist pre-llamada</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>✅</div>
          </div>
          <div className="kpi-card-value embudo-checklist-valor">
            {pctTxt(embudo.checklist.con.tasa)} <span>vs</span> {pctTxt(embudo.checklist.sin.tasa)}
          </div>
          <div className="kpi-card-delta kpi-delta-nota">
            asistencia con checklist completo ({embudo.checklist.con.total}) vs incompleto ({embudo.checklist.sin.total})
          </div>
        </div>
      </div>

      {/* ---- Dónde se pierden ---- */}
      <div className="embudo-perdidas">
        <div className="table-card">
          <div className="card-header">
            <div>
              <div className="card-title">🗓️ Perdidos antes de la llamada · {embudo.perdidasSinLlamada}</div>
              <div className="card-subtitle">Problema de agenda o pre-llamada, no del closer.</div>
            </div>
          </div>
          <ListaMotivos lista={embudo.motivosSinLlamada} vacio="Nadie perdido sin llamada en este periodo." />
        </div>
        <div className="table-card">
          <div className="card-header">
            <div>
              <div className="card-title">📞 Perdidos después de la llamada · {embudo.perdidasConLlamada}</div>
              <div className="card-subtitle">Aquí sí es la venta: guion, oferta u objeciones.</div>
            </div>
          </div>
          <ListaMotivos lista={embudo.motivosConLlamada} vacio="Nadie perdido tras la llamada en este periodo." />
        </div>
        <div className="table-card">
          <div className="card-header">
            <div>
              <div className="card-title">⚠️ Objeciones que más se repiten</div>
              <div className="card-subtitle">De los que tuvieron la llamada y no compraron en ella.</div>
            </div>
          </div>
          <ListaMotivos lista={embudo.objeciones} vacio="No hay objeciones apuntadas en este periodo." />
        </div>
      </div>

      {/* ---- Por closer ---- */}
      <div className="table-card">
        <div className="card-header">
          <div>
            <div className="card-title">Por closer</div>
            <div className="card-subtitle">Si un % está en rojo en uno solo, es de esa persona; si está en rojo en todos, es del proceso o del lead.</div>
          </div>
        </div>
        {porCloser.length === 0 ? (
          <p className="lead-log-empty" style={{ padding: '20px' }}>No hay leads en este periodo.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Closer</th>
                  <th>Agendan</th>
                  <th>Asistencia</th>
                  <th>Llamadas hechas</th>
                  <th>Cierre</th>
                  <th>En la llamada</th>
                  <th>Seguimiento</th>
                  <th style={{ textAlign: 'right' }}>Vendido</th>
                  <th style={{ textAlign: 'right' }}>€ / llamada</th>
                </tr>
              </thead>
              <tbody>
                {porCloser.map((c) => (
                  <tr key={c.closer}>
                    <td style={{ fontWeight: 600 }}>👤 {c.closer}</td>
                    <td>{c.agendados}</td>
                    <td><Pill valor={c.tasaAsistencia} clave="asistencia" muestra={c.resueltosAsistencia} /></td>
                    <td>{c.asistieron}</td>
                    <td><Pill valor={c.tasaCierre} clave="cierre" muestra={c.asistieron} /></td>
                    <td>{pctTxt(c.tasaCierreEnLlamada)}</td>
                    <td><Pill valor={c.tasaSeguimiento} clave="seguimiento" muestra={c.decididosSeguimiento} /></td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{euros(c.vendido)}</td>
                    <td style={{ textAlign: 'right' }}>{c.eurosPorLlamada === null ? '—' : euros(c.eurosPorLlamada)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="valoracion-referencia" style={{ marginTop: 14 }}>
        ℹ️ Cada persona entra en el periodo por la fecha de su <strong>primera</strong> llamada, y todo lo que le pase después
        (reagendar, comprar semanas más tarde) se le sigue apuntando ahí. Por eso el periodo en curso puede mejorar solo
        según se van cerrando los seguimientos. Los % en gris tienen menos de 5 personas detrás y no se juzgan. Las
        referencias son de venta high-ticket por llamada; las de seguimiento y rescate son orientativas.
      </p>
    </>
  )
}
