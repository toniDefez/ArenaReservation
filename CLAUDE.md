# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

Playwright-based automation that books gym classes at Arena Alicante (https://arenaalicante.provis.es). Tests run via GitHub Actions on a schedule and make **real reservations** — run locally only in authorized contexts at appropriate times.

## Commands

```bash
# Install dependencies
npm ci
npx playwright install --with-deps chromium

# Run all activities
ACTIVITY_CONFIG='...' ARENA_USER=... ARENA_PASSWORD=... npx playwright test tests/gym-reservations.spec.ts

# Run specific activities
RUN_ACTIVITIES=boxeo,crossfit npx playwright test tests/gym-reservations.spec.ts

# Local example (credentials from .env)
RUN_ACTIVITIES=boxeo npx playwright test tests/gym-reservations.spec.ts
```

No lint or build steps configured.

## Architecture

The system is **activity-config driven**: a JSON blob in the `ACTIVITY_CONFIG` env var defines which classes to book, and the Playwright test reads that config to decide what to do.

### Key files

- `tests/gym-reservations.spec.ts` — test entry point; parses `ACTIVITY_CONFIG`, selects the first enabled matching activity, and calls helpers
- `tests/arena-helpers.ts` — all gym logic: `login`, `navigateToSchedule`, `findClass`, `reserveClass`
- `.github/workflows/` — one workflow per activity (boxeo, crossfit, calistenia), each with its own cron schedule and embedded `ACTIVITY_CONFIG`

### Configuration shape

```typescript
ACTIVITY_CONFIG = {
  "boxeo": {
    "activityId": 5,            // Arena internal ID
    "allowedDays": [1, 5],      // DayOfWeek enum (0=Sun … 6=Sat)
    "minHour": 19,
    "minMinutes": 0,
    "requireOpenWindow": true,  // enforce 72h–2h booking window
    "enabled": true
  }
}
```

### Reservation flow

1. `login(page)` — authenticates and dismisses cookie banner
2. `navigateToSchedule(page, allowedDays)` — goes to the weekly schedule for the next valid day (ISO timestamp in URL)
3. `findClass(page, config)` — parses `<div data-json="...">` elements; filters by activityId, allowedDays, min time, available slots, and booking window
4. `reserveClass(page, classId)` — POST to `/ActividadesColectivas/ReservarClaseColectiva`; checks response for success string

### Playwright config notes

- Retries: **0** — prevents duplicate reservations
- Workers: 1 on CI, parallel locally
- Chromium only

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ARENA_USER` | Yes | Gym account email |
| `ARENA_PASSWORD` | Yes | Gym account password |
| `ACTIVITY_CONFIG` | Yes | JSON activity definitions |
| `RUN_ACTIVITIES` | No | Comma-separated filter (e.g. `boxeo,crossfit`) |

Store locally in `.env` (already gitignored). On CI, use GitHub Secrets.

## Activity IDs

| Activity | ID |
|---|---|
| Crossfit | 1 |
| Boxeo | 5 |
| Calistenia | 28 |
