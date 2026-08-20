import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native'
import { supabase } from '../supabase'
import { cores } from '../tema'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [aEntrar, setAEntrar] = useState(false)

  async function entrar() {
    setErro('')
    setAEntrar(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
console.log('LOGIN RESULT:', JSON.stringify({ data, error }))
    if (error) setErro('Credenciais inválidas.')
    setAEntrar(false)
  }

  return (
    <View style={s.contentor}>
      <Image source={require('../../assets/icon.png')} style={s.logo} resizeMode="contain" />
      <Text style={s.subtitulo}>Inicia sessão com a tua conta de vendedor</Text>
      <TextInput
        style={s.campo}
        placeholder="Email"
        placeholderTextColor={cores.cinza}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={s.campo}
        placeholder="Password"
        placeholderTextColor={cores.cinza}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {!!erro && <Text style={s.erro}>{erro}</Text>}
      <TouchableOpacity style={s.botao} onPress={entrar} disabled={aEntrar}>
        {aEntrar ? <ActivityIndicator color="#fff" /> : <Text style={s.botaoTexto}>Entrar</Text>}
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  contentor: { flex: 1, backgroundColor: cores.fundo, justifyContent: 'center', padding: 28 },
  logo: { width: 96, height: 96, alignSelf: 'center', marginBottom: 8 },
  titulo: { fontSize: 32, fontWeight: '800', color: cores.navy },
  subtitulo: { fontSize: 16, color: cores.cinza, marginTop: 6, marginBottom: 28 },
  campo: {
    backgroundColor: cores.branco, borderRadius: 10, padding: 16, fontSize: 17,
    color: cores.navy, marginBottom: 14, borderWidth: 1, borderColor: '#e5e1d8',
  },
  erro: { color: cores.vermelho, marginBottom: 10, fontSize: 15 },
  botao: { backgroundColor: cores.ambar, borderRadius: 10, padding: 17, alignItems: 'center', marginTop: 6 },
  botaoTexto: { color: '#fff', fontSize: 18, fontWeight: '700' },
})
