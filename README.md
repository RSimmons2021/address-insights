# Address Insights

**Live App (Vercel):** https://address-insights-pi.vercel.app/ 

## What I Personally Built vs AI

**I built:**
- Product/UX scope and architecture decisions
- Scoring logic (Walking, Driving, Urban/Suburban, Leaseability)
- Data flow between search, insights, compare mode, map, and sharing
- Snapshot sharing model (stable IDs in Supabase) and API contract
- Feature behavior and edge-case handling (history, compare limits, fallback states)

**AI-assisted:**
- Some UI/components
- Tailwind class scaffolding and Framer Motion animation implementation
- Code generation acceleration

## My Approach

1. Start with the user goal: quickly evaluate an address for leasing decisions.
2. Use real external data (Mapbox + Overpass) and keep scoring transparent.
3. Build required features first (scores, map, history, shareability), then extend with compare mode.
4. Keep implementation pragmatic: clear contracts, typed payloads, production-style env config.

## Assumptions and Design Decisions

- US-focused address search.
- Heuristic scores are directional, not predictive.
- Walking radius uses a tighter local range; driving uses a larger radius.
- Search history is local-only (`localStorage`) by design.
- Shared links support stable snapshots via Supabase (`shared_snapshots`).
- Compare mode is limited to 2-10 addresses for UI clarity and performance.
