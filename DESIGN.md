---
name: Digital Message in a Bottle
description: A hand-inked castaway logbook turned into a playable ocean board.
colors:
  maritime-indigo: '#344bb5'
  deep-current: '#20327f'
  signal-coral: '#ef6e59'
  sun-marker: '#f2bb55'
  field-paper: '#f5eedf'
  bright-paper: '#fffaf0'
  weathered-paper: '#e3d7c5'
  foam-note: '#dbe4dc'
  chart-ink: '#17223f'
  soft-ink: '#514f5c'
typography:
  display:
    fontFamily: 'Arial Narrow, Franklin Gothic Condensed, Impact, sans-serif'
    fontSize: 'clamp(3.4rem, 7vw, 6rem)'
    fontWeight: 900
    lineHeight: 0.82
    letterSpacing: '-0.035em'
  player-display:
    fontFamily: 'Arial Narrow, Franklin Gothic Condensed, Impact, sans-serif'
    fontSize: 'clamp(3rem, 6vw, 5.8rem)'
    fontWeight: 900
    lineHeight: 0.82
  headline:
    fontFamily: 'Arial Narrow, Franklin Gothic Condensed, Impact, sans-serif'
    fontSize: 'clamp(2rem, 3vw, 3.4rem)'
    fontWeight: 900
    lineHeight: 0.9
  body:
    fontFamily: 'Trebuchet MS, Verdana, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  log:
    fontFamily: 'Courier New, Courier, monospace'
    fontSize: '0.6875rem'
    fontWeight: 700
    lineHeight: 1.4
  control:
    fontFamily: 'Courier New, Courier, monospace'
    fontSize: '12px'
    fontWeight: 700
  micro:
    fontFamily: 'Courier New, Courier, monospace'
    fontSize: '9px'
    fontWeight: 700
  note:
    fontFamily: 'Segoe Print, Bradley Hand, cursive'
    fontSize: '0.85rem'
    fontWeight: 700
rounded:
  board: '3px'
  irregular: '6px'
  soft: '8px'
spacing:
  board-gap: '16px'
  panel: 'clamp(24px, 4vw, 50px)'
components:
  button-primary:
    backgroundColor: '{colors.signal-coral}'
    textColor: '{colors.chart-ink}'
    typography: '{typography.log}'
    rounded: '{rounded.board}'
    padding: '12px 18px'
  panel:
    backgroundColor: '{colors.bright-paper}'
    textColor: '{colors.chart-ink}'
    rounded: '{rounded.board}'
    padding: '{spacing.panel}'
---

# Design System: Digital Message in a Bottle

## Overview

**Creative North Star: "The Castaway Logbook Arcade"**

The interface feels like a salt-stained field journal someone turned into a tabletop game: dense boxes, blunt display lettering, pencilled marginalia, uneven ink, marine route marks, and small bursts of sun-faded color. It is playful and tactile without becoming childish. The board itself is the navigation, and the real ocean mechanism always remains legible beneath the personality.

The supplied layout reference governs the boxed, poster-like composition and typographic density. The supplied artwork governs surface character: pale weathered ground, graphite marks, imperfect edges, and evidence of a human hand. Motion is sparse and physical—a single bottle drifts and bobs—rather than a collection of interface effects.

**Key Characteristics:**

- One dense, scrollable game board instead of a dashboard shell
- Off-register ink, blunt outlines, torn-paper silhouettes, and stamped labels
- A full but sun-faded palette led by maritime indigo, coral, and signal yellow
- Oversized condensed display type paired with readable workhorse copy
- Real charts, voyage data, messages, and actions used as the visual content

## Colors

Use a full-palette strategy on a pale paper field. Indigo owns the navigational and ocean regions; coral marks warnings and sealed states; yellow marks rewards, energy, and opportunity; charcoal holds the drawing together.

**The Sun-Faded Rule.** Color fields may be bold, but they should look printed on absorbent paper rather than emitted by a screen.

## Typography

Display lettering is heavy, condensed, loud, and compact. Body copy uses a humanist sans-serif stack for long reading, while measurements and IDs use a true monospace. Handwritten notes are rare annotations, never primary content.

**The Poster-and-Log Rule.** Headlines behave like poster lettering; data behaves like a ship log; explanatory copy stays conversational and easy to read.

## Layout

Desktop uses a twelve-column poster grid with intentional span changes, overlaps, and alternating density. The first viewport contains the product thesis, state, primary release action, and a live sense of the ocean. Mobile collapses to one column while preserving the boxed reading order and horizontal status tape.

The board uses shared borders so adjacent regions feel screen-printed as one artifact. Sections are identified by distinctive silhouettes and composition rather than a repeated stack of equal cards.

## Elevation & Depth

Depth is structural and tactile: hard, slightly offset charcoal shadows make controls feel like physical game pieces. Large regions remain flat and share borders. Soft floating-card shadows and translucent glass are outside this world.

**The Printed Board Rule.** Regions stay flat; only things a player can press, move, or pick up earn an offset shadow.

## Shapes

Containers are mostly square or only slightly softened. Borders may wobble through clipped corners, rotations, or an offset inner line, but controls retain generous hit targets. Pills are reserved for tiny state tokens, never full-size actions.

## Components

### Buttons

- **Shape:** Almost square with irregularly soft corners (3–8px), a 3px ink border, and a 48px minimum height.
- **Primary:** Signal Coral, log typography, and a 5px hard offset shadow.
- **Hover / Focus:** Move toward the shadow on hover; use a 3px Signal Coral outer focus outline on every variant.
- **Secondary:** Chart Ink for relocation, Sun Marker for current boosts, and Bright Paper for quiet actions.

### Cards / Containers

- **Corner Style:** Flat board regions use 0–3px corners; loose posters use 3px corners.
- **Background:** Assign one named material color to the entire region.
- **Shadow Strategy:** No shadow for board regions; only loose message slips and cleanup posters lift.
- **Border:** 3px Chart Ink.
- **Internal Padding:** Responsive 24–50px for major regions.

### Inputs / Fields

- **Style:** Bright ruled paper, a three-pixel ink edge, handwritten annotation face, and a folded lower corner.
- **Focus:** The paper brightens and gains an inset Sun Marker line while the global focus outline remains visible.
- **Error / Disabled:** Errors use a full Signal Coral field; disabled controls remain readable at 50% opacity with a reduced physical shadow.

### Navigation

The sticky paper strip uses compact log labels and a boxed ≋ mark. Logged-in destinations are same-page anchors. On mobile, the labels scroll horizontally while the brand wordmark collapses to its mark.

### Living Chart

The chart reverses to Bright Paper ink on a Maritime Indigo field. Drifters become light map marks, while stranded bottles stay coral and shores stay yellow.

## Do's and Don'ts

### Do:

- **Do** let working product content—routes, bottle IDs, shore names, currents, and sealed messages—create the visual richness.
- **Do** preserve strong contrast and obvious focus states even when edges look hand-made.
- **Do** use the supplied reference artwork as quiet material texture rather than as decorative wallpaper that harms legibility.
- **Do** vary scale and density across the board so the scroll has rhythm.

### Don't:

- **Don't** fall back to a polished SaaS dashboard, glass panels, or interchangeable feature cards.
- **Don't** use generic ocean gradients, glossy 3D waves, or a neon deep-sea theme.
- **Don't** make the intentional mess interfere with task order, form labels, or responsive reading.
- **Don't** scatter decorative animation; the drifting bottle is the authored motion moment.
