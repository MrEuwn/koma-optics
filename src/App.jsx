import React, { useCallback, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { WebGLStageManager } from './webgl/WebGLStageManager.js';
import { Header, KomaMarkSvg } from './components/Header.jsx';
import { HeroBand } from './components/HeroBand.jsx';
import { StoryBand } from './components/StoryBand.jsx';
import { CollectionBand } from './components/CollectionBand.jsx';
import { FilterBenchBand } from './components/FilterBenchBand.jsx';
import { FooterBand } from './components/FooterBand.jsx';
import { ReservationDrawer } from './components/ReservationDrawer.jsx';

export default function App() {
  const canvasRef = useRef(null);
  const headerTriggerRef = useRef(null);
  const lastTriggerRef = useRef(null);
  const heroProgressRef = useRef(0);

  const [stageManager, setStageManager] = useState(null);
  const [webglFallback, setWebglFallback] = useState(false);
  const [headerTheme, setHeaderTheme] = useState('dark');
  const [headerHiddenInFooter, setHeaderHiddenInFooter] = useState(false);
  const [heroScrollProgress, setHeroScrollProgress] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [curtainPhase, setCurtainPhase] = useState(() => {
    if (typeof window === 'undefined') return 'done';
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'done'
      : 'hold';
  });

  // Start clean at 0 items matching Otto's CART ( 0 ) restraint; adding opens drawer
  const [cartItems, setCartItems] = useState({});
  const [mountedFilters, setMountedFilters] = useState({
    amber: false,
    anamorphic: false,
    mist: false,
  });

  // Fast architectural darkroom curtain reveal (~1.05s total; non-blocking & skipped on reduced motion)
  useEffect(() => {
    if (curtainPhase === 'done') return undefined;
    const tLift = window.setTimeout(() => setCurtainPhase('lift'), 380);
    const tDone = window.setTimeout(() => setCurtainPhase('done'), 1080);
    return () => {
      window.clearTimeout(tLift);
      window.clearTimeout(tDone);
    };
  }, []);

  // Single-context WebGL2 Scissor Stage Manager (ZERO context exhaustion)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const manager = new WebGLStageManager(canvas, {
      onFallbackChange: (flag) => setWebglFallback(flag),
    });
    setStageManager(manager);

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = (ev) => manager.setReducedMotion(ev.matches);
    mediaQuery.addEventListener('change', onMotionChange);

    return () => {
      mediaQuery.removeEventListener('change', onMotionChange);
      manager.dispose();
      setStageManager(null);
    };
  }, []);

  // Lenis museum-weight smooth scroll (respecting prefers-reduced-motion)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return undefined;

    const lenis = new Lenis({
      duration: 1.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    let rafId = 0;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  // Adaptive dark <-> paper Header theme & Hero H1 scroll-scale morph
  useEffect(() => {
    let rafId = 0;
    const syncHeader = () => {
      rafId = 0;
      const vh = window.innerHeight || 900;
      setHeroScrollProgress(Math.min(1, Math.max(0, window.scrollY / vh)));
      heroProgressRef.current = Math.min(1, Math.max(0, window.scrollY / vh));

      const footerEl = document.querySelector('#footer');
      if (footerEl) {
        const fr = footerEl.getBoundingClientRect();
        setHeaderHiddenInFooter(fr.top <= vh * 0.28);
      }

      const bands = [...document.querySelectorAll('[data-band]')].reverse();
      const probeY = 34;
      for (const el of bands) {
        const r = el.getBoundingClientRect();
        if (r.top <= probeY && r.bottom > probeY) {
          setHeaderTheme(el.getAttribute('data-band') === 'paper' ? 'paper' : 'dark');
          return;
        }
      }
    };

    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(syncHeader);
    };

    syncHeader();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const totalItems = Object.values(cartItems).reduce((sum, n) => sum + n, 0);

  const openDrawer = useCallback((triggerEl = null) => {
    lastTriggerRef.current =
      triggerEl || document.activeElement || headerTriggerRef.current;
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    requestAnimationFrame(() => {
      const target = lastTriggerRef.current || headerTriggerRef.current;
      target?.focus?.();
    });
  }, []);

  const addItemAndOpen = useCallback(
    (itemId, triggerEl) => {
      setCartItems((prev) => ({
        ...prev,
        [itemId]: (prev[itemId] || 0) + 1,
      }));
      openDrawer(triggerEl);
    },
    [openDrawer]
  );

  const addItemInDrawer = useCallback((itemId) => {
    setCartItems((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  }, []);

  const updateItemQty = useCallback((itemId, delta) => {
    setCartItems((prev) => {
      const next = (prev[itemId] || 0) + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  }, []);

  const removeItem = useCallback((itemId) => {
    setCartItems((prev) => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  }, []);

  const toggleBenchFilter = useCallback((filterId) => {
    setMountedFilters((prev) => ({
      ...prev,
      [filterId]: !prev[filterId],
    }));
  }, []);

  const clearBenchFilters = useCallback(() => {
    setMountedFilters({ amber: false, anamorphic: false, mist: false });
  }, []);

  return (
    <>
      {curtainPhase !== 'done' && (
        <div
          className={`koma-curtain ${curtainPhase === 'lift' ? 'koma-curtain--lift' : ''}`}
          aria-hidden="true"
        >
          <div className="koma-curtain__center">
            <KomaMarkSvg className="koma-curtain__mark" />
            <span className="t12 num koma-curtain__code">01 / PRISM O (III)</span>
          </div>
        </div>
      )}

      <canvas
        id="koma-webgl-stage"
        ref={canvasRef}
        aria-hidden="true"
        data-hidden={webglFallback ? 'true' : 'false'}
      />

      <Header
        theme={headerTheme}
        hidden={headerHiddenInFooter}
        scrollProgress={heroScrollProgress}
        totalItems={totalItems}
        triggerRef={headerTriggerRef}
        onOpenDrawer={(e) => openDrawer(e.currentTarget)}
      />

      <main>
        <HeroBand
          stageManager={stageManager}
          webglFallback={webglFallback}
          scrollProgressRef={heroProgressRef}
        />

        <StoryBand
          onOpenDrawer={openDrawer}
          onAddItem={addItemAndOpen}
        />

        <CollectionBand onReserveItem={addItemAndOpen} />

        <FilterBenchBand
          stageManager={stageManager}
          webglFallback={webglFallback}
          mountedFilters={mountedFilters}
          onToggleFilter={toggleBenchFilter}
          onClearFilters={clearBenchFilters}
          onOpenDrawer={openDrawer}
        />
      </main>

      <FooterBand onOpenDrawer={openDrawer} />

      <ReservationDrawer
        isOpen={drawerOpen}
        items={cartItems}
        mountedFilters={mountedFilters}
        onClose={closeDrawer}
        onAddItem={addItemInDrawer}
        onUpdateQty={updateItemQty}
        onRemoveItem={removeItem}
      />
    </>
  );
}
