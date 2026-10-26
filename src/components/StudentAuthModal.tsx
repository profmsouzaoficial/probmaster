/**
 * Student Authentication, Registration & Profile Edit Modal for Supabase & UFJF
 * Supports:
 * 1. Login (Matrícula ou E-mail)
 * 2. Registration (Novo Aluno: Nome*, E-mail UFJF*, Turma*, Semestre*, Matrícula*, E-mail particular opcional)
 * 3. Profile Management (Editar Perfil: Foto/Avatar, Nome, Turma, Semestre, E-mails com sincronização no Supabase)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  UserCheck,
  UserPlus,
  GraduationCap,
  Database,
  RefreshCw,
  LogOut,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  PenSquare,
  Camera,
  Save,
  BookOpen,
  Calendar,
  Building2,
  Trash2,
  Github,
} from 'lucide-react';
import { StudentProfile } from '../gamification/types';
import { RegisterStudentParams, isInstitutionalUfjfEmail } from '../lib/supabase';

interface StudentAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  activeMatricula: string | null;
  studentName: string;
  profile?: StudentProfile;
  initialTab?: 'login' | 'register' | 'profile' | 'edit-profile';
  isSyncing: boolean;
  onLogin: (
    matriculaOrEmail: string,
    customPassword?: string
  ) => Promise<{
    success: boolean;
    notFound?: boolean;
    invalidPassword?: boolean;
    studentName?: string;
    email?: string;
    error?: string;
  }>;
  onRegister: (
    params: RegisterStudentParams | string,
    studentName?: string,
    customEmail?: string,
    customPassword?: string
  ) => Promise<{
    success: boolean;
    alreadyRegistered?: boolean;
    studentName?: string;
    email?: string;
    error?: string;
  }>;
  onUpdateProfile?: (
    name: string,
    id: string,
    turma: string,
    semestre?: string,
    avatarUrl?: string,
    email?: string,
    personalEmail?: string
  ) => Promise<void> | void;
  onUploadAvatar?: (file: File) => Promise<string | null>;
  onLogout: () => Promise<void>;
  onRefresh: () => Promise<void>;
  theme?: 'light' | 'dark';
}

export const StudentAuthModal: React.FC<StudentAuthModalProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  activeMatricula,
  studentName,
  profile,
  initialTab,
  isSyncing,
  onLogin,
  onRegister,
  onUpdateProfile,
  onUploadAvatar,
  onLogout,
  onRefresh,
  theme = 'light',
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'profile' | 'edit-profile'>('login');

  // Login state
  const [loginMatricula, setLoginMatricula] = useState(activeMatricula || '');
  const [loginCustomPassword, setLoginCustomPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [accountIdentified, setAccountIdentified] = useState<{
    name?: string;
    email?: string;
  } | null>(null);

  // Register inputs (with mandatory fields: Nome*, Email UFJF*, Turma*, Semestre*, Matrícula*)
  const [regMatricula, setRegMatricula] = useState(activeMatricula || '');
  const [regName, setRegName] = useState('');
  const [regEmailUfjf, setRegEmailUfjf] = useState('');
  const [regPersonalEmail, setRegPersonalEmail] = useState('');
  const [regTurma, setRegTurma] = useState('Estatística I - Turma A');
  const [regSemestre, setRegSemestre] = useState('2026.1');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [alreadyRegisteredMatricula, setAlreadyRegisteredMatricula] = useState<string | null>(null);

  // Profile Edit state (when authenticated)
  const [editName, setEditName] = useState(profile?.studentName || studentName || '');
  const [editTurma, setEditTurma] = useState(profile?.turma || 'Estatística I - Turma A');
  const [editSemestre, setEditSemestre] = useState(profile?.semestre || '2026.1');
  const [editEmailUfjf, setEditEmailUfjf] = useState(profile?.email || (activeMatricula ? `${activeMatricula}@ufjf.br` : ''));
  const [editPersonalEmail, setEditPersonalEmail] = useState(profile?.personalEmail || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | undefined>(profile?.avatarUrl);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status & notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notRegisteredMatricula, setNotRegisteredMatricula] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever modal opens or profile changes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      if (initialTab) {
        setTab(initialTab);
      } else if (isAuthenticated) {
        setTab('profile');
      } else {
        setTab('login');
      }

      if (profile) {
        setEditName(profile.studentName);
        setEditTurma(profile.turma || profile.institution || 'Estatística I - Turma A');
        setEditSemestre(profile.semestre || '2026.1');
        setEditEmailUfjf(profile.email || (activeMatricula ? `${activeMatricula}@ufjf.br` : ''));
        setEditPersonalEmail(profile.personalEmail || '');
        setEditAvatarUrl(profile.avatarUrl);
      }
    }
  }, [isOpen, initialTab, isAuthenticated, profile, activeMatricula]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  // Handle student login submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setNotRegisteredMatricula(null);

    const clean = loginMatricula.trim();
    if (!clean) {
      setErrorMessage('Por favor, informe a matrícula ou e-mail do aluno.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onLogin(
        clean,
        showLoginPassword && loginCustomPassword ? loginCustomPassword : undefined
      );

      if (res.success) {
        setSuccessMessage(`Bem-vindo! ${res.studentName || clean} autenticado.`);
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        if (res.notFound) {
          setNotRegisteredMatricula(clean);
          setAccountIdentified(null);
        } else {
          setNotRegisteredMatricula(null);
        }

        if (res.invalidPassword) {
          setShowLoginPassword(true);
          setAccountIdentified({
            name: res.studentName,
            email: res.email,
          });
        }

        setErrorMessage(res.error || 'Não foi possível entrar com esta identificação.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar login';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle new student registration submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setNotRegisteredMatricula(null);
    setAlreadyRegisteredMatricula(null);

    const cleanMatricula = regMatricula.trim();
    if (!cleanMatricula) {
      setErrorMessage('A matrícula do aluno é obrigatória.');
      return;
    }

    const cleanName = regName.trim();
    if (!cleanName) {
      setErrorMessage('O Nome Completo do aluno é obrigatório no cadastro.');
      return;
    }

    const cleanEmail = regEmailUfjf.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('O E-mail institucional da UFJF é obrigatório.');
      return;
    }

    if (!isInstitutionalUfjfEmail(cleanEmail)) {
      setErrorMessage(
        'E-mail institucional inválido. É obrigatório que o e-mail termine com "ufjf.br" (ex: seu.nome@ufjf.br ou aluno@estudante.ufjf.br).'
      );
      return;
    }

    const cleanTurma = regTurma.trim();
    if (!cleanTurma) {
      setErrorMessage('A Turma do aluno é obrigatória (ex: Estatística I - Turma A).');
      return;
    }

    const cleanSemestre = regSemestre.trim();
    if (!cleanSemestre) {
      setErrorMessage('O Semestre do aluno é obrigatório (ex: 2026.1).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onRegister({
        matricula: cleanMatricula,
        studentName: cleanName,
        ufjfEmail: cleanEmail,
        turma: cleanTurma,
        semestre: cleanSemestre,
        personalEmail: regPersonalEmail.trim() || undefined,
        password: showRegPassword && regPassword ? regPassword : undefined,
      });

      if (res.success) {
        setSuccessMessage(`Cadastro realizado com sucesso! Bem-vindo(a), ${cleanName}!`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        if (res.alreadyRegistered) {
          setAlreadyRegisteredMatricula(cleanMatricula);
        }
        setErrorMessage(res.error || 'Não foi possível cadastrar a matrícula.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar aluno';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Profile Save
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = editName.trim();
    if (!cleanName) {
      setErrorMessage('O nome do aluno não pode ficar vazio.');
      return;
    }

    const cleanEmail = editEmailUfjf.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('O e-mail institucional da UFJF é obrigatório.');
      return;
    }

    if (!isInstitutionalUfjfEmail(cleanEmail)) {
      setErrorMessage('O e-mail institucional deve terminar com "ufjf.br" (ex: seu.nome@ufjf.br).');
      return;
    }

    const cleanTurma = editTurma.trim();
    if (!cleanTurma) {
      setErrorMessage('A turma é obrigatória.');
      return;
    }

    const cleanSemestre = editSemestre.trim();
    if (!cleanSemestre) {
      setErrorMessage('O semestre é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onUpdateProfile && activeMatricula) {
        await onUpdateProfile(
          cleanName,
          activeMatricula,
          cleanTurma,
          cleanSemestre,
          editAvatarUrl,
          cleanEmail,
          editPersonalEmail.trim() || undefined
        );
      }
      setSuccessMessage('Dados acadêmicos atualizados com sucesso no Supabase!');
      setTimeout(() => {
        setTab('profile');
      }, 900);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao atualizar dados');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Avatar photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }

    setIsUploadingPhoto(true);
    setErrorMessage(null);
    try {
      if (onUploadAvatar) {
        const url = await onUploadAvatar(file);
        if (url) {
          setEditAvatarUrl(url);
          setSuccessMessage('Foto de perfil atualizada com sucesso!');
        }
      }
    } catch (err) {
      setErrorMessage('Não foi possível enviar a foto. Tente novamente.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Handle Logout
  const handleLogoutClick = async () => {
    setIsSubmitting(true);
    try {
      await onLogout();
      setLoginMatricula('');
      setRegMatricula('');
      setTab('login');
      setSuccessMessage('Sessão encerrada com sucesso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchToRegisterWithMatricula = (matricula: string) => {
    setRegMatricula(matricula);
    if (!regEmailUfjf) {
      setRegEmailUfjf(`${matricula}@ufjf.br`);
    }
    setErrorMessage(null);
    setNotRegisteredMatricula(null);
    setTab('register');
  };

  const emailUfjfValid = isInstitutionalUfjfEmail(regEmailUfjf);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className={`w-full max-w-lg my-auto rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#0a1b33] border-[#183664] text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header with UFJF Coat of Arms */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-[#003882] via-[#082a5c] to-[#003882] text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl p-1 flex items-center justify-center shadow-md shrink-0">
              <img
                src="/probmaster-pi_logo.png"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://kbmrgwqdroxtbtnvtdrs.supabase.co/storage/v1/object/public/figs/probmaster-pi_logo.png';
                }}
                alt="ProbMaster PI"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-snug">
                {isAuthenticated
                  ? tab === 'edit-profile'
                    ? 'Editar Informações do Aluno'
                    : 'Identificação & Informações do Aluno'
                  : 'ProbMaster PI · Acesso Acadêmico'}
              </h2>
              <div className="text-xs text-blue-200 flex items-center gap-1.5 flex-wrap">
                <span>Autoria: Prof. Márcio Souza (DCBV/ICV - UFJF/GV)</span>
                <span>·</span>
                <a
                  href="https://github.com/profmsouzaoficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-white hover:text-amber-300 underline underline-offset-2 transition-colors"
                >
                  <Github className="w-3 h-3" />
                  @profmsouzaoficial
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Status alerts */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>

              {/* Direct button to Register if not found */}
              {notRegisteredMatricula && tab === 'login' && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => switchToRegisterWithMatricula(notRegisteredMatricula)}
                    className="w-full py-2 px-3 rounded-lg bg-[#c4161c] hover:bg-[#a51217] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Cadastrar Matrícula {notRegisteredMatricula} Agora
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Direct button to Login if already registered */}
              {alreadyRegisteredMatricula && tab === 'register' && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMatricula(alreadyRegisteredMatricula);
                      setTab('login');
                      setErrorMessage(null);
                      setAlreadyRegisteredMatricula(null);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-[#003882] hover:bg-[#002860] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Acessar Login com Matrícula {alreadyRegisteredMatricula}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Account Identified Feedback */}
          {accountIdentified && tab === 'login' && (
            <div className="p-3 rounded-xl bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-[#003882] dark:text-sky-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                Conta Localizada: {accountIdentified.name || 'Aluno Cadastrado'}
              </div>
              <div className="text-[11px] opacity-90 pl-5">
                E-mail no Supabase: <span className="font-mono font-semibold">{accountIdentified.email}</span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 pl-5">
                Insira sua senha de acesso cadastrada no campo abaixo para autenticar.
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {isAuthenticated ? (
            /* ========================================================================= */
            /* LOGGED IN VIEW & EDIT PROFILE                                             */
            /* ========================================================================= */
            tab === 'edit-profile' ? (
              /* Sub-view: Editar Perfil */
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div
                  className={`p-3 rounded-xl border text-xs leading-relaxed ${
                    isDark
                      ? 'bg-blue-950/30 border-blue-900/50 text-blue-200'
                      : 'bg-blue-50/80 border-blue-200 text-blue-900'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-[#003882] dark:text-sky-300">
                    <PenSquare className="w-3.5 h-3.5" /> Edição de Dados Acadêmicos
                  </div>
                  Atualize sua turma, semestre, e-mails de contato e foto de perfil. Os dados são sincronizados no Supabase.
                </div>

                {/* Avatar Photo Upload & Preview */}
                <div className="flex items-center gap-4 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  <div className="relative group w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#003882] dark:border-sky-400 shadow-md shrink-0 bg-white">
                    {editAvatarUrl ? (
                      <img
                        src={editAvatarUrl}
                        alt="Foto do Aluno"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400">
                        <GraduationCap className="w-8 h-8 text-[#003882] dark:text-sky-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Foto do Aluno
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="py-1.5 px-3 text-xs font-semibold rounded-lg bg-[#003882] hover:bg-[#0a4bb3] text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        {isUploadingPhoto ? 'Enviando...' : editAvatarUrl ? 'Trocar Foto' : 'Adicionar Foto'}
                      </button>

                      {editAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setEditAvatarUrl(undefined)}
                          className="py-1.5 px-2.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer flex items-center gap-1"
                          title="Remover foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nome Completo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-400" />
                    Nome Completo do Aluno <span className="text-[#c4161c]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`w-full py-2 px-3 rounded-xl border text-sm transition outline-none ${
                      isDark
                        ? 'bg-[#071326] border-[#183664] text-white focus:border-sky-500'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                    }`}
                  />
                </div>

                {/* Matrícula (Read-only) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-[#003882] dark:text-sky-400" />
                    Matrícula UFJF (Identificador Oficial)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={activeMatricula || ''}
                    className="w-full py-2 px-3 rounded-xl border text-sm font-mono bg-slate-100 dark:bg-[#071326]/60 border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>

                {/* Turma & Semestre */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      Turma <span className="text-[#c4161c]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Estatística I - Turma A"
                      value={editTurma}
                      onChange={(e) => setEditTurma(e.target.value)}
                      className={`w-full py-2 px-3 rounded-xl border text-sm transition outline-none ${
                        isDark
                          ? 'bg-[#071326] border-[#183664] text-white focus:border-sky-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Semestre <span className="text-[#c4161c]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 2026.1"
                      value={editSemestre}
                      onChange={(e) => setEditSemestre(e.target.value)}
                      className={`w-full py-2 px-3 rounded-xl border text-sm transition outline-none ${
                        isDark
                          ? 'bg-[#071326] border-[#183664] text-white focus:border-sky-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                      }`}
                    />
                  </div>
                </div>

                {/* E-mail Institucional UFJF */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-[#003882] dark:text-sky-400" />
                      E-mail Institucional UFJF <span className="text-[#c4161c]">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">deve conter ufjf.br</span>
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="Ex: seu.nome@ufjf.br"
                    value={editEmailUfjf}
                    onChange={(e) => setEditEmailUfjf(e.target.value)}
                    className={`w-full py-2 px-3 rounded-xl border text-sm transition outline-none ${
                      isDark
                        ? 'bg-[#071326] border-[#183664] text-white focus:border-sky-500'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                    }`}
                  />
                </div>

                {/* E-mail Particular (opcional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-slate-400" />
                    E-mail Particular (opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="Ex: souza.mlm@gmail.com"
                    value={editPersonalEmail}
                    onChange={(e) => setEditPersonalEmail(e.target.value)}
                    className={`w-full py-2 px-3 rounded-xl border text-sm transition outline-none ${
                      isDark
                        ? 'bg-[#071326] border-[#183664] text-white focus:border-sky-500'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                    }`}
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTab('profile')}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold transition hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-center"
                  >
                    Voltar ao Perfil
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#003882] hover:bg-[#0a4bb3] text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Salvar Alterações
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Sub-view: Visualizar Perfil */
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                    isDark ? 'bg-[#071326] border-[#183664]' : 'bg-blue-50/70 border-blue-200'
                  }`}
                >
                  {/* Photo or Coat of Arms */}
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#003882] dark:border-sky-400 shadow-md shrink-0 bg-white">
                    {profile?.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={studentName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                        <GraduationCap className="w-8 h-8 text-[#003882] dark:text-sky-400" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-sm flex-1">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>{studentName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        Conectado
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <span>Matrícula:</span>
                      <span className="font-mono font-bold text-[#003882] dark:text-sky-300">
                        {activeMatricula}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span>Turma:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {profile?.turma || profile?.institution || 'Estatística I - Turma A'}
                      </span>
                      <span>·</span>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        Semestre {profile?.semestre || '2026.1'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5 space-y-0.5">
                      <div>
                        UFJF: <span className="font-mono">{profile?.email || `${activeMatricula}@ufjf.br`}</span>
                      </div>
                      {profile?.personalEmail && (
                        <div>
                          Particular: <span className="font-mono">{profile.personalEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Gamification snapshot */}
                {profile && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className={`p-2.5 rounded-xl border text-xs ${isDark ? 'bg-[#071326] border-[#183664]' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Nível</div>
                      <div className="font-black text-amber-500 text-sm">{profile.level}</div>
                      <div className="text-[10px] text-slate-400 truncate">{profile.levelTitle}</div>
                    </div>
                    <div className={`p-2.5 rounded-xl border text-xs ${isDark ? 'bg-[#071326] border-[#183664]' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">XP Total</div>
                      <div className="font-black text-[#003882] dark:text-sky-400 text-sm">{profile.xp} XP</div>
                      <div className="text-[10px] text-slate-400">Próx: {profile.nextLevelXp}</div>
                    </div>
                    <div className={`p-2.5 rounded-xl border text-xs ${isDark ? 'bg-[#071326] border-[#183664]' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Desafios</div>
                      <div className="font-black text-emerald-500 text-sm">{profile.challengesSolvedCount}</div>
                      <div className="text-[10px] text-slate-400">{profile.accuracyRate}% precisão</div>
                    </div>
                  </div>
                )}

                {/* Cloud Sync Row */}
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    isDark ? 'bg-[#071326] border-[#183664]' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#003882] dark:text-sky-400" />
                    <span>Sincronização em Nuvem Ativa</span>
                  </div>
                  <button
                    onClick={() => onRefresh()}
                    disabled={isSyncing}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#003882] text-white hover:bg-[#0a4bb3] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Recarregar'}
                  </button>
                </div>

                {/* Profile Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setTab('edit-profile')}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#003882] hover:bg-[#0a4bb3] text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <PenSquare className="w-4 h-4 text-amber-400" />
                    Editar Informações (Foto, Turma, Semestre, E-mails)
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTab('login')}
                      className="flex-1 py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Trocar Aluno
                    </button>

                    <button
                      type="button"
                      onClick={handleLogoutClick}
                      disabled={isSubmitting}
                      className="py-2 px-3 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Sair da conta"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sair
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            /* ========================================================================= */
            /* NOT LOGGED IN: TABS (ENTRAR / REGISTRAR)                                   */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-[#071326] border border-slate-200 dark:border-[#183664]">
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setErrorMessage(null);
                    setNotRegisteredMatricula(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    tab === 'login'
                      ? 'bg-[#003882] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Entrar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setErrorMessage(null);
                    setNotRegisteredMatricula(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    tab === 'register'
                      ? 'bg-[#003882] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                  Registrar
                </button>
              </div>

              {/* TAB 1: ENTRAR (LOGIN) */}
              {tab === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      isDark
                        ? 'bg-blue-950/30 border-blue-900/50 text-blue-200'
                        : 'bg-blue-50/80 border-blue-200 text-blue-900'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 mb-1 text-[#003882] dark:text-sky-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Acesso do Aluno
                    </div>
                    Digite sua <strong>Matrícula</strong> ou <strong>E-mail</strong> para carregar seus dados e pontuações do Supabase.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-[#003882] dark:text-sky-400" />
                      Matrícula ou E-mail do Aluno <span className="text-[#c4161c]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Ex: 123456 ou marcio.souza@ufjf.br"
                      value={loginMatricula}
                      onChange={(e) => setLoginMatricula(e.target.value)}
                      className={`w-full py-2.5 px-3 rounded-xl border text-sm font-mono transition outline-none ${
                        isDark
                          ? 'bg-[#071326] border-[#183664] text-white focus:border-sky-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                      }`}
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>Aceita matrícula numérica ou e-mail institucional</span>
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="text-[#003882] dark:text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Lock className="w-3 h-3" />
                        {showLoginPassword ? 'Ocultar senha' : 'Senha personalizada'}
                      </button>
                    </div>
                  </div>

                  {showLoginPassword && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Senha personalizada
                      </label>
                      <input
                        type="password"
                        placeholder="Digite sua senha cadastrada"
                        value={loginCustomPassword}
                        onChange={(e) => setLoginCustomPassword(e.target.value)}
                        className={`w-full py-2.5 px-3 rounded-xl border text-sm transition outline-none ${
                          isDark
                            ? 'bg-[#071326] border-[#183664] text-white focus:border-sky-500'
                            : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                        }`}
                      />
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#003882] via-[#0b4ca1] to-[#003882] hover:brightness-110 active:scale-[0.99] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-900/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Conectando ao Supabase...
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          Entrar e Carregar Meus Dados
                        </>
                      )}
                    </button>
                  </div>

                  {/* Switch to Register link */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTab('register');
                        setRegMatricula(loginMatricula);
                        setErrorMessage(null);
                      }}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#003882] dark:hover:text-sky-300 transition cursor-pointer"
                    >
                      Ainda não tem cadastro no ProbMaster?{' '}
                      <span className="font-bold underline text-[#003882] dark:text-sky-400">
                        Registrar Aluno
                      </span>
                    </button>
                  </div>
                </form>
              ) : (
                /* TAB 2: REGISTRAR (NOVO ALUNO) COM CAMPOS OBRIGATÓRIOS */
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      isDark
                        ? 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                        : 'bg-amber-50/80 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-600 dark:text-amber-400">
                      <UserPlus className="w-3.5 h-3.5" /> Cadastro Acadêmico Oficial
                    </div>
                    Preencha os campos obrigatórios abaixo para criar sua conta institucional na nuvem do Supabase.
                  </div>

                  {/* Nome Completo (Obrigatório) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-400" />
                      Nome Completo do Aluno <span className="text-[#c4161c] font-black">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Prof. Márcio Souza ou Maria Eduarda Silveira"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className={`w-full py-2.5 px-3 rounded-xl border text-sm transition outline-none ${
                        isDark
                          ? 'bg-[#071326] border-[#183664] text-white focus:border-sky-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                      }`}
                    />
                  </div>

                  {/* Matrícula (Obrigatório) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-[#003882] dark:text-sky-400" />
                      Matrícula do Aluno <span className="text-[#c4161c] font-black">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 123456 ou 2024100123"
                      value={regMatricula}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRegMatricula(val);
                        if (!regEmailUfjf || regEmailUfjf.endsWith('@ufjf.br')) {
                          setRegEmailUfjf(`${val.trim().toLowerCase()}@ufjf.br`);
                        }
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl border text-sm font-mono transition outline-none ${
                        isDark
                          ? 'bg-[#071326] border-[#183664] text-white focus:border-sky-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                      }`}
                    />
                  </div>

                  {/* E-mail Institucional UFJF (Obrigatório, terminando em ufjf.br) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-[#003882] dark:text-sky-400" />
                        E-mail Institucional UFJF <span className="text-[#c4161c] font-black">*</span>
                      </label>
                      {regEmailUfjf && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            emailUfjfValid
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {emailUfjfValid ? '✓ Domínio UFJF Válido' : '⚠️ Deve conter ufjf.br'}
                        </span>
                      )}
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="Ex: seu.nome@ufjf.br ou aluno@estudante.ufjf.br"
                      value={regEmailUfjf}
                      onChange={(e) => setRegEmailUfjf(e.target.value)}
                      className={`w-full py-2.5 px-3 rounded-xl border text-sm transition outline-none ${
                        regEmailUfjf && !emailUfjfValid
                          ? 'border-rose-400 focus:border-rose-500'
                          : isDark
                          ? 'bg-[#071326] border-[#183664] text-white focus:border-sky-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                      }`}
                    />
                    <div className="text-[11px] text-slate-400">
                      Apenas e-mails institucionais da UFJF (ex: @ufjf.br ou @estudante.ufjf.br).
                    </div>
                  </div>

                  {/* Turma & Semestre (Obrigatórios) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        Turma <span className="text-[#c4161c] font-black">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Estatística I - Turma A"
                        value={regTurma}
                        onChange={(e) => setRegTurma(e.target.value)}
                        className={`w-full py-2.5 px-3 rounded-xl border text-sm transition outline-none ${
                          isDark
                            ? 'bg-[#071326] border-[#183664] text-white focus:border-sky-500'
                            : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        Semestre <span className="text-[#c4161c] font-black">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 2026.1"
                        value={regSemestre}
                        onChange={(e) => setRegSemestre(e.target.value)}
                        className={`w-full py-2.5 px-3 rounded-xl border text-sm transition outline-none ${
                          isDark
                            ? 'bg-[#071326] border-[#183664] text-white focus:border-sky-500'
                            : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* E-mail Particular (Adicional e Opcional) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-slate-400" />
                      E-mail Particular (opcional)
                    </label>
                    <input
                      type="email"
                      placeholder="Ex: pessoal@gmail.com (opcional para notificações)"
                      value={regPersonalEmail}
                      onChange={(e) => setRegPersonalEmail(e.target.value)}
                      className={`w-full py-2.5 px-3 rounded-xl border text-sm transition outline-none ${
                        isDark
                          ? 'bg-[#071326] border-[#183664] text-white focus:border-sky-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                      }`}
                    />
                  </div>

                  {/* Senha */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="text-[11px] text-[#003882] dark:text-sky-400 hover:underline cursor-pointer flex items-center gap-1 font-medium"
                      >
                        <Lock className="w-3 h-3" />
                        {showRegPassword ? 'Usar a própria matrícula como senha' : 'Definir uma senha personalizada'}
                      </button>
                    </div>

                    {showRegPassword && (
                      <input
                        type="password"
                        placeholder="Mínimo de 6 caracteres"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className={`w-full py-2 px-3 rounded-xl border text-sm mt-1 transition outline-none ${
                          isDark
                            ? 'bg-[#071326] border-[#183664] text-white focus:border-sky-500'
                            : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                        }`}
                      />
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#003882] via-[#0b4ca1] to-[#003882] hover:brightness-110 active:scale-[0.99] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-900/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Criando Conta no Supabase...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 text-amber-300" />
                          Criar Conta & Iniciar Estudos
                        </>
                      )}
                    </button>
                  </div>

                  {/* Switch to Login link */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTab('login');
                        setLoginMatricula(regMatricula);
                        setErrorMessage(null);
                      }}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#003882] dark:hover:text-sky-300 transition cursor-pointer"
                    >
                      Já possui cadastro?{' '}
                      <span className="font-bold underline text-[#003882] dark:text-sky-400">
                        Fazer Login
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
