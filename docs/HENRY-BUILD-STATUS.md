# Henry (Travel & Dining Agent) — Build Status

## ✅ Already implemented

### Backend
- **Config** — Henry settings: enabled, currency, Stripe key, preferred booking sites, preferred reservation platforms (OpenTable, Resy, Tock), monitoring on/off, alert cadence, monitoring cities, **reminder calls on/off**.
- **Travel plan** — `POST /api/travel/plan`: destination + dates/budget → LLM-generated schedule, costs, airlines, hotels, Airbnb, sightseeing, best booking sites. Automatically adds a **travel reminder** (Henry calls you ~1 day before trip) when start date is provided.
- **Booking** — `POST /api/travel/book`: confirm + optional payment token; token stored **encrypted** (card data never stored).
- **Call with plan** — `POST /api/henry/call-with-plan`: Twilio voice call with your travel plan summary; Henry sign-off.
- **Reminders** — `GET/POST/DELETE /api/henry/reminders`: store for travel, restaurant, and appointment reminders. **Cron every 15 min**: if an item is due in the next 30 minutes, Henry **calls you** with a reminder (e.g. “Reminder: Restaurant reservation — Carbone, NYC. Coming up soon.”).
- **Restaurants** — `POST /api/travel/restaurants`: city + optional cuisine/date/party/budget → suggestions + best sites to book + hard-to-get tip.
- **Reservations** — `POST /api/travel/reservations`: restaurant + city + date/time/party → booking links; optional “add reminder” so Henry calls before the reservation.

### Frontend
- **Henry tab** — Enable, currency, Stripe key, preferred booking sites.
- **Travel form** — Destination, dates, travelers, budget → “Ask Henry for a plan” → show plan → confirm & store payment token.

---

## ✅ Gaps fixed (UI complete)

1. **“Call me with this plan”** — Button added in the travel form; calls `/api/henry/call-with-plan` so Henry rings you with the plan summary.
2. **Henry config** — UI added for: preferred reservation platforms, “Reminder calls” on/off, “Hard-to-get: monitor” on/off, alert cadence (minutes), monitoring cities.
3. **Restaurant search** — Form on Henry tab: city (required), cuisine, date, party size, budget → “Find restaurants” → calls `/api/travel/restaurants` and shows suggestions + best sites to book.
4. **Reservations** — Form: restaurant name, city, date, time, party size, “Add reminder” checkbox → “Get booking links” → calls `/api/travel/reservations`; shows booking info and “Reminder added” when applicable.
5. **Reminders list** — Section “Upcoming reminders (travel, restaurant, appointment)” with Refresh, upcoming list (type, title, time, Remove), and past list with delete.

---

## Summary

**Backend:** Henry is fully wired: travel plans, booking with secure token storage, call-with-plan, reminders (travel/restaurant/appointment), reminder **voice calls** (cron every 15 min), restaurant search, and reservation links.  

**Frontend:** Henry tab now includes: full config (including reminder calls, reservation platforms, monitoring), travel form with **“Call me with this plan”**, restaurant search form, reservations form with “Add reminder”, and reminders list (upcoming/past, remove). UI matches backend behavior.
