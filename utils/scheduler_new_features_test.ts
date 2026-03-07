import { assertEquals, assertNotEquals } from "@std/assert";
import { generateSchedule, Person, Settings } from "./scheduler.ts";
import { getDay } from "date-fns";

const PEOPLE: Person[] = [
  { id: "1", name: "Alice", unavailable: [], color: "bg-red-500" },
  { id: "2", name: "Bob", unavailable: [], color: "bg-blue-500" },
  { id: "3", name: "Charlie", unavailable: [], color: "bg-green-500" },
];

Deno.test("generateSchedule - avoidConsecutive", () => {
  const settings: Settings = {
    avoidConsecutive: true,
    enableScoring: false,
    preferFairScore: false,
    fairWeekend: false,
  };

  const schedule = generateSchedule(PEOPLE, 2026, 0, settings); // Jan 2026 (31 days)
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

Deno.test("generateSchedule - fairWeekend", () => {
  const settings: Settings = {
    avoidConsecutive: false,
    enableScoring: false,
    preferFairScore: false,
    fairWeekend: true,
  };

  const schedule = generateSchedule(PEOPLE, 2026, 0, settings);

  const weekendCounts: Record<string, number> = { "1": 0, "2": 0, "3": 0 };

  for (const [date, personId] of Object.entries(schedule)) {
    const d = new Date(date);
    const day = getDay(d);
    if (day === 0 || day === 6) {
      weekendCounts[personId]++;
    }
  }

  // Jan 2026 has 9 weekend days (5 Sat, 4 Sun)
  // With 3 people, it should be 3-3-3.
  assertEquals(weekendCounts["1"], 3);
  assertEquals(weekendCounts["2"], 3);
  assertEquals(weekendCounts["3"], 3);
});

Deno.test("generateSchedule - scoring system (preferFairScore)", () => {
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

  const schedule = generateSchedule(PEOPLE, 2026, 0, settings, customScores);

  const scoreCounts: Record<string, number> = { "1": 0, "2": 0, "3": 0 };
  const dayCounts: Record<string, number> = { "1": 0, "2": 0, "3": 0 };

  for (const [date, personId] of Object.entries(schedule)) {
    const isSunday = getDay(new Date(date)) === 0;
    const score = customScores[date as keyof typeof customScores] ??
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
