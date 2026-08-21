import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { supabase } from '../supabase'

const PERIODOS = [
  { id: 'hoje', rotulo: 'Hoje' },
  { id: '7dias', rotulo: '7 dias' },
  { id: 'tudo', rotulo: 'Tudo' },
]

const eur = new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' })

function inicioPeriodo(periodo) {
  if (periodo === 'hoje') {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString()
  }
  if (periodo === '7dias') {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString()
  }
  return null
}

export default function Dashboard() {
  const [periodo, setPeriodo] = useState('hoje')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroProduto, setFiltroProduto] = useState('')
  const [vendas, setVendas] = useState([])
  const [aCarregar, setACarregar] = useState(true)
  const [metas, setMetas] = useState([])
  const [visitas, setVisitas] = useState([])

  const carregar = useCallback(async () => {
    setACarregar(true)
    let q = supabase
      .from('vendas')
      .select('id, quantidade, preco_unitario, valor_total, zona, data_venda, vendedores(nome), produtos(nome), clientes(nome)')
      .order('data_venda', { ascending: false })
    const inicio = inicioPeriodo(periodo)
    if (inicio) q = q.gte('data_venda', inicio)
    const { data } = await q
    setVendas(data || [])
    setACarregar(false)
  }, [periodo])

  const carregarMetas = useCallback(async () => {
    const hoje = new Date()
    const mes = hoje.getMonth() + 1
    const ano = hoje.getFullYear()
    const inicioMes = new Date(ano, mes - 1, 1).toISOString()

    const { data: metasData } = await supabase
      .from('metas')
      .select('valor_meta, vendedores(nome)')
      .eq('mes', mes).eq('ano', ano)

    const { data: vendasMes } = await supabase
      .from('vendas')
      .select('valor_total, vendedores(nome)')
      .gte('data_venda', inicioMes)

    const alcancadoPorNome = {}
    for (const v of (vendasMes || [])) {
      const nome = v.vendedores?.nome || '—'
      alcancadoPorNome[nome] = (alcancadoPorNome[nome] || 0) + Number(v.valor_total)
    }

    const combinado = (metasData || []).map(m => ({
      nome: m.vendedores?.nome || '—',
      meta: Number(m.valor_meta),
      alcancado: alcancadoPorNome[m.vendedores?.nome] || 0,
    }))
    setMetas(combinado)
  }, [])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => { carregarMetas() }, [carregarMetas])

  const carregarVisitas = useCallback(async () => {
    const hoje = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('rotas')
      .select('estado, vendedores(nome)')
      .eq('data', hoje)

    const agrupado = {}
    for (const r of (data || [])) {
      const nome = r.vendedores?.nome || '—'
      if (!agrupado[nome]) agrupado[nome] = { total: 0, concluidas: 0 }
      agrupado[nome].total++
      if (r.estado === 'visitado') agrupado[nome].concluidas++
    }
    setVisitas(Object.entries(agrupado).map(([nome, v]) => ({ nome, ...v })))
  }, [])

  useEffect(() => { carregarVisitas() }, [carregarVisitas])

  // Subscrição em tempo real — o dashboard atualiza sem F5
  useEffect(() => {
    const canal = supabase
      .channel('vendas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, () => carregar())
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [carregar])

  const vendasFiltradas = useMemo(() => {
    return vendas.filter(v =>
      (!filtroCliente || v.clientes?.nome === filtroCliente) &&
      (!filtroProduto || v.produtos?.nome === filtroProduto)
    )
  }, [vendas, filtroCliente, filtroProduto])

  const clientesDisponiveis = useMemo(() =>
    [...new Set(vendas.map(v => v.clientes?.nome).filter(Boolean))].sort(), [vendas])
  const produtosDisponiveis = useMemo(() =>
    [...new Set(vendas.map(v => v.produtos?.nome).filter(Boolean))].sort(), [vendas])

  const stats = useMemo(() => {
    const receita = vendasFiltradas.reduce((s, v) => s + Number(v.valor_total), 0)
    const quantidade = vendasFiltradas.reduce((s, v) => s + Number(v.quantidade), 0)
    const ativos = new Set(vendasFiltradas.map(v => v.vendedores?.nome).filter(Boolean)).size
    return {
      receita,
      quantidade,
      n: vendasFiltradas.length,
      ativos,
      ticket: vendasFiltradas.length ? receita / vendasFiltradas.length : 0,
    }
  }, [vendasFiltradas])

  const porVendedor = useMemo(() => agrupar(vendasFiltradas, v => v.vendedores?.nome || '—'), [vendasFiltradas])
  const porProduto = useMemo(() => agrupar(vendasFiltradas, v => v.produtos?.nome || '—'), [vendasFiltradas])

  function exportarCSV() {
    const cab = ['Data', 'Vendedor', 'Produto', 'Cliente', 'Zona', 'Quantidade', 'Preço unitário', 'Total']
    const linhas = vendasFiltradas.map(v => [
      new Date(v.data_venda).toLocaleString('pt-PT'),
      v.vendedores?.nome || '', v.produtos?.nome || '', v.clientes?.nome || '',
      v.zona || '', v.quantidade,
      Number(v.preco_unitario).toFixed(2).replace('.', ','),
      Number(v.valor_total).toFixed(2).replace('.', ','),
    ])
    const csv = [cab, ...linhas]
      .map(l => l.map(c => `"${String(c).replaceAll('"', '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `vendas_${periodo}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <div className="filtros">
        {PERIODOS.map(p => (
          <button key={p.id} className={periodo === p.id ? 'ativo' : ''} onClick={() => setPeriodo(p.id)}>
            {p.rotulo}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={{ marginRight: 8 }}>
          <option value="">Todos os clientes</option>
          {clientesDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroProduto} onChange={e => setFiltroProduto(e.target.value)} style={{ marginRight: 8 }}>
          <option value="">Todos os produtos</option>
          {produtosDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="btn contorno pequeno" onClick={exportarCSV} disabled={!vendasFiltradas.length}>
          Exportar CSV
        </button>
      </div>

      <div className="cards">
        <div className="card"><div className="rotulo">Receita total</div><div className="valor ambar">{eur.format(stats.receita)}</div></div>
        <div className="card"><div className="rotulo">Nº de vendas</div><div className="valor">{stats.n}</div></div>
        <div className="card"><div className="rotulo">Unidades vendidas</div><div className="valor">{stats.quantidade}</div></div>
        <div className="card"><div className="rotulo">Vendedores ativos</div><div className="valor">{stats.ativos}</div></div>
        <div className="card"><div className="rotulo">Ticket médio</div><div className="valor">{eur.format(stats.ticket)}</div></div>
      </div>

      <div className="painel">
        <h2>Metas do mês</h2>
        {metas.map(m => {
          const pct = m.meta ? Math.min(100, Math.round((m.alcancado / m.meta) * 100)) : 0
          return (
            <div key={m.nome} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                <strong>{m.nome}</strong>
                <span>{eur.format(m.alcancado)} / {eur.format(m.meta)} ({pct}%)</span>
              </div>
              <div style={{ background: '#e5e1d8', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, background: pct >= 100 ? '#2e7d32' : '#E8871E', height: '100%' }} />
              </div>
            </div>
          )
        })}
        {!metas.length && <p style={{ color: 'var(--cinza)', fontSize: 14 }}>Sem metas definidas este mês.</p>}
      </div>

      <div className="painel">
        <h2>Visitas do dia por vendedor</h2>
        {visitas.map(v => {
          const pct = v.total ? Math.round((v.concluidas / v.total) * 100) : 0
          return (
            <div key={v.nome} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                <strong>{v.nome}</strong>
                <span>{v.concluidas} de {v.total} visitas ({pct}%)</span>
              </div>
              <div style={{ background: '#e5e1d8', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, background: pct === 100 ? '#2e7d32' : '#0F2540', height: '100%' }} />
              </div>
            </div>
          )
        })}
        {!visitas.length && <p style={{ color: 'var(--cinza)', fontSize: 14 }}>Sem rotas para hoje.</p>}
      </div>

      <div className="grelha-2">
        <div className="painel">
          <h2>Receita por vendedor</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porVendedor}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e1d8" />
              <XAxis dataKey="nome" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={v => eur.format(v)} />
              <Bar dataKey="receita" fill="#0F2540" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="painel">
          <h2>Receita por produto</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porProduto}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e1d8" />
              <XAxis dataKey="nome" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={v => eur.format(v)} />
              <Bar dataKey="receita" fill="#E8871E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="painel">
        <h2>Atividade recente {aCarregar && '— a atualizar…'}</h2>
        {vendasFiltradas.slice(0, 15).map(v => (
          <div className="feed-item" key={v.id}>
            <span>
              <strong>{v.vendedores?.nome}</strong> vendeu {v.quantidade}× {v.produtos?.nome}
              {v.clientes?.nome ? ` a ${v.clientes.nome}` : ''}
            </span>
            <span className="quando">
              {eur.format(v.valor_total)} · {new Date(v.data_venda).toLocaleString('pt-PT')}
            </span>
          </div>
        ))}
        {!vendasFiltradas.length && !aCarregar && <p style={{ color: 'var(--cinza)', fontSize: 14 }}>Sem vendas neste período.</p>}
      </div>
    </>
  )
}

function agrupar(vendas, chave) {
  const mapa = {}
  for (const v of vendas) {
    const k = chave(v)
    mapa[k] = (mapa[k] || 0) + Number(v.valor_total)
  }
  return Object.entries(mapa)
    .map(([nome, receita]) => ({ nome, receita: Math.round(receita * 100) / 100 }))
    .sort((a, b) => b.receita - a.receita)
}
