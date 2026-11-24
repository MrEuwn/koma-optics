import React, { useEffect, useRef } from 'react';
import { COLLECTION_OBJECTS } from '../data/catalog.js';

export function CollectionBand({ onReserveItem }) {
  const sectionRef = useRef(null);
  const cardRefs = useRef([]);

  // Subtle Obys sculptural scroll parallax across the 3 asymmetric broken-grid cards
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return undefined;

    let rafId = 0;
    const speeds = [-26, 22, -16];

    const syncParallax = () => {
      rafId = 0;
      if (!sectionRef.current || window.innerWidth < 768) {
        cardRefs.current.forEach((el) => {
          if (el) el.style.transform = '';
        });
        return;
      }
      const rect = sectionRef.current.getBoundingClientRect();
      const vh = window.innerHeight || 900;
      const progress = Math.min(1, Math.max(-1, (vh * 0.5 - (rect.top + rect.height * 0.45)) / vh));

      cardRefs.current.forEach((el, idx) => {
        if (!el) return;
        const dy = progress * (speeds[idx] || 0);
        el.style.transform = `translate3d(0, ${dy.toFixed(1)}px, 0)`;
      });
    };

    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(syncParallax);
    };

    syncParallax();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section
      id="collection"
      ref={sectionRef}
      data-band="dark"
      className="koma-band collection-band"
      aria-labelledby="collection-heading"
    >
      {/* Exact Otto 3-way split monumental header (with top clearance so it never collides with header) */}
      <div className="collection-split-header">
        <span className="t120" aria-hidden="true">
          O
        </span>
        <h2 id="collection-heading" className="t120">
          COLLECTION
        </h2>
        <span className="t120 num" aria-hidden="true">
          (03)
        </span>
      </div>

      {/* Exact Otto 4-column asymmetric staggered broken grid */}
      <div className="collection-broken-grid">
        <div className="collection-index-col">
          <p className="t12 num">COLLECTION (03):</p>
        </div>

        {COLLECTION_OBJECTS.map((obj, idx) => (
          <article
            key={obj.id}
            ref={(el) => {
              cardRefs.current[idx] = el;
            }}
            className={`col-card ${obj.aspectClass}`}
          >
            <button
              type="button"
              className="col-card__trigger"
              onClick={(e) => onReserveItem(obj.id, e.currentTarget)}
              aria-label={`Inspect and reserve ${obj.code} ${obj.name}, ${obj.subtitle}, from $${obj.priceUsd}`}
            >
              <div className="col-card__media">
                <img
                  src={obj.src}
                  alt={obj.alt}
                  loading="lazy"
                  decoding="async"
                />
              </div>

              <div className="col-card__caption">
                <div className="col-card__title-group">
                  <span className="t12 num col-card__code">{obj.code}</span>
                  <span className="t12 col-card__name">{obj.name}</span>
                </div>

                <div className="col-card__dims">
                  <span className="t12 col-card__dims-label">Dimensions:</span>
                  <span className="t12 num col-card__dims-val">
                    {obj.dimensions}
                  </span>
                </div>
              </div>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
