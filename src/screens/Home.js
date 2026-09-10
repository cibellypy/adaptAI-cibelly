import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Image } from 'react-native';
import Lumi from './Lumi';
import { falar, pararFala, setSomAtivadoGlobal } from '../services/Som';

export default function Home({ navigation }) {

  const iconeLivro = require('../../assets/images/livro.webp');
  const iconeNumeros3D = require('../../assets/images/numeros3D.png');
  const iconeVR3D = require('../../assets/images/vr3D.png');
  const iconeProfessor3D = require('../../assets/images/professor3D.png');

  const [somAtivado, setSomAtivado] = useState(true);

  // Fala de boas-vindas (usa o áudio local "lumi_boasvindas" — ver Falas.js)
  const tocarBoasVindas = () => {
    if (!somAtivado) return;
    falar('Oi, eu sou a Lumi. Vamos aprender juntos?', 'lumi_boasvindas');
  };

  // Fala do botão "Ouvir a Lumi" (usa o áudio local "home" — ver Falas.js)
  const lumiFala = () => {
    if (!somAtivado) return;
    falar('Eu sou a Lumi. Escolha uma opção para começar!', 'home');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      tocarBoasVindas();
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>


        <View style={styles.header}>
          <Text style={styles.headerTitle}>Lumi</Text>
          <Text style={styles.headerSubtitle}>Suporte Especializado </Text>
        </View>


        <View style={styles.areaMascote}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={tocarBoasVindas}
            style={styles.balao}
          >
            <Text style={styles.textoBalao}>Oi, Eu sou a Lumi. Vamos aprender? </Text>
          </TouchableOpacity>

          <Lumi width={180} height={180} />
        </View>


        <View style={styles.grid}>


          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Dislexia')}
          >
            <Image source={iconeLivro} style={styles.imagemIcone3D} />
            <Text style={styles.cardTexto}>Dislexia</Text>
          </TouchableOpacity>


          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Discalculia')}
          >
            <Image source={iconeNumeros3D} style={styles.imagemIcone3D} />
            <Text style={styles.cardTexto}>Discalculia</Text>
          </TouchableOpacity>


          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ModoVR')}
          >
            <Image source={iconeVR3D} style={styles.imagemIcone3D} />
            <Text style={styles.cardTexto}>Modo VR</Text>
          </TouchableOpacity>


          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Professor')}
          >
            <Image source={iconeProfessor3D} style={styles.imagemIcone3D} />
            <Text style={styles.cardTexto}>Professor</Text>
          </TouchableOpacity>

        </View>

        <TouchableOpacity
          style={styles.btnOuvir}
          onPress={lumiFala}
        >
          <Text style={styles.txtOuvir}>🔊 Ouvir a Lumi</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoSom}
          onPress={() => {
            pararFala();
            const novoValor = !somAtivado;
            setSomAtivado(novoValor);
            setSomAtivadoGlobal(novoValor);
          }}
        >
          <Text style={styles.textoBotaoSom}>
            {somAtivado ? '🔊 Silenciar a Lumi' : '🔇 lumi silenciada'}
          </Text>
        </TouchableOpacity>


      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingVertical: 40, alignItems: 'center' },

  header: { marginBottom: 20, alignItems: 'center' },
  headerTitle: { fontSize: 36, fontWeight: '900', color: '#1E293B' },
  headerSubtitle: { fontSize: 16, color: '#64748B', marginTop: 4 },

  areaMascote: { alignItems: 'center', marginBottom: 25 },
  balao: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  textoBalao: { fontSize: 16, fontWeight: 'bold', color: '#334155' },

  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20
  },

  card: {
    backgroundColor: '#FFF',
    width: '45%',
    height: 140,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
  },

  imagemIcone3D: {
    width: 80,
    height: 80,
    marginBottom: 5,
    resizeMode: 'cover',
  },

  cardTexto: { fontSize: 16, fontWeight: '700', color: '#1E293B' },

  btnOuvir: { marginTop: 20, padding: 10 },
  txtOuvir: { color: '#94A3B8', fontSize: 14, textDecorationLine: 'underline' },

  textoBotaoSom: {
    color: '#94A3B8', fontSize: 14, textDecorationLine: 'underline'
  },

});