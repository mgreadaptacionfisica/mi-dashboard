import { useState } from 'react'
import { textoPlantilla, enlaceWhatsApp, GUION_LLAMADA } from '../utils/protocoloLlamada'

// Lista de pasos del protocolo de llamada (antes de la llamada o del
// seguimiento de 48 h, según `pasos`). Cada paso es una casilla; los que son
// un mensaje llevan "💬 WhatsApp" (abre el chat del lead con la plantilla
// como borrador, no la envía) y "Copiar". Marcar la casilla es aparte a
// propósito: abrir el chat no significa que se haya mandado.
export default function ProtocoloLlamada({ pasos, estado, onToggle, lead }) {
  const [copiado, setCopiado] = useState(null)

  const copiar = async (clave) => {
    const texto = textoPlantilla(clave, lead)
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(clave)
      setTimeout(() => setCopiado(null), 1800)
    } catch (e) {
      window.prompt('Copia el mensaje:', texto)
    }
  }

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
              <div className="protocolo-paso-acciones">
                <a className="secondary-action" href={enlaceWhatsApp(lead.telefono, textoPlantilla(paso.plantilla, lead))}
                  target="_blank" rel="noreferrer">💬 WhatsApp</a>
                <button type="button" className="secondary-action" onClick={() => copiar(paso.plantilla)}>
                  {copiado === paso.plantilla ? '✓ Copiado' : 'Copiar'}
                </button>
                {!lead.telefono && <span className="protocolo-paso-ayuda">Sin teléfono en la ficha: tendrás que elegir el chat.</span>}
              </div>
            )}
          </div>
        )
      })}
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
