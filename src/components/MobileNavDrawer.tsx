import React from 'react';
import {
  X,
  Users,
  Shield,
  Zap,
  MapPin,
  ScrollText,
  Save,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Smartphone,
} from 'lucide-react';
import { ActiveModalType } from './GameModals';
import { PWAInstallButton } from './PWAInstallButton';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenModal: (modal: ActiveModalType) => void;
  skillPoints: number;
  isCleanScreen: boolean;
  onToggleCleanScreen: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  onOpenModal,
  skillPoints,
  isCleanScreen,
  onToggleCleanScreen,
  isMuted,
  onToggleMute,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/70 backdrop-blur-sm animate-fadeIn select-none">
      <div
        className="relative w-72 max-w-[85vw] h-full bg-slate-950/95 border-l border-cyan-500/30 p-5 flex flex-col justify-between shadow-2xl overflow-y-auto"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 16px) + 12px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 12px)',
        }}
      >
        {/* Header with Title & Close Button */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <div>
              <h2
                className="text-lg font-bold text-white tracking-wider font-display"
                style={{ fontFamily: "'Chakra Petch', sans-serif" }}
              >
                ЭЛИЗИУМ 3D
              </h2>
              <p className="text-[11px] text-cyan-400 font-mono">Мобильное меню</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-white/10"
              aria-label="Закрыть меню"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick HUD Mode Switcher */}
          <div className="mb-4 p-3 rounded-xl bg-slate-900/90 border border-cyan-400/30">
            <div className="text-xs font-semibold text-slate-200 mb-2 flex items-center justify-between">
              <span>Режим отображения</span>
              <span className="text-[10px] text-cyan-400 font-mono">
                {isCleanScreen ? 'Чистый экран' : 'Полный'}
              </span>
            </div>
            <button
              onClick={() => {
                onToggleCleanScreen();
                onClose();
              }}
              className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                isCleanScreen
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              {isCleanScreen ? (
                <>
                  <Eye className="w-4 h-4 text-slate-950" />
                  Показать текст и интерфейс
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 text-cyan-400" />
                  Убрать весь текст (Чистый экран)
                </>
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1.5">
            <button
              onClick={() => {
                onOpenModal('character');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-colors border border-transparent hover:border-white/10"
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Выбор персонажа</span>
            </button>

            <button
              onClick={() => {
                onOpenModal('wardrobe');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-colors border border-transparent hover:border-white/10"
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Одежда и Защита</span>
            </button>

            <button
              onClick={() => {
                onOpenModal('skills');
                onClose();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-colors border border-transparent hover:border-white/10"
            >
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Древо навыков</span>
              </div>
              {skillPoints > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-mono font-bold">
                  +{skillPoints}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                onOpenModal('map');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-colors border border-transparent hover:border-white/10"
            >
              <MapPin className="w-4 h-4 text-rose-400" />
              <span>Карта и Броневик</span>
            </button>

            <button
              onClick={() => {
                onOpenModal('quests');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-colors border border-transparent hover:border-white/10"
            >
              <ScrollText className="w-4 h-4 text-violet-400" />
              <span>Журнал квестов</span>
            </button>

            <button
              onClick={() => {
                onOpenModal('save');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 text-sm font-semibold transition-colors mt-2"
            >
              <Save className="w-4 h-4" />
              <span>Сохранить / Загрузить</span>
            </button>
          </div>
        </div>

        {/* Footer with Audio, PWA Install & System Status */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Звуковые эффекты</span>
            <button
              onClick={onToggleMute}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 flex items-center gap-1.5 text-xs"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-rose-400" />
                  <span>Выкл</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span>Вкл</span>
                </>
              )}
            </button>
          </div>

          <div className="w-full">
            <PWAInstallButton className="w-full justify-center py-2" />
          </div>
        </div>
      </div>
    </div>
  );
};
