/**
 * ================================================
 * AUTOMATIZADOR DE RESERVAS - ARENA ALICANTE
 * ================================================
 * 
 * Propósito:
 *   Automatizar las reservas de clases colectivas en Arena Alicante
 *   mediante Playwright (browser automation).
 *
 * Funcionalidad:
 *   - Realiza login automático con credenciales
 *   - Navega a la página de horario semanal
 *   - Busca dinámicamente clases disponibles por:
 *     * Tipo de actividad (BOXEO, CROSSFIT, CALISTENIA)
 *     * Días de la semana específicos
 *     * Hora mínima de inicio (ajustado a 17:30+)
 *   - Realiza la reserva mediante API POST
 *
 * Restricciones:
 *   - Horario laboral: Salida a las 17:00 (+ 30min desplazamiento = 17:30 mínimo)
 *   - Anticipación requerida: 72 horas de antelación
 *   - Solo disponible para la próxima semana o posteriores
 *
 * Actividades configuradas:
 *   1. BOXEO (IDActividadColectiva: 5)
 *      - Disponible: Lunes y Viernes
 *      - Hora: 17:30+
 *   
 *   2. CROSSFIT (IDActividadColectiva: 1)
 *      - Disponible: Miércoles
 *      - Hora: 17:30+
 *   
 *   3. CALISTENIA (IDActividadColectiva: 28)
 *      - Disponible: Martes, Jueves y Viernes
 *      - Hora: 17:30+
 *
 * Flujo de cada test:
 *   1. Login → Autentica con credenciales
 *   2. Navigate → Accede a horario semanal
 *   3. Find → Busca clase con parámetros específicos
 *   4. Reserve → Reserva si encuentra disponibilidad
 *   5. Assert → Verifica éxito de la reserva
 *
 * ================================================
 */

import { test, expect } from '@playwright/test';
import {
  DayOfWeek,
  findClass,
  login,
  navigateToSchedule,
  reserveClass,
} from './arena-helpers.js';

const activitiesFilter = (process.env.RUN_ACTIVITIES ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const shouldRun = (activity: string) =>
  activitiesFilter.length === 0 || activitiesFilter.includes(activity.toLowerCase());

// ============================================
// TESTS DE RESERVA POR ACTIVIDAD
// ============================================

/**
 * Test: Reservar clase de BOXEO
 * 
 * Criterios:
 *   - Actividad: BOXEO (IDActividadColectiva = 5)
 *   - Días: Lunes (1) y Viernes (5)
 *   - Hora: A partir de 19:00 (tarde)
 *   - 72+ horas de anticipación
 */
test('🥊 Reservar BOXEO (Lunes y Viernes 19:00+)', async ({ page }) => {
  test.skip(!shouldRun('boxeo'), 'BOXEO deshabilitado por RUN_ACTIVITIES');
  await login(page);
  await navigateToSchedule(page, [DayOfWeek.Monday, DayOfWeek.Friday]);

  const boxeoClass = await findClass(page, {
    activityId: 5,
    allowedDays: [DayOfWeek.Monday, DayOfWeek.Friday],
    minHour: 19,
    label: 'BOXEO',
    requireOpenWindow: true,
  });

  if (boxeoClass) {
    const success = await reserveClass(page, boxeoClass.Id, "BOXEO");
    expect(success).toBe(true);
  } else {
    console.log("⚠️  No se encontró clase de BOXEO válida");
  }
});

/**
 * Test: Reservar clase de CROSSFIT
 * 
 * Criterios:
 *   - Actividad: CROSSFIT (IDActividadColectiva = 1)
 *   - Día: Miércoles (3)
 *   - Hora: A partir de 17:30 (minHour = 17)
 * 
 * Flujo:
 *   1. Login automático
 *   2. Navegación a horario semanal
 *   3. Búsqueda dinámica de clase disponible
 *   4. Reserva si encuentra disponibilidad
 *   5. Verificación de éxito
 */
test('💪 Reservar CROSSFIT (Miércoles 17:30+)', async ({ page }) => {
  test.skip(!shouldRun('crossfit'), 'CROSSFIT deshabilitado por RUN_ACTIVITIES');
  await login(page);
  await navigateToSchedule(page, [DayOfWeek.Wednesday]);

  const crossfitClass = await findClass(page, {
    activityId: 1,
    allowedDays: [DayOfWeek.Tuesday,DayOfWeek.Wednesday],
    minHour: 17,
    minMinutes: 30,
    label: 'CROSSFIT',
    requireOpenWindow: true,
  });

  if (crossfitClass) {
    const success = await reserveClass(page, crossfitClass.Id, "CROSSFIT");
    expect(success).toBe(true);
  } else {
    console.log("⚠️  No se encontró clase de CROSSFIT disponible");
  }
});

/**
 * Test: Reservar clase de CALISTENIA
 * 
 * Criterios:
 *   - Actividad: CALISTENIA (IDActividadColectiva = 28)
 *   - Días: Martes (2), Jueves (4) y Viernes (5)
 *   - Hora: A partir de 17:30 (minHour = 17)
 */
test('🤸 Reservar CALISTENIA (Martes, Jueves y Viernes 17:30+)', async ({ page }) => {
  test.skip(!shouldRun('calistenia'), 'CALISTENIA deshabilitada por RUN_ACTIVITIES');
  await login(page);
  await navigateToSchedule(page, [DayOfWeek.Tuesday, DayOfWeek.Thursday, DayOfWeek.Friday]);

  const calistheniaClass = await findClass(page, {
    activityId: 28,
    allowedDays: [DayOfWeek.Tuesday, DayOfWeek.Thursday, DayOfWeek.Friday],
    minHour: 17,
    minMinutes: 30,
    label: 'CALISTENIA',
    requireOpenWindow: true,
  });

  if (calistheniaClass) {
    const success = await reserveClass(page, calistheniaClass.Id, "CALISTENIA");
    expect(success).toBe(true);
  } else {
    console.log("⚠️  No se encontró clase de CALISTENIA disponible");
  }
});
