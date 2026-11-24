import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { Asset } from 'expo-asset';
import { FALAS } from './Falas';

export let somAtivado = true;

export const setSomAtivadoGlobal = (valor) => {
  somAtivado = valor;

  if (!valor) {
    pararFala();
  }
};

// ============================================================
// ELEVENLABS AO VIVO
// Só entra quando não existe MP3 pré-gravado.
// ============================================================
const ELEVENLABS_API_KEY = 'COLOQUE_SUA_CHAVE_AQUI';
const ELEVENLABS_VOICE_ID = 'COLOQUE_O_VOICE_ID_AQUI';

let audioPlayerAtual = null;
let modoAudioConfigurado = false;

let filaFala = [];
let processandoFila = false;

// Função que cancela imediatamente a espera do áudio atual.
let cancelarEsperaAtual = null;

// Cada pararFala() invalida qualquer operação de áudio anterior.
let geracaoAudio = 0;

// ============================================================
// CONTEXTO DE ÁUDIO
//
// Cada tela/atividade pode ter um identificador, por exemplo:
//   vr-menu
//   vr-dislexia-0
//   vr-dislexia-1
//   vr-portal
//
// Quando o usuário muda de tela rapidamente, tudo que pertence ao
// contexto antigo é descartado. Assim nunca toca uma fala atrasada.
// Se ele ficar devagar, a fila normal daquele contexto toca inteira.
// ============================================================
let contextoAudioAtual = 'global';
let contextoEmExecucao = null;

// ============================================================
// PRELOAD / PRÉ-AQUECIMENTO
// ============================================================
const fontesPrecarregadas = new Map();
const playersPrecarregados = new Map();
const preparosEmAndamento = new Map();




async function obterFonteLocalPrecarregada(chave) {
  if (fontesPrecarregadas.has(chave)) {
    return fontesPrecarregadas.get(chave);
  }

  const modulo = FALAS[chave];
  if (!modulo) return null;

  try {
    const asset = Asset.fromModule(modulo);
    await asset.downloadAsync();

    const uri = asset.localUri || asset.uri;
    const fonte = uri ? { uri } : modulo;

    fontesPrecarregadas.set(chave, fonte);
    return fonte;
  } catch (erro) {
    console.warn(
      `[SOM] preload do asset "${chave}" falhou:`,
      erro?.message || erro
    );

    fontesPrecarregadas.set(chave, modulo);
    return modulo;
  }
}

async function prepararPlayerLocal(chave) {
  if (!FALAS[chave]) return null;

  if (playersPrecarregados.has(chave)) {
    return playersPrecarregados.get(chave);
  }

  if (preparosEmAndamento.has(chave)) {
    return preparosEmAndamento.get(chave);
  }

  const promessa = (async () => {
    try {
      await garantirModoAudio();

      const fonte =
        await obterFonteLocalPrecarregada(chave);

      if (!fonte) return null;

      const player = createAudioPlayer(
        fonte,
        { updateInterval: 50 }
      );

      player.volume = 1.0;

      try {
        player.pause();
      } catch (_) {}

      playersPrecarregados.set(
        chave,
        player
      );

      return player;
    } catch (erro) {
      console.warn(
        `[SOM] pré-aquecimento "${chave}" falhou:`,
        erro?.message || erro
      );

      return null;
    } finally {
      preparosEmAndamento.delete(chave);
    }
  })();

  preparosEmAndamento.set(
    chave,
    promessa
  );

  return promessa;
}

export const precarregarFalas = async (chaves = []) => {
  const unicas = [
    ...new Set(
      chaves.filter(
        (chave) => !!FALAS[chave]
      )
    ),
  ];

  await Promise.allSettled(
    unicas.map(
      (chave) => prepararPlayerLocal(chave)
    )
  );

  console.log(
    `[SOM] preload concluído: ${unicas.length} falas`
  );
};

function consumirPlayerPrecarregado(chave) {
  const player =
    playersPrecarregados.get(chave);

  if (player) {
    playersPrecarregados.delete(chave);
  }

  return player || null;
}

function reporPlayerPrecarregado(chave) {
  if (!FALAS[chave]) return;

  setTimeout(() => {
    prepararPlayerLocal(chave);
  }, 0);
}

function resolverItemDescartado(item) {
  try {
    item?.resolverQuandoTerminar?.();
  } catch (_) {}
}

function cancelarReproducaoAtual() {
  try {
    cancelarEsperaAtual?.();
  } catch (_) {}

  cancelarEsperaAtual = null;

  try {
    Speech.stop();
  } catch (_) {}

  if (audioPlayerAtual) {
    destruirPlayer(audioPlayerAtual);
  }
}

// Troca o contexto/tela atual.
//
// Se o usuário avançou antes dos áudios anteriores terminarem:
// - remove da fila as falas antigas;
// - interrompe somente a fala antiga que ficou obsoleta;
// - preserva as falas da tela nova.
//
// Se ele não avançou, nada muda e a fila toca normalmente.
export const definirContextoAudio = (
  novoContexto,
  { interromperAnterior = true } = {}
) => {
  const contexto =
    novoContexto == null
      ? 'global'
      : String(novoContexto);

  if (contexto === contextoAudioAtual) {
    return;
  }

  contextoAudioAtual = contexto;

  const mantidas = [];

  for (const item of filaFala) {
    if (item.contexto === contextoAudioAtual) {
      mantidas.push(item);
    } else {
      resolverItemDescartado(item);
    }
  }

  filaFala = mantidas;

  if (
    interromperAnterior &&
    contextoEmExecucao &&
    contextoEmExecucao !== contextoAudioAtual
  ) {
    cancelarReproducaoAtual();
  }
};

// Útil quando a pessoa responde várias vezes muito rápido na MESMA tela.
// Mantém apenas a fala mais recente daquele contexto.
export const limparFilaDoContextoAtual = ({
  interromperAtual = false,
} = {}) => {
  const mantidas = [];

  for (const item of filaFala) {
    if (item.contexto === contextoAudioAtual) {
      resolverItemDescartado(item);
    } else {
      mantidas.push(item);
    }
  }

  filaFala = mantidas;

  if (
    interromperAtual &&
    contextoEmExecucao === contextoAudioAtual
  ) {
    cancelarReproducaoAtual();
  }
};

async function garantirModoAudio() {
  if (modoAudioConfigurado) return;

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
    });
  } catch (erro) {
    console.warn(
      '[SOM] Não foi possível configurar o modo de áudio:',
      erro?.message || erro
    );
  }

  modoAudioConfigurado = true;
}

async function pararVozNativa() {
  try {
    await Speech.stop();
  } catch (_) {}
}

function destruirPlayer(player = audioPlayerAtual) {
  if (!player) return;

  try {
    player.pause();
  } catch (_) {}

  try {
    player.remove();
  } catch (_) {}

  if (audioPlayerAtual === player) {
    audioPlayerAtual = null;
  }
}

// ============================================================
// Toca um AudioPlayer e resolve SOMENTE quando:
// - terminou de verdade;
// - falhou antes de começar;
// - ou pararFala() cancelou.
//
// Usamos status a cada 100 ms + propriedades currentTime/duration.
// Isso elimina o atraso que acontecia quando o evento de término
// demorava para chegar, sem cortar o áudio.
// ============================================================
function tocarPlayerAteOFim(player, rotulo = 'audio') {
  return new Promise((resolve) => {
    let finalizado = false;
    let assinatura = null;
    let poll = null;
    let timerSeguranca = null;

    const limpar = () => {
      try {
        assinatura?.remove();
      } catch (_) {}

      if (poll) clearInterval(poll);
      if (timerSeguranca) clearTimeout(timerSeguranca);

      if (cancelarEsperaAtual === cancelar) {
        cancelarEsperaAtual = null;
      }
    };

    const finalizar = (resultado = 'terminou') => {
      if (finalizado) return;
      finalizado = true;
      limpar();
      resolve(resultado);
    };

    const cancelar = () => finalizar('cancelado');
    cancelarEsperaAtual = cancelar;

    const verificarFim = (status = null) => {
      if (finalizado) return;

      try {
        // Caminho principal: o próprio expo-audio informa o fim exato.
        if (status?.didJustFinish) {
          finalizar('terminou');
          return;
        }

        const currentTime =
          Number(status?.currentTime ?? player.currentTime ?? 0) || 0;

        const duration =
          Number(status?.duration ?? player.duration ?? 0) || 0;

        const playing =
          typeof status?.playing === 'boolean'
            ? status.playing
            : !!player.playing;

        // Fallback somente para aparelhos em que didJustFinish falha.
        // Margem de 30 ms: praticamente instantâneo, sem delay perceptível.
        if (
          duration > 0 &&
          currentTime >= Math.max(0, duration - 0.03) &&
          !playing
        ) {
          finalizar('terminou');
        }
      } catch (_) {}
    };

    try {
      assinatura = player.addListener(
        'playbackStatusUpdate',
        verificarFim
      );
    } catch (_) {}

    // Checagem auxiliar rápida. Não cria atraso; apenas detecta o fim
    // caso o evento nativo não venha.
    poll = setInterval(() => {
      verificarFim();
    }, 25);

    // Só evita travamento infinito caso a biblioteca quebre.
    timerSeguranca = setTimeout(() => {
      console.warn(
        `[SOM] timeout de segurança em "${rotulo}".`
      );
      finalizar('terminou');
    }, 60000);

    try {
      player.play();
    } catch (erro) {
      console.warn(
        `[SOM] erro ao iniciar "${rotulo}":`,
        erro?.message || erro
      );
      finalizar('erro');
    }
  });
}

// ============================================================
// 1) ÁUDIO LOCAL PRÉ-GRAVADO
// ============================================================
async function falarComAudioLocal(chave) {
  const arquivoAudio = FALAS[chave];

  console.log(
    '[SOM] chave:',
    chave,
    '| local encontrado?',
    !!arquivoAudio
  );

  if (!arquivoAudio) {
    return false;
  }

  const minhaGeracao = geracaoAudio;
  let player = null;

  try {
    await garantirModoAudio();
    await pararVozNativa();

    if (audioPlayerAtual) {
      destruirPlayer(audioPlayerAtual);
    }

    // Usa primeiro um AudioPlayer que já foi criado antecipadamente.
    player =
      consumirPlayerPrecarregado(chave);

    if (!player) {
      const fonte =
        await obterFonteLocalPrecarregada(chave);

      player = createAudioPlayer(
        fonte || arquivoAudio,
        { updateInterval: 50 }
      );

      player.volume = 1.0;
    } else {
      console.log(
        '[SOM] usando player PRÉ-CARREGADO:',
        chave
      );
    }

    audioPlayerAtual = player;

    // Sempre começa do início.
    try {
      const retorno = player.seekTo?.(0);

      if (
        retorno &&
        typeof retorno.then === 'function'
      ) {
        await retorno;
      }
    } catch (_) {}

    const resultado =
      await tocarPlayerAteOFim(
        player,
        chave
      );

    if (
      minhaGeracao !== geracaoAudio ||
      resultado === 'cancelado'
    ) {
      destruirPlayer(player);
      reporPlayerPrecarregado(chave);
      return true;
    }

    destruirPlayer(player);
    reporPlayerPrecarregado(chave);

    if (resultado === 'erro') {
      console.warn(
        `[SOM] MP3 local "${chave}" não pôde ser iniciado.`
      );
      return false;
    }

    return true;
  } catch (erro) {
    console.warn(
      `[SOM] Falha real no áudio local "${chave}":`,
      erro?.message || erro
    );

    if (player) {
      destruirPlayer(player);
    }

    reporPlayerPrecarregado(chave);
    return false;
  }
}

// ============================================================
// 2) ELEVENLABS AO VIVO
// ============================================================
function blobParaBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const resultado = reader.result;
      resolve(resultado.split(',')[1]);
    };

    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function falarComElevenLabs(texto) {
  if (
    !ELEVENLABS_API_KEY ||
    ELEVENLABS_API_KEY === 'COLOQUE_SUA_CHAVE_AQUI' ||
    !ELEVENLABS_VOICE_ID ||
    ELEVENLABS_VOICE_ID === 'COLOQUE_O_VOICE_ID_AQUI'
  ) {
    return false;
  }

  const minhaGeracao = geracaoAudio;
  let player = null;

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
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
          },
        }),
      }
    );

    if (!resposta.ok) {
      throw new Error(
        `ElevenLabs respondeu com status ${resposta.status}`
      );
    }

    const blob = await resposta.blob();
    const base64 = await blobParaBase64(blob);

    const arquivo = new File(
      Paths.cache,
      `lumi_fala_${Date.now()}.mp3`
    );

    await arquivo.write(base64, {
      encoding: 'base64',
    });

    await garantirModoAudio();
    await pararVozNativa();

    if (audioPlayerAtual) {
      destruirPlayer(audioPlayerAtual);
    }

    player = createAudioPlayer(
      { uri: arquivo.uri },
      { updateInterval: 100 }
    );

    audioPlayerAtual = player;
    player.volume = 1.0;

    const resultado = await tocarPlayerAteOFim(
      player,
      'ElevenLabs ao vivo'
    );

    if (
      minhaGeracao !== geracaoAudio ||
      resultado === 'cancelado'
    ) {
      destruirPlayer(player);
      return true;
    }

    if (resultado === 'erro') {
      destruirPlayer(player);
      return false;
    }

    destruirPlayer(player);
    return true;
  } catch (erro) {
    console.warn(
      '[SOM] Falha na ElevenLabs ao vivo:',
      erro?.message || erro
    );

    if (player) {
      destruirPlayer(player);
    }

    return false;
  }
}

// ============================================================
// 3) VOZ NATIVA — ÚLTIMO RECURSO
// ============================================================
async function falarComVozNativa(texto) {
  // Nunca inicia Speech enquanto há MP3 vivo.
  if (audioPlayerAtual) {
    destruirPlayer(audioPlayerAtual);
  }

  await pararVozNativa();

  return new Promise((resolve) => {
    if (!somAtivado) {
      resolve();
      return;
    }

    console.log(
      '[SOM] FALLBACK NATIVO:',
      texto
    );

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

// ============================================================
// UMA FALA
// ============================================================
async function falarAgora(texto, chave) {
  if (!somAtivado) return;

  if (chave) {
    const tocouLocal =
      await falarComAudioLocal(chave);

    if (tocouLocal) {
      return;
    }
  }

  if (!somAtivado) return;

  const tocouElevenLabs =
    await falarComElevenLabs(texto);

  if (tocouElevenLabs) {
    return;
  }

  if (!somAtivado) return;

  await falarComVozNativa(texto);
}

// ============================================================
// FILA
//
// A Promise retornada por falar() só resolve DEPOIS que aquela fala
// realmente terminou. Assim uma tela pode fazer:
//
// await falar('Correto!', 'correto');
// avancarNivel();
//
// e o nível nunca muda antes do áudio acabar.
// ============================================================
async function processarFila() {
  if (processandoFila) return;

  processandoFila = true;

  try {
    while (filaFala.length > 0) {
      if (!somAtivado) {
        for (const item of filaFala) {
          resolverItemDescartado(item);
        }

        filaFala = [];
        break;
      }

      const proxima = filaFala.shift();

      // A tela mudou enquanto esta fala ainda esperava na fila.
      // Ela não deve mais tocar.
      if (proxima.contexto !== contextoAudioAtual) {
        resolverItemDescartado(proxima);
        continue;
      }

      contextoEmExecucao = proxima.contexto;

      await falarAgora(
        proxima.texto,
        proxima.chave
      );

      contextoEmExecucao = null;

      proxima.resolverQuandoTerminar?.();
    }
  } finally {
    contextoEmExecucao = null;
    processandoFila = false;

    if (
      filaFala.length > 0 &&
      somAtivado
    ) {
      processarFila();
    }
  }
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================
export const falar = (
  texto,
  chave = null,
  opcoes = {}
) => {
  if (!somAtivado) {
    return Promise.resolve();
  }

  const contexto =
    opcoes.contexto != null
      ? String(opcoes.contexto)
      : contextoAudioAtual;

  // Se esta fala já nasceu para uma tela que não é mais a atual,
  // nem chega a entrar na fila.
  if (contexto !== contextoAudioAtual) {
    return Promise.resolve();
  }

  // Para feedback repetido muito rápido na mesma tela:
  // fica somente a fala mais recente.
  if (opcoes.substituirFilaDoContexto) {
    const mantidas = [];

    for (const item of filaFala) {
      if (item.contexto === contexto) {
        resolverItemDescartado(item);
      } else {
        mantidas.push(item);
      }
    }

    filaFala = mantidas;

    if (
      opcoes.interromperAtual &&
      contextoEmExecucao === contexto
    ) {
      cancelarReproducaoAtual();
    }
  }

  return new Promise(
    (resolverQuandoTerminar) => {
      filaFala.push({
        texto,
        chave,
        contexto,
        resolverQuandoTerminar,
      });

      processarFila();
    }
  );
};

// ============================================================
// ELOGIOS
// ============================================================
const POOL_ELOGIOS = [
  'correto',
  'muitobem',
  'issomesmo',
  'acertou',
  'wohooparabens',
  'fezcertinho',
];

export const falarElogio = () => {
  return falarAleatorio(
    'Muito bem!',
    POOL_ELOGIOS
  );
};

export const falarAleatorio = (
  textoFallback,
  chaves
) => {
  const chave =
    chaves[
      Math.floor(
        Math.random() * chaves.length
      )
    ];

  // IMPORTANTE: retorna a Promise.
  // Assim a tela também pode usar "await falarAleatorio(...)".
  return falar(
    textoFallback,
    chave
  );
};

// ============================================================
// PARA TUDO
// Use só para:
// - mudo;
// - sair de uma tela;
// - cancelar uma experiência de verdade.
//
// Não use para avançar normalmente de pergunta, senão corta a fala.
// ============================================================
export const pararFala = () => {
  geracaoAudio += 1;

  for (const item of filaFala) {
    resolverItemDescartado(item);
  }

  filaFala = [];

  try {
    cancelarEsperaAtual?.();
  } catch (_) {}

  cancelarEsperaAtual = null;
  contextoEmExecucao = null;

  try {
    Speech.stop();
  } catch (_) {}

  if (audioPlayerAtual) {
    destruirPlayer(audioPlayerAtual);
  }
};

export const aguardarPeloMenos = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));