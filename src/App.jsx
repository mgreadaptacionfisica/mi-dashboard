import { Suspense, lazy, useEffect, useState } from 'react'
import Onboarding from './components/Onboarding'

// Rutas públicas: se sirven solas, sin sidebar ni el resto del panel interno,
// y sin cargar los módulos que contienen datos de clientes.
const PUBLIC_PATHS = {
  '/onboarding': 'onboarding',
}

const isPublicRoute = Object.keys(PUBLIC_PATHS).includes(window.location.pathname)

// Componentes internos cargados solo bajo demanda (code-splitting),
// para que la vista pública /onboarding no incluya sus datos en el bundle descargado.
const Sidebar = lazy(() => import('./components/Sidebar'))
const Dashboard = lazy(() => import('./components/Dashboard'))
const Clientes = lazy(() => import('./components/Clientes'))
const Equipo = lazy(() => import('./components/Equipo'))
const clientesDataPromise = () => import('./data/clientes')
const teamDataPromise = () => import('./data/team')

function PlaceholderView({ name }) {
  return (
    <>
      <header className="topbar">
        <div className="topbar-title">{name}</div>
      </header>
      <main className="page-content">
        <div className="loading-state" style={{ color: '#94a3b8' }}>
          <span style={{ fontSize: 40 }}>🚧</span>
          <span>Vista "{name}" — próximamente</span>
        </div>
      </main>
    </>
  )
}

function PublicOnboardingPage() {
  return (
    <div className="app-layout app-layout-public">
      <div className="main-content main-content-public">
        <Onboarding />
      </div>
    </div>
  )
}

function InternalApp() {
  const [activeView, setActiveView] = useState('dashboard')
  const [clientes, setClientes] = useState([])
  const [team, setTeam] = useState([])
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([clientesDataPromise(), teamDataPromise()]).then(([c, t]) => {
      if (cancelled) return
      setClientes(c.default)
      setTeam(t.default)
      setDataLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':    return <Dashboard />
      case 'ventas':       return <PlaceholderView name="Ventas" />
      case 'clientes':     return <Clientes clientes={clientes} setClientes={setClientes} team={team} />
      case 'equipo':       return <Equipo team={team} setTeam={setTeam} clientes={clientes} />
      case 'onboarding':   return <Onboarding />
      case 'operaciones':  return <PlaceholderView name="Operaciones" />
      default:             return <Dashboard />
    }
  }

  return (
    <div className="app-layout">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <div className="main-content">
        {renderView()}
      </div>
    </div>
  )
}

export default function App() {
  if (isPublicRoute) {
    // Ruta pública: /onboarding. Sin Sidebar, sin datos de clientes cargados.
    return (
      <Suspense fallback={null}>
        <PublicOnboardingPage />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<div className="loading-state">Cargando…</div>}>
      <InternalApp />
    </Suspense>
  )
}
