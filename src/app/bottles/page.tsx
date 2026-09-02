import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { releaseBottle } from "./actions";

function ArrowMark() {
  return (
    <span aria-hidden="true" className="arrow-mark">
      ↝
    </span>
  );
}

export default async function BottlesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("fees")
    .eq("id", user.id)
    .single();

  const { data: bottles } = await supabase
    .from("bottles")
    .select(
      "id, status, distance_km, released_at, origin_shore:shore_zones!bottles_origin_shore_id_fkey(name)",
    )
    .eq("sender_id", user.id)
    .eq("is_test", false)
    .order("released_at", { ascending: false });

  const fees = profile?.fees ?? 0;

  return (
    <main className="ocean-board" id="top">
      <div className="dashboard-grid">
        <section className="release-panel board-panel" style={{ gridColumn: "span 12" }} id="release">
          <h1 className="sr-only">My Bottles</h1>
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">YOUR FULL LOG</p>
              <h2>Every bottle you&apos;ve thrown.</h2>
            </div>
            <span className="price-stamp">−1 FEE</span>
          </div>
          <p className="micro-copy">
            You have <b>{fees}</b> {fees === 1 ? "Fee" : "Fees"}. Sending a bottle costs 1 Fee.
          </p>
          {params.error && (
            <div className="board-alert board-alert-error" role="status">
              <b>THE OCEAN SAID NO:</b> {params.error}
            </div>
          )}
          <form action={releaseBottle} className="release-form">
            <label htmlFor="message">What should the ocean carry?</label>
            <div className="message-paper">
              <textarea
                id="message"
                name="message"
                required
                maxLength={1000}
                rows={7}
                placeholder="Write your message..."
              />
              <span aria-hidden="true" className="paper-fold" />
            </div>
            <div className="release-actions">
              <p>
                <b>Remember:</b> you cannot choose where this washes up.
              </p>
              <button type="submit" disabled={fees < 1} className="game-button game-button-coral">
                Seal and release <ArrowMark />
              </button>
            </div>
          </form>
        </section>

        <section className="voyage-panel board-panel" style={{ gridColumn: "span 12" }}>
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">EVERY VOYAGE</p>
              <h2>Where they&apos;ve gone.</h2>
            </div>
            <Link href="/#voyages" className="text-link">
              ← Back to the board
            </Link>
          </div>
          <div className="voyage-table" role="table" aria-label="All of your bottles">
            <div className="voyage-row voyage-head" role="row">
              <span>BOTTLE</span>
              <span>STATE</span>
              <span>DISTANCE</span>
              <span>CAST OFF</span>
            </div>
            {(bottles ?? []).map((bottle) => (
              <Link href={`/bottles/${bottle.id}`} className="voyage-row" role="row" key={bottle.id}>
                <b>#{bottle.id.slice(0, 6)}</b>
                <span className={`status-word status-${bottle.status}`}>{bottle.status}</span>
                <span>{bottle.distance_km.toFixed(1)} km</span>
                <span>
                  {new Date(bottle.released_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                </span>
              </Link>
            ))}
            {(bottles ?? []).length === 0 && (
              <div className="voyage-empty">Your logbook is dry. Throw the first bottle above.</div>
            )}
          </div>
        </section>
      </div>

      <footer className="board-footer">
        <span>FULL VOYAGE LOG</span>
        <span>THE OCEAN DECIDES ≋</span>
      </footer>
    </main>
  );
}
