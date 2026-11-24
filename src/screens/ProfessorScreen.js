import { scores, resetScores } from '../services/ScoreManager';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image} from 'react-native';


export default function ProfessorScreen({ navigation }) {
  // Só serve para forçar a tela a redesenhar depois de zerar.
  const [, setAtualizar] = useState(0);

  const relatorio = [
    { 
      id: '1', 
      atividade: 'Atividade de Discalculia', 
      acertos: scores.discalculiaAcertos, 
      erros: scores.discalculiaErros, 
    },
    { 
      id: '2', 
      atividade: 'Atividade de Dislexia', 
      acertos: scores.dislexiaAcertos, 
      erros: scores.dislexiaErros,    
    },
    { 
      id: '3', 
      atividade: 'Atividade de Modo VR', 
      acertos: scores.vrAcertos, 
      erros: scores.vrErros,    
    },
  ];

  const zerar = () => {
    resetScores();
    setAtualizar((n) => n + 1);
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.header}>
        <View style={styles.textoHeader}>
          <Text style={styles.titulo}>Painel do Professor 👩‍🏫</Text>
          <Text style={styles.subtitulo}>Acompanhamento de Desempenho</Text>
        </View>
        <Image
  source={require('../../assets/images/heroLumi.png')}
  style={{ width: 80, height: 80 }}
  resizeMode="contain"
/>
      </View>

      <ScrollView style={styles.lista} showsVerticalScrollIndicator={false}>
        {relatorio.map((item) => {
          const total = item.acertos + item.erros;
          const porcentagem = total > 0 ? Math.round((item.acertos / total) * 100) : null;

          return (
          <View key={item.id} style={styles.cardRelatorio}>
            <Text style={styles.nomeAtividade}>{item.atividade}</Text>
            <Text style={styles.dataText}>
              {total > 0
                ? `${total} respostas · ${porcentagem}% de acerto`
                : 'Ainda não houve tentativas'}
            </Text>
            
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
          );
        })}

        <Text style={styles.aviso}>
          O Adapt é uma ferramenta de apoio ao aprendizado e não substitui a avaliação de um profissional.
        </Text>
      </ScrollView>

      <TouchableOpacity style={styles.btnZerar} onPress={zerar}>
        <Text style={styles.txtZerar}>Zerar pontuação</Text>
      </TouchableOpacity>

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
  dataText: { fontSize: 13, color: '#718096', marginBottom: 15 },
  
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  statNumero: { fontSize: 20, fontWeight: 'bold', color: '#1A365D' },
  statLabel: { fontSize: 12, color: '#2D3748' },
  
  aviso: { fontSize: 12, color: '#718096', textAlign: 'center', marginTop: 5, marginBottom: 15 },
  btnZerar: { padding: 12, alignItems: 'center' },
  txtZerar: { color: '#C53030', fontWeight: 'bold', fontSize: 14, textDecorationLine: 'underline' },

  btnVoltar: { 
    backgroundColor: '#1A365D', 
    padding: 18, 
    borderRadius: 12, 
    marginTop: 10,
    marginBottom: 10 
  },
  txtVoltar: { color: '#FFF', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }
});