import { Person, Schedule } from "../utils/scheduler.ts";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
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
}

export function Calendar({ schedule, year, month, people }: CalendarProps) {
  const date = new Date(year, month, 1);
  const start = startOfWeek(startOfMonth(date));
  const end = endOfWeek(endOfMonth(date));

  const days = eachDayOfInterval({ start, end });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getPersonName = (id: string) => {
    return people.find((p) => p.id === id)?.name || "Unknown";
  };

  return (
    <div class="bg-white shadow rounded-lg overflow-hidden">
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
          const isCurrentMonth = isSameMonth(day, date);

          return (
            <div
              key={dateString}
              class={`min-h-[100px] p-2 border-b border-r relative flex flex-col justify-between ${
                !isCurrentMonth ? "bg-gray-50 text-gray-400" : "bg-white"
              } ${isToday(day) ? "bg-blue-50" : ""}`}
            >
              <span
                class={`text-sm font-semibold ${
                  isToday(day) ? "text-blue-600" : ""
                }`}
              >
                {format(day, "d")}
              </span>

              {personId && (
                <div class="mt-1 bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded shadow-sm text-center font-medium truncate">
                  {getPersonName(personId)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
