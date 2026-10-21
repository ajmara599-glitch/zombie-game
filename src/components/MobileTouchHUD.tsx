import React, { useRef, useState, useEffect } from 'react';
import {
  Crosshair,
  Flame,
  Sparkles,
  Truck,
  MessageCircle,
  Wind,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  HeartPulse,
  RotateCw,
  RefreshCw,
} from 'lucide-react';

interface MobileTouchHUDProps {
  visible: boolean;
  joystickRef: React.MutableRefObject<{ x: number; y: number }>;
  mobileActionsRef: React.MutableRefObject<{
    fire: boolean;
    throwObj: boolean;
    burst: boolean;
    dash: boolean;
  }>;
  nearNpcName: string | null;
  nearVehicle: boolean;
  inVehicle: boolean;
  burstCooldown: number;
  isCleanScreen: boolean;
  onToggleCleanScreen: () => void;
  onInteractNPC: () => void;
  onToggleVehicle: () => void;
  currentWeaponName?: string;
  onCycleWeapon?: () => void;
  medkits?: number;
  onUseMedkit?: () => void;
}

export const MobileTouchHUD: React.FC<MobileTouchHUDProps> = ({
  visible,
  joystickRef,
  mobileActionsRef,
  nearNpcName,
  nearVehicle,
  inVehicle,
  burstCooldown,
  isCleanScreen,
  onToggleCleanScreen,
  onInteractNPC,
  onToggleVehicle,
  currentWeaponName,
  onCycleWeapon,
  medkits = 0,
  onUseMedkit,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(() => {
    return typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    document.addEventListener('fullscreenchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen toggle not permitted:', err);
    }
  };

  if (!visible) return null;

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2 - 14;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius && dist > 0) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setKnobPos({ x: dx, y: dy });
    joystickRef.current = {
      x: dx / maxRadius,
      y: dy / maxRadius,
    };
  };

  const resetJoystick = () => {
    setDragging(false);
    setKnobPos({ x: 0, y: 0 });
    joystickRef.current = { x: 0, y: 0 };
  };

  return (
    <div
      className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between select-none"
      style={{
        paddingTop: 'env(safe-area-inset-top, 8px)',
        paddingBottom: 'env(safe-area-inset-bottom, 12px)',
        paddingLeft: 'env(safe-area-inset-left, 12px)',
        paddingRight: 'env(safe-area-inset-right, 12px)',
      }}
    >
      {/* Top Floating Mobile Toolbar: Fullscreen & Clean Screen Toggle */}
      <div className="flex items-center justify-between px-3 pt-2 pointer-events-auto">
        {/* Clean Screen Pill (Instant 1-Tap Toggle to remove all text clutter) */}
        <button
          onClick={onToggleCleanScreen}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg border text-xs font-semibold tracking-wide transition-all active:scale-95 ${
            isCleanScreen
              ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-amber-500/30 ring-2 ring-amber-400/50'
              : 'bg-slate-900/80 text-slate-200 border-white/20 hover:bg-slate-800'
          }`}
          title="Скрыть/показать весь текст на экране"
        >
          {isCleanScreen ? (
            <>
              <Eye className="w-4 h-4 text-slate-950" />
              <span>Показать текст</span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4 text-cyan-400" />
              <span>Убрать текст (Чистый экран)</span>
            </>
          )}
        </button>

        {/* Right Corner: Fullscreen & Orientation indicator */}
        <div className="flex items-center gap-2">
          {/* Quick Medkit Button in Clean Screen mode */}
          {isCleanScreen && onUseMedkit && (
            <button
              onClick={onUseMedkit}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 text-xs font-mono backdrop-blur-md active:scale-95 transition-transform"
              title="Использовать аптечку"
            >
              <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
              <span>{medkits}</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-slate-200 hover:text-white active:scale-95 transition-transform shadow-md"
            title={isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'}
            aria-label="Полноэкранный режим"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-amber-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-cyan-400" />
            )}
          </button>
        </div>
      </div>

      {/* Bottom Control Zone: Joystick on Left, Action Cluster on Right */}
      <div className="flex items-end justify-between px-3 sm:px-6 pb-2 w-full">
        {/* Left Virtual Thumb Joystick */}
        <div
          ref={padRef}
          onPointerDown={(e) => {
            e.stopPropagation();
            setDragging(true);
            updateJoystick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!dragging) return;
            e.stopPropagation();
            updateJoystick(e.clientX, e.clientY);
          }}
          onPointerUp={resetJoystick}
          onPointerCancel={resetJoystick}
          onPointerLeave={resetJoystick}
          className={`pointer-events-auto rounded-full bg-slate-950/60 backdrop-blur-md border border-cyan-400/30 flex items-center justify-center relative touch-none select-none shadow-xl transition-all ${
            isPortrait ? 'w-28 h-28 mb-3' : 'w-32 h-32 mb-1'
          }`}
          style={{ touchAction: 'none' }}
        >
          {/* Outer Ring guide */}
          <div className="absolute inset-2 rounded-full border border-white/10 pointer-events-none" />
          {/* Inner Joystick Knob */}
          <div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 border-2 border-white shadow-lg shadow-amber-500/40 transition-transform duration-75 flex items-center justify-center"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-slate-950/30" />
          </div>
        </div>

        {/* Right Ergonomic Touch Action Cluster */}
        <div className="pointer-events-auto flex flex-col items-end gap-2 select-none">
          {/* Contextual NPC & Vehicle & Weapon Cycle Row */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {/* Quick Weapon Switcher for Touch (Cycles Primary & Throwable items) */}
            {onCycleWeapon && (
              <button
                onClick={onCycleWeapon}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-cyan-400/40 text-cyan-300 font-semibold text-xs shadow-lg flex items-center gap-1.5 active:scale-95 transition-transform"
                title="Сменить оружие/предмет"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="truncate max-w-[100px]">{currentWeaponName || 'Оружие'}</span>
              </button>
            )}

            {nearNpcName && (
              <button
                onClick={onInteractNPC}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-transform"
              >
                <MessageCircle className="w-4 h-4" />
                Диалог
              </button>
            )}

            {(nearVehicle || inVehicle) && (
              <button
                onClick={onToggleVehicle}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-transform"
              >
                <Truck className="w-4 h-4" />
                {inVehicle ? 'Выйти' : 'В авто'}
              </button>
            )}
          </div>

          {/* Combat Action Buttons Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Dash / Roll Button */}
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                mobileActionsRef.current.dash = true;
              }}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/20 text-slate-100 flex flex-col items-center justify-center text-[10px] font-semibold active:scale-95 transition-transform shadow-md"
            >
              <Wind className="w-5 h-5 text-cyan-400 mb-0.5" />
              Рывок
            </button>

            {/* Ultimate Burst Ability */}
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                mobileActionsRef.current.burst = true;
              }}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-amber-400/50 text-amber-300 flex flex-col items-center justify-center text-[10px] font-semibold active:scale-95 transition-transform shadow-md"
            >
              <Sparkles className="w-5 h-5 text-amber-400 mb-0.5" />
              {burstCooldown > 0 ? `${burstCooldown}с` : 'Ульта'}
            </button>

            {/* Throw Weapon / Object (Grenade / Extinguisher) */}
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                mobileActionsRef.current.throwObj = true;
              }}
              className="w-15 h-15 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-700 backdrop-blur-md border border-rose-300/40 text-white flex flex-col items-center justify-center text-xs font-bold active:scale-95 transition-transform shadow-lg shadow-rose-950/60"
            >
              <Flame className="w-5 h-5 mb-0.5" />
              Бросок
            </button>

            {/* Primary Fire Button */}
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                mobileActionsRef.current.fire = true;
              }}
              className="w-15 h-15 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex flex-col items-center justify-center text-xs font-bold active:scale-95 transition-transform shadow-lg shadow-amber-500/40"
            >
              <Crosshair className="w-6 h-6 mb-0.5" />
              Огонь
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
