/**
 * Supabase Client & Student Synchronization Services
 * Universidade Federal de Juiz de Fora (UFJF) - ProbMaster
 */

import { createClient } from '@supabase/supabase-js';
import { Badge, SolvedRecord, StudentProfile, StudentChallenge } from '../gamification/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kbmrgwqdroxtbtnvtdrs.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibXJnd3Fkcm94dGJ0bnZ0ZHJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MzIzNzEsImV4cCI6MjEwODQwODM3MX0.eSFWCOSTsXFG7cmLHySm93w1CbOuAjMpVapT4pBsGdU';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Normalizes credentials from matricula or custom email:
 * - Uses @ufjf.br domain by default (which has valid public MX records and passes GoTrue domain validation)
 * - Ensures password meets minimum 6 characters required by Supabase Auth
 */
export function formatStudentCredentials(matriculaOrEmail: string, customPassword?: string) {
  const input = matriculaOrEmail.trim().toLowerCase();
  const isEmail = input.includes('@');
  
  const cleanMatricula = isEmail ? input.split('@')[0].replace(/[^a-z0-9]/g, '') : input.replace(/[^a-z0-9]/g, '');
  const email = isEmail ? input : `${cleanMatricula}@ufjf.br`;
  
  // Password generation with 6+ char guarantee
  let password = customPassword ? customPassword.trim() : cleanMatricula;
  if (password.length < 6) {
    password = password.padEnd(6, '0');
  }

  return { cleanMatricula, email, password };
}

export interface StudentAuthResult {
  success: boolean;
  userId?: string;
  matricula?: string;
  studentName?: string;
  email?: string;
  isNewUser?: boolean;
  notFound?: boolean;
  invalidPassword?: boolean;
  alreadyRegistered?: boolean;
  error?: string;
}

/**
 * Searches and resolves a student's actual Supabase account details
 * Supports:
 * - RPC resolve_student_login
 * - Direct query in public.profiles
 * - Intelligent fallback mappings
 */
export async function resolveStudentAccount(identifier: string): Promise<{
  found: boolean;
  email?: string;
  studentName?: string;
  matricula?: string;
  userId?: string;
}> {
  const clean = identifier.trim();
  if (!clean) return { found: false };

  const norm = clean.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Try PostgreSQL RPC resolve_student_login
  try {
    const { data, error } = await supabase.rpc('resolve_student_login', {
      identifier: clean,
    });
    if (!error && data && data.found) {
      return {
        found: true,
        email: data.email,
        studentName: data.student_name,
        matricula: data.matricula,
        userId: data.user_id,
      };
    }
  } catch (err) {
    // RPC might not be deployed yet, proceed to fallbacks
  }

  // 2. Try querying public.profiles directly
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, matricula, student_name, email, personal_email')
      .or(`matricula.eq.${clean},matricula.eq.${norm}${clean.includes('@') ? `,email.eq.${clean.toLowerCase()},personal_email.eq.${clean.toLowerCase()}` : ''}`)
      .limit(1)
      .maybeSingle();

    if (profile) {
      return {
        found: true,
        email: profile.email || (profile.matricula === '123456' ? 'marcio.souza@ufjf.br' : `${profile.matricula}@ufjf.br`),
        studentName: profile.student_name,
        matricula: profile.matricula,
        userId: profile.id,
      };
    }
  } catch (err) {
    // Proceed to fallbacks
  }

  // 3. Known fallback for Márcio Souza's account (matricula 123456)
  if (norm === '123456' || clean.toLowerCase() === 'marcio.souza@ufjf.br') {
    return {
      found: true,
      email: 'marcio.souza@ufjf.br',
      studentName: 'Prof. Márcio Souza',
      matricula: '123456',
    };
  }

  // 4. If input is already an email address
  if (clean.includes('@')) {
    return {
      found: true,
      email: clean.toLowerCase(),
      matricula: norm,
    };
  }

  return { found: false };
}

/**
 * Logs in an existing student with intelligent resolution
 */
export async function loginStudent(
  matriculaOrEmail: string,
  customPassword?: string
): Promise<StudentAuthResult> {
  const clean = matriculaOrEmail.trim();
  if (!clean) {
    return { success: false, error: 'Por favor, informe a matrícula ou e-mail do aluno.' };
  }

  const cleanMatricula = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
  const resolved = await resolveStudentAccount(clean);

  // Candidate emails to attempt login with
  const candidateEmails: string[] = [];
  if (resolved.email && !candidateEmails.includes(resolved.email)) {
    candidateEmails.push(resolved.email);
  }
  if (clean.includes('@') && !candidateEmails.includes(clean.toLowerCase())) {
    candidateEmails.push(clean.toLowerCase());
  }
  if (cleanMatricula === '123456' && !candidateEmails.includes('marcio.souza@ufjf.br')) {
    candidateEmails.push('marcio.souza@ufjf.br');
  }
  if (cleanMatricula && !candidateEmails.includes(`${cleanMatricula}@ufjf.br`)) {
    candidateEmails.push(`${cleanMatricula}@ufjf.br`);
  }
  if (cleanMatricula && !candidateEmails.includes(`${cleanMatricula}@probmaster.com.br`)) {
    candidateEmails.push(`${cleanMatricula}@probmaster.com.br`);
  }

  // Candidate passwords to try
  const candidatePasswords: string[] = [];
  if (customPassword && customPassword.trim()) {
    candidatePasswords.push(customPassword.trim());
  }
  if (cleanMatricula) {
    candidatePasswords.push(cleanMatricula);
    if (cleanMatricula.length < 6) {
      candidatePasswords.push(cleanMatricula.padEnd(6, '0'));
    }
  }

  let lastErrorMessage = '';
  let encounteredInvalidCredentials = false;

  // Try candidate email and password combinations
  for (const email of candidateEmails) {
    for (const pwd of candidatePasswords) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pwd,
        });

        if (!error && data.user) {
          return {
            success: true,
            userId: data.user.id,
            matricula: resolved.matricula || cleanMatricula,
            studentName: resolved.studentName,
            email,
            isNewUser: false,
          };
        }

        if (error) {
          const msg = error.message.toLowerCase();
          lastErrorMessage = error.message;

          if (
            msg.includes('invalid login credentials') ||
            msg.includes('invalid credentials')
          ) {
            encounteredInvalidCredentials = true;
          }

          if (msg.includes('email not confirmed')) {
            return {
              success: false,
              error:
                'E-mail pendente de confirmação. No painel do Supabase (Authentication > Providers > Email), desmarque "Confirm email" para login instantâneo.',
            };
          }
        }
      } catch (err: unknown) {
        lastErrorMessage = err instanceof Error ? err.message : 'Falha na autenticação';
      }
    }
  }

  // If credentials failed but account is confirmed to exist
  if (resolved.found || encounteredInvalidCredentials) {
    const studentDisplayName = resolved.studentName || 'Aluno';
    const emailHint = resolved.email || candidateEmails[0];
    return {
      success: false,
      notFound: false,
      invalidPassword: true,
      matricula: resolved.matricula || cleanMatricula,
      studentName: studentDisplayName,
      email: emailHint,
      error: `Cadastro de ${studentDisplayName} localizado (${emailHint})! A senha padrão não confere. Por favor, insira sua senha cadastrada.`,
    };
  }

  return {
    success: false,
    notFound: true,
    matricula: cleanMatricula,
    error: `A matrícula "${cleanMatricula}" não foi localizada no Supabase. Caso seja seu primeiro acesso, cadastre-se na aba "Novo Aluno".`,
  };
}

export interface RegisterStudentParams {
  matricula: string;
  studentName: string;
  ufjfEmail: string;
  turma: string;
  semestre: string;
  personalEmail?: string;
  password?: string;
}

/**
 * Validates that an email belongs to Universidade Federal de Juiz de Fora (ends in "ufjf.br")
 */
export function isInstitutionalUfjfEmail(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?ufjf\.br$/i.test(clean) || clean.endsWith('ufjf.br');
}

/**
 * Registers a new student in Supabase with conflict prevention and mandatory academic fields
 */
export async function registerStudent(
  paramsOrMatricula: string | RegisterStudentParams,
  legacyName?: string,
  legacyEmail?: string,
  legacyPassword?: string
): Promise<StudentAuthResult> {
  const isObject = typeof paramsOrMatricula === 'object';
  const matriculaInput = isObject ? paramsOrMatricula.matricula : paramsOrMatricula;
  const studentNameInput = isObject ? paramsOrMatricula.studentName : legacyName;
  const ufjfEmailInput = isObject ? paramsOrMatricula.ufjfEmail : legacyEmail;
  const turmaInput = isObject ? paramsOrMatricula.turma : 'Estatística I - Turma A';
  const semestreInput = isObject ? paramsOrMatricula.semestre : '2026.1';
  const personalEmailInput = isObject ? paramsOrMatricula.personalEmail : undefined;
  const customPassword = isObject ? paramsOrMatricula.password : legacyPassword;

  const cleanMatricula = (matriculaInput || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!cleanMatricula) {
    return { success: false, error: 'Por favor, informe uma matrícula válida para cadastro.' };
  }

  const cleanName = (studentNameInput || '').trim();
  if (!cleanName) {
    return { success: false, error: 'O Nome Completo do aluno é obrigatório no cadastro.' };
  }

  const cleanUfjfEmail = (ufjfEmailInput || '').trim().toLowerCase();
  if (!cleanUfjfEmail) {
    return { success: false, error: 'O E-mail institucional da UFJF é obrigatório (deve terminar em ufjf.br).' };
  }

  if (!isInstitutionalUfjfEmail(cleanUfjfEmail)) {
    return {
      success: false,
      error: 'E-mail institucional inválido. É obrigatório que o e-mail termine com "ufjf.br" (ex: seu.nome@ufjf.br ou aluno@estudante.ufjf.br).',
    };
  }

  const cleanTurma = (turmaInput || '').trim();
  if (!cleanTurma) {
    return { success: false, error: 'A Turma do aluno é obrigatória (ex: Estatística I - Turma A).' };
  }

  const cleanSemestre = (semestreInput || '').trim();
  if (!cleanSemestre) {
    return { success: false, error: 'O Semestre do aluno é obrigatório (ex: 2026.1).' };
  }

  const cleanPersonalEmail = personalEmailInput?.trim() ? personalEmailInput.trim().toLowerCase() : undefined;

  // Pre-check if matricula is already registered to avoid unique constraint error
  const existing = await resolveStudentAccount(cleanMatricula);
  if (existing.found) {
    return {
      success: false,
      alreadyRegistered: true,
      matricula: cleanMatricula,
      studentName: existing.studentName,
      email: existing.email,
      error: `A matrícula ${cleanMatricula} já possui cadastro no sistema (${existing.studentName || 'Aluno'} · ${existing.email}). Por favor, acesse pela aba "Já sou cadastrado (Entrar)".`,
    };
  }

  let password = customPassword && customPassword.trim().length >= 6
    ? customPassword.trim()
    : cleanMatricula;
  if (password.length < 6) {
    password = password.padEnd(6, '0');
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanUfjfEmail,
      password,
      options: {
        data: {
          matricula: cleanMatricula,
          student_name: cleanName,
          email: cleanUfjfEmail,
          personal_email: cleanPersonalEmail || null,
          turma: cleanTurma,
          semestre: cleanSemestre,
        },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('user already registered') || msg.includes('already exists')) {
        return {
          success: false,
          alreadyRegistered: true,
          error: `O email ${cleanUfjfEmail} ou a matrícula já está cadastrado. Por favor, utilize a aba "Já sou cadastrado (Entrar)".`,
        };
      }

      if (msg.includes('rate limit')) {
        return {
          success: false,
          error:
            'Limite de envio de emails do Supabase atingido. Dica: no painel do Supabase (Authentication > Providers > Email), desative a opção "Confirm email" para cadastro instantâneo de alunos sem limite de emails.',
        };
      }

      return { success: false, error: error.message };
    }

    if (data.user) {
      // Initialize profile row in public.profiles
      await syncStudentProfile(data.user.id, {
        studentId: cleanMatricula,
        studentName: cleanName,
        institution: cleanTurma,
        turma: cleanTurma,
        semestre: cleanSemestre,
        email: cleanUfjfEmail,
        personalEmail: cleanPersonalEmail,
        level: 1,
        levelTitle: 'Calouro Amostral',
        xp: 0,
        nextLevelXp: 100,
        streakDays: 1,
        totalCalculationsDone: 0,
        challengesSolvedCount: 0,
        accuracyRate: 0,
        distributionMastery: {},
        badges: [],
        history: [],
      });

      return {
        success: true,
        userId: data.user.id,
        matricula: cleanMatricula,
        studentName: cleanName,
        email: cleanUfjfEmail,
        isNewUser: true,
      };
    }

    return { success: false, error: 'Falha desconhecida no cadastro.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao cadastrar no Supabase';
    return { success: false, error: msg };
  }
}

/**
 * Backward compatible single-step login or auto-register
 */
export async function authenticateStudentByMatricula(
  matriculaInput: string,
  optionalName?: string
): Promise<StudentAuthResult> {
  const loginRes = await loginStudent(matriculaInput);
  if (loginRes.success) {
    return loginRes;
  }

  if (loginRes.notFound) {
    return registerStudent(matriculaInput, optionalName);
  }

  return loginRes;
}

/**
 * Fetch complete student data from Supabase
 */
export async function fetchStudentDataFromSupabase(
  userId: string
): Promise<Partial<StudentProfile> | null> {
  try {
    // 1. Fetch profile
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileErr && profileErr.code !== 'PGRST116') {
      console.warn('Erro ao carregar perfil do Supabase:', profileErr);
    }

    // 2. Fetch mastery
    const { data: masteryData } = await supabase
      .from('distribution_mastery')
      .select('dist_id, mastery')
      .eq('user_id', userId);

    const distributionMastery: Record<string, number> = {};
    if (masteryData) {
      masteryData.forEach((row) => {
        distributionMastery[row.dist_id] = row.mastery;
      });
    }

    // 3. Fetch challenge history
    const { data: historyData } = await supabase
      .from('challenge_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    const history: SolvedRecord[] = [];
    if (historyData) {
      historyData.forEach((row) => {
        history.push({
          id: row.id,
          challengeId: row.challenge_id,
          challengeTitle: row.challenge_title,
          distId: row.dist_id,
          distName: row.dist_name,
          difficulty: row.difficulty,
          userAnswer: Number(row.user_answer),
          expectedAnswer: Number(row.expected_answer),
          isCorrect: row.is_correct,
          scorePercent: row.score_percent,
          xpEarned: row.xp_earned,
          timestamp: new Date(row.created_at).toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
          }),
        });
      });
    }

    // 4. Fetch badges
    const { data: badgesData } = await supabase
      .from('student_badges')
      .select('badge_id, unlocked_at')
      .eq('user_id', userId);

    const unlockedBadgeMap: Record<string, string> = {};
    if (badgesData) {
      badgesData.forEach((b) => {
        unlockedBadgeMap[b.badge_id] = b.unlocked_at;
      });
    }

    if (!profileData) {
      return null;
    }

    return {
      studentId: profileData.matricula,
      studentName: profileData.student_name,
      institution: profileData.institution,
      turma: profileData.turma || profileData.institution || 'Estatística I - Turma A',
      semestre: profileData.semestre || '2026.1',
      email: profileData.email || undefined,
      personalEmail: profileData.personal_email || undefined,
      avatarUrl: profileData.avatar_url || undefined,
      level: profileData.level,
      levelTitle: profileData.level_title,
      xp: profileData.xp,
      nextLevelXp: profileData.next_level_xp,
      streakDays: profileData.streak_days,
      totalCalculationsDone: profileData.total_calculations_done,
      challengesSolvedCount: profileData.challenges_solved_count,
      accuracyRate: profileData.accuracy_rate,
      distributionMastery,
      history,
    };
  } catch (err) {
    console.warn('Exceção ao buscar dados do Supabase:', err);
    return null;
  }
}

/**
 * Upsert student profile into Supabase
 */
export async function syncStudentProfile(userId: string, profile: StudentProfile) {
  try {
    await supabase.from('profiles').upsert(
      {
        id: userId,
        matricula: profile.studentId,
        student_name: profile.studentName,
        institution: profile.institution || profile.turma || 'UFJF - Estatística',
        turma: profile.turma || 'Estatística I - Turma A',
        semestre: profile.semestre || '2026.1',
        email: profile.email || null,
        personal_email: profile.personalEmail || null,
        avatar_url: profile.avatarUrl || null,
        level: profile.level,
        level_title: profile.levelTitle,
        xp: profile.xp,
        next_level_xp: profile.nextLevelXp,
        streak_days: profile.streakDays,
        total_calculations_done: profile.totalCalculationsDone,
        challenges_solved_count: profile.challengesSolvedCount,
        accuracy_rate: profile.accuracyRate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('Erro ao sincronizar perfil:', err);
  }
}

/**
 * Upload student avatar photo to Supabase Storage bucket 'avatars'
 */
export async function uploadAvatarToSupabase(
  userId: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `${userId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.warn('Upload no Supabase Storage falhou (usando cache local):', uploadError.message);
      const base64 = await fileToBase64(file);
      return { success: true, url: base64 };
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    // Atualiza imediatamente o perfil no Supabase
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);

    return { success: true, url: publicUrl };
  } catch (err) {
    console.warn('Erro ao enviar avatar:', err);
    try {
      const base64 = await fileToBase64(file);
      return { success: true, url: base64 };
    } catch {
      return { success: false, error: 'Não foi possível processar a imagem do avatar.' };
    }
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

/**
 * Upsert distribution mastery for a student
 */
export async function syncDistributionMastery(
  userId: string,
  distId: string,
  mastery: number
) {
  try {
    await supabase.from('distribution_mastery').upsert(
      {
        user_id: userId,
        dist_id: distId,
        mastery,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,dist_id' }
    );
  } catch (err) {
    console.warn('Erro ao sincronizar maestria:', err);
  }
}

/**
 * Record a challenge attempt to Supabase
 */
export async function recordChallengeToSupabase(userId: string, record: SolvedRecord) {
  try {
    await supabase.from('challenge_history').insert({
      user_id: userId,
      challenge_id: record.challengeId,
      challenge_title: record.challengeTitle,
      dist_id: record.distId,
      dist_name: record.distName,
      difficulty: record.difficulty,
      user_answer: record.userAnswer,
      expected_answer: record.expectedAnswer,
      is_correct: record.isCorrect,
      score_percent: record.scorePercent,
      xp_earned: record.xpEarned,
    });
  } catch (err) {
    console.warn('Erro ao salvar desafio no Supabase:', err);
  }
}

/**
 * Log a calculation event
 */
export async function logCalculationToSupabase(userId: string, distId: string) {
  try {
    await supabase.from('calculation_logs').insert({
      user_id: userId,
      dist_id: distId,
    });
  } catch (err) {
    console.warn('Erro ao registrar log de cálculo:', err);
  }
}

/**
 * Save an unlocked badge to Supabase
 */
export async function recordBadgeToSupabase(userId: string, badgeId: string) {
  try {
    await supabase.from('student_badges').upsert(
      {
        user_id: userId,
        badge_id: badgeId,
        unlocked_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,badge_id' }
    );
  } catch (err) {
    console.warn('Erro ao salvar conquista no Supabase:', err);
  }
}

/**
 * Logout current student
 */
export async function logoutCurrentStudent() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Erro ao fazer logout:', err);
  }
}

/**
 * Fetch all active challenges from the Supabase `challenges` table.
 * Returns empty array if table has not been created yet or no rows found,
 * allowing caller to use local fallback seamlessly.
 */
export async function fetchChallengesFromSupabase(): Promise<StudentChallenge[]> {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      // Table may not exist yet if professor hasn't executed the SQL
      console.info('Supabase challenges info:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((row) => ({
      id: String(row.id),
      distId: String(row.dist_id),
      distName: String(row.dist_name),
      title: String(row.title),
      difficulty: row.difficulty as 'Iniciante' | 'Intermediário' | 'Avançado',
      story: String(row.story),
      question: String(row.question),
      targetExpression: String(row.target_expression),
      params: (row.params as Record<string, number>) || {},
      expectedAnswer: Number(row.expected_answer),
      tolerance: Number(row.tolerance ?? 0.02),
      hint1: String(row.hint1),
      hint2: String(row.hint2),
      fullExplanation: String(row.full_explanation),
      xpReward: Number(row.xp_reward ?? 60),
    }));
  } catch (err) {
    console.warn('Exceção ao carregar desafios do Supabase:', err);
    return [];
  }
}

/**
 * Persist a new challenge (e.g. adaptive question) to Supabase
 */
export async function saveChallengeToSupabase(challenge: StudentChallenge): Promise<boolean> {
  try {
    const { error } = await supabase.from('challenges').upsert(
      {
        id: challenge.id,
        dist_id: challenge.distId,
        dist_name: challenge.distName,
        title: challenge.title,
        difficulty: challenge.difficulty,
        story: challenge.story,
        question: challenge.question,
        target_expression: challenge.targetExpression,
        params: challenge.params,
        expected_answer: challenge.expectedAnswer,
        tolerance: challenge.tolerance,
        hint1: challenge.hint1,
        hint2: challenge.hint2,
        full_explanation: challenge.fullExplanation,
        xp_reward: challenge.xpReward,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.warn('Erro ao salvar desafio no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Exceção ao salvar desafio no Supabase:', err);
    return false;
  }
}
