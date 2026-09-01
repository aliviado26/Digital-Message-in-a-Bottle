"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Route error boundary", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <h2 className="font-display text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-ink-muted">{error.message}</p>
      <button
        onClick={() => reset()}
        className="rounded-full bg-ocean px-4 py-2 text-ocean-contrast hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
