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

export interface SolveData {
  people: Person[];
  year: number;
  month: number;
  settings: Settings;
  customScores: DayScores;
  fixedAssignments: Record<string, string>;
}
