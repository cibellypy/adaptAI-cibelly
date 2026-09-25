import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { FALAS } from './Falas';

export let somAtivado = true;

export const setSomAtivadoGlobal = (valor) => {
  somAtivado = valor;
  if (!valor) {
    pararFala(); // desliga tudo e limpa qualquer fala esperando na fila
  }
};

// ============================================================
// CONFIGURAÇÃO DA ELEVENLABS (usada só quando NÃO existe áudio
// pré-gravado para aquela fala — ver FALAS em Falas.js)
// ============================================================
const ELEVENLABS_API_KEY = 'COLOQUE_SUA_CHAVE_AQUI';
const ELEVENLABS_VOICE_ID = 'COLOQUE_O_VOICE_ID_AQUI';

let audioPlayerAtual = null;
let modoAudioConfigurado = false;

// ------------------------------------------------------------
// FILA DE FALAS
// Em vez de cortar uma fala pra tocar a próxima na hora (o que cortava
// frases longas no meio), toda fala nova entra numa fila. A fala atual
// sempre termina de tocar primeiro, e só DEPOIS a próxima da fila começa.
// Isso evita tanto sobreposição (duas tocando ao mesmo tempo) quanto
// corte no meio de frases importantes.
// ------------------------------------------------------------
let filaFala = [];
let processandoFila = false;
let liberarEsperaAtual = null; // libera na hora uma espera de áudio pendente, se houver

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

// Espera um player terminar de tocar (evento nativo "didJustFinish").
// Tem um limite de segurança: alguns aparelhos Android têm um bug conhecido
// da biblioteca onde esse evento às vezes não dispara — sem esse limite,
// a fila inteira travaria pra sempre esperando um sinal que nunca chega.
function esperarAudioTerminar(player, tempoMaximoMs = 5000) {
  return new Promise((resolve) => {
    let resolvido = false;
    const finalizar = () => {
      if (resolvido) return;
      resolvido = true;
      assinatura?.remove();
      clearTimeout(timer);
      if (liberarEsperaAtual === finalizar) liberarEsperaAtual = null;
      resolve();
    };
    liberarEsperaAtual = finalizar;
    const assinatura = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) finalizar();
    });
    const timer = setTimeout(finalizar, tempoMaximoMs);
  });
}

// Confere, pouco depois de mandar tocar, se o áudio realmente começou a
// tocar de verdade. Existe um bug conhecido do expo-audio onde, depois de
// tocar muitos áudios numa mesma sessão, o player "trava" silenciosamente
// (não emite som e nunca dispara o evento de "terminei"). Se detectarmos
// isso, desistimos na hora em vez de esperar o tempo máximo inteiro.
function checarSePlayerComecouATocar(player) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(!!player.playing);
    }, 400);
  });
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
    const esperaTerminar = esperarAudioTerminar(audioPlayerAtual);
    audioPlayerAtual.play();
    console.log('[SOM] tocando áudio local:', chave);

    const comecouATocar = await checarSePlayerComecouATocar(audioPlayerAtual);
    if (!comecouATocar) {
      console.warn(`[SOM] áudio local "${chave}" não começou a tocar de verdade — caindo pro próximo plano.`);
      liberarEsperaAtual = null;
      return false;
    }

    await esperaTerminar;
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
    const esperaTerminar = esperarAudioTerminar(audioPlayerAtual);
    audioPlayerAtual.play();

    const comecouATocar = await checarSePlayerComecouATocar(audioPlayerAtual);
    if (!comecouATocar) {
      console.warn('[SOM] áudio da ElevenLabs não começou a tocar de verdade — caindo pra voz nativa.');
      liberarEsperaAtual = null;
      return false;
    }

    await esperaTerminar;

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
  return new Promise((resolve) => {
    Speech.speak(texto, {
      language: 'pt-BR',
      pitch: 1.2,
      rate: 0.9,
      onDone: resolve,
      onStopped: resolve,
      onError: resolve,
    });
  });
}

// Toca UMA fala até o fim (local -> ElevenLabs -> nativa), sem se preocupar
// com fila — isso é responsabilidade de processarFila().
async function falarAgora(texto, chave) {
  if (chave) {
    const tocouLocal = await falarComAudioLocal(chave);
    if (tocouLocal) return;
  }

  const conseguiuComElevenLabs = await falarComElevenLabs(texto);
  if (!conseguiuComElevenLabs) {
    await falarComVozNativa(texto);
  }
}

// Vai esvaziando a fila, uma fala de cada vez, sempre esperando a atual
// terminar antes de começar a próxima.
async function processarFila() {
  if (processandoFila) return; // já tem alguém cuidando da fila
  processandoFila = true;

  while (filaFala.length > 0) {
    if (!somAtivado) {
      filaFala = [];
      break;
    }
    const proxima = filaFala.shift();
    console.log('[SOM] tocando da fila — texto:', proxima.texto, '| chave:', proxima.chave, '| restantes na fila:', filaFala.length);
    await falarAgora(proxima.texto, proxima.chave);
    proxima.resolverQuandoTerminar?.();
  }

  processandoFila = false;
}

// ------------------------------------------------------------
// FUNÇÃO PRINCIPAL — use esta em todas as telas.
//
// falar(texto, chave)
//   texto → o que seria dito (usado só se cair no plano B ou C)
//   chave → (opcional) nome do arquivo em assets/audios, SEM ".mp3"
//           Ex: falar('Correto!', 'correto')
//
// Não interrompe mais a fala anterior — em vez disso, entra na fila e
// espera a vez dela. Ordem de tentativa de cada fala: áudio local (chave)
// → ElevenLabs ao vivo → voz nativa.
// ------------------------------------------------------------
export const falar = (texto, chave = null) => {
  console.log('[SOM] falar() enfileirado — texto:', texto, '| chave:', chave, '| somAtivado:', somAtivado);

  if (!somAtivado) {
    console.log('[SOM] somAtivado é false, saindo sem enfileirar nada.');
    return Promise.resolve();
  }

  return new Promise((resolverQuandoTerminar) => {
    filaFala.push({ texto, chave, resolverQuandoTerminar });
    processarFila();
  });
};

// Lista de elogios que já temos gravados — a cada acerto, sorteia um
// diferente, pra não ficar sempre repetindo a mesma palavra na mesma
// atividade.
const POOL_ELOGIOS = ['correto', 'muitobem', 'issomesmo', 'acertou', 'wohooparabens', 'fezcertinho'];

// Fala um elogio aleatório (pode ser usado em qualquer atividade — Dislexia,
// Discalculia, etc.) em vez de sempre a mesma frase fixa.
export const falarElogio = () => {
  falarAleatorio('Muito bem!', POOL_ELOGIOS);
};

// Sorteia uma chave entre as passadas e fala ela. Usado tanto pro elogio
// genérico quanto pros erros, onde cada tela pode misturar sua dica
// específica (ex: "tenta outro espaço") com uma fala genérica de incentivo
// (ex: "hum, tenta mais uma vez") — assim varia sem perder a dica útil.
export const falarAleatorio = (textoFallback, chaves) => {
  const chave = chaves[Math.floor(Math.random() * chaves.length)];
  falar(textoFallback, chave);
};

// Para TUDO — a fala que está tocando agora e qualquer coisa esperando na
// fila. Use isso para casos de "parar de verdade": o botão de mudo, ou ao
// sair de uma tela (senão uma fala que ainda estava na fila pode tocar
// bem depois, já em outra tela).
export const pararFala = () => {
  filaFala = [];
  Speech.stop();
  if (audioPlayerAtual) {
    audioPlayerAtual.pause();
  }
  liberarEsperaAtual?.(); // libera na hora, em vez de esperar até 10s pelo sinal de "terminou"
};