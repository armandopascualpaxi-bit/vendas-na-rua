import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { supabase } from '../supabase'
import { cores } from '../tema'

export default function RegistarVendaScreen({ route, navigation }) {
  const { rotaId, cliente, vendedorId: vendedorParam } = route.params || {}
  const [produtos, setProdutos] = useState([])
  const [clientes, setClientes] = useState([])
  const [produtoId, setProdutoId] = useState(null)
  const [clienteId, setClienteId] = useState(cliente?.id || null)
  const [quantidade, setQuantidade] = useState('1')
  const [precoUnit, setPrecoUnit] = useState('')
  const [zona, setZona] = useState('')
  const [aGravar, setAGravar] = useState(false)

  useEffect(() => {
    supabase.from('produtos').select('*').eq('ativo', true).order('nome')
      .then(({ data }) => setProdutos(data || []))
    supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome')
      .then(({ data }) => setClientes(data || []))
    // zona do vendedor como valor por defeito
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: perfil } = await supabase.from('vendedores').select('zona').eq('user_id', user.id).single()
      if (perfil?.zona) setZona(perfil.zona)
    })()
  }, [])

  function escolherProduto(p) {
    setProdutoId(p.id)
    setPrecoUnit(String(p.preco))
  }

  const total = useMemo(() => {
    const q = parseInt(quantidade, 10) || 0
    const p = parseFloat(String(precoUnit).replace(',', '.')) || 0
    return q * p
  }, [quantidade, precoUnit])

  async function submeter() {
    if (!produtoId) return Alert.alert('Falta o produto', 'Escolhe um produto da lista.')
    const q = parseInt(quantidade, 10)
    const p = parseFloat(String(precoUnit).replace(',', '.'))
    if (!q || q <= 0 || isNaN(p)) return Alert.alert('Valores inválidos', 'Verifica a quantidade e o preço.')

    setAGravar(true)
    let vid = vendedorParam
    if (!vid) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: perfil } = await supabase.from('vendedores').select('id').eq('user_id', user.id).single()
      vid = perfil.id
    }

    const { error } = await supabase.from('vendas').insert({
      vendedor_id: vid,
      produto_id: produtoId,
      cliente_id: clienteId || null,
      quantidade: q,
      preco_unitario: p,
      valor_total: Math.round(q * p * 100) / 100,
      zona: zona || null,
    })

    if (error) {
      setAGravar(false)
      return Alert.alert('Erro ao gravar', error.message)
    }

    // Se veio da rota do dia, marca a paragem como visitada
    if (rotaId) {
      await supabase.from('rotas').update({ estado: 'visitado' }).eq('id', rotaId)
    }

    setAGravar(false)
    Alert.alert('Venda registada ✔', `Total: ${total.toFixed(2)} AOA`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ])
  }

  return (
    <ScrollView style={s.contentor} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.rotulo}>Produto</Text>
      <View style={s.opcoes}>
        {produtos.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[s.opcao, produtoId === p.id && s.opcaoAtiva]}
            onPress={() => escolherProduto(p)}
          >
            <Text style={[s.opcaoTexto, produtoId === p.id && s.opcaoTextoAtivo]}>
              {p.nome} · {Number(p.preco).toFixed(2)} AOA
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.rotulo}>Quantidade</Text>
      <TextInput
        style={s.campo}
        keyboardType="number-pad"
        value={quantidade}
        onChangeText={setQuantidade}
      />

      <Text style={s.rotulo}>Preço unitário (AOA)</Text>
      <TextInput
        style={s.campo}
        keyboardType="decimal-pad"
        value={precoUnit}
        onChangeText={setPrecoUnit}
        placeholder="0.00"
        placeholderTextColor={cores.cinza}
      />

      <Text style={s.rotulo}>Cliente</Text>
      {cliente ? (
        <View style={s.clienteFixo}>
          <Text style={s.clienteFixoTexto}>{cliente.nome}</Text>
        </View>
      ) : (
        <View style={s.opcoes}>
          {clientes.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[s.opcao, clienteId === c.id && s.opcaoAtiva]}
              onPress={() => setClienteId(c.id)}
            >
              <Text style={[s.opcaoTexto, clienteId === c.id && s.opcaoTextoAtivo]}>{c.nome}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={s.rotulo}>Zona</Text>
      <TextInput
        style={s.campo}
        value={zona}
        onChangeText={setZona}
        placeholder="Ex.: Norte, Centro…"
        placeholderTextColor={cores.cinza}
      />

      <View style={s.totalCaixa}>
        <Text style={s.totalRotulo}>Total</Text>
        <Text style={s.totalValor}>{total.toFixed(2)} AOA</Text>
      </View>

      <TouchableOpacity style={s.botao} onPress={submeter} disabled={aGravar}>
        {aGravar
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.botaoTexto}>Registar venda</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  contentor: { flex: 1, backgroundColor: cores.fundo },
  rotulo: { fontSize: 15, fontWeight: '700', color: cores.navy, marginTop: 16, marginBottom: 8 },
  campo: {
    backgroundColor: cores.branco, borderRadius: 10, padding: 15, fontSize: 18,
    color: cores.navy, borderWidth: 1, borderColor: '#e5e1d8',
  },
  opcoes: { gap: 8 },
  opcao: {
    backgroundColor: cores.branco, borderRadius: 10, padding: 14,
    borderWidth: 1.5, borderColor: '#e5e1d8',
  },
  opcaoAtiva: { borderColor: cores.ambar, backgroundColor: '#fdf3e7' },
  opcaoTexto: { fontSize: 16, color: cores.navy },
  opcaoTextoAtivo: { fontWeight: '700' },
  clienteFixo: { backgroundColor: '#eef2f7', borderRadius: 10, padding: 14 },
  clienteFixoTexto: { fontSize: 16, fontWeight: '600', color: cores.navy },
  totalCaixa: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: cores.navy, borderRadius: 12, padding: 18, marginTop: 24,
  },
  totalRotulo: { color: '#cbd5e1', fontSize: 16, fontWeight: '600' },
  totalValor: { color: '#fff', fontSize: 28, fontWeight: '800' },
  botao: {
    backgroundColor: cores.ambar, borderRadius: 12, padding: 18,
    alignItems: 'center', marginTop: 16, marginBottom: 40,
  },
  botaoTexto: { color: '#fff', fontSize: 19, fontWeight: '800' },
})
