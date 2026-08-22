import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView,
  Linking, ActivityIndicator, RefreshControl,
} from 'react-native'
import * as Location from 'expo-location'
import { supabase } from '../supabase'
import { cores } from '../tema'

export default function RotaScreen({ navigation }) {
  const [paragens, setParagens] = useState([])
  const [posicao, setPosicao] = useState(null)
  const [aCarregar, setACarregar] = useState(true)
  const [vendedorId, setVendedorId] = useState(null)
  const [resumo, setResumo] = useState({
    nome: '', metaMes: 0, alcancadoMes: 0,
    encomendasHoje: 0, receitaHoje: 0, cobrancasHoje: 0,
  })

  // Permissão de localização + posição atual para centrar o mapa
  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({})
        setPosicao({ latitude: loc.coords.latitude, longitude: loc.coords.longitude })
      }
    })()
  }, [])

  const carregar = useCallback(async () => {
    setACarregar(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase
      .from('vendedores').select('id, nome').eq('user_id', user.id).single()
    if (!perfil) { setACarregar(false); return }
    setVendedorId(perfil.id)

    const hoje = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('rotas')
      .select('id, ordem, estado, clientes(id, nome, endereco, lat, lng)')
      .eq('vendedor_id', perfil.id)
      .eq('data', hoje)
      .order('ordem')
    setParagens(data || [])
    setACarregar(false)

    // Resumo do dia / mês para o painel Home
    const agora = new Date()
    const inicioHoje = new Date(agora); inicioHoje.setHours(0, 0, 0, 0)
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)

    const { data: metaData } = await supabase
      .from('metas').select('valor_meta')
      .eq('vendedor_id', perfil.id)
      .eq('mes', agora.getMonth() + 1).eq('ano', agora.getFullYear())
      .maybeSingle()

    const { data: vendasMes } = await supabase
      .from('vendas').select('valor_total, data_venda')
      .eq('vendedor_id', perfil.id)
      .gte('data_venda', inicioMes.toISOString())

    const { data: pagamentosHoje } = await supabase
      .from('pagamentos').select('valor')
      .eq('vendedor_id', perfil.id)
      .gte('data_pagamento', inicioHoje.toISOString())

    const alcancadoMes = (vendasMes || []).reduce((s, v) => s + Number(v.valor_total), 0)
    const vendasHoje = (vendasMes || []).filter(v => new Date(v.data_venda) >= inicioHoje)
    const receitaHoje = vendasHoje.reduce((s, v) => s + Number(v.valor_total), 0)
    const cobrancasHoje = (pagamentosHoje || []).reduce((s, p) => s + Number(p.valor), 0)

    setResumo({
      nome: perfil.nome || '',
      metaMes: Number(metaData?.valor_meta || 0),
      alcancadoMes,
      encomendasHoje: vendasHoje.length,
      receitaHoje,
      cobrancasHoje,
    })
  }, [])

  useFocusEffect(useCallback(() => { carregar() }, [carregar]))

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginRight: 4 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Historico')}>
            <Text style={{ color: '#fff', fontSize: 20 }}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => supabase.auth.signOut()}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Sair</Text>
          </TouchableOpacity>
        </View>
      ),
    })
  }, [navigation])

  function abrirNavegacao(c) {
    const destino = c.lat && c.lng ? `${c.lat},${c.lng}` : encodeURIComponent(c.endereco)
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destino}`)
  }

  const centro = posicao
    || (paragens[0]?.clientes?.lat
      ? { latitude: paragens[0].clientes.lat, longitude: paragens[0].clientes.lng }
      : { latitude: 41.5518, longitude: -8.4229 })

  const proxima = paragens.find(p => p.estado !== 'visitado')
  const pctMeta = resumo.metaMes ? Math.min(100, Math.round((resumo.alcancadoMes / resumo.metaMes) * 100)) : 0

  return (
    <View style={s.contentor}>
      <ScrollView>
      <View style={s.home}>
        <Text style={s.saudacao}>Olá, {resumo.nome || 'vendedor'} 👋</Text>

        <View style={s.metaCartao}>
          <Text style={s.metaLabel}>Meta do mês</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={s.metaValor}>{resumo.alcancadoMes.toFixed(0)}</Text>
            <Text style={s.metaValorTotal}>/ {resumo.metaMes.toFixed(0)} AOA</Text>
          </View>
          <View style={s.metaFundo}>
            <View style={[s.metaPreenchido, { width: `${pctMeta}%` }]} />
          </View>
          <Text style={s.metaPct}>{pctMeta}%</Text>
        </View>

        <View style={s.gridResumo}>
          <View style={s.miniCard}>
            <Text style={s.miniLabel}>Visitas hoje</Text>
            <Text style={s.miniValor}>{paragens.filter(p => p.estado === 'visitado').length} / {paragens.length}</Text>
          </View>
          <View style={s.miniCard}>
            <Text style={s.miniLabel}>Encomendas</Text>
            <Text style={s.miniValor}>{resumo.encomendasHoje}</Text>
          </View>
          <View style={s.miniCard}>
            <Text style={s.miniLabel}>Receita hoje</Text>
            <Text style={s.miniValor}>{resumo.receitaHoje.toFixed(0)}</Text>
          </View>
          <View style={s.miniCard}>
            <Text style={s.miniLabel}>Cobranças</Text>
            <Text style={s.miniValor}>{resumo.cobrancasHoje.toFixed(0)}</Text>
          </View>
        </View>

        {proxima && (
          <View style={s.proximaCartao}>
            <Text style={s.proximaLabel}>Próxima visita</Text>
            <Text style={s.proximaNome}>{proxima.clientes?.nome}</Text>
            <Text style={s.proximaEndereco}>{proxima.clientes?.endereco}</Text>
            <TouchableOpacity
              style={s.botaoVenda}
              onPress={() => navigation.navigate('RegistarVenda', {
                rotaId: proxima.id,
                cliente: proxima.clientes,
                vendedorId,
              })}
            >
              <Text style={s.botaoVendaTexto}>Iniciar visita</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>


      {aCarregar && !paragens.length ? (
        <ActivityIndicator size="large" color={cores.ambar} style={{ margin: 24 }} />
      ) : (
        <FlatList
          data={paragens}
          keyExtractor={p => p.id}
          style={s.lista}
          refreshControl={<RefreshControl refreshing={aCarregar} onRefresh={carregar} />}
          ListEmptyComponent={
            <Text style={s.vazio}>Sem clientes atribuídos para hoje.</Text>
          }
          renderItem={({ item, index }) => (
            <View style={s.cartao}>
              <View style={[s.num, item.estado === 'visitado' && s.numVisitado]}>
                <Text style={s.numTexto}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.nome}>{item.clientes?.nome}</Text>
                <Text style={s.endereco}>{item.clientes?.endereco}</Text>
                <Text style={[s.estado, item.estado === 'visitado' ? s.visitado : s.pendente]}>
                  {item.estado === 'visitado' ? '✔ Visitado' : '● Pendente'}
                </Text>
                <View style={s.acoes}>
                  <TouchableOpacity style={s.botaoNav} onPress={() => abrirNavegacao(item.clientes)}>
                    <Text style={s.botaoNavTexto}>🧭 Navegar</Text>
                  </TouchableOpacity>
                  {item.estado !== 'visitado' && (
                    <TouchableOpacity
                      style={s.botaoVenda}
                      onPress={() => navigation.navigate('RegistarVenda', {
                        rotaId: item.id,
                        cliente: item.clientes,
                        vendedorId,
                      })}
                    >
                      <Text style={s.botaoVendaTexto}>Registar venda</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={s.botaoNav}
                    onPress={() => navigation.navigate('RegistarPagamento', {
                      cliente: item.clientes,
                      vendedorId,
                    })}
                  >
                    <Text style={s.botaoNavTexto}>💰 Pagamento</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  contentor: { flex: 1, backgroundColor: cores.fundo },
  home: { padding: 16, backgroundColor: cores.branco, borderBottomWidth: 1, borderBottomColor: '#e5e1d8' },
  saudacao: { fontSize: 20, fontWeight: '800', color: cores.navy, marginBottom: 14 },
  metaCartao: { backgroundColor: cores.navy, borderRadius: 12, padding: 16, marginBottom: 14 },
  metaLabel: { color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  metaValor: { color: '#fff', fontSize: 24, fontWeight: '800' },
  metaValorTotal: { color: '#cbd5e1', fontSize: 15 },
  metaFundo: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  metaPreenchido: { height: '100%', backgroundColor: cores.ambar },
  metaPct: { color: cores.ambar, fontSize: 13, fontWeight: '700', marginTop: 6, textAlign: 'right' },
  gridResumo: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  miniCard: { flexBasis: '47%', backgroundColor: '#f6f4ef', borderRadius: 10, padding: 12 },
  miniLabel: { fontSize: 12, color: cores.cinza, fontWeight: '600' },
  miniValor: { fontSize: 18, fontWeight: '800', color: cores.navy, marginTop: 4 },
  proximaCartao: { backgroundColor: '#fdf3e7', borderRadius: 12, padding: 14 },
  proximaLabel: { fontSize: 12, color: cores.ambar, fontWeight: '700' },
  proximaNome: { fontSize: 17, fontWeight: '800', color: cores.navy, marginTop: 4 },
  proximaEndereco: { fontSize: 14, color: cores.cinza, marginTop: 2, marginBottom: 10 },
  mapa: { height: '38%' },
  barra: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: cores.branco,
    borderBottomWidth: 1, borderBottomColor: '#e5e1d8',
  },
  botaoHistorico: { padding: 6 },
  botaoHistoricoTexto: { color: cores.navy, fontWeight: '700', fontSize: 16 },
  sair: { color: cores.cinza, fontSize: 15 },
  progressoBarra: { backgroundColor: cores.branco, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e1d8' },
  progressoTexto: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressoLabel: { fontSize: 13, color: cores.navy, fontWeight: '600' },
  progressoPct: { fontSize: 13, color: cores.ambar, fontWeight: '700' },
  progressoFundo: { height: 8, backgroundColor: '#e5e1d8', borderRadius: 4, overflow: 'hidden' },
  progressoPreenchido: { height: '100%', backgroundColor: cores.verde },
  lista: { flex: 1, padding: 12 },
  vazio: { textAlign: 'center', color: cores.cinza, fontSize: 16, marginTop: 24 },
  cartao: {
    flexDirection: 'row', backgroundColor: cores.branco, borderRadius: 12,
    padding: 14, marginBottom: 10, gap: 12,
  },
  num: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: cores.navy,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
  },
  numVisitado: { backgroundColor: cores.verde },
  numTexto: { color: '#fff', fontWeight: '800', fontSize: 16 },
  nome: { fontSize: 18, fontWeight: '700', color: cores.navy },
  endereco: { fontSize: 15, color: cores.cinza, marginTop: 2 },
  estado: { fontSize: 14, fontWeight: '700', marginTop: 6 },
  pendente: { color: cores.ambar },
  visitado: { color: cores.verde },
  acoes: { flexDirection: 'row', gap: 10, marginTop: 10 },
  botaoNav: {
    borderWidth: 1.5, borderColor: cores.navy, borderRadius: 8,
    paddingVertical: 9, paddingHorizontal: 14,
  },
  botaoNavTexto: { color: cores.navy, fontWeight: '700', fontSize: 15 },
  botaoVenda: { backgroundColor: cores.ambar, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14 },
  botaoVendaTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
