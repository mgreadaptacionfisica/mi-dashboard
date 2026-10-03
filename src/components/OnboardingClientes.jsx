import { useState } from 'react'
import { ACCION_CONTACTO, ETIQUETA_PASO, pendientesDeContactar } from '../utils/onboardingEstado'
import { cuestionarioDeCliente } from '../utils/cuestionarioPrevio'
import { imprimirContrato } from '../utils/contrato'
import { marcarContactadoOnboarding } from '../lib/queries/onboardingProgreso'

// Arriba de Clientes: en qué punto del onboarding va cada cliente nuevo.
// Lo importante es la primera fila de la lista: los que YA HAN TERMINADO y
// esperan a que Raúl les escriba (o cree el grupo, en high ticket). Esos
// abren el panel solos; marcar "hecho" los quita del aviso del Dashboard.
//
// Los ya contactados se esconden por defecto: son historia.
export default function OnboardingClientes({ estados = [], cuestionarios = [], setOnboardingProgreso, miEmail }) {
  const listos = pendientesDeContactar(estados)
  const [abierto, setAbierto] = useState(listos.length > 0)
  const [verTodos, setVerTodos] = useState(false)
  if (!estados.length) return null

  const visibles = verTodos ? estados : estados.filter((e) => !e.contactado)
  const enCurso = estados.filter((e) => !e.terminado && !e.contactado).length

  const marcar = (e, hecho) => {
    const evento = {
      id: `onb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      clienteNombre: e.clienteNombre,
      variante: e.variante,
      paso: 'contactado',
      hecho,
      por: miEmail || '',
      creadoEn: new Date().toISOString(),
    }
    marcarContactadoOnboarding(evento)
    if (setOnboardingProgreso) setOnboardingProgreso((prev) => [...prev, evento])
  }

  return (
    <div className="card onb-clientes">
      <button type="button" className="contratos-firmados-cab" onClick={() => setAbierto((v) => !v)}>
        <span>🚀 Onboarding de clientes nuevos</span>
        {listos.length > 0 && <span className="onb-badge-listo">{listos.length} {listos.length === 1 ? 'ha terminado' : 'han terminado'}: te toca escribir</span>}
        {enCurso > 0 && <span className="onb-badge">{enCurso} en curso</span>}
        <span className="contratos-flecha">{abierto ? '▲' : '▼'}</span>
      </button>
      {abierto && (
        <div className="onb-lista">
          {visibles.length === 0 && <p className="onb-vacio">Nadie a medias. Los ya contactados están ocultos.</p>}
          {visibles.map((e) => {
            const cuestionario = cuestionarioDeCliente(cuestionarios, e.clienteNombre)
            const pct = Math.round((e.hechos / e.total) * 100)
            return (
              <div key={e.clienteNombre} className={`onb-fila ${e.terminado && !e.contactado ? 'onb-fila-lista' : ''}`}>
                <div className="onb-fila-nombre">
                  <strong>{e.clienteNombre}</strong>
                  <span className={`ob-tag ${e.variante === 'premium' ? 'ob-tag-high' : 'ob-tag-low'}`}>{e.variante === 'premium' ? 'High' : 'Low'}</span>
                </div>
                <div className="onb-fila-progreso">
                  <div className="cp-progreso-barra"><span style={{ width: `${pct}%` }} /></div>
                  <span>{e.hechos}/{e.total}</span>
                </div>
                <div className="onb-fila-detalle">
                  {e.variante === 'premium' && (
                    e.contrato
                      ? <button type="button" className="onb-chip onb-chip-ok" onClick={() => imprimirContrato(e.contrato)}>✍️ Contrato ✓</button>
                      : <span className="onb-chip">✍️ Sin firmar</span>
                  )}
                  {cuestionario && <span className="onb-chip onb-chip-ok">📝 Cuestionario ✓</span>}
                  {!e.terminado && e.pendientes.length > 0 && (
                    <span className="onb-falta">Falta: {e.pendientes.map((p) => ETIQUETA_PASO[p] || p).join(', ')}</span>
                  )}
                  {e.ultimo && <span className="onb-falta">Último movimiento: {new Date(e.ultimo).toLocaleDateString('es-ES')}</span>}
                </div>
                <div className="onb-fila-accion">
                  {e.contactado ? (
                    <button type="button" className="row-action-btn" onClick={() => marcar(e, false)}>↩︎ Deshacer</button>
                  ) : (
                    <button
                      type="button"
                      className={e.terminado ? 'primary-action' : 'row-action-btn'}
                      title={e.terminado ? '' : 'Aún no ha terminado, pero puedes marcarlo igual'}
                      onClick={() => marcar(e, true)}
                    >
                      ✓ {ACCION_CONTACTO[e.variante]}: hecho
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          <button type="button" className="onb-ver-todos" onClick={() => setVerTodos((v) => !v)}>
            {verTodos ? 'Ocultar los ya contactados' : 'Ver también los ya contactados'}
          </button>
        </div>
      )}
    </div>
  )
}
