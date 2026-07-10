import Logo from '../assets/mg-logo.png'

const TODOS_LOS_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'ventas', icon: '💰', label: 'Ventas' },
  { id: 'clientes', icon: '👥', label: 'Clientes' },
  { id: 'equipo', icon: '👔', label: 'Equipo' },
  { id: 'comunicacion', icon: '💬', label: 'Comunicación' },
  { id: 'finanzas', icon: '💶', label: 'Finanzas' },
  { id: 'onboarding', icon: '✨', label: 'Onboarding' },
  { id: 'operaciones', icon: '⚙️', label: 'Operaciones' },
  { id: 'tareas', icon: '🗒️', label: 'Mis tareas' },
  { id: 'manuales', icon: '📚', label: 'Manuales' },
]

const ETIQUETA_ROL = {
  admin: 'Admin',
  closer: 'Closer',
  tecnico: 'Técnico',
  contenido: 'Contenido',
}

// El panel ahora exige sesión iniciada para todo el mundo (ver App.jsx),
// así que aquí solo se filtra qué secciones ve cada rol — nada de login
// desde aquí, eso ya pasó antes de llegar al Sidebar.
export default function Sidebar({ activeView, onNavigate, seccionesPermitidas = [], rol, email, onLogout }) {
  const navItems = TODOS_LOS_ITEMS.filter(item => seccionesPermitidas.includes(item.id))

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={Logo} alt="MG Group logo" className="brand-mark" />
        <div>
          <h1>MG Group</h1>
          <p>Panel de control</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">Principal</span>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
          {ETIQUETA_ROL[rol] || 'Sin rol'}{email ? ` · ${email}` : ''}
        </div>
        <button
          type="button"
          onClick={onLogout}
          style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, font: 'inherit' }}
        >
          🔓 Cerrar sesión
        </button>
        <div style={{ marginTop: 4 }}>v1.0.0</div>
      </div>
    </aside>
  )
}
