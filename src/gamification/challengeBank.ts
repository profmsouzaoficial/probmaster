/**
 * Preloaded Challenge Bank & Adaptive Challenge Generator
 * Real-world applied problems across continuous and discrete distributions.
 */

import { StudentChallenge } from './types';
import { DISTRIBUTIONS } from '../math/distributions';

export const INITIAL_CHALLENGES: StudentChallenge[] = [
  {
    id: 'norm_1',
    distId: 'normal',
    distName: 'Normal (Gaussiana)',
    title: 'Controle de Qualidade de Peças Industriais',
    difficulty: 'Iniciante',
    story:
      'Uma usina automotiva produz eixos de precisão cujo diâmetro segue uma distribuição Normal com média μ = 50.0 mm e desvio padrão σ = 0.5 mm.',
    question: 'Qual a probabilidade de um eixo selecionado ao acaso ter diâmetro menor que 49.5 mm, ou seja, P(X ≤ 49.5)?',
    targetExpression: 'P(X ≤ 49.5)',
    params: { mu: 50, sigma: 0.5 },
    expectedAnswer: 0.1587,
    tolerance: 0.015,
    hint1: 'Calcule o escore Z: Z = (49.5 - 50.0) / 0.5 = -1.0.',
    hint2: 'Pela regra empírica da Normal, P(Z ≤ -1) corresponde a aproximadamente 15.87% da área.',
    fullExplanation:
      'Padronizando: Z = (49.5 - 50)/0.5 = -1.00. Consultando a curva normal padrão, Φ(-1.00) = 0.158655 ≈ 15.87%.',
    xpReward: 60,
  },
  {
    id: 'binom_1',
    distId: 'binomial',
    distName: 'Binomial',
    title: 'Inspeção de Lotes em Linha de Montagem',
    difficulty: 'Iniciante',
    story:
      'Um lote de 10 placas de circuito é inspecionado. A probabilidade histórica de qualquer placa apresentar defeito de solda é p = 0.10 (10%). As placas são independentes.',
    question: 'Qual a probabilidade de encontrar EXATAMENTE 1 placa defeituosa no lote, isto é, P(X = 1) com n = 10 e p = 0.10?',
    targetExpression: 'P(X = 1)',
    params: { n: 10, p: 0.1 },
    expectedAnswer: 0.3874,
    tolerance: 0.02,
    hint1: 'Use a fórmula da PMF: P(X = 1) = C(10, 1) * (0.1)^1 * (0.9)^9.',
    hint2: 'C(10, 1) = 10, e (0.9)^9 ≈ 0.3874.',
    fullExplanation:
      'P(X = 1) = 10 × 0.10 × (0.90)^9 = 1 × 0.38742 = 0.3874 (38.74%).',
    xpReward: 65,
  },
  {
    id: 'poiss_1',
    distId: 'poisson',
    distName: 'Poisson',
    title: 'Acessos a Servidores em Nuvem',
    difficulty: 'Intermediário',
    story:
      'Um servidor de autenticação de API recebe em média λ = 4 requisições por segundo, seguindo um processo de Poisson.',
    question: 'Qual a probabilidade de o servidor receber NO MÁXIMO 2 requisições em um determinado segundo, ou seja, P(X ≤ 2)?',
    targetExpression: 'P(X ≤ 2)',
    params: { lambda: 4 },
    expectedAnswer: 0.2381,
    tolerance: 0.02,
    hint1: 'P(X ≤ 2) = P(X = 0) + P(X = 1) + P(X = 2).',
    hint2: 'Lembre-se: P(X = k) = (4^k * e^(-4)) / k! para k = 0, 1, 2.',
    fullExplanation:
      'P(0) = e^-4 ≈ 0.0183; P(1) = 4 * e^-4 ≈ 0.0733; P(2) = (16/2) * e^-4 = 8 * e^-4 ≈ 0.1465. Soma = 0.2381 (23.81%).',
    xpReward: 75,
  },
  {
    id: 'exp_1',
    distId: 'exponential',
    distName: 'Exponencial',
    title: 'Tempo de Vida de Lâmpadas Hospitalares',
    difficulty: 'Intermediário',
    story:
      'O tempo até a falha (em milhares de horas) de lâmpadas UV em salas cirúrgicas tem distribuição Exponencial com taxa λ = 0.5 (vida média de 2 mil horas).',
    question: 'Qual a probabilidade de uma lâmpada durar MAIS de 3 mil horas, ou seja, P(X ≥ 3)?',
    targetExpression: 'P(X ≥ 3)',
    params: { lambda: 0.5 },
    expectedAnswer: 0.2231,
    tolerance: 0.02,
    hint1: 'Para a distribuição exponencial, a cauda superior é P(X ≥ x) = e^(-λx).',
    hint2: 'Calcule e^(-0.5 * 3) = e^(-1.5).',
    fullExplanation:
      'P(X ≥ 3) = e^(-0.5 × 3) = e^(-1.5) ≈ 0.22313 (22.31%).',
    xpReward: 70,
  },
  {
    id: 't_1',
    distId: 'student_t',
    distName: 't de Student',
    title: 'Intervalo Crítico de Estudo Clínico',
    difficulty: 'Avançado',
    story:
      'Um pesquisador realiza um teste t com amostra de tamanho n = 11 pacientes (portanto ν = n - 1 = 10 graus de liberdade) para avaliar a redução de pressão arterial.',
    question: 'Qual a probabilidade de a estatística t cair entre -1.81 e +1.81, isto é, P(-1.81 ≤ t ≤ 1.81) com ν = 10?',
    targetExpression: 'P(-1.81 ≤ t ≤ 1.81)',
    params: { df: 10 },
    expectedAnswer: 0.90,
    tolerance: 0.03,
    hint1: 'Este é o intervalo bilateral de confiança de 90% para 10 graus de liberdade.',
    hint2: 'A área em cada uma das caudas fora do intervalo é de 5% (0.05).',
    fullExplanation:
      'Para ν = 10, o valor crítico bilateral a 10% de significância é t ≈ 1.812. Portanto, P(-1.81 ≤ t ≤ 1.81) ≈ 0.90 (90.0%).',
    xpReward: 90,
  },
  {
    id: 'chi_1',
    distId: 'chi_square',
    distName: 'Qui-Quadrado (χ²)',
    title: 'Teste de Aderência Genética',
    difficulty: 'Avançado',
    story:
      'Em um cruzamento genético com 5 categorias fenotípicas (graus de liberdade k = 5 - 1 = 4), calculou-se a estatística χ².',
    question: 'Qual a probabilidade de obter um valor de qui-quadrado menor ou igual a 9.49 com 4 graus de liberdade, P(X ≤ 9.49)?',
    targetExpression: 'P(X ≤ 9.49)',
    params: { df: 4 },
    expectedAnswer: 0.95,
    tolerance: 0.02,
    hint1: '9.49 é o valor crítico clássico para α = 0.05 (95% de confiança) com 4 graus de liberdade.',
    hint2: 'Avalie a função acumulada do Qui-Quadrado para x = 9.49.',
    fullExplanation:
      'A função acumulada P(k/2, x/2) para k=4 e x=9.488 resulta exatamente em 0.95 (95.0%).',
    xpReward: 95,
  },
  {
    id: 'beta_1',
    distId: 'beta_dist',
    distName: 'Beta',
    title: 'Modelagem Bayesiana de Conversão Web',
    difficulty: 'Avançado',
    story:
      'Uma equipe de Growth modela a taxa de conversão θ de um novo checkout com uma distribuição Beta(α=3, β=7) após um teste A/B.',
    question: 'Qual a média esperada da taxa de conversão E[X] = α / (α + β)? (Digite em decimal, ex: 0.30)',
    targetExpression: 'E[X]',
    params: { alpha: 3, beta: 7 },
    expectedAnswer: 0.30,
    tolerance: 0.01,
    hint1: 'A média da distribuição Beta é dada por E[X] = α / (α + β).',
    hint2: 'Calcule 3 / (3 + 7).',
    fullExplanation:
      'E[X] = 3 / (3 + 7) = 3 / 10 = 0.30 (30.0% de conversão esperada).',
    xpReward: 80,
  },
];

/**
 * Generates an adaptive challenge targeting a specific distribution or difficulty.
 */
export function generateAdaptiveChallenge(
  targetDistId: string,
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado'
): StudentChallenge {
  const dist = DISTRIBUTIONS[targetDistId] || DISTRIBUTIONS.normal;
  const id = `custom_${Date.now()}`;

  if (targetDistId === 'normal') {
    const mu = Math.floor(Math.random() * 20) + 60; // 60 to 80
    const sigma = Math.floor(Math.random() * 5) + 3; // 3 to 7
    const cutoff = mu + (Math.random() > 0.5 ? 1 : -1) * Number((sigma * (Math.random() * 1.5 + 0.5)).toFixed(1));
    const isLeq = Math.random() > 0.4;
    const z = (cutoff - mu) / sigma;
    const prob = isLeq ? dist.cdf(cutoff, { mu, sigma }) : 1 - dist.cdf(cutoff, { mu, sigma });

    return {
      id,
      distId: 'normal',
      distName: 'Normal (Gaussiana)',
      title: `Desafio Adaptativo: Processo Industrial N(${mu}, ${sigma}²)`,
      difficulty,
      story: `Uma empresa monitora a temperatura de um reator químico. A temperatura média operacional é μ = ${mu}°C com desvio padrão σ = ${sigma}°C.`,
      question: `Qual a probabilidade de a temperatura estar ${isLeq ? 'abaixo ou igual a' : 'acima ou igual a'} ${cutoff}°C, ou seja, ${isLeq ? `P(X ≤ ${cutoff})` : `P(X ≥ ${cutoff})`}?`,
      targetExpression: isLeq ? `P(X ≤ ${cutoff})` : `P(X ≥ ${cutoff})`,
      params: { mu, sigma },
      expectedAnswer: Number(prob.toFixed(4)),
      tolerance: 0.025,
      hint1: `Calcule o escore Z: Z = (${cutoff} - ${mu}) / ${sigma} = ${z.toFixed(2)}.`,
      hint2: `Consulte a probabilidade normal acumulada para Z = ${z.toFixed(2)}.`,
      fullExplanation: `Padronizando: Z = (${cutoff} - ${mu})/${sigma} = ${z.toFixed(2)}. A probabilidade acumulada é ${prob.toFixed(4)} (${(prob * 100).toFixed(2)}%).`,
      xpReward: difficulty === 'Avançado' ? 100 : difficulty === 'Intermediário' ? 75 : 50,
    };
  }

  if (targetDistId === 'poisson') {
    const lambda = Math.floor(Math.random() * 6) + 2; // 2 to 7
    const k = Math.floor(Math.random() * 4) + 1;
    const prob = dist.pdf(k, { lambda });

    return {
      id,
      distId: 'poisson',
      distName: 'Poisson',
      title: `Desafio Adaptativo: Atendimento Telefônico (λ = ${lambda})`,
      difficulty,
      story: `Uma central de emergência recebe chamadas com uma taxa média de λ = ${lambda} chamadas por hora.`,
      question: `Qual a probabilidade de ocorrerem EXATAMENTE ${k} chamadas em uma hora qualquer, isto é, P(X = ${k})?`,
      targetExpression: `P(X = ${k})`,
      params: { lambda },
      expectedAnswer: Number(prob.toFixed(4)),
      tolerance: 0.02,
      hint1: `Substitua na fórmula de Poisson: P(X = ${k}) = (${lambda}^${k} * e^(-${lambda})) / ${k}!`,
      hint2: `Calcule ${lambda}^${k} = ${Math.pow(lambda, k)} e ${k}! = ${[1, 1, 2, 6, 24, 120][k]}.`,
      fullExplanation: `P(X = ${k}) = (${lambda}^${k} × e^(-${lambda})) / ${k}! = ${prob.toFixed(4)} (${(prob * 100).toFixed(2)}%).`,
      xpReward: 70,
    };
  }

  // Fallback to Binomial
  const n = Math.floor(Math.random() * 15) + 10;
  const p = Number((Math.random() * 0.4 + 0.1).toFixed(2));
  const k = Math.floor(n * p);
  const prob = DISTRIBUTIONS.binomial.pdf(k, { n, p });

  return {
    id,
    distId: 'binomial',
    distName: 'Binomial',
    title: `Desafio Adaptativo: Amostragem Binomial (n = ${n}, p = ${p})`,
    difficulty,
    story: `Em uma pesquisa amostral com n = ${n} entrevistados independentes, a chance de apoio ao projeto é de p = ${p}.`,
    question: `Qual a probabilidade de exatamente ${k} pessoas apoiarem o projeto, P(X = ${k})?`,
    targetExpression: `P(X = ${k})`,
    params: { n, p },
    expectedAnswer: Number(prob.toFixed(4)),
    tolerance: 0.02,
    hint1: `Aplique a fórmula da Binomial: P(X = ${k}) = C(${n}, ${k}) * (${p})^${k} * (${(1 - p).toFixed(2)})^${n - k}.`,
    hint2: `Utilize a calculadora de distribuições do ProbMaster na aba ao lado para conferir!`,
    fullExplanation: `P(X = ${k}) com n=${n} e p=${p} resulta em ${prob.toFixed(4)} (${(prob * 100).toFixed(2)}%).`,
    xpReward: 75,
  };
}
