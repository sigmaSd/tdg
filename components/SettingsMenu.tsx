import type { Settings } from "../scheduler/types.ts";

interface SettingsMenuProps {
  settings: Settings;
  onUpdate: (settings: Settings) => void;
}

export function SettingsMenu({ settings, onUpdate }: SettingsMenuProps) {
  const toggle = (key: keyof Settings) => {
    onUpdate({ ...settings, [key]: !settings[key] });
  };

  return (
    <div class="bg-white p-4 rounded-lg shadow space-y-4">
      <h3 class="text-lg font-bold border-b pb-2">Scheduling Settings</h3>

      <div class="space-y-3">
        <label class="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={settings.avoidConsecutive}
            onChange={() => toggle("avoidConsecutive")}
            class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-gray-700 group-hover:text-black transition-colors">
            Avoid 2 consecutive dates for same person
          </span>
        </label>

        <label class="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={settings.fairWeekend}
            onChange={() => toggle("fairWeekend")}
            class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-gray-700 group-hover:text-black transition-colors">
            Ensure equal weekend distribution (Sat/Sun)
          </span>
        </label>

        <label class="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={settings.enableScoring}
            onChange={() => toggle("enableScoring")}
            class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-gray-700 group-hover:text-black transition-colors">
            Enable scoring system (e.g., Sundays = 2)
          </span>
        </label>

        {settings.enableScoring && (
          <div class="ml-8 p-3 bg-blue-50 rounded-md border border-blue-100 space-y-2 animate-in fade-in slide-in-from-top-1">
            <p class="text-xs text-blue-700 font-semibold uppercase tracking-wider">
              Scoring Logic
            </p>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="fairness"
                checked={!settings.preferFairScore}
                onChange={() =>
                  onUpdate({ ...settings, preferFairScore: false })}
                class="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm text-blue-800">Prefer fair day count</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="fairness"
                checked={settings.preferFairScore}
                onChange={() =>
                  onUpdate({ ...settings, preferFairScore: true })}
                class="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm text-blue-800">Prefer fair total score</span>
            </label>
            <p class="text-[10px] text-blue-600 italic">
              * Click on day scores in the calendar to customize them.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
