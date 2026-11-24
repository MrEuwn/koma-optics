import React, { useEffect, useRef } from 'react';
import { createHeroStudioScene } from '../webgl/opticalScenes.js';

export function HeroBand({ stageManager, webglFallback }) {
  const slotRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!stageManager || !slotRef.current) return undefined;
    const descriptor = createHeroStudioScene(pointerRef);
    return stageManager.registerSlot('hero', slotRef.current, descriptor);
  }, [stageManager]);

  const handlePointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointerRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerRef.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  };

  const handlePointerLeave = () => {
    pointerRef.current.x = 0;
    pointerRef.current.y = 0;
  };

  return (
    <section
      id="hero"
      data-band="dark"
      className="koma-band hero-band"
      aria-label="PRISM O (III) Studio Introduction"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Full-bleed darkroom chiaroscuro stage: zero clutter, zero SaaS buttons */}
      <div ref={slotRef} className="hero-stage-canvas-slot">
        {webglFallback && (
          <img
            src="./media/spiral-darkroom.jpg"
            alt="KOMA PRISM O (III) brushed titanium modular cinema lens illuminated by a diagonal darkroom spotlight."
            className="hero-fallback-img"
          />
        )}
      </div>

      {/* Subtle atmospheric darkroom floor radial ambiance backing the WebGL slot */}
      <div className="hero-floor-vignette" aria-hidden="true" />
    </section>
  );
}
