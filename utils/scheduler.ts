import { format, getDay, getDaysInMonth } from "date-fns";

export interface Person {
  id: string;
  name: string;
  unavailable: string[]; // YYYY-MM-DD format
  color?: string; // Tailwind color class or hex (e.g., 'bg-red-500')
}

export type Schedule = Record<string, string>; // date (YYYY-MM-DD) -> personId

export interface Settings {
  avoidConsecutive: boolean;
  enableScoring: boolean;
  preferFairScore: boolean;
  fairWeekend: boolean;
}

export type DayScores = Record<string, number>; // date (YYYY-MM-DD) -> score

/**
 * Generates a schedule for the given month/year.
 * Uses a randomized greedy algorithm to balance shifts.
 *
 * @param people List of available people with their constraints.
 * @param year Full year (e.g., 2026)
 * @param month 0-indexed month (0 = January, 11 = December)
 * @param settings Scheduling constraints
 * @param customScores Override for daily scores
 */
export function generateSchedule(
  people: Person[],
  year: number,
  month: number,
  settings: Settings = {
    avoidConsecutive: true,
    enableScoring: false,
    preferFairScore: false,
    fairWeekend: false,
  },
  customScores: DayScores = {},
): Schedule {
  const schedule: Schedule = {};

  if (people.length === 0) {
    return schedule;
  }

  // Determine the number of days in the month
  const startDate = new Date(year, month, 1);
  const totalDays = getDaysInMonth(startDate);

  // Pre-calculate total opportunities for Saturdays and Sundays to improve global fairness
  const totalSatAvailable: Record<string, number> = {};
  const totalSunAvailable: Record<string, number> = {};
  people.forEach((p) => {
    totalSatAvailable[p.id] = 0;
    totalSunAvailable[p.id] = 0;
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      const dateStr = format(date, "yyyy-MM-dd");
      if (!p.unavailable.includes(dateStr)) {
        if (getDay(date) === 6) totalSatAvailable[p.id]++;
        if (getDay(date) === 0) totalSunAvailable[p.id]++;
      }
    }
  });

  // Initialize tracking counts
  const dayCounts: Record<string, number> = {};
  const scoreCounts: Record<string, number> = {};
  const saturdayCounts: Record<string, number> = {};
  const sundayCounts: Record<string, number> = {};
  const lastAssigned: Record<string, number> = {};

  people.forEach((p) => {
    dayCounts[p.id] = 0;
    scoreCounts[p.id] = 0;
    saturdayCounts[p.id] = 0;
    sundayCounts[p.id] = 0;
    lastAssigned[p.id] = -100;
  });

  let lastPersonId: string | null = null;

  // Iterate through each day of the month
  for (let day = 1; day <= totalDays; day++) {
    const currentDate = new Date(year, month, day);
    const dateString = format(currentDate, "yyyy-MM-dd");
    const isSunday = getDay(currentDate) === 0;
    const isSaturday = getDay(currentDate) === 6;
    const isWeekend = isSunday || isSaturday;

    const dayScore = settings.enableScoring
      ? (customScores[dateString] ?? (isSunday ? 2 : 1))
      : 1;

    // Filter people who are NOT unavailable on this date
    let candidates = people.filter((p) => !p.unavailable.includes(dateString));

    // Constraint: No 2 consecutive dates
    if (settings.avoidConsecutive && lastPersonId && candidates.length > 1) {
      candidates = candidates.filter((p) => p.id !== lastPersonId);
    }

    if (candidates.length === 0) {
      // If no one is available (and we filtered everyone out), reset filters or leave unassigned
      // Re-try without consecutive constraint if needed, but if unavailable is the reason, skip
      candidates = people.filter((p) => !p.unavailable.includes(dateString));
      if (candidates.length === 0) continue;
    }

    // Hierarchical candidate selection
    let best = candidates;

    if (isWeekend && settings.fairWeekend) {
      // 1. Independent day-of-week distribution is top priority on weekends
      const daySpecificCounts = isSaturday ? saturdayCounts : sundayCounts;
      const minSpecific = Math.min(...best.map((p) => daySpecificCounts[p.id]));
      best = best.filter((p) => daySpecificCounts[p.id] === minSpecific);

      if (best.length > 1) {
        // 1b. Opportunity Tie-break: Prioritize people with FEWER total available days of this type
        // This ensures people who are unavailable later are picked early in the month.
        const daySpecificAvail = isSaturday
          ? totalSatAvailable
          : totalSunAvailable;
        const minAvail = Math.min(...best.map((p) => daySpecificAvail[p.id]));
        best = best.filter((p) => daySpecificAvail[p.id] === minAvail);
      }
    } else if (settings.enableScoring && settings.preferFairScore) {
      // 1. Scoring fairness is top priority if enabled and no weekend rule applies
      const minScore = Math.min(...best.map((p) => scoreCounts[p.id]));
      best = best.filter((p) => scoreCounts[p.id] === minScore);
    }

    // 2. Workload (total day count) is the universal secondary factor to break ties
    const minDays = Math.min(...best.map((p) => dayCounts[p.id]));
    best = best.filter((p) => dayCounts[p.id] === minDays);

    if (best.length > 1) {
      // 3. Least Recently Assigned tie-breaker (reduces "clumps" of days)
      const earliestLastAssignment = Math.min(
        ...best.map((p) => lastAssigned[p.id]),
      );
      best = best.filter((p) => lastAssigned[p.id] === earliestLastAssignment);
    }

    // 4. Random tie-break (if multiple are still tied)
    const chosenPerson = best[Math.floor(Math.random() * best.length)];

    // Assign
    schedule[dateString] = chosenPerson.id;
    dayCounts[chosenPerson.id]++;
    scoreCounts[chosenPerson.id] += dayScore;
    lastAssigned[chosenPerson.id] = day;
    if (isSaturday) saturdayCounts[chosenPerson.id]++;
    if (isSunday) sundayCounts[chosenPerson.id]++;
    lastPersonId = chosenPerson.id;
  }

  return schedule;
}
