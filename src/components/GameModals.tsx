import React from 'react';
import {
  X,
  Shield,
  Zap,
  MapPin,
  Truck,
  Save,
  Check,
  Navigation,
  UserCheck,
  Sparkles,
  Upload,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import {
  CharacterId,
  OutfitId,
  QuestItem,
  ResourcePoint,
  SaveGameData,
  SkillNode,
  ZoneId,
} from '../types/game';
import { CHARACTERS, OUTFITS, ZONES } from '../data/gameContent';

export type ActiveModalType =
  | null
  | 'character'
  | 'wardrobe'
  | 'skills'
  | 'map'
  | 'quests'
  | 'save';

interface GameModalsProps {
  activeModal: ActiveModalType;
  onClose: () => void;
  characterId: CharacterId;
  onSelectCharacter: (id: CharacterId) => void;
  equippedOutfit: OutfitId;
  unlockedOutfits: OutfitId[];
  onEquipOrCraftOutfit: (id: OutfitId) => void;
  skills: SkillNode[];
  skillPoints: number;
  onUpgradeSkill: (skillId: string) => void;
  currentZone: ZoneId;
  onFastTravelZone: (zone: ZoneId, withVehicle: boolean) => void;
  resources: ResourcePoint[];
  trackedResourceId: string | null;
  onTrackOrTeleportResource: (res: ResourcePoint, teleportNow: boolean) => void;
  quests: QuestItem[];
  scrap: number;
  bioSamples: number;
  saveSlots: (SaveGameData | null)[];
  onSaveToSlot: (slotId: number) => void;
  onLoadFromSlot: (slotId: number) => void;
  customGlbFileName?: string;
  onUploadCustomGlb?: (file: File) => void;
}

export const GameModals: React.FC<GameModalsProps> = ({
  activeModal,
  onClose,
  characterId,
  onSelectCharacter,
  equippedOutfit,
  unlockedOutfits,
  onEquipOrCraftOutfit,
  skills,
  skillPoints,
  onUpgradeSkill,
  currentZone,
  onFastTravelZone,
  resources,
  trackedResourceId,
  onTrackOrTeleportResource,
  quests,
  scrap,
  bioSamples,
  saveSlots,
  onSaveToSlot,
  onLoadFromSlot,
  customGlbFileName,
  onUploadCustomGlb,
}) => {
  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col bg-slate-950 border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60">
          <h2
            className="text-xl font-bold text-white tracking-wide"
            style={{ fontFamily: "'Chakra Petch', sans-serif" }}
          >
            {activeModal === 'character' && 'Выбор Персонажа и Географического Происхождения'}
            {activeModal === 'wardrobe' && 'Гардероб и Защита от Укусов'}
            {activeModal === 'skills' && 'Прокачка Навыков и Способностей'}
            {activeModal === 'map' && '3D-Карта Секторов, Ресурсы и Быстрый Транспорт'}
            {activeModal === 'quests' && 'Журнал Заданий и Сюжетный Прогресс'}
            {activeModal === 'save' && 'Система Сохранения Игры'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Закрыть окно"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. CHARACTER SELECTION */}
          {activeModal === 'character' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(Object.keys(CHARACTERS) as CharacterId[]).map((cKey) => {
                const c = CHARACTERS[cKey];
                const isSelected = c.id === characterId;
                return (
                  <div
                    key={c.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900 border-amber-400'
                        : 'bg-slate-900/50 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: c.accentColor }}
                        />
                        <span className="text-[11px] font-mono text-slate-400 truncate">
                          {c.id === 'custom_glb' ? 'GLB 3D-МОДЕЛЬ' : c.coordinates}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">{c.name}</h3>
                      <p className="text-xs text-amber-400 mt-0.5">{c.title}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{c.regionOrigin}</p>
                      <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                        {c.description}
                      </p>

                      {c.id === 'custom_glb' && (
                        <div className="mt-3 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs">
                          <div className="flex items-center justify-between text-cyan-300 font-semibold mb-1">
                            <span className="truncate">Файл: {customGlbFileName || 'untitled (1).glb'}</span>
                            <span className="text-[10px] text-emerald-400 shrink-0 ml-1">Активен</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mb-2">
                            Загружен из Blender glTF. Можно заменить или обновить модель:
                          </p>
                          <label className="w-full py-1.5 px-2 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Загрузить / Обновить .glb</span>
                            <input
                              type="file"
                              accept=".glb,.gltf"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  onUploadCustomGlb?.(e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}

                      <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1 text-[11px] font-mono tabular-nums text-slate-300">
                        <div className="flex justify-between">
                          <span>Макс. Здоровье:</span>
                          <span className="text-white">{c.baseStats.maxHp} ОЗ</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Бонус к урону:</span>
                          <span className="text-emerald-400">
                            +{Math.round((c.baseStats.damageBonus - 1) * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Защита от укусов:</span>
                          <span className="text-cyan-400">{c.baseStats.biteResistance}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Радар ресурсов:</span>
                          <span className="text-amber-400">x{c.baseStats.resourceRadarBonus}</span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-white/10">
                        <div className="text-[11px] font-semibold text-cyan-300">
                          Ульта (Q): {c.specialAbilityName}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{c.specialAbilityDesc}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectCharacter(c.id)}
                      className={`mt-4 w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      {isSelected ? 'Герой активен' : 'Выбрать героя'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. WARDROBE & BITE PROTECTION */}
          {activeModal === 'wardrobe' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-white/10 text-sm">
                <p className="text-slate-300">
                  Экипировка меняет внешний вид 3D-модели и снижает урон от укусов заражённых.
                </p>
                <div className="flex items-center gap-4 font-mono tabular-nums text-xs">
                  <span className="text-amber-400">Металлолом: {scrap} ед.</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400">Био-образцы: {bioSamples} ед.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(OUTFITS) as OutfitId[]).map((oKey) => {
                  const outfit = OUTFITS[oKey];
                  const isUnlocked = unlockedOutfits.includes(outfit.id);
                  const isEquipped = equippedOutfit === outfit.id;
                  const canAfford = scrap >= outfit.costScrap && bioSamples >= outfit.costBio;

                  return (
                    <div
                      key={outfit.id}
                      className={`p-5 rounded-xl border flex flex-col justify-between ${
                        isEquipped
                          ? 'bg-slate-900 border-cyan-400'
                          : 'bg-slate-900/50 border-white/10'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-bold text-white">{outfit.name}</h3>
                          <span className="text-xs font-mono tabular-nums text-cyan-400">
                            Защита от укусов: {outfit.biteProtection}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{outfit.subtitle}</p>
                        <p className="text-sm text-slate-300 mt-3">{outfit.description}</p>

                        <div className="mt-3 flex items-center gap-3 text-xs font-mono tabular-nums text-slate-400">
                          <span>Броня: +{outfit.armorBonus} ОЗ</span>
                          <span aria-hidden="true">·</span>
                          <span>Скорость: {Math.round(outfit.speedModifier * 100)}%</span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                        {!isUnlocked ? (
                          <span className="text-xs font-mono tabular-nums text-slate-300">
                            Цена: {outfit.costScrap} Металла · {outfit.costBio} Био
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400">Разблокировано в гардеробе</span>
                        )}

                        <button
                          onClick={() => onEquipOrCraftOutfit(outfit.id)}
                          disabled={!isUnlocked && !canAfford}
                          className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                            isEquipped
                              ? 'bg-cyan-400 text-slate-950'
                              : isUnlocked
                              ? 'bg-white/15 text-white hover:bg-white/25'
                              : canAfford
                              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                              : 'bg-white/5 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Shield className="w-4 h-4" />
                          {isEquipped
                            ? 'Надето'
                            : isUnlocked
                            ? 'Надеть костюм'
                            : 'Создать и надеть'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. SKILLS PROGRESSION */}
          {activeModal === 'skills' && (
            <div>
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
                <p className="text-sm text-slate-300">
                  Зарабатывайте очки навыков за повышение уровня и выполнение сюжетных квестов.
                </p>
                <div className="text-sm font-mono tabular-nums text-amber-400 font-semibold">
                  Доступно очков навыков: {skillPoints}
                </div>
              </div>

              <div className="space-y-3">
                {skills.map((sk) => {
                  const isMax = sk.level >= sk.maxLevel;
                  const canUpgrade = !isMax && skillPoints >= sk.costPerLevel;
                  return (
                    <div
                      key={sk.id}
                      className="p-4 rounded-xl bg-slate-900/70 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-bold text-white">{sk.name}</h3>
                          <span className="text-xs font-mono tabular-nums text-amber-400">
                            Уровень {sk.level} / {sk.maxLevel}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 mt-1">{sk.description}</p>
                        <p className="text-xs text-cyan-400 mt-1">{sk.effectLabel}</p>
                      </div>

                      <button
                        onClick={() => onUpgradeSkill(sk.id)}
                        disabled={!canUpgrade}
                        className={`py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                          isMax
                            ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                            : canUpgrade
                            ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                            : 'bg-white/5 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                        {isMax ? 'Макс. уровень' : `Улучшить (${sk.costPerLevel} очк.)`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. WORLD MAP, FAST TRAVEL VEHICLE & RESOURCE NODES */}
          {activeModal === 'map' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white mb-3">
                  01. Быстрое перемещение между локациями на Броневике «Кочевник»
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(Object.keys(ZONES) as ZoneId[]).map((zKey) => {
                    const z = ZONES[zKey];
                    const isCurrent = z.id === currentZone;
                    return (
                      <div
                        key={z.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between ${
                          isCurrent
                            ? 'bg-slate-900 border-amber-400'
                            : 'bg-slate-900/50 border-white/10'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>Уровень угрозы: {z.dangerLevel}</span>
                            {isCurrent && <span className="text-amber-400">Текущая зона</span>}
                          </div>
                          <h4 className="text-base font-bold text-white">{z.name}</h4>
                          <p className="text-xs text-slate-300 mt-1">{z.subtitle}</p>
                          <p className="text-xs text-cyan-400 mt-2">{z.particleEffectDesc}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-2">
                          <button
                            onClick={() => {
                              onFastTravelZone(z.id, true);
                              onClose();
                            }}
                            className="w-full py-2 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                          >
                            <Truck className="w-4 h-4" />
                            Поехать на Броневике
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => {
                                onFastTravelZone(z.id, false);
                                onClose();
                              }}
                              className="w-full py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors whitespace-nowrap"
                            >
                              Пеший переход в зону
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resource Points in Current Zone */}
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-base font-semibold text-white mb-2">
                  02. Точки ресурсов в секторе «{ZONES[currentZone].name}»
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Выберите точку ресурса, чтобы подсветить её золотым 3D-лучом на карте или мгновенно перейти к ней.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {resources
                    .filter((r) => r.zone === currentZone)
                    .map((res) => {
                      const isTracked = trackedResourceId === res.id;
                      return (
                        <div
                          key={res.id}
                          className="p-3.5 rounded-xl bg-slate-900/70 border border-white/10 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-sm font-semibold text-white">{res.name}</div>
                            <div className="text-xs font-mono tabular-nums text-slate-400 mt-0.5">
                              Тип: {res.type.toUpperCase()} (+{res.amount}) · Коорд: [{res.x},{' '}
                              {res.z}]
                            </div>
                          </div>

                          {res.collected ? (
                            <span className="text-xs text-emerald-400 font-medium shrink-0">
                              Собрано
                            </span>
                          ) : (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  onTrackOrTeleportResource(res, false);
                                  onClose();
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                                  isTracked
                                    ? 'bg-amber-400 text-slate-950'
                                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                                }`}
                              >
                                <MapPin className="w-3.5 h-3.5" />
                                Маяк
                              </button>
                              <button
                                onClick={() => {
                                  onTrackOrTeleportResource(res, true);
                                  onClose();
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap"
                              >
                                <Navigation className="w-3.5 h-3.5" />К ресурсу
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* 5. QUESTS LOG */}
          {activeModal === 'quests' && (
            <div className="space-y-3">
              {quests.map((q) => (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border ${
                    q.completed
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-slate-900/70 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {q.completed ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-amber-400" />
                      )}
                      {q.title}
                    </h3>
                    <span className="text-xs font-mono tabular-nums text-slate-300">
                      Прогресс: {q.currentCount} / {q.targetCount}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mt-1.5">{q.description}</p>
                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono tabular-nums text-slate-400">
                    <span>
                      Награда: +{q.rewardXp} XP · +{q.rewardScrap} Металла · +{q.rewardBio} Био · +
                      {q.rewardSkillPoints} Очк. Навыков
                    </span>
                    <span className={q.completed ? 'text-emerald-400' : 'text-amber-400'}>
                      {q.completed ? 'Выполнено' : 'Активно'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 6. SAVE / LOAD SYSTEM */}
          {activeModal === 'save' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Сохраняйте прогресс в браузере в любой из 3 слотов. Сохраняются выбранный герой, одежда, навыки, ресурсы, локация и сюжетные решения.
              </p>

              {/* PWA Mobile App Install Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 to-slate-900 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-cyan-400/40 bg-slate-950 shrink-0">
                    <img src="/pwa-192x192.png" alt="App Icon" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white font-display">
                      Установить как мобильное приложение (PWA)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Запуск без рамок браузера, иконка на рабочем столе и поддержка оффлайн-режима.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <PWAInstallButton />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((slotIdx) => {
                  const slotData = saveSlots[slotIdx];
                  return (
                    <div
                      key={slotIdx}
                      className="p-4 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-xs font-mono text-slate-400">
                          Ячейка памяти #{slotIdx + 1}
                        </div>
                        {slotData ? (
                          <div className="mt-2 space-y-1 text-xs text-slate-300">
                            <div className="text-sm font-bold text-white">
                              {CHARACTERS[slotData.characterId]?.name}
                            </div>
                            <div>Локация: {ZONES[slotData.currentZone]?.name}</div>
                            <div className="font-mono tabular-nums">
                              Ур. {slotData.level} · Убито: {slotData.kills} · ОЗ: {slotData.hp}
                            </div>
                            <div className="text-slate-500 pt-1">{slotData.savedAt}</div>
                          </div>
                        ) : (
                          <div className="mt-4 text-sm text-slate-500 py-4">Пустой слот</div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                        <button
                          onClick={() => onSaveToSlot(slotIdx)}
                          className="flex-1 py-2 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Сохранить
                        </button>
                        {slotData && (
                          <button
                            onClick={() => {
                              onLoadFromSlot(slotIdx);
                              onClose();
                            }}
                            className="flex-1 py-2 px-3 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                          >
                            Загрузить
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
