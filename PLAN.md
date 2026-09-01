Yes. I’d structure this more like a **stage-delivery plan** than a normal feature roadmap: every stage has a specific goal, a usable deliverable, requirements, and a clear “we can move on when…” gate.

I’m also keeping the stack close to tools you already use: **Next.js, TypeScript, Supabase/Postgres, Vercel-style web deployment, Vitest**, rather than introducing a completely different ecosystem. The biggest new technical area is the ocean/map simulation. The stages below preserve the rules in your project description: real-time bottle age, current-driven movement, fixed shores, sealed messages, stranded bottles, Fees, Destination Progress, and later cleanup/Current Coin mechanics. 

# 🌊 Digital Message in a Bottle — Stage Delivery Plan

## Target Product

A **web application** where users:

**Write → Seal → Release → Drift → Reach Shore → Receive / Strand → Rescue → Continue**

The main technical principle is that the bottle's destination is **not randomly assigned**. Its route comes from the ocean simulation. 

---

# Stage 0 — Project Foundation

### 🎯 Goal

Create the website foundation before building the ocean.

### Deliverable

A deployed web application with authentication, database connection, basic navigation, and development/test environments.

### Requirements

* Next.js application
* TypeScript
* Supabase project
* PostgreSQL database
* Authentication
* Environment variables
* Basic responsive layout
* Error handling
* Logging
* Testing setup
* Git repository
* Deployment pipeline

### Initial pages

```text
/
├── Login / Register
├── Home
├── Ocean
├── My Bottles
├── Messages
├── Explore
└── Profile
```

Most can just be placeholders at this stage.

### Tech

**Frontend**

* Next.js
* React
* TypeScript
* Tailwind CSS

**Backend / Database**

* Supabase
* PostgreSQL
* Supabase Auth

**Testing**

* Vitest

**Deployment**

* Vercel for the web app
* Supabase hosted database

### ✅ Stage Gate

Move forward when:

> A user can register, log in, reach the application, and their account exists correctly in the database.

---

# Stage 1 — Ocean Simulation Prototype

## 🌊 MVP 1: Prove the Ocean

### 🎯 Goal

Answer the most important technical question:

> **Can we realistically simulate a bottle drifting from a shoreline using ocean-current data?**

Do **not** build the full game yet.

### Deliverable

An internal prototype where we can select a starting shoreline and watch a test bottle move.

### Requirements

#### Shore system

Create predefined Shore Zones.

For the prototype, we only need a few, such as:

```text
Central Philippines
Western Philippines
Okinawa
Pacific Japan
Western Australia
California
Portugal
```

These are test zones—the final shores should depend on what the current simulation proves is practical. 

#### Bottle simulation

Each simulated bottle needs:

```text
latitude
longitude
previous position
current velocity
total distance
release timestamp
simulation timestamp
status
route/history
```

#### Simulation loop

```text
Bottle Position
      ↓
Get Ocean Current
      ↓
Direction + Velocity
      ↓
Calculate New Position
      ↓
Store Position
      ↓
Check Land / Shore
      ↓
Repeat
```

### Need to prove

* Current data can be retrieved.
* Direction works.
* Velocity works.
* Bottle movement looks believable.
* Routes can be stored.
* Land can be detected.
* Shore Zones can be detected.
* Simulation can run without the browser remaining open.

### Possible new technology

This is where we'll probably need technology you haven't used much yet.

Possible sources/services should be evaluated for:

* Ocean-current datasets
* Ocean velocity data
* Coastline geometry
* Geographic calculations

For maps:

**MapLibre GL JS** would be my first choice.

It is web-friendly and doesn't force the whole application into a different stack.

### ⚠️ Important architecture rule

Do **not** simulate every bottle continuously in the user's browser.

The server should own bottle state.

### ✅ Stage Gate

We move on when:

> A bottle can be released from a Shore Zone, follow ocean-current data, have its route persisted, and correctly detect a Shore Zone/land interaction.

This is the biggest technical proof of the project.

---

# Stage 2 — Core Bottle MVP

## 🍾 MVP 2: The Product Actually Works

### 🎯 Goal

Build the smallest version of the **actual product**.

### User journey

```text
REGISTER
   ↓
Choose Home Shore
   ↓
Receive 5 Fees
   ↓
Write Message
   ↓
Pay 1 Fee
   ↓
Seal Bottle
   ↓
Release
   ↓
Ocean Simulation
   ↓
Reach Shore
   ↓
Recipient
   ↓
Break Seal
```

### Requirements

#### Accounts

On registration:

```text
Fees: 5
Home Shore: choose once
Destination Progress: 0
```

#### Home Shore

User chooses one predefined Shore Zone.

Exact physical location is never publicly exposed.

#### Message composer

User can:

* Write message
* Preview
* Seal
* Release

Cost:

> **1 bottle = 1 Fee**

#### Bottle

Every bottle should have:

* Unique ID
* Sender
* Origin Shore
* Release date
* Current coordinates
* Status
* Distance travelled
* Message
* Seal state
* Journey history

#### Receiving

When a bottle reaches a Shore Zone:

```text
Eligible user?
     ↓
YES → Deliver
NO  → Stranded
```

Recipient receives:

> 🪙 +1 Fee
> 🧭 +1 Destination Progress

#### Seal security

This needs to be enforced **server-side/database-side**, not just hidden in the UI.

Sender → knows their original message.

Explorer → cannot retrieve message content.

Hunter → cannot retrieve message content.

Recipient → can break the seal/read it.

### Bottle Passport v1

Show:

```text
Bottle #000281

Origin: Central Philippines
Released: August 27, 2026
Age: 17 days
Distance: 2,891 km

Journey
• Released
• Philippine Sea
• North Pacific
• Reached shore
• Received
```

### Moderation MVP

This must already exist here because we're dealing with anonymous messages.

* Report message
* Rate limits
* Basic automated moderation
* Spam controls
* Block/suspension capability
* Admin review

The source specifically calls for moderation from the beginning rather than treating it as a future enhancement. 

### ✅ Stage Gate

MVP 2 is successful when two real test users can complete:

> **Write → Release → Drift → Arrive → Read**

At this point, **we have an actual minimum viable product.**

---

# Stage 3 — Living Ocean

## 🗺️ MVP 3: Make the Website Feel Like an Ocean

### 🎯 Goal

Turn the working backend into the actual experience.

### Deliverable

Interactive world/ocean map.

### Requirements

Users can:

* Pan around the world
* Zoom
* View ocean currents
* See Shore Zones
* See drifting bottles
* Select bottles
* Follow their own bottle
* View bottle public information

### Drifting bottle card

```text
🍾 Unknown Bottle #8291

Status: Drifting
Age: 183 days
Distance: 5,192 km
Origin: Southeast Asia
Current Region: North Pacific

🔒 Message Sealed
```

### Explorer Mode

User's exploration position is completely separate from their Home Shore.

```text
Home Shore:
🇵🇭 Central Philippines

Exploring:
🌊 North Atlantic
```

### Important restriction

Explorer:

> 👁️ Can observe
> 🔒 Cannot read
> ✋ Cannot interfere with drifting bottles

### Tech

Add:

* MapLibre GL JS
* GeoJSON
* Geographic calculations
* Current-vector visualization
* Bottle-position API

### Performance requirements

Do **not** send every bottle in the database to every browser.

Only retrieve bottles inside the visible map region.

### ✅ Stage Gate

> Users can visually explore the world and watch real simulated bottles move.

---

# Stage 4 — Stranded Bottle Gameplay

## 🔭 MVP 4: Exploration Has a Purpose

### 🎯 Goal

Make waiting for a bottle enjoyable.

### Requirements

If:

> User has received nothing for 24 hours

then:

> 🔭 Stranded Hunt becomes available.

### Stranded system

Bottle reaches Shore Zone.

No recipient available.

```text
Bottle
  ↓
Shore
  ↓
No Recipient
  ↓
STRANDED
```

It remains there until somebody rescues it.

### Hunting

Don't display:

> "14 stranded bottles here."

Users must actually explore the shoreline.

When found:

```text
Something is lying on the shore...

🍾 Bottle #02819
Age: 1 year, 2 months
Stranded: 93 days

🔒 Message Sealed

[ Re-drift Bottle ]
```

### Re-drift

Hunter:

* Cannot read message
* Does not become recipient
* Does not gain Destination Progress
* Gets **+1 Fee**

Bottle:

* Returns to drifting
* Starts from that shoreline
* Keeps original age
* Keeps entire Passport history

### Passport

Add:

```text
March 18, 2028

Stranded — Portugal
Stranded for 41 days
Rescued by Explorer
Re-drifted
```

### Anti-farming

Need:

* One reward per legitimate rescue
* Server-side transactions
* Daily/rate limits where appropriate
* Cannot rescue the same bottle repeatedly through exploits

### ✅ Stage Gate

> A bottle can become stranded, remain there, be discovered by another user, be re-drifted without revealing its message, and continue its original journey.

---

# Stage 5 — Economy & Destinations

## 🧭 MVP 5: Long-Term Progression

### 🎯 Goal

Introduce progression without allowing users to control bottle destinations.

### Destination Progress

Only **received messages** count.

```text
💌 1 / 5
💌 2 / 5
💌 3 / 5
💌 4 / 5
💌 5 / 5
```

Then:

> 🎫 Destination Pass unlocked

### First relocation

Free using Destination Pass.

```text
Central Philippines
        ↓
Destination Pass
        ↓
Portugal
```

### Future relocation

Costs:

> 🪙 **5 Fees**

### Fee economy

| Action                 | Fees |
| ---------------------- | ---: |
| Create account         |   +5 |
| Send bottle            |   -1 |
| Receive bottle         |   +1 |
| Rescue stranded bottle |   +1 |
| Limited Explore reward |   +? |
| First relocation       | Free |
| Future relocation      |   -5 |

### Important backend requirement

Create a proper **transaction ledger**.

Don't only store:

```text
fees = 8
```

Also store:

```text
+5 ACCOUNT_CREATED
-1 BOTTLE_RELEASED
+1 BOTTLE_RECEIVED
+1 BOTTLE_RESCUED
-5 RELOCATION
```

That will make debugging abuse/economy issues much easier.

### ✅ Stage Gate

> A user can earn 5 genuine received messages, unlock their Destination Pass, relocate once for free, and later relocate for 5 Fees.

---

# Stage 6 — Living Currents

## ⚡ MVP 6: Ocean Events

### 🎯 Goal

Make the ocean itself feel alive.

### Monthly Fast Current

Random/scheduled:

> **2–4 days each month**

During event:

```text
⚡ FAST CURRENT

Movement: 2×
Age: 1×
```

This distinction is critical.

A bottle existing for 12 hours:

> Age = **12 hours**

Even if Fast Current allowed it to travel the distance normally expected over ~24 hours. 

### Requirements

* Event scheduler
* Global current multiplier
* Fast Current UI
* Event history
* Passport event recording
* Simulation multiplier

### Bottle Passport

```text
⚡ Fast Current experienced
August 18–20, 2027
```

### ✅ Stage Gate

> We can change ocean movement speed globally without changing bottle age or breaking routes.

---

# Stage 7 — Real Ocean Connection

## 🧹 MVP 7: Environmental Feature

### 🎯 Goal

Connect the digital ocean to real ocean activities.

### Requirements

Cleanup section displaying legitimate:

* Beach cleanups
* Coastal cleanup events
* Marine volunteering
* Conservation opportunities

### Cleanup card

```text
🧹 Coastal Cleanup

📍 Cebu
📅 September 14
👥 Volunteers Welcome

[ Learn More ]
```

### Engagement

User meaningfully explores information for approximately five minutes.

Reward:

> 🪙 Fee
> 🌊 Current Coin

But the website should say:

> **You discovered/learned about this opportunity.**

Not:

> **You volunteered.**

unless participation can actually be verified. 

### Current Coin

```text
1 Current Coin
      ↓
5 minutes
      ↓
2× bottle movement
```

Again:

> Movement changes. Age doesn't.

### Requirements

* Cleanup source integration
* Location/region filtering
* Event expiration
* Organization attribution
* Engagement tracking
* Anti-farming
* Current Coin ledger
* Boost activation
* Passport history

### ✅ Stage Gate

> Users can discover a legitimate cleanup opportunity, earn the appropriate reward through the defined engagement rule, and spend a Current Coin to accelerate digital current movement.

---

# Stage 8 — Production Readiness

## 🚀 MVP 8: Public Beta

### 🎯 Goal

Make the project safe and stable enough for actual strangers.

This is different from simply having all the features.

### Security

* Supabase RLS
* Secure message-access policies
* Rate limiting
* Input validation
* Auth protection
* Abuse prevention
* Secure server-side economy transactions
* Secrets management

### Moderation

* Report message
* Moderation queue
* Delete/quarantine message
* Suspend user
* Ban user
* Spam detection
* Content moderation
* Admin dashboard

### Privacy

* No exact user location
* No public email
* Anonymous bottle identity
* Privacy policy
* Terms
* Age policy

### Reliability

* Error monitoring
* Database backups
* Simulation recovery
* Failed-job retry
* Simulation audit logs
* Performance monitoring

### Testing

* Unit tests
* Integration tests
* Database/RLS tests
* Simulation tests
* End-to-end tests
* Abuse tests
* Economy exploit tests
* Mobile/browser testing

### ✅ Final Gate

```text
Ocean Simulation       ✓
Core Bottle Loop       ✓
Living Map             ✓
Stranded Hunting       ✓
Destination System     ✓
Fast Currents          ✓
Cleanup Connection     ✓
Moderation             ✓
Security               ✓
Production Monitoring  ✓
                       │
                       ▼
                 🌊 PUBLIC BETA
```

---

# 🧱 Recommended Tech Stack

I would deliberately **not overcomplicate your stack**.

| Area                    | Technology                          |
| ----------------------- | ----------------------------------- |
| Web framework           | **Next.js**                         |
| UI                      | **React**                           |
| Language                | **TypeScript**                      |
| Styling                 | **Tailwind CSS**                    |
| Authentication          | **Supabase Auth**                   |
| Database                | **Supabase PostgreSQL**             |
| Database security       | **Supabase RLS**                    |
| Storage                 | **Supabase Storage**                |
| Map                     | **MapLibre GL JS**                  |
| Map data                | GeoJSON                             |
| Geographic calculations | Turf.js / PostGIS where appropriate |
| Ocean simulation        | Server-side TypeScript initially    |
| Background processing   | Scheduled/background worker         |
| Testing                 | **Vitest**                          |
| E2E testing             | Playwright                          |
| Deployment              | **Vercel + Supabase**               |
| Source control          | Git                                 |
| Monitoring              | Sentry or equivalent                |

The bold pieces are especially aligned with technology you've already been working with, so you're not learning an entirely new backend/framework just to build this.

---

# 🗄️ High-Level Database Model

Eventually I would expect something roughly like:

```text
profiles
├── id
├── home_shore_id
├── destination_progress
└── created_at

shore_zones
├── id
├── name
├── region
└── geometry

bottles
├── id
├── sender_id
├── origin_shore_id
├── current_lat
├── current_lng
├── status
├── released_at
├── recipient_id
└── distance_travelled

bottle_messages
├── bottle_id
└── encrypted/protected message

bottle_positions
├── bottle_id
├── latitude
├── longitude
└── timestamp

bottle_events
├── bottle_id
├── event_type
├── shore_id
└── timestamp

deliveries

stranded_bottles

fee_transactions

destination_progress_events

destination_passes

current_coin_transactions

cleanup_opportunities

cleanup_engagements

reports

moderation_actions
```

I would **not finalize this schema during Stage 0**. The ocean prototype will probably teach us things that affect `bottles`, `bottle_positions`, `shore_zones`, and `bottle_events`.

---

# 🪜 Full Delivery Roadmap

The project then becomes much easier to think about:

```text
STAGE 0
🏗️ Website Foundation
        │
        ▼
STAGE 1
🌊 MVP 1 — Prove Ocean Simulation
        │
        ▼
STAGE 2
🍾 MVP 2 — Core Bottle Product
Write → Drift → Receive → Read
        │
        ▼
STAGE 3
🗺️ MVP 3 — Living Ocean Map
        │
        ▼
STAGE 4
🔭 MVP 4 — Stranded Hunting
        │
        ▼
STAGE 5
🧭 MVP 5 — Economy & Destinations
        │
        ▼
STAGE 6
⚡ MVP 6 — Living Currents
        │
        ▼
STAGE 7
🧹 MVP 7 — Real Ocean Connection
        │
        ▼
STAGE 8
🛡️ Production Readiness
        │
        ▼
     🌊 PUBLIC BETA
```

## The most important distinction

I wouldn't treat all eight stages as equally necessary for proving the idea.

**Technical MVP:** Stage 1 — *Can the ocean work?*

**Product MVP:** Stage 2 — *Can someone write a bottle, let it drift, and eventually have another person receive and read it?*

**Playable MVP:** Stage 4 — *Is there something interesting to do while waiting?*

**Full Beta:** Stages 5–8 — *Does it have progression, events, the environmental connection, safety, and enough reliability for real users?*

That gives you real stopping/checking points instead of trying to build the entire 44-section concept at once. 

The **very first implementation task should be Stage 0 foundation followed immediately by Stage 1 ocean simulation**. I would resist building polished bottle-writing screens before Stage 1 is proven, because the real-current simulation is the feature the entire product depends on.
