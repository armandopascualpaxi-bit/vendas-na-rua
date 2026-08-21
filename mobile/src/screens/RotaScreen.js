import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Linking, ActivityIndicator, RefreshControl,
} from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import * as Location from 'expo-location'
import { supabase } from '../supabase'
import { cores } from '../tema'

export default function RotaScreen({ navigation }) {
  const [paragens, setParagens] = useState([])
  const [posicao, setPosicao] = useState(null)
  const [aCarregar, setACarregar] = useState(true)
  const [vendedorId, setVendedorId] = useState(null)

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
      .from('vendedores').select('id').eq('user_id', user.id).single()
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
  }, [])

  useFocusEffect(useCallback(() => { carregar() }, [carregar]))

  function abrirNavegacao(c) {
    const destino = c.lat && c.lng ? `${c.lat},${c.lng}` : encodeURIComponent(c.endereco)
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destino}`)
  }

  const centro = posicao
    || (paragens[0]?.clientes?.lat
      ? { latitude: paragens[0].clientes.lat, longitude: paragens[0].clientes.lng }
      : { latitude: 41.5518, longitude: -8.4229 })

  return (
    <View style={s.contentor}>
      <MapView
        style={s.mapa}
        initialRegion={{ ...centro, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
        showsUserLocation
      >
        {paragens.filter(p => p.clientes?.lat).map((p, i) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.clientes.lat, longitude: p.clientes.lng }}
            title={`${i + 1}. ${p.clientes.nome}`}
            description={p.clientes.endereco}
            pinColor={p.estado === 'visitado' ? 'green' : cores.ambar}
          />
        ))}
      </MapView>

      <View style={s.barra}>
        <TouchableOpacity style={s.botaoHistorico} onPress={() => navigation.navigate('Historico')}>
          <Text style={s.botaoHistoricoTexto}>📋 Vendas de hoje</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={s.sair}>Sair</Text>
        </TouchableOpacity>
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
    </View>
  )
}

const s = StyleSheet.create({
  contentor: { flex: 1, backgroundColor: cores.fundo },
  mapa: { height: '38%' },
  barra: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: cores.branco,
    borderBottomWidth: 1, borderBottomColor: '#e5e1d8',
  },
  botaoHistorico: { padding: 6 },
  botaoHistoricoTexto: { color: cores.navy, fontWeight: '700', fontSize: 16 },
  sair: { color: cores.cinza, fontSize: 15 },
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
