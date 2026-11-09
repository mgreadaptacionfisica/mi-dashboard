import { useState } from 'react'
import {
  textoPlantilla, textoCasoExito, enlaceWhatsApp, GUION_LLAMADA, MENSAJES_WHATSAPP, CASOS_EXITO,
} from '../utils/protocoloLlamada'

// Botones de un mensaje. Cada uno lleva su propio "✓ Copiado" porque el mismo
// texto puede salir a la vez en el paso del protocolo y en la lista completa.
function AccionesMensaje({ texto, telefono, soloCopiar = false }) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch (e) {
      window.prompt('Copia el mensaje:', texto)
    }
  }

  return (
    <div className="protocolo-paso-acciones">
      {!soloCopiar && (
        <a className="secondary-action" href={enlaceWhatsApp(telefono, texto)} target="_blank" rel="noreferrer">💬 WhatsApp</a>
      )}
      <button type="button" className="secondary-action" onClick={copiar}>{copiado ? '✓ Copiado' : 'Copiar'}</button>
      {!soloCopiar && !telefono && <span className="protocolo-paso-ayuda">Sin teléfono en la ficha: tendrás que elegir el chat.</span>}
    </div>
  )
}

// Lista de pasos del protocolo de llamada (antes de la llamada o del
// seguimiento de 48 h, según `pasos`). Cada paso es una casilla; los que son
// un mensaje llevan "💬 WhatsApp" (abre el chat del lead con la plantilla
// como borrador, no la envía) y "Copiar". Marcar la casilla es aparte a
// propósito: abrir el chat no significa que se haya mandado.
export default function ProtocoloLlamada({ pasos, estado, onToggle, lead }) {
  return (
    <div className="protocolo-lista">
      {pasos.map((paso) => {
        const hecho = !!estado?.[paso.clave]
        return (
          <div key={paso.clave} className={`protocolo-paso ${hecho ? 'protocolo-paso-hecho' : ''}`}>
            <label className="protocolo-paso-cabecera">
              <input type="checkbox" checked={hecho} onChange={() => onToggle(paso.clave)} />
              <span className="protocolo-paso-titulo">{paso.titulo}</span>
              <span className="protocolo-paso-cuando">{paso.cuando}</span>
            </label>
            {!hecho && paso.ayuda && <p className="protocolo-paso-ayuda">{paso.ayuda}</p>}
            {!hecho && paso.plantilla && (
              <AccionesMensaje texto={textoPlantilla(paso.plantilla, lead)} telefono={lead.telefono} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Todos los mensajes del protocolo y los casos de éxito, plegados y ya con los
// datos del lead. Lo que va entre corchetes se completa antes de enviar.
export function MensajesWhatsApp({ lead }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="protocolo-guion">
      <button type="button" className="secondary-action" onClick={() => setAbierto((v) => !v)}>
        {abierto ? '▾' : '▸'} 💬 Todos los mensajes
      </button>
      {abierto && (
        <div className="protocolo-mensajes">
          {MENSAJES_WHATSAPP.map(({ grupo, mensajes }) => (
            <div key={grupo}>
              <h4 className="protocolo-mensajes-grupo">{grupo}</h4>
              {mensajes.map((m) => {
                const texto = textoPlantilla(m.clave, lead)
                return (
                  <div key={m.clave} className="protocolo-paso">
                    <span className="protocolo-paso-titulo">{m.titulo}</span>{' '}
                    <span className="protocolo-paso-cuando">{m.cuando}</span>
                    <p className="protocolo-mensaje-texto">{texto}</p>
                    <AccionesMensaje texto={texto} telefono={lead.telefono} soloCopiar={m.audio} />
                  </div>
                )
              })}
            </div>
          ))}
          <div>
            <h4 className="protocolo-mensajes-grupo">Casos de éxito (uno al día, el que más encaje)</h4>
            {CASOS_EXITO.map((caso) => {
              const texto = textoCasoExito(caso, lead)
              return (
                <div key={caso.clave} className="protocolo-paso">
                  <span className="protocolo-paso-titulo">{caso.etiqueta}</span>
                  <p className="protocolo-paso-ayuda">{caso.usar}</p>
                  <p className="protocolo-mensaje-texto">{texto}</p>
                  <AccionesMensaje texto={texto} telefono={lead.telefono} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Guion de la llamada plegado, para abrirlo mientras se habla.
export function GuionLlamada() {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="protocolo-guion">
      <button type="button" className="secondary-action" onClick={() => setAbierto((v) => !v)}>
        {abierto ? '▾' : '▸'} 📋 Guion de la llamada
      </button>
      {abierto && (
        <ol className="protocolo-guion-pasos">
          {GUION_LLAMADA.map((bloque) => (
            <li key={bloque.titulo}>
              <strong>{bloque.titulo}</strong> <span className="protocolo-paso-cuando">{bloque.minutos}</span>
              <ul>
                {bloque.frases.map((frase) => <li key={frase}>{frase}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
