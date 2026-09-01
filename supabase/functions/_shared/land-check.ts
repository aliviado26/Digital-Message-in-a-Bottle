import { booleanPointInPolygon } from "npm:@turf/boolean-point-in-polygon@7";
import { point } from "npm:@turf/helpers@7";
import landData from "./land-110m.json" with { type: "json" };
import type { LatLng } from "./geo-math.ts";

// deno-lint-ignore no-explicit-any
type GeoJsonFeature = any;

const landFeatures = (landData as { features: GeoJsonFeature[] }).features;

/** Natural Earth 110m land polygons — coarse, good enough to prove land detection. */
export function isOnLand(position: LatLng): boolean {
  const pt = point([position.lng, position.lat]);
  return landFeatures.some((feature) => booleanPointInPolygon(pt, feature));
}
