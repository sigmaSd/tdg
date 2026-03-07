import { DayScores, Person, Schedule, Settings } from "../utils/scheduler.ts";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";

interface CalendarProps {
  schedule: Schedule;
  year: number;
  month: number;
  people: Person[];
  settings: Settings;
  customScores: DayScores;
  onToggleScore: (date: string) => void;
}

export function Calendar(
  { schedule, year, month, people, settings, customScores, onToggleScore }:
    CalendarProps,
) {
  const date = new Date(year, month, 1);
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start, end });
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getPerson = (id: string) => {
    return people.find((p) => p.id === id);
  };

  return (
    <div class="bg-white shadow rounded-lg overflow-hidden border">
      <div class="grid grid-cols-7 bg-gray-100 border-b">
        {weekDays.map((d) => (
          <div key={d} class="py-2 text-center font-bold text-gray-600 text-sm">
            {d}
          </div>
        ))}
      </div>

      <div class="grid grid-cols-7 auto-rows-fr">
        {days.map((day) => {
          const dateString = format(day, "yyyy-MM-dd");
          const personId = schedule[dateString];
          const person = personId ? getPerson(personId) : null;
          const isCurrentMonth = isSameMonth(day, date);
          const isSunday = getDay(day) === 0;
          const score = customScores[dateString] ?? (isSunday ? 2 : 1);

          return (
            <div
              key={dateString}
              class={`min-h-[100px] p-2 border-b border-r relative flex flex-col justify-between group transition-colors ${
                !isCurrentMonth ? "bg-gray-50 text-gray-400" : "bg-white"
              } ${isToday(day) ? "bg-blue-50/50" : ""}`}
            >
              <div class="flex justify-between items-start">
                <span
                  class={`text-sm font-semibold ${
                    isToday(day) ? "text-blue-600" : ""
                  }`}
                >
                  {format(day, "d")}
                </span>

                {settings.enableScoring && isCurrentMonth && (
                  <button
                    type="button"
                    onClick={() => onToggleScore(dateString)}
                    class={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all ${
                      score >= 2
                        ? "bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    } hover:scale-110 active:scale-95`}
                    title="Click to toggle score"
                  >
                    Score: {score}
                  </button>
                )}
              </div>

              {person && (
                <div
                  class={`mt-auto mb-1 ${person.color} text-white text-[13px] px-2 py-1.5 rounded-md shadow-sm text-center font-bold truncate transition-transform group-hover:scale-105`}
                >
                  {person.name}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
