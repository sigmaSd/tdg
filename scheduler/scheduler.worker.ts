import type { Z3HighLevel } from "z3-solver";
import type { Schedule, SolveData } from "./types.ts";

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getDay(date: Date) {
  return date.getDay();
}

export async function solve(
  z3: Z3HighLevel,
  data: SolveData,
): Promise<Schedule | null> {
  const { people, year, month, settings, customScores, fixedAssignments } =
    data;
  if (people.length === 0) return null;

  const { Context } = z3;

  const totalDays = getDaysInMonth(year, month);
  const n = people.length;

  const { Solver, Int } = new Context("sol");
  const dayVars = Array.from(
    { length: totalDays },
    (_, i) => Int.const(`day_${i + 1}`),
  );
  const solver = new Solver();

  // 1. Hard Constraints
  for (let d = 0; d < totalDays; d++) {
    const currentDate = new Date(year, month, d + 1);
    const dateString = formatDate(currentDate);

    solver.add(dayVars[d].ge(0));
    solver.add(dayVars[d].lt(n));

    // Fixed assignments take precedence
    if (fixedAssignments[dateString]) {
      const personIdx = people.findIndex((p) =>
        p.id === fixedAssignments[dateString]
      );
      if (personIdx !== -1) {
        solver.add(dayVars[d].eq(personIdx));
      }
    }

    people.forEach((person, idx) => {
      if (person.unavailable.includes(dateString)) {
        // Only add unavailability constraint if it's not a fixed assignment (fixed takes priority)
        if (fixedAssignments[dateString] !== person.id) {
          solver.add(dayVars[d].neq(idx));
        }
      }
    });

    if (settings.avoidConsecutive && d < totalDays - 1) {
      solver.add(dayVars[d].neq(dayVars[d + 1]));
    }
  }

  // 2. Sequential Decision Making (Greedy)
  const currentSchedule: Schedule = {};
  const lastWorked = people.map(() => -100);
  const currentCounts = people.map(() => 0);
  const weekendCounts = people.map(
    () => ({ 0: 0, 6: 0 } as Record<number, number>),
  );
  const currentScores = people.map(() => 0);

  for (let d = 0; d < totalDays; d++) {
    const date = new Date(year, month, d + 1);
    const dateString = formatDate(date);
    const dayOfWeek = getDay(date);
    const isSunday = dayOfWeek === 0;
    const dayScore = customScores[dateString] ?? (isSunday ? 2 : 1);

    const fixedPersonId = fixedAssignments[dateString];
    const candidates = [];

    if (fixedPersonId) {
      const idx = people.findIndex((p) => p.id === fixedPersonId);
      if (idx !== -1) {
        candidates.push({
          idx,
          totalWorkload: currentCounts[idx],
          weekendWorkload: settings.fairWeekend
            ? (weekendCounts[idx][dayOfWeek] || 0)
            : 0,
          score: currentScores[idx],
          recency: lastWorked[idx],
          opportunity: 0,
          weekendOpportunity: 0,
        });
      }
    } else {
      for (let idx = 0; idx < n; idx++) {
        if (people[idx].unavailable.includes(dateString)) continue;
        if (
          settings.avoidConsecutive && d > 0 &&
          currentSchedule[formatDate(new Date(year, month, d))] ===
            people[idx].id
        ) continue;

        let futureAvail = 0;
        for (let f = d; f < totalDays; f++) {
          if (
            !people[idx].unavailable.includes(
              formatDate(new Date(year, month, f + 1)),
            )
          ) futureAvail++;
        }

        let futureWeekendAvail = 0;
        if (settings.fairWeekend && (dayOfWeek === 0 || dayOfWeek === 6)) {
          for (let f = d; f < totalDays; f++) {
            const fd = new Date(year, month, f + 1);
            if (
              getDay(fd) === dayOfWeek &&
              !people[idx].unavailable.includes(formatDate(fd))
            ) futureWeekendAvail++;
          }
        }

        candidates.push({
          idx,
          totalWorkload: currentCounts[idx],
          weekendWorkload: settings.fairWeekend
            ? (weekendCounts[idx][dayOfWeek] || 0)
            : 0,
          score: currentScores[idx],
          recency: lastWorked[idx],
          opportunity: futureAvail,
          weekendOpportunity: futureWeekendAvail,
        });
      }

      candidates.sort((a, b) => {
        if (settings.fairWeekend && (dayOfWeek === 0 || dayOfWeek === 6)) {
          if (a.weekendWorkload !== b.weekendWorkload) {
            return a.weekendWorkload - b.weekendWorkload;
          }
          if (a.weekendOpportunity !== b.weekendOpportunity) {
            return a.weekendOpportunity - b.weekendOpportunity;
          }
        }
        if (settings.enableScoring && settings.preferFairScore) {
          if (Math.abs(a.score - b.score) > 1) return a.score - b.score;
        }
        if (a.totalWorkload !== b.totalWorkload) {
          return a.totalWorkload - b.totalWorkload;
        }
        if (a.opportunity !== b.opportunity) {
          return a.opportunity - b.opportunity;
        }
        return a.recency - b.recency;
      });
    }

    let assigned = false;
    for (const cand of candidates) {
      solver.push();
      solver.add(dayVars[d].eq(cand.idx));
      if ((await solver.check()) === "sat") {
        currentSchedule[dateString] = people[cand.idx].id;
        lastWorked[cand.idx] = d;
        currentCounts[cand.idx]++;
        currentScores[cand.idx] += dayScore;
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekendCounts[cand.idx][dayOfWeek]++;
        }
        assigned = true;
        break;
      } else {
        solver.pop();
      }
    }

    if (!assigned) return null;
  }

  return currentSchedule;
}
