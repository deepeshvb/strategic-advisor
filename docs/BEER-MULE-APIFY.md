# Beer Mule — Troon alerts via Apify

The backend can **scrape Troon's Instagram** (or other accounts) with Apify and send you **email + WhatsApp** with the full post and the ordering URL whenever there's a new post. No pasting, no manual step.

## Setup

1. **Sign up at [apify.com](https://apify.com)** and get an API token:  
   **Settings → Integrations → API tokens** (or [console.apify.com/account/integrations](https://console.apify.com/account/integrations)).

2. **Add to your backend env** (e.g. `.env` or `.env.backend`):

   ```env
   BEER_MULE_APIFY_TOKEN=apify_api_xxxxxxxxxxxx
   ```

3. **Optional:**

   - `BEER_MULE_APIFY_ACTOR_ID` — Instagram scraper actor (default: `apify/instagram-post-scraper`).  
     **Recommended paid actors** (subscribe on Apify for reliable post captions):  
     **`apidojo/instagram-scraper-api`** (pay-per-run) or **`scrapier/instagram-profile-post-scraper`** (rent).  
     The free `apify/instagram-post-scraper` often returns 0 posts for some accounts.
   - `BEER_MULE_INSTAGRAM_WATCH` — Comma-separated handles to watch (default: `troonbrewing`).
   - `BEER_MULE_POLL_MINUTES` — How often to check Instagram (default: `5`).

   Example:

   ```env
   BEER_MULE_APIFY_TOKEN=apify_api_xxxx
   BEER_MULE_APIFY_ACTOR_ID=apify/instagram-post-scraper
   BEER_MULE_INSTAGRAM_WATCH=troonbrewing
   BEER_MULE_POLL_MINUTES=5
   ```

4. **Restart the backend.**  
   On startup you should see:  
   `Beer Mule: Apify polling every 5 min for [troonbrewing]`

## Behavior

- Every **N minutes** (see `BEER_MULE_POLL_MINUTES`) the backend calls Apify to fetch the latest posts for the watched account(s).
- **First run:** Only fills the “seen” list (no alerts), so you don’t get spammed with old posts.
- **Later runs:** For each **new** post, the backend:
  - Extracts any ordering URL from the caption (including bare domains like `falsespring.square.site`).
  - Sends you **email** and **WhatsApp** with the **full post** and the **ordering URL(s)**.  
  If no URL is found, it still sends the full post and says “ORDER IMMEDIATELY”.

No UI or manual paste needed — the agent scrapes and shares the post + URL automatically.
