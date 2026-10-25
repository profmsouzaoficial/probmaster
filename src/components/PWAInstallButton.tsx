/**
 * PWA Install Button & iOS Guided Install Modal
 */

import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Share2, PlusSquare, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-all active:scale-95 cursor-pointer"
        title="Instalar no celular"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Download className="w-5 h-5 text-indigo-400" />
                  Instalar no iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                  <Share2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Passo 1:</strong> Toque no ícone de <strong>Compartilhar</strong> na barra do Safari (na parte inferior ou superior da tela).
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                  <PlusSquare className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Passo 2:</strong> Role para baixo nas opções e selecione <strong>Adicionar à Tela de Início</strong>.
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Pronto! O aplicativo passará a abrir em tela cheia como um app nativo, mesmo sem internet.
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white transition cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback direct button for browsers that allow prompting or manual instructions
  return (
    <button
      onClick={() => alert('Para instalar no seu smartphone, abra o menu do navegador (três pontinhos ou botão de compartilhar) e selecione "Adicionar à tela inicial" ou "Instalar aplicativo".')}
      className="flex items-center gap-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
      title="Instalar aplicativo"
    >
      <Download className="w-3.5 h-3.5 text-indigo-400" />
      <span>Instalar App</span>
    </button>
  );
};
