import type { DayScores, Person, Schedule, Settings } from "./types.ts";
import { schedulerWorker } from "./z3-workers.ts";

/**
 * Generates a schedule by delegating to a Web Worker that runs Z3.
 * This keeps the UI responsive and allows Z3's internal pthreads to work.
 */
export async function generateSchedule(
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
  fixedAssignments: Record<string, string> = {},
): Promise<Schedule | null> {
  if (people.length === 0 || typeof document === "undefined") {
    return Promise.resolve(null);
  }

  const z3 = await schedulerWorker.create();

  try {
    const schedule = await z3.run<Schedule | null>({
      people,
      year,
      month,
      settings,
      customScores,
      fixedAssignments,
    });

    return schedule;
  } catch (err) {
    console.error("Scheduler worker error:", err);
    throw err;
  } finally {
    z3.terminate();
  }
}
