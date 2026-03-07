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

  // Initialize tracking counts
  const dayCounts: Record<string, number> = {};
  const scoreCounts: Record<string, number> = {};
  const weekendCounts: Record<string, number> = {};

  people.forEach((p) => {
    dayCounts[p.id] = 0;
    scoreCounts[p.id] = 0;
    weekendCounts[p.id] = 0;
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

    // Fairness picking:
    // 1. If fairWeekend enabled and it's a weekend, prioritize those with fewer weekend shifts.
    // 2. If scoring enabled and preferFairScore, prioritize those with lower total score.
    // 3. Otherwise prioritize those with fewer total days.

    let bestCandidates: Person[] = [];

    if (settings.fairWeekend && isWeekend) {
      const minWeekends = Math.min(
        ...candidates.map((p) => weekendCounts[p.id]),
      );
      bestCandidates = candidates.filter((p) =>
        weekendCounts[p.id] === minWeekends
      );
    } else if (settings.enableScoring && settings.preferFairScore) {
      const minScore = Math.min(...candidates.map((p) => scoreCounts[p.id]));
      bestCandidates = candidates.filter((p) => scoreCounts[p.id] === minScore);
    } else {
      const minDays = Math.min(...candidates.map((p) => dayCounts[p.id]));
      bestCandidates = candidates.filter((p) => dayCounts[p.id] === minDays);
    }

    // Randomly pick one from the best candidates
    const chosenPerson =
      bestCandidates[Math.floor(Math.random() * bestCandidates.length)];

    // Assign
    schedule[dateString] = chosenPerson.id;
    dayCounts[chosenPerson.id]++;
    scoreCounts[chosenPerson.id] += dayScore;
    if (isWeekend) weekendCounts[chosenPerson.id]++;
    lastPersonId = chosenPerson.id;
  }

  return schedule;
}
