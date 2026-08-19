import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [aEntrar, setAEntrar] = useState(false)
  const navigate = useNavigate()

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setAEntrar(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErro('Credenciais inválidas. Verifica o email e a password.')
      setAEntrar(false)
      return
    }
    // Verificar que é admin
    const { data: perfil } = await supabase
      .from('vendedores')
      .select('role')
      .eq('user_id', data.user.id)
      .single()
    if (!perfil || perfil.role !== 'admin') {
      await supabase.auth.signOut()
      setErro('Esta conta não tem permissões de administrador.')
      setAEntrar(false)
      return
    }
    navigate('/')
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={entrar}>
        <h1>Px Field Sales</h1>
        <p className="sub">Backoffice — acesso de administrador</p>
        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        {erro && <p className="erro">{erro}</p>}
        <button className="btn bloco" disabled={aEntrar}>
          {aEntrar ? 'A entrar…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
