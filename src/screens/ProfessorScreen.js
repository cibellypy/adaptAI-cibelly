import { scores } from '../services/ScoreManager';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Lumi from './Lumi'; 

export default function ProfessorScreen({ navigation }) {
  
  const relatorio = [
    { 
      id: '1', 
      atividade: 'Atividade de Discalculia', 
      acertos: scores.discalculiaAcertos, 
      erros: scores.discalculiaErros, 
      data: 'Sessão Atual' 
    },
    { 
      id: '2', 
      atividade: 'Atividade de Dislexia', 
      acertos: scores.dislexiaAcertos, 
      erros: scores.dislexiaErros,    
      data: 'Sessão Atual' 
    },
    { 
      id: '3', 
      atividade: 'Atividade de Modo VR', 
      acertos: scores.vrAcertos, 
      erros: scores.vrErros,    
      data: 'Sessão Atual' 
    },
  ];

  return (
    <View style={styles.container}>
      
      <View style={styles.header}>
        <View style={styles.textoHeader}>
          <Text style={styles.titulo}>Painel do Professor 👩‍🏫</Text>
          <Text style={styles.subtitulo}>Acompanhamento de Desempenho</Text>
        </View>
        <Lumi width={80} height={80} />
      </View>

      <ScrollView style={styles.lista} showsVerticalScrollIndicator={false}>
        {relatorio.map((item) => (
          <View key={item.id} style={styles.cardRelatorio}>
            <Text style={styles.nomeAtividade}>{item.atividade}</Text>
            <Text style={styles.dataText}>Última tentativa: {item.data}</Text>
            
            <View style={styles.stats}>
              <View style={[styles.statBox, { backgroundColor: '#C8E6C9' }]}>
                <Text style={styles.statNumero}>{item.acertos}</Text>
                <Text style={styles.statLabel}>Acertos</Text>
              </View>
              
              <View style={[styles.statBox, { backgroundColor: '#FFCDD2' }]}>
                <Text style={styles.statNumero}>{item.erros}</Text>
                <Text style={styles.statLabel}>Erros</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.btnVoltar} onPress={() => navigation.goBack()}>
        <Text style={styles.txtVoltar}>Voltar ao Menu</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC', padding: 20, paddingTop: 60 },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 20 
  },
  textoHeader: { flex: 1 },

  titulo: { fontSize: 24, fontWeight: 'bold', color: '#1A365D' },
  subtitulo: { fontSize: 14, color: '#718096' },
  
  lista: { flex: 1 },
  
  cardRelatorio: { 
    backgroundColor: '#FFF', 
    padding: 20, 
    borderRadius: 15, 
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  nomeAtividade: { fontSize: 18, fontWeight: 'bold', color: '#2D3748' },
  dataText: { fontSize: 12, color: '#A0AEC0', marginBottom: 15 },
  
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  statNumero: { fontSize: 20, fontWeight: 'bold', color: '#1A365D' },
  statLabel: { fontSize: 12, color: '#2D3748' },
  
  btnVoltar: { 
    backgroundColor: '#1A365D', 
    padding: 18, 
    borderRadius: 12, 
    marginTop: 10,
    marginBottom: 10 
  },
  txtVoltar: { color: '#FFF', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }
});