import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
import { DeviceMotion, Gyroscope } from 'expo-sensors';
import { Asset } from 'expo-asset';
import { addScore } from '../services/ScoreManager';
import * as FileSystem from 'expo-file-system/legacy';
import {
  falar,
  pararFala,
  definirContextoAudio,
  limparFilaDoContextoAtual,
  precarregarFalas,
} from '../services/Som';

const IMAGEM_FLORESTA = require('../../assets/images/floresta_360.jpg');
const IMAGEM_PARQUINHO = require('../../assets/images/parque.jpeg');

const MUNDOS = {
  floresta: {
    id: 'floresta',
    nome: 'Floresta Mágica',
    emoji: '🌳',
    imagem: IMAGEM_FLORESTA,
    rotacaoCeuY: -90,
    efeitos: 'floresta',
    boasVindasTexto: 'Bem-vindo a sua Floresta Encantada! Escolha um caminho!',
    boasVindasChave: 'boas_vindas',
    corCard: '#DCFCE7',
    corBorda: '#16A34A',
    corTexto: '#14532D',
  },
  parquinho: {
    id: 'parquinho',
    nome: 'Parquinho',
    emoji: '🎠',
    imagem: IMAGEM_PARQUINHO,
    rotacaoCeuY: -90,
    efeitos: 'parquinho',
    boasVindasTexto: 'Bem-vindo ao seu Parquinho! Escolha um caminho!',
    boasVindasChave: 'boas_vindas_parquinho',
    corCard: '#FEF9C3',
    corBorda: '#EAB308',
    corTexto: '#713F12',
  },
};

const MUNDO_PADRAO = 'floresta';
const TEMPO_FUSE_MS = 3100;
const ARQUIVO_PORTAL = require('../../assets/images/portal.png');
const ARQUIVO_LUMI = require('../../assets/images/heroLumi.png');

const TRILHA_DISLEXIA = [
  {
    audio: 'disl_pergunta_1',
    tipo: 'escolha',
    pergunta: 'Qual a palavra correta?',
    opcoes: [
      { texto: 'BOLA', correta: true },
      { texto: 'DOLA', correta: false },
    ],
  },
  {
    audio: 'disl_pergunta_2',
    tipo: 'escolha',
    pergunta: 'Encontre a letra B',
    opcoes: [
      { texto: 'B', correta: true },
      { texto: 'D', correta: false },
    ],
  },
  {
    audio: 'disl_pergunta_3',
    tipo: 'escolha',
    pergunta: 'Cade a palavra certa?',
    opcoes: [
      { texto: 'PATO', correta: true },
      { texto: 'BATO', correta: false },
    ],
  },
  {
    audio: 'disl_pergunta_4',
    tipo: 'sequencia',
    pergunta: 'Clique nas silabas em ordem para formar BOLA',
    pecas: ['BO', 'LA'],
  },
  {
    audio: 'disl_pergunta_5',
    tipo: 'sequencia',
    pergunta: 'Clique nas silabas em ordem para formar PATO',
    pecas: ['PA', 'TO'],
  },
];

const TRILHA_DISCALCULIA = [
  {
    audio: 'disc_pergunta_1',
    tipo: 'escolha',
    pergunta: '2 + 3?',
    opcoes: [
      { texto: '5', correta: true },
      { texto: '6', correta: false },
    ],
  },
  {
    audio: 'disc_pergunta_2',
    tipo: 'escolha',
    pergunta: 'Qual grupo tem MAIS patinhos?',
    opcoes: [
      { quantidade: 5, correta: true },
      { quantidade: 3, correta: false },
    ],
  },
  {
    audio: 'disc_pergunta_3',
    tipo: 'escolha',
    pergunta: '5 - 2?',
    opcoes: [
      { texto: '3', correta: true },
      { texto: '4', correta: false },
    ],
  },
  {
    audio: 'disc_pergunta_4',
    tipo: 'sequencia',
    pergunta: 'Clique nos numeros em ordem, do menor para o maior',
    pecas: ['1', '2', '3'],
  },
  {
    audio: 'disc_pergunta_5',
    tipo: 'escolha',
    pergunta: 'Qual numero maior?',
    opcoes: [
      { texto: '8', correta: true },
      { texto: '3', correta: false },
    ],
  },
];

const PERGUNTAS_POR_PORTAL = 3;

const FALAS_VR_PRELOAD = [
  'boas_vindas',
  'modo_dislexia',
  'modo_discalculia',
  'disl_pergunta_1',
  'disl_pergunta_2',
  'disl_pergunta_3',
  'disl_pergunta_4',
  'disl_pergunta_5',
  'disc_pergunta_1',
  'disc_pergunta_2',
  'disc_pergunta_3',
  'disc_pergunta_4',
  'disc_pergunta_5',
  'muitobem',
  'feedback_certo',
  'feedback_errado',
  'trilha_final',
];

function chavePergunta(modo, indice) {
  const prefixo = modo === 'dislexia' ? 'disl' : 'disc';
  return `${prefixo}_pergunta_${indice + 1}`;
}

function chaveAudio(trilha, modo, indice) {
  return (trilha && trilha[indice] && trilha[indice].audio) || chavePergunta(modo, indice);
}

function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function falarSeguro(texto, chave, opcoes) {
  try {
    const retorno = opcoes ? falar(texto, chave, opcoes) : falar(texto, chave);
    if (retorno && typeof retorno.catch === 'function') {
      retorno.catch(() => {});
    }
  } catch (erro) {
    console.log('[VR] Falha ao falar:', erro);
  }
}

function sortearAngulosN(n) {
  const centro = 0;
  const larguraArco = n > 2 ? 66 : n > 1 ? 50 : 0;
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
    throw new Error('Nao foi possivel obter a URI do asset.');
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return `data:${mimeType};base64,${base64}`;
}

function montarHtmlCena({
  imagemUri,
  portalUri,
  efeitos = 'floresta',
  rotacaoCeuY = -90,
  larguraTelaMm = 0,
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
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    canvas {
      position: absolute;
      inset: 0;
      display: block;
      width: 100% !important;
      height: 100% !important;
      touch-action: none;
    }
  </style>

  <script>
    AFRAME.registerComponent('adaptai-cardboard', {
      schema: {
        enabled: { default: true },
        eyeSep: { default: 0.063 },
        maxDpr: { default: 2.0 },
        lensMm: { default: 63 },
        telaMm: { default: 0 },
        ajusteMm: { default: 0 },
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

          let ultimaLargura = 0;
          let ultimaAltura = 0;
          let ultimoDpr = 0;

          function ajustarRenderer(forcar) {
            const larguraJanela = Math.max(2, Math.round(window.innerWidth || document.documentElement.clientWidth || 2));
            const alturaJanela = Math.max(1, Math.round(window.innerHeight || document.documentElement.clientHeight || 1));
            const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), componente.data.maxDpr);

            if (!forcar && larguraJanela === ultimaLargura && alturaJanela === ultimaAltura && Math.abs(dpr - ultimoDpr) < 0.001) {
              return;
            }

            ultimaLargura = larguraJanela;
            ultimaAltura = alturaJanela;
            ultimoDpr = dpr;

            renderer.setPixelRatio(dpr);
            renderer.setSize(larguraJanela, alturaJanela, false);

            const canvas = renderer.domElement;
            if (canvas) {
              canvas.style.width = '100%';
              canvas.style.height = '100%';
              canvas.style.display = 'block';
            }
          }

          function reajustarDepoisDaRotacao() {
            requestAnimationFrame(() => ajustarRenderer(true));
            setTimeout(() => ajustarRenderer(true), 80);
            setTimeout(() => ajustarRenderer(true), 300);
          }

          window.addEventListener('resize', reajustarDepoisDaRotacao, { passive: true });
          window.addEventListener('orientationchange', reajustarDepoisDaRotacao, { passive: true });
          document.addEventListener('visibilitychange', () => {
            if (!document.hidden) reajustarDepoisDaRotacao();
          });

          ajustarRenderer(true);

          renderer.render = function (scene3D, camera) {
            if (!componente.data.enabled || !camera || !camera.isPerspectiveCamera || (renderer.xr && renderer.xr.isPresenting)) {
              return renderOriginal(scene3D, camera);
            }

            ajustarRenderer(false);
            renderer.getSize(tamanho);

            const largura = Math.max(2, Math.round(tamanho.x));
            const altura = Math.max(1, Math.round(tamanho.y));
            const metade = Math.floor(largura / 2);
            const larguraEsquerda = metade;
            const larguraDireita = largura - metade;
            const aspectoPorOlho = larguraEsquerda / altura;

            if (Math.abs(camera.aspect - aspectoPorOlho) > 0.0001) {
              camera.aspect = aspectoPorOlho;
              camera.updateProjectionMatrix();
            }

            stereo.eyeSep = componente.data.eyeSep;
            camera.updateMatrixWorld(true);
            stereo.update(camera);

            const telaMm = componente.data.telaMm > 0 ? componente.data.telaMm : 145;
            const lenteMm = componente.data.lensMm + componente.data.ajusteMm;
            const metadeTelaMm = telaMm / 2;
            const deslocamento = Math.max(-0.45, Math.min(0.45, (metadeTelaMm / 2 - lenteMm / 2) / (metadeTelaMm / 2)));

            stereo.cameraL.projectionMatrix.copy(camera.projectionMatrix);
            stereo.cameraR.projectionMatrix.copy(camera.projectionMatrix);
            stereo.cameraL.projectionMatrix.elements[8] = -deslocamento;
            stereo.cameraR.projectionMatrix.elements[8] = deslocamento;
            stereo.cameraL.projectionMatrixInverse.copy(stereo.cameraL.projectionMatrix).invert();
            stereo.cameraR.projectionMatrixInverse.copy(stereo.cameraR.projectionMatrix).invert();

            const autoClearAnterior = renderer.autoClear;
            renderer.autoClear = false;
            renderer.setScissorTest(false);
            renderer.setViewport(0, 0, largura, altura);
            renderer.clear(true, true, true);

            renderer.setScissorTest(true);
            renderer.setViewport(0, 0, larguraEsquerda, altura);
            renderer.setScissor(0, 0, larguraEsquerda, altura);
            renderOriginal(scene3D, stereo.cameraL);

            renderer.setViewport(larguraEsquerda, 0, larguraDireita, altura);
            renderer.setScissor(larguraEsquerda, 0, larguraDireita, altura);
            renderOriginal(scene3D, stereo.cameraR);

            renderer.setScissorTest(false);
            renderer.setViewport(0, 0, largura, altura);
            renderer.autoClear = autoClearAnterior;
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
    adaptai-cardboard="enabled: true; eyeSep: 0.063; maxDpr: 2.0; lensMm: 63; telaMm: ${Number(larguraTelaMm) || 0}; ajusteMm: 0"
    device-orientation-permission-ui="enabled: false"
    loading-screen="enabled: false"
    xr-mode-ui="enabled: false"
    renderer="antialias: true; precision: high; colorManagement: true"
  >
    <a-assets timeout="15000">
      <img id="ceu" src="${imagemUri}">
      <img id="portal-img" src="${portalUri}">
    </a-assets>

    <a-sky
      id="sky"
      src="#ceu"
      radius="50"
      segments-width="64"
      segments-height="32"
      rotation="0 ${rotacaoCeuY} 0"
      material="shader: flat; side: back; depthWrite: false"
    ></a-sky>

    <a-entity light="type: ambient; color: #FFF; intensity: 0.92"></a-entity>
    <a-entity light="type: directional; color: #FFF; intensity: 0.55" position="1 3 2"></a-entity>

    <a-entity id="rig" position="0 0 0">
      <a-camera
        id="camera"
        position="0 1.6 0"
        camera="near: 0.05; far: 100"
        wasd-controls-enabled="false"
        look-controls="enabled: true; reverseMouseDrag: false; magicWindowTrackingEnabled: false; touchEnabled: true; mouseEnabled: true"
      >
        <a-cursor
          id="cursor"
          fuse="true"
          fuse-timeout="${TEMPO_FUSE_MS}"
          raycaster="objects: .alvo; far: 20; interval: 40"
          material="color: #FFFFFF; shader: flat; opacity: 0.92"
          geometry="primitive: ring; radiusInner: 0.036; radiusOuter: 0.060; segmentsTheta: 32"
          position="0 0 -3"
          animation__fusing="property: scale; startEvents: fusing; from: 1 1 1; to: 0.55 0.55 0.55; dur: ${TEMPO_FUSE_MS}"
          animation__reset="property: scale; startEvents: mouseleave; to: 1 1 1; dur: 120"
        ></a-cursor>

        <a-entity id="hud-vr">
          <a-plane
            id="hud-borda"
            position="0 0.98 -2.36"
            width="2.34"
            height="0.38"
            material="color: #E9C46A; shader: flat; opacity: 0.72; transparent: true"
          ></a-plane>

          <a-plane
            id="hud-painel"
            position="0 0.98 -2.34"
            width="2.26"
            height="0.31"
            material="color: #FFF7ED; shader: flat; opacity: 0.88; transparent: true"
          ></a-plane>

          <a-text
            id="hud-pergunta"
            value="Carregando..."
            position="0 0.98 -2.30"
            align="center"
            anchor="center"
            baseline="center"
            width="1.98"
            color="#4C1D95"
            wrap-count="32"
          ></a-text>

          <a-entity id="hud-progresso" position="0 0.73 -2.28"></a-entity>
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
      const EFEITOS = '${efeitos}';
      const scene = document.querySelector('#scene');
      const camera = document.querySelector('#camera');
      const rig = document.querySelector('#rig');
      const cursor = document.querySelector('#cursor');
      const alvos = document.querySelector('#alvos');
      const vagalumes = document.querySelector('#vagalumes');
      const petalas = document.querySelector('#petalas');
      const particulas = document.querySelector('#particulas');

      const hudPergunta = document.querySelector('#hud-pergunta');
      const hudPainel = document.querySelector('#hud-painel');
      const hudBorda = document.querySelector('#hud-borda');
      const hudProgresso = document.querySelector('#hud-progresso');

      function protegerSky() {
        const sky = document.querySelector('#sky');
        if (!sky) return;

        const aplicar = function () {
          try {
            const mesh = sky.getObject3D('mesh');
            if (mesh) {
              mesh.frustumCulled = false;
              if (mesh.material) {
                mesh.material.depthWrite = false;
                mesh.material.needsUpdate = true;
              }
            }
          } catch (_) {}
        };

        aplicar();
        sky.addEventListener('object3dset', aplicar);
        scene.addEventListener('loaded', aplicar);
      }

      protegerSky();

      let sensorNativoAtivo = false;
      let fonteSensorAtiva = null;
      let autoCalibrado = false;
      let timerAutoCalibracao = null;
      let ultimaOrientacaoBruta = new THREE.Quaternion();
      let possuiOrientacaoBruta = false;
      const offsetYaw = new THREE.Quaternion();
      const eixoY = new THREE.Vector3(0, 1, 0);
      const eulerYaw = new THREE.Euler(0, 0, 0, 'YXZ');

      let gyroInicializado = false;
      const gyroOrientacaoBruta = new THREE.Quaternion();
      const gyroDeltaQuat = new THREE.Quaternion();
      const gyroEixo = new THREE.Vector3();
      let bloqueado = false;
      let errosNaQuestao = 0;
      let proximaOrdem = 1;
      let totalSequencia = 0;

      function enviarParaApp(dados) {
        try {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(dados));
          }
        } catch (erro) {}
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

        setTimeout(() => limparFilhos(particulas), 850);
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
            'property: position; dir: alternate; loop: true; dur: ' + duracao + '; easing: easeInOutSine; to: ' + x2 + ' ' + y2 + ' ' + z2
          );
          vaga.setAttribute(
            'animation__pisca',
            'property: material.opacity; dir: alternate; loop: true; dur: ' + Math.round(700 + Math.random() * 900) + '; from: 0.25; to: 0.95'
          );
          vagalumes.appendChild(vaga);
        }
      }

      function iniciarPetalas() {
        if (petalas.childElementCount > 0) return;

        const paleta = EFEITOS === 'parquinho' ? ['#FCD34D', '#93C5FD', '#F9A8D4', '#86EFAC'] : ['#F9A8D4'];

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
            'color: ' + paleta[i % paleta.length] + '; shader: flat; opacity: 0.55; transparent: true; side: double'
          );
          petala.setAttribute(
            'animation__cair',
            'property: position; loop: true; dur: ' + duracao + '; easing: linear; from: ' + x + ' ' + yInicio + ' ' + z + '; to: ' + (x + 0.45) + ' ' + yFim + ' ' + z
          );
          petala.setAttribute(
            'animation__girar',
            'property: rotation; loop: true; dur: ' + Math.round(2600 + Math.random() * 3000) + '; to: 360 360 180; easing: linear'
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
            'property: rotation; dir: alternate; loop: 4; dur: 70; from: 0 ' + card.getAttribute('rotation').y + ' -2; to: 0 ' + card.getAttribute('rotation').y + ' 2'
          );
        }
      }

      function destacarDica() {
        try {
          let alvo = null;
          if (totalSequencia > 0) {
            const pecas = alvos.querySelectorAll('[data-sequencia="true"]');
            pecas.forEach(function (c) {
              if (!c.__selecionado && Number(c.dataset.ordem) === proximaOrdem) {
                alvo = c;
              }
            });
          } else {
            alvo = alvos.querySelector('[data-correta="true"]');
          }

          if (alvo && !alvo.__selecionado) {
            alvo.setAttribute(
              'material',
              'color: #FEF08A; shader: flat; opacity: 0.98; transparent: true; side: double'
            );
          }
        } catch (e) {}
      }

      function criarOpcaoEscolha(opcao) {
        const card = criarCardBase(opcao.angulo);

        if (opcao.correta && !opcao.acao) {
          card.dataset.correta = 'true';
        }

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
            setTimeout(() => { bloqueado = false; }, 350);
            return;
          }

          if (opcao.correta) {
            bloqueado = true;
            marcarCard(card, true);
            explosaoDeParticulas();
            enviarParaApp({ tipo: 'clique', acao: 'responder', correta: true });
            setTimeout(() => { bloqueado = false; }, 900);
          } else {
            marcarCard(card, false);
            enviarParaApp({ tipo: 'clique', acao: 'responder', correta: false });
            errosNaQuestao += 1;
            if (errosNaQuestao >= 2) destacarDica();
            setTimeout(() => {
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
              setTimeout(() => { bloqueado = false; }, 900);
            }
          } else {
            marcarCard(card, false);
            enviarParaApp({ tipo: 'clique', acao: 'responder', correta: false });
            errosNaQuestao += 1;
            setTimeout(() => {
              resetarSequenciaVisual();
              if (errosNaQuestao >= 2) destacarDica();
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
          'property: position; dir: alternate; loop: true; dur: 1700; easing: easeInOutSine; to: ' + p.x + ' ' + (p.y + 0.10) + ' ' + p.z
        );

        aplicarHover(portal);

        const hitboxPortal = document.createElement('a-plane');
        hitboxPortal.classList.add('alvo');
        hitboxPortal.setAttribute('width', '2.55');
        hitboxPortal.setAttribute('height', '3.05');
        hitboxPortal.setAttribute('position', '0 0 0.08');
        hitboxPortal.setAttribute(
          'material',
          'color: #FFFFFF; opacity: 0.001; transparent: true; shader: flat; side: double'
        );
        portal.appendChild(hitboxPortal);

        function ativarPortal() {
          if (bloqueado) return;
          bloqueado = true;
          portal.setAttribute(
            'animation__entrar',
            'property: scale; to: 1.12 1.12 1.12; dur: 180; dir: alternate; loop: 1; easing: easeOutQuad'
          );
          enviarParaApp({ tipo: 'clique', acao: 'avancar' });
          setTimeout(() => { bloqueado = false; }, 1200);
        }

        hitboxPortal.addEventListener('click', ativarPortal);
        portal.addEventListener('click', ativarPortal);
        alvos.appendChild(portal);
      }

      function renderizarConteudo(payload) {
        limparFilhos(alvos);
        bloqueado = false;
        proximaOrdem = 1;
        totalSequencia = 0;
        errosNaQuestao = 0;

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
            'shader: flat; color: ' + (feito ? '#FCD34D' : corrente ? '#FFFFFF' : '#8B86A9') + '; opacity: 0.95; transparent: true'
          );
          hudProgresso.appendChild(ponto);
        }
      }

      function atualizarHud(dados) {
        if (!dados) return;

        hudPergunta.setAttribute('value', String(dados.pergunta || ''));
        atualizarProgresso(dados.concluidas, dados.total, dados.indice);

        hudPainel.setAttribute(
          'material',
          'color: #FFF7ED; shader: flat; opacity: 0.88; transparent: true'
        );

        if (dados.feedback === 'correto') {
          hudBorda.setAttribute('material', 'color: #86EFAC; shader: flat; opacity: 0.82; transparent: true');
        } else if (dados.feedback === 'errado') {
          hudBorda.setAttribute('material', 'color: #FDA4AF; shader: flat; opacity: 0.82; transparent: true');
        } else {
          hudBorda.setAttribute('material', 'color: #E9C46A; shader: flat; opacity: 0.72; transparent: true');
        }
      }

      function centralizarVisao() {
        if (!camera || !possuiOrientacaoBruta) return;

        eulerYaw.setFromQuaternion(ultimaOrientacaoBruta, 'YXZ');
        const yawAtual = eulerYaw.y;
        offsetYaw.setFromAxisAngle(eixoY, -yawAtual);

        const qFinal = offsetYaw.clone().multiply(ultimaOrientacaoBruta);
        camera.object3D.quaternion.copy(qFinal);
        camera.object3D.updateMatrixWorld(true);
      }

      function agendarCalibracaoAutomatica() {
        if (autoCalibrado || timerAutoCalibracao) return;

        timerAutoCalibracao = setTimeout(() => {
          timerAutoCalibracao = null;
          centralizarVisao();
          autoCalibrado = true;
        }, 900);
      }

      const zee = new THREE.Vector3(0, 0, 1);
      const euler = new THREE.Euler();
      const q0 = new THREE.Quaternion();
      const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

      function assumirControleNativo(nomeFonte) {
        if (!sensorNativoAtivo) {
          sensorNativoAtivo = true;
          fonteSensorAtiva = nomeFonte;

          camera.setAttribute(
            'look-controls',
            'enabled: false; reverseMouseDrag: false; magicWindowTrackingEnabled: false; touchEnabled: false; mouseEnabled: false'
          );

          agendarCalibracaoAutomatica();
          return;
        }
        fonteSensorAtiva = nomeFonte;
      }

      function aplicarOrientacaoNativa(rotacao, orientacaoTela) {
        if (!rotacao || !camera) return;
        assumirControleNativo('DeviceMotion');

        const alpha = Number(rotacao.alpha || 0);
        const beta = Number(rotacao.beta || 0);
        const gamma = Number(rotacao.gamma || 0);
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

      function aplicarGiroscopioNativo(velocidade, deltaTempo) {
        if (!velocidade || !camera) return;
        assumirControleNativo('Gyroscope fallback');

        if (!gyroInicializado) {
          gyroInicializado = true;
          gyroOrientacaoBruta.copy(camera.object3D.quaternion);
          ultimaOrientacaoBruta.copy(gyroOrientacaoBruta);
          possuiOrientacaoBruta = true;
          offsetYaw.identity();
        }

        const dt = Math.min(0.05, Math.max(0.001, Number(deltaTempo || 0.016)));
        const x = Number(velocidade.x || 0);
        const y = Number(velocidade.y || 0);

        const pitchDelta = -y * dt;
        const yawDelta = -x * dt;
        const limite = THREE.MathUtils.degToRad(8);
        const pitchSeguro = THREE.MathUtils.clamp(pitchDelta, -limite, limite);
        const yawSeguro = THREE.MathUtils.clamp(yawDelta, -limite, limite);
        const magnitude = Math.sqrt(pitchSeguro * pitchSeguro + yawSeguro * yawSeguro);

        if (magnitude > 0.000001) {
          gyroEixo.set(0, 1, 0);
          gyroDeltaQuat.setFromAxisAngle(gyroEixo, yawSeguro);
          gyroOrientacaoBruta.multiply(gyroDeltaQuat);

          gyroEixo.set(1, 0, 0);
          gyroDeltaQuat.setFromAxisAngle(gyroEixo, pitchSeguro);
          gyroOrientacaoBruta.multiply(gyroDeltaQuat);

          gyroOrientacaoBruta.normalize();
        }

        ultimaOrientacaoBruta.copy(gyroOrientacaoBruta);
        possuiOrientacaoBruta = true;

        const qFinal = offsetYaw.clone().multiply(gyroOrientacaoBruta);
        camera.object3D.quaternion.copy(qFinal);
        camera.object3D.updateMatrixWorld(true);
      }

      let btnLobby = null;
      let ultimoCliqueLobby = 0;

      function criarBotaoLobby() {
        if (btnLobby) return;

        // Posiciona permanentemente nas costas do usuario (180 graus)
        const p = posicaoPolar(180, 3.2, 1.5);
        const card = document.createElement('a-entity');

        card.classList.add('alvo');
        card.setAttribute('position', p.x + ' ' + p.y + ' ' + p.z);
        card.setAttribute('rotation', '0 ' + (p.rotY + 180) + ' 0');
        card.setAttribute('geometry', 'primitive: plane; width: 2.2; height: 1.2');
        card.setAttribute(
          'material',
          'color: #EF4444; shader: flat; opacity: 0.98; transparent: true; side: double'
        );

        const borda = document.createElement('a-plane');
        borda.setAttribute('width', '2.32');
        borda.setAttribute('height', '1.32');
        borda.setAttribute('position', '0 0 -0.018');
        borda.setAttribute('material', 'color: #7F1D1D; shader: flat; opacity: 0.95');
        card.appendChild(borda);

        criarTexto(card, 'VOLTAR AO LOBBY', 1.9, '0 0 0.04', '#FFFFFF');
        aplicarHover(card);

        const acionarVoltarLobby = function () {
          const agora = Date.now();
          if (agora - ultimoCliqueLobby < 1500) return;
          ultimoCliqueLobby = agora;

          card.setAttribute('material', 'color: #16A34A; shader: flat; opacity: 0.98; transparent: true; side: double');
          enviarParaApp({ tipo: 'clique', acao: 'voltar-lobby' });

          setTimeout(() => {
            card.setAttribute('material', 'color: #EF4444; shader: flat; opacity: 0.98; transparent: true; side: double');
          }, 1500);
        };

        card.addEventListener('click', acionarVoltarLobby);

        cursor.addEventListener('fuse-complete', function () {
          const raycaster = cursor.components && cursor.components.raycaster;
          const intersectados = raycaster && raycaster.intersectedEls;
          if (intersectados && intersectados.includes(card)) {
            acionarVoltarLobby();
          }
        });

        scene.appendChild(card);
        btnLobby = card;
      }

      let ultimoAcionamentoControle = 0;

      function ativarAlvoMirado(origem) {
        const agora = Date.now();
        if (agora - ultimoAcionamentoControle < 350) return;

        try {
          const raycaster = cursor.components && cursor.components.raycaster;
          const intersectados = raycaster && raycaster.intersectedEls;

          if (!intersectados || intersectados.length === 0) return;

          const alvo = intersectados.find(function (el) {
            return el && el.classList && el.classList.contains('alvo');
          });

          if (!alvo) return;

          ultimoAcionamentoControle = agora;
          alvo.emit('click', { origem: origem || 'controle' }, false);
        } catch (e) {}
      }

      document.addEventListener('keydown', (evento) => {
        const codigos = [13, 23, 32, 66, 96];
        const teclas = ['Enter', ' ', 'Spacebar', 'MediaPlayPause'];
        if (codigos.includes(evento.keyCode) || teclas.includes(evento.key)) {
          evento.preventDefault && evento.preventDefault();
          ativarAlvoMirado('controle-bluetooth');
        }
      }, true);

      document.addEventListener('click', (evento) => {
        const alvoDireto = evento.target && evento.target.closest ? evento.target.closest('.alvo') : null;
        if (alvoDireto) return;
        ativarAlvoMirado('controle-toque');
      }, true);

      function receberMensagem(event) {
        try {
          const dados = JSON.parse(event.data);
          if (dados.tipo === 'conteudo') { renderizarConteudo(dados); return; }
          if (dados.tipo === 'hud') { atualizarHud(dados); return; }
          if (dados.tipo === 'centralizar') { centralizarVisao(); return; }
          if (dados.tipo === 'sensor-nativo') { aplicarOrientacaoNativa(dados.rotacao, dados.orientacao); return; }
          if (dados.tipo === 'sensor-giroscopio') { aplicarGiroscopioNativo(dados.velocidade, dados.deltaTempo); return; }
        } catch (erro) {}
      }

      document.addEventListener('message', receberMensagem);
      window.addEventListener('message', receberMensagem);

      scene.addEventListener('loaded', function () {
        criarBotaoLobby();
        if (EFEITOS === 'floresta') iniciarVagalumes();
        iniciarPetalas();
        enviarParaApp({ tipo: 'pronto' });
      });
    })();
  </script>
</body>
</html>
`;
}

export default function ModoVRScreen({ navigation }) {
  const [etapa, setEtapa] = useState('mundo');
  const [mundoId, setMundoId] = useState(null);
  const [modoSelecionado, setModoSelecionado] = useState(null);
  const [trilhaAtual, setTrilhaAtual] = useState(TRILHA_DISLEXIA);

  const [contador, setContador] = useState(3);
  const [indice, setIndice] = useState(0);
  const [pontos, setPontos] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [cenaPronta, setCenaPronta] = useState(false);

  const [imagemUri, setImagemUri] = useState('');
  const [portalUri, setPortalUri] = useState('');
  const [usarFallbackSensor] = useState(true);

  const webviewRef = useRef(null);
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const timerFeedbackRef = useRef(null);

  const mundo = MUNDOS[mundoId] || MUNDOS[MUNDO_PADRAO];

  const mostrarFeedback = (tipo) => {
    if (timerFeedbackRef.current) clearTimeout(timerFeedbackRef.current);
    setFeedback(tipo);
    timerFeedbackRef.current = setTimeout(() => {
      setFeedback(null);
      timerFeedbackRef.current = null;
    }, 900);
  };

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    precarregarFalas(FALAS_VR_PRELOAD).catch(() => {});
  }, []);

  const assetsProntos = !!imagemUri && !!portalUri;

  const htmlCena = useMemo(
    () =>
      assetsProntos
        ? montarHtmlCena({
            imagemUri,
            portalUri,
            efeitos: mundo.efeitos,
            rotacaoCeuY: mundo.rotacaoCeuY,
            larguraTelaMm: (() => {
              const { width, height } = Dimensions.get('screen');
              return Math.round((Math.max(width, height) / 160) * 25.4);
            })(),
          })
        : '',
    [assetsProntos, imagemUri, portalUri, mundo]
  );

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    let ativo = true;
    carregarAssetComoDataUri(ARQUIVO_PORTAL, 'image/png')
      .then((uri) => { if (ativo) setPortalUri(uri); })
      .catch(() => {});
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !mundoId || !MUNDOS[mundoId]) return undefined;
    let ativo = true;
    setImagemUri('');
    carregarAssetComoDataUri(MUNDOS[mundoId].imagem, 'image/jpeg')
      .then((uri) => { if (ativo) setImagemUri(uri); })
      .catch(() => {});
    return () => { ativo = false; };
  }, [mundoId]);

  const escolherMundo = (id) => {
    if (!MUNDOS[id]) return;
    setMundoId(id);
    setEtapa('preparo');
  };

  const iniciarExperiencia = async () => {
    pararFala();
    precarregarFalas(FALAS_VR_PRELOAD).catch(() => {});
    StatusBar.setHidden(true, 'fade');
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
    } catch (error) {}
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
      definirContextoAudio('vr-menu');
      falarSeguro(mundo.boasVindasTexto, mundo.boasVindasChave);
    }
  }, [contador, etapa, mundo]);

  useEffect(() => {
    return () => {
      if (timerFeedbackRef.current) clearTimeout(timerFeedbackRef.current);
      if (Platform.OS === 'web') return;
      pararFala();
      StatusBar.setHidden(false, 'fade');
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  const sensoresAtivos = cenaPronta && etapa !== 'mundo' && etapa !== 'preparo' && etapa !== 'contagem';

  useEffect(() => {
    if (!usarFallbackSensor || !sensoresAtivos) return undefined;
    let cancelado = false;
    let assinaturaDeviceMotion = null;
    let assinaturaGyroscope = null;
    let watchdogDeviceMotion = null;
    let watchdogGyroscope = null;
    let recebeuDeviceMotion = false;
    let recebeuGyroscope = false;
    let ultimoTempoGyro = null;

    const removerDeviceMotion = () => {
      try { assinaturaDeviceMotion?.remove?.(); } catch (_) {}
      assinaturaDeviceMotion = null;
      if (watchdogDeviceMotion) { clearTimeout(watchdogDeviceMotion); watchdogDeviceMotion = null; }
    };

    const removerGyroscope = () => {
      try { assinaturaGyroscope?.remove?.(); } catch (_) {}
      assinaturaGyroscope = null;
      if (watchdogGyroscope) { clearTimeout(watchdogGyroscope); watchdogGyroscope = null; }
    };

    const iniciarGyroscope = async () => {
      if (cancelado) return;
      removerDeviceMotion();
      try {
        Gyroscope.setUpdateInterval(16);
        ultimoTempoGyro = null;
        assinaturaGyroscope = Gyroscope.addListener((medida) => {
          if (cancelado || !webviewRef.current || !medida) return;
          recebeuGyroscope = true;
          if (watchdogGyroscope) { clearTimeout(watchdogGyroscope); watchdogGyroscope = null; }
          const agora = Date.now();
          if (ultimoTempoGyro == null) { ultimoTempoGyro = agora; return; }
          const deltaTempo = Math.min(0.05, Math.max(0.001, (agora - ultimoTempoGyro) / 1000));
          ultimoTempoGyro = agora;
          webviewRef.current.postMessage(JSON.stringify({
            tipo: 'sensor-giroscopio',
            velocidade: { x: Number(medida.x || 0), y: Number(medida.y || 0), z: Number(medida.z || 0) },
            deltaTempo,
          }));
        });
        watchdogGyroscope = setTimeout(() => {
          if (cancelado || recebeuGyroscope) return;
          removerGyroscope();
        }, 1500);
      } catch (error) { removerGyroscope(); }
    };

    const iniciarDeviceMotion = async () => {
      try {
        if (cancelado) return;
        if (Platform.OS === 'ios') {
          try {
            const perm = await DeviceMotion.getPermissionsAsync();
            let permissao = perm;
            if (!perm.granted && perm.canAskAgain) permissao = await DeviceMotion.requestPermissionsAsync();
            if (!permissao.granted || cancelado) { await iniciarGyroscope(); return; }
          } catch (e) {}
        }
        if (cancelado) return;
        DeviceMotion.setUpdateInterval(16);
        assinaturaDeviceMotion = DeviceMotion.addListener((medida) => {
          if (cancelado || !medida?.rotation || !webviewRef.current) return;
          recebeuDeviceMotion = true;
          if (watchdogDeviceMotion) { clearTimeout(watchdogDeviceMotion); watchdogDeviceMotion = null; }
          webviewRef.current.postMessage(JSON.stringify({
            tipo: 'sensor-nativo',
            rotacao: medida.rotation,
            orientacao: -90,
          }));
        });
        watchdogDeviceMotion = setTimeout(() => {
          if (cancelado || recebeuDeviceMotion) return;
          iniciarGyroscope();
        }, 1200);
      } catch (error) { if (!cancelado) iniciarGyroscope(); }
    };

    iniciarDeviceMotion();

    return () => {
      cancelado = true;
      removerDeviceMotion();
      removerGyroscope();
    };
  }, [usarFallbackSensor, sensoresAtivos]);

  const escolherModo = (modo) => {
    const trilha = modo === 'dislexia' ? TRILHA_DISLEXIA : TRILHA_DISCALCULIA;
    setModoSelecionado(modo);
    setTrilhaAtual(trilha);
    setIndice(0);
    setPontos(0);
    setFeedback(null);
    setEtapa('jogo');

    definirContextoAudio(`vr-${modo}-0`);
    falar(
      modo === 'dislexia' ? 'Modo Dislexia! Vamos jogar com as palavras!' : 'Modo Discalculia! Vamos jogar com os numeros!',
      modo === 'dislexia' ? 'modo_dislexia' : 'modo_discalculia'
    );
    falar(trilha[0].pergunta, chaveAudio(trilha, modo, 0));
  };

  const responderCerto = () => {
    addScore('vr', 'acerto');
    mostrarFeedback('correto');
    setPontos((valor) => valor + 10);

    const ultimaPergunta = indice >= trilhaAtual.length - 1;
    const terminouBloco = !ultimaPergunta && (indice + 1) % PERGUNTAS_POR_PORTAL === 0;

    if (ultimaPergunta) {
      setEtapa('final');
      definirContextoAudio(`vr-${modoSelecionado}-final`);
      falar('Muito bem!', 'muitobem');
      falar('Parabens! Completou a trilha!', 'trilha_final');
      return;
    }

    if (terminouBloco) {
      setEtapa('portal');
      definirContextoAudio(`vr-${modoSelecionado}-portal-${indice}`);
      falar('Muito bem! Procure o portal para continuar!', 'feedback_certo');
      return;
    }

    const prox = indice + 1;
    setIndice(prox);
    setEtapa('jogo');
    definirContextoAudio(`vr-${modoSelecionado}-${prox}`);
    falar('Muito bem!', 'muitobem');
    falar(trilhaAtual[prox].pergunta, chaveAudio(trilhaAtual, modoSelecionado, prox));
  };

  const responderErrado = () => {
    addScore('vr', 'erro');
    mostrarFeedback('errado');
    limparFilaDoContextoAtual({ interromperAtual: true });
    falar('Tente novamente!', 'feedback_errado', { substituirFilaDoContexto: true, interromperAtual: true });
  };

  const dispararFlashTeleporte = () => {
    flashOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.5, duration: 250, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  };

  const avancarProximaEstacao = () => {
    const prox = indice + 1;
    dispararFlashTeleporte();

    if (prox >= trilhaAtual.length) {
      setEtapa('final');
      definirContextoAudio(`vr-${modoSelecionado}-final`);
      falar('Parabens! Completou a trilha!', 'trilha_final');
      return;
    }

    setIndice(prox);
    setEtapa('jogo');
    definirContextoAudio(`vr-${modoSelecionado}-${prox}`);
    falar(trilhaAtual[prox].pergunta, chaveAudio(trilhaAtual, modoSelecionado, prox));
  };

  const aoReceberMensagemWebView = (event) => {
    try {
      const dados = JSON.parse(event.nativeEvent.data);
      if (dados.tipo === 'pronto') { setCenaPronta(true); return; }
      if (dados.tipo === 'clique') {
        if (dados.acao === 'dislexia' || dados.acao === 'discalculia') {
          escolherModo(dados.acao);
        } else if (dados.acao === 'voltar-lobby') {
          definirContextoAudio('vr-menu-retorno');
          setFeedback(null);
          setModoSelecionado(null);
          setIndice(0);
          setEtapa('menu_vr');
        } else if (dados.acao === 'responder') {
          dados.correta ? responderCerto() : responderErrado();
        } else if (dados.acao === 'avancar') {
          avancarProximaEstacao();
        }
      }
    } catch (error) {}
  };

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
          { texto: 'DISCALCULIA', angulo: a2, acao: 'discalculia' },
        ],
      };
    } else if (etapa === 'jogo') {
      const questao = trilhaAtual[indice];
      if (questao.tipo === 'escolha') {
        const opcoesEmbaralhadas = embaralhar(questao.opcoes);
        const angulos = sortearAngulosN(opcoesEmbaralhadas.length);
        payload = {
          tipo: 'conteudo',
          modo: 'escolha',
          opcoes: opcoesEmbaralhadas.map((opcao, i) => ({ ...opcao, angulo: angulos[i] })),
        };
      } else if (questao.tipo === 'sequencia') {
        const angulos = sortearAngulosN(questao.pecas.length);
        let indicesEmbaralhados = embaralhar(questao.pecas.map((_, i) => i));
        let tentativas = 0;
        while (indicesEmbaralhados.length > 1 && indicesEmbaralhados.every((valor, i) => valor === i) && tentativas < 10) {
          indicesEmbaralhados = embaralhar(indicesEmbaralhados);
          tentativas += 1;
        }
        payload = {
          tipo: 'conteudo',
          modo: 'sequencia',
          pecas: indicesEmbaralhados.map((idxOriginal, posVisual) => ({
            texto: questao.pecas[idxOriginal],
            ordem: idxOriginal + 1,
            angulo: angulos[posVisual],
          })),
        };
      }
    } else if (etapa === 'portal') {
      payload = { tipo: 'conteudo', modo: 'portal', angulo: 0 };
    } else if (etapa === 'final') {
      // Nota: Não injetamos mais cartas no centro na etapa final para não conflitar com o botão de trás
      payload = { tipo: 'conteudo', modo: 'vazio' };
    }

    if (payload) {
      webviewRef.current.postMessage(JSON.stringify(payload));
    }
  }, [cenaPronta, etapa, indice, trilhaAtual]);

  const questaoAtual = etapa === 'jogo' ? trilhaAtual[indice] : null;
  const perguntaAtual = etapa === 'jogo' ? questaoAtual?.pergunta || '' : etapa === 'menu_vr' ? 'Escolha um caminho na sua frente!' : etapa === 'portal' ? 'Muito bem! Encontre o portal para continuar!' : `Parabens! Voce fez ${pontos} pontos! Olhe para tras para voltar.`;

  useEffect(() => {
    if (!cenaPronta || !webviewRef.current) return;
    const concluidas = etapa === 'final' ? trilhaAtual.length : etapa === 'portal' ? Math.min(indice + 1, trilhaAtual.length) : indice;
    webviewRef.current.postMessage(JSON.stringify({
      tipo: 'hud',
      pergunta: perguntaAtual,
      pontos,
      indice,
      concluidas,
      total: etapa === 'menu_vr' ? 0 : trilhaAtual.length,
      feedback,
    }));
  }, [cenaPronta, etapa, indice, pontos, feedback, trilhaAtual, perguntaAtual]);

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Image source={ARQUIVO_LUMI} style={{ width: 150, height: 150 }} resizeMode="contain" />
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1E293B', textAlign: 'center', marginVertical: 16 }}>Modo VR</Text>
        <Text style={{ fontSize: 16, color: '#475569', textAlign: 'center', marginBottom: 24 }}>A experiência VR está disponível na versão para celular.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ backgroundColor: '#8B5CF6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Voltar ao Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (etapa === 'mundo') {
    return (
      <View style={styles.containerPreparo}>
        <Image source={ARQUIVO_LUMI} style={styles.imgLumiMundo} resizeMode="contain" />
        <Text style={styles.titulo}>Escolha seu mundo!</Text>
        <Text style={styles.subtitulo}>Para onde a Lumi vai te levar hoje?</Text>
        <View style={styles.linhaMundos}>
          {Object.values(MUNDOS).map((m) => (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.85}
              onPress={() => escolherMundo(m.id)}
              style={[styles.cardMundo, { backgroundColor: m.corCard, borderColor: m.corBorda }]}
            >
              <Text style={styles.emojiMundo}>{m.emoji}</Text>
              <Text style={[styles.nomeMundo, { color: m.corTexto }]}>{m.nome}</Text>
              <Text style={[styles.descMundo, { color: m.corTexto }]}>{m.descricao}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.txtVoltar}>Voltar ao Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (etapa === 'preparo') {
    return (
      <View style={styles.containerPreparo}>
        <Image source={ARQUIVO_LUMI} style={styles.imgLumiPreparo} resizeMode="contain" />
        <Text style={styles.titulo}>Mundo Virtual da Lumi</Text>
        <Text style={styles.txtMundoEscolhido}>{`${mundo.emoji}  ${mundo.nome}`}</Text>
        <Text style={styles.subtitulo}>Encaixe seu celular nos óculos VR e prepare o controle Bluetooth para iniciar!</Text>
        <TouchableOpacity style={styles.btnComecar} onPress={iniciarExperiencia}>
          <Text style={styles.txtComecar}>ENTRAR NO MUNDO VR!</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEtapa('mundo')}>
          <Text style={styles.txtVoltar}>Trocar de mundo</Text>
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

  return (
    <View style={styles.containerVR}>
      {assetsProntos && (
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: htmlCena }}
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
          onError={(event) => { console.log('[VR] Erro da WebView:', event.nativeEvent); }}
          onHttpError={(event) => { console.log('[VR] Erro HTTP da WebView:', event.nativeEvent); }}
        />
      )}

      {!assetsProntos && (
        <View style={styles.carregando}>
          <Text style={styles.txtCarregando}>{`Carregando ${mundo.nome}...`}</Text>
        </View>
      )}

      <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flashOpacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  containerPreparo: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3E8FF', padding: 20 },
  imgLumiPreparo: { width: 180, height: 180, marginBottom: 10 },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#3f01a3', textAlign: 'center' },
  subtitulo: { fontSize: 15, color: '#6D28D9', textAlign: 'center', marginVertical: 15, paddingHorizontal: 20 },
  btnComecar: { backgroundColor: '#7C3AED', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 25, elevation: 4 },
  txtComecar: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  txtVoltar: { color: '#6D28D9', marginTop: 15, textDecorationLine: 'underline' },
  imgLumiMundo: { width: 130, height: 130, marginBottom: 6 },
  linhaMundos: { flexDirection: 'row', justifyContent: 'center', alignItems: 'stretch', width: '100%', marginVertical: 12 },
  cardMundo: { flex: 1, maxWidth: 190, minHeight: 170, marginHorizontal: 8, paddingVertical: 18, paddingHorizontal: 10, borderRadius: 22, borderWidth: 3, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  emojiMundo: { fontSize: 54, marginBottom: 8 },
  nomeMundo: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  descMundo: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  txtMundoEscolhido: { fontSize: 18, fontWeight: 'bold', color: '#7C3AED', textAlign: 'center', marginTop: 8 },
  containerContagem: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  txtContagem: { fontSize: 90, fontWeight: '900', color: '#A78BFA' },
  txtAviso: { color: '#DDD6FE', fontSize: 16, marginTop: 10 },
  containerVR: { flex: 1, backgroundColor: '#000000' },
  webview: { flex: 1, backgroundColor: '#000000' },
  carregando: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  txtCarregando: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 30 },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#DDD6FE' },
});