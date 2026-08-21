import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { supabase } from '../supabase'
import { cores } from '../tema'

const METODOS = ['dinheiro', 'transferência', 'multicaixa']

export default function RegistarPagamentoScreen({ route, navigation }) {
  const { cliente, vendedorId } = route.params || {}
  const [valor, setValor] = useState('')
  const [metodo, setMetodo] = useState('dinheiro')
  const [aGravar, setAGravar] = useState(false)

  async function submeter() {
    const v = parseFloat(String(valor).replace(',', '.'))
    if (!v || v <= 0) return Alert.alert('Valor inválido', 'Introduz um valor válido.')

    setAGravar(true)
    let vid = vendedorId
    if (!vid) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: perfil } = await supabase.from('vendedores').select('id').eq('user_id', user.id).single()
      vid = perfil.id
    }

    const { error } = await supabase.from('pagamentos').insert({
      cliente_id: cliente?.id,
      vendedor_id: vid,
      valor: v,
      metodo,
    })

    setAGravar(false)
    if (error) return Alert.alert('Erro ao gravar', error.message)

    Alert.alert('Pagamento registado ✔', `${v.toFixed(2)} AOA`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ])
  }

  return (
    <ScrollView style={s.contentor} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.rotulo}>Cliente</Text>
      <View style={s.clienteFixo}>
        <Text style={s.clienteFixoTexto}>{cliente?.nome}</Text>
      </View>

      <Text style={s.rotulo}>Valor (AOA)</Text>
      <TextInput
        style={s.campo}
        keyboardType="decimal-pad"
        value={valor}
        onChangeText={setValor}
        placeholder="0.00"
        placeholderTextColor={cores.cinza}
      />

      <Text style={s.rotulo}>Método</Text>
      <View style={s.opcoes}>
        {METODOS.map(m => (
          <TouchableOpacity
            key={m}
            style={[s.opcao, metodo === m && s.opcaoAtiva]}
            onPress={() => setMetodo(m)}
          >
            <Text style={[s.opcaoTexto, metodo === m && s.opcaoTextoAtivo]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={s.botao} onPress={submeter} disabled={aGravar}>
        {aGravar
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.botaoTexto}>Registar pagamento</Text>}
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
  botao: {
    backgroundColor: cores.ambar, borderRadius: 12, padding: 18,
    alignItems: 'center', marginTop: 24, marginBottom: 40,
  },
  botaoTexto: { color: '#fff', fontSize: 19, fontWeight: '800' },
})
