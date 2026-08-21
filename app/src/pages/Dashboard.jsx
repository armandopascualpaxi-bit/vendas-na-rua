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
  const [vendas, setVendas] = useState([])
  const [aCarregar, setACarregar] = useState(true)
  const [metas, setMetas] = useState([])

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

  // Subscrição em tempo real — o dashboard atualiza sem F5
  useEffect(() => {
    const canal = supabase
      .channel('vendas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, () => carregar())
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [carregar])

  const stats = useMemo(() => {
    const receita = vendas.reduce((s, v) => s + Number(v.valor_total), 0)
    const ativos = new Set(vendas.map(v => v.vendedores?.nome).filter(Boolean)).size
    return {
      receita,
      n: vendas.length,
      ativos,
      ticket: vendas.length ? receita / vendas.length : 0,
    }
  }, [vendas])

  const porVendedor = useMemo(() => agrupar(vendas, v => v.vendedores?.nome || '—'), [vendas])
  const porProduto = useMemo(() => agrupar(vendas, v => v.produtos?.nome || '—'), [vendas])

  function exportarCSV() {
    const cab = ['Data', 'Vendedor', 'Produto', 'Cliente', 'Zona', 'Quantidade', 'Preço unitário', 'Total']
    const linhas = vendas.map(v => [
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
        <button className="btn contorno pequeno" onClick={exportarCSV} disabled={!vendas.length}>
          Exportar CSV
        </button>
      </div>

      <div className="cards">
        <div className="card"><div className="rotulo">Receita total</div><div className="valor ambar">{eur.format(stats.receita)}</div></div>
        <div className="card"><div className="rotulo">Nº de vendas</div><div className="valor">{stats.n}</div></div>
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
        {vendas.slice(0, 15).map(v => (
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
        {!vendas.length && !aCarregar && <p style={{ color: 'var(--cinza)', fontSize: 14 }}>Sem vendas neste período.</p>}
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
