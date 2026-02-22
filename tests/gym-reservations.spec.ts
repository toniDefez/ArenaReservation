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

type ActivityConfig = {
  activityId: number;
  allowedDays: DayOfWeek[];
  minHour: number;
  minMinutes?: number;
  requireOpenWindow?: boolean;
};


function parseActivityConfig(): Record<string, ActivityConfig> {
  const raw = process.env.ACTIVITY_CONFIG;
  if (!raw) {
    throw new Error('Falta ACTIVITY_CONFIG en variables de entorno');
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, ActivityConfig>;
    const lowered: Record<string, ActivityConfig> = {};
    for (const [key, value] of Object.entries(parsed)) {
      lowered[key.toLowerCase()] = value;
    }
    return lowered;
  } catch (error) {
    throw new Error(`No se pudo parsear ACTIVITY_CONFIG: ${error}`);
  }
}

const activityConfigs = parseActivityConfig();

function getActivityConfig(name: string): ActivityConfig | undefined {
  const key = name.toLowerCase();
  return activityConfigs[key];
}

const activitiesToRun =
  activitiesFilter.length > 0
    ? activitiesFilter
    : Object.keys(activityConfigs);

if (activitiesToRun.length === 0) {
  test.skip(true, 'No hay actividades configuradas para ejecutar (RUN_ACTIVITIES o ACTIVITY_CONFIG vacío)');
}

test('Reservar actividades configuradas', async ({ page }) => {
  for (const activity of activitiesToRun) {
    await test.step(`Reservar ${activity}`, async () => {
      const cfg = getActivityConfig(activity);
      if (!cfg) {
        console.log(`⚠️  Sin configuración para ${activity}, se omite`);
        return;
      }

      await login(page);
      await navigateToSchedule(page, cfg.allowedDays);

      const classData = await findClass(page, {
        activityId: cfg.activityId,
        allowedDays: cfg.allowedDays,
        minHour: cfg.minHour,
        minMinutes: cfg.minMinutes ?? 0,
        label: activity.toUpperCase(),
        requireOpenWindow: cfg.requireOpenWindow ?? true,
      });

      if (classData) {
        const success = await reserveClass(page, classData.Id, activity.toUpperCase());
        expect(success).toBe(true);
      } else {
        console.log(`⚠️  No se encontró clase válida para ${activity}`);
      }
    });
  }
});
