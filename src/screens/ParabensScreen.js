import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

export default function ParabensScreen({ navigation, route }) {
  
  const { atividade } = route.params || { atividade: 'Desafio' };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>INCRÍVEL!</Text>
      
      <Text style={styles.subtitulo}>
        Ebaaaaa! Você mandou muito bem! 
      </Text>

     
      <View style={styles.containerGif}>
        <Image
          source={require('../../assets/images/vitoriaLumiGif.gif')}
          style={styles.gif}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.mensagem}>Ganhou um prêmio de campeão! 🏆</Text>

      <TouchableOpacity 
        style={styles.botaoVoltar} 
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.textoBotao}>Voltar ao Início</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  titulo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 10,
  },
  subtitulo: {
    fontSize: 20,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 30,
  },
  containerGif: {
    width: 280,
    height: 280,
    marginBottom: 30,
  },
  gif: {
    width: '100%',
    height: '100%',
  },
  mensagem: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 40,
  },
  botaoVoltar: {
    backgroundColor: '#1A365D',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 30,
    elevation: 5,
  },
  textoBotao: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});