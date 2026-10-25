/**
 * ProbMaster - Mobile-First Interactive Probability Distributions & Adaptive Learning PWA
 * Styled with the Official Universidade Federal de Juiz de Fora (UFJF) Palette:
 * - UFJF Navy Blue (#003882)
 * - UFJF Crimson Red (#C4161C)
 * - UFJF Gold (#DFA628)
 *
 * Features:
 * - 13 Continuous & Discrete Distributions with exact numerical math
 * - Live interactive SVG charts with draggable tail handles
 * - PDF/PMF and CDF visualization with light/dark theme support
 * - Direct probability and Inverse Quantile calculation
 * - Strict Formatting: Percentages with 2 decimal places, p with 4 decimal places, theoretical moments with 2 decimal places
 * - Compiled Mathematical Typography via KaTeX (no raw LaTeX code)
 * - Convergence & Theorems Laboratory (CLT, Binomial->Poisson, Binomial->Normal, t->Normal)
 * - Gamified Challenges Arena with progressive hints and XP
 * - Student Evolution Dashboard & Exportable Academic Dossier for Teachers with UFJF Coat of Arms
 * - Dark / Light theme toggle with local persistence
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  DISTRIBUTIONS,
  DistributionInfo,
  TailMode,
  calculateProbability,
  CalculationResult,
} from './math/distributions';
import { generateStepByStepSolution } from './math/stepByStepSolver';
import { DistributionChart } from './components/DistributionChart';
import { ConvergenceLab } from './components/ConvergenceLab';
import { QuestsView } from './components/QuestsView';
import { StudentDashboard } from './components/StudentDashboard';
import { StudentAuthModal } from './components/StudentAuthModal';
import { MathBlock, MathText } from './components/MathView';
import { useGamification } from './gamification/useGamification';

import {
  Calculator,
  Compass,
  Trophy,
  BarChart3,
  BookOpen,
  Sparkles,
  Flame,
  Layers,
  Sun,
  Moon,
  GraduationCap,
  Database,
  RefreshCw,
  Menu,
  X,
  LogOut,
  PenSquare,
} from 'lucide-react';

type MainTab = 'calculator' | 'lab' | 'quests' | 'dashboard';

export default function App() {
  // Theme state: light or dark (persisted in localStorage, defaults to light)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('probmaster_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      localStorage.setItem('probmaster_theme', next);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  const [activeTab, setActiveTab] = useState<MainTab>('calculator');
  const [selectedDistId, setSelectedDistId] = useState<string>('normal');
  const [distCategoryFilter, setDistCategoryFilter] = useState<'all' | 'continuous' | 'discrete'>('all');

  // Distribution Parameters State
  const currentDist: DistributionInfo = DISTRIBUTIONS[selectedDistId] || DISTRIBUTIONS.normal;
  const [paramValues, setParamValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    currentDist.parameters.forEach((p) => {
      initial[p.id] = p.defaultValue;
    });
    return initial;
  });

  // Tail & Bound Calculation State
  const [tailMode, setTailMode] = useState<TailMode>('leq');
  const [boundX1, setBoundX1] = useState<number>(() => {
    return currentDist.id === 'normal' ? 1 : 2;
  });
  const [boundX2, setBoundX2] = useState<number>(() => {
    return currentDist.id === 'normal' ? 2 : 4;
  });

  // Inverse Mode State (Given P, find x)
  const [isInverseMode, setIsInverseMode] = useState<boolean>(false);
  const [targetProbInput, setTargetProbInput] = useState<number>(0.95);

  // Chart View Mode
  const [showCDF, setShowCDF] = useState<boolean>(false);

  // Gamification & Supabase Sync Hook
  const {
    profile,
    activeChallenges,
    isDbLoadedChallenges,
    userId,
    activeMatricula,
    isAuthenticated,
    isSyncing,
    login,
    register,
    loginByMatricula,
    logout,
    refreshFromSupabase,
    loadChallenges,
    submitChallengeAttempt,
    createAdaptiveTargetedChallenge,
    recordCalculation,
    updateProfileInfo,
    uploadAvatar,
  } = useGamification();

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'profile' | 'edit-profile'>('login');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Reset or switch distribution
  const handleSelectDistribution = (distId: string) => {
    setSelectedDistId(distId);
    const newDist = DISTRIBUTIONS[distId] || DISTRIBUTIONS.normal;
    const initialParams: Record<string, number> = {};
    newDist.parameters.forEach((p) => {
      initialParams[p.id] = p.defaultValue;
    });
    setParamValues(initialParams);

    const defaultMoments = newDist.moments(initialParams);
    const mean = typeof defaultMoments.mean === 'number' ? defaultMoments.mean : 0;
    const stdDev = typeof defaultMoments.stdDev === 'number' ? defaultMoments.stdDev : 1;

    if (newDist.type === 'discrete') {
      setBoundX1(Math.round(mean));
      setBoundX2(Math.round(mean + stdDev));
      if (tailMode !== 'equal' && tailMode !== 'leq') {
        setTailMode('leq');
      }
    } else {
      setBoundX1(Number((mean + stdDev).toFixed(2)));
      setBoundX2(Number((mean + 2 * stdDev).toFixed(2)));
      if (tailMode === 'equal') {
        setTailMode('leq');
      }
    }

    recordCalculation(distId);
  };

  // Open and preload distribution and parameters from challenge into the interactive calculator
  const handleOpenInCalculator = (
    distId: string,
    params: Record<string, number>,
    mode: TailMode = 'leq',
    x1: number = 0,
    x2: number = 0
  ) => {
    setSelectedDistId(distId);
    setParamValues({ ...params });
    setTailMode(mode);
    setBoundX1(x1);
    setBoundX2(x2);
    setIsInverseMode(false);
    setActiveTab('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleParamChange = (paramId: string, value: number) => {
    setParamValues((prev) => ({
      ...prev,
      [paramId]: value,
    }));
  };

  // Critical cutoff value x (quantile) for inverse mode
  const criticalX = useMemo(() => {
    const val = currentDist.invCdf(targetProbInput, paramValues);
    if (!isFinite(val) || isNaN(val)) return 0;
    return currentDist.type === 'discrete' ? Math.round(val) : Number(val.toFixed(2));
  }, [currentDist, targetProbInput, paramValues]);

  // When inverse mode is active, tail mode is forced to 'leq' (P <= x) and x1 is criticalX
  const effectiveTailMode: TailMode = isInverseMode ? 'leq' : tailMode;
  const effectiveX1: number = isInverseMode ? criticalX : boundX1;

  const handleBoundsChange = (newX1: number, newX2: number) => {
    if (isInverseMode) {
      // Dragging on the chart while in inverse mode computes the cumulative probability P(X <= newX1)
      const prob = currentDist.cdf(newX1, paramValues);
      const clamped = Math.max(0.001, Math.min(0.999, prob));
      setTargetProbInput(clamped);
      setBoundX1(newX1);
    } else {
      setBoundX1(newX1);
      setBoundX2(newX2);
    }
  };

  // Toggle between Direct P(X) and Inverse (Quantile) mode
  const handleToggleInverseMode = () => {
    const nextMode = !isInverseMode;
    setIsInverseMode(nextMode);
    if (nextMode) {
      setTailMode('leq');
      setBoundX1(criticalX);
    }
  };

  // Perform Calculation with Strict 2 & 4 decimal precision
  const calculationResult: CalculationResult = useMemo(() => {
    if (isInverseMode) {
      let z1: number | undefined;
      if (currentDist.id === 'normal') {
        const mu = paramValues.mu ?? 0;
        const sigma = paramValues.sigma ?? 1;
        z1 = (effectiveX1 - mu) / sigma;
      }
      return {
        probability: targetProbInput,
        probabilityPercent: (targetProbInput * 100).toFixed(2) + '%',
        expressionText: `P(X ≤ ${effectiveX1})`,
        mode: 'leq',
        x1: effectiveX1,
        x2: boundX2,
        z1,
        distribution: currentDist,
        params: paramValues,
      };
    }

    return calculateProbability(currentDist, paramValues, tailMode, boundX1, boundX2);
  }, [currentDist, paramValues, tailMode, boundX1, boundX2, isInverseMode, targetProbInput, effectiveX1]);

  // Step-by-step mathematical explanation
  const stepByStep = useMemo(() => {
    return generateStepByStepSolution(calculationResult);
  }, [calculationResult]);

  // Filtered distributions for picker
  const filteredDistributions = Object.values(DISTRIBUTIONS).filter((d) => {
    if (distCategoryFilter === 'all') return true;
    return d.type === distCategoryFilter;
  });

  const moments = currentDist.moments(paramValues);

  // Format moment with exact 2 decimal places if number
  const formatMoment = (val: number | string) => {
    if (typeof val === 'number') {
      return isNaN(val) ? 'N/A' : val.toFixed(2);
    }
    return val;
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 pb-20 md:pb-6 ${
        isDark
          ? 'bg-[#071326] text-slate-100 selection:bg-sky-500/30 selection:text-sky-200'
          : 'bg-[#f4f7fb] text-slate-900 selection:bg-blue-600/20 selection:text-blue-900'
      }`}
    >
      {/* Top Bar with UFJF Coat of Arms, Brand, and Light/Dark Switch (No explicit install button) */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md border-b px-4 md:px-8 py-2.5 transition-colors ${
          isDark
            ? 'bg-[#071326]/90 border-[#183664]'
            : 'bg-white/95 border-slate-200 shadow-xs'
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
          {/* Zone 1: Brand Wordmark with Official UFJF Coat of Arms */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="/public/assets/aistudio/image_76466eb6.png"
              alt="Brasão da UFJF"
              className="w-8 h-10 object-contain shrink-0 drop-shadow-xs"
            />
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-black tracking-tight text-[#003882] dark:text-sky-400 whitespace-nowrap">
                  ProbMaster
                </span>
                <span className="text-xs font-bold text-[#c4161c] uppercase tracking-wider">
                  · UFJF/GV
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                Prof. Márcio Souza · DCBV / ICV
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`hover:text-[#003882] dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'calculator'
                  ? 'text-[#003882] dark:text-sky-400 border-b-2 border-[#003882] dark:border-sky-400 pb-0.5'
                  : ''
              }`}
            >
              Calculadora
            </button>
            <button
              onClick={() => setActiveTab('lab')}
              className={`hover:text-[#003882] dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'lab'
                  ? 'text-[#003882] dark:text-sky-400 border-b-2 border-[#003882] dark:border-sky-400 pb-0.5'
                  : ''
              }`}
            >
              Laboratório de Teoremas
            </button>
            <button
              onClick={() => setActiveTab('quests')}
              className={`hover:text-[#003882] dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'quests'
                  ? 'text-[#003882] dark:text-sky-400 border-b-2 border-[#003882] dark:border-sky-400 pb-0.5'
                  : ''
              }`}
            >
              Desafios & Quests
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`hover:text-[#003882] dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'text-[#003882] dark:text-sky-400 border-b-2 border-[#003882] dark:border-sky-400 pb-0.5'
                  : ''
              }`}
            >
              Evolução do Aluno
            </button>
          </nav>

          {/* Zone 3: Compact Hamburger Menu & Conditional XP Chip (Visible only when logged in) */}
          <div className="flex items-center gap-2 shrink-0 relative">
            {/* Quick XP Chip - VISIBLE ONLY WHEN AN ACTIVE STUDENT IS LOGGED IN */}
            {isAuthenticated && (
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setIsMenuOpen(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono border transition cursor-pointer ${
                  isDark
                    ? 'bg-[#0c1f3d] border-[#183664] text-amber-400 hover:border-slate-600'
                    : 'bg-amber-50 border-amber-200 text-amber-800 hover:border-amber-300'
                }`}
                title="Ver painel do estudante"
              >
                <Flame className="w-3.5 h-3.5 text-[#c4161c]" />
                <span className="font-bold">{profile.xp} XP</span>
              </button>
            )}

            {/* Hamburger Menu Toggle Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-xl border transition-all cursor-pointer relative flex items-center justify-center ${
                isMenuOpen
                  ? 'bg-[#003882] border-[#003882] text-white'
                  : isDark
                  ? 'bg-[#0c1f3d] border-[#183664] text-slate-200 hover:bg-[#132c54]'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title="Menu do Usuário & Configurações"
              aria-label="Abrir menu de opções"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              {/* Green indicator dot when authenticated */}
              {isAuthenticated && !isMenuOpen && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#071326]" />
              )}
            </button>

            {/* Hamburger Dropdown Popover */}
            {isMenuOpen && (
              <>
                {/* Backdrop to close when clicking outside */}
                <div
                  className="fixed inset-0 z-40 bg-black/20"
                  onClick={() => setIsMenuOpen(false)}
                />

                {/* Dropdown Menu Box */}
                <div
                  className={`absolute top-full right-0 mt-2 w-72 sm:w-80 rounded-2xl border shadow-2xl p-4 z-50 transition-all ${
                    isDark
                      ? 'bg-[#0a1b33] border-[#183664] text-slate-100 shadow-black/60'
                      : 'bg-white border-slate-200 text-slate-800 shadow-blue-950/15'
                  }`}
                >
                  {/* Student Status & Login/Logout Card */}
                  <div
                    className={`p-3.5 rounded-xl border mb-3 ${
                      isAuthenticated
                        ? isDark
                          ? 'bg-[#071326] border-[#183664]'
                          : 'bg-blue-50/80 border-blue-200'
                        : isDark
                        ? 'bg-[#071326] border-[#183664]'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {isAuthenticated ? (
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                              <GraduationCap className="w-4 h-4 text-[#003882] dark:text-sky-400" />
                              {profile.studentName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                              Matrícula:{' '}
                              <span className="font-bold text-[#003882] dark:text-sky-300">
                                {activeMatricula}
                              </span>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <Database className="w-2.5 h-2.5" /> Conectado
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800 font-mono">
                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                            Nível {profile.level} · {profile.levelTitle}
                          </span>
                          <span className="text-[#003882] dark:text-sky-300 font-bold">
                            {profile.xp} XP
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              setAuthModalTab('edit-profile');
                              setShowAuthModal(true);
                            }}
                            className="flex-1 py-1.5 px-2.5 text-xs font-semibold rounded-lg bg-[#003882] hover:bg-[#0c4ca3] text-white transition text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                            title="Editar informações acadêmicas do aluno"
                          >
                            <PenSquare className="w-3.5 h-3.5 text-amber-300" />
                            Editar Informações
                          </button>
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              setAuthModalTab('login');
                              setShowAuthModal(true);
                            }}
                            className="py-1.5 px-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-300"
                            title="Trocar de Aluno"
                          >
                            Trocar
                          </button>
                          <button
                            onClick={async () => {
                              await logout();
                              setIsMenuOpen(false);
                            }}
                            className="py-1.5 px-2 text-xs font-semibold rounded-lg border border-rose-300 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer flex items-center justify-center"
                            title="Sair da conta"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-[#0c1f3d] border border-blue-200 dark:border-[#183664] flex items-center justify-center text-[#003882] dark:text-sky-400">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Identificação do Aluno
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Acesse com sua matrícula para sincronizar seu progresso na UFJF.
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            setShowAuthModal(true);
                          }}
                          className="w-full py-2.5 px-3 bg-[#003882] hover:bg-[#0c4ca3] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <GraduationCap className="w-4 h-4 text-amber-300" />
                          Login / Cadastrar Matrícula
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dark / Light Mode Switch Row */}
                  <div className="pt-1 pb-2">
                    <button
                      onClick={toggleTheme}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        isDark
                          ? 'bg-[#071326] border-[#183664] text-amber-300 hover:bg-[#0c1f3d]'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isDark ? (
                          <Sun className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Moon className="w-4 h-4 text-[#003882]" />
                        )}
                        <span>{isDark ? 'Tema Claro' : 'Tema Escuro'}</span>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {isDark ? 'Ativar Claro' : 'Ativar Escuro'}
                      </span>
                    </button>
                  </div>

                  {/* Navigation links for Mobile & Quick Access */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-0.5">
                      Seções do Aplicativo
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('calculator');
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition cursor-pointer ${
                        activeTab === 'calculator'
                          ? 'bg-[#003882] text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#132c54]'
                      }`}
                    >
                      <Calculator className="w-4 h-4" />
                      Calculadora
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('lab');
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition cursor-pointer ${
                        activeTab === 'lab'
                          ? 'bg-[#003882] text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#132c54]'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      Laboratório de Teoremas
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('quests');
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition cursor-pointer ${
                        activeTab === 'quests'
                          ? 'bg-[#003882] text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#132c54]'
                      }`}
                    >
                      <Trophy className="w-4 h-4" />
                      Desafios & Quests
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('dashboard');
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition cursor-pointer ${
                        activeTab === 'dashboard'
                          ? 'bg-[#003882] text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#132c54]'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      Evolução do Aluno
                    </button>
                  </div>

                  {/* UFJF Department & Author Footer */}
                  <div className="pt-2.5 mt-2 border-t border-slate-200 dark:border-slate-800 text-center space-y-0.5">
                    <div className="text-[11px] font-bold text-[#003882] dark:text-sky-300">
                      Prof. Márcio Souza — DCBV — UFJF/GV
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Instituto de Ciências da Vida (ICV) · Campus Governador Valadares
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5 md:p-6 space-y-5">
        {/* TAB 1: CALCULADORA INTERATIVA */}
        {activeTab === 'calculator' && (
          <div className="space-y-5">
            {/* Distribution Category & Picker Carousel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div
                  className={`flex items-center gap-1 p-1 rounded-xl border text-xs ${
                    isDark ? 'bg-[#0c1f3d] border-[#183664]' : 'bg-slate-200/80 border-slate-300'
                  }`}
                >
                  <button
                    onClick={() => setDistCategoryFilter('all')}
                    className={`py-1 px-3 rounded-lg font-semibold transition-colors cursor-pointer ${
                      distCategoryFilter === 'all'
                        ? 'bg-[#003882] text-white shadow-sm'
                        : isDark
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Todas ({Object.keys(DISTRIBUTIONS).length})
                  </button>
                  <button
                    onClick={() => setDistCategoryFilter('continuous')}
                    className={`py-1 px-3 rounded-lg font-semibold transition-colors cursor-pointer ${
                      distCategoryFilter === 'continuous'
                        ? 'bg-[#003882] text-white shadow-sm'
                        : isDark
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Contínuas
                  </button>
                  <button
                    onClick={() => setDistCategoryFilter('discrete')}
                    className={`py-1 px-3 rounded-lg font-semibold transition-colors cursor-pointer ${
                      distCategoryFilter === 'discrete'
                        ? 'bg-[#003882] text-white shadow-sm'
                        : isDark
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Discretas
                  </button>
                </div>

                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} hidden sm:block`}>
                  Selecione uma distribuição para calcular e visualizar
                </div>
              </div>

              {/* Horizontal Scrollable Distribution Selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
                {filteredDistributions.map((d) => {
                  const isSelected = d.id === selectedDistId;
                  return (
                    <button
                      key={d.id}
                      onClick={() => handleSelectDistribution(d.id)}
                      className={`shrink-0 py-2 px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'bg-[#003882] border-[#003882] text-white shadow-md shadow-blue-900/20 scale-[1.02]'
                          : isDark
                          ? 'bg-[#0a1b33] border-[#183664] text-slate-300 hover:border-slate-600 hover:text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>{d.shortName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split Grid Layout (Desktop 2 Columns: Chart & Controls / Mathematical Details & Steps) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Interactive Chart + Parameters + Controls (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Distribution Banner Card */}
                <div
                  className={`rounded-2xl border p-4 shadow-sm transition-colors ${
                    isDark ? 'bg-[#0a1b33] border-[#183664]' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono mb-1 text-[#003882] dark:text-sky-400 font-bold">
                        <span>{currentDist.category}</span>
                        <span className="text-slate-400">·</span>
                        <span>{currentDist.tags.join(' · ')}</span>
                      </div>
                      <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                        {currentDist.name}
                      </h2>
                    </div>

                    {/* PDF vs CDF toggle */}
                    <div
                      className={`flex items-center p-1 rounded-xl border text-xs ${
                        isDark ? 'bg-[#071326] border-[#183664]' : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => setShowCDF(false)}
                        className={`py-1 px-2.5 rounded-lg font-bold transition-colors cursor-pointer ${
                          !showCDF
                            ? 'bg-[#003882] text-white shadow-xs'
                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {currentDist.type === 'discrete' ? 'PMF' : 'PDF'}
                      </button>
                      <button
                        onClick={() => setShowCDF(true)}
                        className={`py-1 px-2.5 rounded-lg font-bold transition-colors cursor-pointer ${
                          showCDF
                            ? 'bg-[#003882] text-white shadow-xs'
                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        CDF
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                    {currentDist.description}
                  </p>

                  {/* Compiled Formula Preview via KaTeX */}
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-400 mb-1">
                      {showCDF ? 'Função de Distribuição Acumulada F(x):' : 'Função Densidade / Massa de Probabilidade:'}
                    </div>
                    <div className={`p-2.5 rounded-xl border text-slate-950 dark:text-slate-100 ${
                      isDark ? 'bg-[#071326] border-[#183664]' : 'bg-slate-100/90 border-slate-300 shadow-xs'
                    }`}>
                      <MathBlock math={showCDF ? currentDist.formulaLatex.cdf : currentDist.formulaLatex.pdf} />
                    </div>
                  </div>
                </div>

                {/* The Interactive Chart Canvas */}
                <DistributionChart
                  dist={currentDist}
                  params={paramValues}
                  mode={effectiveTailMode}
                  x1={effectiveX1}
                  x2={boundX2}
                  onBoundsChange={handleBoundsChange}
                  showCDF={showCDF}
                  theme={theme}
                />

                {/* Calculation Mode Selector Bar */}
                <div
                  className={`rounded-2xl border p-3.5 shadow-sm space-y-3 transition-colors ${
                    isDark ? 'bg-[#0a1b33] border-[#183664]' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Modo de Cauda / Região:
                    </span>
                    <button
                      onClick={handleToggleInverseMode}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                        isInverseMode
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold'
                          : isDark
                          ? 'bg-[#071326] text-slate-300 border-slate-700 hover:text-white'
                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
                      {isInverseMode ? 'Modo Inverso Ativo (Quantil)' : 'Ativar Modo Inverso (Quantil)'}
                    </button>
                  </div>

                  {!isInverseMode ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <button
                        onClick={() => setTailMode('leq')}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center ${
                          tailMode === 'leq'
                            ? 'bg-[#003882] border-[#003882] text-white shadow-md'
                            : isDark
                            ? 'bg-[#071326] border-slate-800 text-slate-400 hover:text-slate-200'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        <span>P(X ≤ x)</span>
                        <span className="text-[10px] font-normal opacity-80">Cauda Esquerda</span>
                      </button>

                      <button
                        onClick={() => setTailMode('geq')}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center ${
                          tailMode === 'geq'
                            ? 'bg-[#003882] border-[#003882] text-white shadow-md'
                            : isDark
                            ? 'bg-[#071326] border-slate-800 text-slate-400 hover:text-slate-200'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        <span>P(X ≥ x)</span>
                        <span className="text-[10px] font-normal opacity-80">Cauda Direita</span>
                      </button>

                      <button
                        onClick={() => setTailMode('between')}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center ${
                          tailMode === 'between'
                            ? 'bg-[#003882] border-[#003882] text-white shadow-md'
                            : isDark
                            ? 'bg-[#071326] border-slate-800 text-slate-400 hover:text-slate-200'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        <span>P(x₁ ≤ X ≤ x₂)</span>
                        <span className="text-[10px] font-normal opacity-80">Intervalo Central</span>
                      </button>

                      {currentDist.type === 'discrete' ? (
                        <button
                          onClick={() => setTailMode('equal')}
                          className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center ${
                            tailMode === 'equal'
                              ? 'bg-[#003882] border-[#003882] text-white shadow-md'
                              : isDark
                              ? 'bg-[#071326] border-slate-800 text-slate-400 hover:text-slate-200'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
                          }`}
                        >
                          <span>P(X = x)</span>
                          <span className="text-[10px] font-normal opacity-80">Pontual Exato</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setTailMode('two_tail')}
                          className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center ${
                            tailMode === 'two_tail'
                              ? 'bg-[#003882] border-[#003882] text-white shadow-md'
                              : isDark
                              ? 'bg-[#071326] border-slate-800 text-slate-400 hover:text-slate-200'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
                          }`}
                        >
                          <span>P(X ≤ x₁ ∪ X ≥ x₂)</span>
                          <span className="text-[10px] font-normal opacity-80">Bicaudal (Extremos)</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Inverse Mode Input Card */
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-amber-900 dark:text-amber-200">
                          Probabilidade Desejada P:
                        </span>
                        <span className="font-mono text-amber-800 dark:text-amber-300 font-bold bg-amber-500/20 px-2.5 py-0.5 rounded border border-amber-500/30">
                          {(targetProbInput * 100).toFixed(2)}% (p = {targetProbInput.toFixed(4)})
                        </span>
                      </div>

                      <input
                        type="range"
                        min="0.001"
                        max="0.999"
                        step="0.001"
                        value={targetProbInput}
                        onChange={(e) => {
                          const newProb = Number(e.target.value);
                          setTargetProbInput(newProb);
                          const critVal = currentDist.invCdf(newProb, paramValues);
                          const roundedCrit = currentDist.type === 'discrete' ? Math.round(critVal) : Number(critVal.toFixed(2));
                          setBoundX1(roundedCrit);
                        }}
                        className="w-full accent-amber-500 h-2 bg-slate-200 dark:bg-slate-950 rounded-lg cursor-pointer"
                      />

                      {/* Região no Gráfico */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          Região no Gráfico:
                        </span>
                        <span className="font-mono text-sm md:text-base font-black text-amber-950 dark:text-amber-200">
                          P(X ≤ {effectiveX1}) = {targetProbInput.toFixed(4)}
                          <span className="text-xs font-normal opacity-80 ml-1.5">
                            ({(targetProbInput * 100).toFixed(2)}%)
                          </span>
                        </span>
                      </div>

                      <div className="text-[11px] text-amber-900 dark:text-amber-200/90 leading-relaxed font-medium">
                        <MathText
                          text={`O algoritmo calcula o quantil $x$ tal que a probabilidade acumulada à esquerda seja $P(X \\le ${effectiveX1}) = ${targetProbInput.toFixed(4)}$ (${(targetProbInput * 100).toFixed(2)}\\%).`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Sliders for Distribution Parameters & Cutoff Bounds */}
                <div
                  className={`rounded-2xl border p-4 shadow-sm space-y-4 transition-colors ${
                    isDark ? 'bg-[#0a1b33] border-[#183664]' : 'bg-white border-slate-200'
                  }`}
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#003882] dark:text-sky-400">
                    Parâmetros da Distribuição & Limites
                  </h4>

                  {/* Distribution Parameters Sliders */}
                  <div className="space-y-3">
                    {currentDist.parameters.map((p) => {
                      const val = paramValues[p.id] ?? p.defaultValue;
                      return (
                        <div key={p.id} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {p.name}:
                            </span>
                            <span className={`font-mono font-bold px-2 py-0.5 rounded border ${
                              isDark ? 'bg-[#071326] border-slate-700 text-sky-400' : 'bg-slate-100 border-slate-300 text-[#003882]'
                            }`}>
                              {val}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={p.min}
                            max={p.max}
                            step={p.step}
                            value={val}
                            onChange={(e) => handleParamChange(p.id, Number(e.target.value))}
                            className="w-full accent-[#003882] dark:accent-sky-500 h-2 bg-slate-300 dark:bg-slate-950 rounded-lg cursor-pointer"
                          />
                          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{p.description}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cutoff Point Numeric Controls */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-900 dark:text-slate-200">
                        <span className="font-bold">
                          {isInverseMode ? 'Ponto de Corte 1 (x₁ - Quantil):' : 'Ponto de Corte 1 (x₁):'}
                        </span>
                        <span className="font-mono text-[#003882] dark:text-sky-400 font-bold">{effectiveX1}</span>
                      </div>
                      <input
                        type="number"
                        step={currentDist.type === 'discrete' ? '1' : '0.01'}
                        value={effectiveX1}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (isInverseMode) {
                            const prob = currentDist.cdf(val, paramValues);
                            setTargetProbInput(Math.max(0.001, Math.min(0.999, prob)));
                          }
                          setBoundX1(val);
                        }}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono outline-none font-semibold ${
                          isDark
                            ? 'bg-[#071326] border-slate-700 text-white focus:border-sky-400'
                            : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                        }`}
                      />
                    </div>

                    {(tailMode === 'between' || tailMode === 'two_tail') && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-900 dark:text-slate-200">
                          <span className="font-bold">Ponto de Corte 2 (x₂):</span>
                          <span className="font-mono text-[#c4161c] font-bold">{boundX2}</span>
                        </div>
                        <input
                          type="number"
                          step={currentDist.type === 'discrete' ? '1' : '0.1'}
                          value={boundX2}
                          onChange={(e) => setBoundX2(Number(e.target.value))}
                          className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono outline-none font-semibold ${
                            isDark
                              ? 'bg-[#071326] border-slate-700 text-white focus:border-rose-400'
                              : 'bg-white border-slate-300 text-slate-900 focus:border-[#c4161c]'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Mathematical Calculation Results, Step-by-Step & Moments (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Master Result Card with Strict 2 decimal percentage & 4 decimal p */}
                <div
                  className={`rounded-2xl border p-5 shadow-lg space-y-3 transition-colors ${
                    isDark
                      ? 'bg-gradient-to-br from-[#0c234a] via-[#0a1b33] to-[#071326] border-[#1c437a]'
                      : 'bg-gradient-to-br from-[#003882] to-[#0c4ca3] text-white border-[#003882]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-blue-100 dark:text-sky-300">
                      {calculationResult.expressionText}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/20 border border-white/30 text-white text-[11px] font-bold">
                      Resultado
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3">
                    {/* Requirement 2: Percentage ALWAYS with two decimal places (ex: 90.10%) */}
                    <div className="text-3xl md:text-4xl font-black text-white font-mono tracking-tight">
                      {(calculationResult.probability * 100).toFixed(2)}%
                    </div>
                    {/* Requirement 2: Result of p ALWAYS with four decimal places (ex: p = 0.9010) */}
                    <div className="text-xs text-blue-200 dark:text-sky-300 font-mono font-semibold">
                      (p = {calculationResult.probability.toFixed(4)})
                    </div>
                  </div>

                  {calculationResult.z1 !== undefined && (
                    <div className="pt-2 border-t border-white/20 text-xs text-blue-100 flex items-center justify-between font-mono">
                      <span>Escore Padronizado Z₁:</span>
                      <span className="font-bold bg-white/20 px-2 py-0.5 rounded">
                        Z = {calculationResult.z1.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {stepByStep.ruleOfThumb && (
                    <div className="text-[11px] text-blue-100 leading-relaxed bg-white/10 p-2.5 rounded-xl border border-white/20">
                      {stepByStep.ruleOfThumb}
                    </div>
                  )}
                </div>

                {/* Moments & Descriptive Statistics Grid (Requirement 2: ALL with two decimal places) */}
                <div
                  className={`rounded-2xl border p-4 shadow-sm space-y-3 transition-colors ${
                    isDark ? 'bg-[#0a1b33] border-[#183664]' : 'bg-white border-slate-200'
                  }`}
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#003882] dark:text-sky-400">
                    Propriedades Teóricas & Momentos (E[X], Var, σ)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`p-2.5 rounded-xl border ${
                      isDark ? 'bg-[#071326] border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="text-slate-700 dark:text-slate-400 text-[10px] uppercase font-bold">Média E[X] (μ)</div>
                      <div className="font-mono text-sm font-bold text-[#003882] dark:text-sky-400 mt-0.5">
                        {formatMoment(moments.mean)}
                      </div>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${
                      isDark ? 'bg-[#071326] border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="text-slate-700 dark:text-slate-400 text-[10px] uppercase font-bold">Variância Var(X) (σ²)</div>
                      <div className="font-mono text-sm font-bold text-[#c4161c] dark:text-rose-400 mt-0.5">
                        {formatMoment(moments.variance)}
                      </div>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${
                      isDark ? 'bg-[#071326] border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="text-slate-700 dark:text-slate-400 text-[10px] uppercase font-bold">Desvio Padrão (σ)</div>
                      <div className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {formatMoment(moments.stdDev)}
                      </div>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${
                      isDark ? 'bg-[#071326] border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="text-slate-700 dark:text-slate-400 text-[10px] uppercase font-bold">Assimetria (Skewness)</div>
                      <div className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                        {formatMoment(moments.skewness)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pedagogical Step-by-Step Mathematical Solver (Requirement 3: COMPILED LATEX FORMULAS) */}
                <div
                  className={`rounded-2xl border p-4 shadow-sm space-y-3 transition-colors ${
                    isDark ? 'bg-[#0a1b33] border-[#183664]' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#003882] dark:text-sky-400 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-[#003882] dark:text-sky-400" />
                      Passo a Passo Didático Detalhado
                    </h4>
                    <span className="text-[10px] font-mono font-bold text-[#003882] dark:text-sky-400">
                      {stepByStep.steps.length} passos analíticos
                    </span>
                  </div>

                  <div className="space-y-3 divide-y divide-slate-200 dark:divide-slate-800">
                    {stepByStep.steps.map((st) => (
                      <div key={st.stepNumber} className="pt-3 first:pt-0 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                          <span className="w-5 h-5 rounded-full bg-[#003882]/10 dark:bg-sky-500/20 text-[#003882] dark:text-sky-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {st.stepNumber}
                          </span>
                          <span className="text-slate-900 dark:text-white font-bold">{st.title}</span>
                        </div>
                        {/* Compiled Explanation Text with inline LaTeX */}
                        <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed pl-7 font-normal">
                          <MathText text={st.explanation} />
                        </div>
                        {/* Compiled Block Equation via KaTeX */}
                        {st.mathExpression && (
                          <div className={`ml-7 p-2.5 rounded-xl border text-slate-950 dark:text-slate-100 ${
                            isDark ? 'bg-[#071326] border-[#183664]' : 'bg-slate-100/90 border-slate-300 shadow-xs'
                          }`}>
                            <MathBlock math={st.mathExpression} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Conclusion Banner with Strict 2 decimal % and 4 decimal p */}
                  <div className={`p-3 rounded-xl border text-xs leading-relaxed font-medium ${
                    isDark ? 'bg-sky-950/40 border-sky-800/50 text-sky-200' : 'bg-blue-50/90 border-blue-200 text-blue-950'
                  }`}>
                    <MathText text={stepByStep.conclusion} />
                  </div>

                  {/* Real World Application Box */}
                  <div className={`mt-3 p-3 rounded-xl border text-xs space-y-1.5 ${
                    isDark ? 'bg-[#071326] border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-[#003882] dark:text-sky-400" />
                      Contexto Real & Aplicação Prática:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed font-normal">
                      {currentDist.realWorldContext}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LABORATÓRIO DE CONVERGÊNCIA & TEOREMAS */}
        {activeTab === 'lab' && <ConvergenceLab theme={theme} />}

        {/* TAB 3: DESAFIOS & QUESTS ADAPTATIVAS */}
        {activeTab === 'quests' && (
          <QuestsView
            challenges={activeChallenges}
            onSubmitAttempt={submitChallengeAttempt}
            onGenerateAdaptive={createAdaptiveTargetedChallenge}
            onOpenInCalculator={handleOpenInCalculator}
            theme={theme}
          />
        )}

        {/* TAB 4: PAINEL DE EVOLUÇÃO & RELATÓRIO DO PROFESSOR */}
        {activeTab === 'dashboard' && (
          <StudentDashboard
            profile={profile}
            onUpdateProfile={updateProfileInfo}
            onUploadAvatar={uploadAvatar}
            theme={theme}
            isAuthenticated={isAuthenticated}
            activeMatricula={activeMatricula}
            onOpenAuthModal={() => setShowAuthModal(true)}
            isSyncing={isSyncing}
          />
        )}
      </main>

      {/* Institutional Academic Footer with Author Credit */}
      <footer className="mt-auto py-5 border-t border-slate-200 dark:border-[#183664] text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 space-y-1">
          <div className="font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 flex-wrap">
            <span>ProbMaster UFJF</span>
            <span>·</span>
            <span>Autoria: <strong className="text-[#003882] dark:text-sky-400">Prof. Márcio Souza</strong> — DCBV — UFJF/GV</span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            Departamento de Ciências Básicas da Vida · Instituto de Ciências da Vida (ICV) · Universidade Federal de Juiz de Fora / Campus Governador Valadares
          </div>
        </div>
      </footer>

      {/* Modal de Autenticação, Registro e Edição de Perfil do Aluno (Supabase UFJF) */}
      <StudentAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        isAuthenticated={isAuthenticated}
        activeMatricula={activeMatricula}
        studentName={profile.studentName}
        profile={profile}
        initialTab={authModalTab}
        isSyncing={isSyncing}
        onLogin={login}
        onRegister={register}
        onUpdateProfile={updateProfileInfo}
        onUploadAvatar={uploadAvatar}
        onLogout={logout}
        onRefresh={() => (userId ? refreshFromSupabase(userId) : Promise.resolve())}
        theme={theme}
      />

      {/* Fixed Ergonomic Bottom Tab Bar for Mobile Thumb Ergonomics */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t md:hidden h-16 grid grid-cols-4 items-center px-2 transition-colors ${
          isDark
            ? 'bg-[#071326]/95 border-[#183664]'
            : 'bg-white/95 border-slate-200 shadow-lg'
        }`}
      >
        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            activeTab === 'calculator'
              ? 'text-[#003882] dark:text-sky-400 font-bold'
              : 'text-slate-500'
          }`}
        >
          <Calculator className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Cálculo</span>
        </button>

        <button
          onClick={() => setActiveTab('lab')}
          className={`flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            activeTab === 'lab'
              ? 'text-[#003882] dark:text-sky-400 font-bold'
              : 'text-slate-500'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Teoremas</span>
        </button>

        <button
          onClick={() => setActiveTab('quests')}
          className={`flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            activeTab === 'quests'
              ? 'text-[#003882] dark:text-sky-400 font-bold'
              : 'text-slate-500'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Desafios</span>
        </button>

        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-[#003882] dark:text-sky-400 font-bold'
              : 'text-slate-500'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Evolução</span>
        </button>
      </nav>
    </div>
  );
}
