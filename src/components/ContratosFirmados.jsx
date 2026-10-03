import { useState } from 'react'
import { DURACIONES, formatoEuros, fechaLarga, imprimirContrato } from '../utils/contrato'
import { normalizaNombre } from '../utils/cuestionarioPrevio'

// Lista de contratos firmados online (onboarding premium y /contrato), arriba
// de Clientes. Plegada por defecto: es para consultar y descargar, no una
// tarea. Los que no casan por nombre con ninguna ficha se marcan, porque esos
// no salen en el botón 📄 de la fila del cliente y es fácil perderlos.
export default function ContratosFirmados({ contratos = [], clientes = [] }) {
  const [abierto, setAbierto] = useState(false)
  if (!contratos.length) return null

  const nombres = new Set(clientes.map((c) => normalizaNombre(c.Nombre)))
  const huerfanos = contratos.filter((c) => !nombres.has(normalizaNombre(c.clienteNombre))).length

  return (
    <div className="card contratos-firmados">
      <button type="button" className="contratos-firmados-cab" onClick={() => setAbierto((v) => !v)}>
        <span>📄 Contratos firmados ({contratos.length})</span>
        {huerfanos > 0 && <span className="contratos-aviso">{huerfanos} sin ficha con ese nombre</span>}
        <span className="contratos-flecha">{abierto ? '▲' : '▼'}</span>
      </button>
      {abierto && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th><th>Firmado</th><th>Duración</th><th>Importe</th><th>Origen</th><th></th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => {
                const dur = DURACIONES.find((x) => x.id === c.datos?.duracion)
                const conFicha = nombres.has(normalizaNombre(c.clienteNombre))
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>
                      {c.clienteNombre || '—'}
                      {!conFicha && <div className="contratos-aviso-fila">⚠️ No hay ficha con este nombre exacto</div>}
                    </td>
                    <td>{fechaLarga(c.firmadoEn)}</td>
                    <td>{dur ? dur.label : '—'}</td>
                    <td>{formatoEuros(c.datos?.importe)}</td>
                    <td>{c.origen === 'premium' ? 'Onboarding premium' : 'Enlace suelto'}</td>
                    <td>
                      <button type="button" className="row-action-btn" onClick={() => imprimirContrato(c)}>
                        ⬇️ PDF
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
