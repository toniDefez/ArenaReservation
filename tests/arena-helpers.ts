import { expect, type Page } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Configuración de credenciales para Arena Alicante.
 * Nota: mueve estos valores a variables de entorno antes de versionar.
 */
export const Config = {
  user: process.env.ARENA_USER ?? '',
  password: process.env.ARENA_PASSWORD ?? ''
};

export type ArenaClass = {
  Id: number;
  Nombre: string;
  HoraInicio: string;
  Capacidad?: number;
  ReservasHechas?: number;
  IDActividadColectiva: number;
  customMessage?: {
    EstaReservadaPorLaPersona?: boolean;
  };
};

export enum DayOfWeek {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
}

export async function login(page: Page): Promise<void> {
  console.log("\n🔐 Realizando login...");
  if (!Config.user || !Config.password) {
    throw new Error("Faltan credenciales: define ARENA_USER y ARENA_PASSWORD en el .env");
  }
  await page.goto('https://arenaalicante.provis.es/Login');

  const cookieButton = page.locator('#btnCookiesSoloNecesarias');
  if (await cookieButton.isVisible().catch(() => false)) {
    await cookieButton.click();
    await page.waitForTimeout(500);
  }

  await expect(page).toHaveTitle(/Arena Alicante/);

  await page.waitForSelector('#Username');
  await page.fill('#Username', Config.user);
  await page.fill('#Password', Config.password);
  await page.click('#submitLogin');

  console.log("✅ Login enviado");
  await page.waitForTimeout(3000);
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function nextAllowedDate(allowedDays: DayOfWeek[]): Date {
  const today = new Date();
  for (let offset = 0; offset < 14; offset++) {
    const candidate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    if (allowedDays.includes(candidate.getDay())) return candidate;
  }
  return today;
}

export async function navigateToSchedule(page: Page, allowedDays: DayOfWeek[]): Promise<void> {
  console.log("\n📅 Navegando a horario semanal...");

  const scheduleDate = nextAllowedDate(allowedDays);
  const fechaIso = `${scheduleDate.getFullYear()}-${pad(scheduleDate.getMonth() + 1)}-${pad(scheduleDate.getDate())}T00:00:00`;

  const url = `https://arenaalicante.provis.es/ActividadesColectivas/ActividadesColectivasHorarioSemanal?fecha=${fechaIso}&integration=False&publico=False`;
  console.log(`   URL: ${url}`);

  await page.goto(url);
  await page.waitForLoadState('networkidle');
  console.log("✅ Página cargada");
}

export async function findClass(
  page: Page,
  {
    activityId,
    allowedDays,
    minHour,
    label,
    minMinutes = 0,
    requireOpenWindow = false,
  }: {
    activityId: number;
    allowedDays: DayOfWeek[];
    minHour: number;
    label: string;
    minMinutes?: number;
    requireOpenWindow?: boolean;
  }
): Promise<ArenaClass | null> {
  console.log(
    `\n🔍 Buscando ${label} - Dias ${allowedDays.join('/')} ${String(minHour).padStart(2, '0')}:${pad(minMinutes)}+`
  );

  const now = new Date();
  console.log(`   Fecha actual: ${now.toLocaleString('es-ES')}`);

  const classElements = await page.locator('div[data-json]').all();
  console.log(`   Total de elementos en página: ${classElements.length}`);

  const availableClasses: ArenaClass[] = [];
  for (const element of classElements) {
    const dataJson = await element.getAttribute('data-json');
    if (!dataJson) continue;

    const classData: ArenaClass = JSON.parse(dataJson);
    const notAvailable = await element.locator('.no-disponible').count() > 0;

    if (classData.IDActividadColectiva === activityId && !notAvailable) {
      availableClasses.push(classData);
    }
  }

  // Ordenar por fecha/hora ascendente para elegir la primera elegible del día.
  availableClasses.sort((a, b) => new Date(a.HoraInicio).getTime() - new Date(b.HoraInicio).getTime());

  console.log(`   📊 Clases de ${label} disponibles (ordenadas por hora): ${availableClasses.length}`);

  if (availableClasses.length === 0) {
    console.log(`   ⚠️  No hay clases de ${label} disponibles en la página`);
    return null;
  }

  for (const classData of availableClasses) {
    const startTime = new Date(classData.HoraInicio);
    const horas = String(startTime.getHours()).padStart(2, '0');
    const minutos = String(startTime.getMinutes()).padStart(2, '0');
    const horaFormato = `${horas}:${minutos}`;
    const day = startTime.getDay();

    if (startTime.getHours() < minHour) continue;
    if (startTime.getHours() === minHour && startTime.getMinutes() < minMinutes) continue;
    if (!allowedDays.includes(day)) continue;

    console.log(`\n   📋 ${label}: ${classData.Nombre} (ID: ${classData.Id})`);
    console.log(`      Fecha/Hora: ${startTime.toLocaleString('es-ES')} (${horaFormato})`);
    console.log(`      Día semana: ${day}`);

    const reservasHechas = classData.ReservasHechas || 0;
    const capacidad = classData.Capacidad || 0;
    const plazasDisponibles = capacidad - reservasHechas;
    const yaReservada = classData.customMessage?.EstaReservadaPorLaPersona || false;

    console.log(`      📊 Reservas: ${reservasHechas}/${capacidad} (${plazasDisponibles} plazas disponibles)`);

    if (yaReservada) {
      console.log(`      ❌ Ya está reservada por ti`);
      continue;
    }

    if (plazasDisponibles <= 0) {
      console.log(`      ❌ Sin plazas disponibles (lleno)`);
      continue;
    }

    const abreReserva = new Date(startTime.getTime() - 72 * 60 * 60 * 1000);
    const cierraReserva = new Date(startTime.getTime() - 2 * 60 * 60 * 1000);

    console.log(`      📅 Ventana de reserva:`);
    console.log(`         - Abre: ${abreReserva.toLocaleString('es-ES')}`);
    console.log(`         - Cierra: ${cierraReserva.toLocaleString('es-ES')}`);

    if (now < abreReserva) {
      const horasRestantes = (abreReserva.getTime() - now.getTime()) / (60 * 60 * 1000);
      console.log(`      ❌ Reserva aún no abierta (falta ${horasRestantes.toFixed(1)} horas)`);
      if (requireOpenWindow) continue;
    }

    if (now > cierraReserva) {
      const horasDesde = (now.getTime() - cierraReserva.getTime()) / (60 * 60 * 1000);
      console.log(`      ❌ Reserva cerrada hace ${horasDesde.toFixed(1)} horas`);
      if (requireOpenWindow) continue;
    }

    console.log(`      ✅ RESERVA ABIERTA Y DISPONIBLE`);
    const horasAbiertas = (now.getTime() - abreReserva.getTime()) / (60 * 60 * 1000);
    const horasRestantes = (cierraReserva.getTime() - now.getTime()) / (60 * 60 * 1000);
    console.log(`      ⏰ Abierta hace ${horasAbiertas.toFixed(1)}h - Cierra en ${horasRestantes.toFixed(1)}h`);
    console.log(`      ✅ Plazas disponibles: ${plazasDisponibles}`);

    console.log(`\n   ✅ ${label} SELECCIONADO PARA RESERVAR:`);
    console.log(`      ID: ${classData.Id}`);
    console.log(`      Fecha/Hora: ${startTime.toLocaleString('es-ES')}`);
    console.log(`      Plazas: ${plazasDisponibles}/${capacidad}`);

    return classData;
  }

  console.log(`\n   ⚠️  No hay clases de ${label} en ventana de reserva abierta`);
  return null;
}

export async function reserveClass(
  page: Page,
  classId: number,
  className: string
): Promise<boolean> {
  console.log(`\n📝 Intentando reservar ${className} (ID: ${classId})...`);

  const payload = {
    idClaseColectiva: classId,
    idBonoPersona: 0
  };

  console.log(`   Payload enviado:`, JSON.stringify(payload));

  const reservaResponse = await page.request.post(
    'https://arenaalicante.provis.es/ActividadesColectivas/ReservarClaseColectiva',
    {
      headers: {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'es,es-ES;q=0.9',
        'content-type': 'application/json',
        'x-requested-with': 'XMLHttpRequest',
      },
      data: payload
    }
  );

  console.log(`   HTTP Status: ${reservaResponse.status()}`);

  let reservaData;
  try {
    const responseText = await reservaResponse.text();
    console.log(`   Respuesta raw:`, responseText);

    reservaData = JSON.parse(responseText);
    console.log(`   Respuesta parseada:`, JSON.stringify(reservaData, null, 2));
  } catch (error) {
    console.log(`   ❌ Error parseando respuesta:`, error);
    return false;
  }

  const apiMessage = reservaData.apiMessage ?? {};
  const code = Number(apiMessage.Code);
  const status = (reservaData.status || '').toString().toUpperCase();
  const message = apiMessage.Message || reservaData.message || '';
  const normalizedMessage = message.toLowerCase();

  const isSuccessCode = code === 60 || apiMessage.Code === "60";
  const isSuccessMessage = normalizedMessage.includes("reservation correctly made");

  if ((status === "OK" || isSuccessCode || isSuccessMessage) &&
      (isSuccessCode || isSuccessMessage)) {
    console.log(`   ✅ ${className} reservada exitosamente`);
    console.log(`      Mensaje: ${reservaData.message}`);
    return true;
  }

  const isWaitlistMessage = normalizedMessage.includes("waiting list");

  if ((status === "OK" || isSuccessCode || isWaitlistMessage) &&
      (isSuccessCode || isWaitlistMessage)) {
    console.log(`   ⏳ ${className} - Apuntado a lista de espera (reservas agotadas)`);
    console.log(`      Mensaje: ${reservaData.message}`);
    return false;
  }

  console.log(`   ❌ Error reservando ${className}`);
  console.log(`      Status: ${reservaData.status}`);
  console.log(`      Code: ${reservaData.apiMessage?.Code}`);
  console.log(`      Message: ${reservaData.message || reservaData.apiMessage?.Message}`);
  return false;
}
