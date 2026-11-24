import React, { useEffect, useRef, useState } from 'react';
import {
  PRISM_EDITIONS,
  SPIRAL_FRAMES,
  STORY_ORTHO_PLATES,
} from '../data/catalog.js';

export function StoryBand({ onOpenDrawer, onAddItem }) {
  const cadRef = useRef(null);
  const spiralRef = useRef(null);

  const [cadProgress, setCadProgress] = useState(0.32);
  const [spiralProgress, setSpiralProgress] = useState(0.42);
  const [selectedEditionId, setSelectedEditionId] = useState('prism-85');

  const selectedEdition =
    PRISM_EDITIONS.find((ed) => ed.id === selectedEditionId) || PRISM_EDITIONS[2];

  // Scroll-scrubbed progress for Act 2 (1px Optical CAD) & Act 3 (3D Orbital Spiral)
  useEffect(() => {
    let rafId = 0;
    const updateScroll = () => {
      rafId = 0;
      const vh = window.innerHeight || 900;

      if (cadRef.current) {
        const r = cadRef.current.getBoundingClientRect();
        const p = (vh - r.top) / (vh + r.height);
        setCadProgress(Math.min(1, Math.max(0, p)));
      }
      if (spiralRef.current) {
        const r = spiralRef.current.getBoundingClientRect();
        const p = (vh - r.top) / (vh + r.height);
        setSpiralProgress(Math.min(1, Math.max(0, p)));
      }
    };

    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(updateScroll);
    };

    updateScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Derived CAD iris aperture geometry driven smoothly by scroll (T1.4 wide -> T16 closed)
  const irisRotationDeg = (cadProgress - 0.5) * 44;
  const apertureRadius = 38 - Math.sin(cadProgress * Math.PI) * 18;
  const activeTStop = (1.4 + Math.sin(cadProgress * Math.PI) * 10.6).toFixed(1);

  return (
    <section id="story" data-band="paper" className="koma-band story-band">
      {/* ACT 1: Split Monumental Display Headline + 4 Orthographic Studio Plates */}
      <div className="story-act-hero">
        <div className="story-split-headline" aria-label="PRISM O (III) Machined to Hold Pure Optical Light">
          <h2 className="t120 story-headline-line">PRISM O (III)</h2>
          <p className="t120 story-headline-line" aria-hidden="true">
            MACHINED TO HOLD
          </p>
          <p className="t120 story-headline-line" aria-hidden="true">
            PURE OPTICAL LIGHT
          </p>
        </div>

        {/* Central piercing column of 4 museum orthographic studio plates */}
        <div className="story-ortho-column">
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

        {/* 4-column razor-sharp technical dimension rail (WCAG >= 6.5:1 contrast) */}
        <div className="story-dim-rail" aria-label="Optical Specifications">
          <span className="t12 num">OD 95 MM</span>
          <span className="t12 num">L 82 MM</span>
          <span className="t12 num">T1.4 / 9 BLADES</span>
          <span className="t12">PL / LPL MOUNT</span>
        </div>

        {/* Centered Editorial Thesis + understated underlined RESERVE NOW link */}
        <div className="story-thesis-block">
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

      {/* ACT 2: Scroll-Scrubbed 1px Architectural Optical Cross-Section Blueprint */}
      <div ref={cadRef} className="story-act-cad">
        <div className="story-cad-stage">
          <svg
            viewBox="0 0 360 540"
            width="360"
            height="540"
            className="story-cad-svg"
            role="img"
            aria-label="Scroll-interactive architectural 1px CAD plan of KOMA PRISM O (III) tri-barrel cross-section and 9-blade iris diaphragm"
            data-art="optical-cad-blueprint"
          >
            {/* Precision optical center datum axis */}
            <line
              x1="180"
              y1="14"
              x2="180"
              y2="526"
              stroke="#6F7780"
              strokeWidth="0.65"
              strokeDasharray="3 5"
            />

            {/* Three vertical optical barrels (top, center with rotating 9-blade iris, bottom) */}
            {[112, 270, 428].map((cy, idx) => (
              <g key={cy} transform={`translate(180, ${cy})`}>
                {/* Outer titanium chamfer wall */}
                <circle cx="0" cy="0" r="62" fill="none" stroke="#181C20" strokeWidth="1.05" />
                <circle cx="0" cy="0" r="57.5" fill="none" stroke="#4E565F" strokeWidth="0.7" />
                <circle cx="0" cy="0" r="51" fill="none" stroke="#181C20" strokeWidth="0.95" />

                {/* Rotating 9-blade iris diaphragm */}
                <g transform={`rotate(${irisRotationDeg * (idx === 1 ? 1.35 : -0.85)})`}>
                  {Array.from({ length: 9 }).map((_, bi) => {
                    const a0 = (bi / 9) * Math.PI * 2;
                    const a1 = ((bi + 2.3) / 9) * Math.PI * 2;
                    const xOuter = Math.cos(a0) * 50;
                    const yOuter = Math.sin(a0) * 50;
                    const xInner = Math.cos(a1) * apertureRadius;
                    const yInner = Math.sin(a1) * apertureRadius;
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
                    r={apertureRadius.toFixed(1)}
                    fill="none"
                    stroke={idx === 1 ? '#9E430E' : '#181C20'}
                    strokeWidth={idx === 1 ? '1.15' : '0.8'}
                  />
                </g>
              </g>
            ))}

            {/* Two slender optical glass prism coupling rods joining the barrels */}
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

            {/* Snell collimation tangent rays */}
            <line
              x1="54"
              y1={270 - apertureRadius * 0.85}
              x2="306"
              y2={270 + apertureRadius * 0.85}
              stroke="#9E430E"
              strokeWidth="0.75"
              strokeDasharray="4 4"
            />
          </svg>

          <div className="story-cad-meta">
            <span className="t12 num">PLAN SECTION A-A · 1:2 SCALE</span>
            <span className="t12 num">LIVE IRIS T{activeTStop} · 46.5MM CIRCLE</span>
          </div>
        </div>
      </div>

      {/* ACT 3: 3D Orbital Spiral Editorial Gallery across wide-open #EEF0EC paper */}
      <div ref={spiralRef} className="story-act-spiral" aria-label="Archival Optical Gallery">
        <div className="spiral-sticky-viewport">
          <div className="spiral-orbit-stage">
            {SPIRAL_FRAMES.map((frame, index) => {
              const total = SPIRAL_FRAMES.length;
              // Wide airy diagonal 3D orbital helix matching Otto's serene gallery negative space
              const phase = index / total + spiralProgress * 1.1 - 0.55;
              const angle = phase * Math.PI * 2.05;
              const x = Math.sin(angle) * 460 + phase * 320;
              const y = Math.cos(angle) * 195 + phase * 360 - 40;
              const z = Math.cos(angle) * 280 - 120;
              const rotZ = -12 + Math.sin(angle) * 10;
              const rotY = Math.sin(angle) * 24;
              const depthNorm = Math.min(1, Math.max(0, (z + 400) / 560));
              const scale = 0.54 + depthNorm * 0.54;
              const opacity = Math.min(1, Math.max(0.14, depthNorm * 1.1));

              return (
                <figure
                  key={frame.id}
                  className="spiral-frame"
                  style={{
                    transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${rotY.toFixed(1)}deg) rotateZ(${rotZ.toFixed(1)}deg) scale(${scale.toFixed(3)})`,
                    opacity: opacity.toFixed(3),
                    zIndex: Math.round(depthNorm * 30),
                  }}
                >
                  <img
                    src={frame.src}
                    alt={frame.alt}
                    loading="lazy"
                    decoding="async"
                  />
                </figure>
              );
            })}
          </div>
        </div>
      </div>

      {/* ACT 4: Isometric 1px Architectural Optical Bench Size Comparison */}
      <div id="editions" className="story-act-sizes">
        <div className="sizes-canvas-wrap">
          <svg
            viewBox="0 0 1240 620"
            width="1240"
            height="620"
            className="sizes-isometric-svg"
            role="img"
            aria-label="Isometric 1px architectural line drawing comparing KOMA PRISM O modular editions (I) 35mm, (II) 50mm, and (III) 85mm on a studio optical bench"
            data-art="isometric-bench-cad"
          >
            {/* Minimalist architectural gallery wall lines */}
            <line x1="340" y1="68" x2="340" y2="145" stroke="#6F7780" strokeWidth="0.9" />
            <line x1="860" y1="44" x2="860" y2="210" stroke="#6F7780" strokeWidth="0.9" />
            <line x1="200" y1="184" x2="295" y2="152" stroke="#6F7780" strokeWidth="0.9" />
            <line x1="40" y1="352" x2="365" y2="246" stroke="#4E565F" strokeWidth="0.95" />
            <line x1="150" y1="378" x2="365" y2="306" stroke="#4E565F" strokeWidth="0.8" />

            {/* Isometric rounded-corner optical laboratory bench top */}
            <path
              d="M 110 422 C 88 398 112 372 162 355 L 745 198 C 825 178 905 186 968 214 L 1110 282 C 1152 302 1155 338 1105 358 L 542 544 C 455 572 340 568 258 525 Z"
              fill="#EEF0EC"
              stroke="#181C20"
              strokeWidth="1.05"
            />
            {/* Optical bench architectural front leg mullions */}
            <line x1="158" y1="454" x2="158" y2="615" stroke="#4E565F" strokeWidth="0.9" />
            <line x1="296" y1="538" x2="296" y2="615" stroke="#4E565F" strokeWidth="0.9" />
            <line x1="412" y1="564" x2="412" y2="615" stroke="#4E565F" strokeWidth="0.9" />
            <line x1="560" y1="538" x2="560" y2="615" stroke="#4E565F" strokeWidth="0.9" />
            <line x1="652" y1="506" x2="652" y2="615" stroke="#4E565F" strokeWidth="0.9" />
            <line x1="842" y1="444" x2="842" y2="615" stroke="#4E565F" strokeWidth="0.9" />
            <line x1="955" y1="408" x2="955" y2="615" stroke="#4E565F" strokeWidth="0.9" />
            <line x1="1088" y1="364" x2="1088" y2="615" stroke="#4E565F" strokeWidth="0.9" />

            {/* Helper rendered isometric edition stacks: (I) 1-module compact, (II) 2-module mid, (III) 3-module flagship */}
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
                <g key={item.id}>
                  {/* Edition numeral cleanly above tallest back barrel */}
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

                  {/* Dotted dimension callouts for active edition */}
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

                  {/* Draw vertical cylindrical optical modules back-to-front */}
                  {Array.from({ length: item.count })
                    .map((_, idx) => item.count - 1 - idx)
                    .map((idx) => {
                      const cx = item.baseX + idx * dx;
                      const cy = item.baseY + idx * dy;
                      const topY = cy - item.h;
                      return (
                        <g key={idx}>
                          {/* Cylinder body */}
                          <path
                            d={`M ${cx - rx} ${topY} L ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy} L ${cx + rx} ${topY} Z`}
                            fill="#EEF0EC"
                            stroke={strokeCol}
                            strokeWidth={strokeW}
                          />
                          {/* Precision focus collar datum line */}
                          <path
                            d={`M ${cx - rx} ${topY + item.h * 0.46} A ${rx} ${ry} 0 0 0 ${cx + rx} ${topY + item.h * 0.46}`}
                            fill="none"
                            stroke={strokeCol}
                            strokeWidth="0.6"
                          />
                          {/* Chamfered top aperture ellipse */}
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

        {/* Clean architectural edition switcher & live spec line */}
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
                  onClick={() => setSelectedEditionId(ed.id)}
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
    </section>
  );
}
