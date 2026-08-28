import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { FALAS } from './Falas';

export let somAtivado = true;

export const setSomAtivadoGlobal = (valor) => {
  somAtivado = valor;
};

// ============================================================
// CONFIGURAÇÃO DA ELEVENLABS (usada só quando NÃO existe áudio
// pré-gravado para aquela fala — ver FALAS em Falas.js)
// ============================================================
// ATENÇÃO (ponto para discutir na monografia como limitação conhecida):
// deixar a chave de API aqui no código do app é aceitável para fins de
// demonstração de TCC, mas não é seguro para um app publicado de verdade
// — qualquer pessoa pode extrair essa chave do instalável. O ideal em
// produção seria um pequeno backend fazendo essa chamada por você.
const ELEVENLABS_API_KEY = 'COLOQUE_SUA_CHAVE_AQUI';
const ELEVENLABS_VOICE_ID = 'COLOQUE_O_VOICE_ID_AQUI';

let audioPlayerAtual = null;
let modoAudioConfigurado = false;

// Garante que o áudio toque mesmo com o celular no modo silencioso (iOS)
async function garantirModoAudio() {
  if (!modoAudioConfigurado) {
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
    } catch (erro) {
      console.warn('Não foi possível configurar o modo de áudio:', erro.message);
    }
    modoAudioConfigurado = true;
  }
}

// ------------------------------------------------------------
// 1) ÁUDIO LOCAL PRÉ-GRAVADO (prioridade máxima — instantâneo,
//    sem internet, sem custo)
// ------------------------------------------------------------
async function falarComAudioLocal(chave) {
  const arquivoAudio = FALAS[chave];
  console.log('[SOM] procurando "', chave, '" no Falas.js — encontrado?', !!arquivoAudio);
  if (!arquivoAudio) return false; // essa chave ainda não foi gravada/mapeada

  try {
    await garantirModoAudio();
    if (audioPlayerAtual) {
      audioPlayerAtual.remove();
    }
    audioPlayerAtual = createAudioPlayer(arquivoAudio);
    audioPlayerAtual.volume = 1.0;
    audioPlayerAtual.play();
    console.log('[SOM] tocando áudio local com sucesso:', chave);
    return true;
  } catch (erro) {
    console.warn(`[SOM] Falha ao tocar áudio local "${chave}":`, erro.message);
    return false;
  }
}

// ------------------------------------------------------------
// 2) ELEVENLABS AO VIVO (usada como plano B, quando não existe
//    áudio local pra aquela fala)
// ------------------------------------------------------------
function blobParaBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = reader.result; // "data:audio/mpeg;base64,XXXXX"
      resolve(resultado.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function falarComElevenLabs(texto) {
  if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === 'COLOQUE_SUA_CHAVE_AQUI') {
    return false; // chave ainda não configurada — nem tenta, evita erro de rede à toa
  }

  try {
    const resposta = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: texto,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.8 },
        }),
      }
    );

    if (!resposta.ok) {
      throw new Error(`ElevenLabs respondeu com status ${resposta.status}`);
    }

    const blob = await resposta.blob();
    const base64 = await blobParaBase64(blob);

    const nomeArquivo = `lumi_fala_${Date.now()}.mp3`;
    const arquivo = new File(Paths.cache, nomeArquivo);
    await arquivo.write(base64, { encoding: 'base64' });

    await garantirModoAudio();

    if (audioPlayerAtual) {
      audioPlayerAtual.remove();
    }
    audioPlayerAtual = createAudioPlayer({ uri: arquivo.uri });
    audioPlayerAtual.volume = 1.0;
    audioPlayerAtual.play();

    return true;
  } catch (erro) {
    console.warn('Falha ao usar a voz da ElevenLabs, usando voz nativa:', erro.message);
    return false;
  }
}

// ------------------------------------------------------------
// 3) VOZ NATIVA DO DISPOSITIVO (último recurso, sempre funciona
//    mesmo sem internet)
// ------------------------------------------------------------
function falarComVozNativa(texto) {
  Speech.speak(texto, {
    language: 'pt-BR',
    pitch: 1.2,
    rate: 0.9,
  });
}

// ------------------------------------------------------------
// FUNÇÃO PRINCIPAL — use esta em todas as telas.
//
// falar(texto, chave)
//   texto → o que seria dito (usado só se cair no plano B ou C)
//   chave → (opcional) nome do arquivo em assets/audios, SEM ".mp3"
//           Ex: falar('Correto!', 'correto')
//
// Ordem de tentativa: áudio local (chave) → ElevenLabs ao vivo → voz nativa
// ------------------------------------------------------------
export const falar = async (texto, chave = null) => {
  console.log('[SOM] falar() chamado — texto:', texto, '| chave:', chave, '| somAtivado:', somAtivado);

  if (!somAtivado) {
    console.log('[SOM] somAtivado é false, saindo sem tocar nada.');
    return;
  }

  if (chave) {
    const tocouLocal = await falarComAudioLocal(chave);
    console.log('[SOM] resultado do áudio local para chave', chave, ':', tocouLocal);
    if (tocouLocal) return;
  }

  const conseguiuComElevenLabs = await falarComElevenLabs(texto);
  console.log('[SOM] resultado da ElevenLabs ao vivo:', conseguiuComElevenLabs);
  if (!conseguiuComElevenLabs) {
    console.log('[SOM] caindo para voz nativa.');
    falarComVozNativa(texto);
  }
};

// Para qualquer fala em andamento (local, ElevenLabs ou nativa).
// Use isso no lugar de "Speech.stop()" direto nas telas.
export const pararFala = () => {
  Speech.stop();
  if (audioPlayerAtual) {
    audioPlayerAtual.pause();
  }
};