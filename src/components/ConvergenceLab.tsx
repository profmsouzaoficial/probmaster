/**
 * Convergence & Theorems Lab (Laboratório de Convergência & Teoremas)
 * Interactive laboratory for exploring:
 * 1. Central Limit Theorem (TLC)
 * 2. Binomial -> Poisson convergence (Law of Rare Events)
 * 3. Binomial -> Normal convergence (De Moivre-Laplace)
 * 4. Student-t -> Standard Normal convergence (df -> inf)
 */

import React, { useState } from 'react';
import { DISTRIBUTIONS } from '../math/distributions';
import { ArrowRight, RefreshCw, Sparkles, BookOpen, Layers } from 'lucide-react';

type LabExperiment = 'clt' | 'binomial_poisson' | 'binomial_normal' | 'student_normal';

interface ConvergenceLabProps {
  theme?: 'light' | 'dark';
}

export const ConvergenceLab: React.FC<ConvergenceLabProps> = ({ theme = 'light' }) => {
  const isDark = theme === 'dark';
  const [activeExp, setActiveExp] = useState<LabExperiment>('clt');

  // CLT state
  const [cltSampleN, setCltSampleN] = useState<number>(12);
  const [cltPopType, setCltPopType] = useState<'exponential' | 'uniform' | 'bimodal'>('exponential');

  // Binomial -> Poisson state
  const [bpLambda, setBpLambda] = useState<number>(4);
  const [bpN, setBpN] = useState<number>(30);

  // Binomial -> Normal state
  const [bnN, setBnN] = useState<number>(25);
  const [bnP, setBnP] = useState<number>(0.4);

  // Student-t -> Normal state
  const [tDf, setTDf] = useState<number>(4);

  // SVG dimensions
  const width = 640;
  const height = 280;
  const pad = { top: 24, right: 30, bottom: 36, left: 45 };
  const pW = width - pad.left - pad.right;
  const pH = height - pad.top - pad.bottom;

  // Render SVG based on active experiment
  const renderExperimentChart = () => {
    switch (activeExp) {
      case 'clt': {
        // Population vs Sample Mean Distribution
        // Let population have mean mu and stdDev sigma
        let mu = 1;
        let sigma = 1;
        if (cltPopType === 'exponential') {
          mu = 2; // mean = 2 (lambda = 0.5)
          sigma = 2;
        } else if (cltPopType === 'uniform') {
          mu = 5; // [0, 10]
          sigma = 10 / Math.sqrt(12);
        } else {
          // bimodal
          mu = 5;
          sigma = 2.5;
        }

        const sampleSigma = sigma / Math.sqrt(cltSampleN);
        const xMin = Math.max(0, mu - 3.8 * sigma);
        const xMax = mu + 3.8 * sigma;
        const xSpan = xMax - xMin;

        // Sample mean normal approximation
        const normDist = DISTRIBUTIONS.normal;
        const normParams = { mu, sigma: sampleSigma };

        let maxNormY = normDist.pdf(mu, normParams) * 1.15;
        if (!isFinite(maxNormY) || maxNormY <= 0) maxNormY = 1;

        const toX = (val: number) => pad.left + ((val - xMin) / xSpan) * pW;
        const toY = (val: number) => pad.top + pH - (val / maxNormY) * pH;

        let samplePathD = '';
        const steps = 120;
        for (let i = 0; i <= steps; i++) {
          const curX = xMin + (i / steps) * xSpan;
          const curY = normDist.pdf(curX, normParams);
          const sx = toX(curX);
          const sy = toY(curY);
          samplePathD += i === 0 ? `M ${sx} ${sy}` : ` L ${sx} ${sy}`;
        }

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {/* Grid */}
            <line x1={pad.left} y1={pad.top + pH} x2={pad.left + pW} y2={pad.top + pH} stroke="#475569" strokeWidth="1.5" />
            <line x1={toX(mu)} y1={pad.top} x2={toX(mu)} y2={pad.top + pH} stroke="#38bdf8" strokeDasharray="3 3" strokeWidth="1.5" />

            {/* Normal curve of sample mean */}
            <path d={samplePathD} fill="none" stroke="#818cf8" strokeWidth="3" />
            
            {/* Shaded Area under sample mean */}
            <path
              d={`${samplePathD} L ${toX(xMax)} ${pad.top + pH} L ${toX(xMin)} ${pad.top + pH} Z`}
              fill="#6366f1"
              fillOpacity="0.2"
            />

            {/* Labels */}
            <text x={toX(mu)} y={pad.top + 14} fill="#38bdf8" fontSize="11" fontFamily="monospace" textAnchor="middle">
              μ = {mu.toFixed(1)}
            </text>
            <text x={toX(mu + sampleSigma)} y={toY(normDist.pdf(mu + sampleSigma, normParams)) - 8} fill="#a5b4fc" fontSize="10" fontFamily="monospace">
              +1σ/√n ({sampleSigma.toFixed(2)})
            </text>

            <text x={pad.left + 8} y={pad.top + 16} fill="#94a3b8" fontSize="11" fontFamily="sans-serif">
              Distribuição da Média Amostral X̄ ~ N(μ, σ²/n)
            </text>
          </svg>
        );
      }

      case 'binomial_poisson': {
        // Overlay Binomial(n, p=lambda/n) and Poisson(lambda)
        const p = Math.min(0.99, bpLambda / bpN);
        const binom = DISTRIBUTIONS.binomial;
        const poisson = DISTRIBUTIONS.poisson;

        const maxK = Math.max(12, Math.ceil(bpLambda + 3.5 * Math.sqrt(bpLambda)));
        const binomParams = { n: bpN, p };
        const poissonParams = { lambda: bpLambda };

        let maxY = 0.001;
        for (let k = 0; k <= maxK; k++) {
          const y1 = binom.pdf(k, binomParams);
          const y2 = poisson.pdf(k, poissonParams);
          if (y1 > maxY) maxY = y1;
          if (y2 > maxY) maxY = y2;
        }
        maxY *= 1.25;

        const toX = (k: number) => pad.left + (k / maxK) * pW;
        const toY = (val: number) => pad.top + pH - (val / maxY) * pH;

        // Calculate max difference (TV error)
        let maxDiff = 0;
        for (let k = 0; k <= maxK; k++) {
          const diff = Math.abs(binom.pdf(k, binomParams) - poisson.pdf(k, poissonParams));
          if (diff > maxDiff) maxDiff = diff;
        }

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            <line x1={pad.left} y1={pad.top + pH} x2={pad.left + pW} y2={pad.top + pH} stroke="#475569" strokeWidth="1.5" />

            {/* Stems */}
            {Array.from({ length: maxK + 1 }, (_, k) => {
              const bY = binom.pdf(k, binomParams);
              const pY = poisson.pdf(k, poissonParams);
              const sx = toX(k);

              return (
                <g key={k}>
                  {/* Binomial Bar */}
                  <rect x={sx - 7} y={toY(bY)} width={6} height={Math.max(1, pad.top + pH - toY(bY))} fill="#38bdf8" fillOpacity="0.85" rx="2" />
                  {/* Poisson Bar */}
                  <rect x={sx + 1} y={toY(pY)} width={6} height={Math.max(1, pad.top + pH - toY(pY))} fill="#c084fc" fillOpacity="0.85" rx="2" />
                  
                  <text x={sx} y={pad.top + pH + 16} fontSize="10" fontFamily="monospace" fill="#64748b" textAnchor="middle">
                    {k}
                  </text>
                </g>
              );
            })}

            {/* Error Indicator */}
            <text x={pad.left + 8} y={pad.top + 16} fill={isDark ? '#e2e8f0' : '#1e293b'} fontSize="11" fontFamily="sans-serif" fontWeight="600">
              Azul: Binomial(n={bpN}, p={(bpLambda/bpN).toFixed(3)}) · Roxo: Poisson(λ={bpLambda})
            </text>
            <text x={width - pad.right} y={pad.top + 16} fill={isDark ? '#34d399' : '#059669'} fontSize="11" fontFamily="monospace" textAnchor="end" fontWeight="bold">
              Erro Máximo: {(maxDiff * 100).toFixed(2)}%
            </text>
          </svg>
        );
      }

      case 'binomial_normal': {
        const binom = DISTRIBUTIONS.binomial;
        const norm = DISTRIBUTIONS.normal;
        const binParams = { n: bnN, p: bnP };
        const mu = bnN * bnP;
        const sigma = Math.sqrt(bnN * bnP * (1 - bnP));
        const normParams = { mu, sigma };

        const minK = Math.max(0, Math.floor(mu - 3.5 * sigma));
        const maxK = Math.min(bnN, Math.ceil(mu + 3.5 * sigma));
        const kSpan = Math.max(1, maxK - minK);

        let maxY = binom.pdf(Math.round(mu), binParams) * 1.25;

        const toX = (val: number) => pad.left + ((val - minK) / kSpan) * pW;
        const toY = (val: number) => pad.top + pH - (val / maxY) * pH;

        // Normal continuous path
        let normPath = '';
        for (let i = 0; i <= 100; i++) {
          const curVal = minK + (i / 100) * kSpan;
          const y = norm.pdf(curVal, normParams);
          const sx = toX(curVal);
          const sy = toY(y);
          normPath += i === 0 ? `M ${sx} ${sy}` : ` L ${sx} ${sy}`;
        }

        const np = bnN * bnP;
        const nq = bnN * (1 - bnP);
        const passesRule = np >= 5 && nq >= 5;

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            <line x1={pad.left} y1={pad.top + pH} x2={pad.left + pW} y2={pad.top + pH} stroke="#475569" strokeWidth="1.5" />

            {/* Discrete Binomial Bars */}
            {Array.from({ length: maxK - minK + 1 }, (_, i) => {
              const k = minK + i;
              const prob = binom.pdf(k, binParams);
              const sx = toX(k);
              const barW = Math.max(4, pW / (kSpan * 1.6));

              return (
                <rect
                  key={k}
                  x={sx - barW / 2}
                  y={toY(prob)}
                  width={barW}
                  height={Math.max(1, pad.top + pH - toY(prob))}
                  fill="#6366f1"
                  fillOpacity="0.45"
                  stroke="#818cf8"
                  strokeWidth="1"
                  rx="2"
                />
              );
            })}

            {/* Continuous Normal Approximation */}
            <path d={normPath} fill="none" stroke="#38bdf8" strokeWidth="3" />

            {/* Rule indicator */}
            <text x={pad.left + 8} y={pad.top + 16} fill={isDark ? '#e2e8f0' : '#1e293b'} fontSize="11" fontFamily="sans-serif" fontWeight="600">
              Histograma: Binomial · Linha Azul: Curva Normal N({mu.toFixed(1)}, {(sigma * sigma).toFixed(1)})
            </text>
            <text
              x={width - pad.right}
              y={pad.top + 16}
              fill={passesRule ? '#34d399' : '#f59e0b'}
              fontSize="11"
              fontFamily="monospace"
              textAnchor="end"
            >
              {passesRule ? '✓ np ≥ 5 e n(1-p) ≥ 5 (Aproximação Válida)' : '⚠ Atenção: n pequeno ou muito assimétrico'}
            </text>
          </svg>
        );
      }

      case 'student_normal': {
        const student = DISTRIBUTIONS.student_t;
        const norm = DISTRIBUTIONS.normal;
        const tParams = { df: tDf };
        const normParams = { mu: 0, sigma: 1 };

        const bound = 4.2;
        const toX = (val: number) => pad.left + ((val + bound) / (2 * bound)) * pW;
        const toY = (val: number) => pad.top + pH - (val / 0.46) * pH;

        let tPath = '';
        let normPath = '';

        for (let i = 0; i <= 120; i++) {
          const val = -bound + (i / 120) * (2 * bound);
          const ty = student.pdf(val, tParams);
          const ny = norm.pdf(val, normParams);

          const sx = toX(val);
          tPath += i === 0 ? `M ${sx} ${toY(ty)}` : ` L ${sx} ${toY(ty)}`;
          normPath += i === 0 ? `M ${sx} ${toY(ny)}` : ` L ${sx} ${toY(ny)}`;
        }

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            <line x1={pad.left} y1={pad.top + pH} x2={pad.left + pW} y2={pad.top + pH} stroke="#475569" strokeWidth="1.5" />
            <line x1={toX(0)} y1={pad.top} x2={toX(0)} y2={pad.top + pH} stroke="#475569" strokeDasharray="3 3" />

            {/* Normal standard curve (dashed) */}
            <path d={normPath} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4 3" />

            {/* Student t curve (solid) */}
            <path d={tPath} fill="none" stroke="#ec4899" strokeWidth="3" />

            {/* Labels */}
            <text x={pad.left + 8} y={pad.top + 16} fill={isDark ? '#e2e8f0' : '#1e293b'} fontSize="11" fontFamily="sans-serif" fontWeight="600">
              Rosa: t-Student (ν={tDf}) · Cinza Tracejado: Normal Padrão Z ~ N(0, 1)
            </text>
            <text x={width - pad.right} y={pad.top + 16} fill={isDark ? '#f472b6' : '#be185d'} fontSize="11" fontFamily="monospace" textAnchor="end" fontWeight="bold">
              {tDf >= 30 ? 'ν ≥ 30: Praticamente idêntica à Normal!' : 'Caudas pesadas evidentes (maior risco)'}
            </text>
          </svg>
        );
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Experiment Selector Tabs */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-1 p-1 rounded-xl border ${
        isDark ? 'bg-[#0c1f3d] border-[#183664]' : 'bg-slate-100 border-slate-200'
      }`}>
        <button
          onClick={() => setActiveExp('clt')}
          className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            activeExp === 'clt'
              ? 'bg-[#003882] text-white shadow'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Limite Central (TLC)
        </button>
        <button
          onClick={() => setActiveExp('binomial_poisson')}
          className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            activeExp === 'binomial_poisson'
              ? 'bg-[#003882] text-white shadow'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Binomial → Poisson
        </button>
        <button
          onClick={() => setActiveExp('binomial_normal')}
          className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            activeExp === 'binomial_normal'
              ? 'bg-[#003882] text-white shadow'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Binomial → Normal
        </button>
        <button
          onClick={() => setActiveExp('student_normal')}
          className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            activeExp === 'student_normal'
              ? 'bg-[#003882] text-white shadow'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          t-Student → Normal
        </button>
      </div>

      {/* Main Interactive Chart Box */}
      <div className={`rounded-2xl border p-3 shadow-lg ${
        isDark ? 'bg-[#0a1b33] border-[#183664]' : 'bg-white border-slate-200'
      }`}>
        {renderExperimentChart()}
      </div>

      {/* Controls & Explanation Card */}
      <div className={`rounded-2xl border p-4 space-y-4 shadow ${
        isDark ? 'bg-[#0c1f3d] border-[#183664]' : 'bg-white border-slate-200'
      }`}>
        {activeExp === 'clt' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Teorema do Limite Central (TLC) em Ação
              </h3>
              <span className="text-xs font-mono font-bold text-[#003882] dark:text-indigo-400">n = {cltSampleN} amostras</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              Mesmo que a população original seja totalmente assimétrica (como exponencial ou qui-quadrado), a distribuição das médias amostrais X̄ aproxima-se de uma normal com desvio padrão reduzido por σ / √n.
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-800 dark:text-slate-300 font-medium">
                <span>Tamanho da amostra (n):</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{cltSampleN}</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={cltSampleN}
                onChange={(e) => setCltSampleN(Number(e.target.value))}
                className="w-full accent-indigo-600 h-2 bg-slate-300 dark:bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        {activeExp === 'binomial_poisson' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                Lei dos Eventos Raros (Poisson como limite da Binomial)
              </h3>
              <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-400">λ = {bpLambda} | n = {bpN}</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              Quando o número de ensaios n é grande e a probabilidade de sucesso p = λ / n é muito pequena (evento raro), a distribuição Binomial converge matematicamente para a de Poisson com média constante λ = np.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-xs text-slate-800 dark:text-slate-300 font-medium mb-1">
                  <span>Taxa Média Constante (λ):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{bpLambda}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={bpLambda}
                  onChange={(e) => setBpLambda(Number(e.target.value))}
                  className="w-full accent-purple-600 h-2 bg-slate-300 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-800 dark:text-slate-300 font-medium mb-1">
                  <span>Número de Ensaios (n):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{bpN} (p = {(bpLambda/bpN).toFixed(3)})</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="5"
                  value={bpN}
                  onChange={(e) => setBpN(Number(e.target.value))}
                  className="w-full accent-purple-600 h-2 bg-slate-300 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {activeExp === 'binomial_normal' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Teorema de De Moivre-Laplace (Binomial → Normal)
              </h3>
              <span className="text-xs font-mono font-bold text-[#003882] dark:text-sky-400">n = {bnN}, p = {bnP}</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              Para n moderado a grande e probabilidade p longe dos extremos (critério empírico: np ≥ 5 e n(1-p) ≥ 5), a curva contínua da Normal aproxima os retângulos da Binomial com alta fidelidade.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-xs text-slate-800 dark:text-slate-300 font-medium mb-1">
                  <span>Ensaios (n):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{bnN}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="1"
                  value={bnN}
                  onChange={(e) => setBnN(Number(e.target.value))}
                  className="w-full accent-blue-600 h-2 bg-slate-300 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-800 dark:text-slate-300 font-medium mb-1">
                  <span>Probabilidade de Sucesso (p):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{bnP.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.05"
                  value={bnP}
                  onChange={(e) => setBnP(Number(e.target.value))}
                  className="w-full accent-blue-600 h-2 bg-slate-300 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {activeExp === 'student_normal' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-600" />
                Convergência da t de Student para a Normal Padrão
              </h3>
              <span className="text-xs font-mono font-bold text-pink-700 dark:text-pink-400">Graus de Liberdade ν = {tDf}</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              Com poucos graus de liberdade (ν &lt; 10), a distribuição t tem caudas significativamente mais espessas (&quot;heavy tails&quot;), indicando maior incerteza por estarmos estimando o desvio padrão. Ao aumentar ν, a curva converge gradualmente para a normal padronizada Z.
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-800 dark:text-slate-300 font-medium">
                <span>Graus de Liberdade (ν):</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{tDf}</span>
              </div>
              <input
                type="range"
                min="1"
                max="40"
                step="1"
                value={tDf}
                onChange={(e) => setTDf(Number(e.target.value))}
                className="w-full accent-pink-600 h-2 bg-slate-300 dark:bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
