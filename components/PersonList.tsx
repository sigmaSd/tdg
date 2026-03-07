import { Person } from "../utils/scheduler.ts";
import { useState } from "preact/hooks";
import UnavailabilityPicker from "../islands/UnavailabilityPicker.tsx";

interface PersonListProps {
  people: Person[];
  onAddPerson: (name: string) => void;
  onDeletePerson: (id: string) => void;
  onUpdatePerson: (person: Person) => void;
}

export function PersonList(
  { people, onAddPerson, onDeletePerson, onUpdatePerson }: PersonListProps,
) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = () => {
    if (newName.trim()) {
      onAddPerson(newName.trim());
      setNewName("");
    }
  };

  const handleSaveDates = (dates: string[]) => {
    if (editingId) {
      const person = people.find((p) => p.id === editingId);
      if (person) {
        onUpdatePerson({ ...person, unavailable: dates });
      }
      setEditingId(null);
    }
  };

  return (
    <div class="space-y-4 p-4 bg-white shadow rounded-lg">
      <h2 class="text-xl font-bold">People & Constraints</h2>

      {/* Add Person Form */}
      <div class="flex gap-2">
        <input
          type="text"
          value={newName}
          onInput={(e) => setNewName(e.currentTarget.value)}
          placeholder="Enter name (e.g., Alice)"
          class="flex-1 border p-2 rounded focus:ring-2 focus:ring-blue-400 outline-none"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          type="button"
          onClick={handleAdd}
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors font-semibold"
        >
          Add
        </button>
      </div>

      {/* List of People */}
      <div class="space-y-4 mt-4">
        {people.length === 0 && (
          <p class="text-gray-500 italic text-center py-4">
            No people added yet.
          </p>
        )}

        {people.map((person) => (
          <PersonItem
            key={person.id}
            person={person}
            onDelete={() => onDeletePerson(person.id)}
            onEditDates={() => setEditingId(person.id)}
          />
        ))}
      </div>

      {/* Unavailability Picker Modal */}
      {editingId && (
        <UnavailabilityPicker
          initialDates={people.find((p) => p.id === editingId)?.unavailable ||
            []}
          onSave={handleSaveDates}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

function PersonItem(
  { person, onDelete, onEditDates }: {
    person: Person;
    onDelete: () => void;
    onEditDates: () => void;
  },
) {
  return (
    <div class="border p-3 rounded hover:bg-gray-50 transition-colors group flex items-center justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <div class={`w-3 h-3 rounded-full ${person.color}`} />
          <span class="font-semibold text-lg text-gray-800">{person.name}</span>
        </div>

        <div class="text-sm text-gray-500 flex items-center gap-2">
          <span class="font-medium">Unavailable:</span>
          {person.unavailable.length > 0
            ? (
              <span class="bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded text-xs font-bold">
                {person.unavailable.length} days
              </span>
            )
            : <span class="italic text-gray-400">None</span>}
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onClick={onEditDates}
          class="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
        >
          Manage Dates
        </button>
        <button
          type="button"
          onClick={onDelete}
          class="text-gray-300 hover:text-red-500 font-bold p-2 transition-colors"
          title="Delete person"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
