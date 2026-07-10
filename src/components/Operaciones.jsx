import { useState } from 'react'
import CalendarioContenido from './CalendarioContenido'
import SOPs from './SOPs'
import VideosParaEditar from './VideosParaEditar'

const SUBTITULOS = {
  calendario: 'Calendario de contenido para redes sociales',
  editar: 'Vídeos en edición asignados a cada persona',
  sops: 'SOPs y protocolos del equipo',
}

export default function Operaciones({
  contenidoIdeas = [], setContenidoIdeas,
  team,
  sops = [], setSops,
  miEmail, rol,
}) {
  const [activeTab, setActiveTab] = useState('calendario')
  const equipoContenido = team?.contenido || []

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Operaciones</div>
          <div className="topbar-subtitle">{SUBTITULOS[activeTab]}</div>
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
            className={`tab-btn ${activeTab === 'editar' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('editar')}
          >
            🎬 Para editar
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
        {activeTab === 'editar' && (
          <VideosParaEditar ideas={contenidoIdeas} setIdeas={setContenidoIdeas} equipoContenido={equipoContenido} miEmail={miEmail} rol={rol} />
        )}
        {activeTab === 'sops' && (
          <SOPs sops={sops} setSops={setSops} />
        )}
      </main>
    </>
  )
}
