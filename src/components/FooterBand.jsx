import React from 'react';
import { CATALOG_SERIES } from '../data/catalog.js';

export function FooterBand({ onOpenDrawer }) {
  return (
    <footer
      id="footer"
      data-band="dark"
      className="koma-band site-footer"
      aria-label="KOMA Optics Index and Colophon"
    >
      {/* Top 4-zone editorial metadata row matching Otto Objects */}
      <div className="site-footer__top">
        <div className="site-footer__copy">
          <p className="t12 num site-footer__muted">©2026. KOMA OPTICS.</p>
        </div>

        <div className="site-footer__tree">
          {CATALOG_SERIES.map((series) => (
            <div key={series.code} className="footer-series">
              <a href={series.anchor} className="t12 footer-series__head">
                <span className="num footer-series__num">{series.code}</span>
                <span>{series.name}</span>
              </a>
              <ul className="footer-series__models">
                {series.models.map((m) => (
                  <li key={m.id}>
                    <a href={m.anchor} className="t12 footer-series__model">
                      {m.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="site-footer__nav">
          <button
            type="button"
            className="t12 footer-nav-link"
            onClick={(e) => onOpenDrawer(e.currentTarget)}
          >
            STORE
          </button>
          <a href="#story" className="t12 footer-nav-link">
            ABOUT
          </a>
        </div>

        <div className="site-footer__credit">
          <span className="t12 site-footer__muted">ENGINEERED BY </span>
          <a href="#hero" className="t12 footer-credit-link">
            KOMA OPTICS LAB
          </a>
        </div>
      </div>

      {/* Monumental full-bleed bottom aperture emblem + KOMA architectural SVG wordmark */}
      <div className="site-footer__monument">
        <div className="footer-emblem-box" aria-hidden="true">
          <svg
            viewBox="0 0 240 240"
            width="240"
            height="240"
            className="footer-emblem-svg"
            data-logo="koma-footer-emblem"
          >
            <rect x="0" y="0" width="240" height="240" fill="#EFF2F5" />
            {/* Sculpted dark 6-lobe optical aperture iris echoing museum emblem density */}
            <g transform="translate(120, 120)">
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <circle
                  key={deg}
                  cx={Math.cos((deg * Math.PI) / 180) * 56}
                  cy={Math.sin((deg * Math.PI) / 180) * 56}
                  r="42"
                  fill="#0D1014"
                />
              ))}
              <circle cx="0" cy="0" r="68" fill="#0D1014" />
              {/* Crisp 6-blade central optical opening */}
              <polygon
                points="0,-46 40,-23 40,23 0,46 -40,23 -40,-23"
                fill="#EFF2F5"
              />
            </g>
          </svg>
        </div>

        <div className="footer-wordmark-box">
          <svg
            viewBox="0 0 1120 260"
            width="1120"
            height="260"
            className="footer-wordmark-svg"
            role="img"
            aria-label="KOMA"
            data-logo="koma-footer-wordmark"
          >
            <text
              x="0"
              y="236"
              fill="#EFF2F5"
              fontFamily="'Schibsted Grotesk', sans-serif"
              fontWeight="600"
              fontSize="295"
              letterSpacing="-12"
              textLength="1114"
              lengthAdjust="spacingAndGlyphs"
            >
              KOMA
            </text>
          </svg>
        </div>
      </div>
    </footer>
  );
}
