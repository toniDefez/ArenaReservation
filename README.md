# ArenaReservation (Playwright)

Automatiza reservas de clases en https://arenaalicante.provis.es usando Playwright. Se autentica con credenciales, navega al horario semanal, busca clases según configuración y lanza la reserva vía API.

## Requisitos
- Node 20
- Secrets/entorno:
  - `ARENA_USER`, `ARENA_PASSWORD` (credenciales)
  - `ACTIVITY_CONFIG` (JSON con la configuración de actividades; obligatorio)
  - `RUN_ACTIVITIES` (lista coma-separada; opcional. Si se omite, usa todas las definidas en `ACTIVITY_CONFIG`)

Ejemplo de `ACTIVITY_CONFIG`:
```json
{
  "boxeo": { "activityId": 5, "allowedDays": [1,5], "minHour": 19, "minMinutes": 0, "requireOpenWindow": true },
  "crossfit": { "activityId": 1, "allowedDays": [2,3], "minHour": 17, "minMinutes": 30, "requireOpenWindow": true },
  "calistenia": { "activityId": 28, "allowedDays": [2,4,5], "minHour": 17, "minMinutes": 30, "requireOpenWindow": true }
}
```

## Uso local
```bash
npm install
ACTIVITY_CONFIG='{"boxeo":{"activityId":5,"allowedDays":[1,5],"minHour":19,"minMinutes":0}}' \
ARENA_USER=... ARENA_PASSWORD=... \
RUN_ACTIVITIES=boxeo \
npx playwright test tests/gym-reservations.spec.ts --project=chromium
```

## Workflows (GitHub Actions)
- `.github/workflows/boxeo.yml`: miércoles y viernes 19:00 UTC, `RUN_ACTIVITIES=boxeo`.
- `.github/workflows/crossfit.yml`: martes y miércoles 19:00 UTC, `RUN_ACTIVITIES=crossfit`.
- `.github/workflows/calistenia.yml`: martes, jueves y viernes 19:00 UTC, `RUN_ACTIVITIES=calistenia`.

Todos requieren secrets `ARENA_USER`/`ARENA_PASSWORD` y pasan su `ACTIVITY_CONFIG` embebido.

## Tests
El test principal está en `tests/gym-reservations.spec.ts` y usa helpers de `tests/arena-helpers.ts` (login, navegación, búsqueda y reserva). Los resultados dependen del backend real; no hay entorno de pruebas ni mocks.
