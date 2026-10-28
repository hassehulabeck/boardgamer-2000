# Boardgamer 2000 — Development plan

A PWA for our lunch-time board game group (~10 people, 3–6 per game, ~10 games where 2–3
are played most). Live at https://web-production-56a0d.up.railway.app

Status legend: `[x]` done · `[ ]` to do · `[~]` in progress

---

## Requirements (from Hans, 2026-10-28)

- Anyone can create a game session and anyone can score a game.
- A session that is created but never used (e.g. two people creating one at the same time)
  self-destructs within an hour.
- Each user (identified per phone) can add and edit their own info: name, avatar image, etc.
  Phone-based identity is enough for our small group.
- Stats are collected per session: start time, end time, date, game, participants, winner.
  Stats can be viewed by game, by weekday, by profile and in total.
- The finger picker is limited to 5 fingers on iPhone — we need a method for more people.
- A session is created by choosing a game and selecting players.
- Anyone can add a game. Title is required; image and BoardGameGeek URL are optional.
- Anyone can put themselves on a "want to play today" list, with a time slot. Lunches range
  from 11:30 to 12:30, so it's useful to see e.g. that three people are coming at 12:00.

More will come later.

---

## Key design decisions

### Identity: group code + phone
- First visit: enter the shared **group code** (env `GROUP_CODE`). This creates a *device*
  with a long-lived, httpOnly cookie. Only a hash of the token is stored.
- Then: **create a profile**, or **"I'm already in the list → pick your profile"**. The
  second option exists because an iOS home-screen app has storage separate from Safari, and
  for new phones. One profile can have several devices. Trust-based, no passwords.

### Images in Postgres
Avatars and game images are resized on the phone (≈256 px JPEG, ~20 KB) and stored as
`bytea`. Served from their own routes with cache headers. No separate file storage needed.

### Session lifecycle
```
draft ──start──▶ in progress ──finish──▶ finished
  │                    │
  └─ >1 h not started  └─ >4 h not finished → flagged "unfinished"
     → deleted            (finish it or discard it)
```
- **Draft**: game and players chosen. **Start**: `started_at` set (and starting player if
  the picker was used). **Finish**: `ended_at`, winner(s), optional scores.
- Cleanup runs lazily on requests, so no cron job is needed.
- **Duplicate guard**: when creating a session, if someone created one including you in the
  last few minutes, offer "Anna just created a Catan session with you — join that instead?"

### Starting-player picker for more than 5
The finger picker stays for quick use. Sessions also get a **spinning wheel** with the
players' avatars that works for any number of players and saves the starting player. The
app picks the wheel automatically when there are more players than the device can track.

### Data model
| Table | Fields |
|---|---|
| `players` | id, name, color, avatar, avatar_updated_at, created_at, updated_at |
| `devices` | id, token_hash, player_id, user_agent, created_at, last_seen_at |
| `games` | id, title, image, bgg_url, created_by, created_at |
| `sessions` | id, game_id, status, starting_player_id, created_by, created_at, started_at, ended_at, updated_by, updated_at |
| `session_players` | session_id, player_id, score, is_winner |
| `availability` | date, player_id, time_slot (one per person per day) |

Times are stored in UTC (`timestamptz`); weekday/date grouping uses `Europe/Stockholm`.

---

## Phases

### Phase 0 — Groundwork ✅
- [x] SvelteKit project, PWA manifest, icons, offline service worker
- [x] Finger picker (`/picker`)
- [x] Deployed to Railway

### Phase 1 — Foundation and profiles ✅
- [x] Postgres on Railway + Drizzle schema and migrations (run as Railway pre-deploy step)
- [x] Group code (`/join`) and device cookie
- [x] Create profile or pick existing profile (`/welcome`)
- [x] Profile page (`/profile`): name, avatar photo, color (also used in the picker)
- [x] "Disconnect this phone" (unlink device)
- [x] Group shown on the start page

### Phase 2 — Game library ✅
- [x] Add, edit and delete games: title (required, unique), picture (optional), BGG link
      (optional, must be a boardgamegeek.com link)
- [x] Game list (`/games`) and "Games" tile on the start page
- [x] Sort most-played to the top (done in phase 3)

### Phase 3 — Game sessions (the core) ✅
- [x] Create session (`/sessions/new`): pick game, tap players, duplicate guard (someone
      else's draft/running session with any of the same players in the last 15 min)
- [x] Change game/players while still a draft
- [x] Starting player: finger picker (`/picker?session=…` asks "whose finger was it?"),
      spinning wheel, or tap the player; the wheel is suggested when there are more players
      than the phone can track. Starting sets the clock.
- [x] Running clock; finish with winner(s) (several allowed), optional points (top score is
      auto-marked as winner until someone taps a trophy), "nobody won", start/end times
- [x] Session page polls every 10 s so all phones follow along
- [x] History (`/sessions`) grouped by day; "Right now" on the start page
- [x] Anyone can edit a result or delete a session; edits show "Edited by"
- [x] Drafts deleted after 1 h; running games flagged "never finished" after 4 h
- [x] Game list sorted by most played; games with sessions can't be deleted

### Phase 4 — Stats ✅
- [x] Total (`/stats`): games played, hours at the table, game days, most-played games,
      most wins
- [x] By game (`/stats/games/[id]`): plays, average/shortest/longest, last played, top
      winners, high score, starting-player advantage (vs. chance, verdict only from 5 games)
- [x] By profile (`/stats/players/[id]`): plays, wins, win rate, win streak (current/best),
      hours, times first, favorite day, favorite games, head-to-head
- [x] By weekday (on `/stats`): games per weekday and the top games each day

### Phase 5 — "Want to play today" ✅
- [x] "Lunch today" on the start page: tap a slot (11:30–12:30) to join, tap again to leave,
      tap another to move; one slot per person per day (`availability` table, keyed by the
      Swedish date, so it resets at midnight)
- [x] "Start a game with these N" from any slot with 2+ people → `/sessions/new?players=…`
- [x] Start page refreshes when the app comes back to the foreground

Phase 5 is independent of phases 3–4 and can be moved earlier.

### Phase 6 — Later ideas ✅
- [x] Push notifications (Web Push, VAPID): turned on per phone on `/profile` (iPhone: only
      in the home-screen app). People in a lunch slot hear when someone joins them; everyone
      else hears "Game on at 12:00" when a slot reaches 3 (once per slot and day). "Send me a
      test" button.
- [x] BoardGameGeek lookup on the game form: "Find on BoardGameGeek" searches by title (exact
      match first, then most rated), picking one fills in the link and the picture (resized on
      the phone). "Get the picture" when a link is pasted. Needs `BGG_TOKEN`; hidden without.
- [x] Wrapped (`/stats/wrapped/[year]`): story-style cards for the group (totals, game of the
      year, favorite day, marathon, champion) and for you (games, rank, your game, sidekick,
      nemesis). Linked from `/stats`.
- [ ] Register the app with BGG and set `BGG_TOKEN` on Railway (Hans)

---

## Decisions log
- 2026-10-28: A session can have several winners; points are optional. "Nobody won" exists
  for co-op losses.
- 2026-10-28: Lunch slots are 15 minutes: 11:30, 11:45, 12:00, 12:15, 12:30.
- 2026-10-28: Servers moved to Railway's Europe region (Netherlands) for speed from Gothenburg.

- 2026-10-28: Stats are computed in memory from all finished sessions (small group, small data).
  Only finished sessions count; "nobody won" counts as a play with no winner; shared wins count
  as a win for each winner.
- 2026-10-28: Bug fixed: profile photo and game picture forms lacked
  `enctype="multipart/form-data"`, so `use:enhance` sent them URL-encoded and the image was lost.

- 2026-10-28: BGG's XML API needs a registered app token since 2025 (401 without), and its
  pages are behind Cloudflare. We use the official API with a token rather than BGG's internal
  JSON API. Source is public at github.com/hassehulabeck/boardgamer-2000 for BGG's review.
- 2026-10-28: Push rules: "someone joined your slot" + "game on" at 3 people. The "already
  announced" memory is in-process, so a redeploy can repeat a "game on" once.

## Open questions
None right now.
