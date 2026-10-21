import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CameraMode,
  CharacterId,
  OutfitId,
  ResourcePoint,
  TimeOfDay,
  WeatherType,
  WeaponId,
  ZoneId,
} from '../types/game';
import {
  CHARACTERS,
  NPCS,
  OUTFITS,
  WEATHERS,
  WEAPONS,
  ZONES,
} from '../data/gameContent';
import {
  buildWeaponProp,
  buildZoneEnvironment,
  CharacterRig,
  createCelMaterial,
  createCelMesh,
  createCharacterRig,
  createNPCRig,
  createVehicleRig,
  createZombieEntity,
  ObstacleBox,
  VehicleRig,
  ZombieEntity,
} from '../three/CelModels';
import { soundEngine } from '../audio/SoundEngine';

interface Projectile3D {
  mesh: THREE.Object3D;
  vel: THREE.Vector3;
  damage: number;
  effectType: string;
  life: number;
  isArcObject: boolean;
}

interface ShockwaveEffect {
  mesh: THREE.Mesh;
  maxScale: number;
  progress: number;
}

export interface GameCanvasProps {
  characterId: CharacterId;
  outfitId: OutfitId;
  weaponId: WeaponId;
  zoneId: ZoneId;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  cameraMode: CameraMode;
  inVehicle: boolean;
  skills: Record<string, number>;
  resources: ResourcePoint[];
  trackedResourceId: string | null;
  customGlbUrl?: string | null;
  playerPosRef: React.MutableRefObject<{ x: number; z: number }>;
  joystickRef: React.MutableRefObject<{ x: number; y: number }>;
  mobileActionsRef: React.MutableRefObject<{
    fire: boolean;
    throwObj: boolean;
    burst: boolean;
    dash: boolean;
  }>;
  onPlayerDamage: (rawDamage: number, isBite: boolean) => void;
  onZombieKilled: (variant: 'walker' | 'runner' | 'brute') => void;
  onCollectResource: (resId: string) => void;
  onInteractNPC: (npcId: string) => void;
  onToggleVehicle: (forceState?: boolean) => void;
  onConsumeAmmo: (amount: number) => boolean;
  onNearbyContextChange: (info: {
    nearbyZombies: number;
    nearNpcId: string | null;
    nearNpcName: string | null;
    nearVehicle: boolean;
    burstCooldown: number;
  }) => void;
  onTriggerAIComment: (eventText: string) => void;
}

export const GameCanvas3D: React.FC<GameCanvasProps> = ({
  characterId,
  outfitId,
  weaponId,
  zoneId,
  weather,
  timeOfDay,
  cameraMode,
  inVehicle,
  skills,
  resources,
  trackedResourceId,
  customGlbUrl,
  playerPosRef,
  joystickRef,
  mobileActionsRef,
  onPlayerDamage,
  onZombieKilled,
  onCollectResource,
  onInteractNPC,
  onToggleVehicle,
  onConsumeAmmo,
  onNearbyContextChange,
  onTriggerAIComment,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglLost, setWebglLost] = useState(false);

  // Keep latest props in refs for the 60fps animation loop
  const propsRef = useRef({
    characterId,
    outfitId,
    weaponId,
    zoneId,
    weather,
    timeOfDay,
    cameraMode,
    inVehicle,
    skills,
    resources,
    trackedResourceId,
    customGlbUrl,
  });

  useEffect(() => {
    propsRef.current = {
      characterId,
      outfitId,
      weaponId,
      zoneId,
      weather,
      timeOfDay,
      cameraMode,
      inVehicle,
      skills,
      resources,
      trackedResourceId,
      customGlbUrl,
    };
  }, [
    characterId,
    outfitId,
    weaponId,
    zoneId,
    weather,
    timeOfDay,
    cameraMode,
    inVehicle,
    skills,
    resources,
    trackedResourceId,
    customGlbUrl,
  ]);

  const callbacksRef = useRef({
    onPlayerDamage,
    onZombieKilled,
    onCollectResource,
    onInteractNPC,
    onToggleVehicle,
    onConsumeAmmo,
    onNearbyContextChange,
    onTriggerAIComment,
  });

  useEffect(() => {
    callbacksRef.current = {
      onPlayerDamage,
      onZombieKilled,
      onCollectResource,
      onInteractNPC,
      onToggleVehicle,
      onConsumeAmmo,
      onNearbyContextChange,
      onTriggerAIComment,
    };
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Initialize Scene, Camera, and Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.012);

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      220
    );
    camera.position.set(0, 8, 14);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
    } catch {
      setWebglLost(true);
      return;
    }

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const handleContextRestored = () => {
      setWebglLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    // 2. Three-Point Studio + Sun/Moon Cel-Lighting
    const ambientLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.15);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    sunLight.position.set(28, 42, 24);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 120;
    const d = 45;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-25, 18, -28);
    scene.add(rimLight);

    // 3. Weather & Zone Particle System (800 particles)
    const particleCount = 800;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = Math.random() * 28;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xfacc15,
      size: 0.28,
      transparent: true,
      opacity: 0.75,
    });
    const weatherParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(weatherParticles);

    // 4. World Containers
    const zoneRoot = new THREE.Group();
    scene.add(zoneRoot);

    const npcRoot = new THREE.Group();
    scene.add(npcRoot);

    const resourceRoot = new THREE.Group();
    scene.add(resourceRoot);

    const zombieRoot = new THREE.Group();
    scene.add(zombieRoot);

    const projectileRoot = new THREE.Group();
    scene.add(projectileRoot);

    // Tracked Resource Navigation Beam
    const waypointBeamGeo = new THREE.CylinderGeometry(0.35, 0.35, 26, 16);
    const waypointBeamMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.45,
    });
    const waypointBeam = new THREE.Mesh(waypointBeamGeo, waypointBeamMat);
    waypointBeam.visible = false;
    scene.add(waypointBeam);

    // 5. Dynamic Scene State
    let currentBuiltZone: ZoneId | null = null;
    let currentBuiltChar: CharacterId | null = null;
    let currentBuiltOutfit: OutfitId | null = null;
    let currentBuiltWeapon: WeaponId | null = null;

    let obstacles: ObstacleBox[] = [];
    let animatedProps: THREE.Object3D[] = [];
    let charRig: CharacterRig | null = null;
    let vehicleRig: VehicleRig | null = null;
    let zombies: ZombieEntity[] = [];
    const projectiles: Projectile3D[] = [];
    const shockwaves: ShockwaveEffect[] = [];
    const resourceMeshes = new Map<string, THREE.Group>();

    let playerAngle = 0;
    let cameraYaw = 0;
    let isPointerDragging = false;
    let lastPointerX = 0;
    let walkAnimTime = 0;
    let recoilAnimTimer = 0;
    let lastFireTimestamp = 0;
    let burstCooldown = 0;
    let dashCooldown = 0;
    let dashActiveTimer = 0;
    let zombieSpawnTimer = 1.5;
    let zombieIdCounter = 1;
    let droneCutsceneAngle = 0;

    const keys: Record<string, boolean> = {};
    let currentBuiltGlbUrl: string | null | undefined = undefined;

    const rebuildCharacter = () => {
      const { characterId: cId, outfitId: oId, weaponId: wId, customGlbUrl: glbUrl } = propsRef.current;
      if (charRig) {
        scene.remove(charRig.group);
      }
      charRig = createCharacterRig(cId, oId, wId, glbUrl);
      charRig.group.position.set(playerPosRef.current.x, 0, playerPosRef.current.z);
      charRig.group.rotation.y = playerAngle;
      scene.add(charRig.group);
      currentBuiltChar = cId;
      currentBuiltOutfit = oId;
      currentBuiltWeapon = wId;
      currentBuiltGlbUrl = glbUrl;
    };

    const rebuildZone = (zId: ZoneId) => {
      zoneRoot.clear();
      npcRoot.clear();
      zombieRoot.clear();
      zombies = [];

      const built = buildZoneEnvironment(zId);
      zoneRoot.add(built.envGroup);
      obstacles = built.obstacles;
      animatedProps = built.animatedProps;

      // Spawn Zone NPCs
      NPCS.filter((n) => n.zone === zId).forEach((npc) => {
        const npcGroup = createNPCRig(npc);
        npcGroup.userData = { npcId: npc.id, npcName: npc.name };
        npcRoot.add(npcGroup);
      });

      // Spawn Armored Vehicle in Zone
      if (vehicleRig) {
        scene.remove(vehicleRig.group);
      }
      const vPos = ZONES[zId].vehiclePos;
      vehicleRig = createVehicleRig(
        propsRef.current.inVehicle ? playerPosRef.current.x : vPos.x,
        propsRef.current.inVehicle ? playerPosRef.current.z : vPos.z
      );
      scene.add(vehicleRig.group);

      // Spawn initial zombies for the zone
      for (let i = 0; i < 6; i++) {
        spawnZombieInZone(zId);
      }

      currentBuiltZone = zId;
    };

    const rebuildResourceNodes = () => {
      resourceRoot.clear();
      resourceMeshes.clear();
      const { resources: resList, zoneId: zId } = propsRef.current;
      resList
        .filter((r) => r.zone === zId && !r.collected)
        .forEach((res) => {
          const g = new THREE.Group();
          g.position.set(res.x, 0, res.z);

          const colorMap: Record<string, number> = {
            scrap: 0xf59e0b,
            bio: 0x10b981,
            ammo: 0x38bdf8,
            medkit: 0xf43f5e,
            energy: 0xa855f7,
          };
          const col = colorMap[res.type] || 0xfacc15;

          const crate = createCelMesh(
            new THREE.BoxGeometry(0.95, 0.75, 0.95),
            createCelMaterial(col, { emissive: col, emissiveIntensity: 0.45 }),
            0.045
          );
          crate.position.y = 0.45;
          g.add(crate);

          // Floating beacon crystal above resource crate
          const crystal = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.28, 0),
            new THREE.MeshBasicMaterial({ color: col })
          );
          crystal.position.y = 1.65;
          crystal.name = 'res_crystal';
          g.add(crystal);

          resourceRoot.add(g);
          resourceMeshes.set(res.id, g);
        });
    };

    const spawnZombieInZone = (zId: ZoneId) => {
      const maxZombies = 11;
      if (zombies.length >= maxZombies) return;

      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 24;
      const zx = THREE.MathUtils.clamp(
        playerPosRef.current.x + Math.cos(angle) * dist,
        -48,
        48
      );
      const zz = THREE.MathUtils.clamp(
        playerPosRef.current.z + Math.sin(angle) * dist,
        -48,
        48
      );

      const roll = Math.random();
      let variant: 'walker' | 'runner' | 'brute' = 'walker';
      if (zId === 'laboratory' && roll < 0.38) {
        variant = 'brute';
      } else if ((zId === 'school' || propsRef.current.weather === 'rain_storm') && roll < 0.5) {
        variant = 'runner';
      } else if (roll < 0.18) {
        variant = 'brute';
      } else if (roll < 0.45) {
        variant = 'runner';
      }

      const zEnt = createZombieEntity(`z_${zombieIdCounter++}`, variant, zx, zz);
      zombieRoot.add(zEnt.group);
      zombies.push(zEnt);
    };

    const spawnShockwave = (x: number, z: number, colorHex: number, maxScale = 4.5) => {
      const geo = new THREE.SphereGeometry(1, 16, 12);
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.65,
        wireframe: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 0.6, z);
      mesh.scale.setScalar(0.2);
      projectileRoot.add(mesh);
      shockwaves.push({ mesh, maxScale, progress: 0 });
    };

    const fireCurrentWeapon = (targetAngle?: number, forceObjectThrow = false) => {
      const nowMs = performance.now();
      let activeWeaponId = propsRef.current.weaponId;
      if (forceObjectThrow && WEAPONS[activeWeaponId].category === 'firearm') {
        activeWeaponId = 'throw_extinguisher';
      }
      const wCfg = WEAPONS[activeWeaponId];
      if (nowMs - lastFireTimestamp < wCfg.fireRateMs) return;

      if (wCfg.ammoCost > 0) {
        const hasAmmo = callbacksRef.current.onConsumeAmmo(wCfg.ammoCost);
        if (!hasAmmo) {
          // Automatically fallback to pulse pistol if out of special ammo
          activeWeaponId = 'pulse_pistol';
        }
      }

      const finalCfg = WEAPONS[activeWeaponId];
      lastFireTimestamp = nowMs;
      recoilAnimTimer = 0.22;

      const baseAngle = targetAngle !== undefined ? targetAngle : playerAngle;
      if (targetAngle !== undefined) {
        playerAngle = targetAngle;
      }

      const charBonus = CHARACTERS[propsRef.current.characterId].baseStats.damageBonus;
      const skillLevel = propsRef.current.skills.weapon_mastery || 1;
      const totalDamage = finalCfg.damage * charBonus * (1 + (skillLevel - 1) * 0.18);

      soundEngine.playWeaponSound(finalCfg.effectType);

      for (let i = 0; i < finalCfg.projectileCount; i++) {
        const spreadOffset =
          finalCfg.projectileCount > 1
            ? (i - (finalCfg.projectileCount - 1) / 2) * finalCfg.spread
            : (Math.random() - 0.5) * finalCfg.spread;
        const shotAngle = baseAngle + spreadOffset;

        let projMesh: THREE.Object3D;
        const isArc = finalCfg.category === 'object';

        if (!isArc) {
          const geo =
            finalCfg.effectType === 'cryo'
              ? new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8)
              : new THREE.SphereGeometry(0.18, 10, 10);
          if (finalCfg.effectType === 'cryo') {
            geo.rotateX(Math.PI / 2);
          }
          const mat = new THREE.MeshBasicMaterial({ color: finalCfg.color });
          projMesh = new THREE.Mesh(geo, mat);
        } else {
          // Actual 3D Throwable Item (Fire Extinguisher, Bio-Flask, or Golden Globe)
          projMesh = buildWeaponProp(activeWeaponId);
          projMesh.scale.setScalar(1.35);
        }

        projMesh.position.set(
          playerPosRef.current.x + Math.sin(shotAngle) * 0.9,
          1.45,
          playerPosRef.current.z + Math.cos(shotAngle) * 0.9
        );
        projMesh.rotation.y = shotAngle;
        projectileRoot.add(projMesh);

        projectiles.push({
          mesh: projMesh,
          vel: new THREE.Vector3(
            Math.sin(shotAngle) * finalCfg.projectileSpeed,
            isArc ? 4.2 : 0,
            Math.cos(shotAngle) * finalCfg.projectileSpeed
          ),
          damage: totalDamage,
          effectType: finalCfg.effectType,
          life: isArc ? 1.4 : 1.1,
          isArcObject: isArc,
        });
      }
    };

    const triggerElementalBurst = () => {
      if (burstCooldown > 0) return;
      const burstSkillLvl = propsRef.current.skills.elemental_burst || 1;
      burstCooldown = Math.max(4, 10 - burstSkillLvl);

      soundEngine.playSkillBurstSound();
      const profile = CHARACTERS[propsRef.current.characterId];
      const burstRadius = 8.5 + burstSkillLvl * 1.6;
      const burstDamage = 85 + burstSkillLvl * 32;

      spawnShockwave(
        playerPosRef.current.x,
        playerPosRef.current.z,
        new THREE.Color(profile.accentColor).getHex(),
        burstRadius
      );

      zombies.forEach((z) => {
        const dx = z.group.position.x - playerPosRef.current.x;
        const dz = z.group.position.z - playerPosRef.current.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= burstRadius) {
          z.hp -= burstDamage;
          z.freezeTimer = 4.0;
          const pushDir = dist > 0.1 ? 1 / dist : 1;
          z.knockbackVel.set(dx * pushDir * 14, 0, dz * pushDir * 14);
        }
      });

      callbacksRef.current.onTriggerAIComment(
        `Активирована ультимативная способность: ${profile.specialAbilityName}!`
      );
    };

    // Initial Build
    rebuildZone(propsRef.current.zoneId);
    rebuildCharacter();
    rebuildResourceNodes();

    // 6. Keyboard & Mouse Event Listeners
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      const code = e.code;
      keys[code] = true;

      if (code === 'Space') {
        e.preventDefault();
        // Auto-aim toward nearest zombie if within 20m, else shoot forward
        let aimAngle = playerAngle;
        let minDist = 22;
        zombies.forEach((z) => {
          const d = Math.hypot(
            z.group.position.x - playerPosRef.current.x,
            z.group.position.z - playerPosRef.current.z
          );
          if (d < minDist) {
            minDist = d;
            aimAngle = Math.atan2(
              z.group.position.x - playerPosRef.current.x,
              z.group.position.z - playerPosRef.current.z
            );
          }
        });
        fireCurrentWeapon(aimAngle, false);
      } else if (code === 'KeyG') {
        fireCurrentWeapon(playerAngle, true);
      } else if (code === 'KeyQ') {
        triggerElementalBurst();
      } else if (code === 'ShiftLeft' || code === 'ShiftRight') {
        if (dashCooldown <= 0) {
          dashActiveTimer = 0.28;
          dashCooldown = 1.6;
        }
      } else if (code === 'KeyF' || code === 'KeyV') {
        callbacksRef.current.onToggleVehicle();
      } else if (code === 'KeyE') {
        // Check NPC interaction
        const zoneNpcs = NPCS.filter((n) => n.zone === propsRef.current.zoneId);
        for (const npc of zoneNpcs) {
          const d = Math.hypot(
            npc.x - playerPosRef.current.x,
            npc.z - playerPosRef.current.z
          );
          if (d < 4.5) {
            callbacksRef.current.onInteractNPC(npc.id);
            break;
          }
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPt = new THREE.Vector3();

    let touchStartPos = { x: 0, y: 0 };
    let isTouchSwiping = false;

    const onPointerDown = (e: PointerEvent) => {
      soundEngine.init();
      if (e.button === 2 || e.altKey) {
        isPointerDragging = true;
        lastPointerX = e.clientX;
        return;
      }

      if (e.pointerType === 'touch') {
        touchStartPos = { x: e.clientX, y: e.clientY };
        lastPointerX = e.clientX;
        isTouchSwiping = true;
      }

      // Left click / Tap aims & shoots toward 3D cursor intersection on the ground
      const rect = renderer.domElement.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseNDC, camera);
      if (raycaster.ray.intersectPlane(groundPlane, intersectPt)) {
        const angleToTarget = Math.atan2(
          intersectPt.x - playerPosRef.current.x,
          intersectPt.z - playerPosRef.current.z
        );
        fireCurrentWeapon(angleToTarget, false);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isPointerDragging || (isTouchSwiping && Math.abs(e.clientX - touchStartPos.x) > 10)) {
        const dx = e.clientX - lastPointerX;
        lastPointerX = e.clientX;
        cameraYaw -= dx * 0.007;
      }
    };

    const onPointerUp = () => {
      isPointerDragging = false;
      isTouchSwiping = false;
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => {
      onResize();
    });
    resizeObserver.observe(container);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 7. Main 60FPS Game Loop
    let animFrameId: number;
    let prevTime = performance.now();

    const animate = (now: number) => {
      animFrameId = requestAnimationFrame(animate);
      const dt = Math.min((now - prevTime) / 1000, 0.1);
      prevTime = now;

      const st = propsRef.current;

      // Check if zone, character, outfit, or weapon changed
      if (st.zoneId !== currentBuiltZone) {
        rebuildZone(st.zoneId);
        rebuildResourceNodes();
      }
      if (
        st.characterId !== currentBuiltChar ||
        st.outfitId !== currentBuiltOutfit ||
        st.weaponId !== currentBuiltWeapon ||
        st.customGlbUrl !== currentBuiltGlbUrl
      ) {
        rebuildCharacter();
      }

      // Sync Resource Crates visibility with state
      if (resourceMeshes.size !== st.resources.filter((r) => r.zone === st.zoneId && !r.collected).length) {
        rebuildResourceNodes();
      }

      // Update Dynamic Lighting & Fog for Time of Day + Weather
      const weatherCfg = WEATHERS[st.weather];
      const zoneCfg = ZONES[st.zoneId];

      let targetSkyColor = 0x1e293b;
      let targetSunIntensity = 2.0;
      if (st.timeOfDay === 'morning') {
        targetSkyColor = 0xfdba74;
        targetSunIntensity = 1.8;
        sunLight.color.setHex(0xffedd5);
      } else if (st.timeOfDay === 'day') {
        targetSkyColor = st.zoneId === 'laboratory' ? 0x064e3b : 0x38bdf8;
        targetSunIntensity = 2.3;
        sunLight.color.setHex(0xffffff);
      } else if (st.timeOfDay === 'sunset') {
        targetSkyColor = 0x9a3412;
        targetSunIntensity = 1.5;
        sunLight.color.setHex(0xf97316);
      } else {
        targetSkyColor = 0x090d16;
        targetSunIntensity = 0.65;
        sunLight.color.setHex(0x818cf8);
      }

      if (st.weather === 'bio_fog') {
        targetSkyColor = 0x064e3b;
      } else if (st.weather === 'rain_storm') {
        targetSkyColor = 0x1e293b;
        // Occasional lightning flash
        if (Math.random() < 0.008) {
          targetSunIntensity = 5.5;
        }
      }

      (scene.background as THREE.Color).lerp(new THREE.Color(targetSkyColor), dt * 3);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(new THREE.Color(targetSkyColor), dt * 3);
        scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, weatherCfg.fogDensity, dt * 2);
      }
      sunLight.intensity = THREE.MathUtils.lerp(sunLight.intensity, targetSunIntensity, dt * 4);

      // Animate Weather / Zone Particles
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      if (st.weather === 'rain_storm') {
        particleMat.color.setHex(0x7dd3fc);
        particleMat.size = 0.22;
      } else if (st.weather === 'bio_fog') {
        particleMat.color.setHex(0x34d399);
        particleMat.size = 0.34;
      } else if (st.weather === 'ash_wind') {
        particleMat.color.setHex(0xf97316);
        particleMat.size = 0.3;
      } else {
        particleMat.color.set(zoneCfg.accentColor);
        particleMat.size = 0.26;
      }

      for (let i = 0; i < particleCount; i++) {
        let py = posAttr.getY(i);
        let px = posAttr.getX(i);
        if (st.weather === 'rain_storm') {
          py -= dt * 26;
        } else if (st.weather === 'bio_fog') {
          py += Math.sin(now * 0.002 + i) * dt * 1.5;
        } else {
          py -= dt * 2.2;
          px += Math.sin(now * 0.001 + i) * dt * 1.2;
        }
        if (py < 0) py = 26;
        if (py > 27) py = 0.5;
        posAttr.setY(i, py);
        posAttr.setX(i, px);
      }
      posAttr.needsUpdate = true;

      // Cooldowns & Mobile Action Triggers
      if (burstCooldown > 0) burstCooldown = Math.max(0, burstCooldown - dt);
      if (dashCooldown > 0) dashCooldown = Math.max(0, dashCooldown - dt);
      if (dashActiveTimer > 0) dashActiveTimer = Math.max(0, dashActiveTimer - dt);

      if (mobileActionsRef.current.fire) {
        fireCurrentWeapon(undefined, false);
        mobileActionsRef.current.fire = false;
      }
      if (mobileActionsRef.current.throwObj) {
        fireCurrentWeapon(playerAngle, true);
        mobileActionsRef.current.throwObj = false;
      }
      if (mobileActionsRef.current.burst) {
        triggerElementalBurst();
        mobileActionsRef.current.burst = false;
      }
      if (mobileActionsRef.current.dash && dashCooldown <= 0) {
        dashActiveTimer = 0.28;
        dashCooldown = 1.6;
        mobileActionsRef.current.dash = false;
      }

      // 8. Player / Vehicle Movement
      let moveX = joystickRef.current.x;
      let moveZ = joystickRef.current.y;
      if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

      const inputLen = Math.hypot(moveX, moveZ);
      const isMoving = inputLen > 0.05;

      const charStats = CHARACTERS[st.characterId].baseStats;
      const outfitCfg = OUTFITS[st.outfitId];
      const agilitySkill = st.skills.tactical_agility || 1;
      let moveSpeed =
        charStats.moveSpeed *
        outfitCfg.speedModifier *
        (1 + (agilitySkill - 1) * 0.08);

      if (st.inVehicle) {
        moveSpeed *= 1.85;
      } else if (dashActiveTimer > 0) {
        moveSpeed *= 2.4;
      }

      if (isMoving) {
        const normX = moveX / inputLen;
        const normZ = moveZ / inputLen;

        // Rotate movement vector by cameraYaw in third-person mode
        const cosYaw = Math.cos(cameraYaw);
        const sinYaw = Math.sin(cameraYaw);
        const worldDirX = normX * cosYaw + normZ * sinYaw;
        const worldDirZ = normZ * cosYaw - normX * sinYaw;

        let nextX = playerPosRef.current.x + worldDirX * moveSpeed * dt;
        let nextZ = playerPosRef.current.z + worldDirZ * moveSpeed * dt;

        // World boundary & obstacle collision resolution
        nextX = THREE.MathUtils.clamp(nextX, -52, 52);
        nextZ = THREE.MathUtils.clamp(nextZ, -52, 52);

        for (const obs of obstacles) {
          const dx = nextX - obs.x;
          const dz = nextZ - obs.z;
          const dist = Math.hypot(dx, dz);
          const minRadius = obs.radius + (st.inVehicle ? 1.8 : 0.75);
          if (dist < minRadius && dist > 0.001) {
            nextX = obs.x + (dx / dist) * minRadius;
            nextZ = obs.z + (dz / dist) * minRadius;
          }
        }

        playerPosRef.current.x = nextX;
        playerPosRef.current.z = nextZ;
        playerAngle = Math.atan2(worldDirX, worldDirZ);
        walkAnimTime += dt * (st.inVehicle ? 14 : 11);
      }

      // Update Character Rig Animation & Vehicle Position
      if (charRig) {
        if (charRig.mixer) {
          charRig.mixer.update(dt);
        }
        if (charRig.customModel) {
          const tilt = isMoving ? Math.sin(walkAnimTime) * 0.03 : 0;
          charRig.customModel.rotation.z = tilt;
          charRig.customModel.position.y = isMoving ? Math.abs(Math.sin(walkAnimTime)) * 0.06 : 0;
        }

        charRig.group.visible = !st.inVehicle;
        charRig.group.position.set(playerPosRef.current.x, 0, playerPosRef.current.z);
        charRig.group.rotation.y = playerAngle;

        const swing = isMoving ? Math.sin(walkAnimTime) * 0.65 : Math.sin(now * 0.003) * 0.05;
        charRig.leftLeg.rotation.x = swing;
        charRig.rightLeg.rotation.x = -swing;
        charRig.leftArm.rotation.x = -swing * 0.7;

        if (recoilAnimTimer > 0) {
          recoilAnimTimer = Math.max(0, recoilAnimTimer - dt);
          charRig.rightArm.rotation.x = -Math.PI * 0.48 - recoilAnimTimer * 1.2;
        } else {
          charRig.rightArm.rotation.x = -Math.PI * 0.35 + swing * 0.25;
        }

        charRig.coatTail.rotation.x = isMoving ? 0.18 + Math.abs(swing) * 0.2 : 0.04;

        // Floating AI Companion Drone orbit animation
        charRig.aiDrone.position.y = 2.42 + Math.sin(now * 0.004) * 0.16;
        charRig.aiDrone.rotation.y += dt * 1.8;
        charRig.shieldAura.rotation.z -= dt * 1.2;
      }

      if (vehicleRig) {
        if (st.inVehicle) {
          vehicleRig.group.position.set(playerPosRef.current.x, 0, playerPosRef.current.z);
          vehicleRig.group.rotation.y = playerAngle;
          vehicleRig.wheels.forEach((w) => {
            w.rotation.x += isMoving ? dt * 12 : 0;
          });
          vehicleRig.beacon.rotation.y += dt * 8;
        }
      }

      // Animate Zone Landmarks & NPC markers
      animatedProps.forEach((prop) => {
        prop.rotation.y += dt * 0.8;
        prop.rotation.x += dt * 0.3;
      });
      npcRoot.children.forEach((npcGroup) => {
        const marker = npcGroup.getObjectByName('npc_marker');
        if (marker) {
          marker.rotation.y += dt * 2.2;
          marker.position.y = 3.05 + Math.sin(now * 0.004) * 0.15;
        }
      });

      // Animate Resource Crystals & Check Collection
      resourceMeshes.forEach((meshGroup, resId) => {
        const crystal = meshGroup.getObjectByName('res_crystal');
        if (crystal) {
          crystal.rotation.y += dt * 2.5;
          crystal.position.y = 1.65 + Math.sin(now * 0.005) * 0.14;
        }
        const dist = Math.hypot(
          meshGroup.position.x - playerPosRef.current.x,
          meshGroup.position.z - playerPosRef.current.z
        );
        if (dist < 2.6) {
          soundEngine.playPickupSound();
          callbacksRef.current.onCollectResource(resId);
          resourceRoot.remove(meshGroup);
          resourceMeshes.delete(resId);
        }
      });

      // Update Waypoint Navigation Beam for Tracked Resource
      const trackedRes = st.resources.find(
        (r) => r.id === st.trackedResourceId && r.zone === st.zoneId && !r.collected
      );
      if (trackedRes) {
        waypointBeam.visible = true;
        waypointBeam.position.set(trackedRes.x, 13, trackedRes.z);
      } else {
        waypointBeam.visible = false;
      }

      // 9. Update Projectiles & Shockwaves
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.life -= dt;
        p.mesh.position.addScaledVector(p.vel, dt);

        if (p.isArcObject) {
          p.vel.y -= 9.8 * dt;
          p.mesh.rotation.x += dt * 9;
          p.mesh.rotation.z += dt * 6;
        }

        let hit = false;
        for (const z of zombies) {
          const dist = Math.hypot(
            p.mesh.position.x - z.group.position.x,
            p.mesh.position.z - z.group.position.z
          );
          const hitRadius = p.isArcObject ? 1.85 : 1.15;
          if (dist < hitRadius) {
            hit = true;
            z.hp -= p.damage;
            if (p.effectType === 'cryo') {
              z.freezeTimer = 3.2;
            }
            if (p.effectType === 'plasma' || p.isArcObject) {
              const pushAngle = Math.atan2(p.vel.x, p.vel.z);
              z.knockbackVel.set(Math.sin(pushAngle) * 10, 0, Math.cos(pushAngle) * 10);
            }
            if (p.isArcObject) {
              // Area of effect splash damage for thrown objects!
              const splashColor =
                p.effectType === 'acid_flask'
                  ? 0x10b981
                  : p.effectType === 'heavy_object'
                  ? 0xef4444
                  : 0xfacc15;
              spawnShockwave(p.mesh.position.x, p.mesh.position.z, splashColor, 3.8);
              zombies.forEach((otherZ) => {
                if (otherZ.id !== z.id) {
                  const d2 = Math.hypot(
                    otherZ.group.position.x - p.mesh.position.x,
                    otherZ.group.position.z - p.mesh.position.z
                  );
                  if (d2 < 3.8) {
                    otherZ.hp -= p.damage * 0.65;
                  }
                }
              });
            }
            break;
          }
        }

        if (hit || p.life <= 0 || p.mesh.position.y <= 0.1) {
          if (p.isArcObject && !hit && p.mesh.position.y <= 0.15) {
            spawnShockwave(p.mesh.position.x, p.mesh.position.z, 0xf97316, 3.2);
          }
          projectileRoot.remove(p.mesh);
          projectiles.splice(i, 1);
        }
      }

      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.progress += dt * 3.2;
        const s = THREE.MathUtils.lerp(0.2, sw.maxScale, sw.progress);
        sw.mesh.scale.setScalar(s);
        (sw.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.65 * (1 - sw.progress));
        if (sw.progress >= 1) {
          projectileRoot.remove(sw.mesh);
          shockwaves.splice(i, 1);
        }
      }

      // 10. Zombie Spawning, AI Behavior, Groan Voices & Combat
      zombieSpawnTimer -= dt * weatherCfg.spawnMultiplier;
      if (zombieSpawnTimer <= 0) {
        spawnZombieInZone(st.zoneId);
        zombieSpawnTimer = 4.2;
      }

      for (let i = zombies.length - 1; i >= 0; i--) {
        const z = zombies[i];

        if (z.hp <= 0) {
          soundEngine.playZombieVoice('death');
          spawnShockwave(z.group.position.x, z.group.position.z, 0xef4444, 1.8);
          zombieRoot.remove(z.group);
          zombies.splice(i, 1);
          callbacksRef.current.onZombieKilled(z.variant);
          continue;
        }

        // Update HP bar fill
        const hpRatio = Math.max(0.05, z.hp / z.maxHp);
        z.hpBarFill.scale.x = hpRatio;
        z.hpBarFill.lookAt(camera.position);

        // Apply knockback decay
        if (z.knockbackVel.lengthSq() > 0.1) {
          z.group.position.addScaledVector(z.knockbackVel, dt);
          z.knockbackVel.multiplyScalar(0.86);
        }

        const dx = playerPosRef.current.x - z.group.position.x;
        const dz = playerPosRef.current.z - z.group.position.z;
        const distToPlayer = Math.hypot(dx, dz);

        // Zombie vocalization groan timer
        z.groanTimer -= dt;
        if (z.groanTimer <= 0 && distToPlayer < 24) {
          soundEngine.playZombieVoice(z.variant === 'brute' ? 'boss' : 'groan');
          z.groanTimer = 5 + Math.random() * 7;
        }

        // Freeze slow modifier
        if (z.freezeTimer > 0) {
          z.freezeTimer -= dt;
        }
        const freezeMult = z.freezeTimer > 0 ? 0.38 : 1.0;
        const currentZSpeed = z.speed * weatherCfg.zombieSpeedMultiplier * freezeMult;

        if (distToPlayer > 1.35) {
          const angleToPlayer = Math.atan2(dx, dz);
          z.group.rotation.y = angleToPlayer;
          z.group.position.x += Math.sin(angleToPlayer) * currentZSpeed * dt;
          z.group.position.z += Math.cos(angleToPlayer) * currentZSpeed * dt;

          const zWalk = Math.sin(now * 0.008 + i) * 0.55;
          z.leftLeg.rotation.x = zWalk;
          z.rightLeg.rotation.x = -zWalk;
          z.leftArm.rotation.x = -Math.PI * 0.42 + zWalk * 0.25;
          z.rightArm.rotation.x = -Math.PI * 0.42 - zWalk * 0.25;
        }

        // Vehicle Ramming vs Zombie Bite Attack
        if (st.inVehicle && distToPlayer < 2.5 && isMoving) {
          z.hp -= 120 * dt * 5;
          z.knockbackVel.set((-dx / distToPlayer) * 16, 0, (-dz / distToPlayer) * 16);
        } else if (!st.inVehicle && distToPlayer < 1.55) {
          z.attackCooldown -= dt;
          if (z.attackCooldown <= 0) {
            z.attackCooldown = 1.15;
            soundEngine.playZombieVoice('attack');
            if (dashActiveTimer <= 0) {
              callbacksRef.current.onPlayerDamage(z.damage, true);
            }
          }
        }
      }

      // 11. Camera Choreography (Third-Person, Top-Down 3D, or 3D Drone Cutscene Video)
      const px = playerPosRef.current.x;
      const pz = playerPosRef.current.z;
      const aspect = camera.aspect;
      // In portrait mode (narrower screen), pull back camera so player and surroundings remain visible
      const portraitMultiplier = aspect < 1.0 ? Math.max(1.0, 1.25 / Math.max(0.4, aspect)) : 1.0;

      if (st.cameraMode === 'third_person') {
        const camDist = (st.inVehicle ? 11.5 : 8.2) * portraitMultiplier;
        const camHeight = (st.inVehicle ? 5.2 : 4.1) * (1 + (portraitMultiplier - 1) * 0.45);
        const targetCamX = px - Math.sin(cameraYaw) * camDist;
        const targetCamZ = pz + Math.cos(cameraYaw) * camDist;
        camera.position.lerp(new THREE.Vector3(targetCamX, camHeight, targetCamZ), dt * 7);
        camera.lookAt(px, 1.6, pz);
      } else if (st.cameraMode === 'top_down') {
        // High-altitude 3D Top-Down Tactical Camera
        const targetCamPos = new THREE.Vector3(
          px,
          24 * portraitMultiplier,
          pz + 9 * portraitMultiplier
        );
        camera.position.lerp(targetCamPos, dt * 6);
        camera.lookAt(px, 0.5, pz);
      } else {
        // 'drone_cinematic': 3D Aerial Video Flyover Mode ("3D-видео с видом сверху для большего погружения")
        droneCutsceneAngle += dt * 0.42;
        const orbitRadius = 26 * portraitMultiplier;
        const targetCamPos = new THREE.Vector3(
          px + Math.cos(droneCutsceneAngle) * orbitRadius,
          (22 + Math.sin(droneCutsceneAngle * 2) * 3) * portraitMultiplier,
          pz + Math.sin(droneCutsceneAngle) * orbitRadius
        );
        camera.position.lerp(targetCamPos, dt * 3);
        camera.lookAt(px, 1.2, pz);
      }

      // 12. Report Context to HUD (nearby NPC, Vehicle proximity, Zombie count)
      let nearNpcId: string | null = null;
      let nearNpcName: string | null = null;
      NPCS.filter((n) => n.zone === st.zoneId).forEach((npc) => {
        if (Math.hypot(npc.x - px, npc.z - pz) < 4.5) {
          nearNpcId = npc.id;
          nearNpcName = npc.name;
        }
      });

      const vWorldPos = vehicleRig ? vehicleRig.group.position : new THREE.Vector3(999, 0, 999);
      const nearVehicle =
        !st.inVehicle && Math.hypot(vWorldPos.x - px, vWorldPos.z - pz) < 5.2;

      callbacksRef.current.onNearbyContextChange({
        nearbyZombies: zombies.length,
        nearNpcId,
        nearNpcName,
        nearVehicle,
        burstCooldown: Math.ceil(burstCooldown),
      });

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
    };
  }, []);

  if (webglLost) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-200 p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Восстановление 3D-контекста WebGL...</h2>
        <p className="text-sm text-slate-400 max-w-md">
          Графический шейдер сел-шейдинга перезапускается. Вы можете продолжать управлять тактической картой и снаряжением.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="w-full h-full relative cursor-crosshair"
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};
