# Address Insights

**Live App:** [Deployed on Vercel](https://your-app-url.vercel.app) _(update after deployment)_

## What It Does

Type any US street address and instantly get a neighborhood pulse:

- **Walking Score** (0-100) — weighted count of amenities within 800m
- **Driving Score** (0-100) — same heuristic at 3km radius
- **Urban/Suburban Index** — density-based classification
- **Leaseability Signal** — composite metric estimating rental attractiveness with "Helps/Hurts" breakdown
- **Interactive Map** — Mapbox GL with amenity markers, walking radius overlay, and fly-to animations
- **Search History** — stored in localStorage, accessible from a slide-out drawer
- **Shareable Pages** — URL contains all state, so sharing a link shows the same insights

## What I Built vs AI

- **My work:** Architecture decisions, design system (color palette, clay morphism, animation specs), scoring heuristics and weights, component decomposition, data flow, UX decisions (what to show, where, why), Leaseability Signal concept, Overpass API integration strategy
- **AI-assisted:** Boilerplate code generation, Tailwind class composition, SVG icons, Framer Motion animation syntax, Mapbox GL marker setup

## Approach

1. Started with design principles: Apple restraint + Google Maps clarity + playful gradients
2. Chose Overpass API (OpenStreetMap) for amenities — free, no API key, real data
3. Kept scoring heuristics simple and transparent: weighted amenity counts with diminishing returns
4. Used URL query params (`?address=...&lat=...&lng=...`) for shareability
5. Split-panel layout: left for data/scores, right for map — synced via hover/click

## Assumptions & Design Decisions

- US addresses only (Mapbox geocoding filtered to `country=us`)
- Walking radius = 800m, driving radius = 3km (standard urban planning benchmarks)
- Diminishing returns on amenity counts (first grocery store matters more than the 5th)
- Leaseability Signal is intentionally directional, not predictive — explained in UI
- Ops View toggle on Leaseability shows the raw weights for transparency

## Setup

```bash
npm install
cp .env.example .env.local
# Add your Mapbox token to .env.local
npm run dev
```

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Framer Motion
- Mapbox GL JS
- Overpass API (OpenStreetMap)
