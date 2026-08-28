import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar, 
  Image, 
  ImageBackground 
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Speech from 'expo-speech';

// Bancos de Questoes
const QUESTOES_DISLEXIA = [
  { id: 1, pergunta: "Qual é a palavra correta?", correta: "BOLA", errada: "DOLA" },
  { id: 2, pergunta: "Onde está a palavra certa?", correta: "PATO", errada: "BATO" },
  { id: 3, pergunta: "Selecione o correto:", correta: "DADO", errada: "BADO" },
];

const QUESTOES_DISCALCULIA = [
  { id: 1, pergunta: "Quanto é 2 + 3?", correta: "5", errada: "6" },
  { id: 2, pergunta: "Qual número é maior?", correta: "8", errada: "3" },
  { id: 3, pergunta: "Quanto é 5 - 2?", correta: "3", errada: "4" },
];

export default function ModoVRScreen({ navigation }) {
  // 'preparo' | 'contagem' | 'menu_vr' | 'jogo' | 'final'
  const [etapa, setEtapa] = useState('preparo'); 
  const [modoSelecionado, setModoSelecionado] = useState(null); 
  const [questoesAtuais, setQuestoesAtuais] = useState(QUESTOES_DISLEXIA);

  const [contador, setContador] = useState(3);
  const [indice, setIndice] = useState(0);
  const [pontos, setPontos] = useState(0);
  const [feedback, setFeedback] = useState(null);

  // 1. Iniciar e Ocultar Barras do Sistema
  const iniciarExperiencia = async () => {
    StatusBar.setHidden(true, 'fade');
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
    setEtapa('contagem');
  };

  // 2. Contagem Regressiva
  useEffect(() => {
    if (etapa === 'contagem' && contador > 0) {
      const timer = setTimeout(() => setContador(contador - 1), 1000);
      return () => clearTimeout(timer);
    } else if (etapa === 'contagem' && contador === 0) {
      setEtapa('menu_vr');
      Speech.speak("Bem-vindo à Floresta Mágica! Escolha um caminho para jogar!", { language: 'pt-BR' });
    }
  }, [contador, etapa]);

  // Restaura orientação ao sair
  useEffect(() => {
    return () => {
      StatusBar.setHidden(false, 'fade');
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  
  const escolherModo = (modo) => {
    setModoSelecionado(modo);
    setIndice(0);
    setPontos(0);

    if (modo === 'dislexia') {
      setQuestoesAtuais(QUESTOES_DISLEXIA);
      Speech.speak("Modo Dislexia! Vamos jogar com as palavras!", { language: 'pt-BR' });
    } else {
      setQuestoesAtuais(QUESTOES_DISCALCULIA);
      Speech.speak("Modo Discalculia! Vamos jogar com os números!", { language: 'pt-BR' });
    }

    setEtapa('jogo');
    falarPergunta(0, modo === 'dislexia' ? QUESTOES_DISLEXIA : QUESTOES_DISCALCULIA);
  };

  const falarPergunta = (idx, lista) => {
    const banco = lista || questoesAtuais;
    Speech.speak(banco[idx].pergunta, { language: 'pt-BR' });
  };

  // Validação de Resposta
  const selecionarOpcao = (opcao) => {
    const qAtual = questoesAtuais[indice];

    if (opcao === qAtual.correta) {
      setFeedback('correto');
      setPontos(p => p + 10);
      Speech.speak("Muito bem!", { language: 'pt-BR' });

      setTimeout(() => {
        setFeedback(null);
        if (indice + 1 < questoesAtuais.length) {
          const prox = indice + 1;
          setIndice(prox);
          falarPergunta(prox);
        } else {
          setEtapa('final');
          Speech.speak("Parabéns! Você completou o desafio!", { language: 'pt-BR' });
        }
      }, 1500);
    } else {
      setFeedback('errado');
      Speech.speak("Tente novamente!", { language: 'pt-BR' });

      setTimeout(() => {
        setFeedback(null);
      }, 1200);
    }
  };

  
  if (etapa === 'preparo') {
    return (
      <View style={styles.containerPreparo}>
        <Image 
          source={require('../../assets/images/heroLumi.png')} 
          style={styles.imgLumiPreparo} 
          resizeMode="contain" 
        />
        <Text style={styles.titulo}>Mundo Virtual da Lumi 🚀</Text>
        <Text style={styles.subtitulo}>
          Encaixe seu celular nos óculos VR e prepare o controle bluetooth para iniciar!
        </Text>
        <TouchableOpacity style={styles.btnComecar} onPress={iniciarExperiencia}>
          <Text style={styles.txtComecar}>ENTRAR NO MUNDO VR!</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.txtVoltar}>Voltar ao Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- 2. CONTAGEM REGRESSIVA ---
  if (etapa === 'contagem') {
    return (
      <View style={styles.containerContagem}>
        <Text style={styles.txtContagem}>{contador === 0 ? "VAMOS!" : contador}</Text>
        <Text style={styles.txtAviso}>Coloque os óculos agora!</Text>
      </View>
    );
  }

  // --- 3. LOBBY / MENU PRINCIPAL VR (A TELA QUE VOCÊ PEDIU) ---
  if (etapa === 'menu_vr') {
    const LobbyOlhoVR = () => (
      <ImageBackground 
        source={require('../../assets/images/floresta_bg.jpeg')} 
        style={styles.eyeCenario}
        resizeMode="cover"
      >
        <View style={styles.overlayLobby}>
          
          {/* Lumi de Boas-Vindas Comprimentando no Topo/Centro */}
          <View style={styles.areaLumiBoasVindas}>
            <View style={styles.balaoFala}>
              <Text style={styles.txtBalao}>Olá! Vamos jogar?</Text>
            </View>
            <Image 
              source={require('../../assets/images/heroLumi.png')} 
              style={styles.imgLumiLobby} 
              resizeMode="contain" 
            />
          </View>

          {/* Os dois painéis/estações para escolher */}
          <View style={styles.containerEstacoes}>
            
            {/* Painel Dislexia */}
            <TouchableOpacity 
              activeOpacity={0.8}
              style={styles.cardEstacao} 
              onPress={() => escolherModo('dislexia')}
            >
              <Text style={styles.iconeEstacao}>🔤</Text>
              <Text style={styles.tituloEstacao}>Dislexia</Text>
              <Text style={styles.subEstacao}>Palavras</Text>
            </TouchableOpacity>

            {/* Painel Discalculia */}
            <TouchableOpacity 
              activeOpacity={0.8}
              style={styles.cardEstacao} 
              onPress={() => escolherModo('discalculia')}
            >
              <Text style={styles.iconeEstacao}>🔢</Text>
              <Text style={styles.tituloEstacao}>Discalculia</Text>
              <Text style={styles.subEstacao}>Números</Text>
            </TouchableOpacity>

          </View>

        </View>
      </ImageBackground>
    );

    return (
      <View style={styles.containerVR}>
        <LobbyOlhoVR />
        <View style={styles.divisoria} />
        <LobbyOlhoVR />
      </View>
    );
  }

  // --- 4. TELA DO JOGO (ATIVIDADES) ---
  const q = questoesAtuais[indice];

  let lumiImagem = require('../../assets/images/heroLumi.png');
  if (feedback === 'correto') lumiImagem = require('../../assets/images/cheeringLumi.png');
  if (feedback === 'errado') lumiImagem = require('../../assets/images/confusedLumi.png');

  const CenarioOlhoVR = () => (
    <ImageBackground 
      source={require('../../assets/images/floresta_bg.jpeg')} 
      style={styles.eyeCenario}
      resizeMode="cover"
    >
      <View style={[
        styles.overlayFeedback,
        feedback === 'correto' && styles.bgCorreto,
        feedback === 'errado' && styles.bgErrado
      ]}>
        
        <View style={styles.headerVR}>
          <Text style={styles.txtPontosVR}>⭐ {pontos} pts</Text>
        </View>

        <View style={styles.boxPergunta}>
          <Text style={styles.txtPerguntaVR}>{q?.pergunta}</Text>
        </View>

        <View style={styles.containerCards}>
          <TouchableOpacity 
            activeOpacity={0.8}
            style={styles.cardOpcao} 
            onPress={() => selecionarOpcao(q.correta)}
          >
            <Text style={styles.txtOpcao}>{q?.correta}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            activeOpacity={0.8}
            style={styles.cardOpcao} 
            onPress={() => selecionarOpcao(q.errada)}
          >
            <Text style={styles.txtOpcao}>{q?.errada}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.areaLumi}>
          <Image source={lumiImagem} style={styles.imgLumiVR} resizeMode="contain" />
        </View>
      </View>
    </ImageBackground>
  );

  // --- 5. TELA FINAL ---
  if (etapa === 'final') {
    const CenarioFinalVR = () => (
      <ImageBackground 
        source={require('../../assets/images/floresta_bg.jpeg')} 
        style={styles.eyeCenario}
        resizeMode="cover"
      >
        <View style={styles.overlayFeedback}>
          <Text style={styles.txtPerguntaVR}>🎉 PARABÉNS! 🎉</Text>
          <Text style={styles.txtPontosVR}>Você fez {pontos} pontos!</Text>
          <Image 
            source={require('../../assets/images/cheeringLumi.png')} 
            style={styles.imgLumiVR} 
            resizeMode="contain" 
          />
          <TouchableOpacity style={styles.cardOpcao} onPress={() => setEtapa('menu_vr')}>
            <Text style={styles.txtOpcao}>VOLTAR AO LOBBY</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );

    return (
      <View style={styles.containerVR}>
        <CenarioFinalVR />
        <View style={styles.divisoria} />
        <CenarioFinalVR />
      </View>
    );
  }

  return (
    <View style={styles.containerVR}>
      <CenarioOlhoVR />
      <View style={styles.divisoria} />
      <CenarioOlhoVR />
    </View>
  );
}

const styles = StyleSheet.create({
  // Tela de Preparo
  containerPreparo: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3E8FF', padding: 20 },
  imgLumiPreparo: { width: 180, height: 180, marginBottom: 10 },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#5B21B6' },
  subtitulo: { fontSize: 15, color: '#6D28D9', textAlign: 'center', marginVertical: 15, paddingHorizontal: 20 },
  btnComecar: { backgroundColor: '#7C3AED', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 25, elevation: 4 },
  txtComecar: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  txtVoltar: { color: '#6D28D9', marginTop: 15, textDecorationLine: 'underline' },

  // Contagem
  containerContagem: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  txtContagem: { fontSize: 90, fontWeight: '900', color: '#A78BFA' },
  txtAviso: { color: '#DDD6FE', fontSize: 16, marginTop: 10 },

  // Estrutura Geral VR
  containerVR: { flex: 1, flexDirection: 'row', backgroundColor: '#000000' },
  eyeCenario: { flex: 1, height: '100%' },
  divisoria: { width: 4, height: '100%', backgroundColor: '#000000' },

  // LOBBY VR (ESTAÇÕES)
  overlayLobby: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.2)'
  },
  areaLumiBoasVindas: { alignItems: 'center' },
  balaoFala: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
    elevation: 3
  },
  txtBalao: { color: '#5B21B6', fontWeight: 'bold', fontSize: 12 },
  imgLumiLobby: { width: 65, height: 65 },

  containerEstacoes: { flexDirection: 'row', gap: 15 },
  cardEstacao: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#A78BFA',
    minWidth: 110,
    elevation: 5
  },
  iconeEstacao: { fontSize: 24, marginBottom: 2 },
  tituloEstacao: { fontSize: 14, fontWeight: 'bold', color: '#4C1D95' },
  subEstacao: { fontSize: 11, color: '#6D28D9' },

  // JOGO E FEEDBACKS
  overlayFeedback: { 
    flex: 1, 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.15)'
  },
  headerVR: { width: '100%', alignItems: 'center' },
  txtPontosVR: { color: '#FDE047', fontSize: 14, fontWeight: 'bold', textShadowColor: '#000', textShadowRadius: 3 },
  boxPergunta: {
    backgroundColor: 'rgba(30, 27, 75, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#A78BFA'
  },
  txtPerguntaVR: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },

  containerCards: { flexDirection: 'row', gap: 10, marginVertical: 4 },
  cardOpcao: { 
    backgroundColor: 'rgba(76, 29, 149, 0.9)', 
    paddingVertical: 10, 
    paddingHorizontal: 18, 
    borderRadius: 14, 
    borderWidth: 2, 
    borderColor: '#C4B5FD',
    elevation: 5
  },
  txtOpcao: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },

  areaLumi: { alignItems: 'center' },
  imgLumiVR: { width: 75, height: 75 },
  
  bgCorreto: { backgroundColor: 'rgba(6, 95, 70, 0.55)' },
  bgErrado: { backgroundColor: 'rgba(153, 27, 27, 0.55)' }
});