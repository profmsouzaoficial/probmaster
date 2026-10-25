/**
 * Step-by-Step Educational Solver for Probability Distributions
 * Breaks down calculations into clear pedagogical steps:
 * 1. Parameters & Hypothesis
 * 2. Mathematical Formula
 * 3. Standardization (Z-score for Normal) or Exact Substitution
 * 4. Analytical Evaluation & Cumulative Area
 * 5. Practical Interpretation in Plain Portuguese
 */

import { CalculationResult, DistributionInfo } from './distributions';

export interface SolutionStep {
  stepNumber: number;
  title: string;
  mathExpression?: string;
  explanation: string;
  highlight?: boolean;
}

export interface DetailedSolution {
  distName: string;
  problemSummary: string;
  steps: SolutionStep[];
  conclusion: string;
  ruleOfThumb?: string;
}

export function generateStepByStepSolution(res: CalculationResult): DetailedSolution {
  const { distribution: dist, params, mode, x1, x2, probability, probabilityPercent } = res;
  const steps: SolutionStep[] = [];

  const format = (v: number) => (Number.isInteger(v) ? v.toString() : v.toFixed(3).replace(/\.?0+$/, ''));
  const pFormatted = probability.toFixed(4);

  // STEP 1: Identification of Parameters
  const paramStrings = Object.entries(params)
    .map(([key, val]) => {
      const def = dist.parameters.find((p) => p.id === key);
      return `${def ? def.name : key} = ${val}`;
    })
    .join(', ');

  steps.push({
    stepNumber: 1,
    title: 'Identificação da Distribuição e Parâmetros',
    explanation: `Identificamos a variável aleatória $X$ como seguindo uma **${dist.name}** (${dist.type === 'continuous' ? 'Contínua' : 'Discreta'}). Os parâmetros fornecidos para a função de probabilidade são:`,
    mathExpression: `X \\sim \\text{${dist.shortName}}(${Object.values(params).join(', ')}) \\implies ${paramStrings}`,
  });

  // STEP 2: General Theoretical Formula
  steps.push({
    stepNumber: 2,
    title: 'Fórmula Analítica da Densidade / Acumulada',
    explanation: `A expressão matemática fundamental que define a curva ou a probabilidade acumulada para esta distribuição é:`,
    mathExpression: dist.formulaLatex.pdf,
  });

  // STEP 3: Special processing based on Distribution
  if (dist.id === 'normal') {
    const mu = params.mu;
    const sigma = params.sigma;
    const z1 = (x1 - mu) / sigma;
    const z2 = (x2 - mu) / sigma;

    if (mode === 'leq') {
      steps.push({
        stepNumber: 3,
        title: 'Padronização para a Variável Normal Padrão Z ~ N(0, 1)',
        explanation: `Como toda normal $X \\sim N(\\mu, \\sigma^2)$ pode ser padronizada pela transformação $Z = \\frac{X - \\mu}{\\sigma}$, calculamos o escore Z para o ponto de corte $x = ${format(x1)}$:`,
        mathExpression: `Z = \\frac{x - \\mu}{\\sigma} = \\frac{${format(x1)} - ${mu}}{${sigma}} = ${z1.toFixed(3)}`,
      });

      steps.push({
        stepNumber: 4,
        title: 'Determinação da Cauda Acumulada',
        explanation: `A probabilidade acumulada à esquerda corresponde à área sob a curva normal padrão até $Z = ${z1.toFixed(3)}$:`,
        mathExpression: `P(X \\le ${format(x1)}) = P(Z \\le ${z1.toFixed(3)}) = \\Phi(${z1.toFixed(3)}) = ${pFormatted}`,
        highlight: true,
      });
    } else if (mode === 'geq') {
      steps.push({
        stepNumber: 3,
        title: 'Padronização e Regra do Complementar',
        explanation: `Padronizamos o ponto $x = ${format(x1)}$ e aplicamos a regra do evento complementar $P(X \\ge x) = 1 - P(X \\le x)$:`,
        mathExpression: `Z = \\frac{${format(x1)} - ${mu}}{${sigma}} = ${z1.toFixed(3)} \\implies P(X \\ge ${format(x1)}) = 1 - \\Phi(${z1.toFixed(3)}) = ${pFormatted}`,
        highlight: true,
      });
    } else if (mode === 'between') {
      const low = Math.min(x1, x2);
      const high = Math.max(x1, x2);
      const zLow = (low - mu) / sigma;
      const zHigh = (high - mu) / sigma;

      steps.push({
        stepNumber: 3,
        title: 'Cálculo dos Dois Escores Z e Diferença de Áreas',
        explanation: `Para o intervalo entre $x_1 = ${format(low)}$ e $x_2 = ${format(high)}$, calculamos ambos os limites padronizados:`,
        mathExpression: `Z_1 = \\frac{${format(low)} - ${mu}}{${sigma}} = ${zLow.toFixed(3)}, \\quad Z_2 = \\frac{${format(high)} - ${mu}}{${sigma}} = ${zHigh.toFixed(3)}`,
      });

      steps.push({
        stepNumber: 4,
        title: 'Subtração das Caudas Acumuladas',
        explanation: `A probabilidade no intervalo é obtida subtraindo a probabilidade acumulada inferior da superior:`,
        mathExpression: `P(${format(low)} \\le X \\le ${format(high)}) = \\Phi(${zHigh.toFixed(3)}) - \\Phi(${zLow.toFixed(3)}) = ${pFormatted}`,
        highlight: true,
      });
    } else if (mode === 'two_tail') {
      const low = Math.min(x1, x2);
      const high = Math.max(x1, x2);
      const zLow = (low - mu) / sigma;
      const zHigh = (high - mu) / sigma;

      steps.push({
        stepNumber: 3,
        title: 'Soma das Áreas das Duas Caudas Extremas',
        explanation: `Calculamos a probabilidade de a variável cair nos extremos (abaixo de $x_1$ OU acima de $x_2$), comum em testes bicaudais de hipótese:`,
        mathExpression: `P(X \\le ${format(low)} \\cup X \\ge ${format(high)}) = \\Phi(${zLow.toFixed(3)}) + [1 - \\Phi(${zHigh.toFixed(3)})] = ${pFormatted}`,
        highlight: true,
      });
    }
  } else if (dist.id === 'binomial') {
    const n = Math.round(params.n);
    const p = params.p;

    if (mode === 'equal') {
      const k = Math.round(x1);
      steps.push({
        stepNumber: 3,
        title: 'Aplicação da Função de Massa de Probabilidade (PMF)',
        explanation: `Substituímos o total de ensaios $n = ${n}$, a probabilidade de sucesso $p = ${p}$ e o número exato de sucessos desejados $k = ${k}$:`,
        mathExpression: `P(X = ${k}) = \\binom{${n}}{${k}} (${p})^{${k}} (1 - ${p})^{${n - k}} = ${pFormatted}`,
        highlight: true,
      });
    } else if (mode === 'leq') {
      const k = Math.floor(x1);
      steps.push({
        stepNumber: 3,
        title: 'Somatório Acumulativo de Probabilidades Discretas',
        explanation: `Para encontrar $P(X \\le ${k})$, somamos as probabilidades pontuais de $i = 0$ até $i = ${k}$:`,
        mathExpression: `P(X \\le ${k}) = \\sum_{i=0}^{${k}} \\binom{${n}}{i} (${p})^i (${(1 - p).toFixed(2)})^{${n}-i} = ${pFormatted}`,
        highlight: true,
      });
    } else {
      steps.push({
        stepNumber: 3,
        title: 'Cálculo Acumulado para Variável Discreta',
        explanation: `Utilizamos a função de distribuição cumulativa binomial (ou o método dos intervalos acumulados):`,
        mathExpression: `${res.expressionText} = ${pFormatted}`,
        highlight: true,
      });
    }
  } else if (dist.id === 'poisson') {
    const lambda = params.lambda;
    if (mode === 'equal') {
      const k = Math.round(x1);
      steps.push({
        stepNumber: 3,
        title: 'Cálculo da Probabilidade Pontual de Poisson',
        explanation: `Aplicamos a taxa média de ocorrências $\\lambda = ${lambda}$ e o número de eventos $k = ${k}$:`,
        mathExpression: `P(X = ${k}) = \\frac{${lambda}^{${k}} e^{-${lambda}}}{${k}!} = ${pFormatted}`,
        highlight: true,
      });
    } else {
      steps.push({
        stepNumber: 3,
        title: 'Soma Acumulada de Poisson',
        explanation: `Calculamos a probabilidade acumulada somando os termos correspondentes:`,
        mathExpression: `${res.expressionText} = ${pFormatted}`,
        highlight: true,
      });
    }
  } else if (dist.id === 'exponential') {
    const lambda = params.lambda;
    if (mode === 'leq') {
      steps.push({
        stepNumber: 3,
        title: 'Integração Analítica da Função de Densidade',
        explanation: `A integral de $0$ até $x = ${format(x1)}$ para a taxa $\\lambda = ${lambda}$ é resolvida diretamente:`,
        mathExpression: `F(${format(x1)}) = \\int_0^{${format(x1)}} ${lambda} e^{-${lambda} t} dt = 1 - e^{-${lambda} \\times ${format(x1)}} = ${pFormatted}`,
        highlight: true,
      });
    } else if (mode === 'geq') {
      steps.push({
        stepNumber: 3,
        title: 'Função de Sobrevivência (Cauda Superior)',
        explanation: `Para a exponencial, a probabilidade de durar mais que $x$ é a elegante função de sobrevivência $S(x) = e^{-\\lambda x}$:`,
        mathExpression: `P(X \\ge ${format(x1)}) = e^{-${lambda} \\times ${format(x1)}} = ${pFormatted}`,
        highlight: true,
      });
    } else {
      steps.push({
        stepNumber: 3,
        title: 'Resolução da Integral no Intervalo',
        explanation: `Calculamos a probabilidade no intervalo pela diferença das funções acumuladas:`,
        mathExpression: `${res.expressionText} = ${pFormatted}`,
        highlight: true,
      });
    }
  } else {
    // Generic continuous / discrete step
    steps.push({
      stepNumber: 3,
      title: 'Avaliação Numérica da Função Acumulada',
      explanation: `Calculamos a probabilidade exata integrando numericamente a densidade ou avaliando as funções especiais (Incomplete Beta / Gamma) com alta precisão:`,
      mathExpression: `${res.expressionText} = ${pFormatted}`,
      highlight: true,
    });
  }

  // STEP 4 / FINAL: Conclusion and Interpretation
  const conclusion = `O valor resultante para **${res.expressionText}** é exatamente **p = ${probability.toFixed(4)}**, o que equivale a **${probabilityPercent}** de probabilidade.`;

  let ruleOfThumb = '';
  if (dist.id === 'normal') {
    ruleOfThumb =
      '💡 Regra Empírica 68-95-99.7: Lembre-se de que cerca de 68.3% dos dados estão a ±1σ da média, 95.4% a ±2σ e 99.7% a ±3σ.';
  } else if (dist.id === 'binomial') {
    ruleOfThumb =
      '💡 Dica do Professor: Se n ≥ 30 e np ≥ 5 com n(1-p) ≥ 5, a distribuição Binomial pode ser aproximada com excelente precisão pela Normal N(np, np(1-p)).';
  } else if (dist.id === 'poisson') {
    ruleOfThumb =
      '💡 Dica do Professor: Na distribuição de Poisson, a média e a variância são matematicamente iguais ao parâmetro λ.';
  } else if (dist.id === 'student_t') {
    ruleOfThumb =
      '💡 Dica do Professor: Conforme os graus de liberdade aumentam (ν > 30), a distribuição t de Student se aproxima indistinguivelmente da Normal padrão Z.';
  }

  return {
    distName: dist.name,
    problemSummary: `Cálculo de ${res.expressionText} sob ${dist.name}`,
    steps,
    conclusion,
    ruleOfThumb,
  };
}
