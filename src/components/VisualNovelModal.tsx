import React, { useEffect, useState } from 'react';
import { Volume2, MessageSquare } from 'lucide-react';
import { DialogueChoice, NPCConfig } from '../types/game';
import { soundEngine } from '../audio/SoundEngine';

interface VisualNovelModalProps {
  npc: NPCConfig;
  currentNodeId: string;
  onSelectChoice: (choice: DialogueChoice) => void;
  onClose: () => void;
}

export const VisualNovelModal: React.FC<VisualNovelModalProps> = ({
  npc,
  currentNodeId,
  onSelectChoice,
  onClose,
}) => {
  const node = npc.dialogueTree[currentNodeId] || npc.dialogueTree[npc.initialNodeId];
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!node) return;
    setDisplayedText('');
    let idx = 0;
    const fullText = node.text;
    const timer = window.setInterval(() => {
      idx += 2;
      if (idx >= fullText.length) {
        setDisplayedText(fullText);
        clearInterval(timer);
      } else {
        setDisplayedText(fullText.slice(0, idx));
      }
    }, 18);

    // Speak NPC line gently via browser synthesis
    soundEngine.speakAssistantText(fullText);

    return () => clearInterval(timer);
  }, [node]);

  if (!node) return null;

  const emotionLabel: Record<string, string> = {
    neutral: 'Спокойный тон',
    urgent: 'Тревожная обстановка',
    hopeful: 'Воодушевление',
    analytic: 'Научный анализ',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm p-4 sm:p-8">
      <div className="w-full max-w-4xl bg-slate-950/95 border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
        {/* Visual Novel Character Header & Stylized Portrait Area */}
        <div className="flex flex-col sm:flex-row items-stretch border-b border-white/10">
          {/* Stylized Anime Cel Portrait SVG */}
          <div
            className="sm:w-56 h-44 sm:h-auto relative flex items-center justify-center p-6 shrink-0"
            style={{
              background: `radial-gradient(circle at 50% 35%, ${npc.accentColor}33 0%, #090d16 85%)`,
            }}
          >
            <svg viewBox="0 0 120 120" className="w-32 h-32 drop-shadow-lg">
              <circle cx="60" cy="60" r="54" fill="#0f172a" stroke={npc.accentColor} strokeWidth="2.5" />
              {/* Shoulders / Coat */}
              <path d="M22 108 C26 78, 94 78, 98 108 Z" fill={npc.coatColor} stroke="#090d16" strokeWidth="3" />
              {/* Collar lapel */}
              <path d="M46 82 L60 104 L74 82" fill="none" stroke={npc.accentColor} strokeWidth="3" />
              {/* Head */}
              <circle cx="60" cy="52" r="22" fill="#fde6cd" stroke="#090d16" strokeWidth="3" />
              {/* Hair */}
              <path
                d="M36 50 C36 24, 84 24, 84 50 C80 38, 40 38, 36 50 Z"
                fill={npc.hairColor}
                stroke="#090d16"
                strokeWidth="2.5"
              />
              {/* Anime Eyes */}
              <rect x="49" y="49" width="5" height="6" rx="2" fill="#0f172a" />
              <rect x="66" y="49" width="5" height="6" rx="2" fill="#0f172a" />
              <circle cx="51" cy="51" r="1.2" fill="#ffffff" />
              <circle cx="68" cy="51" r="1.2" fill="#ffffff" />
              {/* Expression */}
              <path d="M55 63 Q60 66 65 63" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          {/* Dialogue Content Box */}
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <div>
                  <h3
                    className="text-xl font-bold text-white tracking-wide"
                    style={{ fontFamily: "'Chakra Petch', sans-serif" }}
                  >
                    {node.speakerName}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{node.speakerTitle}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-400">{emotionLabel[node.emotion]}</span>
                  </div>
                </div>
                <button
                  onClick={() => soundEngine.speakAssistantText(node.text)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  Озвучить реплику
                </button>
              </div>

              <p className="text-base text-slate-100 leading-relaxed min-h-[4.5rem] mt-3">
                {displayedText}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Сюжетный диалог · Выбор влияет на концовку и награды</span>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white underline transition-colors"
              >
                Прервать диалог (Esc)
              </button>
            </div>
          </div>
        </div>

        {/* Branching Choices */}
        <div className="p-6 bg-slate-900/90 space-y-2.5">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Выберите вариант ответа:</span>
          </div>
          {node.choices.map((choice, idx) => (
            <button
              key={idx}
              onClick={() => onSelectChoice(choice)}
              className="w-full text-left px-4 py-3 rounded-xl bg-slate-950/90 hover:bg-amber-500/15 border border-white/10 hover:border-amber-400/50 text-sm text-slate-100 transition-all flex items-center justify-between group"
            >
              <span className="font-medium group-hover:text-amber-300 transition-colors">
                {idx + 1}. {choice.text}
              </span>
              {choice.giveItem && (
                <span className="text-xs font-mono tabular-nums text-emerald-400 shrink-0 ml-3">
                  +{choice.giveItem.amount} {choice.giveItem.type.toUpperCase()}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
