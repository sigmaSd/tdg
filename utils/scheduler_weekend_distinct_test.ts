import { assertEquals } from "@std/assert";
import { generateSchedule, Person, Settings } from "./scheduler.ts";
import { getDay } from "date-fns";

const ALICE: Person = { id: "1", name: "Alice", unavailable: [], color: "red" };
const BOB: Person = { id: "2", name: "Bob", unavailable: [], color: "blue" };

Deno.test("Distinct Weekend Fairness - Separately balances Sat and Sun", async () => {
  const settings: Settings = {
    avoidConsecutive: true,
    enableScoring: false,
    preferFairScore: false,
    fairWeekend: true,
  };

  // March 2026 has 4 Saturdays and 5 Sundays.
  // With 2 people, each should have 2 Saturdays and 2-3 Sundays.
  const schedule = await generateSchedule([ALICE, BOB], 2026, 2, settings);

  const satCounts: Record<string, number> = { "1": 0, "2": 0 };
  const sunCounts: Record<string, number> = { "1": 0, "2": 0 };

  for (const [date, pid] of Object.entries(schedule)) {
    const d = new Date(date);
    const day = getDay(d);
    if (day === 6) satCounts[pid]++;
    if (day === 0) sunCounts[pid]++;
  }

  // Check Saturdays (4 total)
  assertEquals(satCounts["1"], 2, "Alice should have exactly 2 Saturdays");
  assertEquals(satCounts["2"], 2, "Bob should have exactly 2 Saturdays");

  // Check Sundays (5 total)
  const sunDiff = Math.abs(sunCounts["1"] - sunCounts["2"]);
  assertEquals(sunDiff <= 1, true, "Sundays should be balanced (diff <= 1)");
  assertEquals(sunCounts["1"] + sunCounts["2"], 5, "Total Sundays should be 5");
});

Deno.test("Distinct Weekend Fairness - Sat and Sun don't interfere with each other", async () => {
  const settings: Settings = {
    avoidConsecutive: false,
    enableScoring: false,
    preferFairScore: false,
    fairWeekend: true,
  };

  // Alice is unavailable for all Saturdays.
  // Bob is available for everything.
  const saturdays = ["2026-03-07", "2026-03-14", "2026-03-21", "2026-03-28"];
  const ALICE_NO_SAT = { ...ALICE, unavailable: saturdays };

  const schedule = await generateSchedule(
    [ALICE_NO_SAT, BOB],
    2026,
    2,
    settings,
  );

  const sunCounts: Record<string, number> = { "1": 0, "2": 0 };

  for (const [date, pid] of Object.entries(schedule)) {
    const d = new Date(date);
    const day = getDay(d);
    if (day === 0) sunCounts[pid]++;
    if (day === 6) {
      assertEquals(
        pid,
        "2",
        "Bob must take all Saturdays because Alice is unavailable",
      );
    }
  }

  // Even though Bob took ALL 4 Saturdays, he SHOULD STILL take half of the Sundays.
  // Because Sundays are balanced independently of Saturday workload.
  const sunDiff = Math.abs(sunCounts["1"] - sunCounts["2"]);
  assertEquals(
    sunDiff <= 1,
    true,
    `Sundays should still be balanced even if Bob took all Saturdays (Alice: ${
      sunCounts["1"]
    }, Bob: ${sunCounts["2"]})`,
  );
});
