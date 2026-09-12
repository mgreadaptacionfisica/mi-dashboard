import { useEffect, useMemo, useState } from 'react'
import Logo from '../assets/mg-logo.png'
import {
  BLOQUES_CUESTIONARIO,
  TOTAL_PREGUNTAS,
  respondidas,
} from '../utils/cuestionarioPrevio'
import { enviarCuestionarioPublico } from '../lib/queries/cuestionariosPrevios'

// Cuestionario previo del cliente — RUTA PÚBLICA /cuestionario, sin login.
//
// El cliente llega por un enlace que le pasa el fisio, con su nombre dentro
// (/cuestionario?c=Nombre%20Apellido). El nombre viaja en el enlace y no se
// teclea porque el historial del panel se enlaza por NOMBRE: si el cliente
// escribe "Jose" y en el panel está como "José", el cuestionario queda
// huérfano. Si entra sin el parámetro se le pide a mano y el panel deja
// reasignarlo después.
//
// Se guarda un borrador en el navegador del cliente mientras rellena: son
// 12-15 minutos de escritura y se pierden con un toque en el sitio
// equivocado. Todo entre try/catch, porque en ventana privada o con las
// cookies bloqueadas el simple acceso a localStorage ya lanza.

const CLAVE_BORRADOR = 'mg-cuestionario-previo'

function nombreDelEnlace() {
  try {
    return new URLSearchParams(window.location.search).get('c') || ''
  } catch (e) {
    return ''
  }
}

function Escala({ id, extremos, valor, onChange }) {
  return (
    <div className="cp-escala">
      <div className="cp-escala-casillas">
        {Array.from({ length: 11 }, (_, i) => (
          <label key={i} className={valor === i ? 'cp-escala-activa' : ''}>
            <input
              type="radio"
              name={id}
              value={i}
              checked={valor === i}
              onChange={() => onChange(i)}
            />
            {i}
          </label>
        ))}
      </div>
      <div className="cp-escala-extremos">
        <span>{extremos[0]}</span>
        <span>{extremos[1]}</span>
      </div>
    </div>
  )
}

function Campo({ pregunta, valor, onChange }) {
  if (pregunta.tipo === 'escala') {
    return <Escala id={pregunta.id} extremos={pregunta.extremos} valor={valor} onChange={onChange} />
  }
  if (pregunta.tipo === 'opciones') {
    return (
      <div className="cp-opciones">
        {pregunta.opciones.map((o) => (
          <label key={o} className={valor === o ? 'cp-opcion-activa' : ''}>
            <input type="radio" name={pregunta.id} value={o} checked={valor === o} onChange={() => onChange(o)} />
            {o}
          </label>
        ))}
      </div>
    )
  }
  if (pregunta.tipo === 'corto') {
    return (
      <input
        type="text"
        className="cp-input"
        placeholder={pregunta.placeholder || ''}
        value={valor ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  return (
    <textarea
      className="cp-input"
      rows={2}
      placeholder="Escribe aquí…"
      value={valor ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export default function CuestionarioPrevio() {
  const nombreEnlace = useMemo(nombreDelEnlace, [])
  const [clienteNombre, setClienteNombre] = useState(nombreEnlace)
  const [email, setEmail] = useState('')
  const [respuestas, setRespuestas] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [enviado, setEnviado] = useState(false)

  // Recuperar borrador al entrar.
  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE_BORRADOR) || 'null')
      if (!guardado) return
      setRespuestas(guardado.respuestas || {})
      setEmail(guardado.email || '')
      // El nombre del enlace manda siempre sobre el del borrador: si el fisio
      // le manda un enlace nuevo, es el bueno.
      if (!nombreEnlace && guardado.clienteNombre) setClienteNombre(guardado.clienteNombre)
    } catch (e) { /* sin borrador: se empieza en blanco */ }
  }, [nombreEnlace])

  // Guardar borrador en cada cambio.
  useEffect(() => {
    if (enviado) return
    try {
      localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ clienteNombre, email, respuestas }))
    } catch (e) { /* sin sitio donde guardar: se sigue igual */ }
  }, [clienteNombre, email, respuestas, enviado])

  const hechas = respondidas(respuestas)
  const progreso = Math.round((hechas / TOTAL_PREGUNTAS) * 100)

  function setRespuesta(id, valor) {
    setRespuestas((prev) => ({ ...prev, [id]: valor }))
  }

  async function enviar(e) {
    e.preventDefault()
    if (!clienteNombre.trim()) {
      setError({ message: 'Escribe tu nombre para que sepamos de quién es el cuestionario.' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setEnviando(true)
    setError(null)
    const fallo = await enviarCuestionarioPublico({
      id: `cuest-${Date.now()}`,
      clienteNombre: clienteNombre.trim(),
      email: email.trim(),
      respuestas,
    })
    setEnviando(false)
    if (fallo) {
      setError(fallo)
      return
    }
    // Solo se borra el borrador cuando el envío ha ido bien de verdad.
    try { localStorage.removeItem(CLAVE_BORRADOR) } catch (err) { /* da igual */ }
    setEnviado(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (enviado) {
    return (
      <div className="cp-pagina">
        <div className="cp-hoja cp-gracias">
          <img src={Logo} alt="MG Group" className="cp-logo" />
          <h1>Recibido, {clienteNombre.split(' ')[0]}</h1>
          <p>
            Ya tenemos tus respuestas. Las revisaremos antes de tu valoración, así que no hace falta que nos
            mandes nada más.
          </p>
          <p className="cp-gracias-nota">
            Si te has dejado algo importante o quieres matizar una respuesta, díselo a tu entrenador por WhatsApp
            y lo añadimos a mano.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="cp-pagina">
      <form className="cp-hoja" onSubmit={enviar}>
        <header className="cp-cabecera">
          <img src={Logo} alt="MG Group" className="cp-logo" />
          <span className="cp-marca">MG Group · Readaptación física</span>
          <h1>Antes de tu valoración</h1>
          <p className="cp-entradilla">
            Este cuestionario nos sirve para entender qué está influyendo en tu caso, más allá de lo que podemos
            medir en la camilla. Con tus respuestas montamos el mapa de factores sobre el que decidiremos por
            dónde empezar.
          </p>
          <div className="cp-meta">
            <span><b>Tiempo:</b> 12-15 minutos</span>
            <span><b>Lo ve:</b> solo tu equipo de MG Group</span>
            <span><b>Puedes parar:</b> se guarda solo en este móvil</span>
          </div>
        </header>

        <div className="cp-aviso">
          <p>
            <strong>No hay respuestas correctas.</strong> No estamos evaluando si lo haces bien: estamos buscando
            por dónde empezar. Una respuesta incómoda nos ahorra semanas de trabajo en la dirección equivocada.
          </p>
          <p>
            <strong>Si no sabes algo, déjalo en blanco.</strong> Lo preferimos a una respuesta inventada.
          </p>
        </div>

        <div className="cp-identidad">
          <label className="cp-campo">
            <span>Tu nombre {nombreEnlace && <em>(ya lo tenemos)</em>}</span>
            <input
              type="text"
              className="cp-input"
              value={clienteNombre}
              readOnly={Boolean(nombreEnlace)}
              placeholder="Nombre y apellidos"
              onChange={(e) => setClienteNombre(e.target.value)}
            />
          </label>
          <label className="cp-campo">
            <span>Email <em>(opcional)</em></span>
            <input
              type="email"
              className="cp-input"
              value={email}
              placeholder="por si necesitamos localizarte"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        </div>

        {error && (
          <div className="cp-error" role="alert">
            <strong>⚠️ No se ha podido enviar</strong>
            <p>
              Tus respuestas <strong>siguen guardadas en este dispositivo</strong>, no has perdido nada. Vuelve a
              intentarlo en un momento; si sigue fallando, avisa a tu entrenador por WhatsApp.
            </p>
            <code>{error.message}</code>
          </div>
        )}

        {BLOQUES_CUESTIONARIO.map((bloque) => (
          <section key={bloque.id} className={`cp-bloque cp-bloque-${bloque.eje || 'lectura'}`}>
            <div className="cp-bloque-cab">
              <div className="cp-eyebrow">{bloque.eyebrow}</div>
              <h2>{bloque.titulo}</h2>
              <p className="cp-bloque-intro">{bloque.intro}</p>
            </div>
            <div className="cp-preguntas">
              {bloque.preguntas.map((p) => (
                <div key={p.id} className="cp-pregunta">
                  <div className="cp-pregunta-texto">{p.texto}</div>
                  {p.pista && <div className="cp-pregunta-pista">{p.pista}</div>}
                  <div className="cp-pregunta-campo">
                    <Campo pregunta={p} valor={respuestas[p.id]} onChange={(v) => setRespuesta(p.id, v)} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="cp-enviar">
          <div className="cp-progreso">
            <div className="cp-progreso-barra"><span style={{ width: `${progreso}%` }} /></div>
            <span className="cp-progreso-texto">{hechas} de {TOTAL_PREGUNTAS} respondidas</span>
          </div>
          <button type="submit" className="primary-action cp-boton" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar respuestas'}
          </button>
          <p className="cp-enviar-nota">
            No hace falta responderlo todo: envía lo que tengas. Si prefieres seguir luego, cierra la página y
            vuelve a abrir este mismo enlace — lo que llevas escrito sigue aquí.
          </p>
        </div>
      </form>
    </div>
  )
}
