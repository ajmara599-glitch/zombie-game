import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, CheckCircle, X, ShieldAlert, WifiOff } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const PWAInstallButton: React.FC<{ className?: string; compact?: boolean }> = ({
  className = '',
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already running in standalone PWA mode, show a small badge or hide
  if (isInstalled) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium ${className}`}
        title="Запущено как установленное PWA приложение"
      >
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        {!compact && <span>PWA Активно</span>}
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (!outcome) {
        // If dismissed or on platforms where prompt doesn't trigger directly, show the visual guide modal
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600/90 to-blue-600/90 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-950/50 border border-cyan-400/40 text-xs font-semibold tracking-wide transition-all active:scale-95 ${className}`}
        title="Установить игру как мобильное или десктопное приложение"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
        </span>
        <Smartphone className="w-3.5 h-3.5 text-cyan-200 group-hover:scale-110 transition-transform" />
        <span className="font-display">
          {compact ? 'PWA' : 'Установить App'}
        </span>
      </button>

      {/* Installation Guide Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/30 p-6 shadow-2xl shadow-cyan-950/80">
            {/* Header Accent Glow */}
            <div className="absolute -top-16 -left-16 w-44 h-44 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-44 h-44 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* App Icon & Title */}
            <div className="flex items-center gap-4 mb-5">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/30 bg-slate-950 flex-shrink-0">
                <img
                  src="/pwa-192x192.png"
                  alt="Элизиум 3D Иконка"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-white tracking-wide">
                  Элизиум: 3D Апокалипсис
                </h3>
                <p className="text-xs text-cyan-400 font-mono">
                  Прогрессивное веб-приложение (PWA)
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    Оффлайн-режим
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    Без браузерных рамок
                  </span>
                </div>
              </div>
            </div>

            {/* Instructions Body */}
            <div className="space-y-3.5 mb-6 text-sm text-slate-300">
              {isInstallable && (
                <div className="p-3.5 rounded-xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-cyan-300">
                      Готово к быстрой установке
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Браузер готов добавить ярлык на рабочий стол
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const res = await install();
                      if (res) setShowModal(false);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide shadow-md transition active:scale-95 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Установить
                  </button>
                </div>
              )}

              {isIOS ? (
                /* iOS Specific Guide */
                <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Share className="w-3.5 h-3.5" />
                    Инструкция для iPhone & iPad (Safari)
                  </div>
                  <ol className="text-xs space-y-2 text-slate-300 list-decimal list-inside leading-relaxed">
                    <li>
                      Нажмите кнопку <strong className="text-white">«Поделиться»</strong> (иконка квадрата со стрелкой вверх внизу экрана Safari).
                    </li>
                    <li>
                      Прокрутите меню вниз и выберите{' '}
                      <strong className="text-cyan-400 flex-inline items-center gap-1">
                        <PlusSquare className="w-3.5 h-3.5 inline mx-1" />«На экран «Домой»»
                      </strong>
                      .
                    </li>
                    <li>
                      Нажмите <strong className="text-white">«Добавить»</strong> в правом верхнем углу.
                    </li>
                  </ol>
                  <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    💡 Игра появится на вашем главном экране в виде отдельного приложения с красивой иконкой и без строки адреса браузера!
                  </div>
                </div>
              ) : (
                /* Android / Desktop Chrome Guide */
                <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    Инструкция для Android & Chrome:
                  </div>
                  <ol className="text-xs space-y-2 text-slate-300 list-decimal list-inside leading-relaxed">
                    <li>
                      Если кнопка не сработала автоматически, откройте меню браузера{' '}
                      <strong className="text-white">«⋮»</strong> (три точки вверху справа).
                    </li>
                    <li>
                      Выберите пункт{' '}
                      <strong className="text-cyan-300">«Установить приложение»</strong> или{' '}
                      <strong className="text-cyan-300">«Добавить на главный экран»</strong>.
                    </li>
                    <li>
                      Подтвердите установку. Ярлык игры появится среди ваших мобильных приложений!
                    </li>
                  </ol>
                </div>
              )}

              {/* Benefits list */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  <span className="text-cyan-400 font-semibold block">⚡ 60 FPS</span>
                  Плавный аппаратный WebGL рендеринг на весь экран
                </div>
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  <span className="text-emerald-400 font-semibold block">💾 Сохранение</span>
                  Слоты сохранений и квесты доступны в памяти устройства
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex gap-2.5">
              {isInstallable && (
                <button
                  onClick={async () => {
                    const ok = await install();
                    if (ok) setShowModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Установить сейчас
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold tracking-wide transition border border-slate-700"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-500/90 text-slate-950 px-4 py-1.5 text-xs font-bold font-mono tracking-wide shadow-xl backdrop-blur-sm border border-amber-300/40 animate-pulse">
      <WifiOff className="w-4 h-4" />
      <span>Оффлайн режим: ресурсы и 3D кэшированы локально</span>
    </div>
  );
};
