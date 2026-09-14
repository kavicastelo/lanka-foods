import { describe, expect, it } from 'vitest';
import { evaluateRestaurantOpenStatus, getScheduleSummary, timeToMinutes } from '../src/modules/restaurants/restaurant.schedule.js';
import type { IRestaurant } from '../src/models/restaurant.model.js';

describe('Restaurant Operating Days & Hours Logic Tests', () => {
  it('correctly converts time strings to minutes', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('11:30')).toBe(690);
    expect(timeToMinutes('23:59')).toBe(1439);
    expect(timeToMinutes('')).toBe(0);
  });

  describe('24x7 Schedule', () => {
    const restaurant: Partial<IRestaurant> = {
      scheduleType: '24_7',
      isOpen: true,
    };

    it('is open on Monday noon', () => {
      const mondayNoon = new Date('2026-09-14T12:00:00'); // Monday
      const result = evaluateRestaurantOpenStatus(restaurant, mondayNoon);
      expect(result.isOpen).toBe(true);
      expect(result.reason).toBe('Open 24/7');
    });

    it('is open on Sunday midnight', () => {
      const sundayMidnight = new Date('2026-09-20T00:01:00'); // Sunday
      const result = evaluateRestaurantOpenStatus(restaurant, sundayMidnight);
      expect(result.isOpen).toBe(true);
    });

    it('is closed if master isOpen switch is false', () => {
      const result = evaluateRestaurantOpenStatus({ ...restaurant, isOpen: false });
      expect(result.isOpen).toBe(false);
      expect(result.reason).toContain('Temporarily closed');
    });
  });

  describe('24x5 Schedule (Weekdays Only)', () => {
    const restaurant: Partial<IRestaurant> = {
      scheduleType: '24_5',
      isOpen: true,
    };

    it('is open on Wednesday at 3 AM', () => {
      const wednesday = new Date('2026-09-16T03:00:00'); // Wednesday
      const result = evaluateRestaurantOpenStatus(restaurant, wednesday);
      expect(result.isOpen).toBe(true);
    });

    it('is closed on Saturday at 2 PM', () => {
      const saturday = new Date('2026-09-19T14:00:00'); // Saturday
      const result = evaluateRestaurantOpenStatus(restaurant, saturday);
      expect(result.isOpen).toBe(false);
      expect(result.reason).toContain('weekends');
    });
  });

  describe('24xWeekends Schedule', () => {
    const restaurant: Partial<IRestaurant> = {
      scheduleType: '24_weekends',
      isOpen: true,
    };

    it('is open on Saturday at 8 PM', () => {
      const saturday = new Date('2026-09-19T20:00:00'); // Saturday
      const result = evaluateRestaurantOpenStatus(restaurant, saturday);
      expect(result.isOpen).toBe(true);
    });

    it('is closed on Tuesday at 12 PM', () => {
      const tuesday = new Date('2026-09-15T12:00:00'); // Tuesday
      const result = evaluateRestaurantOpenStatus(restaurant, tuesday);
      expect(result.isOpen).toBe(false);
      expect(result.reason).toContain('weekdays');
    });
  });

  describe('Custom Hours Schedule', () => {
    const restaurant: Partial<IRestaurant> = {
      scheduleType: 'custom_hours',
      isOpen: true,
      weeklySchedule: {
        monday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        tuesday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        wednesday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        thursday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        friday: { isOpen: true, openTime: '10:00', closeTime: '23:00' },
        saturday: { isOpen: true, openTime: '12:00', closeTime: '23:00' },
        sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' }, // Closed on Sundays
      },
    };

    it('is open on Monday during operating hours (14:00)', () => {
      const monday = new Date('2026-09-14T14:00:00');
      const result = evaluateRestaurantOpenStatus(restaurant, monday);
      expect(result.isOpen).toBe(true);
      expect(result.reason).toContain('until 22:00');
    });

    it('is closed on Monday before operating hours (08:00)', () => {
      const monday = new Date('2026-09-14T08:00:00');
      const result = evaluateRestaurantOpenStatus(restaurant, monday);
      expect(result.isOpen).toBe(false);
      expect(result.reason).toContain('Opens at 10:00');
    });

    it('is closed on Sunday', () => {
      const sunday = new Date('2026-09-20T15:00:00');
      const result = evaluateRestaurantOpenStatus(restaurant, sunday);
      expect(result.isOpen).toBe(false);
      expect(result.reason).toContain('Sundays');
    });
  });

  describe('Custom Dates & Holiday Exceptions', () => {
    const restaurant: Partial<IRestaurant> = {
      scheduleType: '24_7',
      isOpen: true,
      customDates: [
        {
          date: '2026-12-25',
          isOpen: false,
          note: 'Christmas Holiday',
        },
        {
          date: '2026-12-31',
          isOpen: true,
          openTime: '18:00',
          closeTime: '23:59',
          note: 'New Year Eve Party',
        },
      ],
    };

    it('honors holiday closure exception even on 24/7 restaurant', () => {
      const christmas = new Date('2026-12-25T14:00:00');
      const result = evaluateRestaurantOpenStatus(restaurant, christmas);
      expect(result.isOpen).toBe(false);
      expect(result.reason).toContain('Christmas Holiday');
    });

    it('honors special operating window on custom open date', () => {
      const nyeBefore = new Date('2026-12-31T12:00:00');
      const nyeDuring = new Date('2026-12-31T20:00:00');

      const resBefore = evaluateRestaurantOpenStatus(restaurant, nyeBefore);
      expect(resBefore.isOpen).toBe(false);

      const resDuring = evaluateRestaurantOpenStatus(restaurant, nyeDuring);
      expect(resDuring.isOpen).toBe(true);
      expect(resDuring.reason).toContain('New Year Eve Party');
    });
  });

  describe('getScheduleSummary', () => {
    it('summarizes 24/7', () => {
      expect(getScheduleSummary({ scheduleType: '24_7' })).toBe('Open 24/7');
    });

    it('summarizes 24/5', () => {
      expect(getScheduleSummary({ scheduleType: '24_5' })).toBe('Open 24/5 (Mon - Fri)');
    });

    it('summarizes uniform hours', () => {
      const rest: Partial<IRestaurant> = {
        scheduleType: 'custom_hours',
        weeklySchedule: {
          monday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
          tuesday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
          wednesday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
          thursday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
          friday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
          saturday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
          sunday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
        },
      };
      expect(getScheduleSummary(rest)).toBe('Daily 11:00 - 22:00');
    });
  });
});
