import { useEffect, useRef } from "react";

const SOUTH_AMERICA: [number, number][] = [
  [-79,9],[-76,8],[-75,11],[-62,11],[-60,8],[-61,4],[-51,4],[-50,2],
  [-44,-2],[-35,-5],[-35,-9],[-38,-15],[-40,-20],[-43,-22],[-45,-23],
  [-48,-26],[-50,-29],[-52,-33],[-53,-34],[-57,-38],[-62,-41],[-65,-43],
  [-66,-46],[-65,-49],[-67,-54],[-68,-55],[-70,-55],[-73,-51],[-75,-48],
  [-74,-45],[-75,-42],[-73,-37],[-70,-30],[-70,-25],[-68,-22],[-65,-18],
  [-67,-15],[-73,-11],[-76,-8],[-77,-2],[-80,0],[-79,9],
];
const NORTH_AMERICA: [number, number][] = [
  [-168,72],[-140,60],[-125,49],[-95,49],[-82,42],[-70,42],[-67,47],
  [-66,60],[-73,65],[-80,70],[-100,73],[-140,71],[-168,72],
];
const AFRICA: [number, number][] = [
  [-17,14],[-17,5],[-10,2],[5,2],[10,5],[20,5],[30,5],[37,5],
  [41,11],[43,12],[42,14],[37,22],[34,29],[32,31],[35,35],[37,37],
  [40,-2],[40,-11],[35,-17],[32,-22],[30,-27],[25,-34],[18,-34],
  [17,-28],[12,-22],[10,-2],[5,2],[-5,5],[-15,3],[-17,5],[-17,14],
];
const EUROPE_ASIA: [number, number][] = [
  [-9,37],[0,43],[10,44],[18,40],[28,41],[36,36],[36,41],[40,43],
  [50,44],[60,44],[70,43],[80,43],[90,50],[100,50],[110,45],[120,40],
  [130,35],[140,35],[145,42],[143,50],[135,48],[130,42],[125,38],
  [120,30],[110,20],[100,10],[105,5],[110,0],[105,-5],[115,-8],
  [110,-7],[100,-5],[98,3],[100,5],[104,1],[104,10],[106,16],
  [108,21],[110,20],[100,25],[95,27],[90,27],[85,27],[80,27],[75,34],
  [70,36],[65,37],[60,44],[50,42],[45,41],[40,43],[35,36],[28,37],
  [23,37],[10,44],[0,43],[-9,37],
];
const AUSTRALIA: [number, number][] = [
  [114,-22],[117,-21],[122,-18],[128,-15],[132,-12],[136,-12],[140,-17],
  [145,-18],[148,-20],[152,-24],[152,-28],[150,-37],[148,-39],[146,-39],
  [144,-38],[143,-39],[141,-38],[130,-33],[123,-34],[115,-34],[113,-26],[114,-22],
];

const CONTINENTS = [SOUTH_AMERICA, NORTH_AMERICA, AFRICA, EUROPE_ASIA, AUSTRALIA];

// Dot grid points for continent texture
const DOT_GRID: [number, number][] = [];
for (let lat = -80; lat <= 80; lat += 8) {
  for (let lon = -180; lon < 180; lon += 8) {
    DOT_GRID.push([lon, lat]);
  }
}

// Simple point-in-polygon test for continent dots
function pointInPoly(lon: number, lat: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}
function isOnLand(lon: number, lat: number): boolean {
  return CONTINENTS.some(p => pointInPoly(lon, lat, p));
}
const LAND_DOTS = DOT_GRID.filter(([lo, la]) => isOnLand(lo, la));

const CUIABA = { lon: -56.1, lat: -15.6, label: "Cuiabá" };
const RIO    = { lon: -43.2, lat: -22.9, label: "Rio de Janeiro" };

// Stars (fixed positions)
const STARS = Array.from({ length: 120 }, () => ({
  angle: Math.random() * Math.PI * 2,
  dist:  0.62 + Math.random() * 0.45,
  size:  Math.random() * 1.4 + 0.3,
  alpha: Math.random() * 0.6 + 0.2,
}));

function toRad(d: number) { return d * Math.PI / 180; }

function project(lon: number, lat: number, rotY: number, r: number, cx: number, cy: number) {
  const θ = toRad(lon + rotY);
  const φ = toRad(lat);
  const x = Math.cos(φ) * Math.sin(θ);
  const y = -Math.sin(φ);
  const z = Math.cos(φ) * Math.cos(θ);
  return { sx: cx + x * r, sy: cy + y * r, z };
}

function getNeon() {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--neon").trim() || "#00c8ff";
}

export function Globe() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rotYRef    = useRef(-65);
  const dragging   = useRef(false);
  const lastX      = useRef(0);
  const rafRef     = useRef(0);
  const frameRef   = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const dpr  = window.devicePixelRatio || 1;
    const SIZE = 300;
    canvas.width  = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width  = SIZE + "px";
    canvas.style.height = SIZE + "px";
    ctx.scale(dpr, dpr);

    const cx = SIZE / 2, cy = SIZE / 2;
    const R  = SIZE * 0.44;

    function draw() {
      frameRef.current++;
      const frame = frameRef.current;
      ctx.clearRect(0, 0, SIZE, SIZE);
      const rot  = rotYRef.current;
      const neon = getNeon();

      // ── Stars ──
      for (const s of STARS) {
        const sx = cx + Math.cos(s.angle + frame * 0.0003) * s.dist * R;
        const sy = cy + Math.sin(s.angle + frame * 0.0003) * s.dist * R;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fillStyle = neon + Math.round(s.alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }

      // ── Outer atmosphere glow ──
      const outerGlow = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.25);
      outerGlow.addColorStop(0, neon + "1a");
      outerGlow.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2);
      ctx.fillStyle = outerGlow;
      ctx.fill();

      // ── Sphere subtle fill ──
      const sphereFill = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.25, 0, cx, cy, R);
      sphereFill.addColorStop(0, "rgba(0,50,90,0.22)");
      sphereFill.addColorStop(1, "rgba(0,5,20,0.10)");
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = sphereFill;
      ctx.fill();

      // ── Sphere border ──
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = neon + "40";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // ── Grid lines ──
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = neon + "14";
      ctx.lineWidth = 0.5;
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath(); let s = false;
        for (let lat = -90; lat <= 90; lat += 2) {
          const p = project(lon, lat, rot, R, cx, cy);
          if (p.z <= 0) { s = false; continue; }
          s ? ctx.lineTo(p.sx, p.sy) : (ctx.moveTo(p.sx, p.sy), s = true);
        }
        ctx.stroke();
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath(); let s = false;
        for (let lo = -180; lo <= 180; lo += 2) {
          const p = project(lo, lat, rot, R, cx, cy);
          if (p.z <= 0) { s = false; continue; }
          s ? ctx.lineTo(p.sx, p.sy) : (ctx.moveTo(p.sx, p.sy), s = true);
        }
        ctx.stroke();
      }
      ctx.restore();

      // ── Land dots (continent texture) ──
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      for (const [lo, la] of LAND_DOTS) {
        const p = project(lo, la, rot, R, cx, cy);
        if (p.z <= 0.05) continue;
        const alpha = Math.min(1, (p.z - 0.05) / 0.3);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = neon + Math.round(alpha * 0.55 * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }
      ctx.restore();

      // ── Continent wireframes ──
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      for (const poly of CONTINENTS) {
        // Draw each visible segment separately to avoid lines crossing the back of the globe
        ctx.beginPath();
        let penDown = false;
        for (const [lo, la] of poly) {
          const p = project(lo, la, rot, R, cx, cy);
          if (p.z <= 0.02) { penDown = false; continue; }
          if (!penDown) { ctx.moveTo(p.sx, p.sy); penDown = true; }
          else ctx.lineTo(p.sx, p.sy);
        }
        // No fill, no closePath — both cause implicit line from last→first point crossing the globe
        ctx.strokeStyle = neon + "bb";
        ctx.lineWidth = 1.1;
        ctx.shadowColor = neon;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      // ── Scanline sweep (radar effect) ──
      const scanAngle = (frame * 0.012) % (Math.PI * 2);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      // Draw scan wedge
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, scanAngle - 0.4, scanAngle);
      ctx.closePath();
      const scanGrad = ctx.createLinearGradient(
        cx + Math.cos(scanAngle - 0.2) * R * 0.5,
        cy + Math.sin(scanAngle - 0.2) * R * 0.5,
        cx + Math.cos(scanAngle) * R,
        cy + Math.sin(scanAngle) * R
      );
      scanGrad.addColorStop(0, "transparent");
      scanGrad.addColorStop(1, neon + "22");
      ctx.fillStyle = scanGrad;
      ctx.fill();
      ctx.restore();

      // ── Animated signal dot on route ──
      const pC = project(CUIABA.lon, CUIABA.lat, rot, R, cx, cy);
      const pR = project(RIO.lon,    RIO.lat,    rot, R, cx, cy);

      // Draw dotted route arc
      if (pC.z > 0 && pR.z > 0) {
        ctx.save();
        ctx.setLineDash([4, 7]);
        ctx.strokeStyle = neon + "66";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        let first = true;
        for (let t = 0; t <= 1; t += 0.02) {
          const lo = CUIABA.lon + (RIO.lon - CUIABA.lon) * t;
          const la = CUIABA.lat + (RIO.lat - CUIABA.lat) * t;
          const p = project(lo, la, rot, R, cx, cy);
          if (p.z <= 0) { first = true; continue; }
          first ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy);
          first = false;
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Animated signal dot traveling along route
        const t = (Math.sin(frame * 0.025) * 0.5 + 0.5); // 0→1→0
        const sigLon = CUIABA.lon + (RIO.lon - CUIABA.lon) * t;
        const sigLat = CUIABA.lat + (RIO.lat - CUIABA.lat) * t;
        const sigP = project(sigLon, sigLat, rot, R, cx, cy);
        if (sigP.z > 0) {
          // Tail glow
          ctx.beginPath();
          ctx.arc(sigP.sx, sigP.sy, 6, 0, Math.PI * 2);
          ctx.fillStyle = neon + "22";
          ctx.fill();
          // Core dot
          ctx.beginPath();
          ctx.arc(sigP.sx, sigP.sy, 3, 0, Math.PI * 2);
          ctx.fillStyle = "#fff";
          ctx.shadowColor = neon;
          ctx.shadowBlur = 14;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // ── City markers with animated pulse ──
      for (const [city, p] of [
        [CUIABA, pC],
        [RIO,    pR],
      ] as [typeof CUIABA, typeof pC][]) {
        if (p.z <= 0) continue;

        // Animated expanding ring
        const pulseT = ((frame * 0.018 + (city === RIO ? 1.5 : 0)) % (Math.PI * 2));
        const pulseR  = 8 + Math.sin(pulseT) * 5;
        const pulseAlpha = (1 - Math.sin(pulseT) * 0.5) * 0.35;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = neon + Math.round(pulseAlpha * 255).toString(16).padStart(2, "0");
        ctx.lineWidth = 1;
        ctx.stroke();

        // Second slower ring
        const pulse2R = 5 + Math.cos(pulseT * 0.7) * 3;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, pulse2R, 0, Math.PI * 2);
        ctx.strokeStyle = neon + "55";
        ctx.lineWidth = 1;
        ctx.shadowColor = neon;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Center dot
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.shadowColor = neon;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.font = "bold 9px Poppins, sans-serif";
        ctx.textAlign = p.sx > cx ? "right" : "left";
        const lx = p.sx > cx ? p.sx - 16 : p.sx + 16;
        ctx.fillStyle = neon;
        ctx.shadowColor = neon;
        ctx.shadowBlur = 8;
        ctx.fillText(city.label, lx, p.sy - 5);
        ctx.shadowBlur = 0;
      }

      // ── Specular shimmer ──
      const spec = ctx.createRadialGradient(cx - R * 0.32, cy - R * 0.35, 0, cx, cy, R);
      spec.addColorStop(0, "rgba(255,255,255,0.09)");
      spec.addColorStop(0.4, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = spec;
      ctx.fill();

      if (!dragging.current) rotYRef.current += 0.1;
      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  function onDown(e: React.PointerEvent) {
    dragging.current = true;
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    rotYRef.current += (e.clientX - lastX.current) * 0.5;
    lastX.current = e.clientX;
  }
  function onUp() { dragging.current = false; }

  return (
    <div className="globe-wrap">
      <canvas
        ref={canvasRef}
        className="globe-canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        style={{ cursor: "grab", touchAction: "none" }}
      />
      <p className="globe-hint">Arraste para girar 🌍</p>
    </div>
  );
}
