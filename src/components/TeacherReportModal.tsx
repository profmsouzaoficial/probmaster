/**
 * Teacher Academic Report Modal & Printable Dossier with Official UFJF Coat of Arms
 * Formatted for direct browser printing (PDF) and CSV export for grading systems.
 */

import React, { useRef, useState } from 'react';
import { StudentProfile } from '../gamification/types';
import { Printer, Download, Copy, X, CheckCircle, GraduationCap, Award, FileSpreadsheet } from 'lucide-react';

interface TeacherReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  theme?: 'light' | 'dark';
}

export const TeacherReportModal: React.FC<TeacherReportModalProps> = ({
  isOpen,
  onClose,
  profile,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const printRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Data/Hora', 'Desafio', 'Distribuicao', 'Dificuldade', 'Resposta Aluno', 'Gabarito', 'Nota %', 'XP'];
    const rows = profile.history.map((h) => [
      h.id,
      h.timestamp,
      `"${h.challengeTitle.replace(/"/g, '""')}"`,
      h.distName,
      h.difficulty,
      typeof h.userAnswer === 'number' ? h.userAnswer.toFixed(4) : h.userAnswer,
      typeof h.expectedAnswer === 'number' ? h.expectedAnswer.toFixed(4) : h.expectedAnswer,
      h.scorePercent.toFixed(2),
      h.xpEarned,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_ufjf_${profile.studentId || 'aluno'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySummary = () => {
    const summary = `UNIVERSIDADE FEDERAL DE JUIZ DE FORA - UFJF
RELATÓRIO DE DESEMPENHO EM DISTRIBUIÇÕES DE PROBABILIDADE
Estudante: ${profile.studentName} (Matrícula: ${profile.studentId})
Turma: ${profile.institution}
Nível Atingido: Nível ${profile.level} - ${profile.levelTitle} (${profile.xp} XP)
Taxa de Precisão nos Desafios: ${profile.accuracyRate.toFixed(2)}%
Total de Cálculos Práticos Realizados: ${profile.totalCalculationsDone}
Desafios Resolvidos: ${profile.challengesSolvedCount}
Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}
Gerado via ProbMaster UFJF.`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 overflow-y-auto">
      {/* Container */}
      <div className={`relative w-full max-w-3xl my-6 border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isDark ? 'bg-[#0a1b33] border-[#183664]' : 'bg-white border-slate-300'
      }`}>
        {/* Top Control Bar (Hidden when printing) */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 print:hidden ${
          isDark ? 'bg-[#0c1f3d] border-[#183664]' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#003882] dark:text-sky-400" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              Relatório Pedagógico Docente · UFJF
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003882] hover:bg-[#0c4ca3] text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / PDF
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-semibold rounded-lg transition cursor-pointer"
              title="Baixar planilha CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-400 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium rounded-lg transition cursor-pointer"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div
          ref={printRef}
          className="p-6 md:p-8 overflow-y-auto space-y-6 font-sans bg-white text-black print:bg-white print:text-black print:p-4 print:text-[11px] dark:bg-[#071326] dark:text-slate-100"
        >
          {/* Official Academic Header with UFJF Coat of Arms */}
          <div className="border-b-2 border-[#003882] pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/public/assets/aistudio/image_76466eb6.png"
                alt="Brasão da UFJF"
                className="w-16 h-20 object-contain shrink-0"
              />
              <div>
                <div className="text-[11px] font-mono tracking-wider uppercase font-bold text-[#003882] dark:text-sky-400">
                  Universidade Federal de Juiz de Fora · UFJF
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white print:text-black">
                  Dossiê Individual de Aprendizagem
                </h2>
                <div className="text-xs text-slate-500 print:text-slate-600 mt-0.5 italic">
                  &quot;Lvmina Spargere&quot; · Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#0c1f3d] print:bg-slate-100 p-3 rounded-xl border border-slate-200 dark:border-slate-700 print:border-slate-300">
              {profile.avatarUrl && (
                <img
                  src={profile.avatarUrl}
                  alt={profile.studentName}
                  className="w-12 h-12 rounded-xl object-cover border border-[#003882] shadow-xs"
                />
              )}
              <div className="text-left md:text-right">
                <div className="text-xs font-bold text-slate-900 dark:text-white print:text-black">
                  {profile.studentName}
                </div>
                <div className="text-[11px] font-mono text-[#003882] dark:text-sky-400 font-bold">
                  Matrícula: {profile.studentId}
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-300 print:text-slate-600">
                  Turma: {profile.turma || profile.institution} · Semestre: {profile.semestre || '2026.1'}
                </div>
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c1f3d] print:bg-slate-100 border border-slate-200 dark:border-slate-700 print:border-slate-300">
              <div className="text-[10px] uppercase font-bold text-slate-500">Nível Acadêmico</div>
              <div className="text-sm md:text-base font-extrabold text-slate-900 dark:text-white print:text-black mt-0.5">
                Nível {profile.level}
              </div>
              <div className="text-[10px] text-[#003882] dark:text-sky-400 font-semibold truncate">
                {profile.levelTitle}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c1f3d] print:bg-slate-100 border border-slate-200 dark:border-slate-700 print:border-slate-300">
              <div className="text-[10px] uppercase font-bold text-slate-500">Pontuação Total</div>
              <div className="text-sm md:text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 font-mono">
                {profile.xp} XP
              </div>
              <div className="text-[10px] text-slate-500">Pontos de maestria</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c1f3d] print:bg-slate-100 border border-slate-200 dark:border-slate-700 print:border-slate-300">
              <div className="text-[10px] uppercase font-bold text-slate-500">Taxa de Precisão</div>
              <div className="text-sm md:text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                {profile.accuracyRate.toFixed(2)}%
              </div>
              <div className="text-[10px] text-slate-500">{profile.challengesSolvedCount} missões validadas</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c1f3d] print:bg-slate-100 border border-slate-200 dark:border-slate-700 print:border-slate-300">
              <div className="text-[10px] uppercase font-bold text-slate-500">Simulações & Cálculos</div>
              <div className="text-sm md:text-base font-extrabold text-[#003882] dark:text-sky-400 mt-0.5 font-mono">
                {profile.totalCalculationsDone}
              </div>
              <div className="text-[10px] text-slate-500">Gráficos explorados</div>
            </div>
          </div>

          {/* Pedagogical Diagnosis & Recommendations */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0c1f3d] print:bg-slate-50 border border-slate-200 dark:border-slate-700 print:border-slate-300 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#003882] dark:text-sky-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              Parecer Pedagógico Automatizado
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              O estudante demonstra <strong>alto engajamento prático</strong> com regularidade de {profile.streakDays} dias seguidos.
              Apresenta domínio consolidado nas distribuições fundamentais (
              <span className="text-[#003882] dark:text-sky-300 font-bold">
                Normal, Binomial e Exponencial
              </span>
              ), resolvendo problemas industriais com precisão média de {profile.accuracyRate.toFixed(2)}%.
            </p>
            <div className="text-xs text-slate-600 dark:text-slate-400 pt-1">
              <strong>Recomendação de Reforço:</strong> Continuar a resolução de problemas na distribuição Qui-Quadrado (graus de liberdade e testes de aderência) e nos conceitos de graus de liberdade da t de Student.
            </div>
          </div>

          {/* Distribution Mastery Matrix */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Matriz de Domínio por Distribuição
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(profile.distributionMastery).map(([distId, score]) => (
                <div
                  key={distId}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0c1f3d] print:bg-slate-100 border border-slate-200 dark:border-slate-700 print:border-slate-300 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold capitalize text-slate-900 dark:text-white print:text-black">
                      {distId.replace('_', ' ')}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {score >= 80 ? 'Mestre' : score >= 60 ? 'Apto' : score >= 40 ? 'Intermediário' : 'Iniciante'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-mono font-bold ${
                        score >= 70 ? 'text-emerald-600 dark:text-emerald-400' : score >= 45 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'
                      }`}
                    >
                      {score.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solved Challenges History Log Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Histórico Detalhado de Atividades Avaliadas
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 print:border-slate-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-[#0c1f3d] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 print:border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Desafio Acadêmico</th>
                    <th className="py-2.5 px-3">Distribuição</th>
                    <th className="py-2.5 px-3 text-right">Resposta</th>
                    <th className="py-2.5 px-3 text-right">Gabarito</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 print:divide-slate-300">
                  {profile.history.map((h) => (
                    <tr key={h.id}>
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{h.timestamp}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white print:text-black">{h.challengeTitle}</td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{h.distName}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800 dark:text-slate-200">
                        {typeof h.userAnswer === 'number' ? h.userAnswer.toFixed(4) : h.userAnswer}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {typeof h.expectedAnswer === 'number' ? h.expectedAnswer.toFixed(4) : h.expectedAnswer}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            h.isCorrect
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {h.isCorrect ? 'Correto' : 'Revisar'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Teacher Signature / Rubric Area */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-700 print:border-slate-400 grid grid-cols-2 gap-8 text-xs">
            <div>
              <div className="font-semibold text-slate-600 dark:text-slate-400 mb-8">
                Observações do Docente / Coordenador:
              </div>
              <div className="border-b border-dashed border-slate-400 pb-1 text-[11px] text-slate-500">
                __________________________________________________________________
              </div>
            </div>
            <div className="text-center">
              <div className="mt-8 border-t border-slate-400 dark:border-slate-600 print:border-black pt-1 font-bold text-slate-800 dark:text-slate-200 print:text-black">
                Assinatura do Professor(a) / Orientador(a) UFJF
              </div>
              <div className="text-[10px] text-slate-500">
                ProbMaster · Autoria: Prof. Márcio Souza — DCBV — ICV — UFJF/GV
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
