import { format, getDaysInMonth } from "date-fns";

export interface Person {
  id: string;
  name: string;
  unavailable: string[]; // YYYY-MM-DD format
}

export type Schedule = Record<string, string>; // date (YYYY-MM-DD) -> personId

/**
 * Generates a schedule for the given month/year.
 * Uses a randomized greedy algorithm to balance shifts.
 *
 * @param people List of available people with their constraints.
 * @param year Full year (e.g., 2026)
 * @param month 0-indexed month (0 = January, 11 = December)
 */
export function generateSchedule(
  people: Person[],
  year: number,
  month: number,
): Schedule {
  const schedule: Schedule = {};

  if (people.length === 0) {
    return schedule;
  }

  // Determine the number of days in the month
  // Create a date for the 1st of the month
  const startDate = new Date(year, month, 1);
  const totalDays = getDaysInMonth(startDate);

  // Initialize shift counts
  const shiftCounts: Record<string, number> = {};
  people.forEach((p) => shiftCounts[p.id] = 0);

  // Iterate through each day of the month
  for (let day = 1; day <= totalDays; day++) {
    const currentDate = new Date(year, month, day);
    const dateString = format(currentDate, "yyyy-MM-dd");

    // Filter people who are NOT unavailable on this date
    const availableCandidates = people.filter((p) =>
      !p.unavailable.includes(dateString)
    );

    if (availableCandidates.length === 0) {
      // No one available for this day. Leave it unassigned.
      continue;
    }

    // Find the minimum number of shifts assigned so far among the available candidates
    let minShifts = Infinity;
    for (const p of availableCandidates) {
      if (shiftCounts[p.id] < minShifts) {
        minShifts = shiftCounts[p.id];
      }
    }

    // Filter candidates who have the minimum number of shifts (fairness)
    const bestCandidates = availableCandidates.filter((p) =>
      shiftCounts[p.id] === minShifts
    );

    // Randomly pick one from the best candidates (break ties randomly)
    const chosenPerson =
      bestCandidates[Math.floor(Math.random() * bestCandidates.length)];

    // Assign
    schedule[dateString] = chosenPerson.id;
    shiftCounts[chosenPerson.id]++;
  }

  return schedule;
}
