---
name: SoundShelf
description: Achromatic register — shelfmark, hue tab, and tabular figures. No cards.
colors:
  bg: "hsl(240 20% 99%)"
  bg-raised: "hsl(240 14% 96.5%)"
  ink: "hsl(240 7% 11%)"
  ink-2: "hsl(240 5% 40%)"
  ink-3: "hsl(240 4% 43%)"
  rule: "hsl(240 9% 90%)"
  rule-strong: "hsl(240 8% 78%)"
  danger: "hsl(356 62% 42%)"
  mood: "hsl(220 68% 45%)"
  mood-ink: "hsl(220 64% 28%)"
  bg-dark: "hsl(240 8% 5%)"
  bg-raised-dark: "hsl(240 7% 9%)"
  ink-dark: "hsl(240 15% 97%)"
  ink-2-dark: "hsl(240 6% 67%)"
  ink-3-dark: "hsl(240 5% 55%)"
  rule-dark: "hsl(240 6% 17%)"
  rule-strong-dark: "hsl(240 6% 30%)"
  danger-dark: "hsl(356 76% 66%)"
  mood-dark: "hsl(220 72% 56%)"
  mood-ink-dark: "hsl(220 74% 66%)"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.055
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.273
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.333
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  small:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.538
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.455
    letterSpacing: "0.08em"
    fontVariation: "wdth 88"
  shelfmark:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.04em"
    fontFeature: "tnum"
    fontVariation: "wdth 82"
  figure:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
    letterSpacing: "0.01em"
    fontFeature: "tnum"
rounded:
  none: "0"
  hair: "0.5px"
  focus: "1px"
  control: "2px"
  full: "999px"
spacing:
  hair: "1px"
  control-gap: "0.5rem"
  control-x: "0.625rem"
  inline: "1rem"
  form: "1.5rem"
  section: "2.5rem"
  page: "1rem"
  page-sm: "1.5rem"
  page-lg: "2rem"
components:
  control:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.small}"
    rounded: "{rounded.control}"
    height: "2rem"
    padding: "0 0.625rem"
  control-hover:
    backgroundColor: "{colors.bg-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "2rem"
    padding: "0 0.625rem"
  control-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    typography: "{typography.small}"
    rounded: "{rounded.control}"
    height: "2rem"
    padding: "0 0.625rem"
  control-solid-hover:
    backgroundColor: "{colors.ink-2}"
    textColor: "{colors.bg}"
    rounded: "{rounded.control}"
    height: "2rem"
    padding: "0 0.625rem"
  control-icon:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    height: "2rem"
    width: "2rem"
    padding: "0"
  field:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0.375rem 0 0.4375rem"
  shelfmark:
    textColor: "{colors.mood-ink}"
    typography: "{typography.shelfmark}"
  shelf-tab:
    backgroundColor: "{colors.mood}"
    width: "3px"
    height: "0.75em"
    rounded: "{rounded.hair}"
  row:
    backgroundColor: "transparent"
  row-hover:
    backgroundColor: "{colors.bg-raised}"
  label:
    textColor: "{colors.ink-3}"
    typography: "{typography.label}"
  status-dot:
    backgroundColor: "{colors.ink}"
    width: "6px"
    height: "6px"
    rounded: "{rounded.full}"
---

# Design System: SoundShelf

## Overview

**Creative North Star: "Shelfmark"**

SoundShelf is a catalogue, not a listening room and not a cover-art grid. A Playlist is a filed holding: it is recognised by a three-character shelfmark, a 3px hue tab on the same baseline, and the figures that say what it holds and how long it runs. The product stores no artwork, so those three marks *are* the identity.

The surface is built from three materials only — a cool achromatic ground, a 1px hairline, and Archivo at two widths. Colour enters as one deterministic hue per Playlist, split into a text-safe ink and a fill mark, retuned per theme so the same angle holds on white and on near-black. Light and dark are both first-class; neither is a skin on the other. There are no cards, no panels, no boxes, and no shadows that carry rank. Grouping is a rule and the space around it. The listener reads an ordered register and plays it in the curator's order; the transport is a fixed register at the foot, not a floating player.

**Key Characteristics:**

- Cool 240° achromatic ground and ink; light and dark as equal themes
- One Playlist hue, inherited as `--mood-h` only; sat/lightness are theme parameters
- Archivo with `wdth`: labels at 88%, shelfmarks at 82%; tabular figures on every quantity
- 1px hairlines (`--rule` / `--rule-strong`); 2px radii on controls; fields have none
- Fixed rem type (ratio ~1.2); no fluid headings
- Register-width rows; transport is a ruled foot, never a card

## Colors

A cool, nearly-neutral 240° field. Chromatic colour is a classification mark, not a brand fill.

### Primary

- **Classification Mark** (`mood` / `mood-dark`): fill for the shelf tab, scrub progress, level bars, caret, accent, and the 2px focus ring. Default swatch is hue 220 (the unset/neutral angle). Live hue is chosen from stops `36, 22, 4, 332, 280, 220, 188, 144, 56` by hashing the Playlist id.
- **Classification Ink** (`mood-ink` / `mood-ink-dark`): the text-safe sibling of the same hue. Used on the shelfmark, the current Position, identity hovers, and the brand mark. Light: sat 64% / light 28%. Dark: sat 74% / light 66%. Mark (fill) is light 68%/45% and dark 72%/56%.

Only the hue angle travels in the DOM (`--mood-h`). Saturation and lightness stay in the theme so one Playlist keeps one identity across white and near-black.

### Neutral

- **Register Ground** (`bg` / `bg-dark`): page and transport surface.
- **Raised Ground** (`bg-raised` / `bg-raised-dark`): hover wash on rows and ghost controls; skeleton bars; disabled solid fill. Not a panel colour.
- **Ink** (`ink` / `ink-dark`): primary text and the solid control fill.
- **Secondary Ink** (`ink-2` / `ink-2-dark`): supporting copy, resting controls, figure columns, descriptions.
- **Muted Ink** (`ink-3` / `ink-3-dark`): labels, placeholders, timestamps, empty figures, disabled labels.
- **Hairline** (`rule` / `rule-dark`): default 1px divider, row rules, default borders.
- **Strong Rule** (`rule-strong` / `rule-strong-dark`): field baselines, outline controls, popover inset, scrollbar thumb.

### Semantic

- **Archive Red** (`danger` / `danger-dark`): error copy and destructive *approach* (hover/focus on a delete control). Resting destructive controls stay `ink-2`. Hover wash is the danger hue at 10% alpha.

### Named Rules

**The One Hue Rule.** Colour on the surface is the current Playlist's mood, or danger. Nothing else is coloured. A screen with a second accent has left the system.

**The Tab-and-Ink Rule.** Every mood hue ships two treatments: `mood-ink` for type, `mood` for marks and fills. Never use the fill recipe on text, and never use the ink recipe as a large fill.

**The Neutral Action Rule.** A filled call to action is ink on ground (or ground on ink). Mood may mark identity, the current row, focus, and the scrub fill — it does not paint a button.

## Typography

**Display Font:** Archivo (with `ui-sans-serif, system-ui, sans-serif`)
**Body Font:** Archivo (same)
**Label Font:** Archivo, width axis 88%
**Shelfmark Font:** Archivo, width axis 82%, tabular lining figures

**Character:** One family, two widths. The narrow axis is the column voice a second family would otherwise be hired for; the tabular figures are what make running-time columns align. Weight does the ranking (400 body, 500 controls and labels, 600 titles). Tracking is tight on titles, opened on codes and labels.

The rem scale is fixed, ratio ~1.2: `0.6875 / 0.75 / 0.8125 / 0.9375 / 1.125 / 1.375 / 1.75 / 2.25 / 3.0`. Body is 0.9375rem / 1.5. The largest shipped role is 2.25rem (`text-3xl`); do not fluid-scale headings.

### Hierarchy

- **Display** (600, 2.25rem / 2.375rem, tracking-tight): Studio page titles (Tunes, Playlists, Sign in) and the Playlist title on an editor.
- **Headline** (600, 1.375rem / 1.75rem, tracking-tight): section titles (Running order) and selected Playlist titles in the listener register at `sm+`.
- **Title** (600, 1.125rem / 1.5rem, tracking-tight): wordmark; Playlist titles on small viewports; empty-state headlines use the same size at 500.
- **Body** (400, 0.9375rem / 1.5rem): default copy, field values, editor titles in tables. Descriptions wrap at `max-w-prose`.
- **Small** (500, 0.8125rem / 1.25rem): controls, current track title in the transport, supporting row copy.
- **Label** (500, 0.6875rem / 1rem, 0.08em, uppercase, `wdth` 88%, `ink-3`): column heads, field labels, "PLAYING" / "PAUSED", "STUDIO".
- **Shelfmark** (600, 0.75rem, 0.04em, `tnum`, `wdth` 82%, `mood-ink`): the filed code `SS·` plus three Crockford-like characters (no vowels, no look-alike digits).
- **Figure** (`tnum`, 0.01em): a treatment, not a size. Apply to every quantity — counts, clocks, Positions (`01/07`), starts, byte sizes, dates.

### Named Rules

**The Two-Width Rule.** Archivo carries every role. Hire the `wdth` axis (88% labels, 82% shelfmarks) instead of a second family or a mono face.

**The Figure Rule.** Every quantity is tabular. A changing value must not shift its neighbours. Positions are zero-padded to two digits; clocks are `m:ss` or `h:mm:ss`.

## Layout

The page is a register, not a grid of tiles. Rows span the register measure, a hairline between each, figures right-aligned on the title baseline.

**Page measure.** Public, Studio, and login share one column: `.page` is `max-width: 87.5rem` (1400px), padded `1rem / 1.5rem / 2rem`. The wordmark sits on the same left edge on every surface. The listener holdings column is `.register` at `--register-max` (64rem), left-aligned in `.page`, so two Playlists do not stretch count and time to the far margin.

**Listener.** Masthead is wordmark (links to `/`) + holdings figure (`text-sm` `ink-2`) top-left, theme control top-right (`py-7 / lg:py-10`). `/` is the shelf. `/?playlist=<id>` is that Playlist alone: identity and running order, no other holdings. Share copies that URL, sits under the open holding's track register, and is omitted when nothing can be shared. Playlist columns at `sm+`: `7.5rem` shelfmark | fluid title | `5rem` count | `6.5rem` running time. An open Playlist indents its track register by the shelfmark column (`sm:pl-[7.5rem]`). Track columns: `2rem` Position | fluid title | `4.5rem` starts | `4.5rem` length. Transport is `position: fixed; bottom: 0; z-index: 30` on `bg`, with a 2px scrub rule as its top edge; interior grid is `1fr auto` until `lg`, then `minmax(0,1fr) auto minmax(0,1fr)`, and uses `.page` so it lines up with the wordmark. The page is a `min-h-screen` column. The footer is a ruled closer on the register — it sits under the last holding, not `mt-auto` on the viewport floor, so a short shelf does not leave a floating bar above the transport. `pb-32` on the page column clears the transport only while that bar is mounted.

**Studio.** The same `.page` column; at `lg` it becomes `15rem` sidebar | fluid main, sticky, divided by a vertical `--rule` (not a filled rail). No second max-width inside the main. Page headers sit title and a figure count on one baseline (`gap-x-6`). Forms are `gap-x-6 gap-y-3` with the solid control on the last column, baseline-aligned to the field. Login uses the same `.page`, masthead, and footer; the form is a centered `24rem` column so fields keep a readable measure.

**Density.** Playlist rows `py-3.5 / sm:py-4`; track rows `py-2`; table cells `py-2.5`–`py-3`. Control clusters use `gap-0.5`. Empty states are `py-14`, centered, ruled above and below.

**Breakpoints used:** `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px. Below `sm` the shelfmark column collapses into a tab beside the title; below `md` the tunes table becomes a three-column grid and hides file/date columns.

### Named Rules

**The Register Rule.** Grouping is a hairline and the space around it. Do not wrap a group in a surface. Selecting a Playlist opens its tracks *in place* — the shelf does not navigate away.

## Elevation & Depth

Flat. Rank is weight, size, and a rule — never a shadow. Hover is a ground change to `bg-raised` (140–160ms), never an outline (focus-visible is the exception). Overlays and outline controls draw a 1px edge as an *inset* hairline, not a drop shadow.

### Shadow Vocabulary

- **Inset hairline** (`box-shadow: inset 0 0 0 1px hsl(var(--rule-strong))`): outline controls and floating overlays (the add-to-playlist popover).
- **Inset hairline, resting** (`box-shadow: inset 0 0 0 1px hsl(var(--rule))`): disabled solid control, so the label stays readable against `bg-raised`.

No ambient, key, or offset shadows exist. `bg-raised` is a hover/disabled wash, not a lifted layer.

### Named Rules

**The Hairline Rule.** Depth is a 1px rule or an inset 1px hairline. A drop shadow, blur, or ambient glow is out of system. An inset hairline is a border, not elevation.

## Shapes

Corners are almost square. Controls take `2px` — enough to soften a 32px hit target, never enough to read as a card. Fields are radius 0: they are a baseline, not a box. The shelf tab is a 3×0.75em bar at `0.5px` radius. Focus rings use `1px` radius. Marks that *are* dots (range thumb 10px, status 6px, scrub handle 8px) are full circles (`999px`).

Overlays are 260px wide, ground-filled, edged with the inset hairline; they are not rounded. Check cells inside the popover are `2px` squares. The brand mark is a 2.5×16 tab plus three square-capped rules — the register in 24×24.

### Named Rules

**The 2px Rule.** Radii stay at 2px on controls. Fields stay 0. Do not introduce 8px, 12px, or "card" rounding. Circles are reserved for actual dots.

## Components

Every component is a rule, a state, or a control. None of them is a container. State transitions run 140–260ms (`ease-out`); figure ticks use `tick-in` 220ms `cubic-bezier(0.2, 0.9, 0.25, 1)`; arriving rows fade `row-in` 260ms. `prefers-reduced-motion` collapses animation and transition duration to `0.001ms`.

### Buttons

- **Shape:** 2px radius, 32px tall (`2rem`), 10px inline padding, `0.8125rem` / 500. Icon-only is 32×32 with no inline padding. Gap 8px to a 14–15px icon.
- **Ghost (`.control`):** transparent, `ink-2`. Hover: `ink` on `bg-raised`. Disabled: `ink-3` at 50% opacity.
- **Solid (`.control-solid`):** `ink` fill, `bg` text. Hover: `ink-2` fill. Disabled: `bg-raised` fill, `ink-3` text, inset `--rule` hairline, opacity 1 (so the label does not vanish).
- **Outline (`.control-outline`):** ghost plus inset `--rule-strong` hairline. Used for retry.
- **Danger (`.control-danger`):** ghost at rest. Hover/focus: `danger` text and 10% danger wash. Never a column of red icons at rest.
- **Focus:** 2px solid `mood` outline, 2px offset, 1px radius. Fields suppress the outline and shift the baseline to `mood` instead.
- **Motion:** colour and background 160ms ease-out.

### Status

A state word, never colour alone. Uppercase label plus a 6px dot: `ink` when active, `rule-strong` when muted. Playback always pairs the word ("PLAYING" / "PAUSED") with three 2px level bars in `mood` (paused bars freeze at `scaleY(0.3)`).

### Cards / Containers

None. Do not add them. Empty states, notices, and forms live on the ground between two rules. The one overlay (add-to-playlist) is a 260px ground rectangle with an inset hairline, a ruled header, and a ruled footer — a floating *register*, not a card.

### Inputs / Fields

- **Style:** transparent, no radius, no box. A `--rule-strong` baseline (`padding: 0.375rem 0 0.4375rem`). Placeholder `ink-3`.
- **Focus:** baseline turns `mood`. No glow, no fill.
- **Disabled:** `ink-3`.
- **Inline edit:** a field may start with a transparent baseline and reveal `--rule` on hover, `mood` on focus (tune title cells).
- **File accession:** a ruled row, not a dashed drop-zone. Filename is body ink; size is a figure.
- **Range:** unstyled native range. Track is a 2px `--rule-strong` hairline (drawn as a center gradient so the 10px hit area stays). Thumb is a 10px ink circle.

### Navigation

- **Listener masthead:** wordmark (`title` size, 600) + BrandIcon in `mood` (18px) + holdings figure (`text-sm` `ink-2`). No tagline, no eyebrow.
- **Studio sidebar:** wordmark at `0.8125rem` 600 with a "STUDIO" label. Active item is `ink` / 500 with a shelf tab; inactive is `ink-2` with a 3px spacer. Hover to `ink`. No filled pill.
- **Theme control:** 32px icon button cycling system → light → dark. Announces the current setting.

### Shelfmark (signature)

The identity device. A 3px × 0.75em `mood` tab, then `SS·XXX` in narrow tabular `mood-ink`. An open holding stretches the tab to 1em. Always on the title's baseline, never a badge, never a row border. Unset ids render `SS·———`. Same construction in the listener register, the transport, and the Studio tables.

### Register row (signature)

A register-width grid, `text-align: left`, hover `bg-raised` in 140ms. The open Playlist row holds `bg-raised`; its title goes 600 `mood-ink`; unselected stays 500 and recedes to `ink-2` / `ink-3` while another holding is open (hover restores `ink` / `ink-2`). Current track title is 500 `ink`; others `ink-2`. Current Position is `mood-ink`. Figures right-align. No chevron, no thumbnail, no card chrome.

### Transport (signature)

Fixed foot on `bg`. The top edge *is* the scrubber: a 2px `--rule` track whose `mood` fill reports progress, with an 8px `mood` dot on hover and a taller invisible hit area. Interior: shelf tab + shelfmark + ticking Position + title | skip / solid play-pause / skip / repeat | clock (`current / −remaining`) + level word + volume range. Play is the one solid control. Repeat-on tints `mood-ink` (identity of the holding in play, not a CTA fill).

## Do's and Don'ts

### Do:

- **Do** file every Playlist under a shelfmark, a 3px hue tab, and right-aligned figures on one baseline.
- **Do** inherit only `--mood-h` and let the theme supply sat/lightness (ink vs mark).
- **Do** set every quantity in `.figure` (`tnum`, 0.01em) and every column head in `.label`.
- **Do** divide groups with a 1px `--rule` and space; use an inset 1px hairline for overlays and outline controls.
- **Do** keep control radii at 2px and field radii at 0.
- **Do** fill the primary action with `ink`, not `mood`.
- **Do** name playback state in type ("PLAYING") as well as with the level bars.
- **Do** honour `prefers-reduced-motion` by collapsing motion to `0.001ms`.

### Don't:

- **Don't** lay holdings out as a cover-art grid, tile gallery, or thumbnail list.
- **Don't** float a player card, glass panel, or boxed chrome over the register.
- **Don't** wrap a form, table, or empty state in a card, panel, or filled container.
- **Don't** use a drop shadow, blur, or ambient glow; the inset hairline is the only permitted `box-shadow`.
- **Don't** introduce a second type family, a mono face, or fluid/clamp headings.
- **Don't** paint a button, badge, or progress *container* in the mood hue — tab, scrub fill, focus ring, and text-safe ink only.
- **Don't** show a column of red destructive icons at rest; danger reads on approach.
- **Don't** use colour alone to mean playing, public, error, or selected.
- **Don't** draw a dashed drop-zone or any other box around a file input.
