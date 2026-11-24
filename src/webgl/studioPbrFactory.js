import * as THREE from 'three';

/**
 * Generates high-resolution procedural satin Grade-5 titanium textures:
 * 1) Velvety satin horizontal micro-brush roughness & bump map (matching Phase One studio brushed metal)
 * 2) Precision CNC diamond-knurled cinema focus collar band (matching plate-ortho-iso.jpg)
 */
export function createBrushedTitaniumTextures() {
  const size = 512;

  // Satin brushed roughness map centered around ~0.44 (smooth satin metallic sheen, zero harsh chrome glare)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d');
  rCtx.fillStyle = '#707070';
  rCtx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const streak = 104 + Math.floor(Math.sin(y * 1.15) * 14 + (Math.random() - 0.5) * 28);
    rCtx.fillStyle = `rgb(${streak},${streak},${streak})`;
    rCtx.fillRect(0, y, size, 1);
  }
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 40 + Math.random() * 200;
    const v = 86 + Math.floor(Math.random() * 48);
    rCtx.fillStyle = `rgba(${v},${v},${v},0.32)`;
    rCtx.fillRect(x, y, len, 1);
  }

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3, 2);

  // Subtle horizontal brushed micro-grain bump map
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    const v = 114 + Math.floor((Math.random() - 0.5) * 32);
    bCtx.fillStyle = `rgb(${v},${v},${v})`;
    bCtx.fillRect(0, y, size, 1);
  }

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 2);

  // Crisp horological diamond-knurled focus collar texture (albedo shading + tactile bump)
  const knurlSize = 256;
  const knurlCanvas = document.createElement('canvas');
  knurlCanvas.width = knurlSize;
  knurlCanvas.height = knurlSize;
  const kCtx = knurlCanvas.getContext('2d');
  kCtx.fillStyle = '#686868';
  kCtx.fillRect(0, 0, knurlSize, knurlSize);
  const step = 16;
  for (let y = 0; y < knurlSize; y += step) {
    for (let x = 0; x < knurlSize; x += step) {
      const grad = kCtx.createLinearGradient(x, y, x + step, y + step);
      grad.addColorStop(0, '#F0F2F4');
      grad.addColorStop(0.5, '#9CA2A8');
      grad.addColorStop(1, '#3D4248');
      kCtx.fillStyle = grad;
      kCtx.beginPath();
      kCtx.moveTo(x + step * 0.5, y + 1);
      kCtx.lineTo(x + step - 1, y + step * 0.5);
      kCtx.lineTo(x + step * 0.5, y + step - 1);
      kCtx.lineTo(x + 1, y + step * 0.5);
      kCtx.closePath();
      kCtx.fill();
    }
  }
  const knurlMap = new THREE.CanvasTexture(knurlCanvas);
  knurlMap.wrapS = THREE.RepeatWrapping;
  knurlMap.wrapT = THREE.RepeatWrapping;
  knurlMap.repeat.set(18, 2);

  return { roughnessMap, bumpMap, knurlBumpMap: knurlMap, knurlMap };
}

/**
 * Multi-coated recessed sapphire meniscus optical glass shader (sits deep inside pitch-black optical bore).
 */
export function createOpticalGlassMaterial(tintHex = '#C6D9ED', accentHex = '#D96B27') {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uTint: { value: new THREE.Color(tintHex) },
      uAccent: { value: new THREE.Color(accentHex) },
      uAccentMix: { value: 0.16 },
      uOpacity: { value: 0.92 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mv.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec2 uPointer;
      uniform vec3 uTint;
      uniform vec3 uAccent;
      uniform float uAccentMix;
      uniform float uOpacity;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec2 vUv;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndotv = clamp(dot(N, V), 0.0, 1.0);
        float fresnel = pow(1.0 - ndotv, 2.8);

        vec3 lightDir = normalize(vec3(-0.52 + uPointer.x * 0.42, 0.74 + uPointer.y * 0.25, 0.62));
        vec3 H = normalize(lightDir + V);
        float spec = pow(clamp(dot(N, H), 0.0, 1.0), 82.0);
        float softSpec = pow(clamp(dot(N, H), 0.0, 1.0), 16.0);

        vec3 baseGlass = vec3(0.012, 0.015, 0.020);
        vec3 coat = mix(uTint, uAccent, clamp(uAccentMix + fresnel * 0.42, 0.0, 1.0));
        vec3 col = baseGlass
          + coat * (fresnel * 0.48 + softSpec * 0.18)
          + vec3(0.95, 0.97, 1.0) * spec * 0.65;

        float alpha = clamp(0.86 + fresnel * 0.14, 0.0, 1.0) * uOpacity;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

/**
 * Builds the KOMA PRISM O (III) satin brushed Grade-5 titanium tri-barrel cinema lens sculpture,
 * matching plate-ortho-iso.jpg with recessed optical meniscus glass strictly INSIDE the dark bores.
 */
export function buildPrismMonolith({ textures, heightScale = 1.0, barrelRadius = 0.47 }) {
  const group = new THREE.Group();
  const glassMaterials = [];

  const titaniumMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#D5D8DC'),
    metalness: 0.89,
    roughness: 0.44,
    roughnessMap: textures.roughnessMap,
    bumpMap: textures.bumpMap,
    bumpScale: 0.0045,
    envMapIntensity: 1.52,
  });

  const knurlMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#C4C8CE'),
    map: textures.knurlMap,
    metalness: 0.84,
    roughness: 0.52,
    bumpMap: textures.knurlBumpMap,
    bumpScale: 0.024,
    envMapIntensity: 1.35,
  });

  const darkBaffleMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#040507'),
    metalness: 0.12,
    roughness: 0.92,
    envMapIntensity: 0.05,
  });

  const crystalRibMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#CDD3DA'),
    metalness: 0.86,
    roughness: 0.28,
    envMapIntensity: 1.65,
  });

  const H = 2.72 * heightScale;
  const R = barrelRadius;
  const wallT = 0.054;

  // Precision lathe profile: tapered base chamfer + crisp 45-deg top chamfer + deep recessed rim
  const pts = [
    new THREE.Vector2(R - 0.075, -H * 0.5),
    new THREE.Vector2(R - 0.018, -H * 0.5 + 0.075),
    new THREE.Vector2(R, -H * 0.5 + 0.14),
    new THREE.Vector2(R, H * 0.5 - 0.055),
    new THREE.Vector2(R - 0.036, H * 0.5),
    new THREE.Vector2(R - wallT + 0.008, H * 0.5),
    new THREE.Vector2(R - wallT, H * 0.5 - 0.022),
    new THREE.Vector2(R - wallT, H * 0.5 - 0.65),
  ];
  const barrelGeo = new THREE.LatheGeometry(pts, 80);

  const spacing = R * 2.16;
  const barrelXs = [-spacing, 0, spacing];

  barrelXs.forEach((bx, idx) => {
    const unit = new THREE.Group();
    unit.position.x = bx;
    group.add(unit);

    unit.add(new THREE.Mesh(barrelGeo, titaniumMat));

    // Deep pitch-black velvet-anodized optical bore lining
    const boreGeo = new THREE.CylinderGeometry(R - wallT - 0.002, R - wallT - 0.002, H * 0.86, 56, 1, true);
    const boreMesh = new THREE.Mesh(boreGeo, darkBaffleMat);
    boreMesh.position.y = 0.08;
    boreMesh.material.side = THREE.BackSide;
    unit.add(boreMesh);

    // Pitch-black stepped baffle ring inside the bore
    const baffleFloor = new THREE.Mesh(new THREE.CircleGeometry(R - wallT, 56), darkBaffleMat);
    baffleFloor.rotation.x = -Math.PI * 0.5;
    baffleFloor.position.y = H * 0.5 - 0.36;
    unit.add(baffleFloor);

    // Strictly RECESSED optical meniscus lens sitting BELOW the chamfered rim (never pokes out!)
    const meniscusMat = createOpticalGlassMaterial(
      idx === 1 ? '#C6D9ED' : '#B8C8DA',
      idx === 1 ? '#D96B27' : '#96AEC8'
    );
    glassMaterials.push(meniscusMat);
    const lensR = R - wallT - 0.01;
    const meniscus = new THREE.Mesh(
      new THREE.CircleGeometry(lensR, 52),
      meniscusMat
    );
    meniscus.rotation.x = -Math.PI * 0.5;
    meniscus.position.y = H * 0.5 - 0.24;
    unit.add(meniscus);

    // Precision CNC diamond-knurled focus collar band
    const knurlBand = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 0.011, R + 0.011, 0.23, 80),
      knurlMat
    );
    knurlBand.position.y = -H * 0.04;
    unit.add(knurlBand);

    // Razor-thin machined parting seams
    const seamGeo = new THREE.TorusGeometry(R + 0.003, 0.0045, 8, 80);
    const seamUpper = new THREE.Mesh(seamGeo, darkBaffleMat);
    seamUpper.rotation.x = Math.PI * 0.5;
    seamUpper.position.y = H * 0.17;
    const seamKnurlTop = seamUpper.clone();
    seamKnurlTop.position.y = -H * 0.04 + 0.12;
    const seamKnurlBot = seamUpper.clone();
    seamKnurlBot.position.y = -H * 0.04 - 0.12;
    unit.add(seamUpper, seamKnurlTop, seamKnurlBot);
  });

  // Two slender sculpted crystal optical coupling columns uniting the 3 barrels
  const bridgeXs = [-spacing * 0.5, spacing * 0.5];
  const bridgeH = H * 0.92;
  const bridgeGeo = new THREE.CylinderGeometry(0.082, 0.082, bridgeH, 36);
  const bridgeCapGeo = new THREE.CircleGeometry(0.062, 28);

  bridgeXs.forEach((cx) => {
    const col = new THREE.Mesh(bridgeGeo, crystalRibMat);
    col.position.set(cx, -0.02, 0.02);
    group.add(col);

    const cap = new THREE.Mesh(bridgeCapGeo, darkBaffleMat);
    cap.rotation.x = -Math.PI * 0.5;
    cap.position.set(cx, bridgeH * 0.5 - 0.018, 0.02);
    group.add(cap);

    const web = new THREE.Mesh(new THREE.BoxGeometry(0.22, H * 0.88, 0.12), titaniumMat);
    web.position.set(cx, -0.02, -0.04);
    group.add(web);
  });

  return { group, glassMaterials, titaniumMat, H, spacing, R };
}

/**
 * Tactile machined brushed-titanium drop-in optical glass filter cell
 * for the Interactive Tabletop Studio.
 */
export function buildOpticalFilterCell({ textures, glassColor, rimAccent, streakRibs = false }) {
  const group = new THREE.Group();

  const bezelMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#CFD4DA'),
    metalness: 0.88,
    roughness: 0.42,
    roughnessMap: textures.roughnessMap,
    bumpMap: textures.knurlBumpMap,
    bumpScale: 0.016,
    envMapIntensity: 1.5,
  });

  const ringPts = [
    new THREE.Vector2(0.32, -0.055),
    new THREE.Vector2(0.39, -0.055),
    new THREE.Vector2(0.408, -0.036),
    new THREE.Vector2(0.408, 0.036),
    new THREE.Vector2(0.388, 0.055),
    new THREE.Vector2(0.32, 0.055),
    new THREE.Vector2(0.32, -0.055),
  ];
  group.add(new THREE.Mesh(new THREE.LatheGeometry(ringPts, 64), bezelMat));

  // Subtle color-coded anodized rim datum ring
  const indexRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.41, 0.0085, 10, 64),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(rimAccent),
      metalness: 0.45,
      roughness: 0.35,
      emissive: new THREE.Color(rimAccent),
      emissiveIntensity: 0.35,
    })
  );
  indexRing.rotation.x = Math.PI * 0.5;
  group.add(indexRing);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(glassColor),
    metalness: 0.08,
    roughness: streakRibs ? 0.14 : 0.07,
    transparent: true,
    opacity: 0.84,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 2.1,
  });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.325, 0.325, 0.044, 48), glassMat);
  group.add(disc);

  if (streakRibs) {
    const ribMat = new THREE.MeshBasicMaterial({
      color: '#BCE6FF',
      transparent: true,
      opacity: 0.4,
    });
    for (let i = -3; i <= 3; i++) {
      const zOff = i * 0.075;
      const halfW = Math.sqrt(Math.max(0.01, 0.31 * 0.31 - zOff * zOff)) * 1.9;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(halfW, 0.006, 0.006), ribMat);
      rib.position.set(0, 0.024, zOff);
      group.add(rib);
    }
  }

  return { group, glassMat };
}
