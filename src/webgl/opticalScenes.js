import * as THREE from 'three';
import {
  buildOpticalWandElement,
  buildPrismMonolith,
  createBrushedTitaniumTextures,
} from './studioPbrFactory.js';

function disposeTree(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
}

function createStudioTableShader({ isHero = false }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uIsHero: { value: isHero ? 1.0 : 0.0 },
      uAmber: { value: 0.0 },
      uStreak: { value: 0.0 },
      uMist: { value: 0.0 },
      uWandOnTable: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
    },
    vertexShader: `
      varying vec2 vWorldXZ;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldXZ = wp.xz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec2 uPointer;
      uniform float uIsHero;
      uniform float uAmber;
      uniform float uStreak;
      uniform float uMist;
      uniform vec3 uWandOnTable;
      varying vec2 vWorldXZ;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      void main() {
        vec2 p = vWorldXZ;

        // Hero diagonal spotlight pooling brightly across bottom-left (exact Otto s00 chiaroscuro!)
        float heroHorizon = smoothstep(-1.8, 2.4, p.y - p.x * 0.34 + uPointer.x * 0.28);
        float heroLeftPool = exp(-dot((p - vec2(-2.4, 1.35)) * vec2(0.24, 0.26), (p - vec2(-2.4, 1.35)) * vec2(0.24, 0.26))) * 1.25;
        float spotHero = clamp(heroHorizon * (0.42 + heroLeftPool), 0.0, 1.0);

        // Tabletop Studio diagonal bright white/warm-paper spotlight sweep (exact Otto s19!)
        float benchHorizon = smoothstep(-0.85, 1.15, p.y - p.x * 0.22);
        float benchFalloff = clamp(1.10 - length((p - vec2(-0.95, 1.75)) * vec2(0.10, 0.11)), 0.46, 1.04);
        float spotBench = clamp(benchHorizon * benchFalloff, 0.0, 1.0);

        float lit = mix(spotBench, spotHero, uIsHero);
        lit = clamp(lit + uMist * 0.14 * smoothstep(-1.2, 1.4, p.y), 0.0, 1.0);

        vec3 darkSlate = vec3(0.051, 0.063, 0.078); // #0D1014
        vec3 studioLight = mix(vec3(0.90, 0.895, 0.875), vec3(0.77, 0.80, 0.82), uIsHero);
        vec3 col = mix(darkSlate, studioLight, smoothstep(0.01, 0.94, lit));

        // Soft ambient occlusion contact shadows under the 4 PRISM O barrels
        float shadow = 0.0;
        float pitch = mix(0.84, 1.12, uIsHero);
        float baseRad = mix(0.42, 0.56, uIsHero);
        for (int i = 0; i < 4; i++) {
          float bx = (float(i) - 1.5) * pitch;
          vec2 dCore = (p - vec2(bx + 0.08, -0.05)) / vec2(baseRad, baseRad * 0.72);
          shadow = max(shadow, exp(-dot(dCore, dCore) * 1.95) * 0.65);
          vec2 dCast = (p - vec2(bx + 0.65, -0.22)) / vec2(baseRad * 1.8, baseRad * 0.78);
          shadow = max(shadow, exp(-dot(dCast, dCast) * 1.65) * 0.38);
        }

        // Elongated contact shadows under the 3 resting optical wands on foreground table (exact Otto s19!)
        if (uIsHero < 0.5) {
          vec2 w0 = (p - vec2(-2.25, 1.48)) / vec2(0.95, 0.24);
          vec2 w1 = (p - vec2(-0.15, 1.95)) / vec2(0.95, 0.26);
          vec2 w2 = (p - vec2(2.15, 1.62)) / vec2(0.95, 0.24);
          shadow = max(shadow, exp(-dot(w0, w0) * 2.4) * 0.42 * uWandOnTable.x);
          shadow = max(shadow, exp(-dot(w1, w1) * 2.4) * 0.42 * uWandOnTable.y);
          shadow = max(shadow, exp(-dot(w2, w2) * 2.4) * 0.42 * uWandOnTable.z);
        }

        col *= (1.0 - shadow * 0.78);

        // Refined museum-grade optical caustics cast across the pale studio tabletop when elements are inserted!
        if (uIsHero < 0.5) {
          if (uAmber > 0.005) {
            float rayDist = abs((p.y - 0.15) * 0.62 - (p.x + 1.1) * 0.64);
            float forwardMask = smoothstep(-0.2, 2.5, p.y) * smoothstep(-1.6, 2.4, p.x + 1.0);
            float caustic = exp(-rayDist * rayDist * 3.4) * forwardMask * exp(-length(p - vec2(0.25, 1.25)) * 0.38);
            col += vec3(0.86, 0.38, 0.09) * caustic * 0.38 * uAmber;
          }
          if (uStreak > 0.005) {
            float streakBand = exp(-pow(p.y - 0.88, 2.0) * 18.0) * exp(-abs(p.x) * 0.24);
            col += vec3(0.32, 0.68, 0.94) * streakBand * 0.34 * uStreak;
          }
          if (uMist > 0.005) {
            float mistHalo = exp(-length(p - vec2(0.55, 1.05)) * 0.62);
            col += vec3(0.95, 0.89, 0.78) * mistHalo * 0.24 * uMist;
          }
        }

        float grain = (hash21(gl_FragCoord.xy + fract(uTime * 0.01)) - 0.5) * 0.038;
        col += grain;

        float backFade = smoothstep(-2.6, -0.45, p.y);
        col = mix(darkSlate, col, backFade);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/**
 * SLOT 1: HERO DARKROOM CHIAROSCURO STAGE (exact Otto s00angled 4-barrel + 3-crystal-tube cascade!)
 */
export function createHeroStudioScene(pointerRef, scrollProgressRef) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 80);

  const keyLight = new THREE.DirectionalLight('#F7FAFE', 2.55);
  keyLight.position.set(-5.6, 6.4, 5.2);
  const rimLight = new THREE.DirectionalLight('#D2E2F5', 1.45);
  rimLight.position.set(5.5, 4.2, -3.5);
  const warmBounce = new THREE.DirectionalLight('#EFE0CE', 0.85);
  warmBounce.position.set(-2.5, -1.2, 4.8);
  const ambLight = new THREE.AmbientLight('#8C98A8', 0.52);
  scene.add(keyLight, rimLight, warmBounce, ambLight);

  const textures = createBrushedTitaniumTextures();

  const floorMat = createStudioTableShader({ isHero: true });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 28), floorMat);
  floor.rotation.x = -Math.PI * 0.5;
  floor.position.set(0, -1.15, 0);
  scene.add(floor);

  const rig = new THREE.Group();
  // Bottom of the barrels sits exactly on the floor; rig tilted so the open jet-black mouths step diagonally.
  rig.position.set(0.18, -1.15 + 1.36, 0.0);
  rig.rotation.set(0.08, -0.34, -0.04);
  scene.add(rig);

  const prism = buildPrismMonolith({
    textures,
    heightScale: 0.95,
    barrelRadius: 0.36,
    steppedHero: true,
  });
  rig.add(prism.group);

  return {
    scene,
    camera,
    onResize: (w, h) => {
      const aspect = Math.max(0.35, w / Math.max(1, h));
      camera.aspect = aspect;
      if (aspect < 0.78) {
        camera.fov = 35;
        camera.position.set(-0.2, 4.6, 11.2);
        camera.lookAt(0.1, 1.6, 0.0);
      } else {
        camera.fov = 25;
        camera.position.set(-0.22, 3.72, 7.55);
        camera.lookAt(-0.08, 1.44, 0.0);
      }
      camera.updateProjectionMatrix();
    },
    onUpdate: (dt, elapsed, reducedMotion) => {
      const px = pointerRef?.current?.x ?? 0;
      const py = pointerRef?.current?.y ?? 0;
      const sp = scrollProgressRef?.current ?? 0;

      floorMat.uniforms.uTime.value = reducedMotion ? 0 : elapsed;
      floorMat.uniforms.uPointer.value.set(px, py);

      for (const gm of prism.glassMaterials) {
        gm.uniforms.uTime.value = reducedMotion ? 0 : elapsed;
        gm.uniforms.uPointer.value.set(px, py);
      }

      // Subtle upward parallax rise as Story paper curtain wipes up over Hero (exact Otto s01!)
      rig.position.y = -1.15 + 1.36 + sp * 0.5;

      if (reducedMotion) {
        rig.rotation.y = -0.34;
        return;
      }

      const targetRotY = -0.34 + px * 0.12 + sp * 0.14 + Math.sin(elapsed * 0.35) * 0.018;
      const targetRotX = 0.08 + py * 0.03;
      rig.rotation.y += (targetRotY - rig.rotation.y) * Math.min(1, dt * 4.0);
      rig.rotation.x += (targetRotX - rig.rotation.x) * Math.min(1, dt * 4.0);

      const targetLightX = -5.6 + px * 3.2;
      keyLight.position.x += (targetLightX - keyLight.position.x) * Math.min(1, dt * 4.5);
    },
    onDispose: () => {
      textures.roughnessMap.dispose();
      textures.bumpMap.dispose();
      disposeTree(scene);
    },
  };
}

/**
 * SLOT 2: PURE MUSEUM CHIAROSCURO TABLETOP COMPOSER (exact Otto s19 bouquet-before / bouquet-after!)
 * - 4-barrel PRISM O (III) standing center on diagonal spotlighted white cyclorama
 * - Subtle dark ghostly unlit silhouette stems hovering dimly above barrels before insertion
 * - 3 jewel-tipped optical wands resting naturally on the lit foreground tabletop; clicking lifts & inserts each wand INTO the barrel!
 */
export function createFilterBenchStudioScene(benchStateRef) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(25, 1, 0.1, 80);

  const keyLight = new THREE.DirectionalLight('#F6F8FB', 2.45);
  keyLight.position.set(-5.8, 6.8, 4.8);
  const fillLight = new THREE.DirectionalLight('#DCE4EE', 1.35);
  fillLight.position.set(5.4, 3.4, 3.8);
  const rimLight = new THREE.DirectionalLight('#D0DCEB', 1.15);
  rimLight.position.set(0.5, 4.5, -5.0);
  const amberKey = new THREE.PointLight('#D96B27', 0.0, 9.5);
  amberKey.position.set(-0.9, 1.15, 1.2);
  const cyanKey = new THREE.PointLight('#6BC4F5', 0.0, 9.5);
  cyanKey.position.set(-0.2, 1.25, 1.35);
  const mistKey = new THREE.PointLight('#F4E8D4', 0.0, 9.5);
  mistKey.position.set(0.9, 1.2, 1.2);
  const ambLight = new THREE.AmbientLight('#8A95A5', 0.62);
  scene.add(keyLight, fillLight, rimLight, amberKey, cyanKey, mistKey, ambLight);

  const textures = createBrushedTitaniumTextures();

  const tableMat = createStudioTableShader({ isHero: false });
  const table = new THREE.Mesh(new THREE.PlaneGeometry(36, 24), tableMat);
  table.rotation.x = -Math.PI * 0.5;
  table.position.set(0, -1.16, 0);
  scene.add(table);

  const prism = buildPrismMonolith({
    textures,
    heightScale: 0.68,
    barrelRadius: 0.32,
    steppedHero: false,
  });
  prism.group.position.set(0, -1.16 + prism.H * 0.5, -0.08);
  scene.add(prism.group);

  const barrelTopY = -1.16 + prism.H;

  // Subtle dark silhouette preview outlines emerging dimly above barrels (exact Otto bouquet-before dark stems!)
  const ghostMat = new THREE.MeshBasicMaterial({
    color: '#1A1F26',
    transparent: true,
    opacity: 0.55,
  });
  const ghostSlots = [0, 1, 3];
  const ghostGroups = ghostSlots.map((bIdx, i) => {
    const g = new THREE.Group();
    g.position.set(prism.barrelXs[bIdx], barrelTopY + 0.35 + (i === 1 ? 0.24 : 0), -0.12);
    g.rotation.z = i === 0 ? 0.22 : i === 2 ? -0.22 : -0.05;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.95, 8), ghostMat);
    g.add(stem);
    for (let k = -1; k <= 1; k++) {
      const disc = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.12, 18), ghostMat);
      disc.position.set(k * 0.16, 0.34 + Math.abs(k) * -0.12, 0);
      g.add(disc);
    }
    scene.add(g);
    return g;
  });

  // 3 Clickable Optical Prism Wands resting horizontally on the lit foreground tabletop, slotting upright into barrels 0, 1, 3!
  const wandConfigs = [
    {
      id: 'amber',
      variant: 0,
      restPos: new THREE.Vector3(-2.35, -1.07, 1.48),
      restRot: new THREE.Euler(Math.PI * 0.48, 0.08, -1.25),
      mountPos: new THREE.Vector3(prism.barrelXs[0], barrelTopY + 0.26, -0.08),
      mountRot: new THREE.Euler(0.08, 0.2, 0.24),
      glassColor: '#F28B30',
      rimAccent: '#D96B27',
    },
    {
      id: 'anamorphic',
      variant: 1,
      restPos: new THREE.Vector3(-0.08, -1.07, 1.95),
      restRot: new THREE.Euler(Math.PI * 0.48, -0.06, -1.85),
      mountPos: new THREE.Vector3(prism.barrelXs[1], barrelTopY + 0.44, -0.08),
      mountRot: new THREE.Euler(0.05, -0.15, 0.04),
      glassColor: '#8ED4FA',
      rimAccent: '#6EC8F5',
    },
    {
      id: 'mist',
      variant: 2,
      restPos: new THREE.Vector3(2.22, -1.07, 1.62),
      restRot: new THREE.Euler(Math.PI * 0.48, 0.12, 1.18),
      mountPos: new THREE.Vector3(prism.barrelXs[3], barrelTopY + 0.28, -0.08),
      mountRot: new THREE.Euler(0.08, -0.22, -0.24),
      glassColor: '#F7EFE2',
      rimAccent: '#DFD4C3',
    },
  ];

  const wandMeshes = wandConfigs.map((cfg) => {
    const wand = buildOpticalWandElement({
      textures,
      glassColor: cfg.glassColor,
      rimAccent: cfg.rimAccent,
      variant: cfg.variant,
    });
    wand.group.position.copy(cfg.restPos);
    wand.group.rotation.copy(cfg.restRot);
    scene.add(wand.group);
    return { ...cfg, ...wand, progress: 0, restX: cfg.restPos.x };
  });

  return {
    scene,
    camera,
    onResize: (w, h) => {
      const aspect = Math.max(0.35, w / Math.max(1, h));
      camera.aspect = aspect;
      const xScale = aspect < 0.85 ? 0.5 : 1;
      wandMeshes.forEach((wm) => {
        wm.restPos.x = wm.restX * xScale;
      });
      if (aspect < 0.85) {
        camera.fov = 38;
        camera.position.set(0.0, 2.45, 11.2);
        camera.lookAt(0.0, -0.08, 0.45);
      } else {
        camera.fov = 25;
        camera.position.set(0.0, 2.28, 10.25);
        camera.lookAt(0.0, -0.06, 0.48);
      }
      camera.updateProjectionMatrix();
    },
    onUpdate: (dt, elapsed, reducedMotion) => {
      const mounted = benchStateRef?.current?.mounted || {};
      const hoveredId = benchStateRef?.current?.hoveredId || null;
      const lerpSpeed = reducedMotion ? 1.0 : Math.min(1, dt * 5.6);

      wandMeshes.forEach((wm, idx) => {
        const isMounted = Boolean(mounted[wm.id]);
        const targetP = isMounted ? 1.0 : 0.0;
        wm.progress += (targetP - wm.progress) * lerpSpeed;

        const p = wm.progress;
        const smoothP = p * p * (3 - 2 * p);
        // High graceful parabolic lift over the rim before descending into the open optical bore!
        const arcLift = Math.sin(smoothP * Math.PI) * 1.35;
        const hoverLift = !isMounted && hoveredId === wm.id ? 0.07 : 0.0;

        wm.group.position.lerpVectors(wm.restPos, wm.mountPos, smoothP);
        wm.group.position.y += arcLift + hoverLift;

        if (isMounted && !reducedMotion) {
          wm.group.rotation.z =
            wm.mountRot.z + Math.sin(elapsed * 1.3 + idx * 1.4) * 0.022;
        } else {
          wm.group.rotation.z = THREE.MathUtils.lerp(wm.restRot.z, wm.mountRot.z, smoothP);
        }

        wm.group.rotation.x = THREE.MathUtils.lerp(wm.restRot.x, wm.mountRot.x, smoothP);
        wm.group.rotation.y = THREE.MathUtils.lerp(wm.restRot.y, wm.mountRot.y, smoothP);

        if (ghostGroups[idx]) {
          ghostGroups[idx].visible = p < 0.65;
        }
      });

      const pAmber = wandMeshes[0].progress;
      const pStreak = wandMeshes[1].progress;
      const pMist = wandMeshes[2].progress;

      tableMat.uniforms.uTime.value = reducedMotion ? 0 : elapsed;
      tableMat.uniforms.uAmber.value = pAmber;
      tableMat.uniforms.uStreak.value = pStreak;
      tableMat.uniforms.uMist.value = pMist;
      tableMat.uniforms.uWandOnTable.value.set(1.0 - pAmber, 1.0 - pStreak, 1.0 - pMist);

      amberKey.intensity = pAmber * 5.8;
      cyanKey.intensity = pStreak * 5.4;
      mistKey.intensity = pMist * 4.2;

      prism.glassMaterials[0].uniforms.uAccentMix.value = 0.14 + pAmber * 0.72;
      prism.glassMaterials[1].uniforms.uAccentMix.value = 0.14 + pStreak * 0.68;
      prism.glassMaterials[1].uniforms.uAccent.value.set(pStreak > 0.2 ? '#72C8FA' : '#D96B27');
      prism.glassMaterials[3].uniforms.uAccentMix.value = 0.14 + pMist * 0.65;
      prism.glassMaterials[3].uniforms.uAccent.value.set(pMist > 0.2 ? '#F5E8D0' : '#A6BCD4');
    },
    onDispose: () => {
      textures.roughnessMap.dispose();
      textures.bumpMap.dispose();
      disposeTree(scene);
    },
  };
}
