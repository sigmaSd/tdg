import type {
  DayScores,
  Person,
  Schedule,
  Settings,
} from "../scheduler/types.ts";
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
import { useState } from "preact/hooks";

interface CalendarProps {
  schedule: Schedule;
  year: number;
  month: number;
  people: Person[];
  settings: Settings;
  customScores: DayScores;
  fixedAssignments: Record<string, string>;
  onToggleScore: (date: string) => void;
  onSetFixedAssignment: (date: string, personId: string) => void;
  onResetFixedAssignment: (date: string) => void;
}

export function Calendar(
  {
    schedule,
    year,
    month,
    people,
    settings,
    customScores,
    fixedAssignments,
    onToggleScore,
    onSetFixedAssignment,
    onResetFixedAssignment,
  }: CalendarProps,
) {
  const date = new Date(year, month, 1);
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start, end });
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const [selectingDate, setSelectingDate] = useState<string | null>(null);

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
          const isFixed = !!fixedAssignments[dateString];

          return (
            <div
              key={dateString}
              class={`min-h-[100px] p-2 border-b border-r relative flex flex-col justify-between group transition-colors ${
                !isCurrentMonth ? "bg-gray-50 text-gray-400" : "bg-white"
              } ${isToday(day) ? "bg-blue-50/50" : ""} ${
                isFixed ? "ring-2 ring-blue-400 ring-inset" : ""
              } cursor-pointer hover:bg-gray-50/80`}
              onClick={() => {
                if (isCurrentMonth) {
                  setSelectingDate(
                    selectingDate === dateString ? null : dateString,
                  );
                }
              }}
            >
              <div class="flex justify-between items-start">
                <div class="flex flex-col">
                  <span
                    class={`text-sm font-semibold ${
                      isToday(day) ? "text-blue-600" : ""
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  {isFixed && (
                    <span class="text-[9px] uppercase font-bold text-blue-600 tracking-tighter">
                      Manual
                    </span>
                  )}
                </div>

                <div class="flex flex-col items-end gap-1">
                  {settings.enableScoring && isCurrentMonth && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleScore(dateString);
                      }}
                      class={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all ${
                        score >= 2
                          ? "bg-amber-100 text-amber-700 border-amber-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      } hover:scale-110 active:scale-95`}
                      title="Click to toggle score"
                    >
                      S: {score}
                    </button>
                  )}

                  {isFixed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onResetFixedAssignment(dateString);
                      }}
                      class="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                      title="Reset manual assignment"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {person && (
                <div
                  class={`mt-auto mb-1 ${person.color} text-white text-[13px] px-2 py-1.5 rounded-md shadow-sm text-center font-bold truncate transition-transform group-hover:scale-105 ${
                    isFixed ? "border-2 border-white/50" : ""
                  }`}
                >
                  {person.name}
                </div>
              )}

              {/* Selection Dropdown */}
              {selectingDate === dateString && (
                <div
                  class="absolute inset-0 z-10 bg-white p-2 border shadow-lg rounded overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div class="flex justify-between items-center mb-2 pb-1 border-b">
                    <span class="text-xs font-bold text-gray-600">
                      Assign to {format(day, "MMM d")}
                    </span>
                    <button
                      type="button"
                      class="text-gray-400 hover:text-gray-600"
                      onClick={() => setSelectingDate(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <div class="grid grid-cols-1 gap-1">
                    {people.map((p) => {
                      const isUnavailable = p.unavailable.includes(dateString);
                      return (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => {
                            onSetFixedAssignment(dateString, p.id);
                            setSelectingDate(null);
                          }}
                          class={`text-left px-2 py-1.5 rounded text-sm font-medium transition-colors ${
                            p.id === personId
                              ? "bg-blue-100 text-blue-800"
                              : "hover:bg-gray-100"
                          } ${isUnavailable ? "opacity-50 line-through" : ""}`}
                        >
                          <div class="flex items-center gap-2">
                            <div class={`w-2 h-2 rounded-full ${p.color}`}>
                            </div>
                            {p.name}
                            {isUnavailable && (
                              <span class="text-[10px] ml-auto text-red-500">
                                Unavail
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
