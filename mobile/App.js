import { supabase } from './src/supabase'
import { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View, Text, ScrollView, Alert } from 'react-native'
import { cores } from './src/tema'
import LoginScreen from './src/screens/LoginScreen'
import RotaScreen from './src/screens/RotaScreen'
import RegistarVendaScreen from './src/screens/RegistarVendaScreen'
import RegistarPagamentoScreen from './src/screens/RegistarPagamentoScreen'
import HistoricoScreen from './src/screens/HistoricoScreen'

const Stack = createNativeStackNavigator()

const opcoes = {
  headerStyle: { backgroundColor: cores.navy },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
}

class ErrorBoundary extends require('react').Component {
  constructor(props) {
    super(props)
    this.state = { erro: null }
  }
  static getDerivedStateFromError(erro) {
    return { erro }
  }
  render() {
    if (this.state.erro) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#fff', padding: 20, marginTop: 40 }}>
          <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 16 }}>ERRO:</Text>
          <Text style={{ color: 'red', marginTop: 10 }}>{String(this.state.erro)}</Text>
          <Text style={{ marginTop: 20 }}>{this.state.erro?.stack}</Text>
        </ScrollView>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [sessao, setSessao] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      Alert.alert('getSession', JSON.stringify({ temSessao: !!data.session }))
      setSessao(data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      Alert.alert('onAuthStateChange', JSON.stringify({ evento: _e, temSessao: !!s }))
      setSessao(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (sessao === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: cores.fundo }}>
        <ActivityIndicator size="large" color={cores.ambar} />
      </View>
    )
  }

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <Stack.Navigator screenOptions={opcoes}>
          {sessao ? (
            <>
              <Stack.Screen name="Rota" component={RotaScreen} options={{ title: 'Rota do dia' }} />
              <Stack.Screen name="RegistarVenda" component={RegistarVendaScreen} options={{ title: 'Registar venda' }} />
              <Stack.Screen name="RegistarPagamento" component={RegistarPagamentoScreen} options={{ title: 'Registar pagamento' }} />
              <Stack.Screen name="Historico" component={HistoricoScreen} options={{ title: 'Vendas de hoje' }} />
            </>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  )
}
