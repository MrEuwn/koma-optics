import React, { useState } from 'react';
import { CATALOG_SERIES } from '../data/catalog.js';

export function KomaMarkSvg({ className = 'koma-emblem-svg' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      data-logo="koma-mark"
    >
      <rect x="1" y="1" width="22" height="22" fill="currentColor" />
      <circle cx="12" cy="12" r="7.2" fill="var(--header-mark-cutout, #0D1014)" />
      <polygon
        points="12,6.4 16.8,9.2 16.8,14.8 12,17.6 7.2,14.8 7.2,9.2"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="2.8" fill="var(--header-mark-cutout, #0D1014)" />
    </svg>
  );
}

export function Header({
  theme,
  hidden = false,
  scrollProgress,
  totalItems,
  triggerRef,
  onOpenDrawer,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isCollapsed = scrollProgress > 0.14;
  // Smoothly interpolate Hero H1 visual scale from 1.0 (52px) down to 0.25 (13px) in header
  const clamped = Math.min(1, Math.max(0, scrollProgress / 0.45));
  const titleScale = 1 - clamped * 0.74;
  const titleOffsetY = (1 - clamped) * 4;

  return (
    <header
      className={`site-header site-header--${theme} ${isCollapsed ? 'site-header--scrolled' : ''} ${hidden ? 'site-header--hidden' : ''}`}
      aria-hidden={hidden || undefined}
    >
      <div className="site-header__bar">
        {/* Zone 1: Minimal Geometric Aperture Mark + KOMA */}
        <div className="site-header__brand">
          <a href="#hero" className="brand-lockup" aria-label="KOMA Optics Home">
            <KomaMarkSvg />
            <span className="t12 brand-lockup__word">KOMA</span>
          </a>
        </div>

        {/* Zone 2: Numbered 3-Series Catalog Tree (collapses cleanly to active 01 PRISM O on scroll) */}
        <nav className="site-header__tree" aria-label="Optical Series Index">
          {CATALOG_SERIES.map((series) => (
            <div
              key={series.code}
              className={`tree-series ${series.active ? 'tree-series--active' : 'tree-series--secondary'}`}
            >
              <a href={series.anchor} className="tree-series__head t12">
                <span className="tree-series__num num">{series.code}</span>
                <span>{series.name}</span>
              </a>
              <ul className="tree-series__models">
                {series.models.map((m) => (
                  <li key={m.id}>
                    <a href={m.anchor} className="tree-series__model t12">
                      {m.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Zone 3: Monumental Hero H1 morphing smoothly to pinned 12px title on scroll */}
        <div className="site-header__center">
          <h1
            className="site-header__h1 t50"
            style={{
              transform: `translate3d(0, ${titleOffsetY}px, 0) scale(${titleScale.toFixed(4)})`,
            }}
          >
            PRISM O (III)
          </h1>
        </div>

        {/* Zone 4: Right editorial links (STORE, ABOUT) + far-right CART ( N ) */}
        <div className="site-header__right">
          <div className="site-header__links">
            <a href="#collection" className="header-text-link t12">
              STORE
            </a>
            <a href="#story" className="header-text-link t12">
              ABOUT
            </a>
          </div>

          <button
            ref={triggerRef}
            type="button"
            className="header-cart-btn t12 num"
            onClick={onOpenDrawer}
            aria-label={`Open reservation cart, ${totalItems} item${totalItems === 1 ? '' : 's'}`}
          >
            CART ( {totalItems} )
          </button>

          <button
            type="button"
            className="header-menu-btn t12"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-catalog-drawer"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? 'CLOSE' : 'MENU'}
          </button>
        </div>
      </div>

      {/* Accessible mobile catalog dropdown */}
      {mobileMenuOpen && (
        <div
          id="mobile-catalog-drawer"
          className={`mobile-nav-sheet mobile-nav-sheet--${theme}`}
        >
          <div className="mobile-nav-sheet__grid">
            {CATALOG_SERIES.map((series) => (
              <div key={series.code} className="mobile-nav-group">
                <a
                  href={series.anchor}
                  className="t12 mobile-nav-group__title"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="num">{series.code}</span> {series.name}
                </a>
                <ul>
                  {series.models.map((m) => (
                    <li key={m.id}>
                      <a
                        href={m.anchor}
                        className="t12 mobile-nav-group__item"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {m.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mobile-nav-sheet__foot">
            <a
              href="#story"
              className="editorial-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              ABOUT PRISM O
            </a>
            <a
              href="#filter-bench"
              className="editorial-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              FILTER BENCH
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
