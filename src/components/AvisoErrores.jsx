import { useEffect, useState } from 'react'
import { suscribirAvisosGuardado } from '../lib/avisosGuardado'

// Avisos flotantes de "esto NO se ha guardado". Se montan una sola vez en
// InternalApp, así que cubren todas las secciones del panel.
//
// No desaparecen solos a los pocos segundos a propósito: un guardado que
// falla es pérdida de datos, y el usuario tiene que verlo aunque estuviera
// mirando a otro lado. Se cierran a mano.
export default function AvisoErrores() {
  const [avisos, setAvisos] = useState([])

  useEffect(() => suscribirAvisosGuardado((aviso) => {
    // Tope de 4 en pantalla: si algo falla en bucle (Supabase pausado, sin
    // conexión), no tiene sentido tapar el panel con cien avisos iguales.
    setAvisos((prev) => [...prev, aviso].slice(-4))
  }), [])

  if (avisos.length === 0) return null

  const cerrar = (id) => setAvisos((prev) => prev.filter((a) => a.id !== id))

  return (
    <div className="avisos-guardado">
      {avisos.map((a) => (
        <div key={a.id} className="aviso-guardado" role="alert">
          <button type="button" className="aviso-guardado-cerrar" onClick={() => cerrar(a.id)} title="Cerrar">✕</button>
          <strong>⚠️ No se ha guardado</strong>
          <p>
            La base de datos ha rechazado el cambio, así que <strong>lo que ves en pantalla no está
            guardado</strong>. Recarga la página para ver el estado real y avisa a Raúl antes de seguir.
          </p>
          <code>{a.origen}: {a.mensaje}</code>
        </div>
      ))}
    </div>
  )
}
