/**
 * Parses "HH:mm" time string into minutes from midnight.
 */
export function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== "string") return 0;
    const parts = timeStr.trim().split(":");
    const h = parseInt(parts[0] || "0", 10);
    const m = parseInt(parts[1] || "0", 10);
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

/**
 * Formats "YYYY-MM-DD" from a Date in local timezone.
 */
export function formatDateYMD(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export const DAYS_LIST = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
];

export const SCHEDULE_TYPE_OPTIONS = [
    { value: "24_7", label: "24x7 Hours Open", desc: "Open 24 hours, all 7 days a week" },
    { value: "24_5", label: "24x5 Hours Open", desc: "Open 24 hours Monday to Friday (Closed weekends)" },
    { value: "24_weekends", label: "24xWeekends Open", desc: "Open 24 hours Saturday and Sunday (Closed weekdays)" },
    { value: "custom_hours", label: "Custom Daily Hours", desc: "Set custom opening & closing hours for each day" },
    { value: "custom_dates", label: "Custom Dates Only", desc: "Only open on specifically scheduled calendar dates" },
];

export const DEFAULT_WEEKLY_SCHEDULE = {
    monday: { isOpen: true, openTime: "11:00", closeTime: "22:00" },
    tuesday: { isOpen: true, openTime: "11:00", closeTime: "22:00" },
    wednesday: { isOpen: true, openTime: "11:00", closeTime: "22:00" },
    thursday: { isOpen: true, openTime: "11:00", closeTime: "22:00" },
    friday: { isOpen: true, openTime: "11:00", closeTime: "23:00" },
    saturday: { isOpen: true, openTime: "11:00", closeTime: "23:00" },
    sunday: { isOpen: true, openTime: "11:00", closeTime: "22:00" },
};

/**
 * Returns a human-friendly schedule summary string for display.
 */
export function getScheduleSummary(restaurant) {
    if (!restaurant) return "11:00 - 22:00";
    const scheduleType = restaurant.scheduleType || "custom_hours";

    if (scheduleType === "24_7") return "Open 24/7";
    if (scheduleType === "24_5") return "Open 24/5 (Mon - Fri)";
    if (scheduleType === "24_weekends") return "Open 24h Weekends (Sat - Sun)";
    if (scheduleType === "custom_dates") return "Open on Special Dates Only";

    const ws = restaurant.weeklySchedule;
    if (!ws) {
        return restaurant.hours || "11:00 - 22:00";
    }

    const weekdaysUniform =
        ws.monday?.isOpen === ws.tuesday?.isOpen &&
        ws.monday?.isOpen === ws.wednesday?.isOpen &&
        ws.monday?.isOpen === ws.thursday?.isOpen &&
        ws.monday?.isOpen === ws.friday?.isOpen &&
        ws.monday?.openTime === ws.tuesday?.openTime &&
        ws.monday?.openTime === ws.wednesday?.openTime &&
        ws.monday?.openTime === ws.thursday?.openTime &&
        ws.monday?.openTime === ws.friday?.openTime &&
        ws.monday?.closeTime === ws.tuesday?.closeTime &&
        ws.monday?.closeTime === ws.wednesday?.closeTime &&
        ws.monday?.closeTime === ws.thursday?.closeTime &&
        ws.monday?.closeTime === ws.friday?.closeTime;

    const weekendUniform =
        ws.saturday?.isOpen === ws.sunday?.isOpen &&
        ws.saturday?.openTime === ws.sunday?.openTime &&
        ws.saturday?.closeTime === ws.sunday?.closeTime;

    if (weekdaysUniform && weekendUniform) {
        if (
            ws.monday?.isOpen &&
            ws.saturday?.isOpen &&
            ws.monday?.openTime === ws.saturday?.openTime &&
            ws.monday?.closeTime === ws.saturday?.closeTime
        ) {
            return `Daily ${ws.monday.openTime} - ${ws.monday.closeTime}`;
        }
        const weekdayPart = ws.monday?.isOpen ? `Mon-Fri ${ws.monday.openTime}-${ws.monday.closeTime}` : "Mon-Fri Closed";
        const weekendPart = ws.saturday?.isOpen ? `Sat-Sun ${ws.saturday.openTime}-${ws.saturday.closeTime}` : "Sat-Sun Closed";
        return `${weekdayPart}, ${weekendPart}`;
    }

    return restaurant.hours || "Custom Weekly Hours";
}

/**
 * Evaluates whether a restaurant is open at targetDate (default now).
 */
export function isRestaurantOpenNow(restaurant, targetDate = new Date()) {
    if (!restaurant) return { isOpen: false, reason: "Restaurant not available" };

    const scheduleType = restaurant.scheduleType || "custom_hours";
    const summary = getScheduleSummary(restaurant);

    // 1. Master killswitch
    if (restaurant.isOpen === false || restaurant.is_open === false) {
        return {
            isOpen: false,
            reason: "Temporarily closed for orders",
            scheduleType,
            scheduleSummary: summary,
        };
    }

    const currentDateYMD = formatDateYMD(targetDate);
    const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();

    // 2. Custom Dates / Holiday exceptions
    const customDates = Array.isArray(restaurant.customDates) ? restaurant.customDates : [];
    const customToday = customDates.find((cd) => cd.date === currentDateYMD);

    if (customToday) {
        if (!customToday.isOpen) {
            return {
                isOpen: false,
                reason: customToday.note ? `Closed today (${customToday.note})` : "Closed for holiday/special date",
                scheduleType,
                scheduleSummary: summary,
            };
        }

        if (customToday.openTime && customToday.closeTime) {
            const openM = timeToMinutes(customToday.openTime);
            const closeM = timeToMinutes(customToday.closeTime);
            const isWithin = closeM > openM ? currentMinutes >= openM && currentMinutes < closeM : currentMinutes >= openM || currentMinutes < closeM;

            return {
                isOpen: isWithin,
                reason: isWithin
                    ? `Special open hours until ${customToday.closeTime}${customToday.note ? ` (${customToday.note})` : ""}`
                    : `Closed now · Hours: ${customToday.openTime} - ${customToday.closeTime}`,
                scheduleType,
                scheduleSummary: summary,
            };
        }

        return {
            isOpen: true,
            reason: customToday.note ? `Special open hours (${customToday.note})` : "Open today",
            scheduleType,
            scheduleSummary: summary,
        };
    }

    // 3. Preset schedule types
    if (scheduleType === "24_7") {
        return {
            isOpen: true,
            reason: "Open 24/7",
            scheduleType,
            scheduleSummary: summary,
        };
    }

    const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    if (scheduleType === "24_5") {
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        return {
            isOpen: isWeekday,
            reason: isWeekday ? "Open 24 hours (Weekday)" : "Closed on weekends",
            scheduleType,
            scheduleSummary: summary,
        };
    }

    if (scheduleType === "24_weekends") {
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        return {
            isOpen: isWeekend,
            reason: isWeekend ? "Open 24 hours (Weekend)" : "Closed on weekdays",
            scheduleType,
            scheduleSummary: summary,
        };
    }

    if (scheduleType === "custom_dates") {
        return {
            isOpen: false,
            reason: "Closed today (only open on designated dates)",
            scheduleType,
            scheduleSummary: summary,
        };
    }

    // 4. Custom hours
    const daysKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayKey = daysKeys[dayOfWeek];
    const daySchedule = restaurant.weeklySchedule?.[dayKey];

    if (!daySchedule) {
        if (restaurant.hours && restaurant.hours.includes("-")) {
            const parts = restaurant.hours.split("-").map((s) => s.trim());
            if (parts[0] && parts[1]) {
                const openM = timeToMinutes(parts[0]);
                const closeM = timeToMinutes(parts[1]);
                const isOpen = closeM > openM ? currentMinutes >= openM && currentMinutes < closeM : currentMinutes >= openM || currentMinutes < closeM;
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
            reason: "Open now",
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
        isOpen = currentMinutes >= openM || currentMinutes < closeM;
    }

    return {
        isOpen,
        reason: isOpen ? `Open now until ${daySchedule.closeTime}` : `Closed now · Opens at ${daySchedule.openTime}`,
        scheduleType,
        scheduleSummary: summary,
    };
}
