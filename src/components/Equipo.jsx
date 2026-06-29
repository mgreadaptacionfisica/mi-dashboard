import team from '../data/team'

function PersonCard({ persona }) {
  return (
    <div className="team-card">
      <div className="team-card-header">
        <div>
          <h3>{persona.nombre}</h3>
          <p className="team-role">{persona.rol}</p>
        </div>
      </div>
      <div className="team-card-body">
        <p><strong>Email:</strong> {persona.email}</p>
        <p><strong>Teléfono:</strong> {persona.telefono}</p>
      </div>
    </div>
  )
}

export default function Equipo() {
  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Equipo</div>
          <div className="topbar-subtitle">Técnico y ventas</div>
        </div>
      </header>

      <main className="page-content">
        <section className="team-section">
          <div className="team-section-header">
            <div>
              <h2>Equipo técnico</h2>
              <p>Entrenador, nutricionista, psicólogo y fisioterapeuta.</p>
            </div>
          </div>
          <div className="team-grid">
            {team.tecnico.map(persona => (
              <PersonCard key={persona.nombre} persona={persona} />
            ))}
          </div>
        </section>

        <section className="team-section">
          <div className="team-section-header">
            <div>
              <h2>Equipo de ventas</h2>
              <p>Closer y setter.</p>
            </div>
          </div>
          <div className="team-grid">
            {team.ventas.map(persona => (
              <PersonCard key={persona.nombre} persona={persona} />
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
