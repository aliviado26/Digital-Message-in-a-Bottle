import type { LatLng } from "./geo-math.ts";

/**
 * Stage 1 approximation of major real ocean surface currents, hand-curated
 * from known typical headings/speeds — NOT a real dataset. Swap this module
 * out for a real OSCAR/Copernicus-derived grid later; callers only depend on
 * `getCurrentVelocity(position)`.
 */
interface CurrentSystem {
  name: string;
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
  /** Compass heading in degrees the current flows toward (0 = N, 90 = E). */
  headingDeg: number;
  speedMs: number;
}

const MARGIN_DEG = 5;

const CURRENT_SYSTEMS: CurrentSystem[] = [
  // Kuroshio: Philippines -> Taiwan -> Japan, flowing northeast.
  { name: "Kuroshio", latMin: 12, latMax: 35, lngMin: 118, lngMax: 145, headingDeg: 45, speedMs: 0.7 },
  // North Pacific Current: mid-latitude Pacific, flowing east toward California.
  { name: "North Pacific Current", latMin: 35, latMax: 45, lngMin: 150, lngMax: 220, headingDeg: 90, speedMs: 0.2 },
  // California Current: US west coast, flowing south.
  { name: "California Current", latMin: 25, latMax: 45, lngMin: 230, lngMax: 245, headingDeg: 195, speedMs: 0.2 },
  // North Equatorial Current: westward across the Pacific.
  { name: "North Equatorial Current", latMin: 8, latMax: 20, lngMin: 130, lngMax: 220, headingDeg: 270, speedMs: 0.35 },
  // Leeuwin Current: Western Australia, flowing south.
  { name: "Leeuwin Current", latMin: -35, latMax: -20, lngMin: 108, lngMax: 118, headingDeg: 200, speedMs: 0.4 },
  // Canary Current: Portugal/NW Africa, flowing south.
  { name: "Canary Current", latMin: 15, latMax: 42, lngMin: -20, lngMax: -8, headingDeg: 200, speedMs: 0.3 },
  // North Atlantic Current: US east coast toward Europe, flowing northeast.
  { name: "North Atlantic Current", latMin: 35, latMax: 50, lngMin: -70, lngMax: -10, headingDeg: 60, speedMs: 0.5 },
];

/** 0 at/outside the margin, 1 well inside the box; smooth in between. */
function edgeWeight(value: number, min: number, max: number, margin: number): number {
  if (value < min - margin || value > max + margin) return 0;
  const inner = Math.min(value - (min - margin), (max + margin) - value);
  const t = Math.min(Math.max(inner / margin, 0), 1);
  return t * t * (3 - 2 * t); // smoothstep
}

function normalizeLng(lng: number): number {
  return lng < 0 ? lng + 360 : lng;
}

export function getCurrentVelocity(position: LatLng): { u: number; v: number } {
  const lng360 = normalizeLng(position.lng);
  let totalWeight = 0;
  let u = 0;
  let v = 0;

  for (const system of CURRENT_SYSTEMS) {
    const latWeight = edgeWeight(position.lat, system.latMin, system.latMax, MARGIN_DEG);
    const lngWeight = edgeWeight(lng360, system.lngMin, system.lngMax, MARGIN_DEG);
    const weight = latWeight * lngWeight;
    if (weight <= 0) continue;

    const headingRad = (system.headingDeg * Math.PI) / 180;
    u += weight * system.speedMs * Math.sin(headingRad);
    v += weight * system.speedMs * Math.cos(headingRad);
    totalWeight += weight;
  }

  if (totalWeight <= 1) {
    // Blend remaining weight with a near-still background drift for open,
    // uncharacterized ocean rather than an abrupt cutoff at system edges.
    const backgroundWeight = 1 - totalWeight;
    u += backgroundWeight * 0.02;
    v += backgroundWeight * 0.0;
    totalWeight = 1;
  }

  return { u: u / totalWeight, v: v / totalWeight };
}
