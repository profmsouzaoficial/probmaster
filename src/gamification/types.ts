/**
 * Gamification & Adaptive Learning Types
 */

export interface StudentChallenge {
  id: string;
  distId: string;
  distName: string;
  title: string;
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado';
  story: string;
  question: string;
  targetExpression: string;
  params: Record<string, number>;
  expectedAnswer: number;
  tolerance: number; // e.g. 0.02
  hint1: string;
  hint2: string;
  fullExplanation: string;
  xpReward: number;
}

export interface SolvedRecord {
  id: string;
  challengeId: string;
  challengeTitle: string;
  distId: string;
  distName: string;
  difficulty: string;
  userAnswer: number;
  expectedAnswer: number;
  isCorrect: boolean;
  scorePercent: number;
  xpEarned: number;
  timestamp: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconName: string;
  unlockedAt?: string;
  category: 'calculo' | 'desafio' | 'teoria' | 'maestria';
}

export interface StudentProfile {
  studentName: string;
  studentId: string; // Matrícula
  institution: string; // Turma / Universidade
  turma?: string; // Turma (ex: Estatística I - Turma A)
  semestre?: string; // Semestre (ex: 2026.1)
  email?: string; // E-mail institucional UFJF (@ufjf.br)
  personalEmail?: string; // E-mail particular opcional
  avatarUrl?: string; // URL da foto do aluno (Supabase Storage)
  level: number;
  levelTitle: string;
  xp: number;
  nextLevelXp: number;
  streakDays: number;
  totalCalculationsDone: number;
  challengesSolvedCount: number;
  accuracyRate: number; // 0 - 100%
  distributionMastery: Record<string, number>; // distId -> 0 to 100
  badges: Badge[];
  history: SolvedRecord[];
}
