import { useState } from 'react'
import CalendarioContenido from './CalendarioContenido'
import SOPs from './SOPs'
import VideosParaEditar from './VideosParaEditar'

const SUBTITULOS = {
  calendario: 'Calendario de contenido para redes sociales',
  editar: 'Vídeos en edición asignados a cada persona',
  sops: 'SOPs y protocolos del equipo',
}

// El equipo técnico solo necesita ver los SOPs/protocolos (los suyos de
// entrenamiento/valoración) — el calendario de contenido y la cola de
// edición son cosas del equipo de contenido, no le aportan nada y solo
// generarían confusión. Admin y contenido siguen viendo las 3 pestañas.
const TABS_POR_ROL = {
  admin: ['calendario', 'editar', 'sops'],
  contenido: ['calendario', 'editar', 'sops'],
  tecnico: ['sops'],
}

export default function Operaciones({
  contenidoIdeas = [], setContenidoIdeas,
  team,
  sops = [], setSops,
  miEmail, rol,
}) {
  const tabsDisponibles = TABS_POR_ROL[rol] || TABS_POR_ROL.admin
  const [activeTab, setActiveTab] = useState(tabsDisponibles[0])
  const equipoContenido = team?.contenido || []
  const puedeEditarSops = rol !== 'tecnico'

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Operaciones</div>
          <div className="topbar-subtitle">{SUBTITULOS[activeTab]}</div>
        </div>
      </header>

      <main className="page-content">
        {tabsDisponibles.length > 1 && (
          <div className="tabs-bar">
            {tabsDisponibles.includes('calendario') && (
              <button
                type="button"
                className={`tab-btn ${activeTab === 'calendario' ? 'tab-btn-active' : ''}`}
                onClick={() => setActiveTab('calendario')}
              >
                📅 Calendario de contenido
              </button>
            )}
            {tabsDisponibles.includes('editar') && (
              <button
                type="button"
                className={`tab-btn ${activeTab === 'editar' ? 'tab-btn-active' : ''}`}
                onClick={() => setActiveTab('editar')}
              >
                🎬 Para editar
              </button>
            )}
            {tabsDisponibles.includes('sops') && (
              <button
                type="button"
                className={`tab-btn ${activeTab === 'sops' ? 'tab-btn-active' : ''}`}
                onClick={() => setActiveTab('sops')}
              >
                📋 SOPs
              </button>
            )}
          </div>
        )}

        {activeTab === 'calendario' && (
          <CalendarioContenido ideas={contenidoIdeas} setIdeas={setContenidoIdeas} equipoContenido={equipoContenido} />
        )}
        {activeTab === 'editar' && (
          <VideosParaEditar ideas={contenidoIdeas} setIdeas={setContenidoIdeas} equipoContenido={equipoContenido} miEmail={miEmail} rol={rol} />
        )}
        {activeTab === 'sops' && (
          <SOPs sops={sops} setSops={setSops} puedeEditar={puedeEditarSops} />
        )}
      </main>
    </>
  )
}
