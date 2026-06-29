export default function Sidebar({ activeView, onNavigate }) {
  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'ventas', icon: '💰', label: 'Ventas' },
    { id: 'clientes', icon: '👥', label: 'Clientes' },
    { id: 'operaciones', icon: '⚙️', label: 'Operaciones' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="brand-mark">MG</div>
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
        v1.0.0
      </div>
    </aside>
  )
}
