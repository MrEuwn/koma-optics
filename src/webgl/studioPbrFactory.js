import * as THREE from 'three';

/**
 * High-resolution procedural satin Grade-5 titanium & optical crystal textures:
 * Fine vertical/anisotropic lathe brushing matching Otto Objects' raw machined steel sheen.
 */
export function createBrushedTitaniumTextures() {
  const size = 512;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d');
  rCtx.fillStyle = '#626262';
  rCtx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const streak = 94 + Math.floor(Math.sin(y * 1.35) * 12 + (Math.random() - 0.5) * 26);
    rCtx.fillStyle = `rgb(${streak},${streak},${streak})`;
    rCtx.fillRect(0, y, size, 1);
  }
  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 36 + Math.random() * 180;
    const v = 76 + Math.floor(Math.random() * 52);
    rCtx.fillStyle = `rgba(${v},${v},${v},0.30)`;
    rCtx.fillRect(x, y, len, 1);
  }

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(4, 2);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    const v = 116 + Math.floor((Math.random() - 0.5) * 28);
    bCtx.fillStyle = `rgb(${v},${v},${v})`;
    bCtx.fillRect(0, y, size, 1);
  }

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 2);

  return { roughnessMap, bumpMap };
}

export function createCrystalCouplerMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mv.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec2 uPointer;
      varying vec3 vNormalView;
      varying vec3 vViewPos;

      void main() {
        vec3 N = normalize(vNormalView);
        if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(vViewPos);
        float ndotv = clamp(dot(N, V), 0.0, 1.0);
        float fresnel = pow(1.0 - ndotv, 2.4);

        // Dual vertical studio softbox specular streaks along cylinder edges (authentic Schott borosilicate tube)
        vec3 L1 = normalize(vec3(-0.68 + uPointer.x * 0.25, 0.35, 0.65));
        vec3 L2 = normalize(vec3(0.62 + uPointer.x * 0.20, 0.28, 0.72));
        float s1 = pow(clamp(dot(N, normalize(L1 + V)), 0.0, 1.0), 72.0);
        float s2 = pow(clamp(dot(N, normalize(L2 + V)), 0.0, 1.0), 48.0);
        float bodyBand = pow(clamp(1.0 - abs(N.x - 0.32) * 2.6, 0.0, 1.0), 3.0);

        vec3 core = vec3(0.08, 0.10, 0.12);
        vec3 rim = vec3(0.84, 0.89, 0.94);
        vec3 col = mix(core, rim, fresnel * 0.82)
          + vec3(0.98, 0.99, 1.0) * (s1 * 1.15 + s2 * 0.68 + bodyBand * 0.22);

        float alpha = clamp(0.34 + fresnel * 0.58 + s1 * 0.55 + s2 * 0.35, 0.0, 0.96);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

export function createOpticalGlassMaterial(tintHex = '#C6D9ED', accentHex = '#D96B27') {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uTint: { value: new THREE.Color(tintHex) },
      uAccent: { value: new THREE.Color(accentHex) },
      uAccentMix: { value: 0.12 },
      uOpacity: { value: 0.94 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mv.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec2 uPointer;
      uniform vec3 uTint;
      uniform vec3 uAccent;
      uniform float uAccentMix;
      uniform float uOpacity;
      varying vec3 vNormalView;
      varying vec3 vViewPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndotv = clamp(dot(N, V), 0.0, 1.0);
        float fresnel = pow(1.0 - ndotv, 3.0);

        vec3 lightDir = normalize(vec3(-0.52 + uPointer.x * 0.42, 0.74 + uPointer.y * 0.25, 0.62));
        vec3 H = normalize(lightDir + V);
        float spec = pow(clamp(dot(N, H), 0.0, 1.0), 96.0);

        vec3 baseGlass = vec3(0.008, 0.010, 0.013);
        vec3 coat = mix(uTint, uAccent, clamp(uAccentMix + fresnel * 0.38, 0.0, 1.0));
        vec3 col = baseGlass + coat * (fresnel * 0.36) + vec3(0.95, 0.97, 1.0) * spec * 0.55;

        gl_FragColor = vec4(col, clamp(0.90 + fresnel * 0.10, 0.0, 1.0) * uOpacity);
      }
    `,
  });
}

/**
 * Builds KOMA PRISM O (III): 4 Sleek Raw Satin-Brushed Grade-5 Titanium Optical Cylinders
 * joined by 3 Recessed Schott Crystal Coupling Tubes with scalloped U-cutouts at the base,
 * echoing Otto Objects' iconic 4-shell + 3-tube architectural monolith!
 */
export function buildPrismMonolith({
  textures,
  heightScale = 1.0,
  barrelRadius = 0.44,
  steppedHero = false,
}) {
  const group = new THREE.Group();
  const glassMaterials = [];

  const titaniumMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#DCE0E4'),
    metalness: 0.91,
    roughness: 0.37,
    roughnessMap: textures.roughnessMap,
    bumpMap: textures.bumpMap,
    bumpScale: 0.0042,
    envMapIntensity: 1.68,
  });

  const darkBaffleMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#030406'),
    metalness: 0.08,
    roughness: 0.96,
    envMapIntensity: 0.03,
  });

  const crystalTubeMat = createCrystalCouplerMaterial();

  const baseH = 2.86 * heightScale;
  const R = barrelRadius;
  const wallT = 0.028;
  const couplerR = R * 0.36;
  // Center-to-center pitch between adjacent barrels so coupler kisses both shells cleanly!
  const pitch = (R + couplerR) * 1.88;
  const barrelXs = [-1.5 * pitch, -0.5 * pitch, 0.5 * pitch, 1.5 * pitch];

  barrelXs.forEach((bx, idx) => {
    // Subtle rhythmic height cascade in angled Hero view, uniform precision height on flat bench
    const hMult = steppedHero ? 1.04 - idx * 0.025 : 1.0;
    const H = baseH * hMult;

    const pts = [
      new THREE.Vector2(0.001, -H * 0.5),
      new THREE.Vector2(R - 0.012, -H * 0.5),
      new THREE.Vector2(R, -H * 0.5 + 0.014),
      new THREE.Vector2(R, H * 0.5 - 0.012),
      new THREE.Vector2(R - 0.008, H * 0.5),
      new THREE.Vector2(R - wallT + 0.006, H * 0.5),
      new THREE.Vector2(R - wallT, H * 0.5 - 0.012),
      new THREE.Vector2(R - wallT, H * 0.5 - 0.85),
    ];
    const barrelGeo = new THREE.LatheGeometry(pts, 72);

    const unit = new THREE.Group();
    // Keep bottom base flush at -baseH * 0.5!
    unit.position.set(bx, (H - baseH) * 0.5, 0);
    group.add(unit);

    unit.add(new THREE.Mesh(barrelGeo, titaniumMat));

    // Deep pitch-black optical velvet interior so the open circular mouths read jet-black like Otto Hero!
    const boreGeo = new THREE.CylinderGeometry(
      R - wallT - 0.002,
      R - wallT - 0.002,
      H * 0.92,
      56,
      1,
      true
    );
    const boreMesh = new THREE.Mesh(boreGeo, darkBaffleMat);
    boreMesh.position.y = 0.04;
    boreMesh.material.side = THREE.BackSide;
    unit.add(boreMesh);

    const baffleFloor = new THREE.Mesh(
      new THREE.CircleGeometry(R - wallT, 56),
      darkBaffleMat
    );
    baffleFloor.rotation.x = -Math.PI * 0.5;
    baffleFloor.position.y = H * 0.5 - 0.52;
    unit.add(baffleFloor);

    const meniscusMat = createOpticalGlassMaterial(
      idx === 1 ? '#C6D9ED' : '#B8C8DA',
      idx === 1 ? '#D96B27' : '#96AEC8'
    );
    glassMaterials.push(meniscusMat);
    const meniscus = new THREE.Mesh(
      new THREE.CircleGeometry(R - wallT - 0.012, 48),
      meniscusMat
    );
    meniscus.rotation.x = -Math.PI * 0.5;
    meniscus.position.y = H * 0.5 - 0.44;
    unit.add(meniscus);
  });

  // 3 Slender Optical Crystal Coupling Tubes between the 4 titanium shells (lifted at bottom for iconic U-notch!)
  const bridgeXs = [-pitch, 0, pitch];
  bridgeXs.forEach((cx, bIdx) => {
    const hLeft = baseH * (steppedHero ? 1.04 - bIdx * 0.025 : 1.0);
    const hRight = baseH * (steppedHero ? 1.04 - (bIdx + 1) * 0.025 : 1.0);
    const topY = Math.min(hLeft, hRight) * 0.5 - 0.02 + (Math.min(hLeft, hRight) - baseH) * 0.5;
    const botY = -baseH * 0.5 + baseH * 0.12; // Iconic U-arch clearance at bottom!
    const tubeH = topY - botY;
    const midY = (topY + botY) * 0.5;

    const outerTube = new THREE.Mesh(
      new THREE.CylinderGeometry(couplerR, couplerR, tubeH, 40, 1, true),
      crystalTubeMat
    );
    outerTube.position.set(cx, midY, 0);
    group.add(outerTube);

    // Crisp glass rim lip at top & bottom rounded meniscus U-turn
    const topRim = new THREE.Mesh(
      new THREE.TorusGeometry(couplerR - 0.008, 0.011, 10, 40),
      crystalTubeMat
    );
    topRim.rotation.x = Math.PI * 0.5;
    topRim.position.set(cx, topY, 0);
    group.add(topRim);

    const uCap = new THREE.Mesh(
      new THREE.SphereGeometry(couplerR, 32, 16, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
      crystalTubeMat
    );
    uCap.position.set(cx, botY, 0);
    group.add(uCap);

    // Delicate inner glass capillary wall for authentic double-refraction line
    const innerCapillary = new THREE.Mesh(
      new THREE.CylinderGeometry(couplerR * 0.72, couplerR * 0.72, tubeH * 0.96, 32, 1, true),
      crystalTubeMat
    );
    innerCapillary.position.set(cx, midY, 0);
    group.add(innerCapillary);
  });

  glassMaterials.push(crystalTubeMat);
  return { group, glassMaterials, titaniumMat, H: baseH, pitch, barrelXs, R };
}

/**
 * Slender Optical Crystal & Anodized-Crown Prism Wand that rests naturally on the spotlighted
 * studio tabletop (like Otto's stems on the white table) and inserts cleanly INTO a PRISM O barrel bore!
 */
export function buildOpticalWandElement({
  textures,
  glassColor,
  rimAccent,
  variant = 0,
}) {
  const group = new THREE.Group();

  const stemMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#B8C0C8'),
    metalness: 0.85,
    roughness: 0.36,
    roughnessMap: textures.roughnessMap,
    envMapIntensity: 1.5,
  });

  const crownGlassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(glassColor),
    metalness: 0.06,
    roughness: 0.08,
    transparent: true,
    opacity: 0.9,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    emissive: new THREE.Color(rimAccent),
    emissiveIntensity: 0.22,
    envMapIntensity: 2.4,
  });

  const bezelMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#E6EAEF'),
    metalness: 0.88,
    roughness: 0.3,
    envMapIntensity: 1.8,
  });

  // Slender precision optical stem (length ~1.45) extending down into barrel or resting flat on table
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 1.48, 20), stemMat);
  stem.position.y = -0.52;
  group.add(stem);

  // Branching cluster of 3 jewel-like optical lens discs/prisms at top of wand (echoing organic optical instrument probes!)
  const offsets =
    variant === 0
      ? [
          { x: 0, y: 0.32, z: 0, r: 0.19, rx: 0.35, rz: -0.2 },
          { x: -0.22, y: 0.16, z: 0.08, r: 0.14, rx: 0.48, rz: 0.32 },
          { x: 0.2, y: 0.08, z: -0.06, r: 0.12, rx: -0.3, rz: -0.35 },
        ]
      : variant === 1
        ? [
            { x: 0, y: 0.36, z: 0, r: 0.2, rx: 0.42, rz: 0.1 },
            { x: 0.24, y: 0.2, z: 0.07, r: 0.145, rx: 0.28, rz: -0.34 },
            { x: -0.19, y: 0.1, z: -0.05, r: 0.13, rx: 0.5, rz: 0.28 },
          ]
        : [
            { x: 0, y: 0.3, z: 0, r: 0.185, rx: 0.38, rz: -0.15 },
            { x: -0.21, y: 0.2, z: -0.06, r: 0.14, rx: 0.32, rz: 0.36 },
            { x: 0.22, y: 0.12, z: 0.07, r: 0.13, rx: 0.46, rz: -0.28 },
          ];

  offsets.forEach((o) => {
    // Sub-stem twig connecting main shaft to optical jewel disc
    const subLen = Math.hypot(o.x, o.y - 0.02, o.z);
    if (subLen > 0.08) {
      const twig = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, subLen, 12),
        stemMat
      );
      twig.position.set(o.x * 0.5, (o.y + 0.02) * 0.5, o.z * 0.5);
      twig.lookAt(o.x, o.y, o.z);
      twig.rotateX(Math.PI * 0.5);
      group.add(twig);
    }

    const head = new THREE.Group();
    head.position.set(o.x, o.y, o.z);
    head.rotation.set(o.rx, 0, o.rz);

    // Crisp silver-white optical ring + glowing jewel core (reads vividly on white studio table!)
    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(o.r, 0.026, 12, 36),
      bezelMat
    );
    outerRing.rotation.x = Math.PI * 0.5;
    head.add(outerRing);

    const jewel = new THREE.Mesh(
      new THREE.CylinderGeometry(o.r * 0.92, o.r * 0.92, 0.036, 36),
      crownGlassMat
    );
    head.add(jewel);

    const centerPip = new THREE.Mesh(
      new THREE.SphereGeometry(o.r * 0.28, 16, 12),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(rimAccent),
        emissive: new THREE.Color(rimAccent),
        emissiveIntensity: 0.55,
        roughness: 0.25,
      })
    );
    head.add(centerPip);

    group.add(head);
  });

  return { group, crownGlassMat };
}
