# Travel & Dining Agent — Product Plan

Plan for the **Henry** agent: trip planning + booking and **restaurant reservations** (including hard-to-get spots), with a dedicated config tab and secure payment storage.

---

## 1. Scope Overview

| Area | Features |
|------|----------|
| **Trip planning** | Destination → schedule, costs, airlines, hotels, Airbnb, sightseeing, best sites to book |
| **Booking** | Confirm + pay (flights, hotels, experiences); secure card storage (token only) |
| **Restaurant reservations** | Find restaurants, book tables, **get alerts / book at hard-to-get spots** |
| **Config** | New/existing “Henry” tab: enable/disable, currency, payment keys, preferred sites, dining preferences |

---

## 2. Restaurant Reservations (Including Hard-to-Get)

### 2.1 Core dining features

- **Search & suggest** — By city/neighborhood, cuisine, price, occasion (date/time, party size).
- **One-tap reserve** — Book when the agent has an integration (e.g. OpenTable partner API, or deep links to Resy/OpenTable/Tock).
- **Best sites to book** — Per market: “Book via OpenTable”, “Try Resy for NYC”, “Tock for tasting menus”, etc., with direct links.

### 2.2 Hard-to-get reservations

- **Monitoring / alerts** — When a restaurant is “sold out”, optionally:
  - Monitor Resy / OpenTable / Tock (where legally/ToS allowed) for new slots.
  - Notify user when a slot appears (e.g. “Table for 2 at [X] on [date] at [time] just opened”).
- **Quick book** — If user confirmed in advance (“book as soon as something opens”), agent or backend attempts to book the first matching slot (again subject to APIs/ToS).
- **Concierge-style fallbacks** — Suggest:
  - Similar, easier-to-book alternatives (same area/cuisine/price).
  - Same restaurant, different time or date.
  - “Book via [TableSwap / Snatch'd / Book It For Me]” where applicable (links or future partnerships).

### 2.3 Reference: What others do (to match or exceed)

| Agent / Site | Capabilities we can mirror or use |
|--------------|-----------------------------------|
| **OpenTable Concierge** | AI answers on menus, dietary needs, seating; conversational booking (e.g. “Book me a table for two at Beretta tonight 7PM”). We: use OpenTable API/links where possible; add our own AI for “best spots to book” and fallbacks. |
| **Resy (community bots)** | Bots monitor Resy for drops and snipe slots (e.g. [Resy-Bot](https://github.com/emandel2630/Resy-Bot), [resyapi](https://github.com/gordogekko/resyapi)). We: consider monitoring + alert (“slot available”) and optional auto-book if user pre-confirmed; respect ToS and rate limits. |
| **TableSwap** | Concierge for hard-to-get tables. We: offer “monitor and alert” + “suggest similar available” so we’re in the same category. |
| **Book It For Me** | Monitors top restaurants and books when slots open (NYC, SF, LA, Chicago). We: same idea — monitor + notify + one-click confirm to book. |
| **Snatch'd** | Fast booking for popular NYC spots (Carbone, Lilia, TATIANA). We: fast-notification + “book now” when slot appears. |
| **ReservationFinder** | Monitors Resy, OpenTable, Tock, SevenRooms; alerts every 5 min. We: multi-platform monitoring (where we have access) and configurable alert cadence. |
| **Navan / Aila / TripTrackAI** | Flights + hotels + experiences in one assistant. We: keep Henry as one place for trip + dining + booking. |
| **Camino AI** | Location/travel API: attractions, restaurants, routes. We: use for “where to eat” and “best sites to book” in a given destination. |

### 2.4 Technical angles (APIs / integrations)

- **OpenTable** — [Partner API](https://www.opentable.com/restaurant-solutions/api-partners/) (Booking + Directory). Apply for partner access for real-time availability and booking.
- **Resy** — No official public API; community projects use reverse-engineered auth. Options: (a) monitoring + deep links to Resy app/site, (b) if we implement “monitor + alert”, do so in a ToS-compliant way (e.g. polling with backoff, no scraping of full site).
- **Tock** — API exists; reservation creation may be restricted. Use for discovery + “book at Tock” links.
- **SevenRooms** — B2B; use for “best sites to book” (e.g. “This restaurant uses SevenRooms — book on their site or via [X]”).

---

## 3. Trip Planning & Booking (Recap)

- **Input:** Destination, dates, travelers, budget/preferences.
- **Output:** Day-by-day schedule, flight options (airlines + costs), hotels vs Airbnb, sightseeing, and “best sites to book” (e.g. Booking.com, Airbnb, Skyscanner, direct).
- **Booking flow:** User confirms; optionally adds payment method; agent books (or hands off to partner links) and stores only payment tokens (PCI-friendly).

---

## 4. Secure Card Storage

- **Never store raw PANs.** Use Stripe (or similar) tokenization: frontend sends token to backend; backend stores token ID and uses it for charges.
- **Config tab:** Stripe publishable key (and backend secret key in env) for tokenization and payment.
- **Optional:** Vault for multiple saved payment methods (e.g. “Personal card”, “Business card”) with user-defined labels; backend stores only token references.

---

## 5. Config Tab (Henry)

Existing **Henry** tab to be extended with:

| Setting | Purpose |
|--------|---------|
| Enable / disable | Turn Henry (travel + dining) on/off. |
| Currency | Default currency for trip and dining (e.g. USD). |
| Stripe keys | Publishable (and backend secret) for tokenization and booking payments. |
| Preferred booking sites | Default list for “best sites to book” (flights, hotels, dining). |
| **Dining** | |
| Preferred reservation platforms | OpenTable, Resy, Tock, “all” — used for links and “book here” suggestions. |
| Hard-to-get: enable monitoring | Turn on “notify when slot opens” (and optional auto-book if user confirmed). |
| Alert cadence | How often to check (e.g. every 5–15 min) when monitoring. |
| Cities/regions for monitoring | Limit monitoring to configured cities (e.g. NYC, SF) to control cost/load. |

---

## 6. Implementation Order

1. **Config tab** — Add dining and “hard-to-get” options (monitoring on/off, cadence, cities).
2. **Trip agent (existing)** — Keep/enhance schedule, costs, airlines, hotels, Airbnb, sightseeing, best sites to book.
3. **Restaurant search & suggest** — By destination + filters; output “best sites to book” and direct links (OpenTable, Resy, Tock).
4. **Reservation booking** — OpenTable (if partner API approved); deep links for Resy/Tock; optional “request” flow for others.
5. **Hard-to-get: monitor + alert** — Background job per user request: poll (where allowed) Resy/OpenTable/Tock for a given venue/date/party size; on slot open → notify user and optionally “book now” if pre-confirmed.
6. **Secure payment** — Stripe tokenization; store tokens only; charge on confirm for bookings.
7. **Concierge fallbacks** — “No tables at X; here are 3 similar spots with availability” and “Book via TableSwap / Snatch'd” (links) for hard-to-get venues.

---

## 7. Out of Scope (For Now)

- Actual integration with TableSwap / Snatch'd / Book It For Me (we link out; no API keys in v1).
- Direct Resy booking without their official API (we can link to Resy and offer “monitor + alert” only until we have a compliant path).
- Omakase-style dedicated concierge (e.g. OMAKASE BOOKING); can be a “best sites to book” link for Japan later.

---

This plan keeps the existing Henry tab and trip flow, adds restaurant reservations and hard-to-get behavior (monitor + alert + optional book), aligns with what similar agents do (OpenTable, Resy bots, TableSwap, Snatch'd, etc.), and keeps payment secure via tokenization.
