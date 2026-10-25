/**
 * Gamification & Student Evolution Hook with Supabase Synchronization
 * Manages XP, Levels, Badges, Mastery Radar, Streaks, History, and Persistence.
 */

import { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Badge, SolvedRecord, StudentChallenge, StudentProfile } from './types';
import { INITIAL_CHALLENGES, generateAdaptiveChallenge } from './challengeBank';
import {
  supabase,
  loginStudent,
  registerStudent,
  authenticateStudentByMatricula,
  fetchStudentDataFromSupabase,
  syncStudentProfile,
  syncDistributionMastery,
  recordChallengeToSupabase,
  logCalculationToSupabase,
  recordBadgeToSupabase,
  logoutCurrentStudent,
  fetchChallengesFromSupabase,
  saveChallengeToSupabase,
  uploadAvatarToSupabase,
  RegisterStudentParams,
} from '../lib/supabase';

const STORAGE_KEY = 'probmaster_student_profile_v2';
const STUDENT_AUTH_KEY = 'probmaster_matricula_active';

const LEVEL_TIERS = [
  { level: 1, title: 'Calouro Amostral', xpReq: 0 },
  { level: 2, title: 'Explorador Gaussiano', xpReq: 100 },
  { level: 3, title: 'Domador de Poisson', xpReq: 250 },
  { level: 4, title: 'Analista de Intervalos', xpReq: 450 },
  { level: 5, title: 'Mestre das Caudas', xpReq: 700 },
  { level: 6, title: 'Estatístico Bayesiano', xpReq: 1050 },
  { level: 7, title: 'Cientista de Dados Titular', xpReq: 1500 },
];

export const INITIAL_BADGES: Badge[] = [
  {
    id: 'first_calc',
    name: 'Primeiro Cálculo',
    description: 'Explorou sua primeira distribuição de probabilidade.',
    iconName: 'Calculator',
    category: 'calculo',
  },
  {
    id: 'bell_curve',
    name: 'Mestre do Sino',
    description: 'Explorou a distribuição Normal 5 vezes com diferentes parâmetros.',
    iconName: 'TrendingUp',
    category: 'calculo',
  },
  {
    id: 'challenge_ace',
    name: 'Calculista Preciso',
    description: 'Acertou um desafio com precisão exata na primeira tentativa.',
    iconName: 'CheckCircle',
    category: 'desafio',
  },
  {
    id: 'tlc_explorer',
    name: 'Rigor do Limite Central',
    description: 'Manipulou o laboratório do Teorema do Limite Central.',
    iconName: 'Layers',
    category: 'teoria',
  },
  {
    id: 'polymath',
    name: 'Explorador Polimático',
    description: 'Calculou com pelo menos 5 distribuições distintas.',
    iconName: 'Compass',
    category: 'maestria',
  },
  {
    id: 'streak_master',
    name: 'Disciplina Amostral',
    description: 'Manteve sequência de estudos ativa.',
    iconName: 'Flame',
    category: 'maestria',
  },
];

const DEFAULT_PROFILE: StudentProfile = {
  studentName: 'Estudante UFJF',
  studentId: '2026-UFJF',
  institution: 'UFJF/GV - ICV - DCBV',
  turma: 'Estatística I - Turma A',
  semestre: '2026.1',
  avatarUrl: undefined,
  level: 1,
  levelTitle: 'Calouro Amostral',
  xp: 0,
  nextLevelXp: 100,
  streakDays: 1,
  totalCalculationsDone: 0,
  challengesSolvedCount: 0,
  accuracyRate: 0,
  distributionMastery: {
    normal: 10,
    binomial: 10,
    poisson: 10,
    student_t: 10,
    chi_square: 10,
    exponential: 10,
    fisher_f: 10,
    gamma: 10,
    beta_dist: 10,
    weibull: 10,
    uniform_cont: 10,
    geometric: 10,
    hypergeometric: 10,
  },
  badges: INITIAL_BADGES,
  history: [],
};

export function useGamification() {
  const [profile, setProfile] = useState<StudentProfile>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PROFILE;
  });

  const [activeChallenges, setActiveChallenges] = useState<StudentChallenge[]>(INITIAL_CHALLENGES);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeMatricula, setActiveMatricula] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STUDENT_AUTH_KEY);
    } catch {
      return null;
    }
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isDbLoadedChallenges, setIsDbLoadedChallenges] = useState<boolean>(false);

  // Load challenges from Supabase challenges table
  const loadChallenges = useCallback(async () => {
    try {
      const dbChallenges = await fetchChallengesFromSupabase();
      if (dbChallenges && dbChallenges.length > 0) {
        setActiveChallenges(dbChallenges);
        setIsDbLoadedChallenges(true);
      }
    } catch (e) {
      console.warn('Erro ao carregar banco de desafios do Supabase:', e);
    }
  }, []);

  // Compute current Level and Title from XP
  const computeLevel = (currentXp: number) => {
    let currentTier = LEVEL_TIERS[0];
    let nextReq = LEVEL_TIERS[1].xpReq;

    for (let i = 0; i < LEVEL_TIERS.length; i++) {
      if (currentXp >= LEVEL_TIERS[i].xpReq) {
        currentTier = LEVEL_TIERS[i];
        nextReq = LEVEL_TIERS[i + 1]?.xpReq || currentTier.xpReq + 500;
      } else {
        break;
      }
    }
    return {
      level: currentTier.level,
      title: currentTier.title,
      nextReq,
    };
  };

  // Load student profile and challenges from Supabase on init or change
  const refreshFromSupabase = useCallback(async (uid: string) => {
    setIsSyncing(true);
    try {
      await loadChallenges();
      const remoteData = await fetchStudentDataFromSupabase(uid);
      if (remoteData) {
        setProfile((prev) => {
          const merged: StudentProfile = {
            ...prev,
            ...remoteData,
            distributionMastery: {
              ...prev.distributionMastery,
              ...(remoteData.distributionMastery || {}),
            },
            history: remoteData.history && remoteData.history.length > 0 ? remoteData.history : prev.history,
            badges: prev.badges,
          };
          return merged;
        });
      }
      setLastSyncTime(new Date());
    } catch (e) {
      console.warn('Erro ao atualizar do Supabase:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [loadChallenges]);

  // Initial load of challenges
  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  // Monitor Supabase session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        const matricula =
          session.user.user_metadata?.matricula || session.user.email?.split('@')[0] || '';
        setActiveMatricula(matricula);
        try {
          localStorage.setItem(STUDENT_AUTH_KEY, matricula);
        } catch {
          // ignore
        }
        refreshFromSupabase(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        const matricula =
          session.user.user_metadata?.matricula || session.user.email?.split('@')[0] || '';
        setActiveMatricula(matricula);
        try {
          localStorage.setItem(STUDENT_AUTH_KEY, matricula);
        } catch {
          // ignore
        }
        refreshFromSupabase(session.user.id);
      } else {
        setUserId(null);
        setActiveMatricula(null);
        try {
          localStorage.removeItem(STUDENT_AUTH_KEY);
        } catch {
          // ignore
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshFromSupabase]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, [profile]);

  // Trigger celebratory confetti
  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#003882', '#c4161c', '#dfa628', '#38bdf8', '#34d399'],
      });
    } catch {
      // Safe fallback
    }
  };

  // Student Login (Existing account)
  const login = async (matriculaOrEmail: string, customPassword?: string) => {
    setIsSyncing(true);
    const result = await loginStudent(matriculaOrEmail, customPassword);
    if (result.success && result.userId) {
      setUserId(result.userId);
      setActiveMatricula(result.matricula || matriculaOrEmail);
      try {
        localStorage.setItem(STUDENT_AUTH_KEY, result.matricula || matriculaOrEmail);
      } catch {
        // ignore
      }
      await refreshFromSupabase(result.userId);
    }
    setIsSyncing(false);
    return result;
  };

  // Student Register (New account)
  const register = async (
    paramsOrMatricula: string | RegisterStudentParams,
    studentName?: string,
    customEmail?: string,
    customPassword?: string
  ) => {
    setIsSyncing(true);
    const result = await registerStudent(paramsOrMatricula, studentName, customEmail, customPassword);
    const matricula = typeof paramsOrMatricula === 'object' ? paramsOrMatricula.matricula : paramsOrMatricula;
    if (result.success && result.userId) {
      setUserId(result.userId);
      setActiveMatricula(result.matricula || matricula);
      try {
        localStorage.setItem(STUDENT_AUTH_KEY, result.matricula || matricula);
      } catch {
        // ignore
      }
      await refreshFromSupabase(result.userId);
    }
    setIsSyncing(false);
    return result;
  };

  // Student Login / Auto-Registration fallback
  const loginByMatricula = async (matricula: string, studentName?: string) => {
    setIsSyncing(true);
    const result = await authenticateStudentByMatricula(matricula, studentName);
    if (result.success && result.userId) {
      setUserId(result.userId);
      setActiveMatricula(result.matricula || matricula);
      try {
        localStorage.setItem(STUDENT_AUTH_KEY, result.matricula || matricula);
      } catch {
        // ignore
      }
      await refreshFromSupabase(result.userId);
    }
    setIsSyncing(false);
    return result;
  };

  // Student Logout
  const logout = async () => {
    await logoutCurrentStudent();
    setUserId(null);
    setActiveMatricula(null);
    try {
      localStorage.removeItem(STUDENT_AUTH_KEY);
    } catch {
      // ignore
    }
  };

  // Add XP and check for level-ups & badges
  const addXP = (amount: number, reason?: string) => {
    setProfile((prev) => {
      const newXp = prev.xp + amount;
      const { level, title, nextReq } = computeLevel(newXp);

      if (level > prev.level) {
        triggerCelebration();
      }

      const updated = {
        ...prev,
        xp: newXp,
        level,
        levelTitle: title,
        nextLevelXp: nextReq,
      };

      if (userId) {
        syncStudentProfile(userId, updated);
      }

      return updated;
    });
  };

  // Record a calculation event (increases mastery for that distribution)
  const recordCalculation = (distId: string) => {
    setProfile((prev) => {
      const currentMastery = prev.distributionMastery[distId] || 10;
      const newMastery = Math.min(100, currentMastery + 3);
      const totalCalcs = prev.totalCalculationsDone + 1;

      // Unlock badges if criteria met
      const updatedBadges = prev.badges.map((b) => {
        if (b.id === 'first_calc' && !b.unlockedAt) {
          if (userId) recordBadgeToSupabase(userId, b.id);
          return { ...b, unlockedAt: new Date().toISOString().split('T')[0] };
        }
        if (b.id === 'bell_curve' && distId === 'normal' && totalCalcs >= 5 && !b.unlockedAt) {
          if (userId) recordBadgeToSupabase(userId, b.id);
          return { ...b, unlockedAt: new Date().toISOString().split('T')[0] };
        }
        return b;
      });

      const updated: StudentProfile = {
        ...prev,
        totalCalculationsDone: totalCalcs,
        distributionMastery: {
          ...prev.distributionMastery,
          [distId]: newMastery,
        },
        badges: updatedBadges,
      };

      // Asynchronous background sync to Supabase
      if (userId) {
        syncStudentProfile(userId, updated);
        syncDistributionMastery(userId, distId, newMastery);
        logCalculationToSupabase(userId, distId);
      }

      return updated;
    });
  };

  // Submit challenge attempt
  const submitChallengeAttempt = (
    challenge: StudentChallenge,
    userAnswer: number
  ): { isCorrect: boolean; scorePercent: number; xpEarned: number } => {
    const error = Math.abs(userAnswer - challenge.expectedAnswer);
    const isCorrect = error <= challenge.tolerance;
    const scorePercent = isCorrect ? 100 : Math.max(0, Math.round((1 - error / challenge.expectedAnswer) * 100));
    const xpEarned = isCorrect ? challenge.xpReward : Math.round(challenge.xpReward * 0.25);

    if (isCorrect) {
      triggerCelebration();
    }

    const newRecord: SolvedRecord = {
      id: `sol_${Date.now()}`,
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      distId: challenge.distId,
      distName: challenge.distName,
      difficulty: challenge.difficulty,
      userAnswer,
      expectedAnswer: challenge.expectedAnswer,
      isCorrect,
      scorePercent,
      xpEarned,
      timestamp: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    };

    setProfile((prev) => {
      const newHistory = [newRecord, ...prev.history];
      const correctCount = newHistory.filter((h) => h.isCorrect).length;
      const accuracyRate = Math.round((correctCount / newHistory.length) * 100);

      // Boost mastery
      const currentMastery = prev.distributionMastery[challenge.distId] || 20;
      const boost = isCorrect ? 15 : 5;
      const newMastery = Math.min(100, currentMastery + boost);

      const newXp = prev.xp + xpEarned;
      const { level, title, nextReq } = computeLevel(newXp);

      const updated: StudentProfile = {
        ...prev,
        xp: newXp,
        level,
        levelTitle: title,
        nextLevelXp: nextReq,
        challengesSolvedCount: prev.challengesSolvedCount + (isCorrect ? 1 : 0),
        accuracyRate,
        history: newHistory,
        distributionMastery: {
          ...prev.distributionMastery,
          [challenge.distId]: newMastery,
        },
      };

      // Asynchronous background sync to Supabase
      if (userId) {
        syncStudentProfile(userId, updated);
        syncDistributionMastery(userId, challenge.distId, newMastery);
        recordChallengeToSupabase(userId, newRecord);
      }

      return updated;
    });

    return { isCorrect, scorePercent, xpEarned };
  };

  // Generate an adaptive challenge targeting the weakest distribution
  const createAdaptiveTargetedChallenge = () => {
    const masteryEntries = Object.entries(profile.distributionMastery);
    masteryEntries.sort((a, b) => a[1] - b[1]);
    const weakestDistId = masteryEntries[0] ? masteryEntries[0][0] : 'normal';

    const newChallenge = generateAdaptiveChallenge(weakestDistId, 'Intermediário');
    setActiveChallenges((prev) => [newChallenge, ...prev]);
    saveChallengeToSupabase(newChallenge);
    return newChallenge;
  };

  // Update Student Profile Info with Turma, Semestre, Avatar, and Emails
  const updateProfileInfo = (
    name: string,
    id: string,
    turma: string,
    semestre?: string,
    avatarUrl?: string,
    email?: string,
    personalEmail?: string
  ) => {
    setProfile((prev) => {
      const updated: StudentProfile = {
        ...prev,
        studentName: name,
        studentId: id,
        institution: turma,
        turma,
        semestre: semestre || prev.semestre || '2026.1',
        email: email !== undefined ? email : prev.email,
        personalEmail: personalEmail !== undefined ? personalEmail : prev.personalEmail,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : prev.avatarUrl,
      };
      if (userId) {
        syncStudentProfile(userId, updated);
      }
      return updated;
    });
  };

  // Upload student photo/avatar to Supabase Storage bucket 'avatars'
  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!userId) {
      // Local preview fallback if not logged in
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          updateProfileInfo(
            profile.studentName,
            profile.studentId,
            profile.turma || profile.institution,
            profile.semestre,
            base64
          );
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });
    }

    const res = await uploadAvatarToSupabase(userId, file);
    if (res.success && res.url) {
      updateProfileInfo(
        profile.studentName,
        profile.studentId,
        profile.turma || profile.institution,
        profile.semestre,
        res.url
      );
      return res.url;
    }
    return null;
  };

  return {
    profile,
    activeChallenges,
    isDbLoadedChallenges,
    userId,
    activeMatricula,
    isAuthenticated: Boolean(userId),
    isSyncing,
    lastSyncTime,
    login,
    register,
    loginByMatricula,
    logout,
    refreshFromSupabase,
    loadChallenges,
    addXP,
    recordCalculation,
    submitChallengeAttempt,
    createAdaptiveTargetedChallenge,
    updateProfileInfo,
    uploadAvatar,
  };
}
