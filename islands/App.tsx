import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { generateSchedule, Person, Schedule } from "../utils/scheduler.ts";
import { PersonList } from "../components/PersonList.tsx";
import { Calendar } from "../components/Calendar.tsx";
import { addMonths, format, subMonths } from "npm:date-fns";

export default function App() {
  // Default to next month
  const viewDate = useSignal(addMonths(new Date(), 1));
  const people = useSignal<Person[]>([]);
  const schedule = useSignal<Schedule>({});
  const initialized = useSignal(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedPeople = localStorage.getItem("tdg-people");
    if (savedPeople) {
      people.value = JSON.parse(savedPeople);
    } else {
      // Seed defaults
      people.value = [
        { id: crypto.randomUUID(), name: "Alice", unavailable: [] },
        { id: crypto.randomUUID(), name: "Bob", unavailable: [] },
        { id: crypto.randomUUID(), name: "Charlie", unavailable: [] },
      ];
    }
    initialized.value = true;
  }, []);

  // Save to LocalStorage whenever people change
  useEffect(() => {
    if (initialized.value) {
      localStorage.setItem("tdg-people", JSON.stringify(people.value));
    }
  }, [people.value, initialized.value]);

  const handleAddPerson = (name: string) => {
    people.value = [
      ...people.value,
      { id: crypto.randomUUID(), name, unavailable: [] },
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
    schedule.value = generateSchedule(people.value, year, month);
  };

  const changeMonth = (delta: number) => {
    viewDate.value = addMonths(viewDate.value, delta);
    // Optionally clear schedule or keep it?
    // Usually a new month needs a new schedule.
    schedule.value = {};
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
        {/* Left Column: People Management */}
        <div class="lg:col-span-4">
          <PersonList
            people={people.value}
            onAddPerson={handleAddPerson}
            onDeletePerson={handleDeletePerson}
            onUpdatePerson={handleUpdatePerson}
          />

          <div class="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h3 class="font-bold text-blue-800 mb-2">Instructions</h3>
            <ul class="list-disc list-inside text-sm text-blue-700 space-y-1">
              <li>Add people to the roster.</li>
              <li>Click "Add Date" to mark unavailability.</li>
              <li>Select the target month.</li>
              <li>
                Click <strong>Generate Schedule</strong>.
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Calendar & Controls */}
        <div class="lg:col-span-8 space-y-6">
          {/* Controls */}
          <div class="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between items-center gap-4">
            <div class="flex items-center gap-4">
              <button
                onClick={() => changeMonth(-1)}
                class="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Previous Month"
              >
                ←
              </button>
              <h2 class="text-2xl font-bold w-48 text-center">
                {format(viewDate.value, "MMMM yyyy")}
              </h2>
              <button
                onClick={() => changeMonth(1)}
                class="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Next Month"
              >
                →
              </button>
            </div>

            <button
              onClick={handleGenerate}
              class="bg-green-600 text-white px-6 py-3 rounded-lg font-bold text-lg shadow hover:bg-green-700 transition-transform transform active:scale-95 w-full sm:w-auto"
            >
              Generate Schedule 🎲
            </button>
          </div>

          {/* Calendar */}
          <Calendar
            schedule={schedule.value}
            year={viewDate.value.getFullYear()}
            month={viewDate.value.getMonth()}
            people={people.value}
          />
        </div>
      </main>
    </div>
  );
}
