import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import * as Speech from 'expo-speech';
import { addScore } from '../services/ScoreManager';
import { falar } from '../services/Som';

const ATIVIDADES_NIVEL_2 = [
  { id: 1, imagem: '🍎', quantidade: 3, opcoes: [2, 3, 5] },
  { id: 2, imagem: '🦋', quantidade: 2, opcoes: [2, 4, 1] },
  { id: 3, imagem: '🚗', quantidade: 4, opcoes: [3, 4, 6] },
];

export default function DiscalculiaScreen({ navigation }) {
  const [nivel, setNivel] = useState(1);
  const [acertosSeguidos, setAcertosSeguidos] = useState(0);
  const [numeroAlvo, setNumeroAlvo] = useState(6);
  const [indiceNivel2, setIndiceNivel2] = useState(0);
  const [mensagem, setMensagem] = useState('');
  const [corFundo, setCorFundo] = useState('#F7FAFC');
  const [expressaoLumi, setExpressaoLumi] = useState('padrao');

  const imagensLumi = {
    padrao: require('../../assets/images/axlt.png'),
    heroina: require('../../assets/images/heroLumi.png'),
    confusa: require('../../assets/images/confusedLumi.png'),
  };

  const metaNivel1 = 3;

  useEffect(() => {
    iniciarFase();
  }, [nivel]);

  const iniciarFase = () => {
    setExpressaoLumi('padrao');
    if (nivel === 1) {
      const nums = [6, 9];
      const sorteado = nums[Math.floor(Math.random() * nums.length)];
      setNumeroAlvo(sorteado);
      const msg = `Toque no número: ${sorteado}`;
      setMensagem(msg);
      falar(msg, { language: 'pt-BR' });
    } else {
      setMensagem(`Quantos itens você vê?`);
      falar(`Conte as figuras e escolha o número certo.`, { language: 'pt-BR' });
    }
  };

  const verificarNivel1 = (num) => {
    if (num === numeroAlvo) {
      setExpressaoLumi('heroina');
      const novoSaldo = acertosSeguidos + 1;
      addScore('discalculia', 'acerto');
      setCorFundo('#C8E6C9');
      
      if (novoSaldo >= metaNivel1) {
        setMensagem('NÍVEL 1 CONCLUÍDO! 🎈');
        falar("Isso mesmo!", { language: 'pt-BR' });
        setTimeout(() => {
          setNivel(2);
          setCorFundo('#F7FAFC');
          setAcertosSeguidos(0); 
        }, 2000);
      } else {
        setAcertosSeguidos(novoSaldo);
        setMensagem(`Isso! Faltam ${metaNivel1 - novoSaldo}...`);
        falar("Acertou!", { language: 'pt-BR' });
        setTimeout(() => {
          setCorFundo('#F7FAFC');
          iniciarFase();
        }, 1500);
      }
    } else {
      setExpressaoLumi('confusa');
      addScore('discalculia', 'erro');
      setCorFundo('#FFCDD2');
      falar("Quase! Olhe bem o formato do número.", { language: 'pt-BR' });
      setTimeout(() => {
        setCorFundo('#F7FAFC');
        setExpressaoLumi('padrao');
      }, 1000);
    }
  };

  const verificarNivel2 = (escolha) => {
    const atual = ATIVIDADES_NIVEL_2[indiceNivel2];
    if (escolha === atual.quantidade) {
      setExpressaoLumi('heroina'); 
      addScore('discalculia', 'acerto');
      setCorFundo('#C8E6C9');
      falar("Correto!", { language: 'pt-BR' });
      
      setTimeout(() => {
        if (indiceNivel2 < ATIVIDADES_NIVEL_2.length - 1) {
          setIndiceNivel2(indiceNivel2 + 1);
          setCorFundo('#F7FAFC');
          setExpressaoLumi('padrao');
        } else {
          
          navigation.navigate('Parabens', { atividade: 'Matemática' });
        }
      }, 1500);
    } else {
      setExpressaoLumi('confusa');
      addScore('discalculia', 'erro');
      setCorFundo('#FFCDD2');
      falar("Tente contar de novo com calma.", { language: 'pt-BR' });
      setTimeout(() => {
        setCorFundo('#F7FAFC');
        setExpressaoLumi('padrao');
      }, 1000);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: corFundo }]}>
      <View style={styles.header}>
        <Text style={styles.txtNivel}>Nível {nivel}</Text>
        {nivel === 1 && <Text style={styles.txtProgresso}>⭐ {acertosSeguidos} / {metaNivel1}</Text>}
      </View>

      <Text style={styles.feedbackText}>{mensagem}</Text>

      <View style={styles.containerLumi}>
        <Image 
          source={imagensLumi[expressaoLumi]} 
          style={{ width: 160, height: 160 }} 
          resizeMode="contain"
        />
      </View>

      {nivel === 1 ? (
        <View style={styles.areaBotoes}>
          {[6, 9].map(n => (
            <TouchableOpacity key={n} style={styles.botaoNumero} onPress={() => verificarNivel1(n)}>
              <Text style={styles.textoNumero}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.areaJogo}>
          <View style={styles.cardContagem}>
            <Text style={styles.emojiGrupo}>
              {Array(ATIVIDADES_NIVEL_2[indiceNivel2].quantidade).fill(ATIVIDADES_NIVEL_2[indiceNivel2].imagem).join(' ')}
            </Text>
          </View>
          <View style={styles.areaOpcoes}>
            {ATIVIDADES_NIVEL_2[indiceNivel2].opcoes.map(opt => (
              <TouchableOpacity key={opt} style={styles.botaoOpcao} onPress={() => verificarNivel2(opt)}>
                <Text style={styles.textoOpcao}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 50, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  txtNivel: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', backgroundColor: '#E8F5E9', padding: 8, borderRadius: 10 },
  txtProgresso: { fontSize: 18, fontWeight: 'bold', color: '#FBC02D' },
  feedbackText: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#1B5E20', height: 70 },
  containerLumi: { marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  areaBotoes: { flexDirection: 'row', gap: 30 },
  botaoNumero: { backgroundColor: '#2E7D32', padding: 35, borderRadius: 30, width: 130, alignItems: 'center', elevation: 8 },
  textoNumero: { fontSize: 60, color: '#FFF', fontWeight: 'bold' },
  cardContagem: { backgroundColor: '#FFF', padding: 25, borderRadius: 30, alignItems: 'center', elevation: 8, width: '90%', marginBottom: 25 },
  emojiGrupo: { fontSize: 40, textAlign: 'center', lineHeight: 60 },
  areaJogo: { width: '100%', alignItems: 'center' },
  areaOpcoes: { flexDirection: 'row', gap: 15 },
  botaoOpcao: { backgroundColor: '#2E7D32', width: 75, height: 75, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  textoOpcao: { fontSize: 35, color: '#FFF', fontWeight: 'bold' },
});