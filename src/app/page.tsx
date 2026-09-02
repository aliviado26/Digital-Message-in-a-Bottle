/*
THESIS: The whole product is a salt-stained tabletop game board, refusing the usual dashboard of detached routes.
OWN-WORLD: Pale field-note paper, maritime indigo, signal coral and yellow, blunt ink borders, hard offset shadows, stamped labels.
STORY: Understand that the ocean decides, see the living world, release a thought, then check what drifted back.
FIRST VIEWPORT: Poster-scale title at left, rules at right, live player state as a ticker, and the release/ocean board immediately below.
FORM: Castaway logbook arcade; a pinned user direction using the top-ranked playable poster grid. Seed key: user-pinned-ocean-board.
*/

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { InkChartMap } from '@/components/ink-chart-map';
import { releaseBottle } from './bottles/actions';
import { activateCurrentBoost } from './actions';

function BottleMark({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden='true' className={className} viewBox='0 0 64 118' fill='none'>
      <path d='M24 4h17l2 8-3 7 1 17c12 7 19 19 19 36v29c0 9-6 13-15 13H19c-9 0-15-4-15-13V72c0-17 7-29 19-36l1-17-3-7 3-8Z' fill='currentColor' stroke='var(--ink)' strokeWidth='3' />
      <path d='M22 18h21M18 57c11 5 19 5 29 0M15 76c12-5 23-5 35 0' stroke='var(--paper)' strokeWidth='3' strokeLinecap='round' />
      <path d='m20 86 10-5 14 5-2 13-21 1-1-14Z' fill='var(--coral)' stroke='var(--ink)' strokeWidth='2' />
    </svg>
  );
}

function ArrowMark() {
  return <span aria-hidden='true' className='arrow-mark'>↝</span>;
}

function GuestBoard() {
  return (
    <main className='ocean-board guest-board'>
      <header className='board-masthead' id='top'>
        <div className='brand-stamp'>
          <BottleMark className='brand-bottle' />
          <span>EST. SOMEWHERE AT SEA</span>
        </div>
        <div className='wordmark-wrap'>
          <p className='hand-note wordmark-note'>a very slow internet game</p>
          <h1 className='wordmark'>
            <span>Digital message</span>
            <span>in a <em>bottle</em></span>
          </h1>
          <p className='hero-deck'>Write something. Seal it. Throw it into the ocean. Then let go.</p>
        </div>
        <aside className='rules-scrap'>
          <span className='tape' aria-hidden='true' />
          <p className='panel-kicker'>THE ONLY RULE</p>
          <strong>You pick the words.</strong>
          <strong>The ocean picks who gets them.</strong>
          <p>No feeds. No instant reply. Maybe tomorrow. Maybe in three years.</p>
        </aside>
      </header>

      <section className='guest-current-stage' id='how' aria-label='How the game works'>
        <div className='current-copy'>
          <p className='panel-kicker'>HOW TO PLAY / 4 MOVES</p>
          <ol className='play-sequence'>
            <li><b>Write</b><span>one honest message</span></li>
            <li><b>Seal</b><span>only its recipient can read it</span></li>
            <li><b>Drift</b><span>real currents move it over time</span></li>
            <li><b>Return</b><span>see what the water brought you</span></li>
          </ol>
          <Link href='/login' className='game-button game-button-coral'>
            Step into the water <ArrowMark />
          </Link>
          <p className='micro-copy'>Free to enter · requires an account · exact locations stay private</p>
        </div>
        <div className='current-scene' aria-hidden='true'>
          <p className='scene-label'>LIVE CURRENT / DESTINATION UNKNOWN</p>
          <div className='sun-disc' />
          <div className='route-line route-one' />
          <div className='route-line route-two' />
          <BottleMark className='drifting-bottle' />
          <span className='shore-word shore-a'>PORTUGAL?</span>
          <span className='shore-word shore-b'>OKINAWA?</span>
          <span className='shore-word shore-c'>W.A.?</span>
          <p className='hand-note scene-note'>you are not allowed to aim</p>
        </div>
      </section>

      <footer className='board-footer guest-footer'>
        <span>ANONYMOUS THOUGHTS / REAL-TIME DRIFT</span>
        <span>THE OCEAN DECIDES ≋</span>
      </footer>
    </main>
  );
}

function formatDistance(distance: number | null) {
  return `${(distance ?? 0).toFixed(1)} km`;
}

function relationName(
  relation: { name?: string | null; region?: string | null } | { name?: string | null; region?: string | null }[] | null,
  key: 'name' | 'region',
) {
  const value = Array.isArray(relation) ? relation[0] : relation;
  return value?.[key] ?? 'Unknown water';
}

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string; boosted?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <GuestBoard />;

  const now = new Date();
  const nowIso = now.toISOString();
  const [
    { data: profile },
    { data: sentBottles },
    { data: receivedBottles },
    { data: shoreZones },
    { data: oceanBottles },
    { data: cleanupOpportunities },
    { data: cleanupEngagements },
    { data: activeFastCurrents },
  ] = await Promise.all([
    supabase.from('profiles').select('fees, destination_progress, relocations_used, current_coins, current_boost_until, home_shore:shore_zones(id, name, region)').eq('id', user.id).single(),
    supabase.from('bottles').select('id, status, distance_km, released_at, origin_shore:shore_zones!bottles_origin_shore_id_fkey(name)').eq('sender_id', user.id).eq('is_test', false).order('released_at', { ascending: false }).limit(4),
    supabase.from('bottles').select('id, status, distance_km, last_ticked_at, origin_shore:shore_zones!bottles_origin_shore_id_fkey(region)').eq('recipient_id', user.id).order('last_ticked_at', { ascending: false }).limit(3),
    supabase.from('shore_zones').select('id, name, lat, lng').order('name').limit(4000),
    supabase.from('explorable_bottles').select('id, lat, lng, status').limit(240),
    supabase.from('cleanup_opportunities').select('id, title, organization, region, summary, expires_at').or(`expires_at.is.null,expires_at.gt.${nowIso}`).order('region').limit(2),
    supabase.from('cleanup_engagements').select('opportunity_id').eq('user_id', user.id),
    supabase.from('ocean_events').select('ends_at').eq('event_type', 'fast_current').lte('starts_at', nowIso).gte('ends_at', nowIso).limit(1),
  ]);

  const fees = profile?.fees ?? 0;
  const progress = profile?.destination_progress ?? 0;
  const coins = profile?.current_coins ?? 0;
  const homeShore = relationName(profile?.home_shore ?? null, 'name');
  const passUnlocked = (profile?.relocations_used ?? 0) === 0 && progress >= 5;
  const boostUntil = profile?.current_boost_until ? new Date(profile.current_boost_until) : null;
  const boostActive = boostUntil ? boostUntil.getTime() > now.getTime() : false;
  const activeFastCurrent = activeFastCurrents?.[0] ?? null;
  const discoveredIds = new Set((cleanupEngagements ?? []).map((item) => item.opportunity_id));
  const inboxCount = receivedBottles?.length ?? 0;

  return (
    <main className='ocean-board' id='top'>
      <header className='player-masthead'>
        <div className='brand-stamp player-stamp'>
          <BottleMark className='brand-bottle' />
          <span>FIELD LOG / {homeShore}</span>
        </div>
        <div className='player-title-wrap'>
          <p className='hand-note'>your corner of a very large ocean</p>
          <h1 className='player-title'>Message in a Bottle</h1>
        </div>
        <div className='weather-box'>
          <span className='panel-kicker'>CURRENT WEATHER</span>
          <strong>{activeFastCurrent ? 'FAST & STRANGE' : 'SLOW & STEADY'}</strong>
          <span>{activeFastCurrent ? `2× until ${new Date(activeFastCurrent.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'The usual mystery'}</span>
        </div>
      </header>

      <section className='status-tape' aria-label='Player status'>
        <div><span>FEES</span><strong>{fees}</strong><small>send / move</small></div>
        <div><span>HOME SHORE</span><strong>{homeShore}</strong><small>your only anchor</small></div>
        <div><span>DESTINATION</span><strong>{progress} / 5</strong><small>{passUnlocked ? 'pass unlocked!' : 'messages opened'}</small></div>
        <div><span>CURRENT COINS</span><strong>{coins}</strong><small>five-minute boosts</small></div>
      </section>

      {(params.error || params.boosted) && (
        <div className={params.error ? 'board-alert board-alert-error' : 'board-alert'} role='status'>
          <b>{params.error ? 'THE OCEAN SAID NO:' : 'CURRENTS ARE MOVING 2×:'}</b>{' '}
          {params.error ?? 'Your five-minute Current Coin boost is live.'}
        </div>
      )}

      <div className='dashboard-grid'>
        <section className='release-panel board-panel' id='release'>
          <div className='panel-heading'>
            <div>
              <p className='panel-kicker'>THE THROWING DECK</p>
              <h2>Say it, seal it, lose control.</h2>
            </div>
            <span className='price-stamp'>−1 FEE</span>
          </div>
          <form action={releaseBottle} className='release-form'>
            <input type='hidden' name='returnTo' value='/' />
            <label htmlFor='message'>What should the ocean carry?</label>
            <div className='message-paper'>
              <textarea id='message' name='message' required maxLength={1000} rows={7} placeholder='Dear somebody, somewhere…' />
              <span aria-hidden='true' className='paper-fold' />
            </div>
            <div className='release-actions'>
              <p><b>Remember:</b> you cannot choose where this washes up.</p>
              <button type='submit' disabled={fees < 1} className='game-button game-button-coral'>
                {fees < 1 ? 'You need 1 Fee' : 'Seal & throw'} <ArrowMark />
              </button>
            </div>
          </form>
        </section>

        <aside className='rulebook-panel board-panel'>
          <p className='panel-kicker'>RULES OF THE WATER</p>
          <ol className='rule-list'>
            <li><b>01</b><span>The ocean decides the route.</span></li>
            <li><b>02</b><span>Time stays real, even when currents race.</span></li>
            <li><b>03</b><span>Only the final recipient breaks the seal.</span></li>
            <li><b>04</b><span>Hunters rescue. They never steal.</span></li>
          </ol>
          <p className='hand-note rule-note'>no cheating the tide!</p>
        </aside>

        <section className='chart-panel board-panel' id='ocean'>
          <div className='panel-heading chart-heading'>
            <div>
              <p className='panel-kicker'>THE LIVING CHART</p>
              <h2>Everything currently lost at sea.</h2>
            </div>
            <Link href='/explore' className='text-link'>Open hunter mode ↗</Link>
          </div>
          <div className='chart-shell'>
            <InkChartMap zones={shoreZones ?? []} bottles={oceanBottles ?? []} caption={`${oceanBottles?.length ?? 0} visible drifters`} />
          </div>
          <div className='chart-legend'>
            <span><i className='legend-dot legend-ocean' /> drifting</span>
            <span><i className='legend-dot legend-coral' /> stranded</span>
            <span><i className='legend-dot legend-yellow' /> shore</span>
            <b>CLICK A BOTTLE IN HUNTER MODE TO TRACE ITS VOYAGE</b>
          </div>
        </section>

        <section className='inbox-panel board-panel' id='inbox'>
          <div className='panel-heading'>
            <div>
              <p className='panel-kicker'>YOUR TIDELINE</p>
              <h2>What washed ashore.</h2>
            </div>
            <span className='count-splash'>{inboxCount}</span>
          </div>
          <div className='message-stack'>
            {(receivedBottles ?? []).map((bottle, index) => (
              <Link href={`/messages/${bottle.id}`} className='washed-message' key={bottle.id} style={{ '--message-index': index } as CSSProperties}>
                <span className='wax-dot' aria-hidden='true'>×</span>
                <span>
                  <b>{bottle.status === 'read' ? 'An opened bottle' : 'A sealed bottle is waiting'}</b>
                  <small>From {relationName(bottle.origin_shore, 'region')} · {formatDistance(bottle.distance_km)}</small>
                </span>
                <em>open ↗</em>
              </Link>
            ))}
            {inboxCount === 0 && (
              <div className='empty-tideline'>
                <span aria-hidden='true'>≈</span>
                <p><b>Nothing yet.</b> The empty shore is part of the game.</p>
              </div>
            )}
          </div>
          <Link href='/messages' className='text-link panel-link'>See the whole tideline →</Link>
        </section>

        <section className='voyage-panel board-panel' id='voyages'>
          <div className='panel-heading'>
            <div>
              <p className='panel-kicker'>YOUR LOST THINGS</p>
              <h2>Voyage log.</h2>
            </div>
            <Link href='/bottles' className='text-link'>Full passports ↗</Link>
          </div>
          <div className='voyage-table' role='table' aria-label='Your recent bottles'>
            <div className='voyage-row voyage-head' role='row'>
              <span>BOTTLE</span><span>STATE</span><span>DISTANCE</span><span>CAST OFF</span>
            </div>
            {(sentBottles ?? []).map((bottle) => (
              <Link href={`/bottles/${bottle.id}`} className='voyage-row' role='row' key={bottle.id}>
                <b>#{bottle.id.slice(0, 6)}</b>
                <span className={`status-word status-${bottle.status}`}>{bottle.status}</span>
                <span>{formatDistance(bottle.distance_km)}</span>
                <span>{new Date(bottle.released_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
              </Link>
            ))}
            {(sentBottles ?? []).length === 0 && (
              <div className='voyage-empty'>Your logbook is dry. Throw the first bottle from the deck above.</div>
            )}
          </div>
        </section>

        <section className='harbor-panel board-panel' id='harbor'>
          <p className='panel-kicker'>HARBOR OFFICE</p>
          <h2>Move yourself.<br />Never the bottle.</h2>
          <dl className='harbor-facts'>
            <div><dt>Current shore</dt><dd>{homeShore}</dd></div>
            <div><dt>Next move</dt><dd>{passUnlocked ? 'Destination Pass' : `${Math.max(0, 5 - progress)} arrivals away`}</dd></div>
          </dl>
          <Link href='/relocate' className='game-button game-button-ink'>Visit relocation desk <ArrowMark /></Link>
        </section>

        <section className='cleanup-panel board-panel' id='cleanup'>
          <div className='cleanup-intro'>
            <p className='panel-kicker'>THE REAL OCEAN</p>
            <h2>Take five minutes.<br />Learn where help is needed.</h2>
            <p>Discover a legitimate coastal cleanup opportunity. Learning earns one Fee and one Current Coin; it never pretends you volunteered.</p>
            <Link href='/cleanup' className='text-link'>Browse every opportunity →</Link>
          </div>
          <div className='cleanup-posters'>
            {(cleanupOpportunities ?? []).map((opportunity, index) => (
              <Link href={`/cleanup/${opportunity.id}`} className='cleanup-poster' key={opportunity.id}>
                <span className='poster-number'>0{index + 1}</span>
                <span className='poster-region'>{opportunity.region}</span>
                <b>{opportunity.title}</b>
                <p>{opportunity.organization}</p>
                <small>{discoveredIds.has(opportunity.id) ? 'DISCOVERED ✓' : '+1 FEE / +1 CURRENT COIN'}</small>
              </Link>
            ))}
            {(cleanupOpportunities ?? []).length === 0 && (
              <div className='cleanup-empty'>No active field notices right now. Check back with the next tide.</div>
            )}
          </div>
        </section>

        <section className='boost-panel board-panel'>
          <div>
            <p className='panel-kicker'>CURRENT MACHINE</p>
            <h2>{boostActive ? 'The water is running fast.' : 'Make the water run fast.'}</h2>
            <p>{boostActive && boostUntil ? `Your bottles move at 2× until ${boostUntil.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Their age still stays real.` : 'One Current Coin makes your bottles move at 2× for five minutes. Time itself does not speed up.'}</p>
          </div>
          {boostActive ? (
            <span className='machine-state machine-live'>2× LIVE</span>
          ) : coins > 0 ? (
            <form action={activateCurrentBoost}>
              <button type='submit' className='game-button game-button-yellow'>Spend 1 coin <ArrowMark /></button>
            </form>
          ) : (
            <Link href='#cleanup' className='game-button game-button-paper'>Find a Current Coin <ArrowMark /></Link>
          )}
        </section>
      </div>

      <footer className='board-footer'>
        <span>FIELD LOG FOR {user.email?.toUpperCase()}</span>
        <span>WRITE / RELEASE / DRIFT / RETURN</span>
        <span>THE OCEAN DECIDES ≋</span>
      </footer>
    </main>
  );
}
