// Web Worker that runs Z3 solver for schedule generation.
// Runs in its own thread so Z3's internal pthreads work correctly
// and the main thread UI doesn't freeze.

// In a Worker, document.currentScript doesn't exist, so z3-built.js can't
// determine its own URL (_scriptDir). This causes pthread sub-workers to get
// undefined instead of a URL. Setting __filename fixes this (line 4 of z3-built.js).
globalThis.__filename = new URL("/z3-built.js", self.location.href).href;

importScripts("/z3-built.js");

// Bridge for z3-solver's browser.js which reads `global.initZ3`
globalThis.global = globalThis;
globalThis.global.initZ3 = globalThis.initZ3;

// Load the bundled z3-solver high-level wrapper
// Sets globalThis.z3Init which wraps the low-level initZ3 into a nice API.
importScripts("/z3-wrapper.js");

let z3Context = null;

async function getZ3() {
  if (z3Context) return z3Context;
  console.log("[worker] calling z3Init()...");
  z3Context = await globalThis.z3Init();
  console.log("[worker] z3Init() completed!");
  return z3Context;
}

// date-fns helpers inlined to avoid import issues in worker context
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDaysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getDay(date) {
  return date.getDay();
}

async function generateSchedule(
  people,
  year,
  month,
  settings,
  customScores,
  maxSolutions = 5,
) {
  const schedules = [];

  if (people.length === 0) return schedules;

  const z3 = await getZ3();
  const { Context } = z3;
  // Use Solver (not Optimize) — much faster. Fairness via direct constraints.
  const { Solver, Int, Sum, If, Or } = new Context("main");

  const startDate = new Date(year, month, 1);
  const totalDays = getDaysInMonth(startDate);
  const n = people.length;

  const dayVars = Array.from(
    { length: totalDays },
    (_, i) => Int.const(`day_${i + 1}`),
  );

  const solver = new Solver();

  // Hard Constraints: bounds + unavailability + no consecutive
  for (let d = 0; d < totalDays; d++) {
    const currentDate = new Date(year, month, d + 1);
    const dateString = formatDate(currentDate);

    // Each day assigned to a valid person index [0, n)
    solver.add(dayVars[d].ge(0));
    solver.add(dayVars[d].lt(n));

    people.forEach((person, idx) => {
      if (person.unavailable.includes(dateString)) {
        solver.add(dayVars[d].neq(idx));
      }
    });

    if (settings.avoidConsecutive && d < totalDays - 1) {
      solver.add(dayVars[d].neq(dayVars[d + 1]));
    }
  }

  // Helper: count shifts for a subset of days per person
  function countPerPerson(dayIndices) {
    return people.map((_, idx) => {
      const counts = dayIndices.map((dIdx) =>
        If(dayVars[dIdx].eq(idx), Int.val(1), Int.val(0))
      );
      return Sum(counts[0], ...counts.slice(1));
    });
  }

  // Fairness: each person gets floor(days/n) to ceil(days/n) shifts
  const allDayIndices = Array.from({ length: totalDays }, (_, i) => i);
  const personShifts = countPerPerson(allDayIndices);
  const minFair = Math.floor(totalDays / n);
  const maxFair = Math.ceil(totalDays / n);
  console.log(
    `[worker] fairness bounds: ${minFair}-${maxFair} shifts per person (${totalDays} days, ${n} people)`,
  );
  people.forEach((_, idx) => {
    solver.add(personShifts[idx].ge(minFair));
    solver.add(personShifts[idx].le(maxFair));
  });

  // Weekend Fairness
  if (settings.fairWeekend) {
    const satDates = [];
    const sunDates = [];
    for (let d = 0; d < totalDays; d++) {
      const date = new Date(year, month, d + 1);
      if (getDay(date) === 6) satDates.push(d);
      if (getDay(date) === 0) sunDates.push(d);
    }

    const addWeekendFairness = (dayIndices) => {
      if (dayIndices.length === 0) return;
      const perPerson = countPerPerson(dayIndices);
      const minW = Math.floor(dayIndices.length / n);
      const maxW = Math.ceil(dayIndices.length / n);
      people.forEach((_, idx) => {
        solver.add(perPerson[idx].ge(minW));
        solver.add(perPerson[idx].le(maxW));
      });
    };

    addWeekendFairness(satDates);
    addWeekendFairness(sunDates);
  }

  // Scoring Fairness
  if (settings.enableScoring && settings.preferFairScore) {
    const personTotalScores = people.map((_, idx) => {
      const scores = dayVars.map((v, d) => {
        const currentDate = new Date(year, month, d + 1);
        const dateString = formatDate(currentDate);
        const isSunday = getDay(currentDate) === 0;
        const dayScore = customScores[dateString] ?? (isSunday ? 2 : 1);
        return If(v.eq(idx), Int.val(dayScore), Int.val(0));
      });
      return Sum(scores[0], ...scores.slice(1));
    });

    // Compute expected score range
    let totalScore = 0;
    for (let d = 0; d < totalDays; d++) {
      const currentDate = new Date(year, month, d + 1);
      const dateString = formatDate(currentDate);
      const isSunday = getDay(currentDate) === 0;
      totalScore += customScores[dateString] ?? (isSunday ? 2 : 1);
    }
    const minScore = Math.floor(totalScore / n) - 1;
    const maxScore = Math.ceil(totalScore / n) + 1;
    people.forEach((_, idx) => {
      solver.add(personTotalScores[idx].ge(minScore));
      solver.add(personTotalScores[idx].le(maxScore));
    });
  }

  // Solve loop for multiple solutions
  for (let i = 0; i < maxSolutions; i++) {
    console.log(`[worker] calling solver.check() for solution ${i + 1}...`);
    const status = await solver.check();
    console.log(
      `[worker] solver.check() for solution ${i + 1} returned:`,
      status,
    );

    if (status === "sat") {
      const model = solver.model();
      const schedule = {};
      const block = [];
      for (let d = 0; d < totalDays; d++) {
        const currentDate = new Date(year, month, d + 1);
        const dateString = formatDate(currentDate);
        const val = model.eval(dayVars[d]);
        const personIdx = Number(val.toString());
        schedule[dateString] = people[personIdx].id;
        block.push(dayVars[d].neq(val));
      }
      schedules.push(schedule);
      solver.add(Or(...block));
      self.postMessage({
        type: "progress",
        current: i + 1,
        total: maxSolutions,
      });
    } else {
      if (i === 0) {
        console.warn(
          "[worker] Z3 returned",
          status,
          "- no valid schedule with current constraints.",
        );
      } else {
        console.log(`[worker] No more solutions found after ${i}.`);
      }
      break;
    }
  }

  return schedules;
}

self.onmessage = async (e) => {
  console.log("[worker] received message", e.data);
  const { people, year, month, settings, customScores } = e.data;
  try {
    const schedules = await generateSchedule(
      people,
      year,
      month,
      settings,
      customScores,
      5, // Default to 5 solutions
    );
    self.postMessage({ ok: true, schedules });
  } catch (err) {
    console.error("[worker] Error during generation:", err);
    self.postMessage({ ok: false, error: String(err) });
  }
};
