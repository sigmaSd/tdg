import { assertEquals } from "@std/assert";
import { generateSchedule, Person, Settings } from "../utils/scheduler.ts";
import { browserTest } from "./utils.ts";

const ALICE: Person = { id: "1", name: "Alice", unavailable: [], color: "red" };
const BOB: Person = { id: "2", name: "Bob", unavailable: [], color: "blue" };

browserTest(
  "Recency Tie-breaker - Alternates when day counts are equal",
  async () => {
    const settings: Settings = {
      avoidConsecutive: false, // Turn off to see if recency alone handles it
      enableScoring: false,
      preferFairScore: false,
      fairWeekend: false,
    };

    // 4 days in March 2026
    const [schedule] = await generateSchedule([ALICE, BOB], 2026, 2, settings);

    const dates = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04"];
    const sequence = dates.map((d) => schedule[d]);

    // Day 1: Both 0 days. One is picked (say Alice).
    // Day 2: Bob has 0, Alice has 1. Bob is picked (min days).
    // Day 3: Both have 1 day.
    //        Alice last worked Day 1.
    //        Bob last worked Day 2.
    //        Alice should be picked (earliest last assignment).
    // Day 4: Both have 2 days (if Alice was picked).
    //        Bob last worked Day 2.
    //        Alice last worked Day 3.
    //        Bob should be picked.

    // So it should strictly alternate regardless of "avoidConsecutive"
    assertEquals(
      sequence[0] !== sequence[1],
      true,
      "Day 1 and 2 should differ",
    );
    assertEquals(
      sequence[0] === sequence[2],
      true,
      "Day 1 and 3 should be same person (alternating)",
    );
    assertEquals(
      sequence[1] === sequence[3],
      true,
      "Day 2 and 4 should be same person (alternating)",
    );
  },
);

browserTest(
  "Recency Tie-breaker - Handles 'catching up' with recency",
  async () => {
    const settings: Settings = {
      avoidConsecutive: false,
      enableScoring: false,
      preferFairScore: false,
      fairWeekend: false,
    };

    // Charlie is unavailable for Day 1 and Day 2.
    // Alice and Bob are available.
    const CHARLIE: Person = {
      id: "3",
      name: "Charlie",
      unavailable: ["2026-03-01", "2026-03-02"],
      color: "green",
    };

    const [schedule] = await generateSchedule(
      [ALICE, BOB, CHARLIE],
      2026,
      2,
      settings,
    );

    // Day 1: A or B.
    // Day 2: The other one (B or A).
    // Day 3: A (1), B (1), C (0). C is picked (min days).
    // Day 4: A (1), B (1), C (1).
    //        C last worked Day 3.
    //        A and B last worked Day 1 and 2.
    //        One of A or B should be picked (the one who worked Day 1).

    const p1 = schedule["2026-03-01"];
    const _p2 = schedule["2026-03-02"];
    const p3 = schedule["2026-03-03"];
    const p4 = schedule["2026-03-04"];

    assertEquals(p3, "3", "Charlie should catch up on Day 3");
    assertEquals(
      p4 === p1,
      true,
      "Day 4 should pick the person from Day 1 because they are 'least recent' among A and B",
    );
  },
);
