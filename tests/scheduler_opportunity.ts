import { assertEquals } from "@std/assert";
import { generateSchedule, Person, Settings } from "../utils/scheduler.ts";
import { getDay } from "date-fns";
import { browserTest } from "./utils.ts";

const ALICE: Person = { id: "1", name: "Alice", unavailable: [], color: "red" };
const BOB: Person = { id: "2", name: "Bob", unavailable: [], color: "blue" };

browserTest(
  "Opportunity Tie-breaker - Prioritizes person with fewer total chances",
  async () => {
    const settings: Settings = {
      avoidConsecutive: false,
      enableScoring: false,
      preferFairScore: false,
      fairWeekend: true,
    };

    // March 2026: Sundays are 1, 8, 15, 22, 29.

    // Alice is ONLY available on the first Sunday (March 1st).
    // She is unavailable for all other Sundays.
    const aliceUnavailable = [
      "2026-03-08",
      "2026-03-15",
      "2026-03-22",
      "2026-03-29",
    ];
    const ALICE_LIMITED = { ...ALICE, unavailable: aliceUnavailable };

    // Bob is available for ALL Sundays.
    const BOB_FULL = { ...BOB };

    // Run the generator
    const [schedule] = await generateSchedule(
      [ALICE_LIMITED, BOB_FULL],
      2026,
      2,
      settings,
    );

    // On March 1st (Sunday), both Alice and Bob have 0 Sunday shifts.
    // Without opportunity tie-break, it would be 50/50.
    // WITH opportunity tie-break, Alice MUST be picked because she only has 1 total Sunday opportunity
    // whereas Bob has 5.

    assertEquals(
      schedule["2026-03-01"],
      "1",
      "Alice should be prioritized on March 1st because it is her ONLY Sunday opportunity",
    );

    // Verify Bob takes the rest of the Sundays (fairness is still greedy, but Alice got her chance)
    assertEquals(schedule["2026-03-08"], "2");
    assertEquals(schedule["2026-03-15"], "2");
    assertEquals(schedule["2026-03-22"], "2");
    assertEquals(schedule["2026-03-29"], "2");
  },
);

browserTest(
  "Opportunity Tie-breaker - Handles complex unavailability like 'bedis'",
  async () => {
    const settings: Settings = {
      avoidConsecutive: true,
      enableScoring: false,
      preferFairScore: false,
      fairWeekend: true,
    };

    // User "bedis" scenario: unavailable for the last 14 days of March.
    // This includes the last two weekends.
    const bedisUnavailable = [];
    for (let i = 18; i <= 31; i++) {
      bedisUnavailable.push(`2026-03-${String(i).padStart(2, "0")}`);
    }
    const BEDIS = {
      id: "bedis",
      name: "bedis",
      unavailable: bedisUnavailable,
      color: "red",
    };
    const OTHERS = [
      { id: "k", name: "k", unavailable: [], color: "blue" },
      { id: "a", name: "a", unavailable: [], color: "green" },
      { id: "m", name: "m", unavailable: [], color: "yellow" },
    ];

    const [schedule] = await generateSchedule(
      [BEDIS, ...OTHERS],
      2026,
      2,
      settings,
    );

    const bedisSundays = Object.entries(schedule).filter(([date, pid]) => {
      return pid === "bedis" && getDay(new Date(date)) === 0;
    }).length;

    // Bedis is only available for 3 Sundays (1st, 8th, 15th).
    // Others are available for 5 Sundays.
    // Total Sundays = 5. Average per person = 5 / 4 = 1.25.
    // Bedis should definitely get at least 1 Sunday if the logic prioritizes him early.
    // Before this logic, Bedis might get 0 if he was "unlucky" on the first 3 Sundays.

    console.log("Bedis total Sundays:", bedisSundays);
    assertEquals(
      bedisSundays >= 1,
      true,
      "Bedis should have gotten at least one Sunday shift while he was available",
    );
  },
);
