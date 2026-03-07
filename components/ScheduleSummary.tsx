import { DayScores, Person, Schedule, Settings } from "../utils/scheduler.ts";
import { format, getDay, getDaysInMonth, parseISO } from "date-fns";

interface ScheduleSummaryProps {
  schedule: Schedule;
  people: Person[];
  settings: Settings;
  customScores: DayScores;
  year: number;
  month: number;
}

export function ScheduleSummary(
  { schedule, people, settings, customScores, year, month }:
    ScheduleSummaryProps,
) {
  const startDate = new Date(year, month, 1);
  const totalDaysInMonth = getDaysInMonth(startDate);

  const stats = people.map((person) => {
    let days = 0;
    let score = 0;
    let availableDays = 0;

    // Calculate available days for the person in this month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = format(new Date(year, month, d), "yyyy-MM-dd");
      if (!person.unavailable.includes(dateStr)) {
        availableDays++;
      }
    }

    for (const [date, personId] of Object.entries(schedule)) {
      if (personId === person.id) {
        days++;
        const isSunday = getDay(parseISO(date)) === 0;
        const dayScore = settings.enableScoring
          ? (customScores[date] ?? (isSunday ? 2 : 1))
          : 1;
        score += dayScore;
      }
    }

    return { ...person, days, score, availableDays };
  });

  if (Object.keys(schedule).length === 0) return null;

  return (
    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span class="w-1.5 h-6 bg-blue-600 rounded-full"></span>
        Schedule Statistics
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((p) => (
          <div
            key={p.id}
            class="flex items-center gap-4 p-3 rounded-lg bg-gray-50 border border-gray-100 shadow-sm transition-all hover:shadow-md"
          >
            <div class={`w-4 h-4 rounded-full ${p.color} shrink-0`} />
            <div class="flex-1 min-w-0">
              <p class="font-bold text-gray-800 truncate">{p.name}</p>
              <div class="flex flex-col text-sm text-gray-600">
                <div class="flex justify-between items-center">
                  <span>
                    <strong>{p.days}</strong> {p.days === 1 ? "day" : "days"}
                  </span>
                  <span class="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">
                    Avail: {p.availableDays}d
                  </span>
                </div>
                {settings.enableScoring && (
                  <span class="text-amber-600 font-medium">
                    Score: <strong>{p.score}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
