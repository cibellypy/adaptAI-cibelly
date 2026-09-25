import React, { useEffect, useRef, useState } from 'react';
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
import { DeviceMotion } from 'expo-sensors';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { falar, pararFala } from '../services/Som';

const ARQUIVO_IMAGEM_360 = require('../../assets/images/floresta_360.jpg');
const ARQUIVO_PORTAL = require('../../assets/images/portal.png');
const ARQUIVO_LUMI = require('../../assets/images/heroLumi.png');
const ARQUIVO_LUMI_CORRETO = require('../../assets/images/cheeringLumi.png');
const ARQUIVO_LUMI_ERRADO = require('../../assets/images/confusedLumi.png');

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

function chavePergunta(modo, indice) {
  const prefixo = modo === 'dislexia' ? 'disl' : 'disc';
  return `${prefixo}_pergunta_${indice + 1}`;
}

function sortearAngulosN(n) {
  const centro = 0;
  const larguraArco = n > 1 ? 50 : 0;
  const inicio = centro - larguraArco / 2;
  const passo = n > 1 ? larguraArco / (n - 1) : 0;
  const angulos = [];

  for (let i = 0; i < n; i += 1) {
    const angulo = (inicio + i * passo + 360) % 360;
    angulos.push(Math.round(angulo));
  }

  return angulos;
}

async function carregarAssetComoDataUri(modulo, mimeType) {
  const asset = Asset.fromModule(modulo);
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;

  if (!uri) {
    throw new Error('Não foi possível obter a URI do asset.');
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return `data:${mimeType};base64,${base64}`;
}

function montarHtmlCena({
  imagemUri,
  portalUri,
  lumiUri,
  lumiCorretoUri,
  lumiErradoUri,
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover"
  >

  <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>

  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
      touch-action: none;
      -webkit-user-select: none;
      user-select: none;
    }

    a-scene {
      width: 100vw;
      height: 100vh;
    }

    canvas {
      display: block;
      width: 100% !important;
      height: 100% !important;
      touch-action: none;
    }
  </style>

  <script>
    // ------------------------------------------------------------
    // AdaptAI - renderização Cardboard lado a lado.
    // Mantém UMA cena e UMA câmera de cabeça, mas renderiza duas
    // projeções sincronizadas usando THREE.StereoCamera.
    // ------------------------------------------------------------
    AFRAME.registerComponent('adaptai-cardboard', {
      schema: {
        enabled: { default: true },
        eyeSep: { default: 0.064 },
      },

      init: function () {
        const componente = this;
        const cena = this.el;

        cena.addEventListener('renderstart', function () {
          const renderer = cena.renderer;
          if (!renderer || renderer.__adaptaiStereoAtivo) return;

          renderer.__adaptaiStereoAtivo = true;

          const renderOriginal = renderer.render.bind(renderer);
          const stereo = new THREE.StereoCamera();
          const tamanho = new THREE.Vector2();

          renderer.render = function (scene3D, camera) {
            if (
              !componente.data.enabled ||
              !camera ||
              !camera.isPerspectiveCamera ||
              (renderer.xr && renderer.xr.isPresenting)
            ) {
              return renderOriginal(scene3D, camera);
            }

            renderer.getSize(tamanho);

            const largura = Math.max(2, tamanho.x);
            const altura = Math.max(1, tamanho.y);
            const metade = Math.floor(largura / 2);
            const aspectoPorOlho = metade / altura;

            if (Math.abs(camera.aspect - aspectoPorOlho) > 0.001) {
              camera.aspect = aspectoPorOlho;
              camera.updateProjectionMatrix();
            }

            stereo.eyeSep = componente.data.eyeSep;
            camera.updateMatrixWorld(true);
            stereo.update(camera);

            renderer.setScissorTest(true);

            renderer.setViewport(0, 0, metade, altura);
            renderer.setScissor(0, 0, metade, altura);
            renderOriginal(scene3D, stereo.cameraL);

            renderer.setViewport(metade, 0, largura - metade, altura);
            renderer.setScissor(metade, 0, largura - metade, altura);
            renderOriginal(scene3D, stereo.cameraR);

            renderer.setScissorTest(false);
            renderer.setViewport(0, 0, largura, altura);
          };
        });
      },
    });
  </script>
</head>

<body>
  <a-scene
    id="scene"
    embedded
    adaptai-cardboard="enabled: true; eyeSep: 0.064"
    device-orientation-permission-ui="enabled: false"
    loading-screen="enabled: false"
    xr-mode-ui="enabled: false"
    renderer="antialias: true; precision: medium; colorManagement: true"
  >
    <a-assets timeout="15000">
      <img id="ceu" src="${imagemUri}">
      <img id="portal-img" src="${portalUri}">
      <img id="lumi-normal" src="${lumiUri}">
      <img id="lumi-certo" src="${lumiCorretoUri}">
      <img id="lumi-errado" src="${lumiErradoUri}">
    </a-assets>

    <a-sky
      id="sky"
      src="#ceu"
      rotation="0 -90 0"
      material="shader: flat"
    ></a-sky>

    <!-- A iluminação fixa evita os objetos escuros/pretos. -->
    <a-entity light="type: ambient; color: #FFF; intensity: 0.92"></a-entity>
    <a-entity
      light="type: directional; color: #FFF; intensity: 0.55"
      position="1 3 2"
    ></a-entity>

    <a-entity id="rig" position="0 0 0">
      <a-camera
        id="camera"
        position="0 1.6 0"
        wasd-controls-enabled="false"
        look-controls="enabled: true; reverseMouseDrag: false; magicWindowTrackingEnabled: false; touchEnabled: true; mouseEnabled: true"
      >
        <a-cursor
          id="cursor"
          fuse="true"
          fuse-timeout="1400"
          raycaster="objects: .alvo; far: 20; interval: 40"
          material="color: #FFFFFF; shader: flat; opacity: 0.92"
          geometry="primitive: ring; radiusInner: 0.012; radiusOuter: 0.020; segmentsTheta: 32"
          position="0 0 -1"
          animation__fusing="property: scale; startEvents: fusing; from: 1 1 1; to: 0.55 0.55 0.55; dur: 1400"
          animation__reset="property: scale; startEvents: mouseleave; to: 1 1 1; dur: 120"
        ></a-cursor>

        <!-- HUD em profundidade: ele é renderizado corretamente para os dois olhos. -->
        <a-entity id="hud-vr">
          <a-plane
            id="hud-painel"
            position="0 0.72 -2.35"
            width="2.65"
            height="0.48"
            material="color: #1E1B4B; shader: flat; opacity: 0.92; transparent: true"
          ></a-plane>

          <a-text
            id="hud-pergunta"
            value="Carregando..."
            position="0 0.72 -2.32"
            align="center"
            anchor="center"
            baseline="center"
            width="2.30"
            color="#FFFFFF"
            wrap-count="35"
          ></a-text>

          <a-plane
            position="0.98 0.42 -2.30"
            width="0.72"
            height="0.25"
            material="color: #FFF8E7; shader: flat; opacity: 0.92; transparent: true"
          ></a-plane>

          <a-text
            id="hud-pontos"
            value="0 pts"
            position="0.98 0.42 -2.27"
            align="center"
            anchor="center"
            baseline="center"
            width="0.65"
            color="#78350F"
          ></a-text>

          <a-entity id="hud-progresso" position="0 0.40 -2.28"></a-entity>

          <a-image
            id="hud-lumi"
            src="#lumi-normal"
            position="-1.02 -0.62 -2.20"
            width="0.62"
            height="0.62"
            material="shader: flat; transparent: true; alphaTest: 0.02"
          ></a-image>

          <!-- Recentrar sem tirar o celular do VR Box. -->
          <a-entity
            id="btn-recentrar"
            class="alvo"
            position="1.13 -0.66 -2.30"
            geometry="primitive: circle; radius: 0.16; segments: 32"
            material="color: #4C1D95; shader: flat; opacity: 0.90; transparent: true"
          >
            <a-text
              value="REC"
              align="center"
              anchor="center"
              baseline="center"
              position="0 0 0.02"
              width="0.42"
              color="#FFFFFF"
            ></a-text>
          </a-entity>
        </a-entity>
      </a-camera>
    </a-entity>

    <a-entity id="alvos"></a-entity>
    <a-entity id="vagalumes"></a-entity>
    <a-entity id="petalas"></a-entity>
    <a-entity id="particulas"></a-entity>
  </a-scene>

  <script>
    (function () {
      const scene = document.querySelector('#scene');
      const camera = document.querySelector('#camera');
      const rig = document.querySelector('#rig');
      const cursor = document.querySelector('#cursor');
      const alvos = document.querySelector('#alvos');
      const vagalumes = document.querySelector('#vagalumes');
      const petalas = document.querySelector('#petalas');
      const particulas = document.querySelector('#particulas');
      const btnRecentrar = document.querySelector('#btn-recentrar');

      const hudPergunta = document.querySelector('#hud-pergunta');
      const hudPontos = document.querySelector('#hud-pontos');
      const hudPainel = document.querySelector('#hud-painel');
      const hudLumi = document.querySelector('#hud-lumi');
      const hudProgresso = document.querySelector('#hud-progresso');

      // O rastreamento no celular usa APENAS o DeviceMotion nativo do Expo.
      // Isso evita que A-Frame e expo-sensors tentem controlar a câmera ao mesmo tempo.
      let sensorNativoAtivo = false;
      let autoCalibrado = false;
      let timerAutoCalibracao = null;
      let ultimaOrientacaoBruta = new THREE.Quaternion();
      let possuiOrientacaoBruta = false;
      const offsetYaw = new THREE.Quaternion();
      const eixoY = new THREE.Vector3(0, 1, 0);
      const eulerYaw = new THREE.Euler(0, 0, 0, 'YXZ');
      let bloqueado = false;
      let proximaOrdem = 1;
      let totalSequencia = 0;
      let ultimoPayload = null;

      function enviarParaApp(dados) {
        try {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(dados));
          }
        } catch (erro) {
          // Nada: o jogo pode continuar mesmo sem console nativo.
        }
      }

      function normalizarAngulo(angulo) {
        return angulo > 180 ? angulo - 360 : angulo;
      }

      function posicaoPolar(angulo, raio, y) {
        const assinado = normalizarAngulo(Number(angulo || 0));
        const rad = THREE.MathUtils.degToRad(assinado);
        return {
          x: Math.sin(rad) * raio,
          y: y,
          z: -Math.cos(rad) * raio,
          rotY: -assinado,
        };
      }

      function limparFilhos(el) {
        while (el && el.firstChild) {
          el.removeChild(el.firstChild);
        }
      }

      function aplicarHover(el) {
        el.addEventListener('mouseenter', function () {
          if (el.__selecionado) return;
          el.setAttribute('scale', '1.08 1.08 1.08');
        });

        el.addEventListener('mouseleave', function () {
          if (el.__selecionado) return;
          el.setAttribute('scale', '1 1 1');
        });
      }

      function criarTexto(parent, texto, largura, posicao, cor) {
        const t = document.createElement('a-text');
        t.setAttribute('value', texto);
        t.setAttribute('align', 'center');
        t.setAttribute('anchor', 'center');
        t.setAttribute('baseline', 'center');
        t.setAttribute('width', largura);
        t.setAttribute('position', posicao || '0 0 0.035');
        t.setAttribute('color', cor || '#3F2A14');
        t.setAttribute('wrap-count', '18');
        parent.appendChild(t);
        return t;
      }

      function criarCardBase(angulo) {
        const p = posicaoPolar(angulo, 3.45, 1.58);
        const card = document.createElement('a-entity');

        card.classList.add('alvo');
        card.setAttribute('position', p.x + ' ' + p.y + ' ' + p.z);
        card.setAttribute('rotation', '0 ' + p.rotY + ' 0');
        card.setAttribute('geometry', 'primitive: plane; width: 1.62; height: 1.04');
        card.setAttribute(
          'material',
          'color: #FFF9E8; shader: flat; opacity: 0.97; transparent: true; side: double'
        );
        card.setAttribute(
          'animation__flutuar',
          'property: position; dir: alternate; loop: true; dur: 1900; easing: easeInOutSine; to: ' +
            p.x + ' ' + (p.y + 0.08) + ' ' + p.z
        );

        const borda = document.createElement('a-plane');
        borda.setAttribute('width', '1.72');
        borda.setAttribute('height', '1.14');
        borda.setAttribute('position', '0 0 -0.018');
        borda.setAttribute('material', 'color: #F7C948; shader: flat; opacity: 0.95');
        card.appendChild(borda);

        aplicarHover(card);
        return card;
      }

      function criarPatinho(parent, x, y) {
        const pato = document.createElement('a-entity');
        pato.setAttribute('position', x + ' ' + y + ' 0.045');

        const corpo = document.createElement('a-sphere');
        corpo.setAttribute('radius', '0.12');
        corpo.setAttribute('scale', '1.20 0.85 0.95');
        corpo.setAttribute('material', 'color: #FCD34D; roughness: 0.75');
        pato.appendChild(corpo);

        const cabeca = document.createElement('a-sphere');
        cabeca.setAttribute('radius', '0.075');
        cabeca.setAttribute('position', '0.09 0.09 0.015');
        cabeca.setAttribute('material', 'color: #FDE68A; roughness: 0.75');
        pato.appendChild(cabeca);

        const bico = document.createElement('a-cone');
        bico.setAttribute('radius-bottom', '0.045');
        bico.setAttribute('radius-top', '0');
        bico.setAttribute('height', '0.08');
        bico.setAttribute('rotation', '0 0 -90');
        bico.setAttribute('position', '0.17 0.09 0.018');
        bico.setAttribute('material', 'color: #FB923C; roughness: 0.8');
        pato.appendChild(bico);

        parent.appendChild(pato);
      }

      function preencherPatinhos(card, quantidade) {
        const qtd = Number(quantidade || 0);
        const colunas = qtd <= 3 ? qtd : 3;
        const espacamentoX = 0.34;
        const espacamentoY = 0.30;

        for (let i = 0; i < qtd; i += 1) {
          const linha = Math.floor(i / 3);
          const coluna = i % 3;
          const qtdNaLinha = Math.min(3, qtd - linha * 3);
          const centroLinha = ((qtdNaLinha - 1) * espacamentoX) / 2;
          const x = coluna * espacamentoX - centroLinha;
          const y = qtd > 3 ? 0.14 - linha * espacamentoY : 0;
          criarPatinho(card, x, y);
        }
      }

      function explosaoDeParticulas() {
        limparFilhos(particulas);

        for (let i = 0; i < 18; i += 1) {
          const part = document.createElement('a-sphere');
          const ang = Math.random() * Math.PI * 2;
          const raio = 0.7 + Math.random() * 1.2;
          const x = Math.cos(ang) * raio;
          const y = 1.15 + Math.random() * 1.25;
          const z = -2.0 - Math.random() * 1.2;

          part.setAttribute('radius', String(0.025 + Math.random() * 0.035));
          part.setAttribute('position', '0 1.6 -2.5');
          part.setAttribute('material', 'color: #FCD34D; shader: flat; opacity: 0.95');
          part.setAttribute(
            'animation__voar',
            'property: position; to: ' + x + ' ' + y + ' ' + z + '; dur: 700; easing: easeOutQuad'
          );
          part.setAttribute(
            'animation__sumir',
            'property: material.opacity; from: 0.95; to: 0; dur: 700; easing: linear'
          );
          particulas.appendChild(part);
        }

        setTimeout(function () {
          limparFilhos(particulas);
        }, 850);
      }

      function iniciarVagalumes() {
        if (vagalumes.childElementCount > 0) return;

        for (let i = 0; i < 14; i += 1) {
          const vaga = document.createElement('a-sphere');
          const x = -4 + Math.random() * 8;
          const y = 0.8 + Math.random() * 2.6;
          const z = -2 - Math.random() * 6;
          const x2 = x + (-0.45 + Math.random() * 0.9);
          const y2 = y + (-0.35 + Math.random() * 0.7);
          const z2 = z + (-0.45 + Math.random() * 0.9);
          const duracao = 1800 + Math.round(Math.random() * 2200);

          vaga.setAttribute('radius', '0.025');
          vaga.setAttribute('position', x + ' ' + y + ' ' + z);
          vaga.setAttribute('material', 'color: #FFF3A6; shader: flat; opacity: 0.80; transparent: true');
          vaga.setAttribute(
            'animation__mov',
            'property: position; dir: alternate; loop: true; dur: ' +
              duracao +
              '; easing: easeInOutSine; to: ' +
              x2 +
              ' ' +
              y2 +
              ' ' +
              z2
          );
          vaga.setAttribute(
            'animation__pisca',
            'property: material.opacity; dir: alternate; loop: true; dur: ' +
              Math.round(700 + Math.random() * 900) +
              '; from: 0.25; to: 0.95'
          );
          vagalumes.appendChild(vaga);
        }
      }

      function iniciarPetalas() {
        if (petalas.childElementCount > 0) return;

        for (let i = 0; i < 12; i += 1) {
          const petala = document.createElement('a-circle');
          const x = -3.8 + Math.random() * 7.6;
          const z = -2 - Math.random() * 6;
          const yInicio = 2.2 + Math.random() * 2.2;
          const yFim = -0.5 - Math.random();
          const duracao = 5000 + Math.round(Math.random() * 4500);

          petala.setAttribute('radius', '0.035');
          petala.setAttribute('scale', '1.5 0.75 1');
          petala.setAttribute('position', x + ' ' + yInicio + ' ' + z);
          petala.setAttribute('rotation', '0 ' + Math.round(Math.random() * 360) + ' 0');
          petala.setAttribute(
            'material',
            'color: #F9A8D4; shader: flat; opacity: 0.55; transparent: true; side: double'
          );
          petala.setAttribute(
            'animation__cair',
            'property: position; loop: true; dur: ' +
              duracao +
              '; easing: linear; from: ' +
              x +
              ' ' +
              yInicio +
              ' ' +
              z +
              '; to: ' +
              (x + 0.45) +
              ' ' +
              yFim +
              ' ' +
              z
          );
          petala.setAttribute(
            'animation__girar',
            'property: rotation; loop: true; dur: ' +
              Math.round(2600 + Math.random() * 3000) +
              '; to: 360 360 180; easing: linear'
          );
          petalas.appendChild(petala);
        }
      }

      function marcarCard(card, correto) {
        card.__selecionado = correto;
        card.setAttribute(
          'material',
          correto
            ? 'color: #DCFCE7; shader: flat; opacity: 0.98; transparent: true; side: double'
            : 'color: #FEE2E2; shader: flat; opacity: 0.98; transparent: true; side: double'
        );

        if (!correto) {
          card.setAttribute(
            'animation__erro',
            'property: rotation; dir: alternate; loop: 4; dur: 70; from: 0 ' +
              card.getAttribute('rotation').y +
              ' -2; to: 0 ' +
              card.getAttribute('rotation').y +
              ' 2'
          );
        }
      }

      function criarOpcaoEscolha(opcao) {
        const card = criarCardBase(opcao.angulo);

        if (typeof opcao.quantidade === 'number') {
          preencherPatinhos(card, opcao.quantidade);
        } else {
          criarTexto(card, String(opcao.texto || ''), 1.35, '0 0 0.04', '#3F2A14');
        }

        card.addEventListener('click', function () {
          if (bloqueado) return;

          if (opcao.acao) {
            bloqueado = true;
            enviarParaApp({ tipo: 'clique', acao: opcao.acao });
            setTimeout(function () {
              bloqueado = false;
            }, 350);
            return;
          }

          if (opcao.correta) {
            bloqueado = true;
            marcarCard(card, true);
            explosaoDeParticulas();
            enviarParaApp({ tipo: 'clique', acao: 'responder', correta: true });
            setTimeout(function () {
              bloqueado = false;
            }, 900);
          } else {
            marcarCard(card, false);
            enviarParaApp({ tipo: 'clique', acao: 'responder', correta: false });
            setTimeout(function () {
              card.removeAttribute('animation__erro');
              card.setAttribute(
                'material',
                'color: #FFF9E8; shader: flat; opacity: 0.97; transparent: true; side: double'
              );
            }, 550);
          }
        });

        alvos.appendChild(card);
      }

      function resetarSequenciaVisual() {
        proximaOrdem = 1;
        const cards = alvos.querySelectorAll('[data-sequencia="true"]');

        cards.forEach(function (card) {
          card.__selecionado = false;
          card.setAttribute('scale', '1 1 1');
          card.setAttribute(
            'material',
            'color: #FFF9E8; shader: flat; opacity: 0.97; transparent: true; side: double'
          );
        });
      }

      function criarPecaSequencia(peca) {
        const card = criarCardBase(peca.angulo);
        card.dataset.sequencia = 'true';
        card.dataset.ordem = String(peca.ordem);
        criarTexto(card, String(peca.texto || ''), 1.35, '0 0 0.04', '#3F2A14');

        card.addEventListener('click', function () {
          if (bloqueado || card.__selecionado) return;

          const ordem = Number(peca.ordem);

          if (ordem === proximaOrdem) {
            card.__selecionado = true;
            marcarCard(card, true);
            proximaOrdem += 1;

            if (proximaOrdem > totalSequencia) {
              bloqueado = true;
              explosaoDeParticulas();
              enviarParaApp({ tipo: 'clique', acao: 'responder', correta: true });
              setTimeout(function () {
                bloqueado = false;
              }, 900);
            }
          } else {
            marcarCard(card, false);
            enviarParaApp({ tipo: 'clique', acao: 'responder', correta: false });
            setTimeout(function () {
              resetarSequenciaVisual();
            }, 650);
          }
        });

        alvos.appendChild(card);
      }

      function criarPortal(angulo) {
        const p = posicaoPolar(angulo, 4.05, 1.65);
        const portal = document.createElement('a-entity');
        portal.classList.add('alvo');
        portal.setAttribute('position', p.x + ' ' + p.y + ' ' + p.z);
        portal.setAttribute('rotation', '0 ' + p.rotY + ' 0');

        const brilho = document.createElement('a-torus');
        brilho.setAttribute('radius', '1.05');
        brilho.setAttribute('radius-tubular', '0.045');
        brilho.setAttribute('segments-radial', '12');
        brilho.setAttribute('segments-tubular', '64');
        brilho.setAttribute('material', 'color: #FCD34D; shader: flat; opacity: 0.82; transparent: true');
        brilho.setAttribute(
          'animation__girar',
          'property: rotation; loop: true; dur: 4200; easing: linear; to: 0 0 360'
        );
        portal.appendChild(brilho);

        const img = document.createElement('a-image');
        img.setAttribute('src', '#portal-img');
        img.setAttribute('width', '2.15');
        img.setAttribute('height', '2.65');
        img.setAttribute('position', '0 0 0.025');
        img.setAttribute('material', 'shader: flat; transparent: true; alphaTest: 0.03');
        portal.appendChild(img);

        const legenda = document.createElement('a-text');
        legenda.setAttribute('value', 'CONTINUAR');
        legenda.setAttribute('position', '0 -1.42 0.05');
        legenda.setAttribute('align', 'center');
        legenda.setAttribute('anchor', 'center');
        legenda.setAttribute('width', '2.0');
        legenda.setAttribute('color', '#FFF7C2');
        portal.appendChild(legenda);

        portal.setAttribute(
          'animation__flutuar',
          'property: position; dir: alternate; loop: true; dur: 1700; easing: easeInOutSine; to: ' +
            p.x + ' ' + (p.y + 0.10) + ' ' + p.z
        );

        aplicarHover(portal);

        portal.addEventListener('click', function () {
          if (bloqueado) return;
          bloqueado = true;
          enviarParaApp({ tipo: 'clique', acao: 'avancar' });
          setTimeout(function () {
            bloqueado = false;
          }, 700);
        });

        alvos.appendChild(portal);
      }

      function renderizarConteudo(payload) {
        ultimoPayload = payload;
        limparFilhos(alvos);
        bloqueado = false;
        proximaOrdem = 1;
        totalSequencia = 0;

        if (!payload || !payload.modo) return;

        if (payload.modo === 'escolha') {
          (payload.opcoes || []).forEach(criarOpcaoEscolha);
          return;
        }

        if (payload.modo === 'sequencia') {
          totalSequencia = (payload.pecas || []).length;
          (payload.pecas || []).forEach(criarPecaSequencia);
          return;
        }

        if (payload.modo === 'portal') {
          criarPortal(payload.angulo || 0);
        }
      }

      function atualizarProgresso(concluidas, total, atual) {
        limparFilhos(hudProgresso);

        const qtd = Math.max(0, Number(total || 0));
        if (!qtd) return;

        const espacamento = 0.14;
        const larguraTotal = Math.max(0, (qtd - 1) * espacamento);

        for (let i = 0; i < qtd; i += 1) {
          const ponto = document.createElement('a-circle');
          const feito = i < Number(concluidas || 0);
          const corrente = i === Number(atual || 0) && !feito;

          ponto.setAttribute('radius', corrente ? '0.040' : '0.032');
          ponto.setAttribute('position', (-larguraTotal / 2 + i * espacamento) + ' 0 0');
          ponto.setAttribute(
            'material',
            'shader: flat; color: ' +
              (feito ? '#FCD34D' : corrente ? '#FFFFFF' : '#8B86A9') +
              '; opacity: 0.95; transparent: true'
          );
          hudProgresso.appendChild(ponto);
        }
      }

      function atualizarHud(dados) {
        if (!dados) return;

        hudPergunta.setAttribute('value', String(dados.pergunta || ''));
        hudPontos.setAttribute('value', String(dados.pontos || 0) + ' pts');

        atualizarProgresso(dados.concluidas, dados.total, dados.indice);

        if (dados.feedback === 'correto') {
          hudPainel.setAttribute(
            'material',
            'color: #065F46; shader: flat; opacity: 0.88; transparent: true'
          );
          hudLumi.setAttribute('src', '#lumi-certo');
        } else if (dados.feedback === 'errado') {
          hudPainel.setAttribute(
            'material',
            'color: #991B1B; shader: flat; opacity: 0.88; transparent: true'
          );
          hudLumi.setAttribute('src', '#lumi-errado');
        } else {
          hudPainel.setAttribute(
            'material',
            'color: #1E1B4B; shader: flat; opacity: 0.92; transparent: true'
          );
          hudLumi.setAttribute('src', '#lumi-normal');
        }
      }

      // Recentragem segura para VR: corrige SOMENTE a direção horizontal (yaw).
      // Não zeramos pitch/roll porque isso muda os eixos de referência do sensor e
      // pode fazer um giro de cabeça virar inclinação, causando desconforto.
      function centralizarVisao() {
        if (!camera || !possuiOrientacaoBruta) return;

        eulerYaw.setFromQuaternion(ultimaOrientacaoBruta, 'YXZ');
        const yawAtual = eulerYaw.y;
        offsetYaw.setFromAxisAngle(eixoY, -yawAtual);

        const qFinal = offsetYaw.clone().multiply(ultimaOrientacaoBruta);
        camera.object3D.quaternion.copy(qFinal);
        camera.object3D.updateMatrixWorld(true);

        enviarParaApp({
          tipo: 'debug',
          mensagem: 'Visão recentralizada somente no eixo horizontal (yaw).',
        });
      }

      // Depois que o sensor nativo começa a responder, usamos a direção em que
      // o usuário está olhando como o novo "para frente". Pitch e roll continuam
      // vindo diretamente do sensor, sem correções artificiais.
      function agendarCalibracaoAutomatica() {
        if (autoCalibrado || timerAutoCalibracao) return;

        timerAutoCalibracao = setTimeout(function () {
          timerAutoCalibracao = null;
          centralizarVisao();
          autoCalibrado = true;

          enviarParaApp({
            tipo: 'debug',
            mensagem: 'Calibração horizontal automática concluída.',
          });
        }, 900);
      }

      // Algoritmo equivalente ao DeviceOrientationControls para o fallback
      // recebido do expo-sensors quando a WebView não fornece orientação.
      const zee = new THREE.Vector3(0, 0, 1);
      const euler = new THREE.Euler();
      const q0 = new THREE.Quaternion();
      const q1 = new THREE.Quaternion(
        -Math.sqrt(0.5),
        0,
        0,
        Math.sqrt(0.5)
      );

      function aplicarOrientacaoNativa(rotacao, orientacaoTela) {
        if (!rotacao || !camera) return;

        if (!sensorNativoAtivo) {
          sensorNativoAtivo = true;

          // A partir daqui somente o sensor nativo controla a câmera.
          camera.setAttribute(
            'look-controls',
            'enabled: false; reverseMouseDrag: false; magicWindowTrackingEnabled: false; touchEnabled: false; mouseEnabled: false'
          );

          enviarParaApp({
            tipo: 'debug',
            mensagem: 'DeviceMotion nativo assumiu o controle da câmera.',
          });

          agendarCalibracaoAutomatica();
        }

        // DeviceMotion.rotation do Expo usa radianos.
        const alpha = Number(rotacao.alpha || 0);
        const beta = Number(rotacao.beta || 0);
        const gamma = Number(rotacao.gamma || 0);

        // O app é travado em LANDSCAPE_LEFT. O DeviceMotionOrientation equivalente
        // é -90°. Ainda aceitamos o valor recebido, mas o React Native envia -90
        // explicitamente para impedir que a WebView trate o aparelho como portrait.
        const orient = THREE.MathUtils.degToRad(Number(orientacaoTela || -90));

        euler.set(beta, alpha, -gamma, 'YXZ');

        const qSensor = new THREE.Quaternion();
        qSensor.setFromEuler(euler);
        qSensor.multiply(q1);
        qSensor.multiply(q0.setFromAxisAngle(zee, -orient));

        ultimaOrientacaoBruta.copy(qSensor);
        possuiOrientacaoBruta = true;

        const qFinal = offsetYaw.clone().multiply(qSensor);
        camera.object3D.quaternion.copy(qFinal);
        camera.object3D.updateMatrixWorld(true);
      }

      function tentarAtivarComTecla(evento) {
        const codigos = [13, 23, 32, 66, 96];
        if (!codigos.includes(evento.keyCode)) return;

        try {
          const raycaster = cursor.components && cursor.components.raycaster;
          const intersectados = raycaster && raycaster.intersectedEls;
          if (intersectados && intersectados.length > 0) {
            intersectados[0].emit('click', { origem: 'controle' }, false);
          }
        } catch (e) {}
      }

      btnRecentrar.addEventListener('click', function () {
        centralizarVisao();
      });

      document.addEventListener('keydown', tentarAtivarComTecla, true);

      // Não usamos deviceorientation da WebView no celular. Em algumas WebViews
      // Android a orientação da tela não acompanha corretamente o landscape, o que
      // pode deixar o mundo girado em 90°. O DeviceMotion nativo é a única fonte.

      function receberMensagem(event) {
        try {
          const dados = JSON.parse(event.data);

          if (dados.tipo === 'conteudo') {
            renderizarConteudo(dados);
            return;
          }

          if (dados.tipo === 'hud') {
            atualizarHud(dados);
            return;
          }

          if (dados.tipo === 'centralizar') {
            centralizarVisao();
            return;
          }

          if (dados.tipo === 'sensor-nativo') {
            aplicarOrientacaoNativa(dados.rotacao, dados.orientacao);
          }
        } catch (erro) {
          enviarParaApp({ tipo: 'debug', mensagem: 'Erro ao processar mensagem: ' + String(erro) });
        }
      }

      // Android e iOS usam caminhos diferentes em versões da WebView.
      document.addEventListener('message', receberMensagem);
      window.addEventListener('message', receberMensagem);

      scene.addEventListener('loaded', function () {
        iniciarVagalumes();
        iniciarPetalas();

        enviarParaApp({
          tipo: 'debug',
          temXR: !!navigator.xr,
          userAgent: navigator.userAgent,
        });

        if (navigator.xr && navigator.xr.isSessionSupported) {
          navigator.xr
            .isSessionSupported('immersive-vr')
            .then(function (suportado) {
              enviarParaApp({
                tipo: 'debug',
                immersiveVrSuportado: suportado,
              });
            })
            .catch(function (erro) {
              enviarParaApp({ tipo: 'debug', erroXR: String(erro) });
            });
        }

        enviarParaApp({ tipo: 'pronto' });
      });
    })();
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
  const [lumiUri, setLumiUri] = useState('');
  const [lumiCorretoUri, setLumiCorretoUri] = useState('');
  const [lumiErradoUri, setLumiErradoUri] = useState('');

  const [usarFallbackSensor] = useState(true);

  const webviewRef = useRef(null);
  const flashOpacity = useRef(new Animated.Value(0)).current;

  const assetsProntos =
    !!imagemUri &&
    !!portalUri &&
    !!lumiUri &&
    !!lumiCorretoUri &&
    !!lumiErradoUri;

  useEffect(() => {
    let ativo = true;

    const carregarImagens = async () => {
      try {
        const [
          imagem360,
          portal,
          lumi,
          lumiCerto,
          lumiErrado,
        ] = await Promise.all([
          carregarAssetComoDataUri(ARQUIVO_IMAGEM_360, 'image/jpeg'),
          carregarAssetComoDataUri(ARQUIVO_PORTAL, 'image/png'),
          carregarAssetComoDataUri(ARQUIVO_LUMI, 'image/png'),
          carregarAssetComoDataUri(ARQUIVO_LUMI_CORRETO, 'image/png'),
          carregarAssetComoDataUri(ARQUIVO_LUMI_ERRADO, 'image/png'),
        ]);

        if (!ativo) return;

        setImagemUri(imagem360);
        setPortalUri(portal);
        setLumiUri(lumi);
        setLumiCorretoUri(lumiCerto);
        setLumiErradoUri(lumiErrado);
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
    pararFala();
    StatusBar.setHidden(true, 'fade');

    try {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE_LEFT
      );
    } catch (error) {
      console.log('[VR] Não foi possível travar em landscape:', error);
    }

    setContador(3);
    setEtapa('contagem');
  };

  useEffect(() => {
    if (etapa === 'contagem' && contador > 0) {
      const timer = setTimeout(() => setContador((valor) => valor - 1), 1000);
      return () => clearTimeout(timer);
    }

    if (etapa === 'contagem' && contador === 0) {
      setEtapa('menu_vr');
      pararFala();
      falar(
        'Bem-vindo à Floresta Mágica! Escolha um caminho!',
        'boas_vindas'
      );
    }

    return undefined;
  }, [contador, etapa]);

  useEffect(() => {
    return () => {
      pararFala();
      StatusBar.setHidden(false, 'fade');
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch(() => {});
    };
  }, []);

  // Rastreamento de cabeça nativo.
  // Usamos DeviceMotion como fonte única no celular para evitar conflito com
  // o deviceorientation da WebView e garantir a compensação correta do landscape.
  useEffect(() => {
    if (!usarFallbackSensor || !cenaPronta || etapa === 'preparo') {
      return undefined;
    }

    let assinatura = null;
    let cancelado = false;

    const iniciarSensor = async () => {
      try {
        const disponivel = await DeviceMotion.isAvailableAsync();
        if (!disponivel || cancelado) {
          console.log('[VR] DeviceMotion não disponível neste aparelho.');
          return;
        }

        const permissaoAtual = await DeviceMotion.getPermissionsAsync();
        let permissao = permissaoAtual;

        if (!permissaoAtual.granted && permissaoAtual.canAskAgain) {
          permissao = await DeviceMotion.requestPermissionsAsync();
        }

        if (!permissao.granted || cancelado) {
          console.log('[VR] Permissão de movimento não concedida.');
          return;
        }

        DeviceMotion.setUpdateInterval(16);

        assinatura = DeviceMotion.addListener((medida) => {
          if (!medida?.rotation || !webviewRef.current) return;

          webviewRef.current.postMessage(
            JSON.stringify({
              tipo: 'sensor-nativo',
              rotacao: medida.rotation,
              orientacao: -90,
            })
          );
        });
      } catch (error) {
        console.log('[VR] Erro no fallback DeviceMotion:', error);
      }
    };

    iniciarSensor();

    return () => {
      cancelado = true;
      assinatura?.remove?.();
    };
  }, [usarFallbackSensor, cenaPronta, etapa]);

  const escolherModo = (modo) => {
    const trilha =
      modo === 'dislexia' ? TRILHA_DISLEXIA : TRILHA_DISCALCULIA;

    setModoSelecionado(modo);
    setTrilhaAtual(trilha);
    setIndice(0);
    setPontos(0);
    setFeedback(null);

    falar(
      modo === 'dislexia'
        ? 'Modo Dislexia! Vamos jogar com as palavras!'
        : 'Modo Discalculia! Vamos jogar com os números!',
      modo === 'dislexia' ? 'modo_dislexia' : 'modo_discalculia'
    );

    falar(trilha[0].pergunta, chavePergunta(modo, 0));
    setEtapa('jogo');
  };

  const responderCerto = () => {
    setFeedback('correto');
    setPontos((valor) => valor + 10);
    falar(
      'Muito bem! Procure o portal para continuar!',
      'feedback_certo'
    );

    setTimeout(() => {
      setFeedback(null);
      setEtapa('portal');
    }, 1200);
  };

  const responderErrado = () => {
    setFeedback('errado');
    falar('Tente novamente!', 'feedback_errado');

    setTimeout(() => {
      setFeedback(null);
    }, 1000);
  };

  const dispararFlashTeleporte = (aoTerminar) => {
    flashOpacity.setValue(0);

    Animated.sequence([
      Animated.timing(flashOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (aoTerminar) aoTerminar();
    });
  };

  const avancarProximaEstacao = () => {
    dispararFlashTeleporte(() => {
      if (indice + 1 < trilhaAtual.length) {
        const prox = indice + 1;
        setIndice(prox);
        setEtapa('jogo');
        falar(
          trilhaAtual[prox].pergunta,
          chavePergunta(modoSelecionado, prox)
        );
      } else {
        setEtapa('final');
        falar('Parabéns! Você completou a trilha!', 'trilha_final');
      }
    });
  };


  const aoReceberMensagemWebView = (event) => {
    try {
      const dados = JSON.parse(event.nativeEvent.data);

      if (dados.tipo === 'pronto') {
        setCenaPronta(true);
        return;
      }

      if (dados.tipo === 'debug') {
        console.log('[VR][WEBVIEW]', dados);
        return;
      }

      if (dados.tipo === 'clique') {
        if (
          dados.acao === 'dislexia' ||
          dados.acao === 'discalculia'
        ) {
          escolherModo(dados.acao);
        } else if (dados.acao === 'voltar-lobby') {
          setFeedback(null);
          setEtapa('menu_vr');
          falar(
            'Escolha um caminho: palavras ou números!',
            'boas_vindas'
          );
        } else if (dados.acao === 'responder') {
          dados.correta ? responderCerto() : responderErrado();
        } else if (dados.acao === 'avancar') {
          avancarProximaEstacao();
        }
      }
    } catch (error) {
      console.log('[VR] Mensagem inválida da WebView:', error);
    }
  };

  // Conteúdo 3D da estação. Não depende do feedback para não recriar/embaralhar
  // os cartões quando a criança erra ou acerta.
  useEffect(() => {
    if (!cenaPronta || !webviewRef.current) return;

    let payload = null;

    if (etapa === 'menu_vr') {
      const [a1, a2] = sortearAngulosN(2);
      payload = {
        tipo: 'conteudo',
        modo: 'escolha',
        opcoes: [
          { texto: 'DISLEXIA', angulo: a1, acao: 'dislexia' },
          {
            texto: 'DISCALCULIA',
            angulo: a2,
            acao: 'discalculia',
          },
        ],
      };
    } else if (etapa === 'jogo') {
      const questao = trilhaAtual[indice];

      if (questao.tipo === 'escolha') {
        const angulos = sortearAngulosN(questao.opcoes.length);

        payload = {
          tipo: 'conteudo',
          modo: 'escolha',
          opcoes: questao.opcoes.map((opcao, i) => ({
            ...opcao,
            angulo: angulos[i],
          })),
        };
      } else if (questao.tipo === 'sequencia') {
        const angulos = sortearAngulosN(questao.pecas.length);
        const indicesEmbaralhados = questao.pecas
          .map((_, i) => i)
          .sort(() => Math.random() - 0.5);

        payload = {
          tipo: 'conteudo',
          modo: 'sequencia',
          pecas: indicesEmbaralhados.map(
            (idxOriginal, posVisual) => ({
              texto: questao.pecas[idxOriginal],
              ordem: idxOriginal + 1,
              angulo: angulos[posVisual],
            })
          ),
        };
      }
    } else if (etapa === 'portal') {
      payload = {
        tipo: 'conteudo',
        modo: 'portal',
        angulo: 0,
      };
    } else if (etapa === 'final') {
      payload = {
        tipo: 'conteudo',
        modo: 'escolha',
        opcoes: [
          {
            texto: 'VOLTAR AO LOBBY',
            angulo: 0,
            acao: 'voltar-lobby',
            correta: true,
          },
        ],
      };
    }

    if (payload) {
      webviewRef.current.postMessage(JSON.stringify(payload));
    }
  }, [cenaPronta, etapa, indice, trilhaAtual]);

  const questaoAtual = etapa === 'jogo' ? trilhaAtual[indice] : null;

  const perguntaAtual =
    etapa === 'jogo'
      ? questaoAtual?.pergunta || ''
      : etapa === 'menu_vr'
        ? 'Escolha um caminho na sua frente!'
        : etapa === 'portal'
          ? 'Muito bem! Encontre o portal para continuar!'
          : `Parabéns! Você fez ${pontos} pontos!`;

  // HUD fica dentro da cena A-Frame, em profundidade, para os dois olhos.
  useEffect(() => {
    if (!cenaPronta || !webviewRef.current) return;

    const concluidas =
      etapa === 'final'
        ? trilhaAtual.length
        : etapa === 'portal'
          ? Math.min(indice + 1, trilhaAtual.length)
          : indice;

    webviewRef.current.postMessage(
      JSON.stringify({
        tipo: 'hud',
        pergunta: perguntaAtual,
        pontos,
        indice,
        concluidas,
        total:
          etapa === 'menu_vr' ? 0 : trilhaAtual.length,
        feedback,
      })
    );
  }, [
    cenaPronta,
    etapa,
    indice,
    pontos,
    feedback,
    trilhaAtual,
    perguntaAtual,
  ]);

  if (etapa === 'preparo') {
    return (
      <View style={styles.containerPreparo}>
        <Image
          source={ARQUIVO_LUMI}
          style={styles.imgLumiPreparo}
          resizeMode="contain"
        />

        <Text style={styles.titulo}>Mundo Virtual da Lumi</Text>

        <Text style={styles.subtitulo}>
          Encaixe seu celular nos óculos VR e prepare o controle Bluetooth
          para iniciar!
        </Text>

        <TouchableOpacity
          style={styles.btnComecar}
          onPress={iniciarExperiencia}
        >
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
        <Text style={styles.txtContagem}>
          {contador === 0 ? 'VAMOS!' : contador}
        </Text>
        <Text style={styles.txtAviso}>Coloque os óculos agora!</Text>
      </View>
    );
  }

  return (
    <View style={styles.containerVR}>
      {assetsProntos && (
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{
            html: montarHtmlCena({
              imagemUri,
              portalUri,
              lumiUri,
              lumiCorretoUri,
              lumiErradoUri,
            }),
          }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          androidLayerType="hardware"
          overScrollMode="never"
          bounces={false}
          scrollEnabled={false}
          setSupportMultipleWindows={false}
          onMessage={aoReceberMensagemWebView}
          onError={(event) => {
            console.log('[VR] Erro da WebView:', event.nativeEvent);
          }}
          onHttpError={(event) => {
            console.log('[VR] Erro HTTP da WebView:', event.nativeEvent);
          }}
        />
      )}

      {!assetsProntos && (
        <View style={styles.carregando}>
          <Text style={styles.txtCarregando}>
            Carregando a Floresta Mágica...
          </Text>
        </View>
      )}

      <Animated.View
        pointerEvents="none"
        style={[styles.flash, { opacity: flashOpacity }]}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  containerPreparo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    padding: 20,
  },
  imgLumiPreparo: {
    width: 180,
    height: 180,
    marginBottom: 10,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3f01a3',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 15,
    color: '#6D28D9',
    textAlign: 'center',
    marginVertical: 15,
    paddingHorizontal: 20,
  },
  btnComecar: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 4,
  },
  txtComecar: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  txtVoltar: {
    color: '#6D28D9',
    marginTop: 15,
    textDecorationLine: 'underline',
  },

  containerContagem: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  txtContagem: {
    fontSize: 90,
    fontWeight: '900',
    color: '#A78BFA',
  },
  txtAviso: {
    color: '#DDD6FE',
    fontSize: 16,
    marginTop: 10,
  },

  containerVR: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  carregando: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  txtCarregando: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 30,
  },

  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },

});
