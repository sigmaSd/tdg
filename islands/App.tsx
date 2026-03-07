import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  DayScores,
  generateSchedule,
  Person,
  Schedule,
  Settings,
} from "../utils/scheduler.ts";
import { PersonList } from "../components/PersonList.tsx";
import { Calendar } from "../components/Calendar.tsx";
import { SettingsMenu } from "../components/SettingsMenu.tsx";
import { ScheduleSummary } from "../components/ScheduleSummary.tsx";
import { addMonths, format, getDay, parseISO } from "date-fns";

const COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-cyan-500",
];

const DEFAULT_SETTINGS: Settings = {
  avoidConsecutive: true,
  enableScoring: false,
  preferFairScore: false,
  fairWeekend: false,
};

export default function App() {
  const viewDate = useSignal(addMonths(new Date(), 1));
  const people = useSignal<Person[]>([]);
  const schedule = useSignal<Schedule>({});
  const settings = useSignal<Settings>(DEFAULT_SETTINGS);
  const customScores = useSignal<DayScores>({});
  const initialized = useSignal(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedPeople = localStorage.getItem("tdg-people");
    if (savedPeople) people.value = JSON.parse(savedPeople);
    else {
      people.value = [
        {
          id: crypto.randomUUID(),
          name: "Alice",
          unavailable: [],
          color: COLORS[0],
        },
        {
          id: crypto.randomUUID(),
          name: "Bob",
          unavailable: [],
          color: COLORS[1],
        },
        {
          id: crypto.randomUUID(),
          name: "Charlie",
          unavailable: [],
          color: COLORS[2],
        },
      ];
    }

    const savedSettings = localStorage.getItem("tdg-settings");
    if (savedSettings) settings.value = JSON.parse(savedSettings);

    const savedScores = localStorage.getItem("tdg-scores");
    if (savedScores) customScores.value = JSON.parse(savedScores);

    const savedMonth = localStorage.getItem("tdg-view-month");
    if (savedMonth) viewDate.value = parseISO(savedMonth);

    const savedSchedule = localStorage.getItem("tdg-schedule");
    if (savedSchedule) schedule.value = JSON.parse(savedSchedule);

    initialized.value = true;
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (initialized.value) {
      localStorage.setItem("tdg-people", JSON.stringify(people.value));
      localStorage.setItem("tdg-settings", JSON.stringify(settings.value));
      localStorage.setItem("tdg-scores", JSON.stringify(customScores.value));
      localStorage.setItem("tdg-view-month", viewDate.value.toISOString());
      localStorage.setItem("tdg-schedule", JSON.stringify(schedule.value));
    }
  }, [
    people.value,
    settings.value,
    customScores.value,
    viewDate.value,
    schedule.value,
    initialized.value,
  ]);

  const handleAddPerson = (name: string) => {
    const color = COLORS[people.value.length % COLORS.length];
    people.value = [
      ...people.value,
      { id: crypto.randomUUID(), name, unavailable: [], color },
    ];
  };

  const handleDeletePerson = (id: string) => {
    people.value = people.value.filter((p) => p.id !== id);
  };

  const handleUpdatePerson = (updatedPerson: Person) => {
    people.value = people.value.map((p) =>
      p.id === updatedPerson.id ? updatedPerson : p
    );
  };

  const handleGenerate = () => {
    const year = viewDate.value.getFullYear();
    const month = viewDate.value.getMonth();
    schedule.value = generateSchedule(
      people.value,
      year,
      month,
      settings.value,
      customScores.value,
    );
  };

  const changeMonth = (delta: number) => {
    viewDate.value = addMonths(viewDate.value, delta);
    schedule.value = {};
  };

  const handleToggleScore = (dateString: string) => {
    const isSunday = getDay(parseISO(dateString)) === 0;
    const currentScore = customScores.value[dateString] ?? (isSunday ? 2 : 1);
    const nextScore = currentScore >= 3 ? 1 : currentScore + 1;

    customScores.value = {
      ...customScores.value,
      [dateString]: nextScore,
    };
  };

  return (
    <div class="min-h-screen bg-gray-50 p-4 font-sans text-gray-900">
      <header class="mb-8 text-center">
        <h1 class="text-4xl font-extrabold text-blue-700 tracking-tight">
          Tableau de Garde
        </h1>
        <p class="text-gray-500 mt-2">Automatic & Fair Schedule Generator</p>
      </header>

      <main class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Management */}
        <div class="lg:col-span-4 space-y-6">
          <PersonList
            people={people.value}
            onAddPerson={handleAddPerson}
            onDeletePerson={handleDeletePerson}
            onUpdatePerson={handleUpdatePerson}
          />

          <SettingsMenu
            settings={settings.value}
            onUpdate={(s) => settings.value = s}
          />

          <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h3 class="font-bold text-blue-800 mb-2">Instructions</h3>
            <ul class="list-disc list-inside text-sm text-blue-700 space-y-1">
              <li>Add people to the roster.</li>
              <li>Manage unavailability for each person.</li>
              <li>Adjust scheduling settings as needed.</li>
              <li>
                Click <strong>Generate Schedule</strong>.
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Calendar & Controls */}
        <div class="lg:col-span-8 space-y-6">
          {/* Controls */}
          <div class="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between items-center gap-4 border-t-4 border-blue-500">
            <div class="flex items-center gap-4">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                class="p-2 hover:bg-gray-100 rounded-full transition-colors text-xl"
                title="Previous Month"
              >
                ←
              </button>
              <h2 class="text-2xl font-bold w-48 text-center">
                {format(viewDate.value, "MMMM yyyy")}
              </h2>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                class="p-2 hover:bg-gray-100 rounded-full transition-colors text-xl"
                title="Next Month"
              >
                →
              </button>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              class="bg-green-600 text-white px-8 py-3 rounded-lg font-bold text-lg shadow-lg hover:bg-green-700 transition-all transform active:scale-95 hover:shadow-xl w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <span>Generate Schedule</span>
            </button>
          </div>

          {/* Calendar */}
          <Calendar
            schedule={schedule.value}
            year={viewDate.value.getFullYear()}
            month={viewDate.value.getMonth()}
            people={people.value}
            settings={settings.value}
            customScores={customScores.value}
            onToggleScore={handleToggleScore}
          />

          <ScheduleSummary
            schedule={schedule.value}
            people={people.value}
            settings={settings.value}
            customScores={customScores.value}
            year={viewDate.value.getFullYear()}
            month={viewDate.value.getMonth()}
          />
        </div>
      </main>
    </div>
  );
}
