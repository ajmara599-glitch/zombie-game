import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Camera,
  CloudRain,
  Sun,
  Truck,
  HeartPulse,
  Bot,
  Send,
  Smartphone,
  MessageCircle,
  Sparkles,
  RotateCcw,
  Menu,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import {
  CameraMode,
  CharacterId,
  DialogueChoice,
  OutfitId,
  QuestItem,
  ResourcePoint,
  SaveGameData,
  SkillNode,
  TimeOfDay,
  WeatherType,
  WeaponId,
  ZoneId,
} from './types/game';
import {
  CHARACTERS,
  INITIAL_QUESTS,
  INITIAL_RESOURCE_POINTS,
  INITIAL_SKILLS,
  NPCS,
  OUTFITS,
  WEATHERS,
  WEAPONS,
  ZONES,
} from './data/gameContent';
import { GameCanvas3D } from './components/GameCanvas3D';
import { ActiveModalType, GameModals } from './components/GameModals';
import { VisualNovelModal } from './components/VisualNovelModal';
import { MobileTouchHUD } from './components/MobileTouchHUD';
import { MobileNavDrawer } from './components/MobileNavDrawer';
import { soundEngine } from './audio/SoundEngine';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';

const SAVE_STORAGE_KEY = 'elysium_zombie_3d_saves_v1';

export default function App() {
  // Core Game State - Custom GLB character from untitled (1).glb is active
  const [characterId, setCharacterId] = useState<CharacterId>('custom_glb');
  const [customGlbUrl, setCustomGlbUrl] = useState<string>('/untitled (1).glb');
  const [customGlbFileName, setCustomGlbFileName] = useState<string>('untitled (1).glb');
  const [equippedOutfit, setEquippedOutfit] = useState<OutfitId>('default_attire');
  const [unlockedOutfits, setUnlockedOutfits] = useState<OutfitId[]>(['default_attire']);
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponId>('pulse_pistol');
  const [currentZone, setCurrentZone] = useState<ZoneId>('museum');
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [cameraMode, setCameraMode] = useState<CameraMode>('third_person');
  const [inVehicle, setInVehicle] = useState<boolean>(false);

  // RPG Stats & Inventory
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(0);
  const [skillPoints, setSkillPoints] = useState<number>(2);
  const [hp, setHp] = useState<number>(110);
  const [maxHp, setMaxHp] = useState<number>(110);
  const [infection, setInfection] = useState<number>(0);
  const [ammo, setAmmo] = useState<number>(60);
  const [scrap, setScrap] = useState<number>(35);
  const [bioSamples, setBioSamples] = useState<number>(10);
  const [medkits, setMedkits] = useState<number>(3);
  const [kills, setKills] = useState<number>(0);
  const [reputation, setReputation] = useState<number>(50);
  const [storyFlags, setStoryFlags] = useState<string[]>([]);

  // Skills, Quests, and Resources
  const [skills, setSkills] = useState<SkillNode[]>(INITIAL_SKILLS);
  const [quests, setQuests] = useState<QuestItem[]>(INITIAL_QUESTS);
  const [resources, setResources] = useState<ResourcePoint[]>(INITIAL_RESOURCE_POINTS);
  const [trackedResourceId, setTrackedResourceId] = useState<string | null>('res_mus_1');

  // UI & Modals
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [activeDialogueNpcId, setActiveDialogueNpcId] = useState<string | null>(null);
  const [dialogueNodeId, setDialogueNodeId] = useState<string>('start');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showMobileControls, setShowMobileControls] = useState<boolean>(() => {
    return typeof window !== 'undefined' && (window.innerWidth < 900 || 'ontouchstart' in window);
  });

  // Mobile Clean Screen & Ergonomic Collapsible Widgets
  const [isCleanScreen, setIsCleanScreen] = useState<boolean>(false);
  const [isAriaCollapsed, setIsAriaCollapsed] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  });
  const [isQuestCollapsed, setIsQuestCollapsed] = useState<boolean>(false);
  const [isVitalsCollapsed, setIsVitalsCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false;
  });

  useEffect(() => {
    const handleOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
      if (window.innerWidth < 768) {
        setIsAriaCollapsed(true);
      }
    };
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, []);

  const handleCycleWeapon = useCallback(() => {
    const weaponOrder: WeaponId[] = [
      'pulse_pistol',
      'plasma_shotgun',
      'cryo_rifle',
      'throw_extinguisher',
      'throw_bio_flask',
      'throw_globe_disc',
    ];
    setSelectedWeapon((prev) => {
      const idx = weaponOrder.indexOf(prev);
      const next = weaponOrder[(idx + 1) % weaponOrder.length];
      soundEngine.playPickupSound();
      showToast(`Оружие: ${WEAPONS[next].name}`);
      return next;
    });
  }, []);

  // Nearby 3D Context
  const [nearbyContext, setNearbyContext] = useState<{
    nearbyZombies: number;
    nearNpcId: string | null;
    nearNpcName: string | null;
    nearVehicle: boolean;
    burstCooldown: number;
  }>({
    nearbyZombies: 0,
    nearNpcId: null,
    nearNpcName: null,
    nearVehicle: false,
    burstCooldown: 0,
  });

  // AI Survival Voice Assistant ("АРИЯ") State
  const [aiMessage, setAiMessage] = useState<string>(
    'Системы активированы! Я ИИ-дрон «АРИЯ». Стреляйте по заражённым ЛКМ или Пробелом, переключайте оружие и метательные предметы клавишами 1–6!'
  );
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiQuestionInput, setAiQuestionInput] = useState<string>('');
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);

  // Save Slots
  const [saveSlots, setSaveSlots] = useState<(SaveGameData | null)[]>([null, null, null]);

  // Refs shared with 3D Canvas
  const playerPosRef = useRef<{ x: number; z: number }>({ x: 0, z: 16 });
  const joystickRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mobileActionsRef = useRef({
    fire: false,
    throwObj: false,
    burst: false,
    dash: false,
  });

  const skillsRecord = React.useMemo(() => {
    const rec: Record<string, number> = {};
    skills.forEach((s) => {
      rec[s.id] = s.level;
    });
    return rec;
  }, [skills]);

  const totalBiteProtection = React.useMemo(() => {
    const base = CHARACTERS[characterId].baseStats.biteResistance;
    const outfitProt = OUTFITS[equippedOutfit].biteProtection;
    const skillBonus = ((skillsRecord.bite_immunity || 1) - 1) * 8;
    return Math.min(95, Math.max(base, outfitProt) + skillBonus);
  }, [characterId, equippedOutfit, skillsRecord]);

  const showToast = useCallback((msg: string) => {
    setNotificationBanner(msg);
    window.setTimeout(() => {
      setNotificationBanner((prev) => (prev === msg ? null : prev));
    }, 3800);
  }, []);

  // Load saved slots on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSaveSlots(parsed);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Update dynamic environmental audio when zone, timeOfDay, or weather changes
  useEffect(() => {
    soundEngine.updateEnvironment(currentZone, timeOfDay, weather);
  }, [currentZone, timeOfDay, weather]);

  // Recalculate Max HP when character, outfit, or survival skill changes
  useEffect(() => {
    const charBase = CHARACTERS[characterId].baseStats.maxHp;
    const armorBonus = OUTFITS[equippedOutfit].armorBonus;
    const skillHp = ((skillsRecord.bite_immunity || 1) - 1) * 25;
    const computedMax = charBase + armorBonus + skillHp;
    setMaxHp(computedMax);
    setHp((prev) => Math.min(computedMax, prev));
  }, [characterId, equippedOutfit, skillsRecord]);

  // Query Server-Side Gemini AI Survival Assistant ("АРИЯ")
  const askAIAssistant = useCallback(
    async (eventTrigger?: string, customQuestion?: string) => {
      if (aiLoading) return;
      setAiLoading(true);

      const activeQ = quests.find((q) => !q.completed);
      try {
        const res = await fetch('/api/ai-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventTrigger,
            userQuestion: customQuestion,
            gameState: {
              characterName: CHARACTERS[characterId].name,
              characterRole: CHARACTERS[characterId].title,
              zoneName: ZONES[currentZone].name,
              weatherName: WEATHERS[weather].name,
              timeOfDay,
              hp,
              maxHp,
              biteProtection: totalBiteProtection,
              weaponName: WEAPONS[selectedWeapon].name,
              nearbyZombies: nearbyContext.nearbyZombies,
              inVehicle,
              activeQuest: activeQ?.title,
            },
          }),
        });
        const data = await res.json();
        if (data?.text) {
          setAiMessage(data.text);
          soundEngine.speakAssistantText(data.text, data.audioBase64);
        }
      } catch {
        const fallbackMsg =
          'Фиксирую движение заражённых! Используйте метательные колбы и огнетушители для сдерживания толпы.';
        setAiMessage(fallbackMsg);
        soundEngine.speakAssistantText(fallbackMsg, null);
      } finally {
        setAiLoading(false);
      }
    },
    [
      aiLoading,
      characterId,
      currentZone,
      hp,
      inVehicle,
      maxHp,
      nearbyContext.nearbyZombies,
      quests,
      selectedWeapon,
      timeOfDay,
      totalBiteProtection,
      weather,
    ]
  );

  // Hotkeys for Weapons (1-6), Medkit (H), Camera (C)
  useEffect(() => {
    const handleHotkeys = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      const weaponKeys: Record<string, WeaponId> = {
        Digit1: 'pulse_pistol',
        Digit2: 'plasma_shotgun',
        Digit3: 'cryo_rifle',
        Digit4: 'throw_extinguisher',
        Digit5: 'throw_bio_flask',
        Digit6: 'throw_globe_disc',
      };
      if (weaponKeys[e.code]) {
        setSelectedWeapon(weaponKeys[e.code]);
      } else if (e.code === 'KeyH') {
        handleUseMedkit();
      } else if (e.code === 'KeyC') {
        setCameraMode((prev) =>
          prev === 'third_person'
            ? 'top_down'
            : prev === 'top_down'
            ? 'drone_cinematic'
            : 'third_person'
        );
      } else if (e.code === 'Escape') {
        setActiveModal(null);
        setActiveDialogueNpcId(null);
      }
    };
    window.addEventListener('keydown', handleHotkeys);
    return () => window.removeEventListener('keydown', handleHotkeys);
  });

  // Gain XP & Level Up helper
  const gainXp = useCallback(
    (amount: number) => {
      setXp((prevXp) => {
        const nextXp = prevXp + amount;
        const needed = level * 120;
        if (nextXp >= needed) {
          setLevel((l) => l + 1);
          setSkillPoints((sp) => sp + 1);
          showToast(`Новый уровень! Вы получили +1 Очко Навыков!`);
          return nextXp - needed;
        }
        return nextXp;
      });
    },
    [level, showToast]
  );

  // Quest Progress Updater
  const advanceQuest = useCallback(
    (
      targetType: QuestItem['targetType'],
      zoneMatch: ZoneId,
      increment = 1
    ) => {
      setQuests((prev) =>
        prev.map((q) => {
          if (q.completed) return q;
          if (q.targetType !== targetType) return q;
          if (q.zone !== 'any' && q.zone !== zoneMatch) return q;

          const nextCount = Math.min(q.targetCount, q.currentCount + increment);
          const nowDone = nextCount >= q.targetCount;
          if (nowDone && !q.completed) {
            setScrap((s) => s + q.rewardScrap);
            setBioSamples((b) => b + q.rewardBio);
            setSkillPoints((sp) => sp + q.rewardSkillPoints);
            gainXp(q.rewardXp);
            showToast(`Квест выполнен: «${q.title}»! Награда получена.`);
          }
          return {
            ...q,
            currentCount: nextCount,
            completed: nowDone,
          };
        })
      );
    },
    [gainXp, showToast]
  );

  // Combat & World Callbacks from 3D Canvas
  const handlePlayerDamage = useCallback(
    (rawDamage: number, isBite: boolean) => {
      const mitigated = Math.max(
        2,
        Math.round(rawDamage * (1 - totalBiteProtection / 100))
      );
      setHp((prev) => {
        const next = Math.max(0, prev - mitigated);
        if (next === 0) {
          showToast('Критический урон! Дрон «АРИЯ» активировал экстренный дефибриллятор.');
          return Math.round(maxHp * 0.6);
        }
        return next;
      });
      if (isBite) {
        const infGain = Math.max(1, Math.round(8 * (1 - totalBiteProtection / 100)));
        setInfection((prev) => Math.min(100, prev + infGain));
      }
    },
    [maxHp, showToast, totalBiteProtection]
  );

  const handleZombieKilled = useCallback(
    (variant: 'walker' | 'runner' | 'brute') => {
      setKills((k) => k + 1);
      const xpGain = variant === 'brute' ? 45 : variant === 'runner' ? 28 : 20;
      gainXp(xpGain);
      if (Math.random() < 0.45) {
        setScrap((s) => s + (variant === 'brute' ? 6 : 3));
      }
      if (variant === 'brute' || Math.random() < 0.25) {
        setBioSamples((b) => b + (variant === 'brute' ? 4 : 1));
      }
      advanceQuest('kill_zombies', currentZone, 1);
    },
    [advanceQuest, currentZone, gainXp]
  );

  const handleCollectResource = useCallback(
    (resId: string) => {
      const res = resources.find((r) => r.id === resId);
      if (!res || res.collected) return;

      const radarMult = CHARACTERS[characterId].baseStats.resourceRadarBonus;
      const skillMult = 1 + ((skillsRecord.resource_scanner || 1) - 1) * 0.25;
      const finalAmt = Math.ceil(res.amount * radarMult * skillMult);

      if (res.type === 'scrap') setScrap((s) => s + finalAmt);
      if (res.type === 'bio') setBioSamples((b) => b + finalAmt);
      if (res.type === 'ammo') setAmmo((a) => a + finalAmt);
      if (res.type === 'medkit') setMedkits((m) => m + finalAmt);

      setResources((prev) =>
        prev.map((item) => (item.id === resId ? { ...item, collected: true } : item))
      );

      showToast(`Собран ресурс: ${res.name} (+${finalAmt})`);
      advanceQuest('collect_resources', currentZone, 1);
    },
    [advanceQuest, characterId, currentZone, resources, showToast, skillsRecord.resource_scanner]
  );

  const handleUseMedkit = () => {
    if (medkits <= 0) {
      showToast('Нет аптечек! Соберите медикаменты на карте.');
      return;
    }
    setMedkits((m) => m - 1);
    setHp((h) => Math.min(maxHp, h + 65));
    setInfection((inf) => Math.max(0, inf - 45));
    soundEngine.playPickupSound();
    showToast('Использована био-аптечка: +65 ОЗ и очистка от укусов.');
  };

  const handleConsumeAmmo = useCallback(
    (cost: number) => {
      if (ammo < cost) return false;
      setAmmo((a) => Math.max(0, a - cost));
      return true;
    },
    [ammo]
  );

  const handleToggleVehicle = useCallback(
    (forceState?: boolean) => {
      soundEngine.playVehicleEngineSound();
      setInVehicle((prev) => {
        const next = forceState !== undefined ? forceState : !prev;
        showToast(
          next
            ? 'Вы сели за руль броневика «Кочевник»! Можно таранить зомби и быстро менять локации.'
            : 'Вы вышли из броневика.'
        );
        return next;
      });
    },
    [showToast]
  );

  const handleFastTravelZone = (targetZone: ZoneId, withVehicle: boolean) => {
    soundEngine.playVehicleEngineSound();
    setCurrentZone(targetZone);
    setInVehicle(withVehicle);
    const vPos = ZONES[targetZone].vehiclePos;
    playerPosRef.current = { x: vPos.x, z: vPos.z };
    const firstZoneRes = resources.find((r) => r.zone === targetZone && !r.collected);
    if (firstZoneRes) {
      setTrackedResourceId(firstZoneRes.id);
    }
    showToast(`Перемещение завершено: ${ZONES[targetZone].name}`);
    askAIAssistant(`Игрок прибыл в локацию ${ZONES[targetZone].name}`);
  };

  const handleTrackOrTeleportResource = (res: ResourcePoint, teleportNow: boolean) => {
    setTrackedResourceId(res.id);
    if (teleportNow) {
      playerPosRef.current = { x: res.x, z: res.z + 1.2 };
      showToast(`Быстрый переход к точке ресурса: ${res.name}`);
    } else {
      showToast(`Установлен 3D-маяк на ресурс: ${res.name}`);
    }
  };

  // Visual Novel NPC Dialogue Handlers
  const handleOpenNpcDialogue = useCallback((npcId: string) => {
    setActiveDialogueNpcId(npcId);
    setDialogueNodeId('start');
  }, []);

  const handleSelectDialogueChoice = (choice: DialogueChoice) => {
    if (choice.reputationDelta) {
      setReputation((r) => r + choice.reputationDelta!);
    }
    if (choice.giveItem) {
      const { type, amount } = choice.giveItem;
      if (type === 'scrap') setScrap((s) => s + amount);
      if (type === 'bio') setBioSamples((b) => b + amount);
      if (type === 'ammo') setAmmo((a) => a + amount);
      if (type === 'medkit') setMedkits((m) => m + amount);
      if (type === 'xp') gainXp(amount);
    }
    if (choice.storyFlag && !storyFlags.includes(choice.storyFlag)) {
      setStoryFlags((prev) => [...prev, choice.storyFlag!]);
    }
    if (choice.completeQuestStep) {
      advanceQuest('talk_npc', currentZone, 1);
    }
    if (choice.aiCommentTrigger) {
      askAIAssistant(choice.aiCommentTrigger);
    }

    if (choice.nextNodeId) {
      setDialogueNodeId(choice.nextNodeId);
    } else {
      setActiveDialogueNpcId(null);
    }
  };

  // Wardrobe & Skill Upgrade Handlers
  const handleEquipOrCraftOutfit = (outfitId: OutfitId) => {
    const cfg = OUTFITS[outfitId];
    if (unlockedOutfits.includes(outfitId)) {
      setEquippedOutfit(outfitId);
      showToast(`Надет костюм: ${cfg.name} (Защита от укусов ${cfg.biteProtection}%)`);
      return;
    }
    if (scrap >= cfg.costScrap && bioSamples >= cfg.costBio) {
      setScrap((s) => s - cfg.costScrap);
      setBioSamples((b) => b - cfg.costBio);
      setUnlockedOutfits((prev) => [...prev, outfitId]);
      setEquippedOutfit(outfitId);
      soundEngine.playPickupSound();
      showToast(`Создана и надета броня: ${cfg.name}!`);
      askAIAssistant(`Игрок экипировал ${cfg.name} с защитой от укусов ${cfg.biteProtection}%.`);
    }
  };

  const handleUpgradeSkill = (skillId: string) => {
    const target = skills.find((s) => s.id === skillId);
    if (!target || target.level >= target.maxLevel || skillPoints < target.costPerLevel) return;

    setSkillPoints((sp) => sp - target.costPerLevel);
    setSkills((prev) =>
      prev.map((s) => (s.id === skillId ? { ...s, level: s.level + 1 } : s))
    );
    soundEngine.playPickupSound();
    showToast(`Навык улучшен: ${target.name} (Ур. ${target.level + 1})`);
  };

  const handleUploadCustomGlb = (file: File) => {
    try {
      const blobUrl = URL.createObjectURL(file);
      setCustomGlbUrl(blobUrl);
      setCustomGlbFileName(file.name);
      setCharacterId('custom_glb');
      showToast(`3D-модель «${file.name}» успешно подключена!`);
      soundEngine.playPickupSound();

      // Send to server to persist as untitled (1).glb
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          await fetch('/api/upload-model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileBase64: base64, fileName: file.name }),
          });
        } catch (e) {
          console.warn('Could not persist model on server:', e);
        }
      };
      reader.readAsDataURL(file);

      askAIAssistant(`Игрок обновил 3D-персонажа из файла ${file.name}`);
    } catch {
      showToast('Не удалось загрузить файл модели');
    }
  };

  // Save / Load Handlers
  const handleSaveToSlot = (slotIdx: number) => {
    const saveObj: SaveGameData = {
      slotId: slotIdx,
      savedAt: new Date().toLocaleString('ru-RU'),
      characterId,
      equippedOutfit,
      unlockedOutfits,
      selectedWeapon,
      currentZone,
      weather,
      timeOfDay,
      cameraMode,
      level,
      xp,
      skillPoints,
      hp,
      maxHp,
      infection,
      ammo,
      scrap,
      bioSamples,
      medkits,
      kills,
      reputation,
      storyFlags,
      skills: skillsRecord,
      quests,
      playerPos: { ...playerPosRef.current },
    };

    const nextSlots = [...saveSlots];
    nextSlots[slotIdx] = saveObj;
    setSaveSlots(nextSlots);
    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(nextSlots));
      showToast(`Игра успешно сохранена в Слот #${slotIdx + 1}!`);
    } catch {
      showToast('Ошибка записи в локальное хранилище браузера.');
    }
  };

  const handleLoadFromSlot = (slotIdx: number) => {
    const data = saveSlots[slotIdx];
    if (!data) return;

    setCharacterId(data.characterId);
    setEquippedOutfit(data.equippedOutfit);
    setUnlockedOutfits(data.unlockedOutfits || ['default_attire']);
    setSelectedWeapon(data.selectedWeapon);
    setCurrentZone(data.currentZone);
    setWeather(data.weather);
    setTimeOfDay(data.timeOfDay);
    setCameraMode(data.cameraMode);
    setLevel(data.level);
    setXp(data.xp);
    setSkillPoints(data.skillPoints);
    setHp(data.hp);
    setMaxHp(data.maxHp);
    setInfection(data.infection || 0);
    setAmmo(data.ammo);
    setScrap(data.scrap);
    setBioSamples(data.bioSamples);
    setMedkits(data.medkits);
    setKills(data.kills);
    setReputation(data.reputation);
    setStoryFlags(data.storyFlags || []);
    setQuests(data.quests || INITIAL_QUESTS);
    if (data.skills) {
      setSkills((prev) =>
        prev.map((s) => ({ ...s, level: data.skills[s.id] ?? s.level }))
      );
    }
    if (data.playerPos) {
      playerPosRef.current = { ...data.playerPos };
    }
    showToast(`Загружено сохранение из Слота #${slotIdx + 1}!`);
  };

  const activeDialogueNpc = NPCS.find((n) => n.id === activeDialogueNpcId) || null;
  const activeQuest = quests.find((q) => !q.completed) || quests[quests.length - 1];

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-slate-950 select-none flex flex-col">
      {/* Offline State Indicator */}
      <OfflineIndicator />

      {/* STRICT 3-ZONE TOP BAR CONTRACT (Hidden in Clean Screen mode) */}
      {!isCleanScreen && (
        <header className="h-12 md:h-13 px-3 md:px-5 bg-slate-950/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between z-30 shrink-0">
          {/* Zone 1: Brand Title */}
          <div className="flex items-center gap-2">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                setActiveModal('character');
              }}
              className="text-base md:text-lg font-bold tracking-wider text-white whitespace-nowrap"
              style={{ fontFamily: "'Chakra Petch', sans-serif" }}
            >
              ЭЛИЗИУМ 3D
            </a>
            {/* Mobile Vitals Micro-Badge */}
            <div className="md:hidden flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-white/10 text-[11px] font-mono">
              <span className="text-emerald-400 font-bold">❤️ {hp}</span>
              <span className="text-slate-600">·</span>
              <span className="text-cyan-400">🔫 {ammo}</span>
            </div>
          </div>

          {/* Zone 2: Desktop 5 Clean Text Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
            <button
              onClick={() => setActiveModal('character')}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Персонажи
            </button>
            <button
              onClick={() => setActiveModal('wardrobe')}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Одежда и Защита
            </button>
            <button
              onClick={() => setActiveModal('skills')}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Навыки ({skillPoints})
            </button>
            <button
              onClick={() => setActiveModal('map')}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Карта и Транспорт
            </button>
            <button
              onClick={() => setActiveModal('quests')}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Квесты
            </button>
          </nav>

          {/* Zone 3: Actions + Clean Screen & Mobile Drawer */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Clean Screen Toggle Button */}
            <button
              onClick={() => setIsCleanScreen((s) => !s)}
              className="p-1.5 md:px-2.5 md:py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-cyan-400/30 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Убрать весь текст (Чистый экран)"
            >
              <EyeOff className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Скрыть текст</span>
            </button>

            {/* Desktop Actions */}
            <button
              onClick={() => setActiveModal('save')}
              className="hidden sm:inline-flex px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap"
            >
              Сохранение
            </button>

            <button
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                soundEngine.setMuted(nextMuted);
              }}
              className="hidden sm:inline-flex p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
              aria-label="Переключить звук"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            <div className="hidden sm:block">
              <PWAInstallButton />
            </div>

            {/* Mobile Hamburger Drawer Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg bg-slate-900 border border-white/20 text-slate-200 hover:text-white active:scale-95 transition-transform"
              aria-label="Открыть мобильное меню"
            >
              <Menu className="w-5 h-5 text-amber-400" />
            </button>
          </div>
        </header>
      )}

      {/* MAIN 3D VIEWPORT CONTAINER */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        <GameCanvas3D
          characterId={characterId}
          outfitId={equippedOutfit}
          weaponId={selectedWeapon}
          zoneId={currentZone}
          weather={weather}
          timeOfDay={timeOfDay}
          cameraMode={cameraMode}
          inVehicle={inVehicle}
          skills={skillsRecord}
          resources={resources}
          trackedResourceId={trackedResourceId}
          customGlbUrl={customGlbUrl}
          playerPosRef={playerPosRef}
          joystickRef={joystickRef}
          mobileActionsRef={mobileActionsRef}
          onPlayerDamage={handlePlayerDamage}
          onZombieKilled={handleZombieKilled}
          onCollectResource={handleCollectResource}
          onInteractNPC={handleOpenNpcDialogue}
          onToggleVehicle={handleToggleVehicle}
          onConsumeAmmo={handleConsumeAmmo}
          onNearbyContextChange={setNearbyContext}
          onTriggerAIComment={(msg) => askAIAssistant(msg)}
        />

        {/* Toast Notification Banner */}
        {notificationBanner && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-4 py-2 rounded-xl bg-slate-950/90 border border-amber-400/50 text-amber-300 text-xs font-semibold shadow-xl backdrop-blur-md">
            {notificationBanner}
          </div>
        )}

        {/* TOP-LEFT FLOATING HUD: Character Status, Environment & Camera Controls */}
        {!isCleanScreen && (
          <div className="absolute top-2 left-2 z-20 pointer-events-auto flex flex-col gap-2 max-w-[260px] sm:max-w-sm">
            {/* Character Vital Card */}
            <div className="p-2 sm:p-3 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsVitalsCollapsed((s) => !s)}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                    title={isVitalsCollapsed ? 'Развернуть показатели' : 'Свернуть показатели'}
                  >
                    {isVitalsCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-white leading-tight">
                      {CHARACTERS[characterId].name.split(' ')[0]}
                    </div>
                    {!isVitalsCollapsed && (
                      <div className="text-[10px] sm:text-[11px] text-slate-400">
                        Ур. {level} · {OUTFITS[equippedOutfit].name}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleUseMedkit}
                  className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-[11px] font-mono tabular-nums flex items-center gap-1 transition-colors whitespace-nowrap"
                  title="Использовать аптечку (H)"
                >
                  <HeartPulse className="w-3.5 h-3.5" />
                  <span>{medkits}</span>
                </button>
              </div>

              {/* Health Bar */}
              <div className="mt-1.5 sm:mt-2">
                <div className="flex justify-between text-[10px] sm:text-[11px] font-mono tabular-nums text-slate-300 mb-0.5">
                  <span>ОЗ: {hp}/{maxHp}</span>
                  <span>Броня: {totalBiteProtection}%</span>
                </div>
                <div className="w-full h-1.5 sm:h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-150"
                    style={{ width: `${Math.min(100, (hp / Math.max(1, maxHp)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Telemetry Row (Shown when not collapsed) */}
              {!isVitalsCollapsed && (
                <div className="mt-2 pt-1.5 border-t border-white/10 flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] font-mono tabular-nums text-slate-300">
                  <span className="text-cyan-400">Патроны: {ammo}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-400">Металл: {scrap}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400">Био: {bioSamples}</span>
                  <span aria-hidden="true">·</span>
                  <span>Убито: {kills}</span>
                </div>
              )}
            </div>

            {/* Dynamic Environment, Weather & Camera (Shown when not collapsed) */}
            {!isVitalsCollapsed && (
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 shadow-lg space-y-1.5">
                {/* Location Quick Selector */}
                <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg">
                  {(['museum', 'school', 'laboratory'] as ZoneId[]).map((zKey) => (
                    <button
                      key={zKey}
                      onClick={() => handleFastTravelZone(zKey, inVehicle)}
                      className={`flex-1 py-1 px-1.5 rounded-md text-[10px] sm:text-[11px] font-semibold transition-colors whitespace-nowrap truncate ${
                        currentZone === zKey
                          ? 'bg-amber-400 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {zKey === 'museum' ? 'Музей' : zKey === 'school' ? 'Школа' : 'Лаборатория'}
                    </button>
                  ))}
                </div>

                {/* Weather, Time & Camera Controls */}
                <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px]">
                  <button
                    onClick={() => {
                      const order: WeatherType[] = ['clear', 'rain_storm', 'bio_fog', 'ash_wind'];
                      const next = order[(order.indexOf(weather) + 1) % order.length];
                      setWeather(next);
                      showToast(`Погода: ${WEATHERS[next].name}`);
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-white/5 hover:bg-white/15 text-slate-200 flex items-center justify-center gap-1 transition-colors whitespace-nowrap truncate"
                  >
                    <CloudRain className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate">{WEATHERS[weather].name.split(' ')[0]}</span>
                  </button>

                  <button
                    onClick={() => {
                      const times: TimeOfDay[] = ['morning', 'day', 'sunset', 'night'];
                      const next = times[(times.indexOf(timeOfDay) + 1) % times.length];
                      setTimeOfDay(next);
                    }}
                    className="py-1 px-2 rounded-lg bg-white/5 hover:bg-white/15 text-slate-200 flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    <Sun className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>
                      {timeOfDay === 'morning'
                        ? 'Утро'
                        : timeOfDay === 'day'
                        ? 'День'
                        : timeOfDay === 'sunset'
                        ? 'Закат'
                        : 'Ночь'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      const modes: CameraMode[] = ['third_person', 'top_down', 'drone_cinematic'];
                      const next = modes[(modes.indexOf(cameraMode) + 1) % modes.length];
                      setCameraMode(next);
                    }}
                    className="py-1 px-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 flex items-center gap-1 transition-colors whitespace-nowrap"
                    title="Переключить камеру (C)"
                  >
                    <Camera className="w-3 h-3 shrink-0" />
                    <span>
                      {cameraMode === 'third_person'
                        ? '3D'
                        : cameraMode === 'top_down'
                        ? 'Сверху'
                        : 'Дрон'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Contextual Prompts for Nearby NPC or Vehicle */}
            <div className="flex flex-wrap items-center gap-1.5">
              {nearbyContext.nearNpcId && (
                <button
                  onClick={() => handleOpenNpcDialogue(nearbyContext.nearNpcId!)}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-lg flex items-center gap-1.5 transition-transform active:scale-95 whitespace-nowrap"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {nearbyContext.nearNpcName}
                </button>
              )}

              <button
                onClick={() => handleToggleVehicle()}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  inVehicle
                    ? 'bg-cyan-400 text-slate-950'
                    : 'bg-slate-900/85 hover:bg-slate-800 text-cyan-300 border border-cyan-400/40'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                {inVehicle ? 'Выйти (F)' : 'Броневик (F)'}
              </button>
            </div>
          </div>
        )}

        {/* TOP-RIGHT FLOATING HUD: Voice AI Assistant "АРИЯ" & Active Quest */}
        {!isCleanScreen && (
          <div className="absolute top-2 right-2 z-20 pointer-events-auto flex flex-col items-end gap-2 max-w-[260px] sm:max-w-sm">
            {/* AI Companion Voice Box (Collapsible to compact robot badge) */}
            {isAriaCollapsed ? (
              <div className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-cyan-400/40 shadow-lg max-w-[240px]">
                <button
                  onClick={() => setIsAriaCollapsed(false)}
                  className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 truncate"
                  title="Развернуть советника АРИЯ"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                  </span>
                  <Bot className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-[11px] truncate">{aiMessage.slice(0, 24)}...</span>
                </button>
                <button
                  onClick={() => soundEngine.speakAssistantText(aiMessage)}
                  className="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 shrink-0"
                  title="Повторить голосом"
                >
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                </button>
                <button
                  onClick={() => setIsAriaCollapsed(false)}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Развернуть диалог"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950/85 backdrop-blur-md border border-cyan-400/30 shadow-lg w-full">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                    <Bot className="w-4 h-4 text-cyan-400" />
                    <span>ИИ «АРИЯ»</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => soundEngine.speakAssistantText(aiMessage)}
                      className="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-300"
                      title="Повторить голосом"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                    <button
                      onClick={() => askAIAssistant('Дай тактический совет по текущей ситуации на экране')}
                      disabled={aiLoading}
                      className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-[10px] font-semibold text-cyan-300 transition-colors whitespace-nowrap"
                    >
                      {aiLoading ? '...' : 'Совет'}
                    </button>
                    <button
                      onClick={() => setIsAriaCollapsed(true)}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Свернуть"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed max-h-20 overflow-y-auto">{aiMessage}</p>

                {/* Quick Ask AI Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!aiQuestionInput.trim()) return;
                    const q = aiQuestionInput.trim();
                    setAiQuestionInput('');
                    askAIAssistant(undefined, q);
                  }}
                  className="mt-2 flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={aiQuestionInput}
                    onChange={(e) => setAiQuestionInput(e.target.value)}
                    placeholder="Спросить у ИИ..."
                    className="flex-1 bg-slate-900/90 border border-white/15 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading}
                    className="p-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-colors"
                    aria-label="Спросить ИИ"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* Active Quest Tracker Card (Collapsible) */}
            {activeQuest && (
              isQuestCollapsed ? (
                <div
                  onClick={() => setIsQuestCollapsed(false)}
                  className="p-1.5 px-2.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-amber-400/40 text-amber-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-md"
                  title="Развернуть квест"
                >
                  <span className="font-bold truncate max-w-[130px]">🎯 {activeQuest.title}:</span>
                  <span className="font-mono text-[11px]">{activeQuest.currentCount}/{activeQuest.targetCount}</span>
                  <ChevronDown className="w-3 h-3 text-amber-400 shrink-0" />
                </div>
              ) : (
                <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 hover:border-amber-400/40 transition-colors w-full">
                  <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold">
                    <span className="truncate">{activeQuest.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span className="font-mono tabular-nums">{activeQuest.currentCount}/{activeQuest.targetCount}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsQuestCollapsed(true);
                        }}
                        className="p-0.5 text-slate-400 hover:text-white"
                        title="Свернуть квест"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p
                    onClick={() => setActiveModal('quests')}
                    className="text-xs text-slate-300 mt-1 line-clamp-2 cursor-pointer"
                  >
                    {activeQuest.description}
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {/* BOTTOM WEAPON & THROWABLE OBJECTS HOTBAR (Hidden in Clean Screen mode) */}
        {!isCleanScreen && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex flex-col items-center gap-1.5 max-w-full px-2">
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-white/15 shadow-2xl overflow-x-auto max-w-[96vw]">
              {(
                [
                  'pulse_pistol',
                  'plasma_shotgun',
                  'cryo_rifle',
                  'throw_extinguisher',
                  'throw_bio_flask',
                  'throw_globe_disc',
                ] as WeaponId[]
              ).map((wId, idx) => {
                const w = WEAPONS[wId];
                const isSelected = selectedWeapon === wId;
                return (
                  <button
                    key={wId}
                    onClick={() => setSelectedWeapon(wId)}
                    className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-left transition-all shrink-0 border ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                        : 'bg-slate-900/80 text-slate-200 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 text-[9px] sm:text-[10px] font-mono">
                      <span>[{idx + 1}]</span>
                      <span className={isSelected ? 'text-slate-900' : 'text-slate-400'}>
                        {w.category === 'firearm' ? 'Оружие' : 'Бросок'}
                      </span>
                    </div>
                    <div className="text-[11px] sm:text-xs whitespace-nowrap mt-0.5">
                      {w.name.split(' ')[0]} {w.name.split(' ')[1]}
                    </div>
                  </button>
                );
              })}

              {/* Elemental Burst (Q) Button */}
              <button
                onClick={() => {
                  mobileActionsRef.current.burst = true;
                }}
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 shrink-0 flex flex-col items-center justify-center transition-colors"
                title="Элементальный взрыв (Клавиша Q)"
              >
                <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>[Q] Ульта</span>
                </div>
                <div className="text-[11px] sm:text-xs font-bold whitespace-nowrap mt-0.5">
                  {nearbyContext.burstCooldown > 0
                    ? `${nearbyContext.burstCooldown}с`
                    : 'Готово'}
                </div>
              </button>

              {/* Mobile Touch Controls Toggle */}
              <button
                onClick={() => setShowMobileControls((s) => !s)}
                className={`p-2 sm:p-2.5 rounded-xl border transition-colors shrink-0 ${
                  showMobileControls
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-slate-900/80 text-slate-300 border-white/10 hover:text-white'
                }`}
                title="Включить/скрыть мобильный джойстик на экране"
              >
                <Smartphone className="w-4 h-4" />
              </button>

              {/* Mobile PWA Install Shortcut */}
              <div className="md:hidden shrink-0">
                <PWAInstallButton compact />
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/70 px-3 py-1 rounded-lg backdrop-blur-sm">
              <span>WASD — Движение</span>
              <span aria-hidden="true">·</span>
              <span>ЛКМ / Пробел — Огонь</span>
              <span aria-hidden="true">·</span>
              <span>G — Бросок</span>
              <span aria-hidden="true">·</span>
              <span>Q — Ульта</span>
              <span aria-hidden="true">·</span>
              <span>F — Транспорт</span>
              <span aria-hidden="true">·</span>
              <span>E — Диалог</span>
            </div>
          </div>
        )}

        {/* MOBILE TOUCH JOYSTICK & ERGONOMIC BUTTONS */}
        <MobileTouchHUD
          visible={showMobileControls}
          joystickRef={joystickRef}
          mobileActionsRef={mobileActionsRef}
          nearNpcName={nearbyContext.nearNpcName}
          nearVehicle={nearbyContext.nearVehicle}
          inVehicle={inVehicle}
          burstCooldown={nearbyContext.burstCooldown}
          isCleanScreen={isCleanScreen}
          onToggleCleanScreen={() => setIsCleanScreen((s) => !s)}
          onInteractNPC={() => {
            if (nearbyContext.nearNpcId) {
              handleOpenNpcDialogue(nearbyContext.nearNpcId);
            }
          }}
          onToggleVehicle={() => handleToggleVehicle()}
          currentWeaponName={WEAPONS[selectedWeapon].name.split(' ')[0]}
          onCycleWeapon={handleCycleWeapon}
          medkits={medkits}
          onUseMedkit={handleUseMedkit}
        />
      </main>

      {/* MOBILE NAVIGATION DRAWER */}
      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenModal={(modal) => setActiveModal(modal)}
        skillPoints={skillPoints}
        isCleanScreen={isCleanScreen}
        onToggleCleanScreen={() => setIsCleanScreen((s) => !s)}
        isMuted={isMuted}
        onToggleMute={() => {
          const nextMuted = !isMuted;
          setIsMuted(nextMuted);
          soundEngine.setMuted(nextMuted);
        }}
      />

      {/* VISUAL NOVEL BRANCHING DIALOGUE MODAL */}
      {activeDialogueNpc && (
        <VisualNovelModal
          npc={activeDialogueNpc}
          currentNodeId={dialogueNodeId}
          onSelectChoice={handleSelectDialogueChoice}
          onClose={() => setActiveDialogueNpcId(null)}
        />
      )}

      {/* GAME SYSTEM MODALS (Character, Wardrobe, Skills, Map, Quests, Save) */}
      <GameModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        characterId={characterId}
        onSelectCharacter={(id) => {
          setCharacterId(id);
          showToast(`Выбран герой: ${CHARACTERS[id].name} (${CHARACTERS[id].regionOrigin})`);
          askAIAssistant(`Игрок выбрал персонажа ${CHARACTERS[id].name}`);
        }}
        equippedOutfit={equippedOutfit}
        unlockedOutfits={unlockedOutfits}
        onEquipOrCraftOutfit={handleEquipOrCraftOutfit}
        skills={skills}
        skillPoints={skillPoints}
        onUpgradeSkill={handleUpgradeSkill}
        currentZone={currentZone}
        onFastTravelZone={handleFastTravelZone}
        resources={resources}
        trackedResourceId={trackedResourceId}
        onTrackOrTeleportResource={handleTrackOrTeleportResource}
        quests={quests}
        scrap={scrap}
        bioSamples={bioSamples}
        saveSlots={saveSlots}
        onSaveToSlot={handleSaveToSlot}
        onLoadFromSlot={handleLoadFromSlot}
        customGlbFileName={customGlbFileName}
        onUploadCustomGlb={handleUploadCustomGlb}
      />
    </div>
  );
}
