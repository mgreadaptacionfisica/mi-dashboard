import { useMemo, useState } from 'react'

function PersonCard({ persona, assignedCount, onEdit }) {
  return (
    <div className="team-card">
      <div className="team-card-header">
        <div>
          <h3>{persona.nombre}</h3>
          <p className="team-role">{persona.rol}</p>
        </div>
        {typeof onEdit === 'function' && (
          <button className="team-edit-btn" type="button" onClick={onEdit}>Editar</button>
        )}
      </div>
      <div className="team-card-body">
        <p><strong>Email:</strong> {persona.email}</p>
        <p><strong>Teléfono:</strong> {persona.telefono}</p>
      </div>
      {typeof assignedCount === 'number' && (
        <div className="team-card-footer">
          <span>{assignedCount} cliente{assignedCount === 1 ? '' : 's'} asignado{assignedCount === 1 ? '' : 's'}</span>
        </div>
      )}
    </div>
  )
}

export default function Equipo({ team, setTeam, clientes }) {
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    rol: '',
    email: '',
    telefono: '',
    area: 'tecnico',
  })
  const isEditing = Boolean(editingMember)

  const clienteCount = useMemo(() => {
    return team.tecnico.reduce((acc, persona) => {
      acc[persona.nombre] = clientes.filter(cliente => cliente.Trabajador === persona.nombre).length
      return acc
    }, {})
  }, [team, clientes])

  const tecnicoCount = team.tecnico.length
  const ventasCount = team.ventas.length

  const handleSubmit = (event) => {
    event.preventDefault()
    const miembroActualizado = {
      nombre: formData.nombre || 'Nuevo miembro',
      rol: formData.rol || (formData.area === 'ventas' ? 'Closer' : 'Especialista'),
      email: formData.email || 'nuevo@mg-group.com',
      telefono: formData.telefono || '+34 600 000 000',
    }

    if (isEditing && editingMember) {
      setTeam(prev => ({
        ...prev,
        [editingMember.area]: prev[editingMember.area].map((item, index) =>
          index === editingMember.index ? miembroActualizado : item
        ),
      }))
    } else {
      setTeam(prev => ({
        ...prev,
        [formData.area]: [miembroActualizado, ...prev[formData.area]],
      }))
    }

    setFormData({ nombre: '', rol: '', email: '', telefono: '', area: 'tecnico' })
    setEditingMember(null)
    setShowModal(false)
  }

  const openNewMemberModal = () => {
    setFormData({ nombre: '', rol: '', email: '', telefono: '', area: 'tecnico' })
    setEditingMember(null)
    setShowModal(true)
  }

  const startEditMember = (area, index) => {
    const persona = team[area][index]
    setFormData({
      nombre: persona.nombre,
      rol: persona.rol,
      email: persona.email,
      telefono: persona.telefono,
      area,
    })
    setEditingMember({ area, index })
    setShowModal(true)
  }

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
            <button className="add-team-btn" onClick={openNewMemberModal}>＋ Añadir miembro</button>
          </div>
          <div className="team-grid">
            {team.tecnico.map((persona, index) => (
              <PersonCard
                key={`${persona.nombre}-${index}`}
                persona={persona}
                assignedCount={clienteCount[persona.nombre] ?? 0}
                onEdit={() => startEditMember('tecnico', index)}
              />
            ))}
          </div>
          <div className="team-summary-bar">
            <span>{tecnicoCount} técnicos activos</span>
            <span>{Object.values(clienteCount).reduce((sum, value) => sum + value, 0)} clientes asignados</span>
          </div>
        </section>

        <section className="team-section">
          <div className="team-section-header">
            <div>
              <h2>Equipo de ventas</h2>
              <p>Cierra clientes y gestiona el pipeline comercial.</p>
            </div>
          </div>
          <div className="team-grid">
            {team.ventas.map((persona, index) => (
              <PersonCard
                key={`${persona.nombre}-${index}`}
                persona={persona}
                onEdit={() => startEditMember('ventas', index)}
              />
            ))}
          </div>
          <div className="team-summary-bar">
            <span>{ventasCount} miembros de ventas</span>
          </div>
        </section>
      </main>

      {showModal && (
        <div className="client-modal-overlay" onClick={() => { setShowModal(false); setEditingMember(null) }}>
          <div className="client-modal" onClick={event => event.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{isEditing ? 'Editar miembro del equipo' : 'Añadir miembro del equipo'}</div>
                <div className="card-subtitle">{isEditing ? 'Actualiza los datos del miembro' : 'Crea un técnico o comercial nuevo para el panel'}</div>
              </div>
              <button className="close-modal-btn" onClick={() => { setShowModal(false); setEditingMember(null) }}>✕</button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <input
                required
                placeholder="Nombre"
                value={formData.nombre}
                onChange={event => setFormData({ ...formData, nombre: event.target.value })}
              />
              <input
                placeholder="Rol"
                value={formData.rol}
                onChange={event => setFormData({ ...formData, rol: event.target.value })}
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={event => setFormData({ ...formData, email: event.target.value })}
              />
              <input
                placeholder="Teléfono"
                value={formData.telefono}
                onChange={event => setFormData({ ...formData, telefono: event.target.value })}
              />
              <select
                value={formData.area}
                onChange={event => setFormData({ ...formData, area: event.target.value })}
              >
                <option value="tecnico">Técnico</option>
                <option value="ventas">Ventas</option>
              </select>
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="primary-action">Guardar miembro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
