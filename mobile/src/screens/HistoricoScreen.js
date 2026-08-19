import { useCallback, useState } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../supabase'
import { cores } from '../tema'

export default function HistoricoScreen() {
  const [vendas, setVendas] = useState([])
  const [aCarregar, setACarregar] = useState(true)

  const carregar = useCallback(async () => {
    setACarregar(true)
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('vendas')
      .select('id, quantidade, preco_unitario, valor_total, data_venda, produtos(nome), clientes(nome)')
      .gte('data_venda', hoje.toISOString())
      .order('data_venda', { ascending: false })
    setVendas(data || [])
    setACarregar(false)
  }, [])

  useFocusEffect(useCallback(() => { carregar() }, [carregar]))

  const totalDia = vendas.reduce((s, v) => s + Number(v.valor_total), 0)

  return (
    <View style={s.contentor}>
      <View style={s.resumo}>
        <Text style={s.resumoTexto}>Hoje: {vendas.length} vendas</Text>
        <Text style={s.resumoTotal}>{totalDia.toFixed(2)} AOA</Text>
      </View>
      <FlatList
        data={vendas}
        keyExtractor={v => v.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={aCarregar} onRefresh={carregar} />}
        ListEmptyComponent={<Text style={s.vazio}>Ainda sem vendas hoje. Bom trabalho de campo! 💪</Text>}
        renderItem={({ item }) => (
          <View style={s.linha}>
            <View style={{ flex: 1 }}>
              <Text style={s.produto}>{item.quantidade}× {item.produtos?.nome}</Text>
              <Text style={s.detalhe}>
                {item.clientes?.nome || 'Sem cliente'} ·{' '}
                {new Date(item.data_venda).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <Text style={s.valor}>{Number(item.valor_total).toFixed(2)} AOA</Text>
          </View>
        )}
      />
    </View>
  )
}

const s = StyleSheet.create({
  contentor: { flex: 1, backgroundColor: cores.fundo },
  resumo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: cores.navy, padding: 16,
  },
  resumoTexto: { color: '#cbd5e1', fontSize: 16, fontWeight: '600' },
  resumoTotal: { color: '#fff', fontSize: 24, fontWeight: '800' },
  vazio: { textAlign: 'center', color: cores.cinza, fontSize: 16, marginTop: 32 },
  linha: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: cores.branco,
    borderRadius: 10, padding: 14, marginBottom: 8,
  },
  produto: { fontSize: 17, fontWeight: '700', color: cores.navy },
  detalhe: { fontSize: 14, color: cores.cinza, marginTop: 2 },
  valor: { fontSize: 18, fontWeight: '800', color: cores.ambar },
})
