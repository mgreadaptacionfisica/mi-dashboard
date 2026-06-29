import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Clientes from './components/Clientes'
import Equipo from './components/Equipo'
import clientesData from './data/clientes'
import teamData from './data/team'

// Aquí puedes añadir más vistas/páginas
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

export default function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [clientes, setClientes] = useState(clientesData)
  const [team, setTeam] = useState(teamData)

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':    return <Dashboard />
      case 'ventas':       return <PlaceholderView name="Ventas" />
      case 'clientes':     return <Clientes clientes={clientes} setClientes={setClientes} team={team} />
      case 'equipo':       return <Equipo team={team} setTeam={setTeam} clientes={clientes} />
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
