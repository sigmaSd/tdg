import { Person } from "../utils/scheduler.ts";
import { useState, useRef } from "preact/hooks";

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

  const handleAdd = () => {
    if (newName.trim()) {
      onAddPerson(newName.trim());
      setNewName("");
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
          onClick={handleAdd}
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors font-semibold"
        >
          Add
        </button>
      </div>

      {/* List of People */}
      <div class="space-y-4 mt-4">
        {people.length === 0 && (
          <p class="text-gray-500 italic text-center py-4">No people added yet.</p>
        )}

        {people.map((person) => (
          <PersonItem
            key={person.id}
            person={person}
            onDelete={() => onDeletePerson(person.id)}
            onUpdate={onUpdatePerson}
          />
        ))}
      </div>
    </div>
  );
}

function PersonItem(
  { person, onDelete, onUpdate }: {
    person: Person;
    onDelete: () => void;
    onUpdate: (p: Person) => void;
  },
) {
  const [newDate, setNewDate] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleAddDate = () => {
    if (newDate && !person.unavailable.includes(newDate)) {
      onUpdate({
        ...person,
        unavailable: [...person.unavailable, newDate].sort(),
      });
      setNewDate("");
      // Refocus the input after the state update
      setTimeout(() => {
        dateInputRef.current?.focus();
      }, 0);
    }
  };

  const handleRemoveDate = (dateToRemove: string) => {
    onUpdate({
      ...person,
      unavailable: person.unavailable.filter((d) => d !== dateToRemove),
    });
  };

  return (
    <div class="border p-3 rounded hover:bg-gray-50 transition-colors group">
      <div class="flex justify-between items-center mb-2">
        <span class="font-semibold text-lg text-gray-800">{person.name}</span>
        <button
          onClick={onDelete}
          class="text-gray-400 hover:text-red-500 font-bold px-2 transition-colors opacity-0 group-hover:opacity-100"
          title="Delete person"
        >
          &times;
        </button>
      </div>

      <div class="text-sm">
        <div class="flex flex-wrap gap-2 mb-3 items-center min-h-[24px]">
          <span class="text-gray-500 text-xs font-medium uppercase tracking-wider">Unavailable:</span>
          {person.unavailable.map((date) => (
            <span
              key={date}
              class="bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded text-xs flex items-center gap-1 font-medium"
            >
              {date}
              <button
                onClick={() => handleRemoveDate(date)}
                class="text-red-400 hover:text-red-700 font-bold ml-1"
              >
                &times;
              </button>
            </span>
          ))}
          {person.unavailable.length === 0 && (
            <span class="text-gray-400 italic">None</span>
          )}
        </div>

        <div class="flex gap-2 items-center">
          <input
            ref={dateInputRef}
            type="date"
            lang="en-GB"
            value={newDate}
            onInput={(e) => setNewDate(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddDate();
              }
            }}
            class="border p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-300 outline-none"
          />
          <button
            onClick={handleAddDate}
            disabled={!newDate}
            class="bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-500 hover:text-white disabled:opacity-50 disabled:hover:bg-gray-100 disabled:hover:text-gray-700 transition-all"
          >
            Add Date
          </button>
        </div>
      </div>
    </div>
  );
}
