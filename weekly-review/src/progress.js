/**
 * Block 2: year, week and season progress.
 *
 * Pure date arithmetic — no external data, which is why this was the only
 * block that ever worked reliably as a Notion AI block. Here it is exact.
 */

import {
  addDays, compareDays, diffDays, formatDay, isoWeek, nextHolidayAfter, nextSeasonStart,
  progressBar, seasonOf, startOfISOWeek, weekdaysLeftInYear, workingDaysLeftInYear, yearProgress,
} from './util/date.js';

export function computeProgress(referenceDay, config) {
  // "The week we are going into": the ISO week beginning the coming Monday.
  const nextMonday = addDays(startOfISOWeek(referenceDay), 7);
  const nextSunday = addDays(nextMonday, 6);
  const week = isoWeek(nextMonday);

  const year = yearProgress(referenceDay);
  const season = seasonOf(referenceDay);
  const upcomingSeason = nextSeasonStart(referenceDay);
  const holiday = nextHolidayAfter(referenceDay);

  const daysToDeadline = config.goal?.deadline ? diffDays(referenceDay, config.goal.deadline) : null;

  return {
    referenceDay,
    nextWeek: {
      isoWeek: week.week,
      isoYear: week.year,
      monday: nextMonday,
      sunday: nextSunday,
      label: `Week ${week.week} of ${week.year}`,
      range: `${formatDay(nextMonday, { locale: config.locale, style: 'short' })} – ${formatDay(nextSunday, { locale: config.locale })}`,
    },
    year: {
      ...year,
      elapsedPercent: Math.round(year.elapsedFraction * 1000) / 10,
      remainingPercent: Math.round((1 - year.elapsedFraction) * 1000) / 10,
      bar: progressBar(year.elapsedFraction),
      weeksRemaining: Math.floor(year.remainingDays / 7),
    },
    season: {
      current: season.name,
      startedOn: season.start,
      next: upcomingSeason.name,
      nextStartsOn: upcomingSeason.start,
      daysUntilNext: diffDays(referenceDay, upcomingSeason.start),
      weeksUntilNext: Math.round((diffDays(referenceDay, upcomingSeason.start) / 7) * 10) / 10,
    },
    extras: {
      workingDaysLeftInYear: workingDaysLeftInYear(referenceDay),
      mondaysLeftInYear: weekdaysLeftInYear(referenceDay, 1),
      nextHoliday: holiday && {
        name: holiday.name,
        day: holiday.day,
        daysAway: diffDays(referenceDay, holiday.day),
      },
      goalDeadline: daysToDeadline === null ? null : {
        description: config.goal.description,
        day: config.goal.deadline,
        daysAway: daysToDeadline,
        weeksAway: Math.round((daysToDeadline / 7) * 10) / 10,
        passed: compareDays(config.goal.deadline, referenceDay) < 0,
      },
    },
  };
}
