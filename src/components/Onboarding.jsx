import { useEffect, useMemo, useState } from 'react'
import Logo from '../assets/mg-logo.png'

const STORAGE_KEY = 'mg-onboarding-progress'

const steps = [
  {
    id: 'whatsapp',
    number: '01',
    icon: '💬',
    title: 'Entra al WhatsApp',
    description: 'Aquí será nuestra comunicación principal: dudas, feedback, vídeos e incidencias.',
    cta: 'Abrir WhatsApp',
    href: 'https://wa.me/34685635028',
  },
  {
    id: 'harbiz',
    number: '02',
    icon: '🚀',
    title: 'Regístrate en Harbiz',
    description: 'Tu app de entrenamiento: aquí gestionarás tu programa, formularios, vídeos y seguimiento.',
    cta: 'Registrarme en Harbiz',
    href: 'https://app.harbiz.io/checkout-form/mgrf?lang=es&product=invitation',
  },
  {
    id: 'tut-app',
    number: '03',
    icon: '🎬',
    title: 'Tutorial: la app móvil, paso a paso',
    description: 'Aprende a moverte por la app antes de tu primer entrenamiento.',
    cta: 'Ver tutorial',
    href: 'https://www.loom.com/share/3b6f4e6acc4b4090860f27debfdbc013',
  },
  {
    id: 'tut-forms',
    number: '04',
    icon: '📝',
    title: 'Tutorial: formularios iniciales y de dolor',
    description: 'Cómo rellenar correctamente tus formularios.',
    cta: 'Ver tutorial',
    href: 'https://www.loom.com/share/d01055c3e5d44dbcad7352ccd522a8b2',
  },
  {
    id: 'tut-movilidad',
    number: '05',
    icon: '🎥',
    title: 'Tutorial: grabar tu valoración de movilidad',
    description: 'Cómo grabar los vídeos que necesitamos para tu evaluación funcional.',
    cta: 'Ver tutorial',
    href: 'https://www.loom.com/share/ca22bdbafc2a42a79dcafd4a13172b8b',
  },
  {
    id: 'tut-rutina',
    number: '06',
    icon: '🧘',
    title: 'Tutorial: rutina diaria para reducir dolor y mejorar movilidad',
    description: 'Tu rutina base mientras arrancamos con el programa.',
    cta: 'Ver tutorial',
    href: 'https://www.loom.com/share/fa4fb4abdf56430db69ae222844136e6',
  },
  {
    id: 'tut-entrenamiento',
    number: '07',
    icon: '🏋️',
    title: 'Tutorial: cómo rellenar y empezar tu entrenamiento',
    description: 'Últimos pasos antes de tu primera sesión.',
    cta: 'Ver tutorial',
    href: 'https://www.loom.com/share/42603ee595964ddfa36336017e2108e2',
  },
  {
    id: 'verificacion',
    number: '08',
    icon: '✅',
    title: 'Confirma que has llegado hasta aquí',
    description: '¿Has leído toda la guía? Escríbeme por WhatsApp: "¿Cuál es la capital de España?"',
    cta: 'Responder por WhatsApp',
    href: 'https://wa.me/34685635028',
  },
]

const fases = [
  {
    tag: 'Fase 1',
    title: 'Reducción de irritabilidad',
    desc: 'Tolerar el movimiento, reducir la amenaza percibida por tu cuerpo y recuperar la capacidad básica.',
  },
  {
    tag: 'Fase 2',
    title: 'Desarrollo de capacidad',
    desc: 'Construir fuerza, control motor y tolerancia progresiva a la carga.',
  },
  {
    tag: 'Fase 3',
    title: 'Exposición deportiva',
    desc: 'Trabajar velocidad, potencia y las demandas reales de tu deporte.',
  },
  {
    tag: 'Fase 4',
    title: 'Rendimiento y prevención',
    desc: 'Consolidar lo ganado, mantenerlo en el tiempo y prevenir recaídas.',
  },
]

const deberes = [
  { title: 'Cumple el plan', desc: 'Tu mejora depende directamente de tu adherencia al programa.' },
  { title: 'Registra tus datos correctamente', desc: 'Dolor, cargas, sensaciones, formularios y feedback.' },
  { title: 'Comunicación honesta', desc: 'Avísame de molestias, cambios, lesiones o limitaciones apenas ocurran.' },
  { title: 'Ten paciencia con el proceso', desc: 'No buscamos soluciones mágicas; la readaptación requiere tiempo.' },
  { title: 'No modifiques el programa sin avisar', desc: 'Ni volumen, ni intensidad, ni ejercicios nuevos, sin comentármelo antes.' },
  { title: 'Responsabilidad compartida', desc: 'El equipo guía. Tú ejecutas.' },
]

export default function Onboarding() {
  const [completed, setCompleted] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      setCompleted(saved)
    } catch (e) {
      // ignore corrupt storage
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed))
  }, [completed, loaded])

  const toggleStep = (id) => {
    setCompleted((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const progress = useMemo(() => {
    return Math.round((completed.length / steps.length) * 100)
  }, [completed])

  const checklistSteps = steps.filter((s) => s.id !== 'verificacion')
  const finalStep = steps.find((s) => s.id === 'verificacion')
  const nextStep = steps.find((step) => !completed.includes(step.id))

  return (
    <>
      <header className="topbar onboarding-topbar">
        <div>
          <div className="topbar-title">Onboarding</div>
          <div className="topbar-subtitle">Tu camino de arranque con MG Group</div>
        </div>
        <div className="topbar-right">
          <span className="topbar-pill">{progress}% completado</span>
        </div>
      </header>

      <main className="page-content onboarding-page">
        <section className="onboarding-hero">
          <div className="onboarding-hero-copy">
            <img src={Logo} alt="MG Group" className="onboarding-logo" />
            <span className="hero-eyebrow">MG Group • onboarding</span>
            <h2>Bienvenido/a a MG Group</h2>
            <p>
              "De la lesión al rendimiento." Este no es solo un programa de ejercicios: es un
              proceso estructurado para que vuelvas a entrenar, competir y vivir con confianza.
              Estos son tus pasos para arrancar — hazlos en orden.
            </p>
            <div className="hero-actions">
              {nextStep ? (
                <a className="primary-action" href={nextStep.href} target="_blank" rel="noopener noreferrer">
                  Continuar con: {nextStep.title}
                </a>
              ) : (
                <span className="primary-action">¡Todo listo! ✓</span>
              )}
              <span className="hero-chip">⏱️ Menos de 10 minutos</span>
            </div>
          </div>

          <div className="onboarding-progress-panel">
            <div className="progress-ring">
              <span>{progress}%</span>
            </div>
            <div>
              <strong>{completed.length} de {steps.length} pasos completados</strong>
              <p>Tu progreso se guarda en este navegador para que avances con tranquilidad.</p>
            </div>
          </div>
        </section>

        <section className="plan-section">
          <div className="plan-section-header">
            <span className="hero-eyebrow" style={{ color: '#6ee0a3' }}>Tu plan de acción</span>
            <h2>Qué vas a conseguir y qué necesito de ti</h2>
            <p>
              Antes de nada, quiero que sepas exactamente qué vas a conseguir, cómo son las fases del
              proceso y cuál es tu compromiso conmigo. Aquí tienes el resumen — y también puedes
              descargarlo completo en PDF para leerlo con calma.
            </p>
            <a
              className="plan-pdf-btn"
              href="/guia-onboarding-mg.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              📄 Descargar guía completa en PDF
            </a>
          </div>

          <h3 className="plan-subtitle">Las 4 fases de tu proceso</h3>
          <div className="plan-grid">
            {fases.map((f) => (
              <div key={f.tag} className="plan-fase-card">
                <span className="plan-fase-tag">{f.tag}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>

          <h3 className="plan-subtitle">Tu compromiso y tus deberes</h3>
          <div className="plan-deberes-list">
            {deberes.map((d) => (
              <div key={d.title} className="plan-deber-card">
                <p className="plan-deber-title">{d.title}</p>
                <p className="plan-deber-desc">{d.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="onboarding-steps">
          {checklistSteps.map((step) => {
            const done = completed.includes(step.id)
            return (
              <article key={step.id} className={`onboarding-step ${done ? 'done' : ''}`}>
                <div className="onboarding-step-number">{step.number}</div>
                <div className="onboarding-step-body">
                  <div className="onboarding-step-head">
                    <div className="onboarding-step-icon">{step.icon}</div>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                  </div>
                  <div className="onboarding-step-footer">
                    <a
                      className="onboarding-step-cta"
                      href={step.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {step.cta} ↗
                    </a>
                    <button
                      type="button"
                      className={`onboarding-toggle-btn ${done ? 'done' : ''}`}
                      onClick={() => toggleStep(step.id)}
                    >
                      {done ? '✓ Hecho' : 'Marcar como hecho'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        {finalStep && (
          <section className="onboarding-final">
            {(() => {
              const done = completed.includes(finalStep.id)
              return (
                <article className={`onboarding-step onboarding-final-step ${done ? 'done' : ''}`}>
                  <div className="onboarding-step-number">{finalStep.number}</div>
                  <div className="onboarding-step-body">
                    <div className="onboarding-step-head">
                      <div className="onboarding-step-icon">{finalStep.icon}</div>
                      <div>
                        <h3>{finalStep.title}</h3>
                        <p>{finalStep.description}</p>
                      </div>
                    </div>
                    <div className="onboarding-step-footer">
                      <a
                        className="onboarding-step-cta"
                        href={finalStep.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {finalStep.cta} ↗
                      </a>
                      <button
                        type="button"
                        className={`onboarding-toggle-btn ${done ? 'done' : ''}`}
                        onClick={() => toggleStep(finalStep.id)}
                      >
                        {done ? '✓ Hecho' : 'Marcar como hecho'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })()}
          </section>
        )}
      </main>
    </>
  )
}
