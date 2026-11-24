import * as THREE from 'three';

/**
 * Generates a smooth, continuous photographic studio softbox Equirectangular HDRI
 * using Gaussian softbox light lobes + gentle floor bounce.
 * Unlike sharp geometric light cards (which cause hard zebra stripes on cylinders),
 * smooth continuous studio gradients produce authentic Phase One satin brushed-titanium
 * sheen matching luxury industrial object monographs.
 */
export function buildSmoothStudioEnvTexture(renderer, { darkStudio = true } = {}) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Vertical studio cyclorama gradient (ceiling -> soft horizon -> lit studio floor)
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  if (darkStudio) {
    bg.addColorStop(0.0, '#1C2128');
    bg.addColorStop(0.28, '#101419');
    bg.addColorStop(0.54, '#0A0D11');
    bg.addColorStop(0.76, '#282F36');
    bg.addColorStop(1.0, '#969DA3');
  } else {
    bg.addColorStop(0.0, '#E8EBE6');
    bg.addColorStop(0.32, '#C8CDC8');
    bg.addColorStop(0.55, '#787E84');
    bg.addColorStop(0.75, '#B6BCB8');
    bg.addColorStop(1.0, '#E2E5E0');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const addSoftbox = (cx, cy, rx, ry, innerCol, midCol) => {
    ctx.save();
    ctx.translate(cx * w, cy * h);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * w);
    g.addColorStop(0.0, innerCol);
    g.addColorStop(0.38, midCol);
    g.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx * w, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  if (darkStudio) {
    // Primary large left-front photographic softbox (broad smooth silvery highlight across titanium cylinders)
    addSoftbox(0.24, 0.44, 0.18, 0.42, 'rgba(255,255,255,0.98)', 'rgba(220,228,236,0.52)');
    // Soft secondary right rim diffuser for sculptural edge separation
    addSoftbox(0.72, 0.46, 0.14, 0.38, 'rgba(232,239,246,0.82)', 'rgba(165,176,188,0.32)');
    // Warm subtle floor bounce reflection along lower band
    addSoftbox(0.46, 0.84, 0.28, 0.22, 'rgba(225,228,224,0.72)', 'rgba(140,148,154,0.22)');
    // Delicate rear rim fill
    addSoftbox(0.50, 0.20, 0.24, 0.16, 'rgba(186,198,214,0.45)', 'rgba(90,104,120,0.12)');
  } else {
    // Gallery light-tent: broad bright left & right diffusers + subtle soft negative fill center-right
    addSoftbox(0.20, 0.44, 0.22, 0.46, 'rgba(255,255,255,0.98)', 'rgba(240,242,238,0.62)');
    addSoftbox(0.78, 0.44, 0.20, 0.44, 'rgba(248,250,247,0.92)', 'rgba(220,224,220,0.48)');
    // Soft organic shadow flag (gentle sculptural modeling, never harsh black stripe!)
    addSoftbox(0.50, 0.48, 0.11, 0.36, 'rgba(38,42,48,0.68)', 'rgba(72,78,84,0.26)');
    addSoftbox(0.02, 0.48, 0.09, 0.34, 'rgba(46,50,56,0.52)', 'rgba(84,90,96,0.20)');
  }

  const eqTex = new THREE.CanvasTexture(canvas);
  eqTex.mapping = THREE.EquirectangularReflectionMapping;
  eqTex.colorSpace = THREE.SRGBColorSpace;

  const envRT = pmrem.fromEquirectangular(eqTex);
  eqTex.dispose();
  pmrem.dispose();
  return envRT;
}

export class WebGLStageManager {
  constructor(canvas, { onFallbackChange } = {}) {
    this.canvas = canvas;
    this.onFallbackChange = onFallbackChange;
    this.slots = new Map();
    this.rafId = 0;
    this.lastTime = 0;
    this.isFallback = false;
    this.studioEnvRT = null;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._onResize = this.resize.bind(this);
    this._onContextLost = this.handleContextLost.bind(this);
    this._tick = this.tick.bind(this);

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const slot = this.slots.get(entry.target.dataset.webglSlot);
        if (!slot) continue;
        const rect = entry.target.getBoundingClientRect();
        slot.rect = rect;
        slot.onResize?.(rect.width, rect.height, slot);
      }
    });

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const slot = this.slots.get(entry.target.dataset.webglSlot);
          if (slot) slot.inView = entry.isIntersecting;
        }
      },
      { rootMargin: '320px 0px', threshold: 0 }
    );

    this.initRenderer();
  }

  initRenderer() {
    const attrs = {
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    };
    const gl =
      this.canvas.getContext('webgl2', attrs) ||
      this.canvas.getContext('webgl', attrs);

    if (!gl) {
      this.activateFallback('WebGL context unavailable');
      return;
    }

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        context: gl,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.18;
      this.renderer.autoClear = false;

      this.studioEnvRT = buildSmoothStudioEnvTexture(this.renderer, { darkStudio: true });

      this.canvas.addEventListener('webglcontextlost', this._onContextLost, false);
      window.addEventListener('resize', this._onResize, { passive: true });
      this.resize();
      this.lastTime = performance.now();
      this.rafId = requestAnimationFrame(this._tick);
    } catch {
      this.activateFallback('Renderer initialization failed');
    }
  }

  handleContextLost(event) {
    event.preventDefault();
    this.activateFallback('webglcontextlost');
  }

  activateFallback() {
    if (this.isFallback) return;
    this.isFallback = true;
    cancelAnimationFrame(this.rafId);
    this.onFallbackChange?.(true);
  }

  setReducedMotion(flag) {
    this.reducedMotion = Boolean(flag);
  }

  resize() {
    if (!this.renderer || this.isFallback) return;
    const isMobile = window.innerWidth <= 768;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2.0);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);

    for (const slot of this.slots.values()) {
      const rect = slot.element.getBoundingClientRect();
      slot.rect = rect;
      slot.onResize?.(rect.width, rect.height, slot);
    }
  }

  registerSlot(id, element, { scene, camera, onUpdate, onResize, onDispose }) {
    element.dataset.webglSlot = id;
    if (this.studioEnvRT && !scene.environment) {
      scene.environment = this.studioEnvRT.texture;
    }
    const rect = element.getBoundingClientRect();
    const slot = {
      id,
      element,
      scene,
      camera,
      onUpdate,
      onResize,
      onDispose,
      rect,
      inView: true,
    };
    this.slots.set(id, slot);
    this.resizeObserver.observe(element);
    this.intersectionObserver.observe(element);
    onResize?.(rect.width, rect.height, slot);
    return () => this.unregisterSlot(id);
  }

  unregisterSlot(id) {
    const slot = this.slots.get(id);
    if (!slot) return;
    this.resizeObserver.unobserve(slot.element);
    this.intersectionObserver.unobserve(slot.element);
    slot.onDispose?.();
    this.slots.delete(id);
  }

  tick(now) {
    if (this.isFallback || !this.renderer) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    const w = window.innerWidth;
    const h = window.innerHeight;

    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear(true, true, true);
    this.renderer.setScissorTest(true);

    for (const slot of this.slots.values()) {
      if (!slot.inView) continue;
      const rect = slot.element.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2 || rect.bottom <= 0 || rect.top >= h) {
        continue;
      }

      slot.onUpdate?.(dt, now * 0.001, this.reducedMotion, slot);

      const bottomY = h - rect.bottom;
      this.renderer.setViewport(rect.left, bottomY, rect.width, rect.height);
      this.renderer.setScissor(rect.left, bottomY, rect.width, rect.height);
      this.renderer.render(slot.scene, slot.camera);
    }

    this.rafId = requestAnimationFrame(this._tick);
  }

  dispose() {
    cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    for (const slot of this.slots.values()) {
      slot.onDispose?.();
    }
    this.slots.clear();
    this.studioEnvRT?.dispose();
    this.canvas.removeEventListener('webglcontextlost', this._onContextLost);
    window.removeEventListener('resize', this._onResize);
    this.renderer?.dispose();
  }
}
