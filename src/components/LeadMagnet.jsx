import { useMemo, useState } from 'react'
import Logo from '../assets/mg-logo.png'
import {
  AVISO_SANITARIO,
  COLOR_TRAMO,
  WHATSAPP_MG,
  leadmagnetPorRuta,
  puntuacionMaxima,
  tramoDe,
} from '../data/leadmagnets'
import { registrarLeadmagnet } from '../lib/queries/leadmagnets'

// Página pública de un leadmagnet (RUTAS PÚBLICAS, sin login). El contenido
// está en src/data/leadmagnets.js; aquí solo el flujo:
//   preguntas (si las hay) + datos de contacto → resultado / recurso.
// Reutiliza el estilo del cuestionario previo (clases cp-*) para que todas
// las páginas que ve alguien de fuera tengan la misma cara.
//
// El resultado se enseña aunque falle el guardado: el visitante no tiene la
// culpa, y perderíamos la confianza justo en el primer contacto.

const ZONAS = ['Hombro', 'Rodilla', 'Espalda', 'Cadera', 'Tobillo', 'Codo o muñeca', 'Otra']
const LADOS = ['Derecho', 'Izquierdo', 'Los dos']

function atribucionDeLaUrl() {
  try {
    const q = new URLSearchParams(window.location.search)
    const atr = {}
    ;['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => {
      if (q.get(k)) atr[k] = q.get(k).slice(0, 200)
    })
    if (document.referrer) atr.referrer = document.referrer.slice(0, 300)
    return Object.keys(atr).length ? atr : null
  } catch (e) {
    return null
  }
}

function Opciones({ name, opciones, valor, onChange }) {
  return (
    <div className="cp-opciones">
      {opciones.map(([texto, v]) => (
        <label key={texto} className={valor === v ? 'cp-opcion-activa' : ''}>
          <input type="radio" name={name} checked={valor === v} onChange={() => onChange(v)} />
          {texto}
        </label>
      ))}
    </div>
  )
}

function enlaceWhatsapp(texto) {
  return `https://wa.me/${WHATSAPP_MG}?text=${encodeURIComponent(texto)}`
}

function Cta({ lm, textoWhatsapp }) {
  return (
    <div className="lm-cta lm-no-print">
      <p>{lm.cta}</p>
      <a className="primary-action cp-boton" href={enlaceWhatsapp(textoWhatsapp)} target="_blank" rel="noopener noreferrer">
        💬 Escribir por WhatsApp
      </a>
    </div>
  )
}

function Puntos({ puntos }) {
  return (
    <ul className="lm-puntos">
      {puntos.map((p) => <li key={p}>{p}</li>)}
    </ul>
  )
}

function ResultadoTest({ lm, puntos, nombre }) {
  const max = puntuacionMaxima(lm)
  const tramo = tramoDe(lm, puntos)
  if (!tramo) return null
  const color = COLOR_TRAMO[tramo.color]
  return (
    <>
      <div className="lm-resultado" style={{ borderColor: color }}>
        <div className="lm-resultado-nota" style={{ color }}>{puntos}/{max}</div>
        <h2 style={{ color }}>{tramo.titulo}</h2>
        <p>{nombre ? `${nombre.split(' ')[0]}, ` : ''}{tramo.texto}</p>
      </div>
      <section className="lm-seccion">
        <h3>Qué te recomendamos</h3>
        <Puntos puntos={tramo.claves} />
      </section>
      <Cta lm={lm} textoWhatsapp={`Hola, he hecho el «${lm.titulo}» y me ha salido ${puntos}/${max}: «${tramo.titulo}». Me gustaría que mirarais mi caso.`} />
    </>
  )
}

function Recurso({ lm, variante }) {
  const v = lm.variantes ? lm.variantes[variante] : null
  return (
    <>
      {(lm.secciones || []).map((s) => (
        <section key={s.titulo} className="lm-seccion" style={s.color ? { borderLeftColor: COLOR_TRAMO[s.color] } : undefined}>
          <h3>{s.titulo}</h3>
          {s.texto && <p>{s.texto}</p>}
          {s.puntos && <Puntos puntos={s.puntos} />}
        </section>
      ))}

      {v && (
        <>
          <section className="lm-seccion">
            <h3>{v.titulo}</h3>
            <p><strong>Objetivo:</strong> {v.objetivo}</p>
            <table className="lm-semana">
              <tbody>
                {v.semana.map(([dia, que]) => (
                  <tr key={dia}><th>{dia}</th><td>{que}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
          {v.bloques.map((b) => (
            <section key={b.titulo} className="lm-seccion">
              <h3>{b.titulo}</h3>
              <Puntos puntos={b.puntos} />
            </section>
          ))}
          <section className="lm-seccion">
            <h3>Cuándo pasar a la siguiente fase</h3>
            <p>{v.progresion}</p>
          </section>
        </>
      )}

      {lm.reglas && (
        <section className="lm-seccion">
          <h3>Reglas para toda la semana</h3>
          <Puntos puntos={lm.reglas} />
        </section>
      )}

      <Cta lm={lm} textoWhatsapp={`Hola, me he descargado «${lm.titulo}»${v ? ` (${v.titulo})` : ''} y me gustaría que mirarais mi caso.`} />
    </>
  )
}

export default function LeadMagnet({ ruta = window.location.pathname }) {
  const lm = useMemo(() => leadmagnetPorRuta(ruta), [ruta])
  const [respuestas, setRespuestas] = useState({})
  const [contacto, setContacto] = useState({ nombre: '', telefono: '', email: '', acepto: false })
  const [enviando, setEnviando] = useState(false)
  const [hecho, setHecho] = useState(false)
  const [aviso, setAviso] = useState('')

  if (!lm) return null

  const preguntas = lm.preguntas || []
  const puntos = preguntas.reduce((t, p) => t + (typeof respuestas[p.id] === 'number' ? respuestas[p.id] : 0), 0)
  const set = (id, v) => setRespuestas((r) => ({ ...r, [id]: v }))

  const faltan = []
  if (lm.preguntaZona && !respuestas.zona) faltan.push('la zona de la lesión')
  if (lm.preguntaLado && !respuestas.lado) faltan.push('el hombro que te molesta')
  if (lm.preguntaVariante && !respuestas.variante) faltan.push('cómo está tu hombro')
  const sinResponder = preguntas.filter((p) => typeof respuestas[p.id] !== 'number').length
  if (sinResponder) faltan.push(`${sinResponder} pregunta(s)`)
  if (!contacto.nombre.trim()) faltan.push('tu nombre')
  if (contacto.telefono.replace(/\D/g, '').length < 9) faltan.push('tu WhatsApp')
  if (!contacto.acepto) faltan.push('aceptar el aviso de datos')

  const enviar = async (e) => {
    e.preventDefault()
    if (faltan.length) {
      setAviso(`Te falta: ${faltan.join(', ')}.`)
      return
    }
    setEnviando(true)
    const tramo = lm.tipo === 'test' ? tramoDe(lm, puntos) : null
    await registrarLeadmagnet({
      leadmagnet: lm.slug,
      nombre: contacto.nombre.trim(),
      email: contacto.email.trim(),
      telefono: contacto.telefono.trim(),
      respuestas,
      puntuacion: lm.tipo === 'test' ? puntos : null,
      resultado: tramo ? tramo.color : (respuestas.variante || ''),
      atribucion: atribucionDeLaUrl(),
    })
    setEnviando(false)
    setHecho(true)
    window.scrollTo(0, 0)
  }

  return (
    <div className="cp-pagina">
      <div className="cp-hoja">
        <header className="cp-cabecera">
          <img src={Logo} alt="MG Readaptación Física" className="cp-logo" />
          <span className="cp-marca">MG Readaptación Física</span>
          <h1>{lm.titulo}</h1>
          <p className="cp-entradilla"><strong>{lm.gancho}</strong> {!hecho && lm.entradilla}</p>
          {!hecho && (
            <div className="cp-meta">
              {lm.meta.map((m) => <span key={m}>{m}</span>)}
            </div>
          )}
        </header>

        {hecho ? (
          <>
            {lm.tipo === 'test'
              ? <ResultadoTest lm={lm} puntos={puntos} nombre={contacto.nombre.trim()} />
              : <Recurso lm={lm} variante={respuestas.variante} />}
            <div className="lm-acciones lm-no-print">
              <button type="button" className="secondary-action" onClick={() => window.print()}>⬇️ Descargar PDF</button>
            </div>
            <p className="lm-aviso-sanitario">{AVISO_SANITARIO}</p>
          </>
        ) : (
          <form onSubmit={enviar}>
            <div className="cp-preguntas">
              {lm.preguntaZona && (
                <div className="cp-pregunta">
                  <p className="cp-pregunta-texto">¿Qué zona te lesionaste?</p>
                  <Opciones name="zona" opciones={ZONAS.map((z) => [z, z])} valor={respuestas.zona} onChange={(v) => set('zona', v)} />
                </div>
              )}
              {lm.preguntaLado && (
                <div className="cp-pregunta">
                  <p className="cp-pregunta-texto">¿Qué hombro te molesta?</p>
                  <Opciones name="lado" opciones={LADOS.map((z) => [z, z])} valor={respuestas.lado} onChange={(v) => set('lado', v)} />
                </div>
              )}
              {lm.preguntaVariante && (
                <div className="cp-pregunta">
                  <p className="cp-pregunta-texto">{lm.preguntaVariante.texto}</p>
                  <Opciones
                    name="variante"
                    opciones={lm.preguntaVariante.opciones.map(([v, texto]) => [texto, v])}
                    valor={respuestas.variante}
                    onChange={(v) => set('variante', v)}
                  />
                </div>
              )}
              {preguntas.map((p) => (
                <div key={p.id} className="cp-pregunta">
                  <p className="cp-pregunta-texto">{p.texto}</p>
                  {p.pista && <p className="cp-pregunta-pista">{p.pista}</p>}
                  {p.video && (
                    <video className="lm-video" src={p.video} controls playsInline preload="metadata" />
                  )}
                  <div className="cp-pregunta-campo">
                    <Opciones name={p.id} opciones={p.opciones} valor={respuestas[p.id]} onChange={(v) => set(p.id, v)} />
                  </div>
                </div>
              ))}
            </div>

            <div className="lm-contacto">
              <h2>{lm.tipo === 'test' ? '¿Dónde te mandamos el resultado?' : '¿Dónde te lo mandamos?'}</h2>
              <p className="cp-bloque-intro">
                {lm.tipo === 'test'
                  ? 'Lo verás en pantalla nada más enviar, y lo podrás descargar en PDF.'
                  : 'Lo tendrás en pantalla nada más enviar, y lo podrás descargar en PDF.'}
              </p>
              <div className="cp-identidad">
                <label className="cp-campo">
                  <span>Nombre</span>
                  <input className="cp-input" value={contacto.nombre} autoComplete="name"
                    onChange={(e) => setContacto({ ...contacto, nombre: e.target.value })} placeholder="Tu nombre" />
                </label>
                <label className="cp-campo">
                  <span>WhatsApp</span>
                  <input className="cp-input" type="tel" value={contacto.telefono} autoComplete="tel"
                    onChange={(e) => setContacto({ ...contacto, telefono: e.target.value })} placeholder="600 000 000" />
                </label>
                <label className="cp-campo">
                  <span>Email <em>(opcional)</em></span>
                  <input className="cp-input" type="email" value={contacto.email} autoComplete="email"
                    onChange={(e) => setContacto({ ...contacto, email: e.target.value })} placeholder="tu@email.com" />
                </label>
              </div>
              <label className="lm-acepto">
                <input type="checkbox" checked={contacto.acepto}
                  onChange={(e) => setContacto({ ...contacto, acepto: e.target.checked })} />
                <span>
                  Acepto que MG Readaptación Física guarde estos datos para enviarme este material y contactarme
                  por WhatsApp o email. Puedo pedir que los borren cuando quiera escribiendo por WhatsApp.
                </span>
              </label>
            </div>

            {aviso && faltan.length > 0 && <div className="cp-error" role="alert"><p>{aviso}</p></div>}

            <div className="cp-enviar">
              <button type="submit" className="primary-action cp-boton" disabled={enviando}>
                {enviando ? 'Enviando…' : lm.tipo === 'test' ? 'Ver mi resultado' : 'Quiero la guía'}
              </button>
            </div>
            <p className="lm-aviso-sanitario">{AVISO_SANITARIO}</p>
          </form>
        )}
      </div>
    </div>
  )
}
