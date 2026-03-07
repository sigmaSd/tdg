import { useState } from "preact/hooks";
import { DateRange, DayPicker } from "react-day-picker";
import { eachDayOfInterval, format, parseISO } from "date-fns";

interface UnavailabilityPickerProps {
  initialDates: string[]; // ISO date strings YYYY-MM-DD
  onSave: (dates: string[]) => void;
  onClose: () => void;
}

export default function UnavailabilityPicker({
  initialDates,
  onSave,
  onClose,
}: UnavailabilityPickerProps) {
  // We use a Set for easy add/remove logic, converted to array for DayPicker
  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    new Set(initialDates),
  );
  const [mode, setMode] = useState<"multiple" | "range">("multiple");
  const [range, setRange] = useState<DateRange | undefined>();

  // Helper to format date as YYYY-MM-DD
  const toISODate = (d: Date) => format(d, "yyyy-MM-dd");

  const handleMultipleSelect = (days: Date[] | undefined) => {
    if (!days) return;
    const newSet = new Set(days.map(toISODate));
    setSelectedDates(newSet);
  };

  const handleAddRange = () => {
    if (range?.from && range?.to) {
      const days = eachDayOfInterval({ start: range.from, end: range.to });
      const newSet = new Set(selectedDates);
      days.forEach((d) => newSet.add(toISODate(d)));
      setSelectedDates(newSet);
      setRange(undefined); // Clear range selection
      setMode("multiple"); // Switch back to view all
    }
  };

  const handleSave = () => {
    // Sort dates chronologically
    const sortedDates = Array.from(selectedDates).sort();
    onSave(sortedDates);
    onClose();
  };

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div class="bg-blue-600 p-4 text-white flex justify-between items-center">
          <h3 class="text-lg font-bold">Manage Unavailability</h3>
          <button
            type="button"
            onClick={onClose}
            class="text-white/80 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Mode Switcher */}
        <div class="flex border-b">
          <button
            type="button"
            class={`flex-1 py-3 text-sm font-medium transition-colors ${
              mode === "multiple"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-500 hover:bg-gray-50"
            }`}
            onClick={() => setMode("multiple")}
          >
            Select Days
          </button>
          <button
            type="button"
            class={`flex-1 py-3 text-sm font-medium transition-colors ${
              mode === "range"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-500 hover:bg-gray-50"
            }`}
            onClick={() => setMode("range")}
          >
            Add Range
          </button>
        </div>

        {/* Content */}
        <div class="p-4 flex-1 overflow-y-auto flex flex-col items-center">
          {mode === "multiple"
            ? (
              <>
                <p class="text-sm text-gray-500 mb-2 text-center">
                  Click dates to toggle unavailability.
                </p>
                <DayPicker
                  mode="multiple"
                  selected={Array.from(selectedDates).map((d) => parseISO(d))}
                  onSelect={handleMultipleSelect}
                  className="border rounded-lg p-2 shadow-sm"
                />
              </>
            )
            : (
              <>
                <p class="text-sm text-gray-500 mb-2 text-center">
                  Select a start and end date to add a block.
                </p>
                <DayPicker
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  className="border rounded-lg p-2 shadow-sm"
                />
                <button
                  type="button"
                  onClick={handleAddRange}
                  disabled={!range?.from || !range?.to}
                  class="mt-4 w-full bg-blue-100 text-blue-700 py-2 rounded-lg font-semibold hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Selected Range
                </button>
              </>
            )}

          {/* Summary */}
          <div class="mt-4 w-full bg-gray-50 p-3 rounded text-sm text-gray-600 border border-gray-100">
            <span class="font-bold text-gray-800">
              {selectedDates.size}
            </span>{" "}
            days marked unavailable.
          </div>
        </div>

        {/* Footer */}
        <div class="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            class="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            class="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
