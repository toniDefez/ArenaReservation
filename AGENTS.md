## ArenaReservation – notas para agentes Codex

### Importante
- No commitear secretos. Las credenciales viven en `.env` (local) y en GitHub Secrets (`ARENA_USER`, `ARENA_PASSWORD`). Mantén `.env` ignorado.
- Los tests hacen reservas reales en https://arenaalicante.provis.es. Ejecuta sólo en entornos autorizados y en los horarios previstos.

### Flujo de pruebas
- Tests principales: `tests/gym-reservations.spec.ts` (BOXEO, CROSSFIT, CALISTENIA).
- Filtros por actividad vía `RUN_ACTIVITIES` (coma-separado; vacío = todas).
- Ejecutar localmente: `RUN_ACTIVITIES=boxeo,crossfit npx playwright test tests/gym-reservations.spec.ts`.

### Automatización
- Workflow: `.github/workflows/main.yml` dispara en cron (`0 17,18,19,20 * * *` UTC) y manual (`workflow_dispatch`).
- Variables requeridas en Actions: `ARENA_USER`, `ARENA_PASSWORD`; opcional `RUN_ACTIVITIES`.

### Helpers clave
- Lógica común en `tests/arena-helpers.ts`: login, navegación a horario, búsqueda (`findClass`), reserva (`reserveClass`), enum `DayOfWeek`.
- `findClass` filtra por actividad, días permitidos, hora/minutos mínimos y puede exigir ventana abierta (`requireOpenWindow`).

### Seguridad/entorno
- TypeScript con `module` nodenext y Playwright. Asegurar `dotenv` cargado para credenciales.
- No eliminar ni revertir cambios existentes salvo petición explícita.
