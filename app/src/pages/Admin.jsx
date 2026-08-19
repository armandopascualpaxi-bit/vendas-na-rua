import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../supabase'

const CENTRO = [41.5518, -8.4229] // Braga — ajusta à tua zona

const pinNumerado = n => L.divIcon({
  className: '',
  html: `<div style="background:#0F2540;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;border:2px solid #E8871E">${n}</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})
const pinSimples = L.divIcon({
  className: '',
  html: '<div style="background:#E8871E;width:16px;height:16px;border-radius:50%;border:2px solid #fff"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

/* ---------- Vendedores ---------- */
function Vendedores() {
  const [lista, setLista] = useState([])
  const [form, setForm] = useState({ nome: '', email: '', zona: '', role: 'vendedor' })
  const [erro, setErro] = useState('')
  const carregar = useCallback(async () => {
    const { data } = await supabase.from('vendedores').select('*').order('nome')
    setLista(data || [])
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function criar(e) {
    e.preventDefault()
    setErro('')
    const { error } = await supabase.from('vendedores').insert({ ...form, user_id: null })
    if (error) { setErro(error.message); return }
    setForm({ nome: '', email: '', zona: '', role: 'vendedor' })
    carregar()
  }

  async function toggleAtivo(v) {
    await supabase.from('vendedores').update({ ativo: !v.ativo }).eq('id', v.id)
    carregar()
  }
  async function guardarEdicao(v, campo, valor) {
    await supabase.from('vendedores').update({ [campo]: valor }).eq('id', v.id)
    carregar()
  }

  return (
    <>
      <div className="aviso">
        Para um novo vendedor conseguir iniciar sessão, cria primeiro o utilizador em
        <strong> Supabase → Authentication → Add user</strong> com o mesmo email, e depois associa
        o <code>user_id</code> (SQL Editor: <code>update vendedores set user_id = '…' where email = '…'</code>).
      </div>
      <form className="painel" onSubmit={criar}>
        <h2>Novo vendedor</h2>
        <div className="linha">
          <input placeholder="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
          <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          <input placeholder="Zona" value={form.zona} onChange={e => setForm({ ...form, zona: e.target.value })} />
          <select className="fixo" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="vendedor">vendedor</option>
            <option value="admin">admin</option>
          </select>
          <button className="btn fixo">Criar</button>
        </div>
        {erro && <p className="erro">{erro}</p>}
      </form>
      <div className="painel">
        <table>
          <thead><tr><th>Nome</th><th>Email</th><th>Zona</th><th>Role</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {lista.map(v => (
              <tr key={v.id}>
                <td><input defaultValue={v.nome} onBlur={e => e.target.value !== v.nome && guardarEdicao(v, 'nome', e.target.value)} /></td>
                <td>{v.email}</td>
                <td><input defaultValue={v.zona || ''} onBlur={e => e.target.value !== (v.zona || '') && guardarEdicao(v, 'zona', e.target.value)} /></td>
                <td>{v.role}</td>
                <td><span className={`badge ${v.ativo ? 'verde' : 'cinza'}`}>{v.ativo ? 'ativo' : 'inativo'}</span></td>
                <td><button className="btn contorno pequeno" onClick={() => toggleAtivo(v)}>{v.ativo ? 'Desativar' : 'Reativar'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ---------- Produtos ---------- */
function Produtos() {
  const [lista, setLista] = useState([])
  const [form, setForm] = useState({ nome: '', descricao: '', preco: '' })
  const carregar = useCallback(async () => {
    const { data } = await supabase.from('produtos').select('*').order('nome')
    setLista(data || [])
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function criar(e) {
    e.preventDefault()
    await supabase.from('produtos').insert({ ...form, preco: Number(form.preco) })
    setForm({ nome: '', descricao: '', preco: '' })
    carregar()
  }
  async function atualizar(p, campo, valor) {
    await supabase.from('produtos').update({ [campo]: campo === 'preco' ? Number(valor) : valor }).eq('id', p.id)
    carregar()
  }

  return (
    <>
      <form className="painel" onSubmit={criar}>
        <h2>Novo produto</h2>
        <div className="linha">
          <input placeholder="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
          <input placeholder="Descrição" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
          <input placeholder="Preço (AOA)" type="number" step="0.01" min="0" className="fixo" style={{ width: 120 }} value={form.preco} onChange={e => setForm({ ...form, preco: e.target.value })} required />
          <button className="btn fixo">Criar</button>
        </div>
      </form>
      <div className="painel">
        <table>
          <thead><tr><th>Nome</th><th>Descrição</th><th>Preço</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {lista.map(p => (
              <tr key={p.id}>
                <td><input defaultValue={p.nome} onBlur={e => e.target.value !== p.nome && atualizar(p, 'nome', e.target.value)} /></td>
                <td><input defaultValue={p.descricao || ''} onBlur={e => e.target.value !== (p.descricao || '') && atualizar(p, 'descricao', e.target.value)} /></td>
                <td><input type="number" step="0.01" style={{ width: 100 }} defaultValue={p.preco} onBlur={e => Number(e.target.value) !== Number(p.preco) && atualizar(p, 'preco', e.target.value)} /></td>
                <td><span className={`badge ${p.ativo ? 'verde' : 'cinza'}`}>{p.ativo ? 'ativo' : 'inativo'}</span></td>
                <td><button className="btn contorno pequeno" onClick={() => atualizar(p, 'ativo', !p.ativo)}>{p.ativo ? 'Desativar' : 'Reativar'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ---------- Clientes ---------- */
function Clientes() {
  const [lista, setLista] = useState([])
  const [vendedores, setVendedores] = useState([])
  const [form, setForm] = useState({ nome: '', endereco: '', lat: '', lng: '', vendedor_habitual_id: '' })
  const carregar = useCallback(async () => {
    const [{ data: c }, { data: v }] = await Promise.all([
      supabase.from('clientes').select('*, vendedores(nome)').order('nome'),
      supabase.from('vendedores').select('id, nome').eq('ativo', true).order('nome'),
    ])
    setLista(c || []); setVendedores(v || [])
  }, [])
  useEffect(() => { carregar() }, [carregar])

  function ClickMapa() {
    useMapEvents({ click: e => setForm(f => ({ ...f, lat: e.latlng.lat.toFixed(6), lng: e.latlng.lng.toFixed(6) })) })
    return form.lat ? <Marker position={[form.lat, form.lng]} icon={pinSimples} /> : null
  }

  async function criar(e) {
    e.preventDefault()
    await supabase.from('clientes').insert({
      nome: form.nome,
      endereco: form.endereco,
      lat: form.lat ? Number(form.lat) : null,
      lng: form.lng ? Number(form.lng) : null,
      vendedor_habitual_id: form.vendedor_habitual_id || null,
    })
    setForm({ nome: '', endereco: '', lat: '', lng: '', vendedor_habitual_id: '' })
    carregar()
  }
  async function atualizar(c, campo, valor) {
    await supabase.from('clientes').update({ [campo]: valor }).eq('id', c.id)
    carregar()
  }

  return (
    <>
      <form className="painel" onSubmit={criar}>
        <h2>Novo cliente / ponto de venda</h2>
        <div className="linha">
          <input placeholder="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
          <input placeholder="Endereço" value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} required />
          <select className="fixo" value={form.vendedor_habitual_id} onChange={e => setForm({ ...form, vendedor_habitual_id: e.target.value })}>
            <option value="">Vendedor habitual…</option>
            {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
          <button className="btn fixo">Criar</button>
        </div>
        <label>Localização — clica no mapa para marcar</label>
        <div className="mapa-rota">
          <MapContainer center={CENTRO} zoom={14} style={{ height: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
            <ClickMapa />
          </MapContainer>
        </div>
        {form.lat && <p style={{ fontSize: 13, marginTop: 8 }}>📍 {form.lat}, {form.lng}</p>}
      </form>
      <div className="painel">
        <table>
          <thead><tr><th>Nome</th><th>Endereço</th><th>Vendedor habitual</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {lista.map(c => (
              <tr key={c.id}>
                <td><input defaultValue={c.nome} onBlur={e => e.target.value !== c.nome && atualizar(c, 'nome', e.target.value)} /></td>
                <td><input defaultValue={c.endereco} onBlur={e => e.target.value !== c.endereco && atualizar(c, 'endereco', e.target.value)} /></td>
                <td>
                  <select defaultValue={c.vendedor_habitual_id || ''} onChange={e => atualizar(c, 'vendedor_habitual_id', e.target.value || null)}>
                    <option value="">—</option>
                    {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                  </select>
                </td>
                <td><span className={`badge ${c.ativo ? 'verde' : 'cinza'}`}>{c.ativo ? 'ativo' : 'inativo'}</span></td>
                <td><button className="btn contorno pequeno" onClick={() => atualizar(c, 'ativo', !c.ativo)}>{c.ativo ? 'Desativar' : 'Reativar'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ---------- Rotas ---------- */
function Rotas() {
  const [vendedores, setVendedores] = useState([])
  const [clientes, setClientes] = useState([])
  const [vendedorId, setVendedorId] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [selecionados, setSelecionados] = useState([]) // cliente_ids ordenados
  const [existente, setExistente] = useState([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.from('vendedores').select('id, nome').eq('role', 'vendedor').eq('ativo', true).order('nome')
      .then(({ data }) => setVendedores(data || []))
    supabase.from('clientes').select('*').eq('ativo', true).order('nome')
      .then(({ data }) => setClientes(data || []))
  }, [])

  // Carrega rota existente para vendedor+data
  useEffect(() => {
    if (!vendedorId || !data) return
    supabase.from('rotas').select('cliente_id, ordem').eq('vendedor_id', vendedorId).eq('data', data).order('ordem')
      .then(({ data: r }) => {
        setExistente(r || [])
        setSelecionados((r || []).map(x => x.cliente_id))
      })
  }, [vendedorId, data])

  const clientesPorId = useMemo(() => Object.fromEntries(clientes.map(c => [c.id, c])), [clientes])
  const disponiveis = clientes.filter(c => !selecionados.includes(c.id))

  function mover(i, dir) {
    const copia = [...selecionados]
    const j = i + dir
    if (j < 0 || j >= copia.length) return
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
    setSelecionados(copia)
  }

  async function confirmar() {
    setMsg('')
    // substitui a rota desse dia: apaga e insere na ordem escolhida
    await supabase.from('rotas').delete().eq('vendedor_id', vendedorId).eq('data', data)
    if (selecionados.length) {
      const linhas = selecionados.map((cliente_id, i) => ({
        vendedor_id: vendedorId, cliente_id, data, ordem: i + 1, estado: 'pendente',
      }))
      const { error } = await supabase.from('rotas').insert(linhas)
      if (error) { setMsg('Erro: ' + error.message); return }
    }
    setMsg('Rota confirmada ✔')
  }

  const pontos = selecionados.map(id => clientesPorId[id]).filter(c => c?.lat && c?.lng)

  return (
    <>
      <div className="painel">
        <h2>Montar a rota do dia</h2>
        <div className="linha">
          <select value={vendedorId} onChange={e => setVendedorId(e.target.value)}>
            <option value="">Escolhe o vendedor…</option>
            {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
          <input type="date" value={data} onChange={e => setData(e.target.value)} />
        </div>
      </div>

      {vendedorId && (
        <div className="grelha-2">
          <div className="painel">
            <h2>Clientes atribuídos ({selecionados.length})</h2>
            <ul className="lista-rota">
              {selecionados.map((id, i) => (
                <li key={id}>
                  <span className="num">{i + 1}</span>
                  <span style={{ flex: 1 }}>
                    <strong>{clientesPorId[id]?.nome}</strong><br />
                    <small style={{ color: 'var(--cinza)' }}>{clientesPorId[id]?.endereco}</small>
                  </span>
                  <button className="btn contorno pequeno" onClick={() => mover(i, -1)}>↑</button>
                  <button className="btn contorno pequeno" onClick={() => mover(i, 1)}>↓</button>
                  <button className="btn contorno pequeno" onClick={() => setSelecionados(selecionados.filter(x => x !== id))}>✕</button>
                </li>
              ))}
              {!selecionados.length && <p style={{ color: 'var(--cinza)', fontSize: 14 }}>Ainda sem clientes. Adiciona da lista abaixo.</p>}
            </ul>
            <div className="separador" />
            <h2>Adicionar cliente</h2>
            <div className="linha">
              <select id="novo-cliente" defaultValue="">
                <option value="" disabled>Escolhe…</option>
                {disponiveis.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <button className="btn secundario fixo" onClick={() => {
                const sel = document.getElementById('novo-cliente')
                if (sel.value) { setSelecionados([...selecionados, sel.value]); sel.value = '' }
              }}>Adicionar</button>
            </div>
            <div className="separador" />
            <button className="btn bloco" onClick={confirmar} disabled={!selecionados.length && !existente.length}>
              Confirmar rota
            </button>
            {msg && <p style={{ marginTop: 10, fontSize: 14 }}>{msg}</p>}
          </div>

          <div className="painel">
            <h2>Pré-visualização no mapa</h2>
            <div className="mapa-rota">
              <MapContainer center={pontos[0] ? [pontos[0].lat, pontos[0].lng] : CENTRO} zoom={13} style={{ height: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                {pontos.map((c, i) => (
                  <Marker key={c.id} position={[c.lat, c.lng]} icon={pinNumerado(i + 1)}>
                    <Popup>{i + 1}. {c.nome}<br />{c.endereco}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ---------- Página Admin ---------- */
export default function Admin() {
  const [tab, setTab] = useState('rotas')
  const TABS = [
    ['rotas', 'Rota do dia'],
    ['vendedores', 'Vendedores'],
    ['produtos', 'Produtos'],
    ['clientes', 'Clientes'],
  ]
  return (
    <>
      <div className="tabs">
        {TABS.map(([id, r]) => (
          <button key={id} className={tab === id ? 'ativo' : ''} onClick={() => setTab(id)}>{r}</button>
        ))}
      </div>
      {tab === 'vendedores' && <Vendedores />}
      {tab === 'produtos' && <Produtos />}
      {tab === 'clientes' && <Clientes />}
      {tab === 'rotas' && <Rotas />}
    </>
  )
}
