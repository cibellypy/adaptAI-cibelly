import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, PanResponder } from 'react-native';
import * as Speech from 'expo-speech';
import { addScore } from '../services/ScoreManager';
import { falar, falarElogio, pararFala } from '../services/Som';

// ============================================================
// BANCOS DE ATIVIDADES
// ============================================================

// NÍVEL 1 — Letras espelhadas (confusão visual clássica da dislexia)
const PARES_NIVEL1 = [
  { par: ['B', 'D'], fonemas: { B: 'BÊ', D: 'DÊ' }, chaveAudio: { B: 'letraB', D: 'letraD' } },
  { par: ['P', 'Q'], fonemas: { P: 'PÊ', Q: 'QUÊ' }, chaveAudio: { P: 'letraP', Q: 'letraQ' } },
  { par: ['M', 'W'], fonemas: { M: 'EME', W: 'DÁBLIU' }, chaveAudio: { M: 'letraM', W: 'letraW' } },
];

// NÍVEL 2 — Complete a palavra (posição da letra variando: início, meio, fim)
const ATIVIDADES_NIVEL2 = [
  { id: 1, imagem: '⚽', palavra: '_ OLA', posicao: 'início', letraCorreta: 'B', opcoes: ['B', 'D', 'P', 'Q'] },
  { id: 2, imagem: '🎲', palavra: '_ ADO', posicao: 'início', letraCorreta: 'D', opcoes: ['D', 'B', 'P', 'Q'] },
  { id: 3, imagem: '🦆', palavra: '_ ATO', posicao: 'início', letraCorreta: 'P', opcoes: ['P', 'Q', 'B', 'D'] },
  { id: 4, imagem: '🧀', palavra: '_ UEIJO', posicao: 'início', letraCorreta: 'Q', opcoes: ['Q', 'P', 'D', 'B'] },
  { id: 5, imagem: '⚽', palavra: 'BO _ A', posicao: 'meio', letraCorreta: 'L', opcoes: ['L', 'R', 'N', 'M'] },
  { id: 6, imagem: '🐟', palavra: 'PEI _ E', posicao: 'meio', letraCorreta: 'X', opcoes: ['X', 'C', 'S', 'Z'] },
  { id: 7, imagem: '⚽', palavra: 'BOL _', posicao: 'fim', letraCorreta: 'A', opcoes: ['A', 'O', 'E', 'I'] },
  { id: 8, imagem: '🐱', palavra: 'GAT _', posicao: 'fim', letraCorreta: 'O', opcoes: ['O', 'A', 'U', 'E'] },
];

// NÍVEL 3 — Monte a Palavra
const PALAVRAS_NIVEL3 = [
  { id: 1, imagem: '⚽', palavra: 'BOLA' },
  { id: 2, imagem: '🐱', palavra: 'GATO' },
  { id: 3, imagem: '☀️', palavra: 'SOL' },
  { id: 4, imagem: '🦆', palavra: 'PATO' },
];

// NÍVEL 4 — Discriminação de sons parecidos
const ATIVIDADES_NIVEL4 = [
  { id: 1, palavraCerta: 'FACA', imagemCerta: '🔪', palavraErrada: 'VACA', imagemErrada: '🐄' },
  { id: 2, palavraCerta: 'PATO', imagemCerta: '🦆', palavraErrada: 'GATO', imagemErrada: '🐱' },
  { id: 3, palavraCerta: 'BOLA', imagemCerta: '⚽', palavraErrada: 'BOLO', imagemErrada: '🎂' },
  { id: 4, palavraCerta: 'FOGO', imagemCerta: '🔥', palavraErrada: 'JOGO', imagemErrada: '🎮' },
];

const TOTAL_NIVEIS = 4;

// Embaralha um array sem alterar o original (Fisher-Yates)
function embaralhar(array) {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// ------------------------------------------------------------
// Componente de letra arrastável (drag-and-drop) usado no Nível 3.
// ------------------------------------------------------------
function LetraArrastavel({ letra, onSoltar }) {
  const pan = useRef(new Animated.ValueXY()).current;
  const removida = useRef(false);

  const onSoltarRef = useRef(onSoltar);
  useEffect(() => {
    onSoltarRef.current = onSoltar;
  }, [onSoltar]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (evt, gestureState) => {
        Promise.resolve(onSoltarRef.current(letra, gestureState.moveX, gestureState.moveY)).then(
          (encaixou) => {
            if (encaixou) {
              removida.current = true;
              pan.setValue({ x: 9999, y: 9999 });
            } else {
              Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: false,
              }).start();
            }
          }
        );
      },
    })
  ).current;

  if (removida.current) return null;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.letraArrastavel, { transform: pan.getTranslateTransform() }]}
    >
      <Text style={styles.textoLetraArrastavel}>{letra}</Text>
    </Animated.View>
  );
}

export default function DislexiaScreen({ navigation }) {
  const [nivel, setNivel] = useState(1);
  const [acertosSeguidos, setAcertosSeguidos] = useState(0);
  const [mensagem, setMensagem] = useState('');
  const [corFundo, setCorFundo] = useState('#F7FAFC');
  const [expressaoLumi, setExpressaoLumi] = useState('padrao');

  // Estado específico do Nível 1
  const [parAtual, setParAtual] = useState(PARES_NIVEL1[0]);
  const [letraAlvo, setLetraAlvo] = useState('B');
  const [opcoesNivel1Embaralhadas, setOpcoesNivel1Embaralhadas] = useState([]);

  // Estado específico dos Níveis 2 e 4 (índice dentro do banco de atividades)
  const [indiceAtividade, setIndiceAtividade] = useState(0);

  // Estado específico do Nível 2 (opções embaralhadas para cada rodada)
  const [opcoesNivel2Embaralhadas, setOpcoesNivel2Embaralhadas] = useState([]);

  // Estado específico do Nível 4 (posição embaralhada das imagens)
  const [imagensInvertidas, setImagensInvertidas] = useState(false);

  // Estado específico do Nível 3 (Monte a Palavra)
  const [letrasBandeja, setLetrasBandeja] = useState([]);
  const [slotsPreenchidos, setSlotsPreenchidos] = useState([]);
  const slotRefsArray = useRef([]);

  const imagensLumi = {
    padrao: require('../../assets/images/axlt.png'),
    heroina: require('../../assets/images/heroLumi.png'),
    confusa: require('../../assets/images/confusedLumi.png'),
  };

  const metaNivel1 = 3;

  const indiceSeguroNivel2 = Math.min(indiceAtividade, ATIVIDADES_NIVEL2.length - 1);
  const indiceSeguroNivel3 = Math.min(indiceAtividade, PALAVRAS_NIVEL3.length - 1);
  const indiceSeguroNivel4 = Math.min(indiceAtividade, ATIVIDADES_NIVEL4.length - 1);

  useEffect(() => {
    setIndiceAtividade(0);
    setAcertosSeguidos(0);
    iniciarFase();
    return () => {
      pararFala();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel]);

  // Atualiza as opções embaralhadas do Nível 2 sempre que o índice mudar
  useEffect(() => {
    if (nivel === 2) {
      const atual = ATIVIDADES_NIVEL2[indiceSeguroNivel2];
      setOpcoesNivel2Embaralhadas(embaralhar(atual.opcoes));
    }
  }, [nivel, indiceAtividade]);

  // ------------------------------------------------------------
  // Introdução falada de cada fase
  // ------------------------------------------------------------
  const iniciarFase = () => {
    setExpressaoLumi('padrao');

    if (nivel === 1) {
      const par = PARES_NIVEL1[Math.floor(Math.random() * PARES_NIVEL1.length)];
      const sorteada = par.par[Math.floor(Math.random() * par.par.length)];
      setParAtual(par);
      setLetraAlvo(sorteada);
      setOpcoesNivel1Embaralhadas(embaralhar(par.par)); // Embaralha as posições das letras do Nível 1
      const msg = `Encontre a letra: ${par.fonemas[sorteada]}`;
      setMensagem(msg);
      falar(msg, par.chaveAudio[sorteada]);
    } else if (nivel === 2) {
      setMensagem('Nível 2: Complete a palavra');
      falar('Mandou bem! Agora complete as palavras.', 'completepalavras');
    } else if (nivel === 3) {
      montarBandejaNivel3(0);
      setMensagem('Nível 3: Arraste as letras até o lugar certo');
      falar('Arraste as letrinhas para montar a palavra certa.', 'nivel3');
    } else if (nivel === 4) {
      setImagensInvertidas(Math.random() < 0.5);
      setMensagem('Nível 4: Qual imagem combina com o som?');
      falar('Ouça a palavra e toque na imagem certa.', 'nivel4');
      setTimeout(() => {
        const p = ATIVIDADES_NIVEL4[0];
        falar(p.palavraCerta, p.palavraCerta.toLowerCase());
      }, 1800);
    }
  };

  const montarBandejaNivel3 = (indice) => {
    const atual = PALAVRAS_NIVEL3[indice];
    const letras = atual.palavra.split('').map((l, idx) => ({ id: `${idx}-${l}-${Date.now()}`, letra: l }));
    slotRefsArray.current = [];
    setLetrasBandeja(embaralhar(letras));
    setSlotsPreenchidos(Array(atual.palavra.length).fill(null));
    setTimeout(() => falar(atual.palavra, atual.palavra.toLowerCase()), 600);
  };

  const avancarNivel = () => {
    if (nivel < TOTAL_NIVEIS) {
      setMensagem(`NÍVEL ${nivel} CONCLUÍDO! 🎉`);
      falar('Isso mesmo! Vamos para o próximo desafio.', 'proximodesafio').then(() => {
        setIndiceAtividade(0);
        setAcertosSeguidos(0);
        setNivel(nivel + 1);
        setCorFundo('#F7FAFC');
      });
    } else {
      setMensagem('VOCÊ CONCLUIU TODOS OS NÍVEIS! 🏆');
      falar('Parabéns! Você dominou todas as atividades.', 'parabensdominou').then(() => {
        navigation.navigate('Parabens', { atividade: 'Dislexia' });
      });
    }
  };

  const registrarAcerto = (mensagemFeedback, falaFeedback, chaveAudio = null) => {
    setExpressaoLumi('heroina');
    addScore('dislexia', 'acerto');
    setCorFundo('#C6F6D5');
    setMensagem(mensagemFeedback);
    if (falaFeedback) falar(falaFeedback, chaveAudio);
  };

  const registrarErro = (falaFeedback, chaveAudio = null) => {
    setExpressaoLumi('confusa');
    addScore('dislexia', 'erro');
    setCorFundo('#FED7D7');
    falar(falaFeedback, chaveAudio);
    setTimeout(() => {
      setCorFundo('#F7FAFC');
      setExpressaoLumi('padrao');
    }, 1200);
  };

  // ------------------------------------------------------------
  // NÍVEL 1 — Letras espelhadas
  // ------------------------------------------------------------
  const verificarNivel1 = (letra) => {
    if (letra === letraAlvo) {
      const novoSaldo = acertosSeguidos + 1;
      if (novoSaldo >= metaNivel1) {
        registrarAcerto('', null);
        setTimeout(() => avancarNivel(), 300);
      } else {
        setAcertosSeguidos(novoSaldo);
        falarElogio();
        registrarAcerto(`Isso! Só mais ${metaNivel1 - novoSaldo}...`, null);
        setTimeout(() => {
          setCorFundo('#F7FAFC');
          iniciarFase();
        }, 1500);
      }
    } else {
      registrarErro('Quase! Essa é a outra letra.', 'quase');
    }
  };

  // ------------------------------------------------------------
  // NÍVEL 2 — Complete a palavra
  // ------------------------------------------------------------
  const verificarNivel2 = (letra) => {
    const atual = ATIVIDADES_NIVEL2[indiceAtividade];
    if (letra === atual.letraCorreta) {
      falarElogio();
      registrarAcerto('', null);
      setTimeout(() => {
        if (indiceAtividade < ATIVIDADES_NIVEL2.length - 1) {
          setIndiceAtividade(indiceAtividade + 1);
          setCorFundo('#F7FAFC');
          setExpressaoLumi('padrao');
        } else {
          avancarNivel();
        }
      }, 1500);
    } else {
      registrarErro('Tente outra letra!', 'tenteoutraletra');
    }
  };

  // ------------------------------------------------------------
  // NÍVEL 3 — Monte a Palavra (drag-and-drop)
  // ------------------------------------------------------------
  const medirSlot = (idx) => {
    return new Promise((resolve) => {
      const ref = slotRefsArray.current[idx];
      if (!ref) {
        resolve(null);
        return;
      }
      ref.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
    });
  };

  const soltarLetraNivel3 = async (letra, moveX, moveY) => {
    const atual = PALAVRAS_NIVEL3[indiceAtividade];

    let slotIndex = -1;
    for (let idx = 0; idx < atual.palavra.length; idx++) {
      if (slotsPreenchidos[idx]) continue;
      const layout = await medirSlot(idx);
      if (!layout) continue;
      if (
        moveX >= layout.x &&
        moveX <= layout.x + layout.width &&
        moveY >= layout.y &&
        moveY <= layout.y + layout.height
      ) {
        slotIndex = idx;
        break;
      }
    }

    if (slotIndex === -1) return false;

    const letraEsperada = atual.palavra[slotIndex];

    if (letra === letraEsperada) {
      const novosSlots = [...slotsPreenchidos];
      novosSlots[slotIndex] = letra;
      setSlotsPreenchidos(novosSlots);
      setExpressaoLumi('heroina');
      addScore('dislexia', 'acerto');

      const completou = novosSlots.every((s) => s !== null);
      if (completou) {
        setCorFundo('#C6F6D5');
        setMensagem('Palavra montada! 🎉');
        falar('Você montou a palavra certinho!', 'montoucertinho');
        setTimeout(() => {
          setCorFundo('#F7FAFC');
          if (indiceAtividade < PALAVRAS_NIVEL3.length - 1) {
            const prox = indiceAtividade + 1;
            setIndiceAtividade(prox);
            setExpressaoLumi('padrao');
            montarBandejaNivel3(prox);
          } else {
            avancarNivel();
          }
        }, 1800);
      } else {
        setTimeout(() => setExpressaoLumi('padrao'), 800);
      }
      return true;
    } else {
      registrarErro('Essa letra não é essa, tenta outro espaço!', 'tentaoutroespaco');
      return false;
    }
  };

  // ------------------------------------------------------------
  // NÍVEL 4 — Discriminação de sons parecidos
  // ------------------------------------------------------------
  const verificarNivel4 = (escolhaCerta) => {
    if (escolhaCerta) {
      falarElogio();
      registrarAcerto('', null);
      setTimeout(() => {
        if (indiceAtividade < ATIVIDADES_NIVEL4.length - 1) {
          const prox = indiceAtividade + 1;
          setIndiceAtividade(prox);
          setImagensInvertidas(Math.random() < 0.5);
          setCorFundo('#F7FAFC');
          setExpressaoLumi('padrao');
          setTimeout(() => {
            const p = ATIVIDADES_NIVEL4[prox];
            falar(p.palavraCerta, p.palavraCerta.toLowerCase());
          }, 500);
        } else {
          avancarNivel();
        }
      }, 1500);
    } else {
      registrarErro('Escute de novo com atenção!', 'escutadnv');
    }
  };

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  return (
    <View style={[styles.container, { backgroundColor: corFundo }]}>
      <View style={styles.header}>
        <Text style={styles.txtNivel}>Nível {nivel} / {TOTAL_NIVEIS}</Text>
        {nivel === 1 && (
          <Text style={styles.txtProgresso}>⭐ {acertosSeguidos} / {metaNivel1}</Text>
        )}
      </View>

      <Text style={styles.feedbackText}>{mensagem}</Text>

      <View style={styles.containerLumi}>
        <Image
          source={imagensLumi[expressaoLumi]}
          style={{ width: 180, height: 180 }}
          resizeMode="contain"
        />
      </View>

      {/* NÍVEL 1 — Letras espelhadas (posições randomizadas) */}
      {nivel === 1 && (
        <View style={styles.areaJogo}>
          <View style={styles.areaBotoes}>
            {opcoesNivel1Embaralhadas.map((l) => (
              <TouchableOpacity key={l} style={styles.botaoGrande} onPress={() => verificarNivel1(l)}>
                <Text style={styles.textoBotao}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* NÍVEL 2 — Complete a palavra (posições das opções randomizadas) */}
      {nivel === 2 && (
        <View style={styles.areaJogo}>
          <View style={styles.cardImagem}>
            <Text style={styles.emoji}>{ATIVIDADES_NIVEL2[indiceSeguroNivel2].imagem}</Text>
            <Text style={styles.palavraIncompleta}>{ATIVIDADES_NIVEL2[indiceSeguroNivel2].palavra}</Text>
            <Text style={styles.posicaoTexto}>
              (letra faltando: {ATIVIDADES_NIVEL2[indiceSeguroNivel2].posicao})
            </Text>
          </View>
          <View style={styles.areaBotoesPequenos}>
            {opcoesNivel2Embaralhadas.map((l) => (
              <TouchableOpacity key={l} style={styles.botaoPequeno} onPress={() => verificarNivel2(l)}>
                <Text style={styles.textoBotaoPequeno}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* NÍVEL 3 — Monte a Palavra (drag-and-drop) */}
      {nivel === 3 && (
        <View style={styles.areaJogo}>
          <Text style={styles.emoji}>{PALAVRAS_NIVEL3[indiceSeguroNivel3].imagem}</Text>

          <TouchableOpacity
            style={styles.botaoOuvirDeNovo}
            onPress={() => {
              const atual = PALAVRAS_NIVEL3[indiceSeguroNivel3];
              falar(atual.palavra, atual.palavra.toLowerCase());
            }}
          >
            <Text style={styles.txtOuvirDeNovo}>🔊 Ouvir a palavra</Text>
          </TouchableOpacity>

          <View style={styles.areaSlots}>
            {slotsPreenchidos.map((letra, idx) => (
              <View
                key={idx}
                ref={(ref) => (slotRefsArray.current[idx] = ref)}
                style={[styles.slotLetra, letra && styles.slotLetraPreenchido]}
              >
                <Text style={styles.slotTexto}>{letra || ''}</Text>
              </View>
            ))}
          </View>

          <View style={styles.bandejaLetras}>
            {letrasBandeja.map((item) => (
              <LetraArrastavel key={item.id} letra={item.letra} onSoltar={soltarLetraNivel3} />
            ))}
          </View>
        </View>
      )}

      {/* NÍVEL 4 — Discriminação de sons parecidos */}
      {nivel === 4 && (
        <View style={styles.areaJogo}>
          <TouchableOpacity
            style={styles.botaoOuvirDeNovo}
            onPress={() => {
              const p = ATIVIDADES_NIVEL4[indiceSeguroNivel4];
              falar(p.palavraCerta, p.palavraCerta.toLowerCase());
            }}
          >
            <Text style={styles.txtOuvirDeNovo}>🔊 Ouvir a palavra</Text>
          </TouchableOpacity>
          <View style={styles.areaOpcoesImagem}>
            {(imagensInvertidas
              ? [
                  { emoji: ATIVIDADES_NIVEL4[indiceSeguroNivel4].imagemErrada, certa: false },
                  { emoji: ATIVIDADES_NIVEL4[indiceSeguroNivel4].imagemCerta, certa: true },
                ]
              : [
                  { emoji: ATIVIDADES_NIVEL4[indiceSeguroNivel4].imagemCerta, certa: true },
                  { emoji: ATIVIDADES_NIVEL4[indiceSeguroNivel4].imagemErrada, certa: false },
                ]
            ).map((opcao, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.cardImagemOpcao}
                onPress={() => verificarNivel4(opcao.certa)}
              >
                <Text style={styles.emojiGrande}>{opcao.emoji}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20, paddingHorizontal: 10 },
  txtNivel: { fontSize: 18, fontWeight: 'bold', color: '#1A365D', backgroundColor: '#E2E8F0', padding: 8, borderRadius: 10 },
  txtProgresso: { fontSize: 18, fontWeight: 'bold', color: '#D69E2E' },
  feedbackText: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#2D3748', height: 70 },
  containerLumi: { marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  areaJogo: { width: '100%', alignItems: 'center' },
  areaBotoes: { flexDirection: 'row', gap: 30 },
  botaoGrande: {
    backgroundColor: '#1A365D',
    paddingVertical: 30,
    paddingHorizontal: 18,
    borderRadius: 30,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
  },
  textoBotao: {
    fontSize: 62,
    color: '#FFF',
    fontWeight: 'bold',
    includeFontPadding: false, 
  },
  cardImagem: { backgroundColor: '#FFF', padding: 20, borderRadius: 30, alignItems: 'center', elevation: 8, width: '90%', marginBottom: 20 },
  emoji: { fontSize: 70, marginBottom: 5 },
  palavraIncompleta: { fontSize: 32, fontWeight: 'bold', letterSpacing: 5, textAlign: 'center' },
  posicaoTexto: { fontSize: 12, color: '#A0AEC0', marginTop: 8, fontStyle: 'italic' },
  areaBotoesPequenos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15 },
  botaoPequeno: { backgroundColor: '#1A365D', width: 70, height: 70, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  textoBotaoPequeno: { fontSize: 28, color: '#FFF', fontWeight: 'bold' },
  botaoOuvirDeNovo: { marginTop: 12, marginBottom: 20, padding: 10 },
  txtOuvirDeNovo: { color: '#3182CE', fontSize: 15, fontWeight: 'bold', textDecorationLine: 'underline' },
  areaOpcoesImagem: { flexDirection: 'row', gap: 25 },
  cardImagemOpcao: { backgroundColor: '#FFF', width: 130, height: 130, borderRadius: 25, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  emojiGrande: { fontSize: 60 },

  areaSlots: { flexDirection: 'row', gap: 10, marginTop: 25, marginBottom: 35 },
  slotLetra: {
    width: 55,
    height: 65,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#CBD5E0',
    borderStyle: 'dashed',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLetraPreenchido: { borderStyle: 'solid', borderColor: '#1A365D', backgroundColor: '#E2E8F0' },
  slotTexto: { fontSize: 32, fontWeight: 'bold', color: '#1A365D' },
  bandejaLetras: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    width: '100%',
  },
  letraArrastavel: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  textoLetraArrastavel: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
});