const EARTH_RADIUS_M = 6_371_000;
const METERS_PER_DEGREE_LAT = 111_320;

export interface LatLng {
  lat: number;
  lng: number;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function metersPerDegreeLng(lat: number): number {
  return METERS_PER_DEGREE_LAT * Math.cos(degToRad(lat));
}

/** Moves a point by an eastward/northward velocity (m/s) over an elapsed duration. */
export function advancePosition(
  position: LatLng,
  velocityMetersPerSecond: { u: number; v: number },
  elapsedSeconds: number,
): LatLng {
  const dxMeters = velocityMetersPerSecond.u * elapsedSeconds;
  const dyMeters = velocityMetersPerSecond.v * elapsedSeconds;

  const dLat = dyMeters / METERS_PER_DEGREE_LAT;
  const dLng = dxMeters / metersPerDegreeLng(position.lat);

  let newLng = position.lng + dLng;
  if (newLng > 180) newLng -= 360;
  if (newLng < -180) newLng += 360;

  return {
    lat: position.lat + dLat,
    lng: newLng,
  };
}

export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = degToRad(b.lat - a.lat);
  const dLng = degToRad(b.lng - a.lng);
  const lat1 = degToRad(a.lat);
  const lat2 = degToRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return (2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))) / 1000;
}
