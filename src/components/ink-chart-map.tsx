"use client";

import {
  CHART_WIDTH,
  CHART_HEIGHT,
  COASTLINE_PATHS,
  project,
  pointsToPath,
  type LatLng,
} from "@/lib/ocean/chart-projection";

export interface ChartZone extends LatLng {
  id: string;
  name: string;
}

export interface ChartBottle extends LatLng {
  id: string;
  status: string;
}

export interface ChartArrow extends LatLng {
  headingDeg: number;
}

const STATUS_COLOR: Record<string, string> = {
  drifting: "var(--accent)",
  delivered: "var(--brass)",
  beached: "var(--brass)",
  stranded: "var(--seal)",
  lost: "var(--text-muted)",
  read: "var(--text-muted)",
};

function bottleColor(status: string): string {
  return STATUS_COLOR[status] ?? "var(--accent)";
}

export function InkChartMap({
  zones,
  bottles,
  arrows = [],
  path,
  onSelectBottle,
  caption,
}: {
  zones: ChartZone[];
  bottles: ChartBottle[];
  arrows?: ChartArrow[];
  path?: LatLng[];
  onSelectBottle?: (id: string) => void;
  caption?: string;
}) {
  const voyageEnd = path && path.length > 0 ? project(path[path.length - 1]) : null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-wide text-ink-muted">
        <span>Chart of the Known Currents</span>
        {caption && <span>{caption}</span>}
      </div>
      <svg
        viewBox={`0 40 ${CHART_WIDTH} ${CHART_HEIGHT - 80}`}
        className="h-[480px] w-full"
        role="img"
        aria-label="Hand-drawn chart of shore zones and drifting bottles"
      >
        <circle
          cx={CHART_WIDTH / 2}
          cy={CHART_HEIGHT / 2}
          r={CHART_HEIGHT / 2 - 20}
          className="fill-none stroke-ink/25"
        />

        {COASTLINE_PATHS.map((d, index) => (
          <path
            key={index}
            d={d}
            className="fill-none stroke-ink/70"
            strokeWidth={1.4}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {arrows.map((arrow, index) => {
          const { x, y } = project(arrow);
          return (
            <text
              key={index}
              x={x}
              y={y}
              fontSize={11}
              textAnchor="middle"
              className="fill-ocean/40"
              transform={`rotate(${arrow.headingDeg}, ${x}, ${y})`}
            >
              &#10148;
            </text>
          );
        })}

        {zones.map((zone) => {
          const { x, y } = project(zone);
          return (
            <g key={zone.id}>
              <circle cx={x} cy={y} r={4} className="fill-brass stroke-surface" strokeWidth={1.5} />
              <title>{`Shore Zone: ${zone.name}`}</title>
            </g>
          );
        })}

        {path && path.length > 1 && (
          <path
            d={pointsToPath(path)}
            className="fill-none stroke-seal"
            strokeWidth={1.6}
            strokeDasharray="5 5"
          />
        )}
        {voyageEnd && (
          <text x={voyageEnd.x} y={voyageEnd.y} fontSize={16} textAnchor="middle">
            🍾
          </text>
        )}

        {bottles.map((bottle) => {
          const { x, y } = project(bottle);
          return (
            <circle
              key={bottle.id}
              cx={x}
              cy={y}
              r={4.5}
              fill={bottleColor(bottle.status)}
              className="cursor-pointer stroke-surface"
              strokeWidth={1.5}
              onClick={() => onSelectBottle?.(bottle.id)}
            >
              <title>{`Bottle ${bottle.id.slice(0, 8)} — ${bottle.status}`}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}
