import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  CharacterId,
  NPCConfig,
  OutfitId,
  WeaponId,
  ZoneId,
} from '../types/game';
import { CHARACTERS, OUTFITS, WEAPONS } from '../data/gameContent';

// Shared 4-tone cel-shading gradient map for Genshin-like anime shading
let sharedToonGradient: THREE.DataTexture | null = null;

export function getToonGradientMap(): THREE.DataTexture {
  if (sharedToonGradient) return sharedToonGradient;
  const colors = new Uint8Array([
    75, 75, 90, 255,    // Deep shadow band (cool-tinted)
    145, 145, 160, 255, // Mid-shadow band
    215, 215, 225, 255, // Lit band
    255, 255, 255, 255, // Rim highlight band
  ]);
  const texture = new THREE.DataTexture(colors, 4, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  sharedToonGradient = texture;
  return texture;
}

export function createCelMaterial(
  colorHex: string | number,
  options?: {
    emissive?: string | number;
    emissiveIntensity?: number;
    transparent?: boolean;
    opacity?: number;
  }
): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({
    color: new THREE.Color(colorHex),
    gradientMap: getToonGradientMap(),
    emissive: options?.emissive ? new THREE.Color(options.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: options?.emissiveIntensity ?? 0,
    transparent: options?.transparent ?? false,
    opacity: options?.opacity ?? 1,
  });
}

// Creates a mesh with an inverted-hull anime ink outline
export function createCelMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  outlineThickness = 0.035,
  outlineColor = 0x0f172a
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  if (outlineThickness > 0) {
    const outlineMat = new THREE.MeshBasicMaterial({
      color: outlineColor,
      side: THREE.BackSide,
    });
    const outlineMesh = new THREE.Mesh(geometry, outlineMat);
    outlineMesh.scale.setScalar(1 + outlineThickness);
    mesh.add(outlineMesh);
  }
  return mesh;
}

export interface CharacterRig {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weaponMount: THREE.Group;
  coatTail: THREE.Mesh;
  aiDrone: THREE.Group;
  shieldAura: THREE.Mesh;
  customModel?: THREE.Object3D | null;
  mixer?: THREE.AnimationMixer | null;
  isCustomGlb?: boolean;
}

export function buildWeaponProp(weaponId: WeaponId): THREE.Group {
  const group = new THREE.Group();
  const cfg = WEAPONS[weaponId];

  if (cfg.category === 'firearm') {
    const barrelLen = weaponId === 'cryo_rifle' ? 0.95 : weaponId === 'plasma_shotgun' ? 0.75 : 0.48;
    const bodyGeo = new THREE.BoxGeometry(0.14, 0.18, barrelLen);
    const bodyMat = createCelMaterial(0x1e293b);
    const body = createCelMesh(bodyGeo, bodyMat, 0.04);
    body.position.set(0, 0, barrelLen * 0.35);
    group.add(body);

    const coreGeo = new THREE.BoxGeometry(0.16, 0.08, barrelLen * 0.7);
    const coreMat = createCelMaterial(cfg.color, {
      emissive: cfg.color,
      emissiveIntensity: 0.8,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 0.04, barrelLen * 0.38);
    group.add(core);
  } else if (weaponId === 'throw_extinguisher') {
    // Red Fire Extinguisher cylinder
    const cylGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.55, 12);
    const cylMat = createCelMaterial(0xef4444);
    const cyl = createCelMesh(cylGeo, cylMat, 0.05);
    cyl.rotation.x = Math.PI * 0.5;
    cyl.position.set(0, 0, 0.25);
    group.add(cyl);

    const nozzleGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.18, 8);
    const nozzleMat = createCelMaterial(0x1e293b);
    const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzle.position.set(0, 0.12, 0.45);
    group.add(nozzle);
  } else if (weaponId === 'throw_bio_flask') {
    // Glowing Laboratory Bio-Flask
    const flaskGeo = new THREE.SphereGeometry(0.19, 12, 12);
    const flaskMat = createCelMaterial(0x10b981, {
      emissive: 0x10b981,
      emissiveIntensity: 0.7,
    });
    const flask = createCelMesh(flaskGeo, flaskMat, 0.05);
    flask.position.set(0, 0, 0.25);
    group.add(flask);
  } else {
    // Golden Museum Globe / Disc
    const globeGeo = new THREE.OctahedronGeometry(0.2, 1);
    const globeMat = createCelMaterial(0xf59e0b, {
      emissive: 0xd97706,
      emissiveIntensity: 0.5,
    });
    const globe = createCelMesh(globeGeo, globeMat, 0.05);
    globe.position.set(0, 0, 0.25);
    group.add(globe);
  }

  return group;
}

export function createCharacterRig(
  characterId: CharacterId,
  outfitId: OutfitId,
  weaponId: WeaponId,
  customGlbUrl?: string | null
): CharacterRig {
  const profile = CHARACTERS[characterId];
  const outfit = OUTFITS[outfitId];

  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const mainTorsoColor =
    outfit.torsoColor === 'character_default' ? profile.primaryColor : outfit.torsoColor;
  const trimColor = outfitId === 'default_attire' ? profile.secondaryColor : outfit.trimColor;

  // Torso (Jacket / Lab Coat / Tactical Armor / Cyber Armor)
  const torsoGeo = new THREE.BoxGeometry(0.74, 0.92, 0.44);
  const torsoMat = createCelMaterial(mainTorsoColor);
  const torso = createCelMesh(torsoGeo, torsoMat, 0.04);
  torso.position.y = 1.38;
  bodyPivot.add(torso);

  // Lapel / Tie / Bio-Core stripe on chest
  const lapelGeo = new THREE.BoxGeometry(0.24, 0.65, 0.46);
  const lapelMat = createCelMaterial(trimColor, {
    emissive: trimColor,
    emissiveIntensity: outfit.hasGlowAura ? 0.6 : 0.15,
  });
  const lapel = new THREE.Mesh(lapelGeo, lapelMat);
  lapel.position.y = 1.42;
  bodyPivot.add(lapel);

  // Flowing Coat Tails / Business Skirt-Blazer lower hem
  const tailHeight = characterId === 'scientist' ? 0.62 : 0.42;
  const coatTailGeo = new THREE.BoxGeometry(0.78, tailHeight, 0.48);
  const coatTailMat = createCelMaterial(mainTorsoColor);
  const coatTail = createCelMesh(coatTailGeo, coatTailMat, 0.035);
  coatTail.position.set(0, 0.88, -0.02);
  bodyPivot.add(coatTail);

  // Dual cyber boosters for custom_glb character
  if (characterId === 'custom_glb') {
    const thrusterGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.6, 12);
    const thrusterMat = createCelMaterial(0x0f172a);
    const tLeft = createCelMesh(thrusterGeo, thrusterMat, 0.04);
    tLeft.position.set(-0.35, 1.48, -0.28);
    tLeft.rotation.x = -0.2;
    const tRight = createCelMesh(thrusterGeo, thrusterMat, 0.04);
    tRight.position.set(0.35, 1.48, -0.28);
    tRight.rotation.x = -0.2;

    const nozzleGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.1, 12);
    const nozzleMat = createCelMaterial(0xea580c, { emissive: 0xea580c, emissiveIntensity: 0.9 });
    const nLeft = new THREE.Mesh(nozzleGeo, nozzleMat);
    nLeft.position.set(0, -0.32, 0);
    tLeft.add(nLeft);
    const nRight = new THREE.Mesh(nozzleGeo, nozzleMat);
    nRight.position.set(0, -0.32, 0);
    tRight.add(nRight);
    bodyPivot.add(tLeft, tRight);
  }

  // Optional Shoulder Pads for bite-resistant armor outfits
  if (outfit.hasShoulderPads) {
    const padGeo = new THREE.BoxGeometry(0.32, 0.24, 0.5);
    const padMat = createCelMaterial(trimColor, {
      emissive: trimColor,
      emissiveIntensity: 0.35,
    });
    const leftPad = createCelMesh(padGeo, padMat, 0.04);
    leftPad.position.set(-0.52, 1.75, 0);
    const rightPad = createCelMesh(padGeo, padMat, 0.04);
    rightPad.position.set(0.52, 1.75, 0);
    bodyPivot.add(leftPad, rightPad);
  }

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.15, 0);
  bodyPivot.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.34, 16, 16);
  const skinMat = createCelMaterial(profile.skinTone);
  const headMesh = createCelMesh(headGeo, skinMat, 0.045);
  headGroup.add(headMesh);

  // Stylized Anime Eyes
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.09, 0.05);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.12, 0.02, 0.31);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.12, 0.02, 0.31);
  headGroup.add(leftEye, rightEye);

  // Character-specific Hair & Accessories
  const hairMat = createCelMaterial(profile.hairColor);
  const hairCapGeo = new THREE.SphereGeometry(0.37, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const hairCap = createCelMesh(hairCapGeo, hairMat, 0.04);
  hairCap.position.y = 0.05;
  headGroup.add(hairCap);

  if (characterId === 'business_woman') {
    // Sleek anime bob locks + executive bun
    const bunGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const bun = createCelMesh(bunGeo, hairMat, 0.04);
    bun.position.set(0, 0.22, -0.32);
    headGroup.add(bun);

    const sideLockGeo = new THREE.BoxGeometry(0.11, 0.38, 0.14);
    const leftLock = createCelMesh(sideLockGeo, hairMat, 0.03);
    leftLock.position.set(-0.31, -0.08, 0.12);
    const rightLock = createCelMesh(sideLockGeo, hairMat, 0.03);
    rightLock.position.set(0.31, -0.08, 0.12);
    headGroup.add(leftLock, rightLock);
  } else if (characterId === 'scientist') {
    // Scientist glasses with cyan frames
    const glassGeo = new THREE.BoxGeometry(0.52, 0.12, 0.08);
    const glassMat = createCelMaterial(0x38bdf8, {
      emissive: 0x38bdf8,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.85,
    });
    const glasses = new THREE.Mesh(glassGeo, glassMat);
    glasses.position.set(0, 0.04, 0.33);
    headGroup.add(glasses);
  } else if (characterId === 'custom_glb') {
    // Custom Cyber-Blender Hero Helmet Crest & Panoramic Visor
    const crestGeo = new THREE.BoxGeometry(0.08, 0.35, 0.45);
    const crestMat = createCelMaterial(0xea580c, { emissive: 0xea580c, emissiveIntensity: 0.6 });
    const crest = createCelMesh(crestGeo, crestMat, 0.04);
    crest.position.set(0, 0.32, -0.05);
    headGroup.add(crest);

    const cyberVisorGeo = new THREE.BoxGeometry(0.48, 0.16, 0.22);
    const cyberVisorMat = createCelMaterial(0x38bdf8, {
      emissive: 0x0284c7,
      emissiveIntensity: 0.85,
    });
    const cyberVisor = new THREE.Mesh(cyberVisorGeo, cyberVisorMat);
    cyberVisor.position.set(0, 0.04, 0.28);
    headGroup.add(cyberVisor);
  } else {
    // Geographer expedition beret / visor brim
    const hatGeo = new THREE.CylinderGeometry(0.42, 0.45, 0.12, 16);
    const hatMat = createCelMaterial(0x78350f);
    const hat = createCelMesh(hatGeo, hatMat, 0.04);
    hat.position.set(0, 0.28, 0);
    headGroup.add(hat);
  }

  // Optional Bite-Protection Helmet Visor
  if (outfit.hasVisor) {
    const visorGeo = new THREE.SphereGeometry(0.39, 16, 12, 0, Math.PI, 0.2, Math.PI * 0.55);
    const visorMat = createCelMaterial(outfit.trimColor, {
      emissive: outfit.trimColor,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.65,
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.rotation.x = -Math.PI * 0.1;
    headGroup.add(visor);
  }

  // Arms
  const armGeo = new THREE.BoxGeometry(0.22, 0.72, 0.22);
  const armMat = createCelMaterial(mainTorsoColor);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.52, 1.72, 0);
  const leftArmMesh = createCelMesh(armGeo, armMat, 0.04);
  leftArmMesh.position.y = -0.28;
  leftArm.add(leftArmMesh);
  bodyPivot.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.52, 1.72, 0);
  const rightArmMesh = createCelMesh(armGeo, armMat, 0.04);
  rightArmMesh.position.y = -0.28;
  rightArm.add(rightArmMesh);

  // Weapon mount on right hand
  const weaponMount = new THREE.Group();
  weaponMount.position.set(0, -0.58, 0.2);
  weaponMount.add(buildWeaponProp(weaponId));
  rightArm.add(weaponMount);
  bodyPivot.add(rightArm);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.26, 0.82, 0.26);
  const legColor = characterId === 'business_woman' ? 0x0f172a : 0x334155;
  const legMat = createCelMaterial(legColor);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.2, 0.85, 0);
  const leftLegMesh = createCelMesh(legGeo, legMat, 0.04);
  leftLegMesh.position.y = -0.4;
  leftLeg.add(leftLegMesh);
  bodyPivot.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.2, 0.85, 0);
  const rightLegMesh = createCelMesh(legGeo, legMat, 0.04);
  rightLegMesh.position.y = -0.4;
  rightLeg.add(rightLegMesh);
  bodyPivot.add(rightLeg);

  // Floating AI Voice Companion Drone "АРИЯ"
  const aiDrone = new THREE.Group();
  aiDrone.position.set(-0.95, 2.45, -0.35);
  const droneCoreGeo = new THREE.OctahedronGeometry(0.18, 1);
  const droneCoreMat = createCelMaterial(0x38bdf8, {
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.9,
  });
  const droneCore = createCelMesh(droneCoreGeo, droneCoreMat, 0.05);
  aiDrone.add(droneCore);

  const droneRingGeo = new THREE.TorusGeometry(0.28, 0.03, 8, 24);
  const droneRingMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const droneRing = new THREE.Mesh(droneRingGeo, droneRingMat);
  droneRing.rotation.x = Math.PI * 0.4;
  aiDrone.add(droneRing);
  group.add(aiDrone);

  // Elemental / Exo Shield Aura Ring on ground
  const auraGeo = new THREE.RingGeometry(0.75, 0.92, 32);
  const auraMat = new THREE.MeshBasicMaterial({
    color: outfit.hasGlowAura ? 0x22d3ee : profile.accentColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: outfit.hasGlowAura ? 0.65 : 0.3,
  });
  const shieldAura = new THREE.Mesh(auraGeo, auraMat);
  shieldAura.rotation.x = -Math.PI / 2;
  shieldAura.position.y = 0.04;
  group.add(shieldAura);

  const rig: CharacterRig = {
    group,
    bodyPivot,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weaponMount,
    coatTail,
    aiDrone,
    shieldAura,
    isCustomGlb: characterId === 'custom_glb',
    customModel: null,
    mixer: null,
  };

  // If custom_glb is selected, attempt to load the user's uploaded GLB model
  if (characterId === 'custom_glb') {
    const loader = new GLTFLoader();
    const tryUrls = [
      customGlbUrl,
      '/untitled (1).glb',
      '/untitled_1.glb',
      'untitled (1).glb',
    ].filter(Boolean) as string[];

    const attemptLoad = (index: number) => {
      if (index >= tryUrls.length) return;
      const url = tryUrls[index];
      loader.load(
        url,
        (gltf) => {
          let meshCount = 0;
          gltf.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              meshCount++;
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          if (meshCount > 0) {
            // User provided custom 3D mesh geometry in the GLB
            torso.visible = false;
            lapel.visible = false;
            coatTail.visible = false;
            headGroup.visible = false;
            leftArm.visible = false;
            rightArm.visible = false;
            leftLeg.visible = false;
            rightLeg.visible = false;

            const box = new THREE.Box3().setFromObject(gltf.scene);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const targetHeight = 2.1;
            const scaleFactor = targetHeight / Math.max(0.1, size.y);
            gltf.scene.scale.setScalar(scaleFactor);
            gltf.scene.position.x = -center.x * scaleFactor;
            gltf.scene.position.y = -box.min.y * scaleFactor;
            gltf.scene.position.z = -center.z * scaleFactor;

            bodyPivot.add(gltf.scene);
            rig.customModel = gltf.scene;

            if (gltf.animations && gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(gltf.scene);
              gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
              rig.mixer = mixer;
            }
          }
        },
        undefined,
        () => {
          attemptLoad(index + 1);
        }
      );
    };

    attemptLoad(0);
  }

  return rig;
}

export interface ZombieEntity {
  id: string;
  variant: 'walker' | 'runner' | 'brute';
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  hpBarFill: THREE.Mesh;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  freezeTimer: number;
  attackCooldown: number;
  groanTimer: number;
  knockbackVel: THREE.Vector3;
}

export function createZombieEntity(
  id: string,
  variant: 'walker' | 'runner' | 'brute',
  x: number,
  z: number
): ZombieEntity {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const scale = variant === 'brute' ? 1.42 : variant === 'runner' ? 0.94 : 1.05;
  group.scale.setScalar(scale);

  const skinColor =
    variant === 'brute' ? 0x065f46 : variant === 'runner' ? 0x881337 : 0x3f6212;
  const coatColor =
    variant === 'brute' ? 0x1e293b : variant === 'runner' ? 0x4c0519 : 0x27272a;
  const eyeColor = variant === 'brute' ? 0x10b981 : 0xef4444;

  // Torso
  const torsoGeo = new THREE.BoxGeometry(0.76, 0.94, 0.46);
  const torsoMat = createCelMaterial(coatColor);
  const torso = createCelMesh(torsoGeo, torsoMat, 0.045);
  torso.position.y = 1.35;
  group.add(torso);

  // Head
  const headGeo = new THREE.BoxGeometry(0.54, 0.54, 0.54);
  const headMat = createCelMaterial(skinColor);
  const head = createCelMesh(headGeo, headMat, 0.045);
  head.position.set(0, 2.1, 0.06);
  group.add(head);

  // Glowing Infected Eyes
  const eyeGeo = new THREE.BoxGeometry(0.11, 0.08, 0.05);
  const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });
  const lEye = new THREE.Mesh(eyeGeo, eyeMat);
  lEye.position.set(-0.13, 2.12, 0.34);
  const rEye = new THREE.Mesh(eyeGeo, eyeMat);
  rEye.position.set(0.13, 2.12, 0.34);
  group.add(lEye, rEye);

  // Brute Bio-Crystals on shoulders
  if (variant === 'brute') {
    const crystGeo = new THREE.ConeGeometry(0.2, 0.55, 6);
    const crystMat = createCelMaterial(0x10b981, {
      emissive: 0x10b981,
      emissiveIntensity: 0.85,
    });
    const c1 = new THREE.Mesh(crystGeo, crystMat);
    c1.position.set(-0.4, 2.0, -0.1);
    c1.rotation.z = 0.4;
    const c2 = new THREE.Mesh(crystGeo, crystMat);
    c2.position.set(0.4, 2.0, -0.1);
    c2.rotation.z = -0.4;
    group.add(c1, c2);
  }

  // Outstretched Zombie Arms
  const armGeo = new THREE.BoxGeometry(0.22, 0.72, 0.22);
  const armMat = createCelMaterial(skinColor);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.52, 1.68, 0);
  const lArmMesh = createCelMesh(armGeo, armMat, 0.04);
  lArmMesh.position.y = -0.3;
  leftArm.add(lArmMesh);
  leftArm.rotation.x = -Math.PI * 0.42;
  group.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.52, 1.68, 0);
  const rArmMesh = createCelMesh(armGeo, armMat, 0.04);
  rArmMesh.position.y = -0.3;
  rightArm.add(rArmMesh);
  rightArm.rotation.x = -Math.PI * 0.42;
  group.add(rightArm);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.26, 0.8, 0.26);
  const legMat = createCelMaterial(0x18181b);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.2, 0.82, 0);
  const lLegMesh = createCelMesh(legGeo, legMat, 0.04);
  lLegMesh.position.y = -0.38;
  leftLeg.add(lLegMesh);
  group.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.2, 0.82, 0);
  const rLegMesh = createCelMesh(legGeo, legMat, 0.04);
  rLegMesh.position.y = -0.38;
  rightLeg.add(rLegMesh);
  group.add(rightLeg);

  // Floating 3D Health Bar
  const hpBgGeo = new THREE.PlaneGeometry(0.9, 0.11);
  const hpBgMat = new THREE.MeshBasicMaterial({
    color: 0x090d16,
    side: THREE.DoubleSide,
  });
  const hpBg = new THREE.Mesh(hpBgGeo, hpBgMat);
  hpBg.position.set(0, 2.75, 0);
  group.add(hpBg);

  const hpFillGeo = new THREE.PlaneGeometry(0.86, 0.07);
  const hpFillMat = new THREE.MeshBasicMaterial({
    color: variant === 'brute' ? 0x10b981 : 0xef4444,
    side: THREE.DoubleSide,
  });
  const hpBarFill = new THREE.Mesh(hpFillGeo, hpFillMat);
  hpBarFill.position.set(0, 2.75, 0.01);
  group.add(hpBarFill);

  const maxHp = variant === 'brute' ? 210 : variant === 'runner' ? 65 : 95;
  const speed = variant === 'runner' ? 6.2 : variant === 'brute' ? 3.2 : 4.3;
  const damage = variant === 'brute' ? 24 : variant === 'runner' ? 12 : 15;

  return {
    id,
    variant,
    group,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    hpBarFill,
    hp: maxHp,
    maxHp,
    speed,
    damage,
    freezeTimer: 0,
    attackCooldown: 0,
    groanTimer: 2 + Math.random() * 6,
    knockbackVel: new THREE.Vector3(),
  };
}

export function createNPCRig(npc: NPCConfig): THREE.Group {
  const group = new THREE.Group();
  group.position.set(npc.x, 0, npc.z);

  const torsoMat = createCelMaterial(npc.coatColor);
  const torso = createCelMesh(new THREE.BoxGeometry(0.75, 1.15, 0.45), torsoMat, 0.04);
  torso.position.y = 1.25;
  group.add(torso);

  const headMat = createCelMaterial(0xfde6cd);
  const head = createCelMesh(new THREE.SphereGeometry(0.33, 14, 14), headMat, 0.04);
  head.position.y = 2.12;
  group.add(head);

  const hairMat = createCelMaterial(npc.hairColor);
  const hair = createCelMesh(
    new THREE.SphereGeometry(0.36, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
    hairMat,
    0.04
  );
  hair.position.y = 2.17;
  group.add(hair);

  // Quest / Dialogue Floating Diamond Marker above NPC
  const markerGeo = new THREE.OctahedronGeometry(0.24, 0);
  const markerMat = createCelMaterial(npc.accentColor, {
    emissive: npc.accentColor,
    emissiveIntensity: 0.9,
  });
  const marker = createCelMesh(markerGeo, markerMat, 0.05);
  marker.position.y = 3.05;
  marker.name = 'npc_marker';
  group.add(marker);

  // Safe zone ring around NPC
  const ringGeo = new THREE.RingGeometry(1.4, 1.55, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: npc.accentColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  return group;
}

export interface VehicleRig {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  headlightLeft: THREE.SpotLight;
  headlightRight: THREE.SpotLight;
  beacon: THREE.Mesh;
}

export function createVehicleRig(x: number, z: number): VehicleRig {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Armored SUV Chassis
  const chassisGeo = new THREE.BoxGeometry(2.6, 1.05, 4.4);
  const chassisMat = createCelMaterial(0x1e293b);
  const chassis = createCelMesh(chassisGeo, chassisMat, 0.035);
  chassis.position.y = 0.95;
  group.add(chassis);

  // Cabin & Armored Windshield
  const cabinGeo = new THREE.BoxGeometry(2.3, 0.85, 2.4);
  const cabinMat = createCelMaterial(0x334155);
  const cabin = createCelMesh(cabinGeo, cabinMat, 0.035);
  cabin.position.set(0, 1.8, -0.2);
  group.add(cabin);

  const glassGeo = new THREE.BoxGeometry(2.15, 0.65, 2.45);
  const glassMat = createCelMaterial(0x38bdf8, {
    emissive: 0x0284c7,
    emissiveIntensity: 0.45,
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(0, 1.82, -0.2);
  group.add(glass);

  // Front Ram Bullbar
  const ramGeo = new THREE.BoxGeometry(2.8, 0.55, 0.45);
  const ramMat = createCelMaterial(0xf59e0b);
  const ram = createCelMesh(ramGeo, ramMat, 0.04);
  ram.position.set(0, 0.68, 2.3);
  group.add(ram);

  // Roof Beacon
  const beaconGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.25, 12);
  const beaconMat = createCelMaterial(0x38bdf8, {
    emissive: 0x38bdf8,
    emissiveIntensity: 0.9,
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.set(0, 2.35, -0.2);
  group.add(beacon);

  // 4 Wheels
  const wheels: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.42, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = createCelMaterial(0x090d16);

  const wheelPositions = [
    [-1.35, 0.55, 1.45],
    [1.35, 0.55, 1.45],
    [-1.35, 0.55, -1.45],
    [1.35, 0.55, -1.45],
  ];
  wheelPositions.forEach(([wx, wy, wz]) => {
    const w = createCelMesh(wheelGeo, wheelMat, 0.04);
    w.position.set(wx, wy, wz);
    group.add(w);
    wheels.push(w);
  });

  // Headlights
  const headlightLeft = new THREE.SpotLight(0xe0f2fe, 4, 28, Math.PI / 5, 0.4, 1);
  headlightLeft.position.set(-0.9, 1.1, 2.2);
  headlightLeft.target.position.set(-0.9, 0.2, 12);
  group.add(headlightLeft);
  group.add(headlightLeft.target);

  const headlightRight = new THREE.SpotLight(0xe0f2fe, 4, 28, Math.PI / 5, 0.4, 1);
  headlightRight.position.set(0.9, 1.1, 2.2);
  headlightRight.target.position.set(0.9, 0.2, 12);
  group.add(headlightRight);
  group.add(headlightRight.target);

  return {
    group,
    wheels,
    headlightLeft,
    headlightRight,
    beacon,
  };
}

export interface ObstacleBox {
  x: number;
  z: number;
  radius: number;
}

export function buildZoneEnvironment(zoneId: ZoneId): {
  envGroup: THREE.Group;
  obstacles: ObstacleBox[];
  animatedProps: THREE.Object3D[];
} {
  const envGroup = new THREE.Group();
  const obstacles: ObstacleBox[] = [];
  const animatedProps: THREE.Object3D[] = [];

  // Ground Plane with grid lines
  const groundColor =
    zoneId === 'museum' ? 0x334155 : zoneId === 'school' ? 0x3f3f46 : 0x0f172a;
  const groundGeo = new THREE.PlaneGeometry(130, 130);
  const groundMat = createCelMaterial(groundColor);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  envGroup.add(ground);

  const gridHelper = new THREE.GridHelper(
    130,
    65,
    zoneId === 'laboratory' ? 0x10b981 : zoneId === 'museum' ? 0xf59e0b : 0xf43f5e,
    0x1e293b
  );
  gridHelper.position.y = 0.02;
  (gridHelper.material as THREE.Material).opacity = 0.28;
  (gridHelper.material as THREE.Material).transparent = true;
  envGroup.add(gridHelper);

  if (zoneId === 'museum') {
    // 1. GRAND MUSEUM: Marble colonnades, golden relic centerpiece, velvet barriers
    const mosaicGeo = new THREE.RingGeometry(4.5, 6.2, 32);
    const mosaicMat = createCelMaterial(0xf59e0b, {
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
    });
    const mosaic = new THREE.Mesh(mosaicGeo, mosaicMat);
    mosaic.rotation.x = -Math.PI / 2;
    mosaic.position.y = 0.03;
    envGroup.add(mosaic);

    // Central Dinosaur / Ancient Relic Pedestal
    const pedGeo = new THREE.CylinderGeometry(2.6, 3.1, 1.4, 16);
    const pedMat = createCelMaterial(0xf8fafc);
    const pedestal = createCelMesh(pedGeo, pedMat, 0.03);
    pedestal.position.set(0, 0.7, -10);
    envGroup.add(pedestal);
    obstacles.push({ x: 0, z: -10, radius: 3.1 });

    // Floating Golden Relic Torus Knot
    const relicGeo = new THREE.TorusKnotGeometry(1.15, 0.32, 64, 12);
    const relicMat = createCelMaterial(0xfacc15, {
      emissive: 0xf59e0b,
      emissiveIntensity: 0.65,
    });
    const relic = createCelMesh(relicGeo, relicMat, 0.04);
    relic.position.set(0, 3.1, -10);
    envGroup.add(relic);
    animatedProps.push(relic);

    // 8 Marble Columns
    const colPositions = [
      [-14, -18],
      [14, -18],
      [-14, -4],
      [14, -4],
      [-14, 10],
      [14, 10],
      [-26, -10],
      [26, -10],
    ];
    const colGeo = new THREE.CylinderGeometry(1.1, 1.25, 7.5, 16);
    const colMat = createCelMaterial(0xe2e8f0);
    colPositions.forEach(([cx, cz]) => {
      const col = createCelMesh(colGeo, colMat, 0.03);
      col.position.set(cx, 3.75, cz);
      envGroup.add(col);
      obstacles.push({ x: cx, z: cz, radius: 1.5 });
    });
  } else if (zoneId === 'school') {
    // 2. HIGH SCHOOL ACADEMY: Main school pavilion, clock tower, overturned buses, sakura trees
    const mainBldgGeo = new THREE.BoxGeometry(26, 9, 8);
    const mainBldgMat = createCelMaterial(0xfef3c7);
    const mainBldg = createCelMesh(mainBldgGeo, mainBldgMat, 0.025);
    mainBldg.position.set(0, 4.5, -26);
    envGroup.add(mainBldg);
    obstacles.push({ x: 0, z: -26, radius: 6 });

    // School Clock Face
    const clockGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.3, 24);
    clockGeo.rotateX(Math.PI / 2);
    const clockMat = createCelMaterial(0xf43f5e, {
      emissive: 0xf43f5e,
      emissiveIntensity: 0.5,
    });
    const clock = new THREE.Mesh(clockGeo, clockMat);
    clock.position.set(0, 7.2, -21.8);
    envGroup.add(clock);

    // Yellow School Buses as tactical cover
    const busPositions = [
      [-15, 4, 0.3],
      [16, -6, -0.4],
    ];
    busPositions.forEach(([bx, bz, rot]) => {
      const busGeo = new THREE.BoxGeometry(3.2, 2.6, 7.5);
      const busMat = createCelMaterial(0xfacc15);
      const bus = createCelMesh(busGeo, busMat, 0.035);
      bus.position.set(bx, 1.3, bz);
      bus.rotation.y = rot;
      envGroup.add(bus);
      obstacles.push({ x: bx, z: bz, radius: 3.6 });
    });

    // Stylized Sakura / Autumn Trees in courtyard
    const treeCoords = [
      [-10, -12],
      [10, -12],
      [-20, 14],
      [20, 14],
      [-8, 18],
      [12, 16],
    ];
    treeCoords.forEach(([tx, tz]) => {
      const trunk = createCelMesh(
        new THREE.CylinderGeometry(0.45, 0.65, 3.2, 10),
        createCelMaterial(0x78350f),
        0.04
      );
      trunk.position.set(tx, 1.6, tz);
      envGroup.add(trunk);

      const crown = createCelMesh(
        new THREE.DodecahedronGeometry(2.4, 1),
        createCelMaterial(0xfb7185, {
          emissive: 0xe11d48,
          emissiveIntensity: 0.2,
        }),
        0.035
      );
      crown.position.set(tx, 4.2, tz);
      envGroup.add(crown);
      obstacles.push({ x: tx, z: tz, radius: 1.2 });
    });
  } else {
    // 3. ABANDONED LABORATORY "OMEGA-7": Glowing emerald stasis pods, central reactor core
    const reactorBase = createCelMesh(
      new THREE.CylinderGeometry(3.5, 4.0, 1.2, 24),
      createCelMaterial(0x1e293b),
      0.03
    );
    reactorBase.position.set(0, 0.6, -12);
    envGroup.add(reactorBase);
    obstacles.push({ x: 0, z: -12, radius: 3.8 });

    const reactorCore = createCelMesh(
      new THREE.OctahedronGeometry(1.8, 1),
      createCelMaterial(0x10b981, {
        emissive: 0x10b981,
        emissiveIntensity: 0.95,
      }),
      0.04
    );
    reactorCore.position.set(0, 3.4, -12);
    envGroup.add(reactorCore);
    animatedProps.push(reactorCore);

    // 6 Glowing Stasis Cryo-Pods
    const podCoords = [
      [-14, -16],
      [14, -16],
      [-16, -2],
      [16, -2],
      [-14, 12],
      [14, 12],
    ];
    podCoords.forEach(([px, pz]) => {
      const podBase = createCelMesh(
        new THREE.CylinderGeometry(1.4, 1.5, 0.6, 16),
        createCelMaterial(0x334155),
        0.04
      );
      podBase.position.set(px, 0.3, pz);
      envGroup.add(podBase);

      const podGlass = new THREE.Mesh(
        new THREE.CylinderGeometry(1.25, 1.25, 4.2, 16),
        createCelMaterial(0x10b981, {
          emissive: 0x059669,
          emissiveIntensity: 0.65,
          transparent: true,
          opacity: 0.72,
        })
      );
      podGlass.position.set(px, 2.7, pz);
      envGroup.add(podGlass);

      const podCap = createCelMesh(
        new THREE.CylinderGeometry(1.4, 1.4, 0.5, 16),
        createCelMaterial(0x334155),
        0.04
      );
      podCap.position.set(px, 5.0, pz);
      envGroup.add(podCap);

      obstacles.push({ x: px, z: pz, radius: 1.6 });
    });
  }

  return { envGroup, obstacles, animatedProps };
}
