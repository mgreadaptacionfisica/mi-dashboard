import Logo from '../assets/mg-logo.png'

export default function Sidebar({ activeView, onNavigate }) {
  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'ventas', icon: '💰', label: 'Ventas' },
    { id: 'clientes', icon: '👥', label: 'Clientes' },
    { id: 'equipo', icon: '👔', label: 'Equipo' },
    { id: 'finanzas', icon: '💶', label: 'Finanzas' },
    { id: 'onboarding', icon: '✨', label: 'Onboarding' },
    { id: 'operaciones', icon: '⚙️', label: 'Operaciones' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={Logo} alt="MG Readaptación Física logo" className="brand-mark" />
        <div>
          <h1>MG Readaptación Física</h1>
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
        v1.0.0
      </div>
    </aside>
  )
}
