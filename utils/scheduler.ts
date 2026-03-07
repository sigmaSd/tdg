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
 * Generates a schedule by delegating to a Web Worker that runs Z3.
 * This keeps the UI responsive and allows Z3's internal pthreads to work.
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
  onProgress?: (current: number, total: number) => void,
): Promise<Schedule | null> {
  if (people.length === 0 || typeof document === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker("/scheduler-worker.js");
    worker.onmessage = (e) => {
      if (e.data.type === "progress") {
        if (onProgress) onProgress(e.data.current, e.data.total);
        return;
      }

      worker.terminate();
      if (e.data.ok) {
        resolve(e.data.schedule);
      } else {
        console.error("Scheduler worker error:", e.data.error);
        reject(new Error(e.data.error));
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      console.error("Scheduler worker failed:", err);
      reject(err);
    };
    worker.postMessage({ people, year, month, settings, customScores });
  });
}
