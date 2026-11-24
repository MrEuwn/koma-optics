import React, { useEffect, useRef, useState } from 'react';
import {
  PRISM_EDITIONS,
  SPIRAL_FRAMES,
  STORY_ORTHO_PLATES,
} from '../data/catalog.js';

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function StoryBand({ onOpenDrawer, onAddItem }) {
  // Pinned scroll track refs (driven directly at 60fps via RAF, zero per-frame React re-renders)
  const act1TrackRef = useRef(null);
  const act1HeadlineRef = useRef(null);
  const act1StripRef = useRef(null);
  const act1DimsRef = useRef(null);
  const act1ThesisRef = useRef(null);

  const act2TrackRef = useRef(null);
  const act2PhotoRef = useRef(null);
  const act2BlueprintRef = useRef(null);
  const act2IrisGroupRefs = useRef([]);
  const act2SnellRef = useRef(null);
  const act2MetaRef = useRef(null);

  const act3TrackRef = useRef(null);
  const act3FrameRefs = useRef([]);

  const act4TrackRef = useRef(null);
  const act4CanvasRef = useRef(null);

  const [activeTStop, setActiveTStop] = useState('1.4');
  const [selectedEditionId, setSelectedEditionId] = useState('prism-85');
  const userLockedEditionRef = useRef(false);
  const lastTStopRef = useRef('1.4');
  const lastAutoEditionRef = useRef('prism-85');

  const selectedEdition =
    PRISM_EDITIONS.find((ed) => ed.id === selectedEditionId) || PRISM_EDITIONS[2];

  const handleSelectEdition = (editionId) => {
    userLockedEditionRef.current = true;
    setSelectedEditionId(editionId);
  };

  // Smooth damped 60fps Obys scroll choreography across all 4 Story Acts
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const smooth = { p1: 0, p2: 0, p3: 0, p4: 0 };
    let rafId = 0;

    const trackProgress = (el) => {
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 900;
      const travel = Math.max(1, rect.height - vh);
      return clamp01(-rect.top / travel);
    };

    const applyChoreography = (immediate = false) => {
      const isMobile = window.innerWidth < 768;
      if (isMobile || reducedMotion) {
        if (act1StripRef.current) act1StripRef.current.style.transform = '';
        if (act1HeadlineRef.current) {
          act1HeadlineRef.current.style.transform = '';
          act1HeadlineRef.current.style.opacity = '1';
        }
        if (act1DimsRef.current) act1DimsRef.current.style.opacity = '1';
        if (act1ThesisRef.current) {
          act1ThesisRef.current.style.transform = '';
          act1ThesisRef.current.style.opacity = '1';
        }
        if (act2PhotoRef.current) act2PhotoRef.current.style.opacity = '0';
        if (act2BlueprintRef.current) {
          act2BlueprintRef.current.style.transform = '';
          act2BlueprintRef.current.style.opacity = '1';
        }
        if (act4CanvasRef.current) act4CanvasRef.current.style.transform = '';
        return;
      }

      const raw1 = trackProgress(act1TrackRef.current);
      const raw2 = trackProgress(act2TrackRef.current);
      const raw3 = trackProgress(act3TrackRef.current);
      const raw4 = trackProgress(act4TrackRef.current);

      const lerp = immediate ? 1 : 0.14;
      smooth.p1 += (raw1 - smooth.p1) * lerp;
      smooth.p2 += (raw2 - smooth.p2) * lerp;
      smooth.p3 += (raw3 - smooth.p3) * lerp;
      smooth.p4 += (raw4 - smooth.p4) * lerp;

      // -----------------------------------------------------------------------
      // ACT 1: Pinned Monumental Split Headline + Orthographic Filmstrip Glide
      // -----------------------------------------------------------------------
      const p1 = smooth.p1;
      const vh = window.innerHeight || 900;

      // Filmstrip enters below headline, pierces straight up through the giant type, exits smoothly
      const stripProgress = clamp01(p1 / 0.78);
      const stripY = (0.38 - stripProgress * 1.48) * vh;
      if (act1StripRef.current) {
        act1StripRef.current.style.transform = `translate3d(0, ${stripY.toFixed(1)}px, 0)`;
      }

      // Headline & outer dimension rail gently settle out as editorial thesis rises at p1 > 0.68
      const headFade = 1 - clamp01((p1 - 0.62) / 0.22);
      const headDriftY = -clamp01((p1 - 0.58) / 0.34) * 56;
      if (act1HeadlineRef.current) {
        act1HeadlineRef.current.style.opacity = headFade.toFixed(3);
        act1HeadlineRef.current.style.transform = `translate3d(0, ${headDriftY.toFixed(1)}px, 0)`;
      }
      if (act1DimsRef.current) {
        act1DimsRef.current.style.opacity = headFade.toFixed(3);
      }

      // Editorial thesis & RESERVE NOW emerge cleanly in center stage at end of Act 1
      const thesisIn = easeOutCubic(clamp01((p1 - 0.68) / 0.24));
      if (act1ThesisRef.current) {
        act1ThesisRef.current.style.opacity = thesisIn.toFixed(3);
        act1ThesisRef.current.style.transform = `translate3d(0, ${((1 - thesisIn) * 44).toFixed(1)}px, 0)`;
        act1ThesisRef.current.style.pointerEvents = thesisIn > 0.45 ? 'auto' : 'none';
      }

      // -----------------------------------------------------------------------
      // ACT 2: Pinned Top-Down Photo -> 1px CAD Blueprint Morph & 90deg Spin
      // -----------------------------------------------------------------------
      const p2 = smooth.p2;
      // Phase A (0.00 -> 0.28): Top-down photo enters & dissolves cleanly into CAD blueprint
      const photoOpacity = p2 < 0.08
        ? easeOutCubic(p2 / 0.08)
        : 1 - easeInOutCubic(clamp01((p2 - 0.14) / 0.18));
      const photoScale = 0.72 + easeOutCubic(clamp01(p2 / 0.28)) * 0.36;
      if (act2PhotoRef.current) {
        act2PhotoRef.current.style.opacity = clamp01(photoOpacity).toFixed(3);
        act2PhotoRef.current.style.transform = `scale(${photoScale.toFixed(3)})`;
      }

      // Phase B (0.18 -> 0.86): 1px CAD Blueprint emerges, rotates 0 -> 90deg, scales gracefully
      const bpIn = easeOutCubic(clamp01((p2 - 0.14) / 0.18));
      const bpOut = 1 - easeInOutCubic(clamp01((p2 - 0.86) / 0.14));
      const bpOpacity = bpIn * bpOut;
      const spinPhase = easeInOutCubic(clamp01((p2 - 0.26) / 0.56));
      const bpRotateDeg = spinPhase * 90;
      const bpScale = 0.82 + bpIn * 0.22 - (1 - bpOut) * 0.14;

      if (act2BlueprintRef.current) {
        act2BlueprintRef.current.style.opacity = bpOpacity.toFixed(3);
        act2BlueprintRef.current.style.transform = `rotate(${bpRotateDeg.toFixed(2)}deg) scale(${bpScale.toFixed(3)})`;
      }

      // Synchronized 9-blade iris rotation + Snell ray shift
      const irisPhase = Math.sin(clamp01((p2 - 0.18) / 0.72) * Math.PI);
      const irisDeg = spinPhase * 62;
      act2IrisGroupRefs.current.forEach((g, idx) => {
        if (!g) return;
        const mult = idx === 1 ? 1.35 : -0.9;
        const irisScale = 1 - irisPhase * 0.22;
        g.setAttribute(
          'transform',
          `rotate(${(irisDeg * mult).toFixed(2)}) scale(${irisScale.toFixed(3)})`
        );
      });

      if (act2SnellRef.current) {
        const offset = 34 - irisPhase * 18;
        act2SnellRef.current.setAttribute('y1', (270 - offset).toFixed(1));
        act2SnellRef.current.setAttribute('y2', (270 + offset).toFixed(1));
      }

      if (act2MetaRef.current) {
        act2MetaRef.current.style.opacity = bpOpacity.toFixed(3);
      }

      const nextTStop = (1.4 + irisPhase * 10.6).toFixed(1);
      if (nextTStop !== lastTStopRef.current) {
        lastTStopRef.current = nextTStop;
        setActiveTStop(nextTStop);
      }

      // -----------------------------------------------------------------------
      // ACT 3: Pinned 3D Orbital Diagonal Helix Flight (Otto .gallery soul)
      // -----------------------------------------------------------------------
      const p3 = smooth.p3;
      const total = SPIRAL_FRAMES.length;
      const vw = window.innerWidth || 1440;
      const spreadX = Math.min(vw * 0.44, 620);
      const spreadY = Math.min(vh * 0.36, 320);

      for (let i = 0; i < total; i += 1) {
        const node = act3FrameRefs.current[i];
        if (!node) continue;
        // Each card flies sequentially along a graceful centered 3D diagonal spiral from back-right -> center foreground -> bottom-left
        const slotCenter = (i + 0.5) / total;
        const delta = (p3 * 1.16 - 0.08) - slotCenter;
        const norm = delta / 0.42;
        const clampedNorm = Math.max(-1.35, Math.min(1.35, norm));

        const theta = clampedNorm * Math.PI * 1.05 + i * 0.52;
        const x = -clampedNorm * spreadX * 1.05 + Math.sin(theta) * (spreadX * 0.34);
        const y = clampedNorm * spreadY * 0.92 - Math.cos(theta) * (spreadY * 0.36);
        const z = (1 - Math.abs(clampedNorm)) * 320 - 180 + Math.cos(theta) * 80;
        const rotY = -clampedNorm * 22 + Math.sin(theta) * 12;
        const rotZ = -11 + clampedNorm * 12 + Math.cos(theta) * 5;

        const life = clamp01(1 - Math.abs(norm));
        const bell = Math.sin(life * Math.PI * 0.5);
        const scale = 0.38 + bell * 0.82;
        const opacity = norm < -1.05 || norm > 1.05 ? 0 : Math.pow(bell, 1.1);

        node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${rotY.toFixed(1)}deg) rotateZ(${rotZ.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
        node.style.opacity = opacity.toFixed(3);
        node.style.zIndex = String(Math.round(bell * 40));
      }

      // -----------------------------------------------------------------------
      // ACT 4: Pinned Isometric CAD Room Scrub + Progressive Edition Stepping
      // -----------------------------------------------------------------------
      const p4 = smooth.p4;
      if (act4CanvasRef.current) {
        const roomScale = 0.93 + easeOutCubic(clamp01(p4 / 0.45)) * 0.07;
        const roomY = (1 - easeOutCubic(clamp01(p4 / 0.4))) * 26;
        act4CanvasRef.current.style.transform = `translate3d(0, ${roomY.toFixed(1)}px, 0) scale(${roomScale.toFixed(3)})`;
      }

      if (!userLockedEditionRef.current) {
        const autoEd = p4 < 0.34 ? 'prism-35' : p4 < 0.68 ? 'prism-50' : 'prism-85';
        if (autoEd !== lastAutoEditionRef.current) {
          lastAutoEditionRef.current = autoEd;
          setSelectedEditionId(autoEd);
        }
      }
    };

    applyChoreography(true);

    const loop = () => {
      applyChoreography(false);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section id="story" data-band="paper" className="koma-band story-band">
      {/* ACT 1: Pinned Monumental Split Headline + Rising Orthographic Filmstrip */}
      <div ref={act1TrackRef} className="story-act-hero-track">
        <div className="story-act-hero-sticky">
          <div
            ref={act1HeadlineRef}
            className="story-split-headline"
            aria-label="PRISM O (III) Machined to Hold Pure Optical Light"
          >
            <h2 className="t120 story-headline-line">PRISM O (III)</h2>
            <p className="t120 story-headline-line" aria-hidden="true">
              MACHINED TO HOLD
            </p>
            <p className="t120 story-headline-line" aria-hidden="true">
              PURE OPTICAL LIGHT
            </p>
          </div>

          {/* 4-column razor-sharp technical dimension rail pinned at outer edges */}
          <div ref={act1DimsRef} className="story-dim-rail" aria-label="Optical Specifications">
            <span className="t12 num">OD 95 MM</span>
            <span className="t12 num">L 82 MM</span>
            <span className="t12 num">T1.4 / 9 BLADES</span>
            <span className="t12">PL / LPL MOUNT</span>
          </div>

          {/* Piercing vertical filmstrip of 4 museum orthographic studio plates gliding through the split */}
          <div ref={act1StripRef} className="story-ortho-column">
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

          {/* Editorial thesis emerging smoothly in center stage as filmstrip clears */}
          <div ref={act1ThesisRef} className="story-thesis-block">
            <p className="t30 story-thesis-copy">
              THE FIRST MODULAR CINEMA INSTRUMENT BY KOMA OPTICS. GRADE-5 TITANIUM
              AND SCHOTT GLASS, MACHINED FOR ABSOLUTE OPTICAL CLARITY.
            </p>
            <button
              type="button"
              className="editorial-link story-reserve-link"
              onClick={(e) => onOpenDrawer(e.currentTarget)}
            >
              RESERVE NOW
            </button>
          </div>
        </div>
      </div>

      {/* ACT 2: Pinned Top-Down Photo -> 1px Architectural Optical CAD Blueprint Morph & Spin */}
      <div ref={act2TrackRef} className="story-act-cad-track">
        <div className="story-cad-sticky">
          <div className="story-cad-stage">
            <div className="story-cad-morph-stack">
              {/* Top-down physical optical plate morphing into 1px CAD plan */}
              <img
                ref={act2PhotoRef}
                src="./media/plate-ortho-top.jpg"
                alt="Top-down orthographic studio photograph of KOMA PRISM O (III) tri-barrel glass elements"
                className="story-cad-photo-morph"
                loading="eager"
                decoding="async"
              />

              <div ref={act2BlueprintRef} className="story-cad-blueprint-layer">
                <svg
                  viewBox="0 0 360 540"
                  width="360"
                  height="540"
                  className="story-cad-svg"
                  role="img"
                  aria-label="Scroll-interactive architectural 1px CAD plan of KOMA PRISM O (III) tri-barrel cross-section and 9-blade iris diaphragm"
                  data-art="optical-cad-blueprint"
                >
                  <line
                    x1="180"
                    y1="14"
                    x2="180"
                    y2="526"
                    stroke="#6F7780"
                    strokeWidth="0.65"
                    strokeDasharray="3 5"
                  />

                  {[112, 270, 428].map((cy, idx) => (
                    <g key={cy} transform={`translate(180, ${cy})`}>
                      <circle cx="0" cy="0" r="62" fill="none" stroke="#181C20" strokeWidth="1.05" />
                      <circle cx="0" cy="0" r="57.5" fill="none" stroke="#4E565F" strokeWidth="0.7" />
                      <circle cx="0" cy="0" r="51" fill="none" stroke="#181C20" strokeWidth="0.95" />

                      <g
                        ref={(el) => {
                          act2IrisGroupRefs.current[idx] = el;
                        }}
                      >
                        {Array.from({ length: 9 }).map((_, bi) => {
                          const a0 = (bi / 9) * Math.PI * 2;
                          const a1 = ((bi + 2.3) / 9) * Math.PI * 2;
                          const xOuter = Math.cos(a0) * 50;
                          const yOuter = Math.sin(a0) * 50;
                          const xInner = Math.cos(a1) * 32;
                          const yInner = Math.sin(a1) * 32;
                          return (
                            <line
                              key={bi}
                              x1={xOuter.toFixed(1)}
                              y1={yOuter.toFixed(1)}
                              x2={xInner.toFixed(1)}
                              y2={yInner.toFixed(1)}
                              stroke="#4E565F"
                              strokeWidth="0.72"
                            />
                          );
                        })}
                        <circle
                          cx="0"
                          cy="0"
                          r="32"
                          fill="none"
                          stroke={idx === 1 ? '#9E430E' : '#181C20'}
                          strokeWidth={idx === 1 ? '1.15' : '0.8'}
                        />
                      </g>
                    </g>
                  ))}

                  {[191, 349].map((cy) => (
                    <g key={cy} transform={`translate(180, ${cy})`}>
                      <circle cx="0" cy="0" r="16.5" fill="#EEF0EC" stroke="#181C20" strokeWidth="1" />
                      <circle cx="0" cy="0" r="12.5" fill="none" stroke="#4E565F" strokeWidth="0.7" />
                      <path
                        d="M -26 -14 Q -16 0 -26 14 M 26 -14 Q 16 0 26 14"
                        fill="none"
                        stroke="#181C20"
                        strokeWidth="0.85"
                      />
                    </g>
                  ))}

                  <line
                    ref={act2SnellRef}
                    x1="54"
                    y1="236"
                    x2="306"
                    y2="304"
                    stroke="#9E430E"
                    strokeWidth="0.75"
                    strokeDasharray="4 4"
                  />
                </svg>
              </div>
            </div>

            <div ref={act2MetaRef} className="story-cad-meta">
              <span className="t12 num">PLAN SECTION A-A · 1:2 SCALE</span>
              <span className="t12 num">LIVE IRIS T{activeTStop} · 46.5MM CIRCLE</span>
            </div>
          </div>
        </div>
      </div>

      {/* ACT 3: Pinned 3D Orbital Diagonal Helix Gallery across wide-open #EEF0EC paper */}
      <div ref={act3TrackRef} className="story-act-spiral" aria-label="Archival Optical Gallery">
        <div className="spiral-sticky-viewport">
          <div className="spiral-orbit-stage">
            {SPIRAL_FRAMES.map((frame, index) => (
              <figure
                key={frame.id}
                ref={(el) => {
                  act3FrameRefs.current[index] = el;
                }}
                className="spiral-frame"
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
        </div>
      </div>

      {/* ACT 4: Pinned Isometric 1px Architectural Optical Bench Size Comparison */}
      <div id="editions" ref={act4TrackRef} className="story-act-sizes-track">
        <div className="story-act-sizes-sticky">
          <div ref={act4CanvasRef} className="sizes-canvas-wrap">
            <svg
              viewBox="0 0 1240 620"
              width="1240"
              height="620"
              className="sizes-isometric-svg"
              role="img"
              aria-label="Isometric 1px architectural line drawing comparing KOMA PRISM O modular editions (I) 35mm, (II) 50mm, and (III) 85mm on a studio optical bench"
              data-art="isometric-bench-cad"
            >
              <line x1="340" y1="68" x2="340" y2="145" stroke="#6F7780" strokeWidth="0.9" />
              <line x1="860" y1="44" x2="860" y2="210" stroke="#6F7780" strokeWidth="0.9" />
              <line x1="200" y1="184" x2="295" y2="152" stroke="#6F7780" strokeWidth="0.9" />
              <line x1="40" y1="352" x2="365" y2="246" stroke="#4E565F" strokeWidth="0.95" />
              <line x1="150" y1="378" x2="365" y2="306" stroke="#4E565F" strokeWidth="0.8" />

              <path
                d="M 110 422 C 88 398 112 372 162 355 L 745 198 C 825 178 905 186 968 214 L 1110 282 C 1152 302 1155 338 1105 358 L 542 544 C 455 572 340 568 258 525 Z"
                fill="#EEF0EC"
                stroke="#181C20"
                strokeWidth="1.05"
              />
              <line x1="158" y1="454" x2="158" y2="615" stroke="#4E565F" strokeWidth="0.9" />
              <line x1="296" y1="538" x2="296" y2="615" stroke="#4E565F" strokeWidth="0.9" />
              <line x1="412" y1="564" x2="412" y2="615" stroke="#4E565F" strokeWidth="0.9" />
              <line x1="560" y1="538" x2="560" y2="615" stroke="#4E565F" strokeWidth="0.9" />
              <line x1="652" y1="506" x2="652" y2="615" stroke="#4E565F" strokeWidth="0.9" />
              <line x1="842" y1="444" x2="842" y2="615" stroke="#4E565F" strokeWidth="0.9" />
              <line x1="955" y1="408" x2="955" y2="615" stroke="#4E565F" strokeWidth="0.9" />
              <line x1="1088" y1="364" x2="1088" y2="615" stroke="#4E565F" strokeWidth="0.9" />

              {[
                { id: 'prism-35', label: '(I)', baseX: 375, baseY: 425, count: 2, h: 158, len: '82' },
                { id: 'prism-50', label: '(II)', baseX: 548, baseY: 424, count: 3, h: 176, len: '96' },
                { id: 'prism-85', label: '(III)', baseX: 742, baseY: 422, count: 4, h: 196, len: '118' },
              ].map((item) => {
                const isSelected = selectedEditionId === item.id;
                const strokeCol = isSelected ? '#9E430E' : '#181C20';
                const strokeW = isSelected ? 1.45 : 0.95;
                const dx = 42;
                const dy = -12;
                const rx = 22;
                const ry = 8.5;

                return (
                  <g
                    key={item.id}
                    className="sizes-iso-group"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSelectEdition(item.id)}
                  >
                    <text
                      x={item.baseX + ((item.count - 1) * dx) / 2}
                      y={item.baseY + (item.count - 1) * dy - item.h - 24}
                      textAnchor="middle"
                      fill={strokeCol}
                      fontSize="13"
                      fontFamily="IBM Plex Mono, monospace"
                      fontWeight={isSelected ? '500' : '400'}
                    >
                      {item.label}
                    </text>

                    {isSelected && (
                      <g>
                        <line
                          x1={item.baseX - 38}
                          y1={item.baseY - item.h}
                          x2={item.baseX - 38}
                          y2={item.baseY}
                          stroke="#9E430E"
                          strokeWidth="0.85"
                          strokeDasharray="2 3"
                        />
                        <text
                          x={item.baseX - 46}
                          y={item.baseY - item.h / 2}
                          textAnchor="end"
                          fill="#9E430E"
                          fontSize="11"
                          fontFamily="IBM Plex Mono, monospace"
                        >
                          {item.len}MM
                        </text>
                        <line
                          x1={item.baseX - rx}
                          y1={item.baseY + 22}
                          x2={item.baseX + (item.count - 1) * dx + rx}
                          y2={item.baseY + (item.count - 1) * dy + 22}
                          stroke="#9E430E"
                          strokeWidth="0.85"
                          strokeDasharray="2 3"
                        />
                        <text
                          x={item.baseX + ((item.count - 1) * dx) / 2 + 12}
                          y={item.baseY + 38}
                          textAnchor="middle"
                          fill="#9E430E"
                          fontSize="11"
                          fontFamily="IBM Plex Mono, monospace"
                        >
                          OD 95MM
                        </text>
                      </g>
                    )}

                    {Array.from({ length: item.count })
                      .map((_, idx) => item.count - 1 - idx)
                      .map((idx) => {
                        const cx = item.baseX + idx * dx;
                        const cy = item.baseY + idx * dy;
                        const topY = cy - item.h;
                        return (
                          <g key={idx}>
                            <path
                              d={`M ${cx - rx} ${topY} L ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy} L ${cx + rx} ${topY} Z`}
                              fill="#EEF0EC"
                              stroke={strokeCol}
                              strokeWidth={strokeW}
                            />
                            <path
                              d={`M ${cx - rx} ${topY + item.h * 0.46} A ${rx} ${ry} 0 0 0 ${cx + rx} ${topY + item.h * 0.46}`}
                              fill="none"
                              stroke={strokeCol}
                              strokeWidth="0.6"
                            />
                            <ellipse
                              cx={cx}
                              cy={topY}
                              rx={rx}
                              ry={ry}
                              fill="#EEF0EC"
                              stroke={strokeCol}
                              strokeWidth={strokeW}
                            />
                            <ellipse
                              cx={cx}
                              cy={topY}
                              rx={rx * 0.76}
                              ry={ry * 0.7}
                              fill="none"
                              stroke={strokeCol}
                              strokeWidth="0.65"
                            />
                          </g>
                        );
                      })}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="sizes-controls-bar">
            <div className="sizes-switcher" role="tablist" aria-label="Select PRISM O modular edition">
              {PRISM_EDITIONS.map((ed) => {
                const active = ed.id === selectedEditionId;
                return (
                  <button
                    key={ed.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`sizes-tab t12 ${active ? 'sizes-tab--active' : ''}`}
                    onClick={() => handleSelectEdition(ed.id)}
                  >
                    {ed.roman} {ed.focal}
                  </button>
                );
              })}
            </div>

            <div className="sizes-live-readout">
              <p className="t12 num sizes-live-dims">{selectedEdition.dimsLabel}</p>
              <p className="t16 sizes-live-note">{selectedEdition.note}</p>
            </div>

            <div className="sizes-live-cta">
              <span className="t12 num sizes-live-price">
                FROM ${selectedEdition.priceUsd.toLocaleString('en-US')}
              </span>
              <button
                type="button"
                className="editorial-link"
                onClick={(e) => onAddItem(selectedEdition.id, e.currentTarget)}
              >
                RESERVE {selectedEdition.code}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
