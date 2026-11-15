# DESIGN — Tactile Sunlit Architectural Miniature

## Visual World
- **Concept:** A tactile, physical architectural miniature and sunlit studio home where every surface carries real material grain — horizontal clapboard siding, warm quarter-sawn oak flooring, Venetian plaster walls, veined marble countertops, brushed stainless steel, and woven textiles.
- **Lighting & Atmosphere:** Golden-hour directional sun with soft shadow maps, procedural sky environment reflections (`Environment`), ground contact shadows (`ContactShadows`), and volumetric window sunbeams.

## Typography
- **Display / Editorial Voice:** `'Instrument Serif', Georgia, serif` — used for chapter titles and editorial broadsheet headers.
- **Body / UI Voice:** `'Plus Jakarta Sans', -apple-system, sans-serif` — clean, high-legibility geometric sans for concise descriptions.
- **Technical / Measurement Voice:** `'JetBrains Mono', monospace` — strictly reserved for real hardware metrics (`59.9 dB`, `76.7° PM`, `21.3 µm²`, `180nm`) and `tabular-nums`.

## Color & Contrast (OKLCH)
- **Architectural Exterior:** Powder-Blue Clapboard (`#7ec8eb`) with Deep Cobalt Glazed Roof Tiles (`#172554` / `#1e3a8a`) and Crisp Trim (`#f8fafc`).
- **HUD Surface:** Deep Warm Slate (`oklch(0.19 0.03 248 / 0.88)`) with single-elevation soft shadow (`0 18px 40px -12px rgba(9, 13, 22, 0.52)`).
- **Primary Text:** Warm Ivory (`oklch(0.97 0.01 85)`)
- **Tinted Secondary Text:** Sunlit Sky Tint (`oklch(0.84 0.04 230)`) — never flat gray on colored surfaces.

## Motion & Craft Rules (Emil Kowalski + Impeccable Craft Floor)
1. **No Eyebrow / Kicker Above Headings:** Let the `Instrument Serif` heading speak directly; room context is integrated cleanly without uppercase kicker clutter.
2. **Single Elevation:** No neon border + wide shadow ("ghost card").
3. **Custom Easing:** `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for all UI transitions (`180ms` duration, `scale(0.96)` + `opacity: 0` + `blur(2px)` crossfade on chapter changes).
4. **Themed Browser Surfaces:** Custom `::selection`, custom scrollbar, and `tabular-nums`.
