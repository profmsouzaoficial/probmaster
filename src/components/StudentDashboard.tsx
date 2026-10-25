/**
 * Student Evolution Dashboard (Painel de Evolução Individual) with UFJF Palette & Theme Support
 * Visualizes student mastery radar, XP tier progression, badges, study streak,
 * and launches the academic teacher report export modal.
 */

import React, { useState, useRef, useEffect } from 'react';
import { StudentProfile } from '../gamification/types';
import { TeacherReportModal } from './TeacherReportModal';
import {
  Trophy,
  Flame,
  Award,
  Target,
  FileText,
  PenSquare,
  CheckCircle2,
  TrendingUp,
  Brain,
  Calculator,
  Compass,
  Layers,
  GraduationCap,
  Database,
  RefreshCw,
  Camera,
  User,
  X,
} from 'lucide-react';

interface StudentDashboardProps {
  profile: StudentProfile;
  onUpdateProfile: (
    name: string,
    id: string,
    turma: string,
    semestre?: string,
    avatarUrl?: string
  ) => void;
  onUploadAvatar?: (file: File) => Promise<string | null>;
  theme?: 'light' | 'dark';
  isAuthenticated?: boolean;
  activeMatricula?: string | null;
  onOpenAuthModal?: () => void;
  isSyncing?: boolean;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  profile,
  onUpdateProfile,
  onUploadAvatar,
  theme = 'light',
  isAuthenticated = false,
  activeMatricula = null,
  onOpenAuthModal,
  isSyncing = false,
}) => {
  const isDark = theme === 'dark';
  const [showReportModal, setShowReportModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [editName, setEditName] = useState(profile.studentName);
  const [editId, setEditId] = useState(profile.studentId);
  const [editTurma, setEditTurma] = useState(
    profile.turma || profile.institution || 'Estatística I - Turma A'
  );
  const [editSemestre, setEditSemestre] = useState(profile.semestre || '2026.1');
  const [editAvatarUrl, setEditAvatarUrl] = useState(profile.avatarUrl || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditName(profile.studentName);
    setEditId(profile.studentId);
    setEditTurma(
      profile.turma || profile.institution || 'Estatística I - Turma A'
    );
    setEditSemestre(profile.semestre || '2026.1');
    setEditAvatarUrl(profile.avatarUrl || '');
  }, [profile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setPhotoFeedback('A foto deve ter no máximo 5MB.');
      setTimeout(() => setPhotoFeedback(null), 3000);
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoFeedback('Enviando foto ao Supabase Storage...');
    try {
      if (onUploadAvatar) {
        const url = await onUploadAvatar(file);
        if (url) {
          setEditAvatarUrl(url);
          setPhotoFeedback('Foto enviada com sucesso!');
        } else {
          setPhotoFeedback('Falha no upload da foto.');
        }
      }
    } catch {
      setPhotoFeedback('Erro ao processar imagem.');
    } finally {
      setIsUploadingPhoto(false);
      setTimeout(() => setPhotoFeedback(null), 3500);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(editName, editId, editTurma, editSemestre, editAvatarUrl);
    setIsEditingProfile(false);
  };

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Calculator':
        return <Calculator className="w-5 h-5 text-[#003882] dark:text-sky-400" />;
      case 'TrendingUp':
        return <TrendingUp className="w-5 h-5 text-sky-500" />;
      case 'CheckCircle':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'Layers':
        return <Layers className="w-5 h-5 text-[#c4161c] dark:text-rose-400" />;
      case 'Compass':
        return <Compass className="w-5 h-5 text-amber-500" />;
      case 'Flame':
        return <Flame className="w-5 h-5 text-[#c4161c]" />;
      default:
        return <Award className="w-5 h-5 text-amber-500" />;
    }
  };

  // XP progress calculation
  const xpCurrentLevel = profile.xp;
  const xpNeeded = profile.nextLevelXp;
  const xpProgressPercent = Math.min(100, Math.round((xpCurrentLevel / xpNeeded) * 100));

  return (
    <div className="space-y-4">
      {/* Student Identity & Level Banner with UFJF Brand Colors */}
      <div className={`rounded-2xl border p-4 shadow-xl transition-colors ${
        isDark
          ? 'bg-gradient-to-r from-[#0a1b33] via-[#071326] to-[#0a1b33] border-[#183664]'
          : 'bg-gradient-to-r from-blue-50 via-white to-blue-50/60 border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Student Photo with UFJF Coat of Arms Badge Fallback */}
            {profile.avatarUrl ? (
              <div className="relative group w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#003882] dark:border-sky-400 shadow-md shrink-0 bg-white">
                <img
                  src={profile.avatarUrl}
                  alt={profile.studentName}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(true);
                    fileInputRef.current?.click();
                  }}
                  className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] font-bold transition cursor-pointer"
                  title="Trocar foto"
                >
                  <Camera className="w-4 h-4 mb-0.5" />
                  <span>Trocar</span>
                </button>
              </div>
            ) : (
              <div className="relative group w-14 h-16 rounded-xl bg-white p-1 border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                <img
                  src="/public/assets/aistudio/image_76466eb6.png"
                  alt="Brasão da UFJF"
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(true);
                    fileInputRef.current?.click();
                  }}
                  className="absolute -bottom-1 -right-1 p-1 bg-[#003882] hover:bg-[#0c4ca3] text-white rounded-full shadow-md transition cursor-pointer"
                  title="Adicionar foto do aluno"
                >
                  <Camera className="w-3 h-3" />
                </button>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{profile.studentName}</h3>
                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="text-xs text-[#003882] dark:text-sky-400 hover:underline transition cursor-pointer flex items-center gap-1 font-medium"
                  title="Editar perfil acadêmico"
                >
                  <PenSquare className="w-3 h-3" />
                  editar
                </button>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {profile.turma || profile.institution}
                </span>
                <span>·</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  Semestre {profile.semestre || '2026.1'}
                </span>
                <span>·</span>
                <span className="font-mono font-bold text-[#003882] dark:text-sky-300">
                  Matrícula: {profile.studentId}
                </span>
                {isAuthenticated && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <Database className="w-2.5 h-2.5" /> Supabase Sincronizado
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Nível {profile.level}</span>
                <span className="text-slate-400">·</span>
                <span className="text-xs text-[#003882] dark:text-sky-300 font-semibold">{profile.levelTitle}</span>
              </div>
            </div>
          </div>

          {/* Quick CTA Actions */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                  isAuthenticated
                    ? isDark
                      ? 'bg-[#003882]/40 border-sky-600/50 text-sky-200 hover:bg-[#003882]/70'
                      : 'bg-blue-50 border-blue-200 text-[#003882] hover:bg-blue-100'
                    : isDark
                    ? 'bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/50'
                    : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                }`}
              >
                {isAuthenticated ? (
                  <PenSquare className="w-4 h-4 text-[#003882] dark:text-sky-400" />
                ) : (
                  <GraduationCap className="w-4 h-4 text-[#003882] dark:text-sky-400" />
                )}
                <span>{isAuthenticated ? 'Editar Informações' : 'Identificar Aluno'}</span>
                {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />}
              </button>
            )}

            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#003882] hover:bg-[#0c4ca3] active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-300" />
              Gerar Relatório para o Professor
            </button>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
            <span className="text-slate-500 dark:text-slate-400">Progresso de Maestria</span>
            <span className="text-[#003882] dark:text-sky-300 font-bold">
              {profile.xp} / {profile.nextLevelXp} XP ({xpProgressPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-[#003882] via-[#c4161c] to-[#dfa628] rounded-full transition-all duration-500"
              style={{ width: `${xpProgressPercent}%` }}
            />
          </div>
        </div>

        {/* Profile Edit Drawer with Discrete Field Labels & Photo Uploader */}
        {isEditingProfile && (
          <form
            onSubmit={handleSaveProfile}
            className={`mt-4 p-4 rounded-xl border space-y-4 ${
              isDark ? 'bg-[#071326] border-[#183664]' : 'bg-slate-100/90 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Configurar Dados Acadêmicos do Aluno:
              </div>
              {photoFeedback && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  {isUploadingPhoto ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  {photoFeedback}
                </span>
              )}
            </div>

            {/* Foto do Aluno / Supabase Storage Bucket 'avatars' */}
            <div
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDark ? 'bg-[#0a1b33] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl border overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  {editAvatarUrl ? (
                    <img
                      src={editAvatarUrl}
                      alt="Avatar do aluno"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Foto do Aluno
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bucket Supabase Storage: <code className="font-mono text-[#003882] dark:text-sky-300">avatars</code>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-[#003882] hover:bg-[#0c4ca3] text-white flex items-center gap-1.5 transition cursor-pointer"
                >
                  {isUploadingPhoto ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      <span>{editAvatarUrl ? 'Trocar Foto' : 'Enviar Foto'}</span>
                    </>
                  )}
                </button>
                {editAvatarUrl && (
                  <button
                    type="button"
                    onClick={() => setEditAvatarUrl('')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition cursor-pointer"
                    title="Remover foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 4 Campos Discretamente Identificados: Nome, Matrícula, Turma e Semestre */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Campo 1: Nome */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Nome
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome do aluno"
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition ${
                    isDark
                      ? 'bg-[#0a1b33] border-slate-700 text-white focus:border-sky-400'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                  }`}
                />
              </div>

              {/* Campo 2: Matrícula */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Matrícula
                </label>
                <input
                  type="text"
                  value={editId}
                  onChange={(e) => setEditId(e.target.value)}
                  placeholder="Ex: 123456"
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none transition ${
                    isDark
                      ? 'bg-[#0a1b33] border-slate-700 text-white focus:border-sky-400'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                  }`}
                />
              </div>

              {/* Campo 3: Turma */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Turma
                </label>
                <input
                  type="text"
                  value={editTurma}
                  onChange={(e) => setEditTurma(e.target.value)}
                  placeholder="Ex: Estatística I - Turma A"
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition ${
                    isDark
                      ? 'bg-[#0a1b33] border-slate-700 text-white focus:border-sky-400'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                  }`}
                />
              </div>

              {/* Campo 4: Semestre */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Semestre
                </label>
                <input
                  type="text"
                  value={editSemestre}
                  onChange={(e) => setEditSemestre(e.target.value)}
                  placeholder="Ex: 2026.1"
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium outline-none transition ${
                    isDark
                      ? 'bg-[#0a1b33] border-slate-700 text-white focus:border-sky-400'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-[#003882]'
                  }`}
                />
              </div>
            </div>

            {/* Ações do Formulário */}
            <div className="flex justify-end items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#003882] hover:bg-[#0c4ca3] text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Salvar Dados
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`p-3.5 rounded-2xl border shadow-sm ${
          isDark ? 'bg-[#0a1b33] border-[#183664]' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Sequência (Streak)</span>
            <Flame className="w-4 h-4 text-[#c4161c]" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{profile.streakDays} dias</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Estudo contínuo ativo</div>
        </div>

        <div className={`p-3.5 rounded-2xl border shadow-sm ${
          isDark ? 'bg-[#0a1b33] border-[#183664]' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Acurácia</span>
            <Target className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {profile.accuracyRate.toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Precisão em desafios</div>
        </div>

        <div className={`p-3.5 rounded-2xl border shadow-sm ${
          isDark ? 'bg-[#0a1b33] border-[#183664]' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Desafios Feitos</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{profile.challengesSolvedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Missões validadas</div>
        </div>

        <div className={`p-3.5 rounded-2xl border shadow-sm ${
          isDark ? 'bg-[#0a1b33] border-[#183664]' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Simulações</span>
            <Brain className="w-4 h-4 text-[#003882] dark:text-sky-400" />
          </div>
          <div className="text-2xl font-black text-[#003882] dark:text-sky-400 font-mono">{profile.totalCalculationsDone}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Gráficos & cálculos</div>
        </div>
      </div>

      {/* Distribution Mastery Radar / Progress Bars */}
      <div className={`rounded-2xl border p-4 shadow-sm space-y-3 ${
        isDark ? 'bg-[#0a1b33] border-[#183664]' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#003882] dark:text-sky-400" />
            Matriz de Domínio por Distribuição
          </h4>
          <span className="text-xs text-slate-500">Progresso adaptativo</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {Object.entries(profile.distributionMastery).map(([distId, mastery]) => (
            <div key={distId} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="capitalize font-semibold text-slate-800 dark:text-slate-200">{distId.replace('_', ' ')}</span>
                <span className="font-mono font-bold text-[#003882] dark:text-sky-300">{mastery.toFixed(2)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    mastery >= 75
                      ? 'bg-emerald-500'
                      : mastery >= 50
                      ? 'bg-[#003882] dark:bg-sky-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${mastery}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trophy Case / Badges */}
      <div className={`rounded-2xl border p-4 shadow-sm space-y-3 ${
        isDark ? 'bg-[#0a1b33] border-[#183664]' : 'bg-white border-slate-200'
      }`}>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          Galeria de Conquistas & Insígnias
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {profile.badges.map((b) => {
            const isUnlocked = !!b.unlockedAt;
            return (
              <div
                key={b.id}
                className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                  isUnlocked
                    ? isDark
                      ? 'bg-blue-950/30 border-blue-700/40 shadow-sm'
                      : 'bg-blue-50/60 border-blue-200 shadow-sm'
                    : 'bg-slate-100/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-40'
                }`}
              >
                <div className={`p-2 rounded-xl mb-2 border ${
                  isDark ? 'bg-[#0c1f3d] border-[#183664]' : 'bg-white border-slate-200'
                }`}>
                  {getBadgeIcon(b.iconName)}
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight mb-1">{b.name}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">{b.description}</div>
                {isUnlocked && (
                  <div className="mt-2 text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                    ✓ {b.unlockedAt}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* History Table */}
      <div className={`rounded-2xl border p-4 shadow-sm space-y-3 ${
        isDark ? 'bg-[#0a1b33] border-[#183664]' : 'bg-white border-slate-200'
      }`}>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          Histórico de Desafios Recentes
        </h4>

        {profile.history.length === 0 ? (
          <div className="text-xs text-slate-500 py-4 text-center">
            Nenhum desafio realizado ainda. Vá para a aba Desafios para começar!
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {profile.history.map((h) => (
              <div key={h.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{h.challengeTitle}</div>
                  <div className="text-[11px] text-slate-500">
                    {h.distName} · <span className="font-mono">{h.timestamp}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-mono font-bold ${
                      h.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {h.isCorrect ? '100% Acerto' : 'Revisão'}
                  </div>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">+{h.xpEarned} XP</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Academic Report Modal */}
      <TeacherReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        profile={profile}
        theme={theme}
      />
    </div>
  );
};
