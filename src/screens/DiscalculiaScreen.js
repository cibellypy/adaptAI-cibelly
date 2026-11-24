import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { addScore } from '../services/ScoreManager';
import { falar, falarElogio, falarAleatorio, pararFala, aguardarPeloMenos } from '../services/Som';

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

  // Evita registrar a mesma resposta várias vezes por toque rápido.
  const [interacaoBloqueada, setInteracaoBloqueada] = useState(false);
  const interacaoBloqueadaRef = useRef(false);
  const montadoRef = useRef(true);

  const bloquearInteracao = () => {
    interacaoBloqueadaRef.current = true;
    setInteracaoBloqueada(true);
  };

  const liberarInteracao = () => {
    interacaoBloqueadaRef.current = false;
    if (montadoRef.current) {
      setInteracaoBloqueada(false);
    }
  };

  const imagensLumi = {
    padrao: require('../../assets/images/axlt.png'),
    heroina: require('../../assets/images/heroLumi.png'),
    confusa: require('../../assets/images/confusedLumi.png'),
  };

  const metaNivel1 = 3;

  useEffect(() => {
    montadoRef.current = true;

    return () => {
      montadoRef.current = false;
      pararFala();
    };
  }, []);

  useEffect(() => {
    interacaoBloqueadaRef.current = false;
    setInteracaoBloqueada(false);
    iniciarFase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel]);

  const iniciarFase = () => {
    setExpressaoLumi('padrao');
    if (nivel === 1) {
      const nums = [6, 9];
      const sorteado = nums[Math.floor(Math.random() * nums.length)];
      setNumeroAlvo(sorteado);
      const msg = `Toque no número: ${sorteado}`;
      setMensagem(msg);
      // Passa a chave '6' ou '9' para tocar o áudio correto
      falar(msg, String(sorteado));
    } else {
      setMensagem(`Quantos itens você vê?`);
      // Passa a chave 'conteasfiguras'
      falar(`Conte as figuras e escolha o número certo.`, 'conteasfiguras');
    }
  };

  const verificarNivel1 = (num) => {
    if (interacaoBloqueadaRef.current) return;
    bloquearInteracao();

    if (num === numeroAlvo) {
      setExpressaoLumi('heroina');
      const novoSaldo = acertosSeguidos + 1;
      addScore('discalculia', 'acerto');
      setCorFundo('#C8E6C9');
      
      if (novoSaldo >= metaNivel1) {
        setMensagem('NÍVEL 1 CONCLUÍDO! 🎈');
        // Só muda de nível DEPOIS que o elogio tiver tocado inteiro
        Promise.all([falarElogio(), aguardarPeloMenos(600)]).then(() => {
          if (!montadoRef.current) return;
          setNivel(2);
          setCorFundo('#F7FAFC');
          setAcertosSeguidos(0);
        });
      } else {
        setAcertosSeguidos(novoSaldo);
        setMensagem(`Isso! Faltam ${metaNivel1 - novoSaldo}...`);
        // Só reinicia a fase DEPOIS que o elogio tiver tocado inteiro
        Promise.all([falarElogio(), aguardarPeloMenos(600)]).then(() => {
          if (!montadoRef.current) return;
          setCorFundo('#F7FAFC');
          iniciarFase();
          liberarInteracao();
        });
      }
    } else {
      setExpressaoLumi('confusa');
      addScore('discalculia', 'erro');
      setCorFundo('#FFCDD2');
      // Só volta o fundo ao normal DEPOIS que a fala de erro tiver tocado inteira
      Promise.all([
        falarAleatorio("Quase! Olhe bem o formato do número.", ['quaseolhebem', 'hum_tentamaisumavez']),
        aguardarPeloMenos(600),
      ]).then(() => {
        if (!montadoRef.current) return;
        setCorFundo('#F7FAFC');
        setExpressaoLumi('padrao');
        liberarInteracao();
      });
    }
  };

  const verificarNivel2 = (escolha) => {
    if (interacaoBloqueadaRef.current) return;
    bloquearInteracao();

    const atual = ATIVIDADES_NIVEL_2[indiceNivel2];
    if (escolha === atual.quantidade) {
      setExpressaoLumi('heroina'); 
      addScore('discalculia', 'acerto');
      setCorFundo('#C8E6C9');
      // Só avança DEPOIS que o elogio tiver tocado inteiro
      Promise.all([falarElogio(), aguardarPeloMenos(600)]).then(() => {
        if (!montadoRef.current) return;

        if (indiceNivel2 < ATIVIDADES_NIVEL_2.length - 1) {
          setIndiceNivel2(indiceNivel2 + 1);
          setCorFundo('#F7FAFC');
          setExpressaoLumi('padrao');
          liberarInteracao();
        } else {
          navigation.navigate('Parabens', { atividade: 'Matemática' });
        }
      });
    } else {
      setExpressaoLumi('confusa');
      addScore('discalculia', 'erro');
      setCorFundo('#FFCDD2');
      // Só volta o fundo ao normal DEPOIS que a fala de erro tiver tocado inteira
      Promise.all([
        falarAleatorio("Tente contar de novo com calma.", ['tentecontardenovo', 'hum_tentamaisumavez']),
        aguardarPeloMenos(600),
      ]).then(() => {
        if (!montadoRef.current) return;
        setCorFundo('#F7FAFC');
        setExpressaoLumi('padrao');
        liberarInteracao();
      });
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
            <TouchableOpacity
              key={n}
              style={styles.botaoNumero}
              disabled={interacaoBloqueada}
              onPress={() => verificarNivel1(n)}
            >
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
              <TouchableOpacity
                key={opt}
                style={styles.botaoOpcao}
                disabled={interacaoBloqueada}
                onPress={() => verificarNivel2(opt)}
              >
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