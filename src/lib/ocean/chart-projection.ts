// Equirectangular lat/lng -> SVG projection shared by every chart-style map,
// plus loose (deliberately doodle-simple, not survey-accurate) continent
// outlines so shore zones/bottles/coastlines all line up on one system.
export const CHART_WIDTH = 1000;
export const CHART_HEIGHT = 500;

export interface LatLng {
  lat: number;
  lng: number;
}

export function project({ lat, lng }: LatLng): { x: number; y: number } {
  const x = ((lng + 180) / 360) * CHART_WIDTH;
  const y = ((90 - lat) / 180) * CHART_HEIGHT;
  return { x, y };
}

export function pointsToPath(points: LatLng[]): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => {
      const { x, y } = project(point);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function closedPath(points: LatLng[]): string {
  return `${pointsToPath(points)} Z`;
}

const NORTH_AMERICA: LatLng[] = [
  { lat: 70, lng: -160 }, { lat: 60, lng: -140 }, { lat: 48, lng: -125 },
  { lat: 32, lng: -117 }, { lat: 20, lng: -105 }, { lat: 15, lng: -95 },
  { lat: 25, lng: -80 }, { lat: 45, lng: -65 }, { lat: 60, lng: -70 },
  { lat: 70, lng: -100 },
];

const SOUTH_AMERICA: LatLng[] = [
  { lat: 12, lng: -72 }, { lat: 5, lng: -77 }, { lat: -5, lng: -81 },
  { lat: -18, lng: -70 }, { lat: -33, lng: -71 }, { lat: -45, lng: -68 },
  { lat: -55, lng: -68 }, { lat: -52, lng: -58 }, { lat: -30, lng: -50 },
  { lat: -10, lng: -35 }, { lat: 5, lng: -52 },
];

const EUROPE: LatLng[] = [
  { lat: 36, lng: -9 }, { lat: 43, lng: -9 }, { lat: 44, lng: -1 },
  { lat: 48, lng: 0 }, { lat: 51, lng: 2 }, { lat: 55, lng: 8 },
  { lat: 58, lng: 11 }, { lat: 60, lng: 25 }, { lat: 50, lng: 30 },
  { lat: 45, lng: 20 }, { lat: 40, lng: 20 }, { lat: 36, lng: 23 },
];

const AFRICA: LatLng[] = [
  { lat: 35, lng: -6 }, { lat: 32, lng: 10 }, { lat: 31, lng: 32 },
  { lat: 12, lng: 43 }, { lat: 0, lng: 42 }, { lat: -15, lng: 40 },
  { lat: -25, lng: 33 }, { lat: -34, lng: 19 }, { lat: -22, lng: 14 },
  { lat: -5, lng: 9 }, { lat: 5, lng: 9 }, { lat: 15, lng: -17 },
];

const ASIA: LatLng[] = [
  { lat: 60, lng: 30 }, { lat: 70, lng: 60 }, { lat: 65, lng: 100 },
  { lat: 55, lng: 130 }, { lat: 45, lng: 140 }, { lat: 35, lng: 130 },
  { lat: 22, lng: 110 }, { lat: 8, lng: 98 }, { lat: 5, lng: 80 },
  { lat: 20, lng: 70 }, { lat: 30, lng: 50 }, { lat: 40, lng: 35 },
  { lat: 45, lng: 30 },
];

const PHILIPPINES: LatLng[] = [
  { lat: 18, lng: 120 }, { lat: 14, lng: 120 }, { lat: 10, lng: 122 },
  { lat: 8, lng: 126 }, { lat: 12, lng: 125 }, { lat: 16, lng: 122 },
];

const JAPAN: LatLng[] = [
  { lat: 44, lng: 142 }, { lat: 40, lng: 140 }, { lat: 36, lng: 137 },
  { lat: 33, lng: 131 }, { lat: 31, lng: 130 }, { lat: 35, lng: 135 },
  { lat: 40, lng: 141 },
];

const AUSTRALIA: LatLng[] = [
  { lat: -11, lng: 130 }, { lat: -15, lng: 145 }, { lat: -25, lng: 153 },
  { lat: -38, lng: 145 }, { lat: -35, lng: 117 }, { lat: -32, lng: 115 },
  { lat: -20, lng: 113 }, { lat: -14, lng: 126 },
];

export const COASTLINE_PATHS: string[] = [
  NORTH_AMERICA, SOUTH_AMERICA, EUROPE, AFRICA, ASIA, PHILIPPINES, JAPAN, AUSTRALIA,
].map(closedPath);
