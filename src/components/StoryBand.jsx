import React, { useEffect, useRef, useState } from 'react';
import {
  PRISM_EDITIONS,
  SPIRAL_FRAMES,
  STORY_ORTHO_PLATES,
} from '../data/catalog.js';
import { drawPrismWireframeAssembly } from '../webgl/wireframe3dProjector.js';

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function smoothStep(e0, e1, x) {
  const t = clamp01((x - e0) / Math.max(0.0001, e1 - e0));
  return t * t * (3 - 2 * t);
}

function easeOutCubic(t) {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}

function easeInOutCubic(t) {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

/**
 * Photorealistic Top-Down Overhead 4-Barrel + 3-Crystal-Coupler Cutout SVG
 * Matches the exact geometry of drawPrismWireframeAssembly at pitch=PI/2, roll=PI/2
 * so the liquid wave wipe from photo -> 1px wireframe in s04 -> s05 is 100% seamless!
 */
function TopDownCutoutSvg({ waveWipe = 0 }) {
  // waveWipe in [0, 1]: 0 = 100% photorealistic silver/black top-down cutout, 1 = wiped away from top to bottom!
  const yCut = -40 + waveWipe * 640;
  const wavePath = `M -20 ${yCut} Q 45 ${yCut + 26} 90 ${yCut - 14} T 200 ${yCut + 12} L 200 620 L -20 620 Z`;

  // Exact matching coordinates for 4 barrels + 3 couplers when scale = 68, stepX = 0.9312 -> stepPx = 63.32px around cy = 270!
  const stepPx = 63.32;
  const barrelYs = [
    270 - 1.5 * stepPx,
    270 - 0.5 * stepPx,
    270 + 0.5 * stepPx,
    270 + 1.5 * stepPx,
  ];
  const couplerYs = [270 - stepPx, 270, 270 + stepPx];

  return (
    <svg
      viewBox="0 0 180 540"
      width="180"
      height="540"
      className="flight-photo-svg"
      aria-hidden="true"
    >
      <defs>
        <clipPath id="koma-liquid-wipe-clip">
          <path d={wavePath} />
        </clipPath>
        <linearGradient id="koma-shell-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5F7F9" />
          <stop offset="45%" stopColor="#B8C0C8" />
          <stop offset="80%" stopColor="#5E6670" />
          <stop offset="100%" stopColor="#D6DCE2" />
        </linearGradient>
        <radialGradient id="koma-coupler-glass" cx="38%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="52%" stopColor="#9DA6B0" />
          <stop offset="85%" stopColor="#464E56" />
          <stop offset="100%" stopColor="#D8DFE6" />
        </radialGradient>
      </defs>

      <g clipPath="url(#koma-liquid-wipe-clip)">
        {/* Subtle soft studio drop shadow */}
        {barrelYs.map((by, idx) => (
          <circle
            key={`sh-${idx}`}
            cx="93"
            cy={by + 4}
            r="25"
            fill="rgba(20, 24, 28, 0.14)"
          />
        ))}

        {/* Silver connecting saddles & 3 Schott crystal couplers */}
        {couplerYs.map((cy, idx) => (
          <g key={`cp-${idx}`}>
            <rect
              x="76"
              y={cy - 22}
              width="28"
              height="44"
              rx="6"
              fill="url(#koma-shell-metal)"
            />
            <circle
              cx="90"
              cy={cy}
              r="9.2"
              fill="url(#koma-coupler-glass)"
              stroke="#5A626B"
              strokeWidth="0.9"
            />
            <circle cx="90" cy={cy} r="5.4" fill="#AEB6BF" />
          </g>
        ))}

        {/* 4 Satin-Brushed Titanium Barrels with jet-black velvet optical bores */}
        {barrelYs.map((by, idx) => (
          <g key={`br-${idx}`}>
            <circle cx="90" cy={by} r="24.5" fill="url(#koma-shell-metal)" />
            <circle cx="90" cy={by} r="22.3" fill="#06080B" />
            <circle
              cx="86"
              cy={by - 4}
              r="16"
              fill="none"
              stroke="rgba(210, 226, 245, 0.14)"
              strokeWidth="1.2"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

export function StoryBand({ onOpenDrawer, onAddItem }) {
  // Master 1360vh single-stage continuous scroll container (exact Otto 13.5x VH unbroken timeline!)
  const masterTrackRef = useRef(null);

  // Phase 1 refs: Monumental Split Headline + Rising Filmstrip + Split Lead Thesis
  const headlineWrapRef = useRef(null);
  const headlineLineRefs = useRef([]);
  const dimRailRef = useRef(null);
  const orthoStripRef = useRef(null);
  const splitThesisRef = useRef(null);

  // Phase 2 & 3 refs: Center Pinned Flight Object (Photo -> Liquid Wipe -> Real-Time 3D Wireframe Canvas) + Step Titles
  const flightStageRef = useRef(null);
  const wireCanvasRef = useRef(null);
  const formsRailRef = useRef(null);
  const bigStepRefs = useRef([]);

  // Phase 4 refs: 3D Orbital Photo Vortex + Flying Docked Edition Card
  const spiralStageRef = useRef(null);
  const spiralCardRefs = useRef([]);
  const flyingDockCardRef = useRef(null);
  const dockChromeRef = useRef(null);
  const dockFlankLeftRef = useRef(null);
  const dockFlankRightRef = useRef(null);

  // Phase 5 refs: Real-Time 3D Isometric Morph Canvas (I, II, III) + Self-Drawing Full-Bleed Studio Room SVG
  const roomStageRef = useRef(null);
  const editionsCanvasRef = useRef(null);
  const roomSvgRef = useRef(null);
  const roomPathRefs = useRef([]);
  const roomCalloutsRef = useRef(null);

  const [waveWipeState, setWaveWipeState] = useState(0);
  const [activeFormStep, setActiveFormStep] = useState(0);
  const [selectedEditionId, setSelectedEditionId] = useState('prism-85');

  const lastWaveRef = useRef(0);
  const lastStepRef = useRef(0);
  const selectedEdition =
    PRISM_EDITIONS.find((ed) => ed.id === selectedEditionId) || PRISM_EDITIONS[2];

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let smoothP = 0;
    let rafId = 0;

    // Measure SVG path lengths once for crisp stroke-dashoffset self-drawing room lines!
    roomPathRefs.current.forEach((pathEl) => {
      if (!pathEl || pathEl.dataset.lenReady) return;
      try {
        const len = pathEl.getTotalLength();
        pathEl.style.strokeDasharray = `${len.toFixed(1)}`;
        pathEl.style.strokeDashoffset = `${len.toFixed(1)}`;
        pathEl.dataset.totalLen = String(len);
        pathEl.dataset.lenReady = '1';
      } catch {}
    });

    const getRawProgress = () => {
      const el = masterTrackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 900;
      // Reserve the final 100vh of masterTrack so the isometric CAD room stays pinned
      // while the #collection dark curtain physically wipes up over it (exact Otto s17).
      const travel = Math.max(1, rect.height - vh * 2);
      return clamp01(-rect.top / travel);
    };

    const renderFrame = (immediate = false) => {
      const vw = window.innerWidth || 1440;
      const vh = window.innerHeight || 900;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const mScale = vw < 768 ? Math.min(1, (vw - 24) / 560) : 1;
      const rawP = getRawProgress();
      if (immediate || reducedMotion) {
        smoothP = rawP;
      } else {
        smoothP += (rawP - smoothP) * 0.135;
      }
      const p = smoothP;

      // Also check entry progress as #story rises over Hero (rect.top from vh -> 0)
      const trackRect = masterTrackRef.current?.getBoundingClientRect();
      const entryReveal = trackRect
        ? clamp01((vh - trackRect.top) / (vh * 0.82))
        : 1;

      // =====================================================================
      // PHASE 1 (p = 0.000 .. 0.200): SPLIT HEADLINE + FILMSTRIP -> SPLIT THESIS (s01 -> s03 -> s04)
      // =====================================================================
      headlineLineRefs.current.forEach((lineEl, idx) => {
        if (!lineEl) return;
        const staggerReveal = easeOutCubic((entryReveal - idx * 0.14) / 0.62);
        const yPct = (1 - staggerReveal) * 108;
        lineEl.style.transform = `translate3d(0, ${yPct.toFixed(1)}%, 0)`;
      });

      const headScrollUp = -clamp01(p / 0.125) * vh * 0.92;
      const headOpacity = 1 - smoothStep(0.095, 0.135, p);
      if (headlineWrapRef.current) {
        headlineWrapRef.current.style.transform = `translate3d(0, ${headScrollUp.toFixed(1)}px, 0)`;
        headlineWrapRef.current.style.opacity = headOpacity.toFixed(3);
      }
      if (dimRailRef.current) {
        dimRailRef.current.style.transform = `translate3d(0, ${(headScrollUp * 0.65).toFixed(1)}px, 0)`;
        dimRailRef.current.style.opacity = headOpacity.toFixed(3);
      }

      // 3 square photographic plates glide straight up through the giant headline split and exit top by p = 0.155
      if (orthoStripRef.current) {
        const stripT = clamp01(p / 0.165);
        const stripY = (0.44 - stripT * 1.72) * vh;
        orthoStripRef.current.style.transform = `translate3d(-50%, ${stripY.toFixed(1)}px, 0)`;
        orthoStripRef.current.style.opacity = (1 - smoothStep(0.145, 0.17, p)).toFixed(3);
      }

      // Split Lead Thesis ("THE FIRST M [●] ODULAR...") rises into center around the 4th top-down cutout at p = 0.09..0.14,
      // then glides cleanly off the top of the screen across p = 0.15..0.225 (exact Otto s03 -> s04!)
      if (splitThesisRef.current) {
        const thesisIn = smoothStep(0.075, 0.12, p);
        const thesisOut = smoothStep(0.145, 0.225, p);
        const thesisY = (1 - thesisIn) * (vh * 0.56) - thesisOut * (vh * 0.78);
        const thesisOp = thesisIn * (1 - smoothStep(0.195, 0.228, p));
        splitThesisRef.current.style.transform = `translate3d(-50%, calc(-50% + ${thesisY.toFixed(1)}px), 0)`;
        splitThesisRef.current.style.opacity = thesisOp.toFixed(3);
        splitThesisRef.current.style.pointerEvents =
          thesisOp > 0.55 ? 'auto' : 'none';
      }

      // =====================================================================
      // PHASE 2 & 3 (p = 0.085 .. 0.505): FLIGHT TOP-DOWN CUTOUT -> LIQUID WIPE -> 3D WIREFRAME TUMBLE (s03 -> s09)
      // =====================================================================
      const flightVisible = p >= 0.075 && p <= 0.525;
      if (flightStageRef.current) {
        const enterFromStrip = smoothStep(0.075, 0.125, p);
        const fadeIntoSpiral = 1 - smoothStep(0.475, 0.518, p);
        const settleCenter = easeInOutCubic(clamp01((p - 0.145) / 0.065));
        // Sits slightly higher (-48px) in s03 so its bottom barrels split the top 2 rows of text, then settles dead-center (0px) in s04.
        const flightY =
          (1 - enterFromStrip) * (vh * 0.54) -
          (1 - settleCenter) * 48 -
          (1 - fadeIntoSpiral) * 48;
        const growScale = 0.60 + settleCenter * 0.40;
        flightStageRef.current.style.opacity = flightVisible
          ? (Math.min(1, enterFromStrip * 1.4) * fadeIntoSpiral).toFixed(3)
          : '0';
        flightStageRef.current.style.transform = `translate3d(-50%, calc(-50% + ${flightY.toFixed(1)}px), 0) scale(${(growScale * mScale).toFixed(3)})`;
      }

      // Liquid wave wipe strips photorealistic cutout across p = 0.215 .. 0.268 (exact Otto s05!)
      const wipeVal = smoothStep(0.215, 0.268, p);
      if (Math.abs(wipeVal - lastWaveRef.current) > 0.008) {
        lastWaveRef.current = wipeVal;
        setWaveWipeState(wipeVal);
      }

      // Draw Real-Time 3D Wireframe on High-DPI Canvas whenever p in [0.20, 0.525]!
      const wireCanvas = wireCanvasRef.current;
      if (wireCanvas && p >= 0.20 && p <= 0.525) {
        const cw = 520;
        const ch = 540;
        if (wireCanvas.width !== cw * dpr || wireCanvas.height !== ch * dpr) {
          wireCanvas.width = cw * dpr;
          wireCanvas.height = ch * dpr;
        }
        const ctx = wireCanvas.getContext('2d');
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, cw, ch);

        // At p <= 0.268: pure vertical Top-Down Plan (pitch = PI/2, yaw = 0, roll = PI/2) matching TopDownCutoutSvg 1:1!
        // Across p = 0.268 .. 0.355: True 3D Tumble through diagonal s06 into upright three-quarter elevation s07!
        const tumbleT = easeInOutCubic(clamp01((p - 0.268) / 0.088));
        const orbitAfter = clamp01((p - 0.356) / 0.125);

        const pitch = (1 - tumbleT) * (Math.PI * 0.5) + tumbleT * 0.30;
        const roll = -(1 - tumbleT) * (Math.PI * 0.5);
        const yaw = tumbleT * (-0.34 + orbitAfter * 0.46);
        const persp = tumbleT * 0.085;
        const wfScale = 68 + tumbleT * 26;

        let stepIdx = 0;
        let highlightMode = 'none';
        if (p >= 0.335 && p < 0.39) {
          stepIdx = 1;
          highlightMode = 'barrels';
        } else if (p >= 0.39 && p < 0.445) {
          stepIdx = 2;
          highlightMode = 'bridges';
        } else if (p >= 0.445 && p < 0.505) {
          stepIdx = 3;
          highlightMode = 'all';
        }
        if (stepIdx !== lastStepRef.current) {
          lastStepRef.current = stepIdx;
          setActiveFormStep(stepIdx);
        }

        drawPrismWireframeAssembly(ctx, {
          barrels: 4,
          cx: cw * 0.5,
          cy: ch * 0.5,
          scale: wfScale,
          pitch,
          yaw,
          roll,
          persp,
          paperFill: '#EEF0EC',
          strokeMain: '#383C42',
          strokeFine: '#7D848D',
          highlightMode,
          accentColor: '#181C20',
          lineWidth: 1.0,
        });
        ctx.restore();
      }

      // 4-Column Horizon Step Rail (`01..03` | `FOUR BARRELS` | `THREE BRIDGES` | `ONE MONOLITH`) + Giant Bottom `120px` Titles (exact s07..s09!)
      if (formsRailRef.current) {
        const railIn = smoothStep(0.325, 0.35, p);
        const railOut = 1 - smoothStep(0.475, 0.502, p);
        formsRailRef.current.style.opacity = (railIn * railOut).toFixed(3);
      }

      const stepWindows = [
        [0.33, 0.39],
        [0.388, 0.445],
        [0.443, 0.498],
      ];
      bigStepRefs.current.forEach((el, idx) => {
        if (!el) return;
        const [w0, w1] = stepWindows[idx];
        const mid = (w0 + w1) * 0.5;
        const enter = smoothStep(w0, mid - 0.008, p);
        const exit = smoothStep(mid + 0.008, w1, p);
        const yOff = (1 - enter) * 125 - exit * 125;
        const op = enter * (1 - exit);
        el.style.transform = `translate3d(0, ${yOff.toFixed(1)}%, 0)`;
        el.style.opacity = op.toFixed(3);
      });

      // =====================================================================
      // PHASE 4 (p = 0.485 .. 0.755): 3D ORBITAL PHOTO VORTEX -> FLYING EDITION CARD DOCKS CENTER (s10 -> s13)
      // =====================================================================
      const spiralActive = p >= 0.48 && p <= 0.77;
      if (spiralStageRef.current) {
        spiralStageRef.current.style.opacity = spiralActive ? '1' : '0';
        spiralStageRef.current.style.pointerEvents =
          p >= 0.62 && p <= 0.76 ? 'auto' : 'none';
      }

      if (spiralActive) {
        const spT = clamp01((p - 0.485) / 0.195);
        const total = SPIRAL_FRAMES.length;
        const spreadX = Math.min(vw * 0.42, 590);
        const spreadY = Math.min(vh * 0.36, 330);

        for (let i = 0; i < total; i++) {
          const card = spiralCardRefs.current[i];
          if (!card) continue;
          const slot = (i + 0.4) / total;
          const delta = spT * 1.24 - 0.12 - slot;
          const norm = delta / 0.44;
          const cNorm = Math.max(-1.4, Math.min(1.4, norm));

          const ang = cNorm * Math.PI * 1.1 + i * 0.68;
          const x = Math.cos(ang) * spreadX * (0.48 + Math.abs(cNorm) * 0.46) - cNorm * 180;
          const y = Math.sin(ang) * spreadY * 0.86 + cNorm * 140;
          const z = (1 - Math.abs(cNorm)) * 260 - 220;
          const rotZ = -14 + Math.sin(ang) * 12 + cNorm * 10;
          const rotY = -cNorm * 24;

          const life = clamp01(1 - Math.abs(norm));
          const scatterOut = 1 - smoothStep(0.64, 0.695, p);
          const op = Math.pow(Math.sin(life * Math.PI * 0.5), 1.15) * scatterOut;
          const sc = 0.42 + life * 0.64;

          card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${rotY.toFixed(1)}deg) rotateZ(${rotZ.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
          card.style.opacity = op.toFixed(3);
        }
      }

      // Flying White Edition Selector Card (`PRISM O (III)` · `(I) (II) (III)`) enters tilted from lower-right inside the spiral
      // at p = 0.56 (s11 -> s12), untwists and docks dead-center at p = 0.665..0.745 (s13), then hands off seamlessly to Phase 5 (s14)!
      if (flyingDockCardRef.current) {
        const cardAppear = smoothStep(0.555, 0.60, p);
        const cardDock = easeOutCubic(clamp01((p - 0.56) / 0.105));
        const cardDissolveToRoom = 1 - smoothStep(0.755, 0.79, p);

        const cxOff = (1 - cardDock) * (vw * 0.16);
        const cyOff = (1 - cardDock) * (vh * 0.34);
        const cRotZ = (1 - cardDock) * -12.5;
        const cRotY = (1 - cardDock) * 16;
        const cScale = 0.52 + cardDock * 0.48;

        flyingDockCardRef.current.style.opacity = (
          cardAppear * cardDissolveToRoom
        ).toFixed(3);
        flyingDockCardRef.current.style.transform = `translate3d(calc(-50% + ${cxOff.toFixed(1)}px), calc(-50% + ${cyOff.toFixed(1)}px), 0) rotateY(${cRotY.toFixed(2)}deg) rotateZ(${cRotZ.toFixed(2)}deg) scale(${cScale.toFixed(3)})`;
        flyingDockCardRef.current.style.pointerEvents =
          p >= 0.64 && p <= 0.76 ? 'auto' : 'none';
      }

      // Card text/boxes & side captions (`THREE EDITIONS` / `CHOOSE YOURS`) visible during flight, dissolving cleanly across p = 0.735..0.775
      const chromeOp =
        smoothStep(0.555, 0.60, p) * (1 - smoothStep(0.735, 0.772, p));
      const flankOp =
        smoothStep(0.65, 0.68, p) * (1 - smoothStep(0.735, 0.772, p));
      if (dockChromeRef.current) {
        dockChromeRef.current.style.opacity = chromeOp.toFixed(3);
      }
      if (dockFlankLeftRef.current) {
        dockFlankLeftRef.current.style.opacity = flankOp.toFixed(3);
      }
      if (dockFlankRightRef.current) {
        dockFlankRightRef.current.style.opacity = flankOp.toFixed(3);
      }

      // =====================================================================
      // PHASE 5 (p = 0.755 .. 1.000): 3 EDITIONS ROTATE IN 3D INTO ISOMETRIC + FULL-SCREEN STUDIO ROOM SELF-DRAWS (s14 -> s17)
      // =====================================================================
      const roomActive = p >= 0.70;
      if (roomStageRef.current) {
        roomStageRef.current.style.opacity = roomActive
          ? smoothStep(0.70, 0.74, p).toFixed(3)
          : '0';
        roomStageRef.current.style.pointerEvents = p >= 0.85 ? 'auto' : 'none';
      }

      if (roomActive && editionsCanvasRef.current) {
        const ec = editionsCanvasRef.current;
        const rw = vw;
        const rh = vh;
        if (ec.width !== Math.round(rw * dpr) || ec.height !== Math.round(rh * dpr)) {
          ec.width = Math.round(rw * dpr);
          ec.height = Math.round(rh * dpr);
        }
        const ctx = ec.getContext('2d');
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, rw, rh);

        // tIso 0: exact flat front elevations locked onto the 3 tiles of the docked card.
        // tIso 1: scaled 3D isometric instruments standing on the studio table.
        const tIso = easeInOutCubic(clamp01((p - 0.775) / 0.10));
        const isoPitch = tIso * 0.35;
        const isoYaw = tIso * -0.52;

        // Room SVG uses xMidYMid slice on a 1440x900 viewBox: map its coordinates exactly.
        const sl = Math.max(rw / 1440, rh / 900);
        const ox = (rw - 1440 * sl) * 0.5;
        const oy = (rh - 900 * sl) * 0.5;
        const mapX = (x) => ox + x * sl;
        const mapY = (y) => oy + y * sl;

        const tilePitch = vw < 768 ? vw * 0.31 : 171;
        const k = tilePitch / 171;
        const flatScale = 28 * k;
        const targetIsoScale = vw < 768 ? 36 : 66 * sl;
        const isoScale = flatScale + tIso * (targetIsoScale - flatScale);
        const tileY = rh * 0.5 - 35 * (vw < 768 ? k : 1);

        const specs =
          vw < 768
            ? [
                { barrels: 2, x0: rw * 0.5 - tilePitch, x1: rw * 0.21, y1: mapY(476) },
                { barrels: 3, x0: rw * 0.5, x1: rw * 0.48, y1: mapY(470) },
                { barrels: 4, x0: rw * 0.5 + tilePitch, x1: rw * 0.78, y1: mapY(464) },
              ]
            : [
                { barrels: 2, x0: rw * 0.5 - tilePitch, x1: mapX(484), y1: mapY(472) },
                { barrels: 3, x0: rw * 0.5, x1: mapX(682), y1: mapY(468) },
                { barrels: 4, x0: rw * 0.5 + tilePitch, x1: mapX(924), y1: mapY(462) },
              ];

        specs.forEach((sp, idx) => {
          const curX = sp.x0 + (sp.x1 - sp.x0) * tIso;
          const curY = tileY + (sp.y1 - tileY) * tIso;
          const isChosen = PRISM_EDITIONS[idx]?.id === selectedEditionId && tIso > 0.7;

          drawPrismWireframeAssembly(ctx, {
            barrels: sp.barrels,
            cx: curX,
            cy: curY,
            scale: isoScale,
            pitch: isoPitch,
            yaw: isoYaw,
            roll: 0,
            persp: tIso * 0.05,
            paperFill: '#EEF0EC',
            strokeMain: isChosen ? '#181C20' : '#3A3E44',
            strokeFine: '#7D848D',
            highlightMode: isChosen ? 'all' : 'none',
            accentColor: '#181C20',
            lineWidth: 1.0,
          });
        });

        ctx.restore();
      }

      // Progressive stroke-dashoffset self-drawing of the full-bleed isometric studio table, chair/bench, & architectural walls (s15 -> s16!)
      const drawRoomT = clamp01((p - 0.825) / 0.125);
      roomPathRefs.current.forEach((pathEl, idx) => {
        if (!pathEl) return;
        const totalLen = Number(pathEl.dataset.totalLen || 1200);
        const localT = easeInOutCubic(clamp01((drawRoomT - idx * 0.055) / 0.68));
        pathEl.style.strokeDashoffset = `${((1 - localT) * totalLen).toFixed(1)}`;
        pathEl.style.opacity = localT > 0.01 ? '1' : '0';
      });

      if (roomCalloutsRef.current) {
        roomCalloutsRef.current.style.opacity = smoothStep(0.90, 0.945, p).toFixed(3);
      }
    };

    renderFrame(true);

    const tick = () => {
      renderFrame(false);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [selectedEditionId]);

  const registerRoomPath = (idx) => (el) => {
    roomPathRefs.current[idx] = el;
  };

  return (
    <section id="story" data-band="paper" className="koma-band story-band">
      {/* ONE UNIFIED 1360vh CONTINUOUS STORY TRACK WITH ONE 100vh STICKY STAGE (exact Otto 13.5x VH unbroken flow!) */}
      <div ref={masterTrackRef} className="story-master-track">
        <div className="story-master-sticky">
          {/* 1. MONUMENTAL 3-LINE MASKED HEADLINE + 4-COL DIMENSION RAIL (s01 -> s02) */}
          <div
            ref={headlineWrapRef}
            className="story-split-headline"
            aria-label="PRISM O (III) Machined to Hold Pure Optical Light"
          >
            <h2 className="t120 story-line-mask">
              <span
                ref={(el) => {
                  headlineLineRefs.current[0] = el;
                }}
                className="story-line-inner"
              >
                PRISM O (III)
              </span>
            </h2>
            <p className="t120 story-line-mask" aria-hidden="true">
              <span
                ref={(el) => {
                  headlineLineRefs.current[1] = el;
                }}
                className="story-line-inner"
              >
                MACHINED TO HOLD
              </span>
            </p>
            <p className="t120 story-line-mask" aria-hidden="true">
              <span
                ref={(el) => {
                  headlineLineRefs.current[2] = el;
                }}
                className="story-line-inner"
              >
                PURE OPTICAL LIGHT
              </span>
            </p>
          </div>

          <div ref={dimRailRef} className="story-dim-rail" aria-label="Optical Specifications">
            <span className="t12 num">W 260 mm</span>
            <span className="t12 num">D 50 mm</span>
            <span className="t12 num">ø50 shell / ø18 bridge</span>
            <span className="t12 num">H 215 mm</span>
          </div>

          {/* 2. RISING VERTICAL FILMSTRIP OF 3 SQUARE STUDIO PLATES (s01 -> s02 -> exits top in s03) */}
          <div ref={orthoStripRef} className="story-ortho-column">
            {STORY_ORTHO_PLATES.map((plate) => (
              <figure key={plate.id} className="story-ortho-plate">
                <img
                  src={plate.src}
                  alt={plate.alt}
                  loading="eager"
                  decoding="async"
                />
              </figure>
            ))}
          </div>

          {/* 3. SPLIT EDITORIAL LEAD THESIS PHYSICALLY DIVIDED AROUND THE 4TH TOP-DOWN CUTOUT (exact Otto s03) */}
          <div ref={splitThesisRef} className="story-split-thesis">
            <div className="split-thesis-rows" aria-label="The first modular optic object by KOMA Lab Prism O III. An object machined for pure cinema light.">
              <div className="split-thesis-row t30" aria-hidden="true">
                <span className="split-thesis-left">THE FIRST M</span>
                <span className="split-thesis-gap" />
                <span className="split-thesis-right">ODULAR OPTIC</span>
              </div>
              <div className="split-thesis-row t30" aria-hidden="true">
                <span className="split-thesis-left">OBJECT BY KOM</span>
                <span className="split-thesis-gap" />
                <span className="split-thesis-right">A PRISM O (III).</span>
              </div>
              <div className="split-thesis-row t30" aria-hidden="true">
                <span className="split-thesis-left">AN OBJECT</span>
                <span className="split-thesis-gap--narrow" />
                <span className="split-thesis-right">MACHINED FOR</span>
              </div>
              <div className="split-thesis-row split-thesis-row--joined t30" aria-hidden="true">
                <span>PURE CINEMA LIGHT.</span>
              </div>
            </div>

            <div className="split-thesis-meta">
              <p className="t12 num split-thesis-dims">
                Dimensions:
                <br />W 260 × D 50 × H 215 mm
              </p>
              <p className="t12 split-thesis-mat">In Grade-5 Titanium and Schott Glass</p>
              <button
                type="button"
                className="editorial-link split-thesis-cta"
                onClick={(e) => onOpenDrawer(e.currentTarget)}
              >
                RESERVE NOW
              </button>
            </div>
          </div>

          {/* 4. PINNED FLIGHT OBJECT: TOP-DOWN CUTOUT -> LIQUID WAVE WIPE -> REAL-TIME 3D WIREFRAME TUMBLE (s03 -> s09) */}
          <div ref={flightStageRef} className="story-flight-stage">
            <canvas
              ref={wireCanvasRef}
              className="story-wireframe-canvas"
              aria-label="Scroll-driven 3D architectural wireframe rotating from top-down optical plan to isometric elevation"
            />
            {waveWipeState < 0.995 && (
              <div className="story-flight-photo-overlay">
                <TopDownCutoutSvg waveWipe={waveWipeState} />
              </div>
            )}
          </div>

          {/* 5. HORIZON STEP RAIL (`01 / 02 / 03`) + GIANT BOTTOM-RISING `120px` CHAPTER HEADLINES (exact Otto s07..s09!) */}
          <div ref={formsRailRef} className="story-forms-rail" aria-hidden="true">
            <span className="t12 num">
              {activeFormStep > 0 ? `0${activeFormStep}` : '01'}
            </span>
            <span
              className={`t12 story-forms-label ${activeFormStep === 1 ? 'is-active' : ''}`}
            >
              FOUR BARRELS
            </span>
            <span
              className={`t12 story-forms-label ${activeFormStep === 2 ? 'is-active' : ''}`}
            >
              THREE BRIDGES
            </span>
            <span
              className={`t12 story-forms-label ${activeFormStep === 3 ? 'is-active' : ''}`}
            >
              ONE MONOLITH
            </span>
          </div>

          <div className="story-big-steps-stage" aria-hidden="true">
            {['FOUR BARRELS', 'THREE BRIDGES', 'ONE MONOLITH'].map((label, idx) => (
              <div key={label} className="story-big-step-mask">
                <p
                  ref={(el) => {
                    bigStepRefs.current[idx] = el;
                  }}
                  className="t120 story-big-step-text"
                >
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* 6. 3D ORBITAL PHOTO VORTEX + FLYING WHITE EDITION CARD DOCKING DEAD-CENTER (exact Otto s10 -> s13!) */}
          <div ref={spiralStageRef} className="story-spiral-stage" id="editions">
            <div className="spiral-vortex-field">
              {SPIRAL_FRAMES.map((frame, index) => (
                <figure
                  key={frame.id}
                  ref={(el) => {
                    spiralCardRefs.current[index] = el;
                  }}
                  className={`spiral-photo-card spiral-photo-card--${frame.aspect}`}
                >
                  <img
                    src={frame.src}
                    alt={frame.alt}
                    loading="eager"
                    decoding="async"
                  />
                </figure>
              ))}
            </div>

            <span
              ref={dockFlankLeftRef}
              className="t12 dock-flank-label dock-flank-label--left"
            >
              THREE EDITIONS
            </span>
            <span
              ref={dockFlankRightRef}
              className="t12 dock-flank-label dock-flank-label--right"
            >
              CHOOSE YOURS
            </span>

            <div ref={flyingDockCardRef} className="flying-edition-card">
              <div ref={dockChromeRef} className="flying-edition-card__chrome">
                <h3 className="flying-edition-card__title">{selectedEdition.name.split('·')[0].trim()}</h3>

                <div
                  className="flying-edition-card__grid"
                  role="tablist"
                  aria-label="Choose PRISM O modular edition"
                >
                  {PRISM_EDITIONS.map((ed) => {
                    const isSelected = ed.id === selectedEditionId;
                    return (
                      <button
                        key={ed.id}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        className={`edition-tile ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setSelectedEditionId(ed.id)}
                      >
                        <span className="t12 num edition-tile__roman">{ed.roman}</span>
                        <div className="edition-tile__box">
                          {/* Crisp 1px front elevation SVG matching exact tIso=0 coordinates! */}
                          <svg
                            viewBox="0 0 140 120"
                            width="140"
                            height="120"
                            aria-hidden="true"
                          >
                            {Array.from({ length: ed.barrels }).map((_, bi) => {
                              const step = 23;
                              const x = 70 + (bi - (ed.barrels - 1) * 0.5) * step;
                              return (
                                <rect
                                  key={bi}
                                  x={x - 9.5}
                                  y="22"
                                  width="19"
                                  height="76"
                                  rx="1.5"
                                  fill="#F7F8F6"
                                  stroke="#2A2E33"
                                  strokeWidth="0.95"
                                />
                              );
                            })}
                            {Array.from({ length: ed.barrels - 1 }).map((_, ci) => {
                              const step = 23;
                              const x = 70 + (ci + 0.5 - (ed.barrels - 1) * 0.5) * step;
                              return (
                                <rect
                                  key={ci}
                                  x={x - 3}
                                  y="23"
                                  width="6"
                                  height="65"
                                  rx="3"
                                  fill="#F7F8F6"
                                  stroke="#555C65"
                                  strokeWidth="0.85"
                                />
                              );
                            })}
                          </svg>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flying-edition-card__meta">
                  <p className="t12 num flying-edition-card__dims">
                    Dimensions:
                    <br />
                    {selectedEdition.dimsLabel}
                  </p>
                  <p className="t12 flying-edition-card__mat">
                    {selectedEdition.materialLabel}
                  </p>
                  <button
                    type="button"
                    className="editorial-link flying-edition-card__buy"
                    onClick={(e) => onAddItem(selectedEdition.id, e.currentTarget)}
                  >
                    RESERVE FROM ${selectedEdition.priceUsd.toLocaleString('en-US')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 7. FULL-BLEED ISOMETRIC ARCHITECTURAL STUDIO ROOM + 3D ROTATING (I)/(II)/(III) MONOLITHS (exact Otto s14 -> s17!) */}
          <div ref={roomStageRef} className="story-room-stage">
            <svg
              ref={roomSvgRef}
              viewBox="0 0 1440 900"
              preserveAspectRatio="xMidYMid slice"
              className="story-room-svg"
              aria-hidden="true"
            >
              {/* Background room corner verticals & architectural datum lines */}
              <path
                ref={registerRoomPath(0)}
                d="M 402 0 L 402 252 M 976 0 L 976 355 M 1265 508 L 1440 456"
                fill="none"
                stroke="#585E66"
                strokeWidth="0.95"
              />

              {/* Sculpted Studio Bench Backrest & Cylindrical Columns on Left (matching Otto s16 Chair + Table!) */}
              <path
                ref={registerRoomPath(1)}
                d="M 28 368 C 14 362 12 342 28 334 L 498 182 C 512 178 522 188 522 204 L 522 308 C 522 322 512 332 496 338 L 36 492 C 20 496 12 486 12 470 Z"
                fill="#EEF0EC"
                stroke="#2E3236"
                strokeWidth="1.0"
              />
              <path
                ref={registerRoomPath(2)}
                d="M 42 490 L 42 695 C 42 708 92 708 92 695 L 92 474 M 382 376 L 382 442 M 430 360 L 430 426 M 0 688 L 198 764 L 198 900 M 92 722 L 92 900"
                fill="none"
                stroke="#4A5058"
                strokeWidth="0.95"
              />

              {/* Full-Bleed Rounded Architectural Studio Table Surface */}
              <path
                ref={registerRoomPath(3)}
                d="M 164 598 C 108 572 118 532 192 508 L 892 318 C 984 294 1094 306 1168 342 L 1282 402 C 1332 428 1326 468 1254 494 L 578 724 C 472 758 342 752 252 704 Z"
                fill="#EEF0EC"
                stroke="#23272B"
                strokeWidth="1.1"
              />

              {/* Table Cylindrical Pedestal Legs & Joinery Lines Extending to Bottom Viewport Edge */}
              <path
                ref={registerRoomPath(4)}
                d="M 206 676 L 206 900 M 352 738 L 352 900 M 368 742 L 368 900 M 474 748 L 474 900 M 694 684 L 694 900 M 788 652 L 788 900 M 968 592 L 968 900 M 1078 554 L 1078 900 M 1228 504 L 1228 900 M 352 782 L 474 746"
                fill="none"
                stroke="#3A3E44"
                strokeWidth="0.95"
              />
            </svg>

            {/* Real-time 3D Isometric (I), (II), (III) Vector Canvas layered cleanly above the studio table */}
            <canvas ref={editionsCanvasRef} className="story-editions-canvas" aria-hidden="true" />

            {/* Foreground SVG layer for crisp unoccluded CAD dimension callouts & Roman numerals */}
            <svg
              viewBox="0 0 1440 900"
              preserveAspectRatio="xMidYMid slice"
              className="story-room-callouts-svg"
              aria-hidden="true"
            >
              <g ref={roomCalloutsRef} style={{ opacity: 0 }}>
                {[
                  { roman: '(I)', x: 484, y: 472, wLabel: '120', span: 78 },
                  { roman: '(II)', x: 682, y: 468, wLabel: '190', span: 112 },
                  { roman: '(III)', x: 924, y: 462, wLabel: '260', span: 148 },
                ].map((c, idx) => (
                  <g
                    key={c.roman}
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    onClick={() => setSelectedEditionId(PRISM_EDITIONS[idx].id)}
                  >
                    <text
                      x={c.x}
                      y={c.y - 124}
                      textAnchor="middle"
                      fill="#23272B"
                      fontSize="13"
                      fontFamily="Schibsted Grotesk, sans-serif"
                      fontWeight="500"
                    >
                      {c.roman}
                    </text>
                    {/* Vertical height 215mm callout clear of left barrel wall */}
                    <line
                      x1={c.x - c.span * 0.76}
                      y1={c.y - 92}
                      x2={c.x - c.span * 0.76}
                      y2={c.y + 84}
                      stroke="#7D848D"
                      strokeWidth="0.8"
                      strokeDasharray="2 3"
                    />
                    <text
                      x={c.x - c.span * 0.76 - 7}
                      y={c.y + 2}
                      textAnchor="end"
                      fill="#4E565F"
                      fontSize="9.5"
                      fontFamily="IBM Plex Mono, monospace"
                    >
                      215
                    </text>
                    {/* Width 120 / 190 / 260mm isometric base callout clear below front arcs */}
                    <line
                      x1={c.x - c.span * 0.56}
                      y1={c.y + 114}
                      x2={c.x + c.span * 0.62}
                      y2={c.y + 80}
                      stroke="#7D848D"
                      strokeWidth="0.8"
                      strokeDasharray="2 3"
                    />
                    <text
                      x={c.x + 12}
                      y={c.y + 110}
                      textAnchor="middle"
                      fill="#4E565F"
                      fontSize="9.5"
                      fontFamily="IBM Plex Mono, monospace"
                    >
                      {c.wLabel}
                    </text>
                    <text
                      x={c.x + c.span * 0.74}
                      y={c.y + 68}
                      textAnchor="start"
                      fill="#4E565F"
                      fontSize="9.5"
                      fontFamily="IBM Plex Mono, monospace"
                    >
                      50
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
