import { useState } from 'react'
import CalendarioContenido from './CalendarioContenido'
import SOPs from './SOPs'

export default function Operaciones({
  contenidoIdeas = [], setContenidoIdeas,
  team,
  sops = [], setSops,
}) {
  const [activeTab, setActiveTab] = useState('calendario')
  const equipoContenido = team?.contenido || []

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Operaciones</div>
          <div className="topbar-subtitle">
            {activeTab === 'calendario' ? 'Calendario de contenido para redes sociales' : 'SOPs y protocolos del equipo'}
          </div>
        </div>
      </header>

      <main className="page-content">
        <div className="tabs-bar">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'calendario' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('calendario')}
          >
            📅 Calendario de contenido
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'sops' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('sops')}
          >
            📋 SOPs
          </button>
        </div>

        {activeTab === 'calendario' && (
          <CalendarioContenido ideas={contenidoIdeas} setIdeas={setContenidoIdeas} equipoContenido={equipoContenido} />
        )}
        {activeTab === 'sops' && (
          <SOPs sops={sops} setSops={setSops} />
        )}
      </main>
    </>
  )
}
