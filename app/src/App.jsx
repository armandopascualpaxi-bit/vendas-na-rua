import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase, supabaseConfigurado } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'

function Layout({ children, onLogout }) {
  const loc = useLocation()
  return (
    <>
      <header className="topbar">
        <h1>Px Field Sales</h1>
        <nav>
          <Link to="/" className={loc.pathname === '/' ? 'ativo' : ''}>Dashboard</Link>
          <Link to="/admin" className={loc.pathname === '/admin' ? 'ativo' : ''}>Administração</Link>
        </nav>
        <button onClick={onLogout}>Sair</button>
      </header>
      <main className="pagina">{children}</main>
    </>
  )
}

export default function App() {
  const [sessao, setSessao] = useState(undefined)
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabase) { setSessao(null); return }
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function sair() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (!supabaseConfigurado) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <h1>Configuração em falta</h1>
          <p className="sub">
            Define as variáveis <code>VITE_SUPABASE_URL</code> e{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> (ficheiro <code>.env</code> local
            ou nas Environment Variables da Vercel) e reinicia a app.
          </p>
        </div>
      </div>
    )
  }

  if (sessao === undefined) return null

  if (!sessao) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Layout onLogout={sair}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
