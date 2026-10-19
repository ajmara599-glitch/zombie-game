import React, { useRef, useState } from 'react';
import { Crosshair, Flame, Sparkles, Truck, MessageCircle, Wind } from 'lucide-react';

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
  onInteractNPC: () => void;
  onToggleVehicle: () => void;
}

export const MobileTouchHUD: React.FC<MobileTouchHUDProps> = ({
  visible,
  joystickRef,
  mobileActionsRef,
  nearNpcName,
  nearVehicle,
  inVehicle,
  burstCooldown,
  onInteractNPC,
  onToggleVehicle,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  if (!visible) return null;

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2 - 16;

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
    <div className="fixed inset-x-0 bottom-4 z-30 pointer-events-none flex items-end justify-between px-4 sm:px-8">
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
        className="pointer-events-auto w-32 h-32 rounded-full bg-slate-950/65 backdrop-blur-md border border-white/20 flex items-center justify-center relative touch-none select-none shadow-lg"
      >
        <div
          className="w-12 h-12 rounded-full bg-amber-400/90 border-2 border-white shadow-md transition-transform duration-75"
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
        />
      </div>

      {/* Right Ergonomic Touch Action Cluster */}
      <div className="pointer-events-auto flex flex-col items-end gap-2.5 select-none">
        {/* Contextual NPC & Vehicle Buttons */}
        <div className="flex items-center gap-2">
          {nearNpcName && (
            <button
              onClick={onInteractNPC}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-transform"
            >
              <MessageCircle className="w-4 h-4" />
              Говорить: {nearNpcName}
            </button>
          )}

          {(nearVehicle || inVehicle) && (
            <button
              onClick={onToggleVehicle}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-transform"
            >
              <Truck className="w-4 h-4" />
              {inVehicle ? 'Выйти (F)' : 'В броневик (F)'}
            </button>
          )}
        </div>

        {/* Combat Touch Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              mobileActionsRef.current.dash = true;
            }}
            className="w-14 h-14 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/20 text-slate-100 flex flex-col items-center justify-center text-[11px] font-semibold active:scale-95 transition-transform"
          >
            <Wind className="w-5 h-5 text-cyan-400 mb-0.5" />
            Рывок
          </button>

          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              mobileActionsRef.current.burst = true;
            }}
            className="w-14 h-14 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-amber-400/50 text-amber-300 flex flex-col items-center justify-center text-[11px] font-semibold active:scale-95 transition-transform"
          >
            <Sparkles className="w-5 h-5 text-amber-400 mb-0.5" />
            {burstCooldown > 0 ? `${burstCooldown}с` : 'Ульта'}
          </button>

          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              mobileActionsRef.current.throwObj = true;
            }}
            className="w-16 h-16 rounded-2xl bg-rose-600/85 backdrop-blur-md border border-rose-300/40 text-white flex flex-col items-center justify-center text-xs font-bold active:scale-95 transition-transform shadow-lg"
          >
            <Flame className="w-5 h-5 mb-0.5" />
            Предмет
          </button>

          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              mobileActionsRef.current.fire = true;
            }}
            className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex flex-col items-center justify-center text-xs font-bold active:scale-95 transition-transform shadow-lg"
          >
            <Crosshair className="w-6 h-6 mb-0.5" />
            Огонь
          </button>
        </div>
      </div>
    </div>
  );
};
