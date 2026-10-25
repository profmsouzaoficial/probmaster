/**
 * ProbMaster - High-Precision Mathematical Engine for Probability Distributions
 * Continuous & Discrete distributions with PDF/PMF, CDF, Inverse CDF, Moments, and Formulas.
 */

// --- Special Mathematical Functions ---

/**
 * Natural logarithm of the Gamma function via Lanczos approximation.
 * Precision: ~15 digits.
 */
export function logGamma(x: number): number {
  if (x <= 0) return 0;
  const p = [
    676.5203681218851,
    -1259.139216722289,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109585652026,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  const g = 7;
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let a = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) {
    a += p[i] / (x + i + 1);
  }
  const t = x + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

export function gamma(x: number): number {
  return Math.exp(logGamma(x));
}

/**
 * Natural logarithm of Beta function: ln(B(a, b)) = ln(Gamma(a)) + ln(Gamma(b)) - ln(Gamma(a + b))
 */
export function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

export function beta(a: number, b: number): number {
  return Math.exp(logBeta(a, b));
}

/**
 * Error function erf(x) via Chebyshev approximation.
 */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  if (absX >= 4) return sign;

  // Abramowitz and Stegun formula 7.1.26
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

export function erfc(x: number): number {
  return 1 - erf(x);
}

/**
 * Inverse Error Function erfinv(x)
 */
export function erfinv(x: number): number {
  if (x <= -1) return -Infinity;
  if (x >= 1) return Infinity;
  if (x === 0) return 0;

  // Winitzki approximation followed by Newton-Raphson refinement
  const a = 0.147;
  const logTerm = Math.log(1 - x * x);
  const part1 = 2 / (Math.PI * a) + logTerm / 2;
  const innerSqrt = part1 * part1 - logTerm / a;
  const sign = x < 0 ? -1 : 1;
  let val = sign * Math.sqrt(Math.max(0, Math.sqrt(innerSqrt) - part1));

  // 2 iterations of Halley's method
  for (let i = 0; i < 2; i++) {
    const err = erf(val) - x;
    const der = (2 / Math.sqrt(Math.PI)) * Math.exp(-val * val);
    val -= err / (der + val * err);
  }
  return val;
}

/**
 * Lower regularized incomplete gamma function P(a, x) = gamma(a, x) / Gamma(a)
 */
export function gammap(a: number, x: number): number {
  if (x <= 0) return 0;
  if (a <= 0) return 1;

  if (x < a + 1) {
    // Series representation
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n < 150; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  } else {
    // Continued fraction representation (Lentz method)
    let b = x + 1 - a;
    let c = 1 / 1e-30;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i <= 150; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = b + an / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    const q = Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
    return Math.max(0, Math.min(1, 1 - q));
  }
}

/**
 * Incomplete Beta function I_x(a, b) via continued fraction
 */
export function betainc(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Symmetry transformation
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - betainc(1 - x, b, a);
  }

  const lbeta = logBeta(a, b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) / a;

  // Continued fraction (Lentz method)
  let c = 1;
  let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= 150; m++) {
    // Even step
    let num = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + num * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + num / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;

    // Odd step
    num = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + num * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + num / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) < 1e-15) break;
  }

  return Math.max(0, Math.min(1, front * h));
}

/**
 * Log Factorial: ln(n!) = ln(Gamma(n+1))
 */
export function logFactorial(n: number): number {
  if (n <= 1) return 0;
  return logGamma(n + 1);
}

/**
 * Combination: n choose k in log space
 */
export function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  return Math.round(Math.exp(logChoose(n, k)));
}

// --- Standard Normal Quantile (Acklam's Algorithm) ---
export function standardNormalInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.38357751867269e2,
    -3.066479806614716e1,
    2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996,
    3.754408661907416,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let x = 0;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    x =
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    x =
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x =
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  // One Newton-Raphson step for machine precision
  const err = 0.5 * (1 + erf(x / Math.SQRT2)) - p;
  const pdf = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
  x -= err / pdf;

  return x;
}

// --- Distribution Definitions & Interfaces ---

export type DistributionType = 'continuous' | 'discrete';

export interface ParameterDef {
  id: string;
  name: string;
  symbol: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  integerOnly?: boolean;
  description: string;
}

export interface DistributionInfo {
  id: string;
  name: string;
  shortName: string;
  type: DistributionType;
  category: string;
  tags: string[];
  parameters: ParameterDef[];
  description: string;
  formulaLatex: {
    pdf: string;
    cdf: string;
  };
  moments: (params: Record<string, number>) => {
    mean: number | string;
    variance: number | string;
    stdDev: number | string;
    skewness: number | string;
    kurtosis: number | string;
  };
  pdf: (x: number, params: Record<string, number>) => number;
  cdf: (x: number, params: Record<string, number>) => number;
  invCdf: (p: number, params: Record<string, number>) => number;
  getRange: (params: Record<string, number>) => { min: number; max: number };
  realWorldContext: string;
}

// Bisection / Newton solver for general inverse CDF
function genericInverseCDF(
  cdfFn: (x: number) => number,
  p: number,
  low: number,
  high: number
): number {
  if (p <= 0) return low;
  if (p >= 1) return high;

  let left = low;
  let right = high;
  // Expand bounds if needed
  while (cdfFn(left) > p) left -= (right - left);
  while (cdfFn(right) < p) right += (right - left);

  for (let i = 0; i < 70; i++) {
    const mid = (left + right) / 2;
    const val = cdfFn(mid);
    if (Math.abs(val - p) < 1e-9 || (right - left) < 1e-9) {
      return mid;
    }
    if (val < p) {
      left = mid;
    } else {
      right = mid;
    }
  }
  return (left + right) / 2;
}

// ==========================================
// DISTRIBUTIONS CATALOG
// ==========================================

export const DISTRIBUTIONS: Record<string, DistributionInfo> = {
  // 1. NORMAL
  normal: {
    id: 'normal',
    name: 'Distribuição Normal (Gaussiana)',
    shortName: 'Normal',
    type: 'continuous',
    category: 'Contínua',
    tags: ['Sino', 'Gauss', 'Teorema Central'],
    parameters: [
      {
        id: 'mu',
        name: 'Média (μ)',
        symbol: 'μ',
        min: -50,
        max: 50,
        step: 0.5,
        defaultValue: 0,
        description: 'Centro de simetria e valor esperado da distribuição.',
      },
      {
        id: 'sigma',
        name: 'Desvio Padrão (σ)',
        symbol: 'σ',
        min: 0.1,
        max: 20,
        step: 0.1,
        defaultValue: 1,
        description: 'Dispersão dos dados ao redor da média (σ > 0).',
      },
    ],
    description:
      'A distribuição mais fundamental da estatística. Modela fenômenos naturais, erros experimentais, alturas, notas e médias amostrais graças ao Teorema do Limite Central.',
    formulaLatex: {
      pdf: 'f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x - \\mu}{\\sigma}\\right)^2}',
      cdf: 'F(x) = \\frac{1}{2}\\left[1 + \\text{erf}\\left(\\frac{x - \\mu}{\\sigma\\sqrt{2}}\\right)\\right]',
    },
    moments: (p) => ({
      mean: p.mu,
      variance: p.sigma * p.sigma,
      stdDev: p.sigma,
      skewness: 0,
      kurtosis: 0, // excess kurtosis
    }),
    pdf: (x, p) => {
      const z = (x - p.mu) / p.sigma;
      return (1 / (p.sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
    },
    cdf: (x, p) => {
      const z = (x - p.mu) / (p.sigma * Math.SQRT2);
      return 0.5 * (1 + erf(z));
    },
    invCdf: (prob, p) => {
      return p.mu + p.sigma * standardNormalInv(prob);
    },
    getRange: (p) => ({
      min: p.mu - 4.2 * p.sigma,
      max: p.mu + 4.2 * p.sigma,
    }),
    realWorldContext:
      'Exemplo real: Altura da população brasileira, peso de pacotes de alimentos em controle de qualidade, notas de exames padronizados (ENEM).',
  },

  // 2. STUDENT'S T
  student_t: {
    id: 'student_t',
    name: "Distribuição t de Student",
    shortName: 't-Student',
    type: 'continuous',
    category: 'Contínua',
    tags: ['Amostras Pequenas', 'Inferência', 'Graus de Liberdade'],
    parameters: [
      {
        id: 'df',
        name: 'Graus de Liberdade (ν)',
        symbol: 'ν',
        min: 1,
        max: 50,
        step: 1,
        defaultValue: 5,
        integerOnly: true,
        description: 'Tamanho da amostra menos 1 (n - 1). Para ν grande, converge à Normal.',
      },
    ],
    description:
      'Fundamental na inferência estatística com amostras pequenas e variância populacional desconhecida. Possui caudas mais pesadas que a Normal.',
    formulaLatex: {
      pdf: 'f(t) = \\frac{\\Gamma((\\nu+1)/2)}{\\sqrt{\\nu\\pi}\\,\\Gamma(\\nu/2)} \\left(1 + \\frac{t^2}{\\nu}\\right)^{-\\frac{\\nu+1}{2}}',
      cdf: 'F(t) = 1 - \\frac{1}{2} I_{\\frac{\\nu}{\\nu+t^2}}\\left(\\frac{\\nu}{2}, \\frac{1}{2}\\right) \\text{ para } t > 0',
    },
    moments: (p) => {
      const df = p.df;
      return {
        mean: df > 1 ? 0 : 'Indefinido',
        variance: df > 2 ? df / (df - 2) : df > 1 ? 'Infinito' : 'Indefinido',
        stdDev: df > 2 ? Math.sqrt(df / (df - 2)) : 'N/A',
        skewness: df > 3 ? 0 : 'Indefinido',
        kurtosis: df > 4 ? 6 / (df - 4) : 'Infinito',
      };
    },
    pdf: (t, p) => {
      const df = p.df;
      const coeff = Math.exp(logGamma((df + 1) / 2) - logGamma(df / 2)) / Math.sqrt(df * Math.PI);
      return coeff * Math.pow(1 + (t * t) / df, -(df + 1) / 2);
    },
    cdf: (t, p) => {
      const df = p.df;
      const x = df / (df + t * t);
      const ib = betainc(x, df / 2, 0.5);
      return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
    },
    invCdf: (prob, p) => {
      return genericInverseCDF((val) => DISTRIBUTIONS.student_t.cdf(val, p), prob, -15, 15);
    },
    getRange: (p) => {
      const bound = p.df <= 2 ? 6 : 4.5;
      return { min: -bound, max: bound };
    },
    realWorldContext:
      'Exemplo real: Testes clínicos de novos medicamentos com apenas 10 ou 15 pacientes, teste t para comparar médias amostrais.',
  },

  // 3. CHI-SQUARE
  chi_square: {
    id: 'chi_square',
    name: 'Distribuição Qui-Quadrado (χ²)',
    shortName: 'Qui-Quadrado',
    type: 'continuous',
    category: 'Contínua',
    tags: ['Variância', 'Tabelas de Contingência', 'Aderência'],
    parameters: [
      {
        id: 'df',
        name: 'Graus de Liberdade (k)',
        symbol: 'k',
        min: 1,
        max: 40,
        step: 1,
        defaultValue: 4,
        integerOnly: true,
        description: 'Soma de k variáveis normais padronizadas independentes ao quadrado.',
      },
    ],
    description:
      'Distribuição positiva e assimétrica. Usada em testes de hipóteses de independência, qualidade de ajuste (goodness-of-fit) e intervalos de confiança para a variância.',
    formulaLatex: {
      pdf: 'f(x) = \\frac{1}{2^{k/2}\\Gamma(k/2)} x^{k/2 - 1} e^{-x/2}, \\quad x > 0',
      cdf: 'F(x) = \\frac{\\gamma(k/2, x/2)}{\\Gamma(k/2)} = P\\left(\\frac{k}{2}, \\frac{x}{2}\\right)',
    },
    moments: (p) => ({
      mean: p.df,
      variance: 2 * p.df,
      stdDev: Math.sqrt(2 * p.df),
      skewness: Math.sqrt(8 / p.df),
      kurtosis: 12 / p.df,
    }),
    pdf: (x, p) => {
      if (x <= 0) return 0;
      const k = p.df;
      return (
        Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.LN2 - logGamma(k / 2))
      );
    },
    cdf: (x, p) => {
      if (x <= 0) return 0;
      return gammap(p.df / 2, x / 2);
    },
    invCdf: (prob, p) => {
      return genericInverseCDF((val) => DISTRIBUTIONS.chi_square.cdf(val, p), prob, 0.001, p.df * 4 + 10);
    },
    getRange: (p) => ({ min: 0, max: Math.max(12, p.df + 4 * Math.sqrt(2 * p.df)) }),
    realWorldContext:
      'Exemplo real: Verificar se um dado de 6 faces é honesto (teste de aderência), verificar correlação entre hábito de fumar e hipertensão.',
  },

  // 4. FISHER-SNEDECOR (F)
  fisher_f: {
    id: 'fisher_f',
    name: 'Distribuição F de Fisher-Snedecor',
    shortName: 'F de Fisher',
    type: 'continuous',
    category: 'Contínua',
    tags: ['ANOVA', 'Razão de Variâncias', 'Regressão'],
    parameters: [
      {
        id: 'd1',
        name: 'Graus de Liberdade 1 (d₁)',
        symbol: 'd₁',
        min: 1,
        max: 30,
        step: 1,
        defaultValue: 5,
        integerOnly: true,
        description: 'Graus de liberdade do numerador.',
      },
      {
        id: 'd2',
        name: 'Graus de Liberdade 2 (d₂)',
        symbol: 'd₂',
        min: 1,
        max: 30,
        step: 1,
        defaultValue: 10,
        integerOnly: true,
        description: 'Graus de liberdade do denominador.',
      },
    ],
    description:
      'Distribuição da razão de duas variâncias amostrais independentes. Pilar da Análise de Variância (ANOVA) e testes de significância global em regressão linear.',
    formulaLatex: {
      pdf: 'f(x) = \\frac{1}{B(d_1/2, d_2/2)} \\left(\\frac{d_1}{d_2}\\right)^{\\frac{d_1}{2}} x^{\\frac{d_1}{2}-1} \\left(1+\\frac{d_1}{d_2}x\\right)^{-\\frac{d_1+d_2}{2}}',
      cdf: 'F(x) = I_{\\frac{d_1 x}{d_1 x + d_2}}\\left(\\frac{d_1}{2}, \\frac{d_2}{2}\\right)',
    },
    moments: (p) => {
      const { d1, d2 } = p;
      return {
        mean: d2 > 2 ? d2 / (d2 - 2) : 'Indefinido',
        variance: d2 > 4 ? (2 * d2 * d2 * (d1 + d2 - 2)) / (d1 * (d2 - 2) * (d2 - 2) * (d2 - 4)) : 'N/A',
        stdDev: d2 > 4 ? Math.sqrt((2 * d2 * d2 * (d1 + d2 - 2)) / (d1 * (d2 - 2) * (d2 - 2) * (d2 - 4))) : 'N/A',
        skewness: d2 > 6 ? ((2 * d1 + d2 - 2) * Math.sqrt(8 * (d2 - 4))) / ((d2 - 6) * Math.sqrt(d1 * (d1 + d2 - 2))) : 'N/A',
        kurtosis: d2 > 8 ? 'Cálculo analítico complexo' : 'N/A',
      };
    },
    pdf: (x, p) => {
      if (x <= 0) return 0;
      const { d1, d2 } = p;
      const num = Math.pow(d1 * x, d1) * Math.pow(d2, d2) / Math.pow(d1 * x + d2, d1 + d2);
      return Math.sqrt(num) / (x * beta(d1 / 2, d2 / 2));
    },
    cdf: (x, p) => {
      if (x <= 0) return 0;
      const { d1, d2 } = p;
      const z = (d1 * x) / (d1 * x + d2);
      return betainc(z, d1 / 2, d2 / 2);
    },
    invCdf: (prob, p) => {
      return genericInverseCDF((val) => DISTRIBUTIONS.fisher_f.cdf(val, p), prob, 0.001, 20);
    },
    getRange: (p) => ({ min: 0, max: Math.max(6, (p.d2 > 2 ? p.d2 / (p.d2 - 2) : 2) * 3.5) }),
    realWorldContext:
      'Exemplo real: Comparar a eficácia de 3 métodos diferentes de ensino (ANOVA), verificar se dois laboratórios têm a mesma precisão de medição.',
  },

  // 5. EXPONENCIAL
  exponential: {
    id: 'exponential',
    name: 'Distribuição Exponencial',
    shortName: 'Exponencial',
    type: 'continuous',
    category: 'Contínua',
    tags: ['Tempo de Espera', 'Confiabilidade', 'Sem Memória'],
    parameters: [
      {
        id: 'lambda',
        name: 'Taxa (λ)',
        symbol: 'λ',
        min: 0.1,
        max: 5,
        step: 0.1,
        defaultValue: 1,
        description: 'Taxa média de ocorrência por unidade de tempo (λ > 0).',
      },
    ],
    description:
      'Modela o tempo decorrido entre eventos em um processo de Poisson. Possui a notável propriedade de "falta de memória".',
    formulaLatex: {
      pdf: 'f(x) = \\lambda e^{-\\lambda x}, \\quad x \\ge 0',
      cdf: 'F(x) = 1 - e^{-\\lambda x}, \\quad x \\ge 0',
    },
    moments: (p) => ({
      mean: 1 / p.lambda,
      variance: 1 / (p.lambda * p.lambda),
      stdDev: 1 / p.lambda,
      skewness: 2,
      kurtosis: 6,
    }),
    pdf: (x, p) => (x < 0 ? 0 : p.lambda * Math.exp(-p.lambda * x)),
    cdf: (x, p) => (x < 0 ? 0 : 1 - Math.exp(-p.lambda * x)),
    invCdf: (prob, p) => (prob >= 1 ? Infinity : -Math.log(1 - prob) / p.lambda),
    getRange: (p) => ({ min: 0, max: 4.5 / p.lambda }),
    realWorldContext:
      'Exemplo real: Tempo até que uma lâmpada LED queime, tempo de espera na fila até o próximo atendimento bancário.',
  },

  // 6. GAMA
  gamma: {
    id: 'gamma',
    name: 'Distribuição Gama',
    shortName: 'Gama',
    type: 'continuous',
    category: 'Contínua',
    tags: ['Tempo Acumulado', 'Seguros', 'Modelos Bayesianos'],
    parameters: [
      {
        id: 'shape',
        name: 'Forma (k ou α)',
        symbol: 'α',
        min: 0.5,
        max: 10,
        step: 0.5,
        defaultValue: 3,
        description: 'Parâmetro de forma da distribuição.',
      },
      {
        id: 'rate',
        name: 'Taxa (β)',
        symbol: 'β',
        min: 0.2,
        max: 5,
        step: 0.2,
        defaultValue: 1,
        description: 'Parâmetro de taxa (inverso da escala θ).',
      },
    ],
    description:
      'Generalização contínua da distribuição exponencial. Modela a soma de k variáveis exponenciais (ex: tempo até o k-ésimo evento ocorrer).',
    formulaLatex: {
      pdf: 'f(x) = \\frac{\\beta^\\alpha}{\\Gamma(\\alpha)} x^{\\alpha - 1} e^{-\\beta x}, \\quad x > 0',
      cdf: 'F(x) = \\frac{\\gamma(\\alpha, \\beta x)}{\\Gamma(\\alpha)} = P(\\alpha, \\beta x)',
    },
    moments: (p) => ({
      mean: p.shape / p.rate,
      variance: p.shape / (p.rate * p.rate),
      stdDev: Math.sqrt(p.shape) / p.rate,
      skewness: 2 / Math.sqrt(p.shape),
      kurtosis: 6 / p.shape,
    }),
    pdf: (x, p) => {
      if (x <= 0) return 0;
      const { shape: a, rate: b } = p;
      return Math.exp(a * Math.log(b) - logGamma(a) + (a - 1) * Math.log(x) - b * x);
    },
    cdf: (x, p) => {
      if (x <= 0) return 0;
      return gammap(p.shape, p.rate * x);
    },
    invCdf: (prob, p) => {
      const mean = p.shape / p.rate;
      return genericInverseCDF((val) => DISTRIBUTIONS.gamma.cdf(val, p), prob, 0.001, mean * 4 + 5);
    },
    getRange: (p) => ({ min: 0, max: (p.shape / p.rate) + 4 * (Math.sqrt(p.shape) / p.rate) }),
    realWorldContext:
      'Exemplo real: Tempo acumulado até ocorrerem 3 falhas de servidores, volume de precipitação pluviométrica em hidrologia.',
  },

  // 7. BETA
  beta_dist: {
    id: 'beta_dist',
    name: 'Distribuição Beta',
    shortName: 'Beta',
    type: 'continuous',
    category: 'Contínua',
    tags: ['Proporções', 'Probabilidades', 'A priori Bayesiana'],
    parameters: [
      {
        id: 'alpha',
        name: 'Alfa (α)',
        symbol: 'α',
        min: 0.5,
        max: 10,
        step: 0.5,
        defaultValue: 2,
        description: 'Primeiro parâmetro de forma (interpretação Bayesiana: sucessos + 1).',
      },
      {
        id: 'beta',
        name: 'Beta (β)',
        symbol: 'β',
        min: 0.5,
        max: 10,
        step: 0.5,
        defaultValue: 5,
        description: 'Segundo parâmetro de forma (interpretação Bayesiana: fracassos + 1).',
      },
    ],
    description:
      'Distribuição definida no intervalo limitado [0, 1]. Perfeita para modelar proporções, taxas de conversão, porcentagens e probabilidades a priori na inferência Bayesiana.',
    formulaLatex: {
      pdf: 'f(x) = \\frac{x^{\\alpha - 1}(1-x)^{\\beta - 1}}{B(\\alpha, \\beta)}, \\quad 0 \\le x \\le 1',
      cdf: 'F(x) = I_x(\\alpha, \\beta)',
    },
    moments: (p) => {
      const { alpha: a, beta: b } = p;
      const mean = a / (a + b);
      const variance = (a * b) / ((a + b) * (a + b) * (a + b + 1));
      return {
        mean,
        variance,
        stdDev: Math.sqrt(variance),
        skewness: (2 * (b - a) * Math.sqrt(a + b + 1)) / ((a + b + 2) * Math.sqrt(a * b)),
        kurtosis: 'Depende de α e β',
      };
    },
    pdf: (x, p) => {
      if (x <= 0 || x >= 1) return 0;
      const { alpha: a, beta: b } = p;
      return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logBeta(a, b));
    },
    cdf: (x, p) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      return betainc(x, p.alpha, p.beta);
    },
    invCdf: (prob, p) => {
      return genericInverseCDF((val) => DISTRIBUTIONS.beta_dist.cdf(val, p), prob, 0.0001, 0.9999);
    },
    getRange: () => ({ min: 0, max: 1 }),
    realWorldContext:
      'Exemplo real: Taxa de cliques (CTR) em campanhas de marketing, proporção de votos válidos de um candidato em pesquisa eleitoral.',
  },

  // 8. WEIBULL
  weibull: {
    id: 'weibull',
    name: 'Distribuição Weibull',
    shortName: 'Weibull',
    type: 'continuous',
    category: 'Contínua',
    tags: ['Confiabilidade', 'Engenharia', 'Velocidade do Vento'],
    parameters: [
      {
        id: 'k',
        name: 'Forma (k)',
        symbol: 'k',
        min: 0.5,
        max: 5,
        step: 0.25,
        defaultValue: 1.5,
        description: 'Se k < 1: taxa de falha diminui; k = 1: Exponencial; k > 1: desgaste mecânico.',
      },
      {
        id: 'lambda',
        name: 'Escala (λ)',
        symbol: 'λ',
        min: 0.5,
        max: 10,
        step: 0.5,
        defaultValue: 2,
        description: 'Vida característica do componente (ponto de 63.2% de probabilidade acumulada).',
      },
    ],
    description:
      'Amplamente utilizada em engenharia de confiabilidade e análise de sobrevivência para modelar o tempo até a falha com desgaste.',
    formulaLatex: {
      pdf: 'f(x) = \\frac{k}{\\lambda}\\left(\\frac{x}{\\lambda}\\right)^{k-1} e^{-(x/\\lambda)^k}, \\quad x \\ge 0',
      cdf: 'F(x) = 1 - e^{-(x/\\lambda)^k}, \\quad x \\ge 0',
    },
    moments: (p) => {
      const { k, lambda: l } = p;
      const g1 = gamma(1 + 1 / k);
      const g2 = gamma(1 + 2 / k);
      const mean = l * g1;
      const variance = l * l * (g2 - g1 * g1);
      return {
        mean,
        variance,
        stdDev: Math.sqrt(variance),
        skewness: 'Função de Gamma(1 + 3/k)',
        kurtosis: 'Função de Gamma',
      };
    },
    pdf: (x, p) => {
      if (x < 0) return 0;
      const { k, lambda: l } = p;
      return (k / l) * Math.pow(x / l, k - 1) * Math.exp(-Math.pow(x / l, k));
    },
    cdf: (x, p) => {
      if (x < 0) return 0;
      const { k, lambda: l } = p;
      return 1 - Math.exp(-Math.pow(x / l, k));
    },
    invCdf: (prob, p) => {
      if (prob >= 1) return Infinity;
      const { k, lambda: l } = p;
      return l * Math.pow(-Math.log(1 - prob), 1 / k);
    },
    getRange: (p) => ({ min: 0, max: p.lambda * 3.5 }),
    realWorldContext:
      'Exemplo real: Tempo de vida útil de rolamentos automotivos, distribuição da velocidade do vento para turbinas eólicas.',
  },

  // 9. UNIFORME CONTÍNUA
  uniform_cont: {
    id: 'uniform_cont',
    name: 'Distribuição Uniforme Contínua',
    shortName: 'Uniforme',
    type: 'continuous',
    category: 'Contínua',
    tags: ['Equiprovável', 'Gerador Randômico'],
    parameters: [
      {
        id: 'a',
        name: 'Mínimo (a)',
        symbol: 'a',
        min: -20,
        max: 20,
        step: 1,
        defaultValue: 0,
        description: 'Limite inferior do intervalo.',
      },
      {
        id: 'b',
        name: 'Máximo (b)',
        symbol: 'b',
        min: -10,
        max: 40,
        step: 1,
        defaultValue: 10,
        description: 'Limite superior do intervalo (b > a).',
      },
    ],
    description:
      'Todos os valores dentro do intervalo [a, b] possuem exatamente a mesma densidade de probabilidade. É a base dos geradores de números aleatórios.',
    formulaLatex: {
      pdf: 'f(x) = \\frac{1}{b - a}, \\quad a \\le x \\le b',
      cdf: 'F(x) = \\frac{x - a}{b - a}, \\quad a \\le x \\le b',
    },
    moments: (p) => {
      const a = p.a;
      const b = Math.max(a + 0.1, p.b);
      return {
        mean: (a + b) / 2,
        variance: Math.pow(b - a, 2) / 12,
        stdDev: (b - a) / Math.sqrt(12),
        skewness: 0,
        kurtosis: -1.2,
      };
    },
    pdf: (x, p) => {
      const a = p.a;
      const b = Math.max(a + 0.001, p.b);
      return x >= a && x <= b ? 1 / (b - a) : 0;
    },
    cdf: (x, p) => {
      const a = p.a;
      const b = Math.max(a + 0.001, p.b);
      if (x < a) return 0;
      if (x > b) return 1;
      return (x - a) / (b - a);
    },
    invCdf: (prob, p) => {
      const a = p.a;
      const b = Math.max(a + 0.001, p.b);
      return a + prob * (b - a);
    },
    getRange: (p) => {
      const a = p.a;
      const b = Math.max(a + 0.1, p.b);
      const span = b - a;
      return { min: a - span * 0.15, max: b + span * 0.15 };
    },
    realWorldContext:
      'Exemplo real: Tempo de chegada de um ônibus circular regular que passa a cada 10 minutos (chegar entre o minuto 0 e 10).',
  },

  // 10. BINOMIAL (DISCRETE)
  binomial: {
    id: 'binomial',
    name: 'Distribuição Binomial',
    shortName: 'Binomial',
    type: 'discrete',
    category: 'Discreta',
    tags: ['Bernoulli', 'Tentativas', 'Sucessos'],
    parameters: [
      {
        id: 'n',
        name: 'Ensaios (n)',
        symbol: 'n',
        min: 1,
        max: 80,
        step: 1,
        defaultValue: 20,
        integerOnly: true,
        description: 'Número total de ensaios de Bernoulli independentes.',
      },
      {
        id: 'p',
        name: 'Probabilidade de Sucesso (p)',
        symbol: 'p',
        min: 0.01,
        max: 0.99,
        step: 0.05,
        defaultValue: 0.5,
        description: 'Probabilidade constante de sucesso em cada ensaio.',
      },
    ],
    description:
      'Modela o número de sucessos em n ensaios independentes de Bernoulli com probabilidade constante p. Quando n é grande, converge para Poisson (se p for pequeno) ou para a Normal.',
    formulaLatex: {
      pdf: 'P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}, \\quad k \\in \\{0, 1, \\dots, n\\}',
      cdf: 'P(X \\le k) = I_{1-p}(n-k, k+1)',
    },
    moments: (p) => ({
      mean: p.n * p.p,
      variance: p.n * p.p * (1 - p.p),
      stdDev: Math.sqrt(p.n * p.p * (1 - p.p)),
      skewness: (1 - 2 * p.p) / Math.sqrt(p.n * p.p * (1 - p.p)),
      kurtosis: (1 - 6 * p.p * (1 - p.p)) / (p.n * p.p * (1 - p.p)),
    }),
    pdf: (k, p) => {
      const n = Math.round(p.n);
      const prob = p.p;
      const intK = Math.round(k);
      if (intK < 0 || intK > n) return 0;
      return Math.exp(logChoose(n, intK) + intK * Math.log(prob) + (n - intK) * Math.log(1 - prob));
    },
    cdf: (k, p) => {
      const n = Math.round(p.n);
      const prob = p.p;
      const intK = Math.floor(k);
      if (intK < 0) return 0;
      if (intK >= n) return 1;
      return betainc(1 - prob, n - intK, intK + 1);
    },
    invCdf: (prob, p) => {
      const n = Math.round(p.n);
      let cumulative = 0;
      for (let k = 0; k <= n; k++) {
        cumulative += DISTRIBUTIONS.binomial.pdf(k, p);
        if (cumulative >= prob) return k;
      }
      return n;
    },
    getRange: (p) => ({ min: 0, max: Math.round(p.n) }),
    realWorldContext:
      'Exemplo real: Número de peças defeituosas em um lote de 20 itens, quantidade de eleitores favoráveis em amostra de 50 pessoas.',
  },

  // 11. POISSON (DISCRETE)
  poisson: {
    id: 'poisson',
    name: 'Distribuição de Poisson',
    shortName: 'Poisson',
    type: 'discrete',
    category: 'Discreta',
    tags: ['Eventos Raros', 'Contagem', 'Fila'],
    parameters: [
      {
        id: 'lambda',
        name: 'Média de Ocorrências (λ)',
        symbol: 'λ',
        min: 0.2,
        max: 30,
        step: 0.5,
        defaultValue: 4,
        description: 'Número médio de ocorrências no intervalo de tempo ou espaço.',
      },
    ],
    description:
      'Modela o número de eventos que ocorrem em um intervalo fixo com taxa média λ conhecida e eventos independentes entre si. Média e variância são exatamente iguais a λ.',
    formulaLatex: {
      pdf: 'P(X = k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}, \\quad k \\in \\{0, 1, 2, \\dots\\}',
      cdf: 'P(X \\le k) = Q(k+1, \\lambda) = 1 - P(k+1, \\lambda)',
    },
    moments: (p) => ({
      mean: p.lambda,
      variance: p.lambda,
      stdDev: Math.sqrt(p.lambda),
      skewness: 1 / Math.sqrt(p.lambda),
      kurtosis: 1 / p.lambda,
    }),
    pdf: (k, p) => {
      const intK = Math.round(k);
      if (intK < 0) return 0;
      return Math.exp(intK * Math.log(p.lambda) - p.lambda - logFactorial(intK));
    },
    cdf: (k, p) => {
      const intK = Math.floor(k);
      if (intK < 0) return 0;
      return 1 - gammap(intK + 1, p.lambda);
    },
    invCdf: (prob, p) => {
      let cumulative = 0;
      const maxK = Math.ceil(p.lambda + 6 * Math.sqrt(p.lambda) + 10);
      for (let k = 0; k <= maxK; k++) {
        cumulative += DISTRIBUTIONS.poisson.pdf(k, p);
        if (cumulative >= prob) return k;
      }
      return maxK;
    },
    getRange: (p) => ({
      min: 0,
      max: Math.max(10, Math.ceil(p.lambda + 3.8 * Math.sqrt(p.lambda))),
    }),
    realWorldContext:
      'Exemplo real: Número de chamadas telefônicas recebidas por minuto em um call center, quantidade de acessos por segundo a um servidor web.',
  },

  // 12. GEOMÉTRICA (DISCRETE)
  geometric: {
    id: 'geometric',
    name: 'Distribuição Geométrica',
    shortName: 'Geométrica',
    type: 'discrete',
    category: 'Discreta',
    tags: ['Tentativas até Sucesso', 'Bernoulli'],
    parameters: [
      {
        id: 'p',
        name: 'Probabilidade de Sucesso (p)',
        symbol: 'p',
        min: 0.05,
        max: 0.95,
        step: 0.05,
        defaultValue: 0.3,
        description: 'Probabilidade de sucesso em cada tentativa independente.',
      },
    ],
    description:
      'Modela o número de ensaios de Bernoulli até a ocorrência do primeiro sucesso (versão suportada em k = 1, 2, 3...). É o equivalente discreto da Exponencial.',
    formulaLatex: {
      pdf: 'P(X = k) = (1-p)^{k-1} p, \\quad k \\in \\{1, 2, 3, \\dots\\}',
      cdf: 'P(X \\le k) = 1 - (1-p)^k',
    },
    moments: (p) => ({
      mean: 1 / p.p,
      variance: (1 - p.p) / (p.p * p.p),
      stdDev: Math.sqrt(1 - p.p) / p.p,
      skewness: (2 - p.p) / Math.sqrt(1 - p.p),
      kurtosis: 6 + (p.p * p.p) / (1 - p.p),
    }),
    pdf: (k, p) => {
      const intK = Math.round(k);
      if (intK < 1) return 0;
      return Math.pow(1 - p.p, intK - 1) * p.p;
    },
    cdf: (k, p) => {
      const intK = Math.floor(k);
      if (intK < 1) return 0;
      return 1 - Math.pow(1 - p.p, intK);
    },
    invCdf: (prob, p) => {
      if (prob <= 0) return 1;
      if (prob >= 1) return Infinity;
      return Math.ceil(Math.log(1 - prob) / Math.log(1 - p.p));
    },
    getRange: (p) => ({
      min: 1,
      max: Math.max(10, Math.ceil(4 / p.p)),
    }),
    realWorldContext:
      'Exemplo real: Número de tentativas de login até acertar a senha, número de entrevistas de emprego até conseguir a primeira vaga.',
  },

  // 13. HIPERGEOMÉTRICA (DISCRETE)
  hypergeometric: {
    id: 'hypergeometric',
    name: 'Distribuição Hipergeométrica',
    shortName: 'Hipergeométrica',
    type: 'discrete',
    category: 'Discreta',
    tags: ['Sem Reposição', 'Urna', 'Amostragem Finita'],
    parameters: [
      {
        id: 'N',
        name: 'População (N)',
        symbol: 'N',
        min: 10,
        max: 100,
        step: 5,
        defaultValue: 50,
        integerOnly: true,
        description: 'Tamanho total da população finita.',
      },
      {
        id: 'K',
        name: 'Sucessos na População (K)',
        symbol: 'K',
        min: 1,
        max: 50,
        step: 1,
        defaultValue: 15,
        integerOnly: true,
        description: 'Número de itens com a característica de interesse na população.',
      },
      {
        id: 'n',
        name: 'Amostra (n)',
        symbol: 'n',
        min: 1,
        max: 30,
        step: 1,
        defaultValue: 10,
        integerOnly: true,
        description: 'Tamanho da amostra retirada sem reposição.',
      },
    ],
    description:
      'Modela o número de sucessos em uma amostra de tamanho n retirada sem reposição de uma população finita N que contém K sucessos.',
    formulaLatex: {
      pdf: 'P(X = k) = \\frac{\\binom{K}{k} \\binom{N-K}{n-k}}{\\binom{N}{n}}',
      cdf: 'P(X \\le k) = \\sum_{i=0}^k P(X = i)',
    },
    moments: (p) => {
      const N = p.N;
      const K = Math.min(p.K, N);
      const n = Math.min(p.n, N);
      const mean = (n * K) / N;
      const variance = (n * (K / N) * (1 - K / N) * (N - n)) / (N - 1);
      return {
        mean,
        variance,
        stdDev: Math.sqrt(variance),
        skewness: 'Fórmula finita',
        kurtosis: 'Fórmula finita',
      };
    },
    pdf: (k, p) => {
      const N = Math.round(p.N);
      const K = Math.min(Math.round(p.K), N);
      const n = Math.min(Math.round(p.n), N);
      const intK = Math.round(k);
      const minK = Math.max(0, n - (N - K));
      const maxK = Math.min(n, K);
      if (intK < minK || intK > maxK) return 0;
      return Math.exp(logChoose(K, intK) + logChoose(N - K, n - intK) - logChoose(N, n));
    },
    cdf: (k, p) => {
      const intK = Math.floor(k);
      const N = Math.round(p.N);
      const K = Math.min(Math.round(p.K), N);
      const n = Math.min(Math.round(p.n), N);
      const minK = Math.max(0, n - (N - K));
      const maxK = Math.min(n, K);
      if (intK < minK) return 0;
      if (intK >= maxK) return 1;

      let sum = 0;
      for (let i = minK; i <= intK; i++) {
        sum += DISTRIBUTIONS.hypergeometric.pdf(i, p);
      }
      return sum;
    },
    invCdf: (prob, p) => {
      const N = Math.round(p.N);
      const K = Math.min(Math.round(p.K), N);
      const n = Math.min(Math.round(p.n), N);
      const minK = Math.max(0, n - (N - K));
      const maxK = Math.min(n, K);
      let cumulative = 0;
      for (let k = minK; k <= maxK; k++) {
        cumulative += DISTRIBUTIONS.hypergeometric.pdf(k, p);
        if (cumulative >= prob) return k;
      }
      return maxK;
    },
    getRange: (p) => {
      const N = Math.round(p.N);
      const K = Math.min(Math.round(p.K), N);
      const n = Math.min(Math.round(p.n), N);
      return {
        min: Math.max(0, n - (N - K)),
        max: Math.min(n, K),
      };
    },
    realWorldContext:
      'Exemplo real: Tirar 5 cartas de um baralho de 52 e contar quantos Ases saíram, sortear 10 funcionários de uma empresa de 100 para auditoria.',
  },
};

// Available calculation modes
export type TailMode = 'leq' | 'geq' | 'between' | 'two_tail' | 'equal';

export interface CalculationResult {
  probability: number;
  probabilityPercent: string;
  expressionText: string;
  mode: TailMode;
  x1: number;
  x2: number;
  z1?: number;
  z2?: number;
  distribution: DistributionInfo;
  params: Record<string, number>;
}

/**
 * Calculates probability according to selected tail mode.
 */
export function calculateProbability(
  dist: DistributionInfo,
  params: Record<string, number>,
  mode: TailMode,
  x1: number,
  x2: number
): CalculationResult {
  const cdf = dist.cdf;
  const pdf = dist.pdf;

  let probability = 0;
  let expressionText = '';

  const formatVal = (v: number) => {
    return Number.isInteger(v) ? v.toString() : v.toFixed(3).replace(/\.?0+$/, '');
  };

  switch (mode) {
    case 'leq': {
      probability = cdf(x1, params);
      expressionText = `P(X ≤ ${formatVal(x1)})`;
      break;
    }
    case 'geq': {
      if (dist.type === 'discrete') {
        // P(X >= x) = 1 - P(X <= x - 1)
        probability = 1 - cdf(x1 - 1, params);
      } else {
        probability = 1 - cdf(x1, params);
      }
      expressionText = `P(X ≥ ${formatVal(x1)})`;
      break;
    }
    case 'between': {
      const low = Math.min(x1, x2);
      const high = Math.max(x1, x2);
      if (dist.type === 'discrete') {
        // P(low <= X <= high) = F(high) - F(low - 1)
        probability = cdf(high, params) - cdf(low - 1, params);
      } else {
        probability = cdf(high, params) - cdf(low, params);
      }
      expressionText = `P(${formatVal(low)} ≤ X ≤ ${formatVal(high)})`;
      break;
    }
    case 'two_tail': {
      const low = Math.min(x1, x2);
      const high = Math.max(x1, x2);
      if (dist.type === 'discrete') {
        probability = cdf(low, params) + (1 - cdf(high - 1, params));
      } else {
        probability = cdf(low, params) + (1 - cdf(high, params));
      }
      expressionText = `P(X ≤ ${formatVal(low)} ∪ X ≥ ${formatVal(high)})`;
      break;
    }
    case 'equal': {
      probability = pdf(x1, params);
      expressionText = `P(X = ${formatVal(x1)})`;
      break;
    }
  }

  // Clamp probability into [0, 1] range to eliminate numerical floating drift
  probability = Math.max(0, Math.min(1, probability));
  const probabilityPercent = (probability * 100).toFixed(2) + '%';

  let z1: number | undefined;
  let z2: number | undefined;
  if (dist.id === 'normal') {
    const mu = params.mu;
    const sigma = params.sigma;
    z1 = (x1 - mu) / sigma;
    z2 = (x2 - mu) / sigma;
  }

  return {
    probability,
    probabilityPercent,
    expressionText,
    mode,
    x1,
    x2,
    z1,
    z2,
    distribution: dist,
    params,
  };
}
