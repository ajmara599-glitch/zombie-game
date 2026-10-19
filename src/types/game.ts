export type CharacterId = 'business_woman' | 'scientist' | 'geographer' | 'custom_glb';

export type OutfitId =
  | 'default_attire'
  | 'kevlar_executive'
  | 'hazmat_cerberus'
  | 'exo_valkyrie';

export type WeaponId =
  | 'pulse_pistol'
  | 'plasma_shotgun'
  | 'cryo_rifle'
  | 'throw_extinguisher'
  | 'throw_bio_flask'
  | 'throw_globe_disc';

export type ZoneId = 'museum' | 'school' | 'laboratory';

export type WeatherType = 'clear' | 'rain_storm' | 'bio_fog' | 'ash_wind';

export type TimeOfDay = 'morning' | 'day' | 'sunset' | 'night';

export type CameraMode = 'third_person' | 'top_down' | 'drone_cinematic';

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  title: string;
  regionOrigin: string;
  coordinates: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  hairColor: string;
  skinTone: string;
  isCustomGlb?: boolean;
  glbSource?: string;
  baseStats: {
    maxHp: number;
    moveSpeed: number;
    damageBonus: number;
    biteResistance: number;
    resourceRadarBonus: number;
  };
  specialAbilityName: string;
  specialAbilityDesc: string;
}

export interface OutfitConfig {
  id: OutfitId;
  name: string;
  subtitle: string;
  biteProtection: number; // % reduction of bite damage & infection
  armorBonus: number;
  speedModifier: number;
  costScrap: number;
  costBio: number;
  torsoColor: string;
  trimColor: string;
  hasShoulderPads: boolean;
  hasVisor: boolean;
  hasGlowAura: boolean;
  description: string;
}

export interface WeaponConfig {
  id: WeaponId;
  name: string;
  category: 'firearm' | 'object';
  damage: number;
  fireRateMs: number;
  projectileSpeed: number;
  projectileCount: number;
  spread: number;
  ammoCost: number;
  color: string;
  effectType: 'bullet' | 'plasma' | 'cryo' | 'heavy_object' | 'acid_flask' | 'ricochet_globe';
  description: string;
}

export interface SkillNode {
  id: string;
  name: string;
  category: 'combat' | 'survival' | 'exploration' | 'elemental';
  level: number;
  maxLevel: number;
  costPerLevel: number;
  description: string;
  effectLabel: string;
}

export interface ResourcePoint {
  id: string;
  zone: ZoneId;
  name: string;
  type: 'scrap' | 'bio' | 'ammo' | 'medkit' | 'energy';
  amount: number;
  x: number;
  z: number;
  collected: boolean;
  respawnTimer: number;
}

export interface DialogueChoice {
  text: string;
  nextNodeId: string | null;
  reputationDelta?: number;
  giveItem?: { type: 'scrap' | 'bio' | 'ammo' | 'medkit' | 'xp'; amount: number };
  unlockQuestId?: string;
  completeQuestStep?: string;
  storyFlag?: string;
  aiCommentTrigger?: string;
}

export interface DialogueNode {
  id: string;
  speakerName: string;
  speakerTitle: string;
  emotion: 'neutral' | 'urgent' | 'hopeful' | 'analytic';
  text: string;
  choices: DialogueChoice[];
}

export interface NPCConfig {
  id: string;
  name: string;
  role: string;
  zone: ZoneId;
  x: number;
  z: number;
  coatColor: string;
  hairColor: string;
  accentColor: string;
  initialNodeId: string;
  dialogueTree: Record<string, DialogueNode>;
}

export interface QuestItem {
  id: string;
  title: string;
  zone: ZoneId | 'any';
  description: string;
  targetType: 'kill_zombies' | 'collect_resources' | 'talk_npc' | 'visit_zone' | 'use_vehicle';
  currentCount: number;
  targetCount: number;
  completed: boolean;
  rewardXp: number;
  rewardScrap: number;
  rewardBio: number;
  rewardSkillPoints: number;
}

export interface WeatherInfo {
  id: WeatherType;
  name: string;
  subtitle: string;
  spawnMultiplier: number;
  zombieSpeedMultiplier: number;
  zombieAggroRadiusMultiplier: number;
  fogDensity: number;
  ambientNote: string;
}

export interface ZoneInfo {
  id: ZoneId;
  name: string;
  subtitle: string;
  dangerLevel: number;
  groundColor: string;
  accentColor: string;
  fogColorDay: string;
  fogColorNight: string;
  particleEffectDesc: string;
  ambientDesc: string;
  vehiclePos: { x: number; z: number };
}

export interface SaveGameData {
  slotId: number;
  savedAt: string;
  characterId: CharacterId;
  equippedOutfit: OutfitId;
  unlockedOutfits: OutfitId[];
  selectedWeapon: WeaponId;
  currentZone: ZoneId;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  cameraMode: CameraMode;
  level: number;
  xp: number;
  skillPoints: number;
  hp: number;
  maxHp: number;
  infection: number;
  ammo: number;
  scrap: number;
  bioSamples: number;
  medkits: number;
  kills: number;
  reputation: number;
  storyFlags: string[];
  skills: Record<string, number>;
  quests: QuestItem[];
  playerPos: { x: number; z: number };
}
