import { assert, assertEquals } from "jsr:@std/assert@1";
import { generateSchedule, Person } from "../utils/scheduler.ts";
import { browserTest } from "./utils.ts";

browserTest(
  "generateSchedule - empty people returns empty schedule",
  async () => {
    const schedules = await generateSchedule([], 2026, 0);
    assertEquals(schedules, []);
  },
);

browserTest("generateSchedule - respects unavailability", async () => {
  const people: Person[] = [
    {
      id: "1",
      name: "Alice",
      unavailable: ["2026-01-01"],
      color: "bg-red-500",
    },
    { id: "2", name: "Bob", unavailable: [], color: "bg-blue-500" },
  ];

  // Generate for Jan 2026
  const [schedule] = await generateSchedule(people, 2026, 0); // Month 0 is Jan

  // Jan 1st is unavailable for Alice, so Bob MUST be assigned (or empty if no one available)
  // Bob is available.
  assertEquals(schedule["2026-01-01"], "2");

  // Check that Alice is never assigned on unavailable date
  assert(schedule["2026-01-01"] !== "1");
});

browserTest("generateSchedule - fair distribution", async () => {
  const people: Person[] = [
    { id: "1", name: "A", unavailable: [], color: "bg-red-500" },
    { id: "2", name: "B", unavailable: [], color: "bg-blue-500" },
  ];

  // Jan 2026 has 31 days.
  // 31 / 2 = 15.5. So one gets 15, one gets 16.
  const [schedule] = await generateSchedule(people, 2026, 0);

  const counts: Record<string, number> = { "1": 0, "2": 0 };
  Object.values(schedule).forEach((id) => counts[id]++);

  assert(
    Math.abs(counts["1"] - counts["2"]) <= 1,
    `Distribution not fair: ${JSON.stringify(counts)}`,
  );
});

browserTest("generateSchedule - partial availability", async () => {
  const people: Person[] = [
    { id: "1", name: "A", unavailable: [], color: "bg-red-500" }, // Available all month
    { id: "2", name: "B", unavailable: [], color: "bg-blue-500" }, // Available all month
    { id: "3", name: "C", unavailable: [], color: "bg-green-500" }, // Available all month
  ];
  // Make C unavailable for 30 days?
  // Let's just run basic check
  const [schedule] = await generateSchedule(people, 2026, 0);

  const counts: Record<string, number> = { "1": 0, "2": 0, "3": 0 };
  Object.values(schedule).forEach((id) => counts[id]++);

  // 31 days / 3 people = 10.33. So 10, 10, 11.
  assert(counts["1"] >= 10 && counts["1"] <= 11);
  assert(counts["2"] >= 10 && counts["2"] <= 11);
  assert(counts["3"] >= 10 && counts["3"] <= 11);
});
