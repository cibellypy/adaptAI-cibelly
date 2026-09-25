// services/ScoreManager.js

export const scores = {
  discalculiaAcertos: 0,
  discalculiaErros: 0,
  dislexiaAcertos: 0,
  dislexiaErros: 0,
  vrAcertos: 0, // Adicionado
  vrErros: 0,   // Adicionado
};

export const addScore = (atividade, resultado) => {
  const chave =
    `${atividade}${resultado === 'acerto' ? 'Acertos' : 'Erros'}`;

  if (scores.hasOwnProperty(chave)) {
    scores[chave] += 1;
  }
};