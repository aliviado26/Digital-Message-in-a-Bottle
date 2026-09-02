"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const REQUIRED_SECONDS = 5 * 60;

export function DiscoverPanel({
  opportunityId,
  alreadyDiscovered,
}: {
  opportunityId: string;
  alreadyDiscovered: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [claimState, setClaimState] = useState<"idle" | "pending" | "done" | "error">(
    alreadyDiscovered ? "done" : "idle",
  );
  const [message, setMessage] = useState<string | null>(
    alreadyDiscovered ? "You've already discovered this opportunity." : null,
  );

  useEffect(() => {
    if (alreadyDiscovered) return;
    const interval = setInterval(() => {
      setElapsed((prev) => (prev < REQUIRED_SECONDS ? prev + 1 : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, [alreadyDiscovered]);

  async function handleClaim() {
    setClaimState("pending");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("claim_cleanup_discovery", {
      p_opportunity_id: opportunityId,
    });

    if (error) {
      setClaimState("error");
      setMessage(error.message);
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    setClaimState("done");
    setMessage(
      `You discovered this opportunity. +1 Fee (now ${result?.fees}), +1 Current Coin (now ${result?.current_coins}).`,
    );
  }

  if (claimState === "done") {
    return (
      <p className="rounded-lg border border-ocean/40 bg-ocean/10 px-4 py-3 text-sm text-ocean">
        {message}
      </p>
    );
  }

  const ready = elapsed >= REQUIRED_SECONDS;
  const remaining = REQUIRED_SECONDS - elapsed;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="flex flex-col gap-2">
      {!ready ? (
        <p className="font-mono text-sm text-ink-muted">
          Keep reading — {minutes}:{seconds.toString().padStart(2, "0")} remaining before you
          can mark this as discovered.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleClaim}
          disabled={claimState === "pending"}
          className="self-start rounded-full bg-ocean px-4 py-2 text-sm font-medium text-ocean-contrast hover:opacity-90 disabled:opacity-50"
        >
          {claimState === "pending" ? "Claiming…" : "I discovered this opportunity"}
        </button>
      )}
      {claimState === "error" && <p className="text-sm text-seal">{message}</p>}
    </div>
  );
}
