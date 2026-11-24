# SmartPothole AI — Design System (Master)

Source: UI/UX Pro Max (`--design-system "navigation road safety mobile app map driving"`), adapted.
Kept from the tool: safety-orange + map-teal palette ("Adventure orange + map teal"), Roboto,
subtle motion (dial 3/10), standard density. Rejected from the tool's output: "Aurora UI" gradients and
the scroll-storytelling pattern — both are landing-page devices and unsafe/distracting in a driving app.
Style used instead: Minimalism / Swiss + Flat (the tool's match for map-based mobile products), map-first.

## Principles
1. Map and camera are the content. Chrome floats on them in compact, high-contrast surfaces.
2. Glanceable while moving: one primary action per screen, large type for distance/status, 48dp+ targets.
3. Color carries meaning, never alone: severity = color + label; status = color + text.
4. Honest data: never show invented numbers, positions or confidence.

## Color tokens (Android: res/values/colors.xml + values-night/colors.xml)
| Token | Light | Dark | Use |
|---|---|---|---|
| sp_bg | #F6F7F9 | #0B1220 | Screen background |
| sp_surface | #FFFFFF | #131C2E | Cards, sheets |
| sp_surface_variant | #EEF1F5 | #1C2740 | Inputs, chips, secondary surfaces |
| sp_on_surface | #0F172A | #F1F5F9 | Primary text (≥ 12:1) |
| sp_on_surface_muted | #475569 | #A3B1C6 | Secondary text (≥ 4.5:1 on surface) |
| sp_outline | #D5DBE4 | #2C3A55 | Borders, dividers |
| sp_primary | #C2410C | #FB923C | Brand / primary actions (white on light 5.2:1; #1C1206 on dark) |
| sp_on_primary | #FFFFFF | #1C1206 | |
| sp_secondary | #0E7490 | #22D3EE | "You", route, location |
| sp_on_secondary | #FFFFFF | #04232B | |
| sp_brand_ink | #0B1B33 | #0B1B33 | Logo background, hero |
| sp_danger | #B91C1C | #F87171 | High/critical severity, destructive |
| sp_warning | #B45309 | #FBBF24 | Medium severity, pending |
| sp_success | #15803D | #4ADE80 | Uploaded / resolved |
| sp_info | #1D4ED8 | #93C5FD | Low severity, info |

## Type (Roboto / system)
Display 28/34 bold · Title 20/26 medium · Subtitle 16/22 medium · Body 16/24 · Label 14/20 medium ·
Caption 12/16. Never below 12sp. HUD distance numbers 32sp bold.

## Spacing & shape
4/8 rhythm: 4, 8, 12, 16, 24, 32, 48. Screen gutter 16 (20 on ≥600dp). Corner radius: 12 cards,
16 sheets, 28 FAB/pills. Elevation: cards 0 + 1dp outline; floating map controls 6dp.

## Icons
Material Symbols (filled, 24dp) as vector drawables in res/drawable/ic_*.xml. No emoji anywhere.
Sizes: 20 (inline), 24 (default), 28 (vehicle cards).

## Motion
150ms press feedback, 200–250ms fades/sheet, 900ms map follow animation (linear for position).
Respect "Remove animations" (ANIMATOR_DURATION_SCALE = 0).

## Layout rules
Edge-to-edge on every screen; system-bar insets applied to top bars, bottom nav and floating
controls (`ui/Insets.kt`). Bottom navigation: 4 destinations (Home, Map, Reports, Profile).
