import { useState } from 'react'
import { DURACIONES, FORMAS_PAGO, METODOS_PAGO, enlaceOnboarding } from '../utils/contrato'

// Sección "Onboarding" del panel (admin y closer): de aquí salen los enlaces
// que la closer le manda al cliente al cerrar la venta. Antes esta sección
// pintaba el onboarding tal cual; ahora hay dos (low y high ticket) y lo útil
// es generar el enlace bueno de cada uno, no verlo.
//
// El nombre va SIEMPRE que se pueda: el contrato se enlaza con la ficha del
// cliente por nombre, igual que el resto del historial, y si lo teclea el
// cliente a su manera ("Jose" vs "José") queda descolgado.

function BotonesEnlace({ url }) {
  const [copiado, setCopiado] = useState(false)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch (e) {
      window.prompt('Copia el enlace:', url)
    }
  }
  return (
    <div className="ob-enlace">
      <code className="ob-enlace-url">{url}</code>
      <div className="ob-enlace-botones">
        <button type="button" className="primary-action" onClick={copiar}>
          {copiado ? '✓ Copiado' : '📋 Copiar enlace'}
        </button>
        <a className="secondary-action" href={url} target="_blank" rel="noopener noreferrer">Abrir ↗</a>
      </div>
    </div>
  )
}

export default function OnboardingEnlaces() {
  const [d, setD] = useState({ formaPago: 'completo' })
  const set = (campo) => (e) => setD((prev) => ({ ...prev, [campo]: e.target.value }))

  // Las condiciones solo viajan en el enlace de high ticket, que es el que
  // lleva contrato. En el de low ticket basta con el nombre.
  const premium = {
    ...d,
    ...(d.formaPago === 'plazos' ? {} : { primerPago: '', numPlazos: '', importePlazo: '' }),
  }

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Onboarding</div>
          <div className="topbar-subtitle">Enlaces para mandar al cliente al cerrar la venta</div>
        </div>
      </header>

      <main className="page-content">
        <div className="card ob-card">
          <h3>1. ¿Para quién es?</h3>
          <label className="ob-campo">
            <span>Nombre y apellidos del cliente — exactamente como está (o va a estar) en su ficha</span>
            <input value={d.nombre || ''} onChange={set('nombre')} placeholder="Ej.: Laura Gómez Ruiz" />
          </label>
        </div>

        <div className="ob-grid">
          <div className="card ob-card">
            <span className="ob-tag ob-tag-low">Low ticket</span>
            <h3>Onboarding estándar</h3>
            <p className="ob-desc">
              Registro en Harbiz y los tutoriales (incluido el de grabar la valoración de movilidad). Sin contrato.
              Raúl le escribe por WhatsApp.
            </p>
            <BotonesEnlace url={enlaceOnboarding('/onboarding', { nombre: d.nombre })} />
          </div>

          <div className="card ob-card">
            <span className="ob-tag ob-tag-high">High ticket</span>
            <h3>Onboarding premium + contrato</h3>
            <p className="ob-desc">
              Contrato para firmar online, Harbiz y tutoriales (sin el de movilidad: la valoración la hace el fisio
              por videollamada). Termina avisando de que se le crea el grupo de WhatsApp.
            </p>

            <p className="ob-desc"><strong>Condiciones del contrato</strong> — lo que rellenes aquí le sale ya puesto y bloqueado; lo que dejes vacío lo rellena él.</p>
            <div className="ob-form">
              <label className="ob-campo">
                <span>Duración</span>
                <select value={d.duracion || ''} onChange={set('duracion')}>
                  <option value="">— que elija él —</option>
                  {DURACIONES.map((o) => <option key={o.id} value={o.id}>{o.label} ({o.detalle})</option>)}
                </select>
              </label>
              <label className="ob-campo">
                <span>Importe total (€)</span>
                <input inputMode="decimal" value={d.importe || ''} onChange={set('importe')} />
              </label>
              <label className="ob-campo">
                <span>Forma de pago</span>
                <select value={d.formaPago || ''} onChange={set('formaPago')}>
                  {FORMAS_PAGO.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </label>
              <label className="ob-campo">
                <span>Método de pago</span>
                <select value={d.metodoPago || ''} onChange={set('metodoPago')}>
                  <option value="">— que elija él —</option>
                  {METODOS_PAGO.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </label>
              {d.formaPago === 'plazos' && (
                <>
                  <label className="ob-campo">
                    <span>Primer pago (€)</span>
                    <input inputMode="decimal" value={d.primerPago || ''} onChange={set('primerPago')} />
                  </label>
                  <label className="ob-campo">
                    <span>Nº de plazos</span>
                    <input inputMode="numeric" value={d.numPlazos || ''} onChange={set('numPlazos')} />
                  </label>
                  <label className="ob-campo">
                    <span>Importe de cada plazo (€)</span>
                    <input inputMode="decimal" value={d.importePlazo || ''} onChange={set('importePlazo')} />
                  </label>
                </>
              )}
            </div>
            <BotonesEnlace url={enlaceOnboarding('/onboarding-premium', premium)} />
          </div>
        </div>
      </main>
    </>
  )
}
