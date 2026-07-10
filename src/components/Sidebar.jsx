import Logo from '../assets/mg-logo.png'

// Finanzas queda oculta por defecto: son datos personales de Raúl (ingresos/
// gastos), y el resto del equipo sigue usando el panel sin login, igual que
// siempre. Solo aparece cuando hay sesión admin iniciada.
export default function Sidebar({ activeView, onNavigate, isAdmin, onLoginClick, onLogout }) {
  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'ventas', icon: '💰', label: 'Ventas' },
    { id: 'clientes', icon: '👥', label: 'Clientes' },
    { id: 'equipo', icon: '👔', label: 'Equipo' },
    { id: 'comunicacion', icon: '💬', label: 'Comunicación' },
    ...(isAdmin ? [{ id: 'finanzas', icon: '💶', label: 'Finanzas' }] : []),
    { id: 'onboarding', icon: '✨', label: 'Onboarding' },
    { id: 'operaciones', icon: '⚙️', label: 'Operaciones' },
  ]

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
        {isAdmin ? (
          <button
            type="button"
            onClick={onLogout}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, font: 'inherit' }}
          >
            🔓 Admin · Cerrar sesión
          </button>
        ) : (
          <button
            type="button"
            onClick={onLoginClick}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, font: 'inherit' }}
          >
            🔒 Acceso admin
          </button>
        )}
        <div style={{ marginTop: 4 }}>v1.0.0</div>
      </div>
    </aside>
  )
}
