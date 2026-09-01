import { haversineDistanceKm, type LatLng } from "./geo-math.ts";

export interface ShoreZone {
  id: string;
  slug: string;
  lat: number;
  lng: number;
  radius_km: number;
}

export function findReachedShoreZone(position: LatLng, zones: ShoreZone[]): ShoreZone | null {
  for (const zone of zones) {
    if (haversineDistanceKm(position, { lat: zone.lat, lng: zone.lng }) <= zone.radius_km) {
      return zone;
    }
  }
  return null;
}
