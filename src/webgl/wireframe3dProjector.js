/**
 * Real-time High-DPI Analytical 3D Architectural Vector Wireframe Projector
 * Renders razor-sharp 1px CAD line drawings of KOMA PRISM O (I = 2 barrels, II = 3 barrels, III = 4 barrels)
 * at ANY continuous 3D rotation (from pure Top-Down Plan in s05 -> Diagonal Tumble in s06 -> Elevation in s07..s09,
 * and from Flat Front Elevation on the Docked Card in s13..s14 -> 3D Isometric Studio Bench in s15..s16!).
 * Zero WebGL contexts consumed; supersampled retina crispness at 60fps.
 */

function rotPoint(x, y, z, pitch, yaw, roll) {
  // 1. Yaw (around object vertical axis Y)
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = x * cy + z * sy;
  const y1 = y;
  const z1 = -x * sy + z * cy;

  // 2. Pitch (around view horizontal axis X: pitch = +PI/2 tilts top face +Y straight toward camera +Z)
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x2 = x1;
  const y2 = y1 * cp - z1 * sp;
  const z2 = y1 * sp + z1 * cp;

  // 3. View-plane Roll (around camera axis Z: roll = -PI/2 aligns 4-barrel X axis vertically top-to-bottom)
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const x3 = x2 * cr - y2 * sr;
  const y3 = x2 * sr + y2 * cr;
  const z3 = z2;

  return { x: x3, y: y3, z: z3 };
}

function projectPt(pt, cx, cy, scale, persp = 0) {
  const w = persp > 0 ? 1 / Math.max(0.35, 1 - pt.z * persp) : 1;
  return {
    x: cx + pt.x * scale * w,
    y: cy - pt.y * scale * w,
    z: pt.z,
  };
}

/**
 * Draws a single PRISM O assembly (barrels = 2, 3, or 4) onto a 2D canvas context
 * with true 3D cylinder silhouette calculation, double-walled top rims, crystal coupling U-tubes,
 * and opaque paper occlusion fill so rear lines hide naturally behind foreground cylinders!
 */
export function drawPrismWireframeAssembly(ctx, opts) {
  const {
    barrels = 4,
    cx,
    cy,
    scale,
    pitch = 0,
    yaw = 0,
    roll = 0,
    persp = 0.08,
    paperFill = '#EEF0EC',
    strokeMain = '#2E3236',
    strokeFine = '#6E747C',
    highlightMode = 'none', // 'barrels' | 'bridges' | 'all' | 'none'
    accentColor = '#181C20',
    lineWidth = 1.0,
  } = opts;

  const R = 0.36;
  const innerR = 0.328;
  const couplerR = 0.125;
  const stepX = (R + couplerR) * 1.92;
  const halfH = 1.28;
  const bridgeBotY = -halfH + 0.32;

  // Collect components (cylinders + coupling U-tubes) sorted back-to-front by rotated center Z!
  const items = [];
  for (let i = 0; i < barrels; i++) {
    const bx = (i - (barrels - 1) * 0.5) * stepX;
    const c = rotPoint(bx, 0, 0, pitch, yaw, roll);
    items.push({ kind: 'barrel', idx: i, bx, zOrder: c.z });
  }
  for (let i = 0; i < barrels - 1; i++) {
    const bx = (i + 0.5 - (barrels - 1) * 0.5) * stepX;
    const c = rotPoint(bx, 0, 0, pitch, yaw, roll);
    items.push({ kind: 'coupler', idx: i, bx, zOrder: c.z - 0.01 });
  }

  items.sort((a, b) => a.zOrder - b.zOrder);

  // Unit axis vector in screen/view space to find exact tangent silhouette angles on cylinder!
  const axisTop = rotPoint(0, 1, 0, pitch, yaw, roll);
  const sinPitchView = Math.min(1, Math.abs(axisTop.z)); // 1 = pure top-down plan, 0 = pure side elevation

  const sampleCircle = (centerX, localY, radius, segs = 48) => {
    const pts = [];
    for (let s = 0; s <= segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const p3 = rotPoint(
        centerX + Math.cos(a) * radius,
        localY,
        Math.sin(a) * radius,
        pitch,
        yaw,
        roll
      );
      pts.push(projectPt(p3, cx, cy, scale, persp));
    }
    return pts;
  };

  // Find extreme left & right silhouette tangent points around cylinder circumference in projected 2D!
  const findSilhouetteTangents = (centerX, yTop, yBot, radius) => {
    const segs = 56;
    const axis2DTop = projectPt(rotPoint(centerX, yTop, 0, pitch, yaw, roll), cx, cy, scale, persp);
    const axis2DBot = projectPt(rotPoint(centerX, yBot, 0, pitch, yaw, roll), cx, cy, scale, persp);
    let dx = axis2DTop.x - axis2DBot.x;
    let dy = axis2DTop.y - axis2DBot.y;
    const len = Math.hypot(dx, dy);

    // Normal perpendicular to projected cylinder spine
    const nx = len > 0.5 ? -dy / len : 1;
    const ny = len > 0.5 ? dx / len : 0;

    let minDot = Infinity;
    let maxDot = -Infinity;
    let bestMin = 0;
    let bestMax = Math.PI;

    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const midP = projectPt(
        rotPoint(
          centerX + Math.cos(a) * radius,
          (yTop + yBot) * 0.5,
          Math.sin(a) * radius,
          pitch,
          yaw,
          roll
        ),
        cx,
        cy,
        scale,
        persp
      );
      const midCenter = {
        x: (axis2DTop.x + axis2DBot.x) * 0.5,
        y: (axis2DTop.y + axis2DBot.y) * 0.5,
      };
      const dot = (midP.x - midCenter.x) * nx + (midP.y - midCenter.y) * ny;
      if (dot < minDot) {
        minDot = dot;
        bestMin = a;
      }
      if (dot > maxDot) {
        maxDot = dot;
        bestMax = a;
      }
    }

    return { aLeft: bestMin, aRight: bestMax, spineLen: len };
  };

  for (const item of items) {
    const isBarrel = item.kind === 'barrel';
    const rad = isBarrel ? R : couplerR;
    const yTop = halfH;
    const yBot = isBarrel ? -halfH : bridgeBotY;

    const topPts = sampleCircle(item.bx, yTop, rad, 52);
    const botPts = sampleCircle(item.bx, yBot, rad, 52);
    const { aLeft, aRight, spineLen } = findSilhouetteTangents(item.bx, yTop, yBot, rad);

    // 1. Opaque paper body occlusion polygon (when cylinder body has visible length)
    if (spineLen > 1.5) {
      const tL = projectPt(
        rotPoint(item.bx + Math.cos(aLeft) * rad, yTop, Math.sin(aLeft) * rad, pitch, yaw, roll),
        cx,
        cy,
        scale,
        persp
      );
      const tR = projectPt(
        rotPoint(item.bx + Math.cos(aRight) * rad, yTop, Math.sin(aRight) * rad, pitch, yaw, roll),
        cx,
        cy,
        scale,
        persp
      );
      const bR = projectPt(
        rotPoint(item.bx + Math.cos(aRight) * rad, yBot, Math.sin(aRight) * rad, pitch, yaw, roll),
        cx,
        cy,
        scale,
        persp
      );
      const bL = projectPt(
        rotPoint(item.bx + Math.cos(aLeft) * rad, yBot, Math.sin(aLeft) * rad, pitch, yaw, roll),
        cx,
        cy,
        scale,
        persp
      );

      // Fill body quad + bottom ellipse cap with paper color to cleanly occlude rear geometry!
      ctx.fillStyle = paperFill;
      ctx.beginPath();
      ctx.moveTo(tL.x, tL.y);
      ctx.lineTo(tR.x, tR.y);
      ctx.lineTo(bR.x, bR.y);
      ctx.lineTo(bL.x, bL.y);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      botPts.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();

      // Stroke ONLY the front-facing half of the bottom base arc + the two vertical silhouette walls!
      const isEmph =
        highlightMode === 'all' ||
        (isBarrel && highlightMode === 'barrels') ||
        (!isBarrel && highlightMode === 'bridges');
      ctx.strokeStyle = isEmph ? accentColor : strokeMain;
      ctx.lineWidth = isEmph ? lineWidth * 1.25 : lineWidth;

      // Vertical silhouette walls
      ctx.beginPath();
      ctx.moveTo(tL.x, tL.y);
      ctx.lineTo(bL.x, bL.y);
      ctx.moveTo(tR.x, tR.y);
      ctx.lineTo(bR.x, bR.y);
      ctx.stroke();

      // Front-facing bottom arc (where normal points toward viewer +Z when looking from above)
      ctx.beginPath();
      let started = false;
      const segs = 56;
      for (let s = 0; s <= segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        const nView = rotPoint(Math.cos(a), 0, Math.sin(a), pitch, yaw, roll);
        const pt = projectPt(
          rotPoint(item.bx + Math.cos(a) * rad, yBot, Math.sin(a) * rad, pitch, yaw, roll),
          cx,
          cy,
          scale,
          persp
        );
        if (nView.z >= -0.04 || sinPitchView > 0.96) {
          if (!started) {
            ctx.moveTo(pt.x, pt.y);
            started = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        } else {
          started = false;
        }
      }
      ctx.stroke();
    }

    // 2. Top Rim Mouth (fill paper first if viewing from above, then stroke outer & inner chamfer circles!)
    if (axisTop.z > -0.15) {
      ctx.fillStyle = paperFill;
      ctx.beginPath();
      topPts.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();

      const isEmph =
        highlightMode === 'all' ||
        (isBarrel && highlightMode === 'barrels') ||
        (!isBarrel && highlightMode === 'bridges');

      ctx.strokeStyle = isEmph ? accentColor : strokeMain;
      ctx.lineWidth = isEmph ? lineWidth * 1.25 : lineWidth;
      ctx.beginPath();
      topPts.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();

      // Inner optical wall lip
      const inR = isBarrel ? innerR : couplerR * 0.78;
      const innerPts = sampleCircle(item.bx, yTop, inR, 48);
      ctx.strokeStyle = strokeFine;
      ctx.lineWidth = lineWidth * 0.72;
      ctx.beginPath();
      innerPts.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();
    }

    // 3. Subtle concave web meniscus ticks in pure plan view (matching Otto s05 top-down CAD!)
    if (!isBarrel && sinPitchView > 0.75) {
      const alpha = Math.min(1, (sinPitchView - 0.75) * 4);
      ctx.save();
      ctx.globalAlpha = alpha * 0.75;
      ctx.strokeStyle = strokeFine;
      ctx.lineWidth = lineWidth * 0.75;
      [-1, 1].forEach((side) => {
        const pA = projectPt(
          rotPoint(item.bx - couplerR * 1.35, yTop, side * couplerR * 1.18, pitch, yaw, roll),
          cx,
          cy,
          scale,
          persp
        );
        const pMid = projectPt(
          rotPoint(item.bx, yTop, side * couplerR * 0.96, pitch, yaw, roll),
          cx,
          cy,
          scale,
          persp
        );
        const pB = projectPt(
          rotPoint(item.bx + couplerR * 1.35, yTop, side * couplerR * 1.18, pitch, yaw, roll),
          cx,
          cy,
          scale,
          persp
        );
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.quadraticCurveTo(pMid.x, pMid.y, pB.x, pB.y);
        ctx.stroke();
      });
      ctx.restore();
    }
  }
}
