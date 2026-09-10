import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Speech from 'expo-speech';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

const ARQUIVO_IMAGEM_360 = require('../../assets/images/floresta_360.png');
const ARQUIVO_PORTAL = require('../../assets/images/portal.png');

const TRILHA_DISLEXIA = [
  {
    tipo: 'escolha',
    pergunta: 'Qual é a palavra correta?',
    opcoes: [
      { texto: 'BOLA', correta: true },
      { texto: 'DOLA', correta: false },
    ],
  },
  {
    tipo: 'escolha',
    pergunta: 'Encontre a letra B',
    opcoes: [
      { texto: 'B', correta: true },
      { texto: 'D', correta: false },
    ],
  },
  {
    tipo: 'escolha',
    pergunta: 'Onde está a palavra certa?',
    opcoes: [
      { texto: 'PATO', correta: true },
      { texto: 'BATO', correta: false },
    ],
  },
  {
    tipo: 'sequencia',
    pergunta: 'Clique nas sílabas em ordem para formar BOLA',
    pecas: ['BO', 'LA'],
  },
  {
    tipo: 'sequencia',
    pergunta: 'Clique nas sílabas em ordem para formar PATO',
    pecas: ['PA', 'TO'],
  },
];

const TRILHA_DISCALCULIA = [
  {
    tipo: 'escolha',
    pergunta: 'Quanto é 2 + 3?',
    opcoes: [
      { texto: '5', correta: true },
      { texto: '6', correta: false },
    ],
  },
  {
    tipo: 'escolha',
    pergunta: 'Qual grupo tem MAIS patinhos?',
    opcoes: [
      { quantidade: 5, correta: true },
      { quantidade: 3, correta: false },
    ],
  },
  {
    tipo: 'escolha',
    pergunta: 'Quanto é 5 - 2?',
    opcoes: [
      { texto: '3', correta: true },
      { texto: '4', correta: false },
    ],
  },
  {
    tipo: 'sequencia',
    pergunta: 'Clique nos números em ordem, do menor para o maior',
    pecas: ['1', '2', '3'],
  },
  {
    tipo: 'escolha',
    pergunta: 'Qual número é maior?',
    opcoes: [
      { texto: '8', correta: true },
      { texto: '3', correta: false },
    ],
  },
];

function sortearAngulosN(n) {
  const centro = 0;
  const larguraArco = n > 1 ? 50 : 0;
  const inicio = centro - larguraArco / 2;
  const passo = n > 1 ? larguraArco / (n - 1) : 0;
  const angulos = [];
  for (let i = 0; i < n; i++) {
    const angulo = (inicio + i * passo + 360) % 360;
    angulos.push(Math.round(angulo));
  }
  return angulos;
}

function montarHtmlCena(imagemUri, portalUri) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
  <style>
    html, body { margin: 0; padding: 0; background: #000; overflow: hidden; width: 100%; height: 100%; }
    a-scene { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <a-scene
    embedded
    device-orientation-permission-ui="enabled: true"
    loading-screen="enabled: false"
    vr-mode-ui="enabled: true"
  >
    <a-assets>
      <img id="ceu" src="${imagemUri}" crossorigin="anonymous">
      <img id="portal-img" src="${portalUri}" crossorigin="anonymous">
    </a-assets>

    <a-sky src="#ceu" rotation="0 -90 0"></a-sky>

    <!-- Luz fixa: sem isso, qualquer luz customizada desliga a iluminacao automatica da cena e tudo fica preto -->
    <a-entity light="type: ambient; color: #FFF; intensity: 0.9"></a-entity>
    <a-entity light="type: directional; color: #FFF; intensity: 0.5" position="0.5 1 0.5"></a-entity>

    <a-camera id="camera" look-controls="reverseMouseDrag: false; magicWindowTrackingEnabled: false" wasd-controls-enabled="false">
      <a-cursor id="cursor" fuse="false" raycaster="objects: .alvo; far: 20" color="#FFFFFF" opacity="0.9"></a-cursor>
    </a-camera>

    <a-entity id="alvos"></a-entity>
    <a-entity id="vagalumes"></a-entity>
  </a-scene>

  <script>
    var proximoEsperadoSequencia = 1;

    function anguloParaPosicao(anguloGraus, raio, altura) {
      var rad = anguloGraus * Math.PI / 180;
      var x = raio * Math.sin(rad);
      var z = -raio * Math.cos(rad);
      return x.toFixed(2) + ' ' + altura + ' ' + z.toFixed(2);
    }

    function limparAlvos() {
      var container = document.querySelector('#alvos');
      if (!container) return;
      while (container.firstChild) container.removeChild(container.firstChild);
    }

    function enviarParaApp(dados) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(dados));
      }
    }

    function criarCartaoBase(angulo, largura, altura) {
      var wrapper = document.createElement('a-entity');
      wrapper.setAttribute('position', anguloParaPosicao(angulo, 4.2, 1.6));
      wrapper.setAttribute('look-at', '#camera');
      wrapper.classList.add('alvo');

      // O card em si NAO se move (fica facil de mirar/clicar).
      // So o brilho decorativo atras dele pulsa, e so em OPACIDADE
      // (nao em tamanho, pra nao parecer que esta vindo na sua direcao).
      var brilho = document.createElement('a-ring');
      brilho.setAttribute('radius-inner', (largura * 0.55).toFixed(2));
      brilho.setAttribute('radius-outer', (largura * 0.85).toFixed(2));
      brilho.setAttribute('color', '#FCD34D');
      brilho.setAttribute('opacity', '0.35');
      brilho.setAttribute('position', '0 0 -0.05');
      brilho.setAttribute(
        'animation__pulso',
        'property: opacity; dir: alternate; dur: 3000; easing: easeInOutSine; loop: true; to: 0.6'
      );

      var fundo = document.createElement('a-plane');
      fundo.setAttribute('width', largura);
      fundo.setAttribute('height', altura);
      fundo.setAttribute('color', '#FFF8E7');
      fundo.setAttribute('opacity', '0.96');
      fundo.classList.add('alvo');

      var borda = document.createElement('a-plane');
      borda.setAttribute('width', largura + 0.08);
      borda.setAttribute('height', altura + 0.08);
      borda.setAttribute('color', '#F59E0B');
      borda.setAttribute('position', '0 0 -0.01');

      wrapper.appendChild(brilho);
      wrapper.appendChild(borda);
      wrapper.appendChild(fundo);

      fundo.addEventListener('mouseenter', function () {
        wrapper.setAttribute('scale', '1.12 1.12 1.12');
        brilho.setAttribute('opacity', '0.6');
      });
      fundo.addEventListener('mouseleave', function () {
        wrapper.setAttribute('scale', '1 1 1');
        brilho.setAttribute('opacity', '0.35');
      });

      return { wrapper: wrapper, fundo: fundo };
    }

    function anguloParaPosicaoRelativa(deltaY) {
      return '0 ' + deltaY + ' 0';
    }

    function adicionarTexto(wrapper, texto, corTexto) {
      var txt = document.createElement('a-text');
      txt.setAttribute('value', texto);
      txt.setAttribute('align', 'center');
      txt.setAttribute('color', corTexto || '#4C1D95');
      txt.setAttribute('width', '3.4');
      txt.setAttribute('position', '0 0 0.02');
      wrapper.appendChild(txt);
      return txt;
    }

    // Miniatura de patinho (combina com o companheiro pato da Lumi)
    function criarMiniPato(x) {
      var grupo = document.createElement('a-entity');
      grupo.setAttribute('position', x + ' -0.05 0.03');
      grupo.setAttribute('scale', '0.55 0.55 0.55');

      var corpo = document.createElement('a-sphere');
      corpo.setAttribute('radius', '0.09');
      corpo.setAttribute('color', '#FCD34D');
      corpo.setAttribute('scale', '1.15 0.9 1');
      corpo.setAttribute('position', '0 0 0');

      var cabeca = document.createElement('a-sphere');
      cabeca.setAttribute('radius', '0.06');
      cabeca.setAttribute('color', '#FCD34D');
      cabeca.setAttribute('position', '0.07 0.09 0');

      var bico = document.createElement('a-cone');
      bico.setAttribute('radius-bottom', '0.025');
      bico.setAttribute('radius-top', '0');
      bico.setAttribute('height', '0.05');
      bico.setAttribute('color', '#F97316');
      bico.setAttribute('rotation', '0 0 -90');
      bico.setAttribute('position', '0.13 0.09 0');

      grupo.appendChild(corpo);
      grupo.appendChild(cabeca);
      grupo.appendChild(bico);
      return grupo;
    }

    function adicionarContagemVisual(wrapper, quantidade) {
      var espaco = 0.36;
      var inicioX = -((quantidade - 1) * espaco) / 2;
      for (var i = 0; i < quantidade; i++) {
        var x = (inicioX + i * espaco).toFixed(2);
        wrapper.appendChild(criarMiniPato(x));
      }
    }

    function criarAlvoEscolha(opcao) {
      var largura = opcao.quantidade ? 2.2 : 1.9;
      var cartao = criarCartaoBase(opcao.angulo, largura, 1.1);

      if (opcao.quantidade) {
        adicionarContagemVisual(cartao.wrapper, opcao.quantidade);
      } else {
        adicionarTexto(cartao.wrapper, opcao.texto);
      }

      var acao = opcao.acao || 'responder';
      cartao.fundo.addEventListener('click', function () {
        enviarParaApp({ tipo: 'clique', acao: acao, correta: !!opcao.correta });
      });
      return cartao.wrapper;
    }

    function criarPecaSequencia(peca, totalPecas) {
      var cartao = criarCartaoBase(peca.angulo, 1.6, 1);
      var txt = adicionarTexto(cartao.wrapper, peca.texto);

      cartao.fundo.addEventListener('click', function () {
        if (peca.ordem === proximoEsperadoSequencia) {
          cartao.fundo.setAttribute('color', '#A7F3D0');
          txt.setAttribute('color', '#065F46');
          cartao.fundo.classList.remove('alvo');
          proximoEsperadoSequencia += 1;

          if (proximoEsperadoSequencia > totalPecas) {
            enviarParaApp({ tipo: 'clique', acao: 'responder', correta: true });
          }
        } else {
          cartao.fundo.setAttribute('color', '#FCA5A5');
          setTimeout(function () {
            cartao.fundo.setAttribute('color', '#FFF8E7');
          }, 400);
        }
      });
      return cartao.wrapper;
    }

    // --- Portal com a imagem PNG personalizada ---
    function criarPortal(angulo) {
      var wrapper = document.createElement('a-entity');
      wrapper.setAttribute('position', anguloParaPosicao(angulo, 4.5, 1.6));
      wrapper.setAttribute('look-at', '#camera');
      wrapper.classList.add('alvo');

      var imagemPortal = document.createElement('a-image');
      imagemPortal.setAttribute('src', '#portal-img');
      imagemPortal.setAttribute('width', '2.2');
      imagemPortal.setAttribute('height', '2.2');
      imagemPortal.setAttribute('transparent', 'true');
      imagemPortal.classList.add('alvo');

      var label = document.createElement('a-text');
      label.setAttribute('value', 'CONTINUAR');
      label.setAttribute('align', 'center');
      label.setAttribute('color', '#FCD34D');
      label.setAttribute('width', '3');
      label.setAttribute('position', '0 -1.3 0.02');

      var luz = document.createElement('a-light');
      luz.setAttribute('type', 'point');
      luz.setAttribute('color', '#FCD34D');
      luz.setAttribute('intensity', '1');
      luz.setAttribute('distance', '3');

      wrapper.appendChild(imagemPortal);
      wrapper.appendChild(label);
      wrapper.appendChild(luz);

      var acionarPortal = function () {
        enviarParaApp({ tipo: 'clique', acao: 'avancar' });
      };

      imagemPortal.addEventListener('click', acionarPortal);

      wrapper.addEventListener('mouseenter', function () {
        wrapper.setAttribute('scale', '1.15 1.15 1.15');
      });
      wrapper.addEventListener('mouseleave', function () {
        wrapper.setAttribute('scale', '1 1 1');
      });

      return wrapper;
    }

    function atualizarCena(dados) {
      limparAlvos();
      var container = document.querySelector('#alvos');
      if (!container) return;

      if (dados.modo === 'escolha') {
        (dados.opcoes || []).forEach(function (opcao) {
          container.appendChild(criarAlvoEscolha(opcao));
        });
      } else if (dados.modo === 'sequencia') {
        proximoEsperadoSequencia = 1;
        var total = (dados.pecas || []).length;
        (dados.pecas || []).forEach(function (peca) {
          container.appendChild(criarPecaSequencia(peca, total));
        });
      } else if (dados.modo === 'portal') {
        container.appendChild(criarPortal(dados.angulo));
      }
    }

    function receberMensagem(event) {
      try {
        var dados = JSON.parse(event.data);
        atualizarCena(dados);

        if (dados.tipo === 'centralizar') {
          var cameraEl = document.querySelector('#camera');
          if (cameraEl && cameraEl.object3D) {
            cameraEl.object3D.rotation.set(0, 0, 0);
            var lc = cameraEl.components['look-controls'];
            if (lc && lc.pitchObject) lc.pitchObject.rotation.x = 0;
            if (lc && lc.yawObject) lc.yawObject.rotation.y = 0;
          }
        }
      } catch (e) {
        console.log('Erro ao receber mensagem:', e);
      }
    }
    document.addEventListener('message', receberMensagem);
    window.addEventListener('message', receberMensagem);

    // Vaga-lumes decorativos: nao clicaveis, so atmosfera.
    // Criados uma unica vez e ficam fora do #alvos, entao nunca
    // somem quando as perguntas mudam.
    function criarVagalumes() {
      var container = document.querySelector('#vagalumes');
      if (!container) return;
      var quantidade = 14;
      for (var i = 0; i < quantidade; i++) {
        var angulo = Math.random() * 360;
        var raio = 2 + Math.random() * 3;
        var altura = 0.3 + Math.random() * 2.2;
        var partes = anguloParaPosicao(angulo, raio, altura).split(' ');
        var x = partes[0], y = parseFloat(partes[1]), z = partes[2];

        var vagalume = document.createElement('a-sphere');
        vagalume.setAttribute('radius', '0.025');
        vagalume.setAttribute('color', '#FDE68A');
        vagalume.setAttribute('position', x + ' ' + y + ' ' + z);
        vagalume.setAttribute('opacity', '0.85');

        var durPiscar = 2000 + Math.random() * 2000;
        vagalume.setAttribute(
          'animation__piscar',
          'property: opacity; dir: alternate; dur: ' + durPiscar + '; easing: easeInOutSine; loop: true; to: 0.15'
        );

        var deriva = 0.15 + Math.random() * 0.15;
        var durDerivar = 3000 + Math.random() * 2000;
        vagalume.setAttribute(
          'animation__derivar',
          'property: position; dir: alternate; dur: ' + durDerivar + '; easing: easeInOutSine; loop: true; to: ' +
            x + ' ' + (y + deriva).toFixed(2) + ' ' + z
        );

        container.appendChild(vagalume);
      }
    }

    var cena = document.querySelector('a-scene');
    if (cena) {
      cena.addEventListener('loaded', function () {
        criarVagalumes();
        enviarParaApp({ tipo: 'pronto' });
      });
    }
  </script>
</body>
</html>
`;
}

export default function ModoVRScreen({ navigation }) {
  const [etapa, setEtapa] = useState('preparo');
  const [modoSelecionado, setModoSelecionado] = useState(null);
  const [trilhaAtual, setTrilhaAtual] = useState(TRILHA_DISLEXIA);

  const [contador, setContador] = useState(3);
  const [indice, setIndice] = useState(0);
  const [pontos, setPontos] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [cenaPronta, setCenaPronta] = useState(false);
  const [imagemUri, setImagemUri] = useState('');
  const [portalUri, setPortalUri] = useState('');

  const webviewRef = useRef(null);
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let ativo = true;
    const carregarImagens = async () => {
      try {
        const asset360 = Asset.fromModule(ARQUIVO_IMAGEM_360);
        await asset360.downloadAsync();
        const uri360 = asset360.localUri || asset360.uri;
        const base64360 = await FileSystem.readAsStringAsync(uri360, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const assetPortal = Asset.fromModule(ARQUIVO_PORTAL);
        await assetPortal.downloadAsync();
        const uriPortal = assetPortal.localUri || assetPortal.uri;
        const base64Portal = await FileSystem.readAsStringAsync(uriPortal, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (!ativo) return;
        if (base64360) setImagemUri(`data:image/png;base64,${base64360}`);
        if (base64Portal) setPortalUri(`data:image/png;base64,${base64Portal}`);
      } catch (error) {
        console.log('[VR] ERRO AO CARREGAR ASSETS:', error);
      }
    };
    carregarImagens();
    return () => {
      ativo = false;
    };
  }, []);

  const iniciarExperiencia = async () => {
    try {
      Speech.stop();
      StatusBar.setHidden(true, 'fade');
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
      setContador(3);
      setEtapa('contagem');
    } catch (error) {
      setEtapa('contagem');
    }
  };

  useEffect(() => {
    if (etapa === 'contagem' && contador > 0) {
      Speech.stop();
      Speech.speak(String(contador), { language: 'pt-BR' });
      const timer = setTimeout(() => setContador(contador - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (etapa === 'contagem' && contador === 0) {
      setEtapa('menu_vr');
      Speech.stop();
      Speech.speak('Bem-vindo à Floresta Mágica! Escolha um caminho!', {
        language: 'pt-BR',
        pitch: 1.1,
        rate: 0.9,
      });
    }
  }, [contador, etapa]);

  useEffect(() => {
    return () => {
      Speech.stop();
      StatusBar.setHidden(false, 'fade');
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const escolherModo = (modo) => {
    const trilha = modo === 'dislexia' ? TRILHA_DISLEXIA : TRILHA_DISCALCULIA;
    setModoSelecionado(modo);
    setTrilhaAtual(trilha);
    setIndice(0);
    setPontos(0);

    Speech.speak(
      modo === 'dislexia' ? 'Modo Dislexia! Vamos jogar com as palavras!' : 'Modo Discalculia! Vamos jogar com os números!',
      { language: 'pt-BR' }
    );
    Speech.speak(trilha[0].pergunta, { language: 'pt-BR' });

    setEtapa('jogo');
  };

  const responderCerto = () => {
    setFeedback('correto');
    setPontos((p) => p + 10);
    Speech.speak('Muito bem! Procure o portal para continuar!', { language: 'pt-BR' });

    setTimeout(() => {
      setFeedback(null);
      setEtapa('portal');
    }, 1200);
  };

  const responderErrado = () => {
    setFeedback('errado');
    Speech.speak('Tente novamente!', { language: 'pt-BR' });
    setTimeout(() => setFeedback(null), 1000);
  };

  const dispararFlashTeleporte = (aoTerminar) => {
    flashOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => aoTerminar && aoTerminar());
  };

  const avancarProximaEstacao = () => {
    dispararFlashTeleporte(() => {
      if (indice + 1 < trilhaAtual.length) {
        const prox = indice + 1;
        setIndice(prox);
        setEtapa('jogo');
        Speech.speak(trilhaAtual[prox].pergunta, { language: 'pt-BR' });
      } else {
        setEtapa('final');
        Speech.speak('Parabéns! Você completou a trilha!', { language: 'pt-BR' });
      }
    });
  };

  const centralizarVisao = () => {
    webviewRef.current?.postMessage(JSON.stringify({ tipo: 'centralizar' }));
  };

  const aoReceberMensagemWebView = (event) => {
    try {
      const dados = JSON.parse(event.nativeEvent.data);

      if (dados.tipo === 'pronto') {
        setCenaPronta(true);
        return;
      }

      if (dados.tipo === 'clique') {
        if (dados.acao === 'dislexia' || dados.acao === 'discalculia') {
          escolherModo(dados.acao);
        } else if (dados.acao === 'voltar-lobby') {
          setEtapa('menu_vr');
        } else if (dados.acao === 'responder') {
          dados.correta ? responderCerto() : responderErrado();
        } else if (dados.acao === 'avancar') {
          avancarProximaEstacao();
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (!cenaPronta || !webviewRef.current) return;

    let payload = null;

    if (etapa === 'menu_vr') {
      const [a1, a2] = sortearAngulosN(2);
      payload = {
        modo: 'escolha',
        opcoes: [
          { texto: 'DISLEXIA', angulo: a1, acao: 'dislexia' },
          { texto: 'DISCALCULIA', angulo: a2, acao: 'discalculia' },
        ],
      };
    } else if (etapa === 'jogo') {
      const q = trilhaAtual[indice];

      if (q.tipo === 'escolha') {
        const angulos = sortearAngulosN(q.opcoes.length);
        payload = {
          modo: 'escolha',
          opcoes: q.opcoes.map((op, i) => ({ ...op, angulo: angulos[i] })),
        };
      } else if (q.tipo === 'sequencia') {
        const angulos = sortearAngulosN(q.pecas.length);
        const indicesEmbaralhados = q.pecas.map((_, i) => i).sort(() => Math.random() - 0.5);
        payload = {
          modo: 'sequencia',
          pecas: indicesEmbaralhados.map((idxOriginal, posVisual) => ({
            texto: q.pecas[idxOriginal],
            ordem: idxOriginal + 1,
            angulo: angulos[posVisual],
          })),
        };
      }
    } else if (etapa === 'portal') {
      const [a1] = sortearAngulosN(1);
      payload = { modo: 'portal', angulo: a1 };
    } else if (etapa === 'final') {
      payload = {
        modo: 'escolha',
        opcoes: [{ texto: 'Voltar ao Lobby', angulo: 0, acao: 'voltar-lobby', correta: true }],
      };
    }

    if (payload) {
      webviewRef.current.postMessage(JSON.stringify(payload));
    }
  }, [cenaPronta, etapa, indice, trilhaAtual]);

  if (etapa === 'preparo') {
    return (
      <View style={styles.containerPreparo}>
        <Image source={require('../../assets/images/heroLumi.png')} style={styles.imgLumiPreparo} resizeMode="contain" />
        <Text style={styles.titulo}>Mundo Virtual da Lumi </Text>
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

  if (etapa === 'contagem') {
    return (
      <View style={styles.containerContagem}>
        <Text style={styles.txtContagem}>{contador === 0 ? 'VAMOS!' : contador}</Text>
        <Text style={styles.txtAviso}>Coloque os óculos agora!</Text>
      </View>
    );
  }

  let lumiImagem = require('../../assets/images/heroLumi.png');
  if (feedback === 'correto') lumiImagem = require('../../assets/images/cheeringLumi.png');
  if (feedback === 'errado') lumiImagem = require('../../assets/images/confusedLumi.png');

  const q = etapa === 'jogo' ? trilhaAtual[indice] : null;
  const perguntaAtual =
    etapa === 'jogo'
      ? q?.pergunta
      : etapa === 'menu_vr'
      ? 'Escolha um caminho na sua frente!'
      : etapa === 'portal'
      ? 'Muito bem! Encontre o portal para continuar!'
      : `🎉 Você fez ${pontos} pontos! 🎉`;

  return (
    <View style={styles.containerVR}>
      {!!imagemUri && !!portalUri && (
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: montarHtmlCena(imagemUri, portalUri) }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onMessage={aoReceberMensagemWebView}
        />
      )}

      {(!imagemUri || !portalUri) && (
        <View style={styles.carregando}>
          <Text style={styles.txtCarregando}>Carregando a Floresta Mágica...</Text>
        </View>
      )}

      <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flashOpacity }]} />
      <View
        pointerEvents="none"
        style={[styles.hud, feedback === 'correto' && styles.hudCorreto, feedback === 'errado' && styles.hudErrado]}
      >
        <View style={styles.hudTopo}>
          <View style={styles.boxPergunta}>
            <Text style={styles.txtPerguntaVR}>{perguntaAtual}</Text>
          </View>
          {(etapa === 'jogo' || etapa === 'portal') && (
            <Text style={styles.txtPontosVR}>⭐ {pontos} pts</Text>
          )}
          {(etapa === 'jogo' || etapa === 'portal') && (
            <View style={styles.trilhaProgresso}>
              {trilhaAtual.map((_, i) => (
                <View
                  key={i}
                  style={[styles.pontoProgresso, i < indice && styles.pontoProgressoFeito, i === indice && styles.pontoProgressoAtual]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.espacador} />

        <View style={styles.areaLumi}>
          <Image source={lumiImagem} style={styles.imgLumiVR} resizeMode="contain" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  containerPreparo: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3E8FF', padding: 20 },
  imgLumiPreparo: { width: 180, height: 180, marginBottom: 10 },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#5B21B6', textAlign: 'center' },
  subtitulo: { fontSize: 15, color: '#6D28D9', textAlign: 'center', marginVertical: 15, paddingHorizontal: 20 },
  btnComecar: { backgroundColor: '#7C3AED', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 25, elevation: 4 },
  txtComecar: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  txtVoltar: { color: '#6D28D9', marginTop: 15, textDecorationLine: 'underline' },

  containerContagem: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  txtContagem: { fontSize: 90, fontWeight: '900', color: '#A78BFA' },
  txtAviso: { color: '#DDD6FE', fontSize: 16, marginTop: 10 },

  containerVR: { flex: 1, backgroundColor: '#000000' },
  webview: { flex: 1, backgroundColor: '#000000' },
  carregando: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  txtCarregando: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 30 },

  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFFFF' },

  btnCentralizar: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(76, 29, 149, 0.85)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#A78BFA',
    zIndex: 10,
  },
  txtCentralizar: { fontSize: 20 },

  hud: { ...StyleSheet.absoluteFillObject, alignItems: 'center', paddingTop: 16, paddingBottom: 16 },
  hudCorreto: { backgroundColor: 'rgba(6, 95, 70, 0.25)' },
  hudErrado: { backgroundColor: 'rgba(153, 27, 27, 0.25)' },
  hudTopo: { width: '100%', alignItems: 'center' },
  espacador: { flex: 1 },
  txtPontosVR: {
    marginTop: 8,
    color: '#78350F',
    fontSize: 15,
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 248, 231, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  boxPergunta: {
    backgroundColor: 'rgba(30, 27, 75, 0.92)',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#A78BFA',
    maxWidth: '80%',
  },
  trilhaProgresso: { flexDirection: 'row', marginTop: 8, gap: 6 },
  pontoProgresso: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  pontoProgressoFeito: { backgroundColor: '#FCD34D' },
  pontoProgressoAtual: {
    backgroundColor: '#FFFFFF',
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  txtPerguntaVR: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  areaLumi: { alignItems: 'center' },
  imgLumiVR: { width: 80, height: 80 },
});