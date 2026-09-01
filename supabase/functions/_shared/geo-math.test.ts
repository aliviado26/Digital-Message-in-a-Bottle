import { describe, expect, it } from "vitest";
import { advancePosition, haversineDistanceKm } from "./geo-math";

describe("haversineDistanceKm", () => {
  it("matches the known ~111.32km per degree of latitude at the equator", () => {
    const distance = haversineDistanceKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(distance).toBeCloseTo(111.32, 0);
  });
});

describe("advancePosition", () => {
  it("moves north when v is positive and u is zero", () => {
    const start = { lat: 0, lng: 0 };
    const next = advancePosition(start, { u: 0, v: 1 }, 111_320);
    expect(next.lat).toBeCloseTo(1, 1);
    expect(next.lng).toBeCloseTo(0, 5);
  });

  it("moves east when u is positive and v is zero", () => {
    const start = { lat: 0, lng: 0 };
    const next = advancePosition(start, { u: 1, v: 0 }, 111_320);
    expect(next.lng).toBeCloseTo(1, 1);
    expect(next.lat).toBeCloseTo(0, 5);
  });

  it("wraps longitude past the antimeridian", () => {
    const start = { lat: 0, lng: 179.9 };
    const next = advancePosition(start, { u: 1, v: 0 }, 111_320 * 5);
    expect(next.lng).toBeLessThan(0);
  });
});
