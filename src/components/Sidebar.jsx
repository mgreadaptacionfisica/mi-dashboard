import { useState } from 'react'
import Logo from '../assets/mg-logo.png'

const TODOS_LOS_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'ventas', icon: '💰', label: 'Ventas' },
  { id: 'clientes', icon: '👥', label: 'Clientes' },
  { id: 'clientes-equipo', icon: '📋', label: 'Seguimiento y Valoración' },
  { id: 'equipo', icon: '👔', label: 'Equipo' },
  { id: 'mi-ficha', icon: '🧑‍💼', label: 'Mi Ficha' },
  { id: 'comunicacion', icon: '💬', label: 'Comunicación' },
  { id: 'finanzas', icon: '💶', label: 'Finanzas' },
  { id: 'onboarding', icon: '✨', label: 'Onboarding' },
  { id: 'operaciones', icon: '⚙️', label: 'Operaciones' },
  { id: 'tareas', icon: '🗒️', label: 'Mis tareas' },
  { id: 'manuales', icon: '📚', label: 'Manuales' },
  { id: 'enlaces', icon: '🔗', label: 'Enlaces de interés' },
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
//
// En escritorio el sidebar sigue fijo a la izquierda, igual que siempre.
// En móvil/tablet (≤768px, ver CSS) se convierte en un cajón que entra
// desde la izquierda: empieza oculto (mobileOpen = false), el botón ☰
// flotante lo abre, y se cierra solo al tocar fuera (overlay) o al elegir
// una sección — así no hay que ir cerrándolo a mano cada vez.
export default function Sidebar({ activeView, onNavigate, seccionesPermitidas = [], rol, email, onLogout, modoDemo = false, onToggleModoDemo }) {
  const navItems = TODOS_LOS_ITEMS.filter(item => seccionesPermitidas.includes(item.id))
  const [mobileOpen, setMobileOpen] = useState(false)

  const navegarYCerrar = (id) => {
    onNavigate(id)
    setMobileOpen(false)
  }

  return (
    <>
      <button
        type="button"
        className="sidebar-mobile-toggle"
        aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        onClick={() => setMobileOpen((prev) => !prev)}
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
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
              onClick={() => navegarYCerrar(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {typeof onToggleModoDemo === 'function' && (
            <button
              type="button"
              onClick={onToggleModoDemo}
              className={`sidebar-demo-btn ${modoDemo ? 'sidebar-demo-btn-on' : ''}`}
              title="Enmascara los datos personales y bloquea el guardado, para enseñar o grabar el panel sin exponer datos reales."
            >
              🕶️ Modo demo: {modoDemo ? 'ON' : 'OFF'}
            </button>
          )}
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
    </>
  )
}
