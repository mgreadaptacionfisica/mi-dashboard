import { useState } from 'react'
import Logo from '../assets/mg-logo.png'
import { signIn } from '../lib/auth'

// Puerta de entrada al panel: ahora hace falta iniciar sesión siempre,
// con una cuenta y un rol por persona (admin/closer/tecnico/contenido).
// A diferencia del antiguo AdminLogin (un modal que solo desbloqueaba
// Finanzas), esto sustituye a toda la app hasta que hay sesión.
export default function PanelLogin() {
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
    }
    // Si el login va bien, onAuthChange (suscrito en App.jsx) actualiza la
    // sesión solo y este componente deja de renderizarse.
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fbff 0%, #f4f7ff 100%)', padding: 20,
    }}>
      <div className="client-modal" style={{ maxWidth: 380, width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <img src={Logo} alt="MG Group logo" style={{ width: 48, height: 48 }} />
          <div style={{ fontWeight: 700, fontSize: 18 }}>MG Group</div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Inicia sesión para entrar al panel</div>
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
          <button type="submit" className="primary-action" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
