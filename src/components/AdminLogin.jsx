import { useState } from 'react'
import { signIn } from '../lib/auth'

// Modal de login para el acceso admin (por ahora, solo Raúl). El resto del
// equipo no ve este control como un requisito: el panel sigue abierto para
// ellos igual que siempre, esto es solo la puerta extra para desbloquear
// Finanzas.
export default function AdminLogin({ onClose, onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    const { error: signInError } = await signIn(email.trim(), password)
    setLoading(false)
    if (signInError) {
      setError(signInError.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos.'
        : signInError.message)
      return
    }
    onSuccess()
  }

  return (
    <div className="client-modal-overlay" onClick={onClose}>
      <div className="client-modal" onClick={event => event.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Acceso admin</div>
            <div className="card-subtitle">Inicia sesión para ver Finanzas</div>
          </div>
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <input
            type="email"
            required
            autoFocus
            placeholder="Email"
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
          <input
            type="password"
            required
            placeholder="Contraseña"
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
          {error && <p style={{ color: 'var(--color-danger, #dc2626)', fontSize: 13, margin: 0 }}>{error}</p>}
          <div className="modal-actions">
            <button type="button" className="secondary-action" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primary-action" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
