import * as THREE from 'three';
import {
  buildOpticalFilterCell,
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

/**
 * Custom GLSL photographic studio cyclorama floor shader (vec2 p = world XZ where p.x = X, p.y = Z):
 * - Dramatic diagonal photographic spotlight pool across the darkroom studio floor (Hero)
 * - Luminous pale matte studio tabletop melting cleanly into #0D1014 darkroom wall (Filter Bench)
 * - Soft ambient occlusion contact shadows beneath barrels & resting filters
 * - Live dynamic refractive spectral caustics (Amber Dichroic, Anamorphic Streak, Frosted Mist)
 * - Subtle monochrome analog film grain for zero gradient banding
 */
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
      uFilterOnTable: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
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
      uniform vec3 uFilterOnTable;
      varying vec2 vWorldXZ;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      void main() {
        // p.x = world X, p.y = world Z (positive toward viewer foreground)
        vec2 p = vWorldXZ;

        // Hero diagonal spotlight pooling brightly across bottom-left & softly across bottom-right (matching Otto Hero)
        float heroHorizon = smoothstep(-2.4, 2.2, p.y - p.x * 0.28 + uPointer.x * 0.35);
        float heroLeftPool = exp(-dot((p - vec2(-2.0, 1.2)) * vec2(0.24, 0.26), (p - vec2(-2.0, 1.2)) * vec2(0.24, 0.26))) * 1.15;
        float heroRightPool = exp(-dot((p - vec2(2.3, 1.3)) * vec2(0.28, 0.30), (p - vec2(2.3, 1.3)) * vec2(0.28, 0.30))) * 0.65;
        float spotHero = clamp(heroHorizon * (0.48 + heroLeftPool + heroRightPool), 0.0, 1.0);

        // Bench luminous diagonal studio tabletop melting smoothly into pitch dark wall behind barrels
        float benchHorizon = smoothstep(-0.95, 1.25, p.y - p.x * 0.16);
        float benchFalloff = clamp(1.06 - length((p - vec2(-0.85, 1.65)) * vec2(0.11, 0.12)), 0.42, 1.04);
        float spotBench = clamp(benchHorizon * benchFalloff, 0.0, 1.0);

        float lit = mix(spotBench, spotHero, uIsHero);
        lit = clamp(lit + uMist * 0.16 * smoothstep(-1.4, 1.4, p.y), 0.0, 1.0);

        vec3 darkSlate = vec3(0.051, 0.063, 0.078); // #0D1014
        vec3 studioLight = mix(vec3(0.86, 0.872, 0.858), vec3(0.76, 0.79, 0.815), uIsHero);
        vec3 col = mix(darkSlate, studioLight, smoothstep(0.01, 0.94, lit));

        // Realistic soft ambient occlusion contact shadows under the 3 PRISM O titanium barrels
        float shadow = 0.0;
        float bxStep = mix(0.80, 1.06, uIsHero);
        float baseRad = mix(0.46, 0.58, uIsHero);
        for (int i = -1; i <= 1; i++) {
          float bx = float(i) * bxStep;
          vec2 dCore = (p - vec2(bx + 0.08, -0.05)) / vec2(baseRad, baseRad * 0.72);
          shadow = max(shadow, exp(-dot(dCore, dCore) * 1.85) * 0.62);
          vec2 dCast = (p - vec2(bx + 0.56, -0.28)) / vec2(baseRad * 1.65, baseRad * 0.85);
          shadow = max(shadow, exp(-dot(dCast, dCast) * 1.55) * 0.36);
        }

        // Contact shadows for resting filters on foreground tabletop (fade cleanly as each filter lifts!)
        if (uIsHero < 0.5) {
          vec2 f0 = (p - vec2(-2.35, 1.68)) / vec2(0.56, 0.38);
          vec2 f1 = (p - vec2(0.0, 1.92)) / vec2(0.56, 0.38);
          vec2 f2 = (p - vec2(2.35, 1.68)) / vec2(0.56, 0.38);
          shadow = max(shadow, exp(-dot(f0, f0) * 2.15) * 0.42 * uFilterOnTable.x);
          shadow = max(shadow, exp(-dot(f1, f1) * 2.15) * 0.42 * uFilterOnTable.y);
          shadow = max(shadow, exp(-dot(f2, f2) * 2.15) * 0.42 * uFilterOnTable.z);
        }

        col *= (1.0 - shadow * 0.76);

        // Live optical caustic refractions cast directly across the pale lit tabletop!
        if (uIsHero < 0.5) {
          // 1) Amber Dichroic warm golden-amber caustic beam sweeping diagonally across table
          if (uAmber > 0.005) {
            float rayDist = abs((p.y - 0.1) * 0.62 - (p.x + 0.8) * 0.64);
            float forwardMask = smoothstep(-0.3, 2.5, p.y) * smoothstep(-1.4, 2.6, p.x + 0.8);
            float caustic = exp(-rayDist * rayDist * 2.8) * forwardMask * exp(-length(p - vec2(0.45, 1.25)) * 0.35);
            float rimArc = exp(-pow(length(p - vec2(-0.55, 0.95)) - 1.38, 2.0) * 12.0) * smoothstep(-0.1, 1.6, p.y);
            col += vec3(0.88, 0.38, 0.08) * (caustic * 0.42 + rimArc * 0.28) * uAmber;
          }

          // 2) Anamorphic Streak cool-sapphire horizontal caustic stripe across table foreground
          if (uStreak > 0.005) {
            float streakBand = exp(-pow(p.y - 0.82, 2.0) * 14.0) * exp(-abs(p.x) * 0.24);
            float streakCore = exp(-pow(p.y - 0.82, 2.0) * 72.0) * exp(-abs(p.x) * 0.15);
            col += vec3(0.30, 0.68, 0.94) * (streakBand * 0.38 + streakCore * 0.44) * uStreak;
          }

          // 3) Frosted Mist warm pearl soft diffusion bloom on table around lens base
          if (uMist > 0.005) {
            float mistHalo = exp(-length(p - vec2(0.25, 0.95)) * 0.58);
            col += vec3(0.95, 0.89, 0.78) * mistHalo * 0.28 * uMist;
          }
        }

        // Authentic monochrome studio film grain
        float grain = (hash21(gl_FragCoord.xy + fract(uTime * 0.01)) - 0.5) * 0.036;
        col += grain;

        // Melt far back edge seamlessly into #0D1014 darkroom wall
        float backFade = smoothstep(-2.8, -0.55, p.y);
        col = mix(darkSlate, col, backFade);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/**
 * Additive translucent optical beam plane used on the Interactive Tabletop Bench
 * to render live spectral flares & horizontal anamorphic streaks emerging from mounted filters.
 */
function createRefractionFlareMaterial(colorHex) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uIntensity: { value: 0.0 },
      uTime: { value: 0.0 },
      uSharpness: { value: 12.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uTime;
      uniform float uSharpness;
      varying vec2 vUv;
      void main() {
        float yDist = abs(vUv.y - 0.5) * 2.0;
        float xDist = abs(vUv.x - 0.5) * 2.0;
        float core = exp(-yDist * yDist * uSharpness) * (1.0 - smoothstep(0.08, 1.0, xDist));
        float halo = exp(-yDist * yDist * 2.6) * (1.0 - smoothstep(0.0, 1.0, xDist)) * 0.34;
        float shimmer = 0.93 + 0.07 * sin(uTime * 1.4 + vUv.x * 5.0);
        float alpha = (core + halo) * shimmer * uIntensity;
        gl_FragColor = vec4(uColor * (1.05 + core * 0.45), clamp(alpha, 0.0, 0.92));
      }
    `,
  });
}

/**
 * SLOT 1: HERO DARKROOM CHIAROSCURO STAGE
 * Monumental brushed-titanium PRISM O (III) sculpture rising cleanly out of the bottom 52%
 * over a luminous diagonal studio spotlight floor pool, leaving serene dark air behind the header.
 */
export function createHeroStudioScene(pointerRef) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 80);

  const keyLight = new THREE.DirectionalLight('#F6F8FB', 2.45);
  keyLight.position.set(-5.2, 6.8, 5.0);
  const rimLight = new THREE.DirectionalLight('#D2E2F5', 1.55);
  rimLight.position.set(5.5, 4.0, -3.5);
  const warmBounce = new THREE.DirectionalLight('#F2DAC2', 0.9);
  warmBounce.position.set(3.2, -1.5, 4.8);
  const ambLight = new THREE.AmbientLight('#8C98A8', 0.58);
  scene.add(keyLight, rimLight, warmBounce, ambLight);

  const textures = createBrushedTitaniumTextures();

  // Dramatic diagonal studio spotlight floor positioned cleanly in Hero's lower chiaroscuro horizon
  const floorMat = createStudioTableShader({ isHero: true });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(38, 28), floorMat);
  floor.rotation.x = -Math.PI * 0.5;
  floor.position.set(0, -0.78, 0);
  scene.add(floor);

  const rig = new THREE.Group();
  rig.position.set(0.04, 0.18, 0.0);
  rig.rotation.set(0.0, -0.18, 0.0);
  scene.add(rig);

  const prism = buildPrismMonolith({ textures, heightScale: 1.0, barrelRadius: 0.49 });
  rig.add(prism.group);

  return {
    scene,
    camera,
    onResize: (w, h) => {
      const aspect = Math.max(0.35, w / Math.max(1, h));
      camera.aspect = aspect;
      if (aspect < 0.78) {
        // Mobile 390px framing: all 3 brushed barrels sit gracefully in bottom 56% over glowing spotlight floor!
        camera.fov = 34;
        camera.position.set(0.22, 3.25, 9.6);
        camera.lookAt(0.02, 1.12, 0.0);
      } else {
        // Desktop 1440px framing: gleaming barrels + dramatic diagonal floor spotlight in bottom 54%
        camera.fov = 26;
        camera.position.set(0.32, 3.15, 7.95);
        camera.lookAt(0.02, 1.34, 0.0);
      }
      camera.updateProjectionMatrix();
    },
    onUpdate: (dt, elapsed, reducedMotion) => {
      const px = pointerRef?.current?.x ?? 0;
      const py = pointerRef?.current?.y ?? 0;

      floorMat.uniforms.uTime.value = reducedMotion ? 0 : elapsed;
      floorMat.uniforms.uPointer.value.set(px, py);

      for (const gm of prism.glassMaterials) {
        gm.uniforms.uTime.value = reducedMotion ? 0 : elapsed;
        gm.uniforms.uPointer.value.set(px, py);
      }

      if (reducedMotion) {
        rig.rotation.y = -0.18;
        keyLight.position.set(-5.2, 6.8, 5.0);
        return;
      }

      const targetRotY = -0.18 + px * 0.11 + Math.sin(elapsed * 0.35) * 0.02;
      const targetRotX = py * 0.03;
      rig.rotation.y += (targetRotY - rig.rotation.y) * Math.min(1, dt * 3.8);
      rig.rotation.x += (targetRotX - rig.rotation.x) * Math.min(1, dt * 3.8);

      const targetLightX = -5.2 + px * 3.4;
      keyLight.position.x += (targetLightX - keyLight.position.x) * Math.min(1, dt * 4.5);
    },
    onDispose: () => {
      textures.roughnessMap.dispose();
      textures.bumpMap.dispose();
      textures.knurlBumpMap.dispose();
      disposeTree(scene);
    },
  };
}

/**
 * SLOT 2: SIGNATURE INTERACTIVE TABLETOP FILTER STUDIO ("CLICK A FILTER · BEND THE BEAM")
 * Recreates Otto's chiaroscuro tabletop studio atmosphere with ZERO sad-face WebGL boxes:
 * Central gleaming brushed-titanium PRISM O (III) standing on a luminous pale spotlighted tabletop,
 * flanked by 3 resting titanium optical filters that lift cleanly into the optical bay on click!
 */
export function createFilterBenchStudioScene(benchStateRef) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 80);

  const keyLight = new THREE.DirectionalLight('#F6F8FB', 2.35);
  keyLight.position.set(-5.6, 6.8, 4.6);
  const fillLight = new THREE.DirectionalLight('#DCE4EE', 1.4);
  fillLight.position.set(5.4, 3.4, 3.8);
  const rimLight = new THREE.DirectionalLight('#D0DCEB', 1.2);
  rimLight.position.set(0.5, 4.5, -5.0);
  const amberKey = new THREE.PointLight('#D96B27', 0.0, 9.5);
  amberKey.position.set(-0.75, 1.15, 1.2);
  const cyanKey = new THREE.PointLight('#6BC4F5', 0.0, 9.5);
  cyanKey.position.set(0.0, 1.2, 1.35);
  const mistKey = new THREE.PointLight('#F4E8D4', 0.0, 9.5);
  mistKey.position.set(0.8, 1.25, 1.2);
  const ambLight = new THREE.AmbientLight('#8A95A5', 0.65);
  scene.add(keyLight, fillLight, rimLight, amberKey, cyanKey, mistKey, ambLight);

  const textures = createBrushedTitaniumTextures();

  // Luminous pale studio tabletop melting cleanly into #0D1014 darkroom backdrop
  const tableMat = createStudioTableShader({ isHero: false });
  const table = new THREE.Mesh(new THREE.PlaneGeometry(36, 24), tableMat);
  table.rotation.x = -Math.PI * 0.5;
  table.position.set(0, -1.12, 0);
  scene.add(table);

  // Refined centered PRISM O (III) sculpture leaving generous negative space for the 4-col horizon strip
  const prism = buildPrismMonolith({ textures, heightScale: 0.72, barrelRadius: 0.37 });
  prism.group.position.set(0, -1.12 + prism.H * 0.5, -0.05);
  scene.add(prism.group);

  const barrelTopY = -1.12 + prism.H + 0.06;

  // 3 physical optical glass filters resting cleanly across the lit foreground studio tabletop
  const filterConfigs = [
    {
      id: 'amber',
      restPos: new THREE.Vector3(-2.35, -1.06, 1.68),
      restRot: new THREE.Euler(0.0, 0.24, 0.0),
      mountPos: new THREE.Vector3(-prism.spacing, barrelTopY + 0.24, -0.04),
      mountRot: new THREE.Euler(0.58, 0.12, -0.18),
      glassColor: '#E87A30',
      rimAccent: '#D96B27',
      streakRibs: false,
    },
    {
      id: 'anamorphic',
      restPos: new THREE.Vector3(0.0, -1.06, 1.92),
      restRot: new THREE.Euler(0.0, -0.15, 0.0),
      mountPos: new THREE.Vector3(0.0, barrelTopY + 0.32, -0.04),
      mountRot: new THREE.Euler(0.68, 0.0, 0.0),
      glassColor: '#7AC7F2',
      rimAccent: '#6EC8F5',
      streakRibs: true,
    },
    {
      id: 'mist',
      restPos: new THREE.Vector3(2.35, -1.06, 1.68),
      restRot: new THREE.Euler(0.0, -0.28, 0.0),
      mountPos: new THREE.Vector3(prism.spacing, barrelTopY + 0.24, -0.04),
      mountRot: new THREE.Euler(0.58, -0.12, 0.18),
      glassColor: '#F3ECE0',
      rimAccent: '#C9BFB0',
      streakRibs: false,
    },
  ];

  const filterMeshes = filterConfigs.map((cfg) => {
    const cell = buildOpticalFilterCell({
      textures,
      glassColor: cfg.glassColor,
      rimAccent: cfg.rimAccent,
      streakRibs: cfg.streakRibs,
    });
    cell.group.scale.setScalar(0.88);
    cell.group.position.copy(cfg.restPos);
    cell.group.rotation.copy(cfg.restRot);
    scene.add(cell.group);
    return { ...cfg, ...cell, progress: 0 };
  });

  // Live additive volumetric optical refraction flares emerging from mounted filters
  const amberFlareMat = createRefractionFlareMaterial('#E8742A');
  amberFlareMat.uniforms.uSharpness.value = 6.5;
  const amberFlare = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.4), amberFlareMat);
  amberFlare.position.set(0.75, barrelTopY + 0.28, 0.24);
  amberFlare.rotation.z = -0.32;
  scene.add(amberFlare);

  const streakFlareMat = createRefractionFlareMaterial('#72C8FA');
  streakFlareMat.uniforms.uSharpness.value = 28.0;
  const streakFlare = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 0.78), streakFlareMat);
  streakFlare.position.set(0.0, barrelTopY + 0.32, 0.36);
  scene.add(streakFlare);

  const mistFlareMat = createRefractionFlareMaterial('#F5E8D0');
  mistFlareMat.uniforms.uSharpness.value = 2.6;
  const mistFlare = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.1), mistFlareMat);
  mistFlare.position.set(prism.spacing * 0.7, barrelTopY + 0.26, 0.28);
  scene.add(mistFlare);

  return {
    scene,
    camera,
    onResize: (w, h) => {
      const aspect = Math.max(0.35, w / Math.max(1, h));
      camera.aspect = aspect;
      if (aspect < 0.85) {
        camera.fov = 38;
        camera.position.set(0.0, 2.55, 11.4);
        camera.lookAt(0.0, -0.05, 0.45);
      } else {
        camera.fov = 25;
        camera.position.set(0.0, 2.38, 10.45);
        camera.lookAt(0.0, -0.02, 0.48);
      }
      camera.updateProjectionMatrix();
    },
    onUpdate: (dt, elapsed, reducedMotion) => {
      const mounted = benchStateRef?.current?.mounted || {};
      const hoveredId = benchStateRef?.current?.hoveredId || null;
      const lerpSpeed = reducedMotion ? 1.0 : Math.min(1, dt * 6.4);

      filterMeshes.forEach((fm, idx) => {
        const isMounted = Boolean(mounted[fm.id]);
        const targetP = isMounted ? 1.0 : 0.0;
        fm.progress += (targetP - fm.progress) * lerpSpeed;

        const p = fm.progress;
        const smoothP = p * p * (3 - 2 * p);
        const arcLift = Math.sin(smoothP * Math.PI) * 1.1;
        const hoverLift = !isMounted && hoveredId === fm.id ? 0.08 : 0.0;

        fm.group.position.lerpVectors(fm.restPos, fm.mountPos, smoothP);
        fm.group.position.y += arcLift + hoverLift;

        const floatY = isMounted && !reducedMotion ? Math.sin(elapsed * 1.6 + idx * 1.2) * 0.02 : 0;
        fm.group.position.y += floatY;

        fm.group.rotation.x = THREE.MathUtils.lerp(fm.restRot.x, fm.mountRot.x, smoothP);
        fm.group.rotation.y = THREE.MathUtils.lerp(fm.restRot.y, fm.mountRot.y, smoothP);
        fm.group.rotation.z = THREE.MathUtils.lerp(fm.restRot.z, fm.mountRot.z, smoothP);
      });

      const pAmber = filterMeshes[0].progress;
      const pStreak = filterMeshes[1].progress;
      const pMist = filterMeshes[2].progress;

      tableMat.uniforms.uTime.value = reducedMotion ? 0 : elapsed;
      tableMat.uniforms.uAmber.value = pAmber;
      tableMat.uniforms.uStreak.value = pStreak;
      tableMat.uniforms.uMist.value = pMist;
      tableMat.uniforms.uFilterOnTable.value.set(1.0 - pAmber, 1.0 - pStreak, 1.0 - pMist);

      amberKey.intensity = pAmber * 7.2;
      cyanKey.intensity = pStreak * 6.6;
      mistKey.intensity = pMist * 5.0;

      amberFlareMat.uniforms.uIntensity.value = pAmber * 0.68;
      amberFlareMat.uniforms.uTime.value = reducedMotion ? 0 : elapsed;
      streakFlareMat.uniforms.uIntensity.value = pStreak * 0.9;
      streakFlareMat.uniforms.uTime.value = reducedMotion ? 0 : elapsed;
      mistFlareMat.uniforms.uIntensity.value = pMist * 0.46;
      mistFlareMat.uniforms.uTime.value = reducedMotion ? 0 : elapsed;

      prism.glassMaterials[0].uniforms.uAccentMix.value = 0.16 + pAmber * 0.78;
      prism.glassMaterials[1].uniforms.uAccentMix.value = 0.18 + pStreak * 0.52;
      prism.glassMaterials[1].uniforms.uAccent.value.set(pStreak > 0.2 ? '#72C8FA' : '#D96B27');
      prism.glassMaterials[2].uniforms.uAccentMix.value = 0.16 + pMist * 0.65;
      prism.glassMaterials[2].uniforms.uAccent.value.set(pMist > 0.2 ? '#F5E8D0' : '#A6BCD4');
    },
    onDispose: () => {
      textures.roughnessMap.dispose();
      textures.bumpMap.dispose();
      textures.knurlBumpMap.dispose();
      disposeTree(scene);
    },
  };
}
