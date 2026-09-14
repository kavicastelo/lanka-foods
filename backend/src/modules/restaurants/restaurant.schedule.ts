import type { ICustomDateSchedule, IRestaurant, IWeeklySchedule, ScheduleType } from '../../models/restaurant.model.js';

export interface ScheduleStatusResult {
  isOpen: boolean;
  reason: string;
  scheduleType: ScheduleType;
  scheduleSummary: string;
}

const DAYS_ORDER: Array<keyof IWeeklySchedule> = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/**
 * Parses "HH:mm" time string into minutes from midnight.
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

/**
 * Formats "YYYY-MM-DD" from a Date in local/target timezone.
 */
export function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns a human-friendly schedule summary for display.
 */
export function getScheduleSummary(restaurant: Partial<IRestaurant>): string {
  const scheduleType = restaurant.scheduleType || 'custom_hours';

  if (scheduleType === '24_7') {
    return 'Open 24/7';
  }
  if (scheduleType === '24_5') {
    return 'Open 24/5 (Mon - Fri)';
  }
  if (scheduleType === '24_weekends') {
    return 'Open 24h Weekends (Sat - Sun)';
  }
  if (scheduleType === 'custom_dates') {
    return 'Open on Special Dates Only';
  }

  // Custom hours
  const ws = restaurant.weeklySchedule;
  if (!ws) {
    return restaurant.hours || '11:00 - 21:00';
  }

  // Check if weekday hours and weekend hours are uniform
  const weekdaysUniform =
    ws.monday.isOpen === ws.tuesday.isOpen &&
    ws.monday.isOpen === ws.wednesday.isOpen &&
    ws.monday.isOpen === ws.thursday.isOpen &&
    ws.monday.isOpen === ws.friday.isOpen &&
    ws.monday.openTime === ws.tuesday.openTime &&
    ws.monday.openTime === ws.wednesday.openTime &&
    ws.monday.openTime === ws.thursday.openTime &&
    ws.monday.openTime === ws.friday.openTime &&
    ws.monday.closeTime === ws.tuesday.closeTime &&
    ws.monday.closeTime === ws.wednesday.closeTime &&
    ws.monday.closeTime === ws.thursday.closeTime &&
    ws.monday.closeTime === ws.friday.closeTime;

  const weekendUniform =
    ws.saturday.isOpen === ws.sunday.isOpen &&
    ws.saturday.openTime === ws.sunday.openTime &&
    ws.saturday.closeTime === ws.sunday.closeTime;

  if (weekdaysUniform && weekendUniform) {
    if (ws.monday.isOpen && ws.saturday.isOpen && ws.monday.openTime === ws.saturday.openTime && ws.monday.closeTime === ws.saturday.closeTime) {
      return `Daily ${ws.monday.openTime} - ${ws.monday.closeTime}`;
    }
    const weekdayPart = ws.monday.isOpen ? `Mon-Fri ${ws.monday.openTime}-${ws.monday.closeTime}` : 'Mon-Fri Closed';
    const weekendPart = ws.saturday.isOpen ? `Sat-Sun ${ws.saturday.openTime}-${ws.saturday.closeTime}` : 'Sat-Sun Closed';
    return `${weekdayPart}, ${weekendPart}`;
  }

  return restaurant.hours || 'Custom Hours';
}

/**
 * Checks whether a restaurant is currently open given a target date/time.
 */
export function evaluateRestaurantOpenStatus(
  restaurant: Partial<IRestaurant>,
  targetDate: Date = new Date()
): ScheduleStatusResult {
  const scheduleType = restaurant.scheduleType || 'custom_hours';
  const summary = getScheduleSummary(restaurant);

  // 1. Check master emergency killswitch
  if (restaurant.isOpen === false) {
    return {
      isOpen: false,
      reason: 'Temporarily closed for orders',
      scheduleType,
      scheduleSummary: summary,
    };
  }

  const currentDateYMD = formatDateYMD(targetDate);
  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();

  // 2. Check custom dates / holiday exceptions
  const customDates = restaurant.customDates || [];
  const customToday = customDates.find((cd: ICustomDateSchedule) => cd.date === currentDateYMD);

  if (customToday) {
    if (!customToday.isOpen) {
      return {
        isOpen: false,
        reason: customToday.note ? `Closed today (${customToday.note})` : 'Closed for special date/holiday',
        scheduleType,
        scheduleSummary: summary,
      };
    }

    // Custom date is open - check optional specific time window
    if (customToday.openTime && customToday.closeTime) {
      const openM = timeToMinutes(customToday.openTime);
      const closeM = timeToMinutes(customToday.closeTime);

      let isWithinTime = false;
      if (closeM > openM) {
        isWithinTime = currentMinutes >= openM && currentMinutes < closeM;
      } else {
        // Overnight
        isWithinTime = currentMinutes >= openM || currentMinutes < closeM;
      }

      return {
        isOpen: isWithinTime,
        reason: isWithinTime
          ? `Open today until ${customToday.closeTime}${customToday.note ? ` (${customToday.note})` : ''}`
          : `Closed now · Hours: ${customToday.openTime} - ${customToday.closeTime}`,
        scheduleType,
        scheduleSummary: summary,
      };
    }

    // Open all day on this custom date
    return {
      isOpen: true,
      reason: customToday.note ? `Special open hours (${customToday.note})` : 'Open today',
      scheduleType,
      scheduleSummary: summary,
    };
  }

  // 3. Evaluate by Schedule Type
  if (scheduleType === '24_7') {
    return {
      isOpen: true,
      reason: 'Open 24/7',
      scheduleType,
      scheduleSummary: summary,
    };
  }

  const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  if (scheduleType === '24_5') {
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    return {
      isOpen: isWeekday,
      reason: isWeekday ? 'Open 24 hours (Weekday)' : 'Closed on weekends',
      scheduleType,
      scheduleSummary: summary,
    };
  }

  if (scheduleType === '24_weekends') {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return {
      isOpen: isWeekend,
      reason: isWeekend ? 'Open 24 hours (Weekend)' : 'Closed on weekdays',
      scheduleType,
      scheduleSummary: summary,
    };
  }

  if (scheduleType === 'custom_dates') {
    // Only open if explicitly configured in customDates
    return {
      isOpen: false,
      reason: 'Closed today (only open on designated dates)',
      scheduleType,
      scheduleSummary: summary,
    };
  }

  // Custom hours
  const dayKey = DAYS_ORDER[dayOfWeek];
  const daySchedule = restaurant.weeklySchedule?.[dayKey];

  if (!daySchedule) {
    // Fallback to legacy hours string e.g. "11:00 - 21:00"
    if (restaurant.hours && restaurant.hours.includes('-')) {
      const parts = restaurant.hours.split('-').map((s) => s.trim());
      if (parts[0] && parts[1]) {
        const openM = timeToMinutes(parts[0]);
        const closeM = timeToMinutes(parts[1]);
        const isOpen = closeM > openM ? (currentMinutes >= openM && currentMinutes < closeM) : (currentMinutes >= openM || currentMinutes < closeM);
        return {
          isOpen,
          reason: isOpen ? `Open now until ${parts[1]}` : `Closed now · Opens at ${parts[0]}`,
          scheduleType,
          scheduleSummary: summary,
        };
      }
    }

    return {
      isOpen: true,
      reason: 'Open now',
      scheduleType,
      scheduleSummary: summary,
    };
  }

  if (!daySchedule.isOpen) {
    return {
      isOpen: false,
      reason: `Closed on ${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}s`,
      scheduleType,
      scheduleSummary: summary,
    };
  }

  const openM = timeToMinutes(daySchedule.openTime);
  const closeM = timeToMinutes(daySchedule.closeTime);

  let isOpen = false;
  if (closeM > openM) {
    isOpen = currentMinutes >= openM && currentMinutes < closeM;
  } else {
    // Overnight window (e.g. 18:00 to 02:00)
    isOpen = currentMinutes >= openM || currentMinutes < closeM;
  }

  return {
    isOpen,
    reason: isOpen ? `Open now until ${daySchedule.closeTime}` : `Closed now · Opens at ${daySchedule.openTime}`,
    scheduleType,
    scheduleSummary: summary,
  };
}
