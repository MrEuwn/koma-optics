import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TABLETOP_FILTERS } from '../data/catalog.js';
import { createFilterBenchStudioScene } from '../webgl/opticalScenes.js';

export function FilterBenchBand({
  stageManager,
  webglFallback,
  mountedFilters,
  onToggleFilter,
  onClearFilters,
  onOpenDrawer,
}) {
  const slotRef = useRef(null);
  const [hoveredId, setHoveredId] = useState(null);

  const benchStateRef = useRef({
    mounted: mountedFilters,
    hoveredId: null,
  });

  useEffect(() => {
    benchStateRef.current.mounted = mountedFilters;
  }, [mountedFilters]);

  useEffect(() => {
    benchStateRef.current.hoveredId = hoveredId;
  }, [hoveredId]);

  useEffect(() => {
    if (!stageManager || !slotRef.current) return undefined;
    const descriptor = createFilterBenchStudioScene(benchStateRef);
    return stageManager.registerSlot('filter-bench', slotRef.current, descriptor);
  }, [stageManager]);

  const activeList = useMemo(
    () => TABLETOP_FILTERS.filter((f) => mountedFilters[f.id]),
    [mountedFilters]
  );

  // Compute live optical telemetry from mounted filter stack
  const liveTelemetry = useMemo(() => {
    const baseT = 1.4;
    const tStop = (
      baseT + activeList.reduce((acc, f) => acc + f.tStopDelta, 0)
    ).toFixed(2);
    const trans = activeList
      .reduce((acc, f) => acc * (f.transmissionPct / 100), 0.992)
      .toFixed(3);
    const transPct = (Number(trans) * 100).toFixed(1);
    const spectrum =
      activeList.length === 0
        ? 'NEUTRAL 5500K'
        : activeList.map((f) => f.spectrumLabel).join(' + ');

    return { tStop, transPct, spectrum };
  }, [activeList]);

  return (
    <section
      id="filter-bench"
      data-band="dark"
      className="koma-band bench-band"
      aria-labelledby="bench-heading"
    >
      <h2 id="bench-heading" className="sr-only">
        PRISM O (III) Interactive Optical Filter Tabletop Studio
      </h2>

      {/* Full-viewport single-context WebGL2 tabletop studio slot */}
      <div ref={slotRef} className="bench-stage-slot">
        {webglFallback && (
          <div className="bench-fallback-surface" aria-hidden="true" />
        )}
      </div>

      {/* Exact 4-column Otto horizontal horizon strip across the dark/tabletop line */}
      <div className="bench-horizon-strip">
        <span className="t12 bench-horizon-col">PRISM O (III)</span>

        <div className="bench-horizon-col">
          {activeList.length === 0 ? (
            <span className="t12">CLICK A FILTER</span>
          ) : (
            <button
              type="button"
              className="editorial-link bench-reset-btn"
              onClick={onClearFilters}
            >
              RESET FILTERS ( {activeList.length} )
            </button>
          )}
        </div>

        <div className="bench-horizon-col bench-horizon-col--right">
          <span className="t12 num">
            {activeList.length === 0
              ? 'BEND THE BEAM'
              : `${liveTelemetry.spectrum} · T${liveTelemetry.tStop}`}
          </span>
        </div>

        <div className="bench-horizon-col bench-horizon-col--end">
          <button
            type="button"
            className="editorial-link bench-reserve-btn"
            onClick={(e) => onOpenDrawer(e.currentTarget)}
          >
            RESERVE FROM $780
          </button>
        </div>
      </div>

      {/* 3 Direct-Manipulation Tabletop Filter Hit-Zones synced over the 3D resting filters */}
      <div className="bench-hotspots-layer" role="group" aria-label="Optical Glass Filters">
        {TABLETOP_FILTERS.map((filter) => {
          const isMounted = Boolean(mountedFilters[filter.id]);
          return (
            <button
              key={filter.id}
              type="button"
              data-filter-id={filter.id}
              aria-pressed={isMounted}
              aria-label={isMounted ? filter.ariaRemove : filter.ariaMount}
              className={`bench-hotspot ${filter.hotspotClass} ${isMounted ? 'bench-hotspot--mounted' : ''}`}
              onClick={() => onToggleFilter(filter.id)}
              onMouseEnter={() => setHoveredId(filter.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(filter.id)}
              onBlur={() => setHoveredId(null)}
            >
              <span className="bench-hotspot__ring" aria-hidden="true" />
              <span className="bench-hotspot__label t12">
                <span
                  className="bench-hotspot__dot"
                  style={{ backgroundColor: filter.accentHex }}
                  aria-hidden="true"
                />
                {filter.shortLabel}
                {isMounted ? ' · MOUNTED' : ''}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quiet WCAG-verified optical bench telemetry bar along bottom studio table margin */}
      <div className="bench-telemetry-bar" role="status" aria-live="polite">
        <div className="bench-telemetry-item">
          <span className="t12 bench-telemetry-key">T-STOP</span>
          <span className="t12 num bench-telemetry-val">T{liveTelemetry.tStop}</span>
        </div>
        <div className="bench-telemetry-item">
          <span className="t12 bench-telemetry-key">TRANSMISSION</span>
          <span className="t12 num bench-telemetry-val">{liveTelemetry.transPct}%</span>
        </div>
        <div className="bench-telemetry-item">
          <span className="t12 bench-telemetry-key">SPECTRUM</span>
          <span className="t12 num bench-telemetry-val">{liveTelemetry.spectrum}</span>
        </div>
      </div>
    </section>
  );
}
