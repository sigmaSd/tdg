import { assertEquals, assertNotEquals } from "@std/assert";
import { generateSchedule, Person, Settings } from "./scheduler.ts";
import { getDay } from "date-fns";

const ALICE: Person = { id: "1", name: "Alice", unavailable: [], color: "red" };
const BOB: Person = { id: "2", name: "Bob", unavailable: [], color: "blue" };

Deno.test("Hierarchical Fairness - Weekend Priority over Workload", () => {
  const settings: Settings = {
    avoidConsecutive: false,
    enableScoring: false,
    preferFairScore: false,
    fairWeekend: true,
  };

  // Scenario:
  // Alice has 0 weekends and 10 total days.
  // Bob has 1 weekend and 2 total days.
  // It's a weekend. Alice SHOULD be picked because fairWeekend is enabled.

  // We can't easily seed initial state into generateSchedule,
  // but we can check if it stays balanced over a full month.
  const schedule = generateSchedule([ALICE, BOB], 2026, 2, settings); // March 2026 (9 weekends)

  const weekendCounts: Record<string, number> = { "1": 0, "2": 0 };
  for (const [date, pid] of Object.entries(schedule)) {
    if (getDay(new Date(date)) === 0 || getDay(new Date(date)) === 6) {
      weekendCounts[pid]++;
    }
  }

  // With 9 weekend days and 2 people, it should be 4 and 5.
  assertNotEquals(weekendCounts["1"], 0);
  assertNotEquals(weekendCounts["2"], 0);
  const diff = Math.abs(weekendCounts["1"] - weekendCounts["2"]);
  assertEquals(
    diff <= 1,
    true,
    `Weekend distribution should be fair (diff=${diff})`,
  );
});

Deno.test("Hierarchical Fairness - Workload Catch-up (The 'bedis' Case)", () => {
  const settings: Settings = {
    avoidConsecutive: false,
    enableScoring: false,
    preferFairScore: false,
    fairWeekend: false,
  };

  // Alice is unavailable for the first 15 days of March.
  const aliceUnavailable = Array.from(
    { length: 15 },
    (_, i) => `2026-03-${String(i + 1).padStart(2, "0")}`,
  );
  const ALICE_U = { ...ALICE, unavailable: aliceUnavailable };

  const schedule = generateSchedule([ALICE_U, BOB], 2026, 2, settings);

  const dayCounts: Record<string, number> = { "1": 0, "2": 0 };
  for (const pid of Object.values(schedule)) {
    dayCounts[pid]++;
  }

  // Alice was only available for 16 days (31 - 15).
  // Bob was available for all 31.
  // Total days = 31. Ideally shared 15.5 each.
  // Alice should have gotten ALMOST ALL of her available days (16) to reach 15.5.
  // Bob should have gotten ~15.

  console.log("Catch-up Day counts:", dayCounts);

  // Alice should have at least 15 days because she was available for 16 and was behind.
  assertEquals(
    dayCounts["1"] >= 15,
    true,
    `Alice should have caught up (got ${dayCounts["1"]})`,
  );
  assertEquals(
    dayCounts["2"] <= 16,
    true,
    `Bob should have fewer days because Alice caught up (got ${
      dayCounts["2"]
    })`,
  );
});

Deno.test("Hierarchical Fairness - Workload breaks ties in Weekend Rule", () => {
  const settings: Settings = {
    avoidConsecutive: false,
    enableScoring: false,
    preferFairScore: false,
    fairWeekend: true,
  };

  // Alice is unavailable for all weekdays but available on weekends.
  // Bob is available every day.
  const weekdays = [];
  for (let i = 1; i <= 31; i++) {
    const d = new Date(2026, 2, i);
    const day = getDay(d);
    if (day !== 0 && day !== 6) {
      weekdays.push(`2026-03-${String(i).padStart(2, "0")}`);
    }
  }
  const ALICE_U = { ...ALICE, unavailable: weekdays };

  const schedule = generateSchedule([ALICE_U, BOB], 2026, 2, settings);

  const dayCounts: Record<string, number> = { "1": 0, "2": 0 };
  const weekendCounts: Record<string, number> = { "1": 0, "2": 0 };

  for (let i = 1; i <= 31; i++) {
    const d = new Date(2026, 2, i);
    const dateStr = `2026-03-${String(i).padStart(2, "0")}`;
    const pid = schedule[dateStr];
    if (!pid) continue;

    dayCounts[pid]++;
    const day = getDay(d);
    if (day === 0 || day === 6) {
      weekendCounts[pid]++;
    }
  }

  // Since fairWeekend is ON, it should stay balanced (approx 4.5 each)
  // even though Alice is way behind on total days.
  // This confirms "Weekend setting is respected" as per user requirement.
  assertEquals(
    weekendCounts["1"] >= 4 && weekendCounts["1"] <= 5,
    true,
    `Alice should have gotten approx half weekends (got ${weekendCounts["1"]})`,
  );
  assertEquals(
    weekendCounts["2"] >= 4 && weekendCounts["2"] <= 5,
    true,
    `Bob should have gotten approx half weekends (got ${weekendCounts["2"]})`,
  );
});
