import { useEffect, useMemo, useState } from 'react'

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

  const nextStep = steps.find((step) => !completed.includes(step.id))

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Onboarding</div>
          <div className="topbar-subtitle">Tu camino de arranque con MG Readaptación Física</div>
        </div>
        <div className="topbar-right">
          <span className="topbar-pill">{progress}% completado</span>
        </div>
      </header>

      <main className="page-content onboarding-page">
        <section className="onboarding-hero">
          <div className="onboarding-hero-copy">
            <span className="hero-eyebrow">MG Readaptación Física • onboarding</span>
            <h2>Bienvenido/a a MG Readaptación Física</h2>
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

        <section className="onboarding-steps">
          {steps.map((step) => {
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
      </main>
    </>
  )
}
