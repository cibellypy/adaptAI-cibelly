// ============================================================
// Mapa central de falas pré-gravadas da Lumi (ElevenLabs).
//
// Cada chave é EXATAMENTE o nome do arquivo (sem ".mp3"), igual está
// na sua pasta assets/audios. Assim não tem tradução nem confusão de
// nomes — o que está na pasta é o que está aqui.
//
// Quando gravar um áudio novo:
//   1. Coloque o arquivo .mp3 em assets/audios/
//   2. Adicione UMA linha aqui embaixo (ou descomente a linha já pronta)
//   3. Pronto — nenhuma tela precisa ser alterada.
//
// Se uma chave usada em alguma tela NÃO existir aqui ainda, o app cai
// automaticamente para a fala "ao vivo" (ElevenLabs ou voz nativa),
// então nada quebra enquanto você ainda não gravou tudo.
// ============================================================

export const FALAS = {
  // ---- Já gravados e recebidos ----
  home: require('../../assets/audios/home.mp3'),
  correto: require('../../assets/audios/correto.mp3'),
  completepalavras: require('../../assets/audios/completepalavras.mp3'),
  escutadnv: require('../../assets/audios/escutadnv.mp3'),
  bola: require('../../assets/audios/bola.mp3'),
  bolo: require('../../assets/audios/bolo.mp3'),
  faca: require('../../assets/audios/faca.mp3'),
  fogo: require('../../assets/audios/fogo.mp3'),
  gato: require('../../assets/audios/gato.mp3'),
  lumi_boasvindas: require('../../assets/audios/lumi_boasvindas.mp3'),
  letraB: require('../../assets/audios/letraB.mp3'),
  letraD: require('../../assets/audios/letraD.mp3'),
  letraM: require('../../assets/audios/letraM.mp3'),
  letraP: require('../../assets/audios/letraP.mp3'),
  letraQ: require('../../assets/audios/letraQ.mp3'),
  letraW: require('../../assets/audios/letraW.mp3'),
  muitobem: require('../../assets/audios/muitobem.mp3'),
  nivel3: require('../../assets/audios/nivel3.mp3'),
  nivel4: require('../../assets/audios/nivel4.mp3'),
  montoucertinho: require('../../assets/audios/montoucertinho.mp3'),
  ouviucertinho: require('../../assets/audios/ouviucertinho.mp3'),
  parabensdominou: require('../../assets/audios/parabensdominou.mp3'),
  jogo: require('../../assets/audios/jogo.mp3'), // não usado em nenhuma tela ainda
  quase: require('../../assets/audios/quase.mp3'),
  tentaoutroespaco: require('../../assets/audios/tentaoutroespaco.mp3'),
  tenteoutraletra: require('../../assets/audios/tenteoutraletra.mp3'),
  proximodesafio: require('../../assets/audios/proximodesafio.mp3'),
  sol: require('../../assets/audios/sol.mp3'),
  pato: require('../../assets/audios/pato.mp3'),
  vaca: require('../../assets/audios/vaca.mp3'), // não usado em nenhuma tela ainda (VACA é a imagem errada, não falada)
};