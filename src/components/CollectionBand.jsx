import React from 'react';
import { COLLECTION_OBJECTS } from '../data/catalog.js';

export function CollectionBand({ onReserveItem }) {
  return (
    <section
      id="collection"
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

        {COLLECTION_OBJECTS.map((obj) => (
          <article key={obj.id} className={`col-card ${obj.aspectClass}`}>
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
