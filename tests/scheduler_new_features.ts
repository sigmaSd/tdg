import { assertEquals, assertNotEquals } from "@std/assert";
import {
  DayScores,
  generateSchedule,
  Person,
  Settings,
} from "../utils/scheduler.ts";
import { getDay } from "date-fns";
import { browserTest } from "./utils.ts";

const PEOPLE: Person[] = [
  { id: "1", name: "Alice", unavailable: [], color: "bg-red-500" },
  { id: "2", name: "Bob", unavailable: [], color: "bg-blue-500" },
  { id: "3", name: "Charlie", unavailable: [], color: "bg-green-500" },
];

browserTest("generateSchedule - avoidConsecutive", async () => {
  const settings: Settings = {
    avoidConsecutive: true,
    enableScoring: false,
    preferFairScore: false,
    fairWeekend: false,
  };

  const schedule = (await generateSchedule(PEOPLE, 2026, 0, settings))!; // Jan 2026 (31 days)
  const dates = Object.keys(schedule).sort();

  for (let i = 1; i < dates.length; i++) {
    const prevPerson = schedule[dates[i - 1]];
    const currPerson = schedule[dates[i]];
    assertNotEquals(
      prevPerson,
      currPerson,
      `Consecutive dates found at ${dates[i - 1]} and ${dates[i]}`,
    );
  }
});

browserTest("generateSchedule - fairWeekend", async () => {
  const settings: Settings = {
    avoidConsecutive: false,
    enableScoring: false,
    preferFairScore: false,
    fairWeekend: true,
  };

  const schedule = (await generateSchedule(PEOPLE, 2026, 0, settings))!;

  const satCounts: Record<string, number> = { "1": 0, "2": 0, "3": 0 };
  const sunCounts: Record<string, number> = { "1": 0, "2": 0, "3": 0 };

  for (let d = 1; d <= 31; d++) {
    const dateStr = `2026-01-${String(d).padStart(2, "0")}`;
    const personId = schedule[dateStr];
    if (!personId) continue;

    const day = getDay(new Date(2026, 0, d));
    if (day === 6) satCounts[personId]++;
    if (day === 0) sunCounts[personId]++;
  }

  // Jan 2026 has 5 Saturdays and 4 Sundays

  // Saturday distribution should be [2, 2, 1]
  const sats = Object.values(satCounts).sort();
  assertEquals(sats, [1, 2, 2]);

  // Sunday distribution should be [1, 1, 2]
  const suns = Object.values(sunCounts).sort();
  assertEquals(suns, [1, 1, 2]);
});

browserTest("generateSchedule - scoring system (preferFairScore)", async () => {
  const settings: Settings = {
    avoidConsecutive: false,
    enableScoring: true,
    preferFairScore: true,
    fairWeekend: false,
  };

  // Give Alice a very high score on one day
  const customScores = {
    "2026-01-01": 10,
  };

  const schedule = (await generateSchedule(
    PEOPLE,
    2026,
    0,
    settings,
    customScores,
  ))!;

  const scoreCounts: Record<string, number> = { "1": 0, "2": 0, "3": 0 };
  const dayCounts: Record<string, number> = { "1": 0, "2": 0, "3": 0 };

  for (const [date, personId] of Object.entries(schedule)) {
    const isSunday = getDay(new Date(date)) === 0;
    const score = (customScores as DayScores)[date] ??
      (isSunday ? 2 : 1);
    scoreCounts[personId] += score;
    dayCounts[personId]++;
  }

  // Alice should have fewer total days because she took a high-score day.
  // Total score for Jan 2026: 27 (weekdays) + 4 (sundays * 2) = 35.
  // Custom score adds 9 to Jan 1st (was 1, now 10). Total = 44.
  // Average score per person should be ~14-15.
  // Alice with 10 score for 1 day should have very few days total.

  assertNotEquals(dayCounts["1"], dayCounts["2"]);
  console.log("Day counts:", dayCounts);
  console.log("Score counts:", scoreCounts);
});
