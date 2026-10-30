/**
 * Quests & Adaptive Challenges Component with Compiled Mathematical Typography & UFJF Palette
 * Interactive solving arena with embedded ProbMaster calculation workbench for every question.
 */

import React, { useState, useMemo } from 'react';
import { StudentChallenge } from '../gamification/types';
import { MathText } from './MathView';
import {
  DISTRIBUTIONS,
  calculateProbability,
  TailMode,
} from '../math/distributions';
import {
  Sparkles,
  HelpCircle,
  Check,
  X,
  Lightbulb,
  Trophy,
  BrainCircuit,
  Calculator,
  ArrowUpRight,
  CheckCheck,
  Filter,
  Layers,
  RotateCcw,
  Activity,
  Hash,
} from 'lucide-react';

interface QuestsViewProps {
  challenges: StudentChallenge[];
  onSubmitAttempt: (
    challenge: StudentChallenge,
    userAnswer: number
  ) => { isCorrect: boolean; scorePercent: number; xpEarned: number };
  onGenerateAdaptive: () => void;
  onOpenInCalculator?: (
    distId: string,
    params: Record<string, number>,
    tailMode: TailMode,
    boundX1: number,
    boundX2: number
  ) => void;
  theme?: 'light' | 'dark';
}

interface HelperState {
  params: Record<string, number>;
  tailMode: TailMode;
  boundX1: number;
  boundX2: number;
}

/**
 * Intelligent parser to extract initial tail mode and cutoff bounds from target expressions
 * Examples: P(X ≤ 49.5), P(X ≥ 3), P(X = 1), P(60 ≤ X ≤ 80)
 */
function parseTargetExpression(
  expr: string,
  isDiscrete: boolean
): { mode: TailMode; x1: number; x2: number } {
  if (!expr) return { mode: 'leq', x1: 0, x2: 0 };

  // Between: P(a <= X <= b) or P(a ≤ X ≤ b)
  const betweenMatch = expr.match(
    /P\(\s*(-?[\d.]+)\s*(?:<=|≤)\s*X\s*(?:<=|≤)\s*(-?[\d.]+)\s*\)/i
  );
  if (betweenMatch) {
    return {
      mode: 'between',
      x1: parseFloat(betweenMatch[1]) || 0,
      x2: parseFloat(betweenMatch[2]) || 0,
    };
  }

  // Geq: P(X >= x) or P(X ≥ x) or P(X > x)
  const geqMatch = expr.match(/P\(\s*X\s*(?:>=|≥|>)\s*(-?[\d.]+)\s*\)/i);
  if (geqMatch) {
    return {
      mode: 'geq',
      x1: parseFloat(geqMatch[1]) || 0,
      x2: 0,
    };
  }

  // Leq: P(X <= x) or P(X ≤ x) or P(X < x)
  const leqMatch = expr.match(/P\(\s*X\s*(?:<=|≤|<)\s*(-?[\d.]+)\s*\)/i);
  if (leqMatch) {
    return {
      mode: 'leq',
      x1: parseFloat(leqMatch[1]) || 0,
      x2: 0,
    };
  }

  // Equal: P(X = x)
  const eqMatch = expr.match(/P\(\s*X\s*=\s*(-?[\d.]+)\s*\)/i);
  if (eqMatch) {
    return {
      mode: isDiscrete ? 'equal' : 'leq',
      x1: parseFloat(eqMatch[1]) || 0,
      x2: 0,
    };
  }

  return { mode: 'leq', x1: 0, x2: 0 };
}

export const QuestsView: React.FC<QuestsViewProps> = ({
  challenges,
  onSubmitAttempt,
  onGenerateAdaptive,
  onOpenInCalculator,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [filterDistType, setFilterDistType] = useState<
    'all' | 'continuous' | 'discrete'
  >('all');
  const [filterDistId, setFilterDistId] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [revealedHints, setRevealedHints] = useState<
    Record<string, { hint1: boolean; hint2: boolean }>
  >({});
  const [submissionResults, setSubmissionResults] = useState<
    Record<
      string,
      {
        isCorrect: boolean;
        scorePercent: number;
        xpEarned: number;
        showExplanation: boolean;
      }
    >
  >({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Local calculation workbench states per challenge
  const [helpers, setHelpers] = useState<Record<string, HelperState>>({});

  // Helper to determine if a challenge is discrete or continuous
  const getChallengeDistType = (
    c: StudentChallenge
  ): 'continuous' | 'discrete' => {
    const distInfo = DISTRIBUTIONS[c.distId];
    if (distInfo?.type) return distInfo.type;
    const isDiscrete = [
      'binomial',
      'poisson',
      'geometric',
      'hypergeometric',
    ].includes((c.distId || '').toLowerCase());
    return isDiscrete ? 'discrete' : 'continuous';
  };

  // Group challenges by distribution and compute counts
  const distOptions = useMemo(() => {
    let continuousTotal = 0;
    let discreteTotal = 0;
    const map: Record<
      string,
      {
        id: string;
        name: string;
        type: 'continuous' | 'discrete';
        count: number;
      }
    > = {};

    challenges.forEach((c) => {
      const type = getChallengeDistType(c);
      if (type === 'continuous') continuousTotal++;
      else discreteTotal++;

      const distInfo = DISTRIBUTIONS[c.distId];
      const name = c.distName || distInfo?.name || c.distId;

      if (!map[c.distId]) {
        map[c.distId] = {
          id: c.distId,
          name,
          type,
          count: 0,
        };
      }
      map[c.distId].count++;
    });

    const list = Object.values(map).sort((a, b) => b.count - a.count);

    return {
      total: challenges.length,
      continuousTotal,
      discreteTotal,
      list,
    };
  }, [challenges]);

  // Distributions to display in the chips (filtered by broad type if selected)
  const visibleDistChips = useMemo(() => {
    if (filterDistType === 'all') return distOptions.list;
    return distOptions.list.filter((d) => d.type === filterDistType);
  }, [distOptions.list, filterDistType]);

  // Challenges matching the current distribution filter (type & specific)
  const challengesMatchingDist = useMemo(() => {
    return challenges.filter((c) => {
      const type = getChallengeDistType(c);
      if (filterDistType !== 'all' && type !== filterDistType) return false;
      if (filterDistId !== 'all' && c.distId !== filterDistId) return false;
      return true;
    });
  }, [challenges, filterDistType, filterDistId]);

  // Challenges matching all filters (including difficulty)
  const filtered = useMemo(() => {
    return challengesMatchingDist.filter((c) => {
      if (filterDifficulty === 'all') return true;
      return c.difficulty.toLowerCase() === filterDifficulty.toLowerCase();
    });
  }, [challengesMatchingDist, filterDifficulty]);

  const handleSelectDistType = (type: 'all' | 'continuous' | 'discrete') => {
    setFilterDistType(type);
    if (filterDistId !== 'all') {
      const selected = distOptions.list.find((d) => d.id === filterDistId);
      if (type !== 'all' && selected && selected.type !== type) {
        setFilterDistId('all');
      }
    }
  };

  const handleSelectDistId = (id: string) => {
    if (filterDistId === id) {
      setFilterDistId('all');
    } else {
      setFilterDistId(id);
      if (id !== 'all') {
        const item = distOptions.list.find((d) => d.id === id);
        if (item && filterDistType !== 'all' && filterDistType !== item.type) {
          setFilterDistType(item.type);
        }
      }
    }
  };

  const getHelperState = (item: StudentChallenge): HelperState => {
    if (helpers[item.id]) return helpers[item.id];

    const dist = DISTRIBUTIONS[item.distId] || DISTRIBUTIONS.normal;
    const isDiscrete = dist.type === 'discrete';
    const parsed = parseTargetExpression(item.targetExpression, isDiscrete);

    const initialParams: Record<string, number> = { ...(item.params || {}) };
    dist.parameters.forEach((p) => {
      if (initialParams[p.id] === undefined) {
        initialParams[p.id] = p.defaultValue;
      }
    });

    return {
      params: initialParams,
      tailMode: parsed.mode,
      boundX1: parsed.x1,
      boundX2: parsed.x2,
    };
  };

  const handleUpdateParam = (
    challengeId: string,
    paramId: string,
    val: number,
    item: StudentChallenge
  ) => {
    const cur = helpers[challengeId] || getHelperState(item);
    setHelpers((prev) => ({
      ...prev,
      [challengeId]: {
        ...cur,
        params: {
          ...cur.params,
          [paramId]: val,
        },
      },
    }));
  };

  const handleUpdateTailMode = (
    challengeId: string,
    mode: TailMode,
    item: StudentChallenge
  ) => {
    const cur = helpers[challengeId] || getHelperState(item);
    setHelpers((prev) => ({
      ...prev,
      [challengeId]: {
        ...cur,
        tailMode: mode,
      },
    }));
  };

  const handleUpdateBound = (
    challengeId: string,
    which: 'x1' | 'x2',
    val: number,
    item: StudentChallenge
  ) => {
    const cur = helpers[challengeId] || getHelperState(item);
    setHelpers((prev) => ({
      ...prev,
      [challengeId]: {
        ...cur,
        [which === 'x1' ? 'boundX1' : 'boundX2']: val,
      },
    }));
  };

  const handleAnswerChange = (challengeId: string, val: string) => {
    setUserAnswers((prev) => ({ ...prev, [challengeId]: val }));
  };

  const handleApplyCalculatedValue = (challengeId: string, prob: number) => {
    const formatted = prob.toFixed(4);
    setUserAnswers((prev) => ({ ...prev, [challengeId]: formatted }));
    setCopiedId(challengeId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleHint = (
    challengeId: string,
    hintNum: 'hint1' | 'hint2'
  ) => {
    setRevealedHints((prev) => {
      const cur = prev[challengeId] || { hint1: false, hint2: false };
      return {
        ...prev,
        [challengeId]: {
          ...cur,
          [hintNum]: !cur[hintNum],
        },
      };
    });
  };

  const handleSubmit = (challenge: StudentChallenge) => {
    const raw = userAnswers[challenge.id] || '';
    const cleaned = raw.replace('%', '').replace(',', '.').trim();
    let num = parseFloat(cleaned);

    if (isNaN(num)) return;
    if (num > 1 && challenge.expectedAnswer <= 1) {
      num = num / 100;
    }

    const result = onSubmitAttempt(challenge, num);
    setSubmissionResults((prev) => ({
      ...prev,
      [challenge.id]: {
        ...result,
        showExplanation: true,
      },
    }));
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Adaptive Generator CTA with UFJF Navy & Gold */}
      <div
        className={`rounded-2xl border p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md ${
          isDark
            ? 'bg-gradient-to-r from-[#002d6b] via-[#0a2347] to-[#071326] border-[#183a69]'
            : 'bg-gradient-to-r from-[#003882] to-[#0c4ca3] border-[#003882] text-white'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-amber-300" />
            <h3 className="text-sm font-bold text-white">
              Academia de Desafios Estatísticos · UFJF
            </h3>
          </div>
          <p className="text-xs text-blue-100/90">
            Resolva os desafios práticos utilizando a bancada de cálculo do
            aplicativo em cada questão.
          </p>
        </div>
        <button
          onClick={onGenerateAdaptive}
          className="shrink-0 flex items-center justify-center gap-2 py-2 px-4 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Gerar Novo Desafio
        </button>
      </div>

      {/* Filtro sobre os Tipos e Distribuições de Probabilidade */}
      <div
        className={`rounded-2xl border p-3 sm:p-4 space-y-3 transition-colors shadow-xs ${
          isDark
            ? 'bg-[#0a1b33] border-[#183664]'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#003882] dark:text-sky-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Tipos de Distribuição de Probabilidade
            </span>
          </div>
          {(filterDistType !== 'all' ||
            filterDistId !== 'all' ||
            filterDifficulty !== 'all') && (
            <button
              onClick={() => {
                setFilterDistType('all');
                setFilterDistId('all');
                setFilterDifficulty('all');
              }}
              className="text-[11px] font-semibold text-[#003882] dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Limpar Filtros
            </button>
          )}
        </div>

        {/* Nível 1: Tipos de Distribuição (Todas, Contínuas, Discretas) */}
        <div
          className={`flex items-center gap-1 p-1 rounded-xl border text-xs overflow-x-auto no-scrollbar w-fit max-w-full ${
            isDark
              ? 'bg-[#0c1f3d] border-[#183664]'
              : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            onClick={() => handleSelectDistType('all')}
            className={`py-1.5 px-3 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              filterDistType === 'all'
                ? 'bg-[#003882] text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Todas as Distribuições</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                filterDistType === 'all'
                  ? 'bg-white/20 text-white'
                  : isDark
                  ? 'bg-slate-800 text-slate-300'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {distOptions.total}
            </span>
          </button>
          <button
            onClick={() => handleSelectDistType('continuous')}
            className={`py-1.5 px-3 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              filterDistType === 'continuous'
                ? 'bg-[#003882] text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>Contínuas</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                filterDistType === 'continuous'
                  ? 'bg-white/20 text-white'
                  : isDark
                  ? 'bg-slate-800 text-slate-300'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {distOptions.continuousTotal}
            </span>
          </button>
          <button
            onClick={() => handleSelectDistType('discrete')}
            className={`py-1.5 px-3 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              filterDistType === 'discrete'
                ? 'bg-[#003882] text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hash className="w-3.5 h-3.5 text-amber-400" />
            <span>Discretas</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                filterDistType === 'discrete'
                  ? 'bg-white/20 text-white'
                  : isDark
                  ? 'bg-slate-800 text-slate-300'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {distOptions.discreteTotal}
            </span>
          </button>
        </div>

        {/* Nível 2: Chips de Distribuições Específicas do Tipo */}
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Filtrar por distribuição específica:
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => handleSelectDistId('all')}
              className={`py-1 px-2.5 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer border whitespace-nowrap ${
                filterDistId === 'all'
                  ? 'bg-[#003882] text-white border-[#003882] shadow-xs'
                  : isDark
                  ? 'bg-[#071326] border-[#183664] text-slate-300 hover:border-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Todas deste tipo ({visibleDistChips.reduce((acc, d) => acc + d.count, 0)})
            </button>
            {visibleDistChips.map((d) => {
              const isSelected = filterDistId === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => handleSelectDistId(d.id)}
                  className={`py-1 px-2.5 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer border flex items-center gap-1.5 whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#003882] text-white border-[#003882] shadow-xs'
                      : isDark
                      ? 'bg-[#071326] border-[#183664] text-slate-300 hover:border-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{d.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : isDark
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {d.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Tabs - Dificuldade (Todos, Iniciante, Intermediário, Avançado) */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div
          className={`flex items-center gap-1 p-1 rounded-xl border text-xs ${
            isDark
              ? 'bg-[#0c1f3d] border-[#183664]'
              : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            onClick={() => setFilterDifficulty('all')}
            className={`py-1.5 px-3 rounded-lg font-medium transition-colors cursor-pointer ${
              filterDifficulty === 'all'
                ? 'bg-[#003882] text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({challengesMatchingDist.length})
          </button>
          <button
            onClick={() => setFilterDifficulty('iniciante')}
            className={`py-1.5 px-3 rounded-lg font-medium transition-colors cursor-pointer ${
              filterDifficulty === 'iniciante'
                ? 'bg-emerald-600 text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Iniciante
          </button>
          <button
            onClick={() => setFilterDifficulty('intermediário')}
            className={`py-1.5 px-3 rounded-lg font-medium transition-colors cursor-pointer ${
              filterDifficulty === 'intermediário'
                ? 'bg-amber-600 text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Intermediário
          </button>
          <button
            onClick={() => setFilterDifficulty('avançado')}
            className={`py-1.5 px-3 rounded-lg font-medium transition-colors cursor-pointer ${
              filterDifficulty === 'avançado'
                ? 'bg-rose-600 text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Avançado
          </button>
        </div>

        <div
          className={`text-xs font-mono font-medium ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {filtered.length}{' '}
          {filtered.length === 1 ? 'desafio disponível' : 'desafios disponíveis'}
        </div>
      </div>

      {/* Challenge Cards List */}
      <div className="space-y-4">
        {filtered.map((item) => {
          const res = submissionResults[item.id];
          const hints = revealedHints[item.id] || {
            hint1: false,
            hint2: false,
          };
          const ans = userAnswers[item.id] || '';
          const helper = getHelperState(item);
          const distDef = DISTRIBUTIONS[item.distId] || DISTRIBUTIONS.normal;
          const isDiscrete = distDef.type === 'discrete';

          // Real-time calculation using the math engine
          const calcResult = calculateProbability(
            distDef,
            helper.params,
            helper.tailMode,
            helper.boundX1,
            helper.boundX2
          );

          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-md space-y-3.5 ${
                res?.isCorrect
                  ? isDark
                    ? 'bg-[#0a1b33] border-emerald-500/40'
                    : 'bg-emerald-50/50 border-emerald-300'
                  : res && !res.isCorrect
                  ? isDark
                    ? 'bg-[#0a1b33] border-rose-500/40'
                    : 'bg-rose-50/50 border-rose-300'
                  : isDark
                  ? 'bg-[#0a1b33] border-[#183664]'
                  : 'bg-white border-slate-200'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <span className="font-bold text-[#003882] dark:text-sky-400">
                      {item.distName}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span
                      className={`font-semibold ${
                        item.difficulty === 'Iniciante'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : item.difficulty === 'Intermediário'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {item.difficulty}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {item.title}
                  </h4>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-300 font-mono text-xs font-bold">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  +{item.xpReward} XP
                </div>
              </div>

              {/* Story Context & Question */}
              <div
                className={`text-xs leading-relaxed p-3 rounded-xl border ${
                  isDark
                    ? 'bg-[#071326] border-[#183664] text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <MathText text={item.story} />
              </div>

              <div
                className={`p-3 rounded-xl border ${
                  isDark
                    ? 'bg-sky-950/30 border-sky-800/30 text-sky-200'
                    : 'bg-blue-50/80 border-blue-200 text-blue-900'
                }`}
              >
                <MathText
                  text={item.question}
                  className="text-xs font-semibold"
                />
              </div>

              {/* ======================================================== */}
              {/* BANCADA DE CÁLCULO INTERATIVA DO PROBMASTER (SOLVER)     */}
              {/* Permite ao aluno resolver a questão usando o aplicativo  */}
              {/* ======================================================== */}
              <div
                className={`rounded-xl border p-3.5 space-y-3 transition-colors ${
                  isDark
                    ? 'bg-[#071326]/90 border-blue-900/40 shadow-inner'
                    : 'bg-slate-50/90 border-blue-100 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#003882] dark:text-sky-300">
                    <Calculator className="w-4 h-4 text-[#003882] dark:text-sky-400" />
                    <span>Bancada de Cálculo da Questão (ProbMaster PI)</span>
                  </div>

                  {onOpenInCalculator && (
                    <button
                      onClick={() =>
                        onOpenInCalculator(
                          item.distId,
                          helper.params,
                          helper.tailMode,
                          helper.boundX1,
                          helper.boundX2
                        )
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#003882] dark:text-sky-300 hover:underline cursor-pointer"
                      title="Carregar estes parâmetros na Calculadora Gráfica Principal"
                    >
                      <span>Abrir na Calculadora Gráfica</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 1. Campos de Parâmetros da Distribuição */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    1. Parâmetros da Distribuição ({distDef.shortName}):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {distDef.parameters.map((p) => {
                      const val = helper.params[p.id] ?? p.defaultValue;
                      return (
                        <div
                          key={p.id}
                          className={`p-2 rounded-lg border flex flex-col justify-between ${
                            isDark
                              ? 'bg-[#0a1b33] border-slate-800'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {p.name}:
                            </span>
                            <span className="font-mono font-bold text-[#003882] dark:text-sky-400">
                              {p.symbol}
                            </span>
                          </div>
                          <input
                            type="number"
                            step={p.step}
                            min={p.min}
                            max={p.max}
                            value={val}
                            onChange={(e) =>
                              handleUpdateParam(
                                item.id,
                                p.id,
                                parseFloat(e.target.value) || 0,
                                item
                              )
                            }
                            className={`w-full px-2 py-1 text-xs font-mono font-bold rounded border outline-none ${
                              isDark
                                ? 'bg-[#071326] border-slate-700 text-white focus:border-sky-400'
                                : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#003882]'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Seleção do Modo de Probabilidade / Cauda */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    2. Região de Probabilidade Desejada:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateTailMode(item.id, 'leq', item)}
                      className={`py-1 px-2.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                        helper.tailMode === 'leq'
                          ? 'bg-[#003882] text-white shadow-xs'
                          : isDark
                          ? 'bg-[#0a1b33] border border-slate-700 text-slate-300 hover:bg-[#132c54]'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      P(X ≤ x)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateTailMode(item.id, 'geq', item)}
                      className={`py-1 px-2.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                        helper.tailMode === 'geq'
                          ? 'bg-[#003882] text-white shadow-xs'
                          : isDark
                          ? 'bg-[#0a1b33] border border-slate-700 text-slate-300 hover:bg-[#132c54]'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      P(X ≥ x)
                    </button>
                    {isDiscrete && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTailMode(item.id, 'equal', item)
                        }
                        className={`py-1 px-2.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                          helper.tailMode === 'equal'
                            ? 'bg-[#003882] text-white shadow-xs'
                            : isDark
                            ? 'bg-[#0a1b33] border border-slate-700 text-slate-300 hover:bg-[#132c54]'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        P(X = k)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateTailMode(item.id, 'between', item)
                      }
                      className={`py-1 px-2.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                        helper.tailMode === 'between'
                          ? 'bg-[#003882] text-white shadow-xs'
                          : isDark
                          ? 'bg-[#0a1b33] border border-slate-700 text-slate-300 hover:bg-[#132c54]'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      P(a ≤ X ≤ b)
                    </button>
                  </div>
                </div>

                {/* 3. Valores de Corte (x ou a e b) */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    3. Ponto de Corte Numérico:
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {helper.tailMode !== 'between' ? (
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {helper.tailMode === 'equal' ? 'k =' : 'x ='}
                        </label>
                        <input
                          type="number"
                          step={isDiscrete ? '1' : '0.1'}
                          value={helper.boundX1}
                          onChange={(e) =>
                            handleUpdateBound(
                              item.id,
                              'x1',
                              parseFloat(e.target.value) || 0,
                              item
                            )
                          }
                          className={`w-28 px-2 py-1 text-xs font-mono font-bold rounded-lg border outline-none ${
                            isDark
                              ? 'bg-[#0a1b33] border-slate-700 text-white focus:border-sky-400'
                              : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                          }`}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            a =
                          </label>
                          <input
                            type="number"
                            step={isDiscrete ? '1' : '0.1'}
                            value={helper.boundX1}
                            onChange={(e) =>
                              handleUpdateBound(
                                item.id,
                                'x1',
                                parseFloat(e.target.value) || 0,
                                item
                              )
                            }
                            className={`w-24 px-2 py-1 text-xs font-mono font-bold rounded-lg border outline-none ${
                              isDark
                                ? 'bg-[#0a1b33] border-slate-700 text-white focus:border-sky-400'
                                : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                            }`}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            b =
                          </label>
                          <input
                            type="number"
                            step={isDiscrete ? '1' : '0.1'}
                            value={helper.boundX2}
                            onChange={(e) =>
                              handleUpdateBound(
                                item.id,
                                'x2',
                                parseFloat(e.target.value) || 0,
                                item
                              )
                            }
                            className={`w-24 px-2 py-1 text-xs font-mono font-bold rounded-lg border outline-none ${
                              isDark
                                ? 'bg-[#0a1b33] border-slate-700 text-white focus:border-sky-400'
                                : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Resultado do Aplicativo & Botão de Preenchimento */}
                <div
                  className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isDark
                      ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                      : 'bg-amber-50/80 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400">
                      Resultado Calculado pelo ProbMaster PI:
                    </div>
                    <div className="font-mono text-sm font-black">
                      {calcResult.expressionText} ={' '}
                      <span className="text-base text-[#003882] dark:text-sky-300">
                        {calcResult.probability.toFixed(4)}
                      </span>{' '}
                      <span className="text-xs font-semibold opacity-85">
                        ({(calcResult.probability * 100).toFixed(2)}%)
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleApplyCalculatedValue(
                        item.id,
                        calcResult.probability
                      )
                    }
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    {copiedId === item.id ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Preenchido!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Usar como Minha Resposta</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ======================================================== */}
              {/* CAMPO DE ENVIO DA RESPOSTA (SEM SOBREPOSIÇÃO)            */}
              {/* ======================================================== */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Sua Resposta para a Questão:
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div
                    className={`flex-1 flex items-center rounded-xl border overflow-hidden focus-within:ring-2 focus-within:ring-[#003882] dark:focus-within:ring-sky-400 transition ${
                      isDark
                        ? 'bg-[#071326] border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <span
                      className={`px-3 py-2 text-xs font-mono font-bold shrink-0 border-r ${
                        isDark
                          ? 'bg-[#0a1b33] border-slate-700 text-sky-400'
                          : 'bg-slate-100 border-slate-200 text-[#003882]'
                      }`}
                    >
                      {item.targetExpression} =
                    </span>
                    <input
                      type="text"
                      value={ans}
                      onChange={(e) =>
                        handleAnswerChange(item.id, e.target.value)
                      }
                      placeholder="ex: 0.2231 ou 22.31%"
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-transparent outline-none placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>
                  <button
                    onClick={() => handleSubmit(item)}
                    disabled={!ans.trim()}
                    className={`py-2 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      ans.trim()
                        ? 'bg-[#003882] hover:bg-[#0c4ca3] text-white shadow-md active:scale-95'
                        : isDark
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Verificar Resposta
                  </button>
                </div>
              </div>

              {/* Hints Drawer */}
              <div className="flex items-center gap-2 text-xs pt-1">
                <button
                  onClick={() => handleToggleHint(item.id, 'hint1')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                    hints.hint1
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300'
                      : isDark
                      ? 'border-slate-700 text-slate-400 hover:text-slate-200'
                      : 'border-slate-300 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Lightbulb className="w-3 h-3 text-amber-500" />
                  {hints.hint1 ? 'Ocultar Dica 1' : 'Dica 1'}
                </button>
                <button
                  onClick={() => handleToggleHint(item.id, 'hint2')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                    hints.hint2
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300'
                      : isDark
                      ? 'border-slate-700 text-slate-400 hover:text-slate-200'
                      : 'border-slate-300 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <HelpCircle className="w-3 h-3 text-amber-500" />
                  {hints.hint2 ? 'Ocultar Dica 2' : 'Dica 2'}
                </button>
              </div>

              {/* Render Revealed Hints with Compiled Math */}
              {hints.hint1 && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  <div className="font-bold mb-0.5">💡 Dica 1:</div>
                  <MathText text={item.hint1} />
                </div>
              )}
              {hints.hint2 && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  <div className="font-bold mb-0.5">💡 Dica 2:</div>
                  <MathText text={item.hint2} />
                </div>
              )}

              {/* Result & Step-by-Step Resolution */}
              {res && (
                <div
                  className={`mt-3 p-3 rounded-xl border text-xs leading-relaxed space-y-2 ${
                    res.isCorrect
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/50 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700/50 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      {res.isCorrect ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          Excelente! Resposta correta (+{res.xpEarned} XP)
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          Quase lá! Valor esperado: p ={' '}
                          {item.expectedAnswer.toFixed(4)}
                        </>
                      )}
                    </span>
                    <span className="font-mono text-[11px] font-bold">
                      Acurácia: {res.scorePercent.toFixed(2)}%
                    </span>
                  </div>

                  {res.showExplanation && (
                    <div className="pt-2 border-t border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 space-y-1">
                      <p className="font-bold">Resolução Passo a Passo:</p>
                      <MathText
                        text={item.fullExplanation}
                        className="text-xs leading-relaxed"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div
            className={`rounded-2xl border p-8 text-center space-y-3.5 transition-colors ${
              isDark
                ? 'bg-[#0a1b33] border-[#183664]'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-blue-100 dark:bg-[#0c1f3d] text-[#003882] dark:text-sky-400">
              <Filter className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Nenhum desafio encontrado para este filtro
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Não há questões disponíveis para os filtros combinados de tipo de distribuição e nível de dificuldade selecionados.
              </p>
            </div>
            <button
              onClick={() => {
                setFilterDistType('all');
                setFilterDistId('all');
                setFilterDifficulty('all');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#003882] text-white hover:bg-[#0c4ca3] transition-colors cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Todos os Desafios
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
