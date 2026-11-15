import { agruparParaCliente } from '../utils/seguimientoHelpers'

// 📣 Lista de lo que hay que explicarle al cliente, agrupada por sesión y
// con un check por punto para ir marcando lo ya explicado (Raúl,
// 2026-11-15). La usan la ficha de Seguimiento (arriba, la semana
// siguiente; y abajo, al apuntarlo) y el 🤝 Contacto semanal.
// onToggle(index) recibe el índice en la lista original; onRemove es
// opcional (solo al apuntarlo, no al explicarlo).
export default function ParaClienteChecklist({ lista = [], onToggle, onRemove }) {
  if (!lista.length) return null
  return (
    <div className="para-cliente-lista">
      {agruparParaCliente(lista).map(({ sesion, puntos }) => (
        <div key={sesion || '__general'} className="para-cliente-grupo">
          <div className="para-cliente-sesion">{sesion ? `🏋️ ${sesion}` : '💬 General'}</div>
          {puntos.map((p) => (
            <label key={p.index} className={`para-cliente-punto ${p.explicado ? 'para-cliente-explicado' : ''}`}>
              <input
                type="checkbox"
                checked={p.explicado}
                onChange={() => onToggle?.(p.index)}
                disabled={typeof onToggle !== 'function'}
                title={p.explicado ? 'Explicado (pulsa para desmarcar)' : 'Márcalo cuando se lo hayas explicado'}
              />
              <span>{p.texto}</span>
              {typeof onRemove === 'function' && (
                <button type="button" onClick={(e) => { e.preventDefault(); onRemove(p.index) }} title="Quitar">✕</button>
              )}
            </label>
          ))}
        </div>
      ))}
    </div>
  )
}

export function contarExplicados(lista = []) {
  return { hechos: lista.filter((p) => p.explicado).length, total: lista.length }
}
