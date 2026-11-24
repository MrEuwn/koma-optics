import React, { useEffect, useRef, useState } from 'react';
import {
  ALL_RESERVABLE_ITEMS,
  PRISM_EDITIONS,
  TABLETOP_FILTERS,
} from '../data/catalog.js';

export function ReservationDrawer({
  isOpen,
  items,
  mountedFilters,
  onClose,
  onAddItem,
  onUpdateQty,
  onRemoveItem,
}) {
  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);
  const [summaryMode, setSummaryMode] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSummaryMode(false);
      return undefined;
    }

    closeBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusables = [
          ...panelRef.current.querySelectorAll(
            'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          ),
        ];
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const lineEntries = Object.entries(items)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const meta = ALL_RESERVABLE_ITEMS.find((entry) => entry.id === id);
      return meta ? { ...meta, qty } : null;
    })
    .filter(Boolean);

  const totalCount = lineEntries.reduce((acc, item) => acc + item.qty, 0);
  const totalWeightG = lineEntries.reduce(
    (acc, item) => acc + item.weightGrams * item.qty,
    0
  );
  const totalUsd = lineEntries.reduce(
    (acc, item) => acc + item.priceUsd * item.qty,
    0
  );

  const activeBenchFilters = TABLETOP_FILTERS.filter((f) => mountedFilters[f.id]);

  return (
    <div
      className="drawer-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-drawer-title"
        className="drawer-panel"
        data-band="dark"
      >
        <div className="drawer-header">
          <div>
            <p className="t12 drawer-kicker">KOMA OPTICS · ALLOCATION SHEET</p>
            <h2 id="reservation-drawer-title" className="t30">
              RESERVATION CART
            </h2>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className="editorial-link drawer-close"
            onClick={onClose}
          >
            CLOSE [ESC]
          </button>
        </div>

        <p className="t12 drawer-notice">
          SPECULATIVE HARDWARE CONCEPT · NO PAYMENT PROCESSED
        </p>

        {/* Quick add PRISM O editions */}
        <div className="drawer-section">
          <p className="t12 drawer-section-label">MODULAR EDITIONS</p>
          <div className="drawer-quick-grid">
            {PRISM_EDITIONS.map((ed) => (
              <button
                key={ed.id}
                type="button"
                className="koma-btn-subtle"
                onClick={() => onAddItem(ed.id)}
              >
                + {ed.code} (${ed.priceUsd})
              </button>
            ))}
          </div>
        </div>

        {/* Pair active tabletop filters if mounted */}
        {activeBenchFilters.length > 0 && (
          <div className="drawer-section">
            <p className="t12 drawer-section-label">MOUNTED TABLETOP FILTERS</p>
            <div className="drawer-filter-pills">
              {activeBenchFilters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="koma-btn-subtle"
                  onClick={() => onAddItem(`filter-${f.id}`)}
                >
                  + {f.name} (${f.priceUsd})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cart items list */}
        <div className="drawer-items" aria-label="Reserved Instruments">
          {lineEntries.length === 0 ? (
            <div className="drawer-empty">
              <p className="t16">
                Your allocation bag is empty. Select a modular PRISM O barrel or
                optical glass filter above to compose your kit.
              </p>
            </div>
          ) : (
            lineEntries.map((item) => (
              <div key={item.id} className="drawer-line">
                <div className="drawer-line__top">
                  <div>
                    <p className="t16 drawer-line__title">{item.name}</p>
                    <p className="t12 num drawer-line__meta">
                      {item.weightGrams} G · ${item.priceUsd.toLocaleString('en-US')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="t12 drawer-remove-btn"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    REMOVE
                  </button>
                </div>

                <div className="drawer-line__bottom">
                  <span className="t12 num">
                    SUBTOTAL ${(item.priceUsd * item.qty).toLocaleString('en-US')}
                  </span>

                  <div className="drawer-stepper">
                    <button
                      type="button"
                      className="drawer-step-btn"
                      aria-label={`Decrease quantity for ${item.name}`}
                      onClick={() => onUpdateQty(item.id, -1)}
                    >
                      -
                    </button>
                    <span className="t12 num drawer-step-val">{item.qty}</span>
                    <button
                      type="button"
                      className="drawer-step-btn"
                      aria-label={`Increase quantity for ${item.name}`}
                      onClick={() => onUpdateQty(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary footer */}
        <div className="drawer-footer">
          <dl className="drawer-totals">
            <dt className="t12">MODULES</dt>
            <dd className="t12 num">{totalCount}</dd>
            <dt className="t12">OPTICAL MASS</dt>
            <dd className="t12 num">{totalWeightG.toLocaleString('en-US')} G</dd>
            <dt className="t12">ESTIMATED ALLOCATION</dt>
            <dd className="t30 num drawer-total-price">
              ${totalUsd.toLocaleString('en-US')}
            </dd>
          </dl>

          {summaryMode ? (
            <div className="drawer-confirmed" role="status">
              <p className="t12 drawer-kicker">SPECIFICATION SHEET PREPARED</p>
              <p className="t16">
                {totalCount} unit(s) configured at {totalWeightG.toLocaleString('en-US')}g
                (${totalUsd.toLocaleString('en-US')} speculative estimate). No order transmitted.
              </p>
              <button
                type="button"
                className="koma-btn-subtle"
                onClick={() => setSummaryMode(false)}
              >
                EDIT CONFIGURATION
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="koma-btn-accent drawer-submit"
              onClick={() => setSummaryMode(true)}
            >
              GENERATE ALLOCATION SHEET
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
