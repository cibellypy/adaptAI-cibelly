// services/ScoreManager.js

export const scores = {
  discalculiaAcertos: 0,
  discalculiaErros: 0,
  dislexiaAcertos: 0,
  dislexiaErros: 0,
  vrAcertos: 0,
  vrErros: 0,
};

export const addScore = (atividade, resultado) => {
  const chave =
    `${atividade}${resultado === 'acerto' ? 'Acertos' : 'Erros'}`;

  if (scores.hasOwnProperty(chave)) {
    scores[chave] += 1;
  }
};

export const resetScores = () => {
  Object.keys(scores).forEach((chave) => {
    scores[chave] = 0;
  });
};